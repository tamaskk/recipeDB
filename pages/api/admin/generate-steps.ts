import type { NextApiResponse } from 'next';
import connectDB from '@/lib/mongodb';
import RecipeModel from '@/models/Recipe';
import { withApiKey } from '@/middleware/auth';
import type { AuthenticatedRequest } from '@/middleware/auth';
import { getOpenAIClient, OPENAI_CONFIG } from '@/lib/openai';
import { Language, MultilingualText, RecipeStep } from '@/types/recipe';

const openai = getOpenAIClient();

/**
 * Retry wrapper for OpenAI calls with exponential backoff
 */
async function retryOpenAICall<T>(
  fn: () => Promise<T>,
  maxRetries: number = OPENAI_CONFIG.maxRetries,
  timeout: number = OPENAI_CONFIG.timeout
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const attemptNumber = attempt + 1;
    console.log(`[OPENAI] Starting OpenAI call (attempt ${attemptNumber}/${maxRetries + 1}), timeout: ${timeout}ms`);
    
    try {
      // Create a timeout promise
      let timeoutId: NodeJS.Timeout;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          console.log(`[OPENAI] Timeout triggered after ${timeout}ms (attempt ${attemptNumber})`);
          reject(new Error(`OpenAI request timed out after ${timeout}ms`));
        }, timeout);
      });

      // Race between the actual call and timeout
      const startTime = Date.now();
      const result = await Promise.race([
        fn().then((res) => {
          clearTimeout(timeoutId!);
          const duration = Date.now() - startTime;
          console.log(`[OPENAI] Call completed successfully in ${duration}ms (attempt ${attemptNumber})`);
          return res;
        }),
        timeoutPromise
      ]);
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      const errorMessage = lastError.message.toLowerCase();
      const errorCode = (error as any)?.code;
      
      console.error(`[OPENAI] Call failed (attempt ${attemptNumber}):`, {
        error: lastError.message,
        code: errorCode,
      });
      
      // Check for non-retryable errors
      const isNonRetryableError = 
        errorCode === 'insufficient_quota' ||
        errorMessage.includes('exceeded your current quota') ||
        errorMessage.includes('quota') && errorMessage.includes('exceeded') ||
        errorMessage.includes('billing') ||
        errorCode === 'invalid_api_key' ||
        errorCode === 'invalid_request_error';
      
      // Check if it's a retryable error
      const isRetryableError = !isNonRetryableError && (
        errorMessage.includes('timeout') ||
        errorMessage.includes('timed out') ||
        errorMessage.includes('rate limit') ||
        errorMessage.includes('429')
      );
      
      if (!isRetryableError || attempt === maxRetries) {
        console.error(`[OPENAI] Not retrying - shouldRetry: ${isRetryableError}, attempt: ${attemptNumber}/${maxRetries + 1}`);
        throw lastError;
      }

      // Exponential backoff: wait 2^attempt seconds (with max 30 seconds)
      const delayMs = Math.min(1000 * Math.pow(2, attempt), 30000);
      console.log(`[RETRY] OpenAI call failed (attempt ${attemptNumber}/${maxRetries + 1}), retrying in ${delayMs}ms...`, lastError.message);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  throw lastError || new Error('Unknown error in retry wrapper');
}

/**
 * Generate recipe steps using OpenAI based on the full recipe
 */
