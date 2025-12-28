import type { NextApiResponse } from 'next';
import connectDB from '@/lib/mongodb';
import { analyzeTextAndSaveRecipe } from '@/lib/recipe';
import { withAdmin } from '@/middleware/auth';
import type { AuthenticatedRequest } from '@/middleware/auth';

// Concurrency limit for processing JSON files
const CONCURRENT_FILES = 5;

/**
 * POST /api/admin/upload-json - Process multiple JSON recipe files
 * Body: { files: Array<{ name: string, content: any }> }
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
    const { files } = req.body;

    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'files array is required and must not be empty',
      });
    }

    console.log(`[UPLOAD-JSON] Processing ${files.length} JSON files with concurrency limit of ${CONCURRENT_FILES}`);

    // Process files in batches
    const results: Array<{
      fileName: string;
      success: boolean;
      processed: number;
      errors: number;
      skipped: number;
      error?: string;
    }> = [];

    for (let i = 0; i < files.length; i += CONCURRENT_FILES) {
      const batch = files.slice(i, i + CONCURRENT_FILES);
      const batchNumber = Math.floor(i / CONCURRENT_FILES) + 1;
      const totalBatches = Math.ceil(files.length / CONCURRENT_FILES);

      console.log(`[UPLOAD-JSON] Processing batch ${batchNumber}/${totalBatches}: ${batch.length} files`);

      // Process batch concurrently
      const batchResults = await Promise.allSettled(
        batch.map((file: { name: string; content: any }) =>
          processJsonFile(file.name, file.content)
        )
      );

      // Aggregate batch results
      for (let j = 0; j < batchResults.length; j++) {
        const result = batchResults[j];
        const fileName = batch[j].name;

        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          console.error(`[UPLOAD-JSON] Error processing file ${fileName}:`, result.reason);
          results.push({
            fileName,
            success: false,
            processed: 0,
            errors: 0,
            skipped: 0,
            error: result.reason instanceof Error ? result.reason.message : String(result.reason),
          });
        }
      }

      console.log(`[UPLOAD-JSON] Batch ${batchNumber} completed`);
    }

    // Calculate totals
    const totals = results.reduce(
      (acc, result) => ({
        processed: acc.processed + result.processed,
        errors: acc.errors + result.errors,
        skipped: acc.skipped + result.skipped,
      }),
      { processed: 0, errors: 0, skipped: 0 }
    );

    console.log(`[UPLOAD-JSON] All files processed. Total: ${totals.processed} processed, ${totals.errors} errors, ${totals.skipped} skipped`);

    return res.status(200).json({
      success: true,
      results,
      totals,
    });
  } catch (error) {
    console.error('[UPLOAD-JSON] Error processing files:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process JSON files',
    });
  }
}

/**
 * Process a single JSON file
 */
