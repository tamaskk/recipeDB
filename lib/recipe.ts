/**
 * Recipe processing functions (converted from server actions)
 * These functions can be used in API routes and server-side code
 */

import { getOpenAIClient, OPENAI_CONFIG } from '@/lib/openai';
import { Recipe, CreateRecipeInput, Language, MultilingualText, CookingMethod, VALID_COOKING_METHODS, DietaryTag, DifficultyLevel } from '@/types/recipe';
import connectDB from '@/lib/mongodb';
import RecipeModel from '@/models/Recipe';

// Valid dietary tags for filtering
const VALID_DIETARY_TAGS: DietaryTag[] = [
  'vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'nut-free', 'halal',
  'kosher', 'low-carb', 'keto', 'paleo', 'low-fat', 'high-protein', 'sugar-free'
];

// Valid meal types for filtering
const VALID_MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack', 'dessert', 'appetizer', 'beverage'] as const;

// Note: cuisineType can now be any country string or array of country strings
// No validation needed - accept any string(s)

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
      const causeCode = (error as any)?.cause?.code;
      const causeMessage = (error as any)?.cause?.message?.toLowerCase() || '';
      
      console.error(`[OPENAI] Call failed (attempt ${attemptNumber}):`, {
        error: lastError.message,
        code: errorCode,
        causeCode: causeCode,
        cause: (error as any)?.cause?.message,
      });
      
      // Check for non-retryable errors (quota/billing issues)
      const isNonRetryableError = 
        errorCode === 'insufficient_quota' ||
        errorMessage.includes('exceeded your current quota') ||
        errorMessage.includes('quota') && errorMessage.includes('exceeded') ||
        errorMessage.includes('billing') ||
        errorCode === 'invalid_api_key' ||
        errorCode === 'invalid_request_error';
      
      // Check if it's a timeout or connection error that we should retry
      // Note: Rate limit (429) errors are retryable, but quota errors are NOT
      const isRetryableError = !isNonRetryableError && (
        errorMessage.includes('timeout') ||
        errorMessage.includes('timed out') ||
        errorMessage.includes('headers timeout') ||
        errorMessage.includes('fetch failed') ||
        errorMessage.includes('econnrefused') ||
        errorMessage.includes('enotfound') ||
        (errorMessage.includes('rate limit') && !errorMessage.includes('quota')) ||
        (errorMessage.includes('429') && errorCode !== 'insufficient_quota') ||
        causeMessage.includes('timeout') ||
        causeMessage.includes('timed out') ||
        causeMessage.includes('headers timeout') ||
        errorCode === 'UND_ERR_HEADERS_TIMEOUT' ||
        errorCode === 'ETIMEDOUT' ||
        errorCode === 'ECONNREFUSED' ||
        errorCode === 'ENOTFOUND' ||
        causeCode === 'UND_ERR_HEADERS_TIMEOUT' ||
        causeCode === 'ETIMEDOUT'
      );
      
      console.log(`[OPENAI] Retry check - isRetryable: ${isRetryableError}, isNonRetryable: ${isNonRetryableError}, attempt: ${attemptNumber}/${maxRetries + 1}, errorCode: ${errorCode}, errorMessage: "${errorMessage}"`);
      
      // Always retry timeout errors, even if the check fails (unless it's a quota error)
      const isTimeoutError = errorMessage.includes('timeout') || errorMessage.includes('timed out');
      const shouldRetry = !isNonRetryableError && (isRetryableError || (isTimeoutError && attempt < maxRetries));
      
      if (!shouldRetry || attempt === maxRetries) {
        console.error(`[OPENAI] Not retrying - shouldRetry: ${shouldRetry}, attempt: ${attemptNumber}/${maxRetries + 1}`);
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
 * Process a recipe from an external API and refine it using OpenAI
 * @param recipeUrl - URL to fetch the recipe from
 * @returns Processed recipe data
 */
export async function processAndSaveRecipe(recipeUrl: string) {
  try {
    // 1. Get the recipe from your external API
    const res = await fetch(recipeUrl);
    if (!res.ok) {
      throw new Error(`Failed to fetch recipe: ${res.statusText}`);
    }
    const originalRecipe = await res.json();

    // 2. Send the object to OpenAI for processing and translation
    const refinedRecipe = await refineRecipeWithOpenAI(originalRecipe);

    // 3. Transform to our Recipe model format
    const recipeData = transformToRecipeModel(refinedRecipe, originalRecipe);

    // 4. Connect to MongoDB and save the recipe
    await connectDB();
    
    // Check if recipe with same ID already exists (only check ID, not name)
    const existingRecipe = await RecipeModel.findOne({ id: recipeData.id });
    
    if (existingRecipe) {
      // Skip if ID already exists - don't save duplicate
      console.log(`Recipe with ID ${recipeData.id} already exists, skipping...`);
      return { success: true, data: existingRecipe.toJSON(), skipped: true };
    }

    // Create new recipe (name can be the same, only ID matters)
    const savedEntry = await RecipeModel.create(recipeData);

    if (!savedEntry) {
      throw new Error('Failed to save recipe to database');
    }

    return { success: true, data: savedEntry.toJSON() };

  } catch (error) {
    console.error("Recipe processing failed:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to process recipe" 
    };
  }
}

/**
 * Analyze text and extract recipe information using OpenAI, then save to database
 * @param text - Raw text containing recipe information
 * @param useOllama - If true, use Ollama instead of OpenAI (default: false)
 * @returns Processed and saved recipe data
 */
export async function analyzeTextAndSaveRecipe(text: string, useOllama: boolean = false) {
  try {
    // 1. Send the text to AI for analysis and translation
    const refinedRecipe = useOllama 
      ? await analyzeRecipeTextWithOllama(text)
      : await analyzeRecipeTextWithOpenAI(text);

    // 2. Transform to our Recipe model format
    const recipeData = transformToRecipeModel(refinedRecipe, {});

    // 3. Connect to MongoDB and save the recipe
    await connectDB();
    
    // Generate unique ID if not provided
    if (!recipeData.id) {
      recipeData.id = `recipe-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    
    // Check if recipe with same ID already exists (only check ID, not name)
    const existingRecipe = await RecipeModel.findOne({ id: recipeData.id });
    
    if (existingRecipe) {
      // Skip if ID already exists - don't save duplicate
      console.log(`Recipe with ID ${recipeData.id} already exists, skipping...`);
      return { success: true, data: existingRecipe.toJSON(), skipped: true };
    }

    // Create new recipe (name can be the same, only ID matters)
    const savedEntry = await RecipeModel.create(recipeData);

    if (!savedEntry) {
      throw new Error('Failed to save recipe to database');
    }

    return { success: true, data: savedEntry.toJSON() };

  } catch (error) {
    console.error("Recipe text analysis failed:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to analyze and save recipe" 
    };
  }
}

/**
 * Analyze raw text and extract recipe information using Ollama
 */
async function analyzeRecipeTextWithOllama(text: string): Promise<any> {
  const { callOllama, retryOllamaCall, OLLAMA_CONFIG } = await import('@/lib/ollama');
  
  const prompt = `You are a recipe expert. Analyze the following text and extract recipe information. Translate it into multiple languages.

Text to analyze:
${text}

Please return a JSON object with the following structure:
{
  "name": {
    "en": "English name",
    "de": "German name",
    "nl": "Dutch name",
    "hu": "Hungarian name",
    "fr": "French name",
    "es": "Spanish name",
    "pt": "Portuguese name"
  },
  "description": {
    "en": "English description",
    "de": "German description",
    ...
  },
  "info": {
    "en": "Additional info in English",
    ...
  },
  "ingredients": [
    {
      "name": {
        "en": "Ingredient name",
        "de": "German name",
        ...
      },
      "amount": <amount>,
      "unit": {
        "en": "cups",
        "de": "Tassen",
        ...
      },
      "isOptional": false
    }
  ],
  "steps": [
    {
      "stepNumber": 1,
      "instructions": {
        "en": "Step instruction",
        "de": "Schritt Anweisung",
        ...
      },
      "timeMinutes": <estimated time in minutes for the step>
    }
  ],
  "difficulty": <difficulty in numbers between 1 and 10>,
  "servings": <estimated servings based on the ingredients and the recipe>,
  "time": {
    "prepMinutes": <estimated time in minutes for the preparation>,
    "cookMinutes": <estimated time in minutes for the cooking>,
    "totalMinutes": <estimated total time in minutes for the recipe>
  },
  "macros": {
    "calories": <estimated calories for the recipe>,
    "protein": <estimated protein for the recipe>,
    "carbohydrates": <estimated carbohydrates for the recipe>,
    "fat": <estimated fat for the recipe>,
    "saturatedFat": <estimated saturated fat for the recipe>,
    "fiber": <estimated fiber for the recipe>,
    "sugar": <estimated sugar for the recipe>,
    "sodium": <estimated sodium for the recipe>
  },
  "mealType": <mealType (breakfast, lunch, dinner, snack, dessert, appetizer, beverage)>,
  "cuisineType": "hungarian" or ["hungarian", "slovakian", "slovenian"] (can be a single country string or array of countries - use any country name),
  "tags": [
    {
      "en": "tag",
      "de": "Tag",
      ...
    }
  ],
  "dietaryTags": <array of dietary tags for the recipe (vegetarian, vegan, gluten-free, dairy-free, nut-free, halal, kosher, low-carb, keto, paleo, low-fat, high-protein, sugar-free)>,
  "cookingMethods": <array of cooking methods for the recipe (baking, grilling, frying, deep-frying, pan-frying, stir-frying, sauteing, boiling, simmering, poaching, blanching, steaming, roasting, broiling, braising, stewing, slow-cooking, pressure-cooking, sous-vide, smoking, curing, fermenting, marinating, raw, no-cook, microwaving, air-frying, other)>,
}

Extract all available information from the text. If some information is missing, use reasonable defaults or leave fields empty.

IMPORTANT NUTRITIONAL INFORMATION:
- ALWAYS set calories to exactly 500 for the entire recipe
- Calculate macros (protein, carbohydrates, fat) based on the actual ingredients and their quantities. Use realistic nutritional values:
  * Protein: Consider meat, fish, eggs, dairy, legumes, nuts (typically 4g per 100g for meat, 3g per 100g for dairy, etc.)
  * Carbohydrates: Consider grains, vegetables, fruits, sugars (typically 15-20g per 100g for vegetables, 20-30g per 100g for grains, etc.)
  * Fat: Consider oils, butter, nuts, fatty meats (typically 9g per 100g for oils, 5-10g per 100g for meat, etc.)
- Ensure protein + carbs*4 + fat*9 ≈ 500 calories (or close to it)
- Only include optional macro fields (saturatedFat, fiber, sugar, sodium, etc.) if you have reasonable estimates based on ingredients
- Do NOT use random numbers - base all calculations on the actual ingredients and their amounts

IMPORTANT: If the text does not contain steps/instructions, or if the steps are incomplete, you MUST generate detailed step-by-step cooking instructions based on the recipe's ingredients, cooking methods, cuisine type, and other available information. Generate 5-15 steps depending on recipe complexity. Each step should be clear, actionable, and appropriate for the recipe type. Include time estimates (timeMinutes) for each step when appropriate. Make sure all steps are provided in all 7 languages (en, de, nl, hu, fr, es, pt).

Return ONLY valid JSON, no markdown, no code blocks.`;

  try {
    console.log(`[OLLAMA] Starting recipe analysis with model: ${OLLAMA_CONFIG.model}`);
    console.log(`[OLLAMA] Prompt length: ${prompt.length} characters`);
    
    const response = await retryOllamaCall(async () => {
      console.log(`[OLLAMA] Calling Ollama API with streaming...`);
      console.log(`[OLLAMA] Generating response (streaming in real-time):`);
      console.log('─'.repeat(80));
      
      const result = await callOllama(prompt, {
        model: OLLAMA_CONFIG.model,
        temperature: 0.7,
        format: 'json',
        stream: true,
        onChunk: (chunk: string) => {
          // Chunks are written to stdout by callOllama for real-time visibility
        },
      });
      
      console.log('\n' + '─'.repeat(80));
      console.log(`[OLLAMA] Streaming complete, received response from Ollama`);
      return result;
    });

    if (!response) {
      throw new Error('No content in Ollama response');
    }
    
    // Remove markdown code blocks if present
    const jsonContent = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(jsonContent);
  } catch (error) {
    console.error('Ollama text analysis error:', error);
    throw new Error(`Failed to analyze recipe text with Ollama: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Clean JSON string by escaping control characters and fixing common issues
 */
function cleanJsonString(jsonString: string): string {
  let cleaned = jsonString;
  
  // Remove trailing commas before closing braces/brackets
  cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');
  
  // Try to extract the main JSON object if there's extra text
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    cleaned = jsonMatch[0];
  }
  
  // Fix control characters in strings by properly escaping them
  let result = '';
  let inString = false;
  let escapeNext = false;
  
  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];
    const charCode = char.charCodeAt(0);
    
    if (escapeNext) {
      result += char;
      escapeNext = false;
      continue;
    }
    
    if (char === '\\') {
      escapeNext = true;
      result += char;
      continue;
    }
    
    if (char === '"') {
      inString = !inString;
      result += char;
      continue;
    }
    
    if (inString) {
      // Escape control characters (0x00-0x1F) that aren't already escaped
      if (charCode >= 0 && charCode <= 0x1F) {
        switch (char) {
          case '\n':
            result += '\\n';
            break;
          case '\r':
            result += '\\r';
            if (i + 1 < cleaned.length && cleaned[i + 1] === '\n') {
              i++; // Skip the \n after \r
            }
            break;
          case '\t':
            result += '\\t';
            break;
          case '\b':
            result += '\\b';
            break;
          case '\f':
            result += '\\f';
            break;
          default:
            // Escape other control characters as \uXXXX
            result += `\\u${charCode.toString(16).padStart(4, '0')}`;
        }
        continue;
      }
    }
    
    result += char;
  }
  
  // If we ended in a string, try to close it
  if (inString) {
    result += '"';
  }
  
  return result;
}

/**
 * Analyze raw text and extract recipe information using OpenAI
 */
async function analyzeRecipeTextWithOpenAI(text: string): Promise<any> {
  const prompt = `You are a recipe expert. Analyze the following text and extract recipe information. Translate it into multiple languages.

Text to analyze:
${text}

Please return a JSON object with the following structure:
{
  "name": {
    "en": "English name",
    "de": "German name",
    "nl": "Dutch name",
    "hu": "Hungarian name",
    "fr": "French name",
    "es": "Spanish name",
    "pt": "Portuguese name"
  },
  "description": {
    "en": "English description",
    "de": "German description",
    ...
  },
  "info": {
    "en": "Additional info in English",
    ...
  },
  "ingredients": [
    {
      "name": {
        "en": "Ingredient name",
        "de": "German name",
        ...
      },
      "amount": 2.5,
      "unit": {
        "en": "cups",
        "de": "Tassen",
        ...
      },
      "isOptional": false
    }
  ],
  "steps": [
    {
      "stepNumber": 1,
      "instructions": {
        "en": "Step instruction",
        "de": "Schritt Anweisung",
        ...
      },
      "timeMinutes": 10
    }
  ],
  "difficulty": 5,
  "servings": 4,
  "time": {
    "prepMinutes": 15,
    "cookMinutes": 30,
    "totalMinutes": 45
  },
  "macros": {
    "calories": 500,
    "protein": 20,
    "carbohydrates": 50,
    "fat": 20,
    "saturatedFat": 5,
    "fiber": 3,
    "sugar": 10,
    "sodium": 800
  },
  "mealType": "dinner",
  "cuisineType": "hungarian" or ["hungarian", "slovakian", "slovenian"] (can be a single country string or array of countries - use any country name),
  "tags": [
    {
      "en": "tag",
      "de": "Tag",
      ...
    }
  ],
  "dietaryTags": ["vegetarian"],
  "cookingMethods": ["baking"]
}

Extract all available information from the text. If some information is missing, use reasonable defaults or leave fields empty.

IMPORTANT NUTRITIONAL INFORMATION:
- ALWAYS set calories to exactly 500 for the entire recipe
- Calculate macros (protein, carbohydrates, fat) based on the actual ingredients and their quantities. Use realistic nutritional values:
  * Protein: Consider meat, fish, eggs, dairy, legumes, nuts (typically 4g per 100g for meat, 3g per 100g for dairy, etc.)
  * Carbohydrates: Consider grains, vegetables, fruits, sugars (typically 15-20g per 100g for vegetables, 20-30g per 100g for grains, etc.)
  * Fat: Consider oils, butter, nuts, fatty meats (typically 9g per 100g for oils, 5-10g per 100g for meat, etc.)
- Ensure protein + carbs*4 + fat*9 ≈ 500 calories (or close to it)
- Only include optional macro fields (saturatedFat, fiber, sugar, sodium, etc.) if you have reasonable estimates based on ingredients
- Do NOT use random numbers - base all calculations on the actual ingredients and their amounts

IMPORTANT: If the text does not contain steps/instructions, or if the steps are incomplete, you MUST generate detailed step-by-step cooking instructions based on the recipe's ingredients, cooking methods, cuisine type, and other available information. Generate 5-15 steps depending on recipe complexity. Each step should be clear, actionable, and appropriate for the recipe type. Include time estimates (timeMinutes) for each step when appropriate. Make sure all steps are provided in all 7 languages (en, de, nl, hu, fr, es, pt).

Return ONLY valid JSON, no markdown, no code blocks.`;

  try {
    console.log(`[OPENAI] Starting recipe analysis with model: ${OPENAI_CONFIG.model}`);
    console.log(`[OPENAI] Prompt length: ${prompt.length} characters`);
    
    const response = await retryOpenAICall(async () => {
      console.log(`[OPENAI] Calling openai.chat.completions.create()...`);
      const result = await openai.chat.completions.create({
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
      console.log(`[OPENAI] Received response from OpenAI`);
      return result;
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content in OpenAI response');
    }
    // Remove markdown code blocks if present
    let jsonContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    // Fix control characters and other JSON issues
    jsonContent = cleanJsonString(jsonContent);
    
    try {
      return JSON.parse(jsonContent);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('JSON content length:', jsonContent.length);
      console.error('JSON content preview:', jsonContent.substring(0, 200));
      
      // Try to extract JSON object from the content
      const jsonMatch = jsonContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch (e) {
          throw new Error(`Failed to parse JSON from OpenAI response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
        }
      }
      
      throw new Error(`Failed to parse JSON from OpenAI response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
    }
  } catch (error) {
    console.error('OpenAI text analysis error:', error);
    throw new Error(`Failed to analyze recipe text with OpenAI: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Refine and translate recipe using OpenAI
 */
async function refineRecipeWithOpenAI(originalRecipe: any): Promise<any> {
  const prompt = `You are a recipe expert. Refine and translate this recipe into multiple languages.
  
Original recipe data:
${JSON.stringify(originalRecipe, null, 2)}

Please return a JSON object with the following structure:
{
  "name": {
    "en": "English name",
    "de": "German name",
    "nl": "Dutch name",
    "hu": "Hungarian name",
    "fr": "French name",
    "es": "Spanish name",
    "pt": "Portuguese name"
  },
  "description": {
    "en": "English description",
    "de": "German description",
    ...
  },
  "info": {
    "en": "Additional info in English",
    ...
  },
  "ingredients": [
    {
      "name": {
        "en": "Ingredient name",
        "de": "German name",
        ...
      },
      "amount": <amount>,
      "unit": {
        "en": "cups",
        "de": "Tassen",
        ...
      },
      "isOptional": false
    }
  ],
  "steps": [
    {
      "stepNumber": 1,
      "instructions": {
        "en": "Step instruction",
        "de": "Schritt Anweisung",
        ...
      },
      "timeMinutes": 10
    }
  ],
  "difficulty": <difficulty>,
  "servings": <servings>,
  "time": {
    "prepMinutes": <prepMinutes>,
    "cookMinutes": <cookMinutes>,
    "totalMinutes": <totalMinutes>
  },
  "macros": {
    "calories": <calories>,
    "protein": <protein>,
    "carbohydrates": <carbohydrates>,
    "fat": <fat>,
    "saturatedFat": <saturatedFat>,
    "fiber": <fiber>,
    "sugar": <sugar>,
    "sodium": <sodium>
  },
  "mealType": <mealType (breakfast, lunch, dinner, snack, dessert, appetizer, beverage)>,
  "cuisineType": "hungarian" or ["hungarian", "slovakian", "slovenian"] (can be a single country string or array of countries - use any country name),
  "tags": [
    {
      "en": "tag",
      "de": "Tag",
      ...
    }
  ],
  "dietaryTags": ["vegetarian"],
  "cookingMethods": ["baking"]
}

IMPORTANT NUTRITIONAL INFORMATION:
- ALWAYS set calories to exactly 500 for the entire recipe
- Calculate macros (protein, carbohydrates, fat) based on the actual ingredients and their quantities. Use realistic nutritional values:
  * Protein: Consider meat, fish, eggs, dairy, legumes, nuts (typically 4g per 100g for meat, 3g per 100g for dairy, etc.)
  * Carbohydrates: Consider grains, vegetables, fruits, sugars (typically 15-20g per 100g for vegetables, 20-30g per 100g for grains, etc.)
  * Fat: Consider oils, butter, nuts, fatty meats (typically 9g per 100g for oils, 5-10g per 100g for meat, etc.)
- Ensure protein + carbs*4 + fat*9 ≈ 500 calories (or close to it)
- Only include optional macro fields (saturatedFat, fiber, sugar, sodium, etc.) if you have reasonable estimates based on ingredients
- Do NOT use random numbers - base all calculations on the actual ingredients and their amounts

IMPORTANT: If the original recipe does not contain steps/instructions, or if the steps are incomplete, you MUST generate detailed step-by-step cooking instructions based on the recipe's ingredients, cooking methods, cuisine type, and other available information. Generate 5-15 steps depending on recipe complexity. Each step should be clear, actionable, and appropriate for the recipe type. Include time estimates (timeMinutes) for each step when appropriate. Make sure all steps are provided in all 7 languages (en, de, nl, hu, fr, es, pt).

Return ONLY valid JSON, no markdown, no code blocks.`;

  try {
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
    return JSON.parse(jsonContent);
  } catch (error) {
    console.error('OpenAI processing error:', error);
    throw new Error(`Failed to process recipe with OpenAI: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Transform OpenAI response to Recipe model format
 */
function transformToRecipeModel(refinedData: any, originalRecipe: any): CreateRecipeInput {
  const languages: Language[] = ['en', 'de', 'nl', 'hu', 'fr', 'es', 'pt'];

  // Helper to convert object to MultilingualText array
  const toMultilingual = (obj: Record<string, string>): MultilingualText[] => {
    return languages
      .filter(lang => obj[lang])
      .map(lang => ({
        language: lang as Language,
        text: obj[lang],
      }));
  };

  // Helper to normalize difficulty from string or number to number (1-10)
  const normalizeDifficulty = (difficulty: any): DifficultyLevel => {
    if (typeof difficulty === 'number') {
      // Ensure it's between 1-10
      return Math.max(1, Math.min(10, Math.round(difficulty))) as DifficultyLevel;
    }
    
    if (typeof difficulty === 'string') {
      const lower = difficulty.toLowerCase().trim();
      
      // Map common difficulty strings to numbers
      const difficultyMap: Record<string, number> = {
        'very easy': 1,
        'veryeasy': 1,
        'easy': 3,
        'simple': 3,
        'beginner': 3,
        'medium': 5,
        'moderate': 5,
        'intermediate': 5,
        'medium-hard': 6,
        'medium hard': 6,
        'hard': 7,
        'difficult': 7,
        'advanced': 7,
        'very hard': 9,
        'veryhard': 9,
        'expert': 9,
        'very difficult': 10,
        'verydifficult': 10,
        'master': 10,
      };
      
      if (difficultyMap[lower]) {
        return difficultyMap[lower] as DifficultyLevel;
      }
      
      // Try to parse as number
      const parsed = parseFloat(lower);
      if (!isNaN(parsed)) {
        return Math.max(1, Math.min(10, Math.round(parsed))) as DifficultyLevel;
      }
    }
    
      // Default to 5 if can't parse
      return 5 as DifficultyLevel;
    };

  // Transform ingredients
  const ingredients = (refinedData.ingredients || []).map((ing: any) => ({
    name: toMultilingual(ing.name || {}),
    amount: ing.amount || 0,
    unit: toMultilingual(ing.unit || {}),
    notes: ing.notes ? toMultilingual(ing.notes) : undefined,
    isOptional: ing.isOptional || false,
    category: ing.category ? toMultilingual(ing.category) : undefined,
  }));

  // Transform steps
  const steps = (refinedData.steps || []).map((step: any, index: number) => ({
    stepNumber: step.stepNumber || index + 1,
    instructions: toMultilingual(step.instructions || {}),
    imageUrl: step.imageUrl,
    timeMinutes: step.timeMinutes,
  }));

  // Transform tags
  const tags = (refinedData.tags || []).map((tag: any) => toMultilingual(tag));

  // Generate slug from name
  const slug = languages
    .filter(lang => refinedData.name?.[lang])
    .map(lang => ({
      language: lang as Language,
      text: refinedData.name[lang]
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, ''),
    }));

  return {
    id: originalRecipe.id || `recipe-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    slug,
    name: toMultilingual(refinedData.name || {}),
    description: toMultilingual(refinedData.description || {}),
    info: refinedData.info ? toMultilingual(refinedData.info) : [],
    ingredients,
    steps,
    difficulty: normalizeDifficulty(refinedData.difficulty),
    servings: refinedData.servings || 4,
    servingsUnit: refinedData.servingsUnit ? toMultilingual(refinedData.servingsUnit) : undefined,
    time: {
      prepMinutes: refinedData.time?.prepMinutes || 0,
      cookMinutes: refinedData.time?.cookMinutes || 0,
      restMinutes: refinedData.time?.restMinutes,
      totalMinutes: refinedData.time?.totalMinutes || 
        (refinedData.time?.prepMinutes || 0) + (refinedData.time?.cookMinutes || 0),
    },
    macros: {
      calories: refinedData.macros?.calories || 0,
      protein: refinedData.macros?.protein || 0,
      carbohydrates: refinedData.macros?.carbohydrates || 0,
      fat: refinedData.macros?.fat || 0,
      saturatedFat: refinedData.macros?.saturatedFat,
      fiber: refinedData.macros?.fiber,
      sugar: refinedData.macros?.sugar,
      sodium: refinedData.macros?.sodium,
      cholesterol: refinedData.macros?.cholesterol,
      potassium: refinedData.macros?.potassium,
      calcium: refinedData.macros?.calcium,
      iron: refinedData.macros?.iron,
      vitaminA: refinedData.macros?.vitaminA,
      vitaminC: refinedData.macros?.vitaminC,
    },
    mealType: VALID_MEAL_TYPES.includes(refinedData.mealType) ? refinedData.mealType : 'dinner',
    cuisineType: (() => {
      // Handle cuisineType as string or array of strings
      if (Array.isArray(refinedData.cuisineType)) {
        return refinedData.cuisineType.filter((c: any) => typeof c === 'string');
      }
      if (typeof refinedData.cuisineType === 'string') {
        return refinedData.cuisineType;
      }
      return 'other'; // Default fallback
    })(),
    tags,
    dietaryTags: (refinedData.dietaryTags || []).filter((tag: string) => 
      VALID_DIETARY_TAGS.includes(tag as DietaryTag)
    ),
    cookingMethods: (refinedData.cookingMethods || []).filter((method: string) => 
      VALID_COOKING_METHODS.includes(method as CookingMethod)
    ),
    imageUrl: originalRecipe.imageUrl || refinedData.imageUrl,
    imageUrls: originalRecipe.imageUrls || refinedData.imageUrls,
    videoUrl: originalRecipe.videoUrl || refinedData.videoUrl,
    sourceUrl: originalRecipe.url || originalRecipe.sourceUrl,
    sourceName: refinedData.sourceName ? toMultilingual(refinedData.sourceName) : undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
    publishedAt: refinedData.published ? new Date() : undefined,
    isPublished: refinedData.published !== false,
    isFeatured: refinedData.featured || false,
  };
}

/**
 * Translate recipe text to all supported languages using OpenAI
 */
export async function translateRecipeText(
  text: string,
  sourceLanguage: Language = 'en'
): Promise<Record<Language, string>> {
  const languages: Language[] = ['en', 'de', 'nl', 'hu', 'fr', 'es', 'pt'];
  
  const prompt = `Translate the following text from ${sourceLanguage} to all these languages: English (en), German (de), Dutch (nl), Hungarian (hu), French (fr), Spanish (es), Portuguese (pt).

Original text (${sourceLanguage}): "${text}"

Return ONLY a JSON object with language codes as keys:
{
  "en": "English translation",
  "de": "German translation",
  "nl": "Dutch translation",
  "hu": "Hungarian translation",
  "fr": "French translation",
  "es": "Spanish translation",
  "pt": "Portuguese translation"
}`;

  try {
    const response = await openai.chat.completions.create({
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

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content in OpenAI response');
    }
    const jsonContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(jsonContent);
  } catch (error) {
    console.error('Translation error:', error);
    throw new Error(`Failed to translate text: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Check if OpenAI is accessible and API key is valid
 */
export async function checkOpenAIConnection(): Promise<{ connected: boolean; model?: string; error?: string }> {
  try {
    if (!OPENAI_CONFIG.apiKey) {
      return {
        connected: false,
        error: 'OPENAI_API_KEY is not set in environment variables',
      };
    }

    // Make a simple API call to verify the connection
    const response = await openai.chat.completions.create({
      model: OPENAI_CONFIG.model,
      messages: [
        {
          role: 'user',
          content: 'test',
        },
      ],
      max_tokens: 5,
    });

    if (response.choices && response.choices.length > 0) {
      return {
        connected: true,
        model: OPENAI_CONFIG.model,
      };
    }

    return {
      connected: false,
      error: 'OpenAI API returned an unexpected response',
    };
  } catch (error: any) {
    const errorMessage = error?.message || 'Unknown error';
    const errorCode = error?.code || error?.status;
    
    // Handle specific OpenAI API errors
    if (errorCode === 401 || errorMessage.includes('api key')) {
      return {
        connected: false,
        error: 'Invalid OpenAI API key',
      };
    }
    
    return {
      connected: false,
      error: `Failed to connect to OpenAI: ${errorMessage}`,
    };
  }
}

/**
 * @deprecated Use checkOpenAIConnection instead
 * Kept for backward compatibility
 */
export async function checkOllamaConnection(): Promise<{ connected: boolean; model?: string; error?: string }> {
  return checkOpenAIConnection();
}