async function generateStepsWithOpenAI(recipe: any): Promise<RecipeStep[]> {
  const languages: Language[] = ['en', 'de', 'nl', 'hu', 'fr', 'es', 'pt'];
  
  // Get recipe name in English for context
  const recipeName = recipe.name?.find((n: MultilingualText) => n.language === 'en')?.text || 
                     recipe.name?.[0]?.text || 
                     'Unknown Recipe';
  
  // Get description for context
  const description = recipe.description?.find((d: MultilingualText) => d.language === 'en')?.text || 
                      recipe.description?.[0]?.text || 
                      '';
  
  // Format ingredients for context
  const ingredientsList = recipe.ingredients?.map((ing: any) => {
    const ingName = ing.name?.find((n: MultilingualText) => n.language === 'en')?.text || 
                   ing.name?.[0]?.text || 
                   'Unknown';
    const amount = ing.amount || 0;
    const unit = ing.unit?.find((u: MultilingualText) => u.language === 'en')?.text || 
                 ing.unit?.[0]?.text || 
                 '';
    return `${amount} ${unit} ${ingName}`;
  }).join(', ') || 'No ingredients listed';

  const prompt = `You are a recipe expert. Generate detailed cooking instructions (steps) for this recipe in all required languages.

Recipe Name: ${recipeName}
Description: ${description}
Ingredients: ${ingredientsList}
Servings: ${recipe.servings || 'Not specified'}
Prep Time: ${recipe.time?.prepMinutes || 0} minutes
Cook Time: ${recipe.time?.cookMinutes || 0} minutes
Difficulty: ${recipe.difficulty || 'Not specified'}/10
Meal Type: ${recipe.mealType || 'Not specified'}
Cuisine Type: ${Array.isArray(recipe.cuisineType) ? recipe.cuisineType.join(', ') : recipe.cuisineType || 'Not specified'}
Cooking Methods: ${recipe.cookingMethods?.join(', ') || 'Not specified'}

Based on this information, generate detailed step-by-step cooking instructions. Each step should be clear, actionable, and appropriate for the recipe type.

Please return a JSON object with the following structure:
{
  "steps": [
    {
      "stepNumber": 1,
      "instructions": {
        "en": "English instruction for step 1",
        "de": "German instruction for step 1",
        "nl": "Dutch instruction for step 1",
        "hu": "Hungarian instruction for step 1",
        "fr": "French instruction for step 1",
        "es": "Spanish instruction for step 1",
        "pt": "Portuguese instruction for step 1"
      },
      "timeMinutes": 10
    },
    {
      "stepNumber": 2,
      "instructions": {
        "en": "English instruction for step 2",
        "de": "German instruction for step 2",
        ...
      },
      "timeMinutes": 15
    }
  ]
}

Important:
- Generate 5-15 steps depending on recipe complexity
- Each step should be clear and actionable
- Include time estimates (timeMinutes) for each step when appropriate
- Make sure all 7 languages (en, de, nl, hu, fr, es, pt) are included for each step
- Steps should be logical and sequential
- Consider the cooking methods and cuisine type when generating steps

Return ONLY valid JSON, no markdown, no code blocks.`;

  try {
    console.log(`[OPENAI] Generating steps for recipe: ${recipeName} (ID: ${recipe.id})`);
    
    const response = await retryOpenAICall(async () => {
      return await openai.chat.completions.create({
        model: OPENAI_CONFIG.model,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
      });
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content in OpenAI response');
    }
    
    // Remove markdown code blocks if present
    const jsonContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(jsonContent);
    
    // Transform to RecipeStep format
    const steps: RecipeStep[] = (parsed.steps || []).map((step: any) => {
      const instructions: MultilingualText[] = languages
        .filter(lang => step.instructions?.[lang])
        .map(lang => ({
          language: lang as Language,
          text: step.instructions[lang],
        }));
      
      return {
        stepNumber: step.stepNumber || 0,
        instructions,
        timeMinutes: step.timeMinutes,
      };
    });
    
    return steps;
  } catch (error) {
    console.error('OpenAI step generation error:', error);
    throw new Error(`Failed to generate steps with OpenAI: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * POST /api/admin/generate-steps - Generate steps for recipes missing them
 */
async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  await connectDB();

  try {
    // Find recipes where steps array is empty, null, or undefined
    const recipesWithoutSteps = await RecipeModel.find({
      $or: [
        { steps: { $exists: false } },
        { steps: null },
        { steps: { $size: 0 } },
      ],
    }).lean();

    console.log(`Found ${recipesWithoutSteps.length} recipes without steps`);

    if (recipesWithoutSteps.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No recipes found without steps',
        data: {
          processed: 0,
          successful: 0,
          failed: 0,
          errors: [],
        },
      });
    }

    const results = {
      processed: 0,
      successful: 0,
      failed: 0,
      errors: [] as Array<{ recipeId: string; error: string }>,
    };

    // Process recipes one by one to avoid overwhelming OpenAI API
    for (const recipe of recipesWithoutSteps) {
      try {
        results.processed++;
        console.log(`Processing recipe ${results.processed}/${recipesWithoutSteps.length}: ${recipe.id}`);
        
        // Generate steps using OpenAI
        const generatedSteps = await generateStepsWithOpenAI(recipe);
        
        if (!generatedSteps || generatedSteps.length === 0) {
          throw new Error('No steps generated');
        }
        
        // Update recipe with generated steps
        await RecipeModel.findOneAndUpdate(
          { id: recipe.id },
          { 
            $set: { 
              steps: generatedSteps,
              updatedAt: new Date(),
            }
          }
        );
        
        results.successful++;
        console.log(`Successfully generated ${generatedSteps.length} steps for recipe ${recipe.id}`);
        
        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        results.failed++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.errors.push({
          recipeId: recipe.id,
          error: errorMessage,
        });
        console.error(`Failed to generate steps for recipe ${recipe.id}:`, errorMessage);
      }
    }

    return res.status(200).json({
      success: true,
      message: `Processed ${results.processed} recipes. ${results.successful} successful, ${results.failed} failed.`,
      data: results,
    });
  } catch (error) {
    console.error('Error generating steps:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate steps',
    });
  }
}

export default withApiKey(handler);