async function processJsonFile(
  fileName: string,
  content: any
): Promise<{
  fileName: string;
  success: boolean;
  processed: number;
  errors: number;
  skipped: number;
  error?: string;
}> {
  let processed = 0;
  let errors = 0;
  let skipped = 0;

  try {
    // Handle different JSON structures
    let recipes: any[] = [];

    // If content is an array, use it directly
    if (Array.isArray(content)) {
      recipes = content;
    }
    // If content has a 'recipes' or 'data' property, use that
    else if (content.recipes && Array.isArray(content.recipes)) {
      recipes = content.recipes;
    } else if (content.data && Array.isArray(content.data)) {
      recipes = content.data;
    }
    // If content is a single recipe object, wrap it in an array
    else if (typeof content === 'object' && content !== null) {
      recipes = [content];
    } else {
      throw new Error('Invalid JSON structure. Expected array of recipes or object with recipes/data property.');
    }

    console.log(`[UPLOAD-JSON] [${fileName}] Found ${recipes.length} recipe(s) to process`);

    // Process recipes in batches of 5
    for (let i = 0; i < recipes.length; i += CONCURRENT_FILES) {
      const batch = recipes.slice(i, i + CONCURRENT_FILES);
      
      const batchResults = await Promise.allSettled(
        batch.map((recipe: any, index: number) =>
          processRecipeFromJson(fileName, recipe, i + index + 1, recipes.length)
        )
      );

      // Aggregate batch results
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          const { processed: p, error: e, skipped: s } = result.value;
          if (p) processed++;
          if (e) errors++;
          if (s) skipped++;
        } else {
          errors++;
          console.error(`[UPLOAD-JSON] [${fileName}] Recipe processing error:`, result.reason);
        }
      }
    }

    return {
      fileName,
      success: true,
      processed,
      errors,
      skipped,
    };
  } catch (error) {
    console.error(`[UPLOAD-JSON] [${fileName}] Error:`, error);
    return {
      fileName,
      success: false,
      processed,
      errors,
      skipped,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Process a single recipe from JSON
 */
async function processRecipeFromJson(
  fileName: string,
  recipe: any,
  recipeIndex: number,
  totalRecipes: number
): Promise<{ processed: boolean; error: boolean; skipped: boolean }> {
  try {
    // Convert JSON recipe to text format for OpenAI processing
    const recipeText = convertJsonToText(recipe);
    
    console.log(`[UPLOAD-JSON] [${fileName}] [${recipeIndex}/${totalRecipes}] Processing recipe with OpenAI...`);

    // Process and save recipe using OpenAI (ChatGPT)
    const result = await analyzeTextAndSaveRecipe(recipeText, false);

    if (result.success && result.data) {
      if (result.skipped) {
        console.log(`[UPLOAD-JSON] [${fileName}] Recipe ${recipeIndex} skipped (already exists)`);
        return { processed: false, error: false, skipped: true };
      }
      console.log(`[UPLOAD-JSON] [${fileName}] Recipe ${recipeIndex} processed successfully`);
      return { processed: true, error: false, skipped: false };
    } else {
      console.error(`[UPLOAD-JSON] [${fileName}] Recipe ${recipeIndex} failed:`, result.error);
      return { processed: false, error: true, skipped: false };
    }
  } catch (error) {
    console.error(`[UPLOAD-JSON] [${fileName}] Recipe ${recipeIndex} error:`, error);
    return { processed: false, error: true, skipped: false };
  }
}

/**
 * Convert JSON recipe object to text format for OpenAI processing
 */
function convertJsonToText(recipe: any): string {
  // Extract recipe ID if available
  const recipeId = recipe.id || recipe.recipeId || recipe._id || `json-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // Extract name (handle multilingual or simple string)
  const name = extractMultilingualText(recipe.name) || recipe.name || recipe.title || 'Untitled Recipe';
  
  // Extract description
  const description = extractMultilingualText(recipe.description) || recipe.description || '';
  
  // Extract category/cuisine
  const category = recipe.category || recipe.cuisine || recipe.cuisineType || 'Unknown';
  const cuisine = Array.isArray(recipe.cuisineType) 
    ? recipe.cuisineType.join(', ') 
    : recipe.cuisine || recipe.cuisineType || recipe.area || 'Unknown';
  
  // Extract ingredients
  const ingredients: string[] = [];
  if (Array.isArray(recipe.ingredients)) {
    recipe.ingredients.forEach((ing: any) => {
      if (typeof ing === 'string') {
        ingredients.push(ing);
      } else if (ing.name) {
        const ingName = extractMultilingualText(ing.name) || ing.name;
        const amount = ing.amount || ing.quantity || '';
        const unit = ing.unit || '';
        ingredients.push(`${amount} ${unit} ${ingName}`.trim());
      }
    });
  }
  
  // Extract instructions/steps
  let instructions = '';
  if (recipe.instructions) {
    instructions = Array.isArray(recipe.instructions)
      ? recipe.instructions.map((step: any, idx: number) => {
          const stepText = extractMultilingualText(step) || step.instructions || step.text || step;
          return `${idx + 1}. ${stepText}`;
        }).join('\n')
      : extractMultilingualText(recipe.instructions) || recipe.instructions;
  } else if (recipe.steps && Array.isArray(recipe.steps)) {
    instructions = recipe.steps.map((step: any, idx: number) => {
      const stepText = extractMultilingualText(step.instructions) || step.instructions || step.text || step;
      return `${idx + 1}. ${stepText}`;
    }).join('\n');
  }
  
  // Build recipe text
  const recipeText = `
Recipe ID: ${recipeId}
Recipe Name: ${name}

Category: ${category}
Cuisine: ${cuisine}

Description: ${description}

Ingredients:
${ingredients.map((ing, idx) => `${idx + 1}. ${ing}`).join('\n')}

Instructions:
${instructions || 'No instructions provided.'}

${recipe.sourceUrl ? `Source: ${recipe.sourceUrl}` : ''}
${recipe.imageUrl ? `Image: ${recipe.imageUrl}` : ''}
`.trim();

  return recipeText;
}

/**
 * Extract text from multilingual object or return string
 */
function extractMultilingualText(field: any): string | null {
  if (!field) return null;
  
  if (typeof field === 'string') {
    return field;
  }
  
  if (typeof field === 'object') {
    // Try English first
    if (field.en) return field.en;
    if (field.text) return field.text;
    // Return first available value
    const values = Object.values(field);
    if (values.length > 0 && typeof values[0] === 'string') {
      return values[0] as string;
    }
  }
  
  return null;
}

export default withAdmin(handler);

