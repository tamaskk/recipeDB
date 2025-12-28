import type { NextApiRequest, NextApiResponse } from 'next';
// import { withAdmin } from '@/middleware/auth';
// import type { AuthenticatedRequest } from '@/middleware/auth';
import connectDB from '@/lib/mongodb';
import RecipeModel from '@/models/Recipe';
import { analyzeTextAndSaveRecipe } from '@/lib/recipe';

// Store running import processes (in production, use Redis or a database)
const runningImports = new Map<string, { stop: boolean }>();

/**
 * POST /api/admin/import-mealdb - Start importing recipes from TheMealDB
 * GET /api/admin/import-mealdb - Get import status
 * DELETE /api/admin/import-mealdb - Stop importing
 */
async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const importKey = `import-${req.socket.remoteAddress || 'anon'}`;

  if (req.method === 'POST') {
    console.log(`[DEBUG] POST /api/admin/import-mealdb - Key: ${importKey}`);
    
    // Start import process
    if (runningImports.has(importKey)) {
      console.log(`[DEBUG] Import process already running for key ${importKey}`);
      return res.status(400).json({
        success: false,
        error: 'Import process is already running',
      });
    }

    // Mark as running
    const importControl = { stop: false };
    runningImports.set(importKey, importControl);
    console.log(`[DEBUG] Starting import process for key ${importKey}`);

    // Start the import process in the background
    startImportProcess(importKey, importControl).catch((error) => {
      console.error(`[ERROR] Import process error for key ${importKey}:`, error);
      runningImports.delete(importKey);
    });

    console.log(`[DEBUG] Import process started successfully for key ${importKey}`);
    return res.status(200).json({
      success: true,
      message: 'Import process started',
    });
  }

  if (req.method === 'GET') {
    // Get import status
    const isRunning = runningImports.has(importKey);
    console.log(`[DEBUG] GET /api/admin/import-mealdb - Key: ${importKey}, Running: ${isRunning}`);
    return res.status(200).json({
      success: true,
      data: {
        running: isRunning,
      },
    });
  }

  if (req.method === 'DELETE') {
    console.log(`[DEBUG] DELETE /api/admin/import-mealdb - Key: ${importKey}`);
    
    // Stop import process
    if (!runningImports.has(importKey)) {
      console.log(`[DEBUG] No import process running for key ${importKey}`);
      return res.status(400).json({
        success: false,
        error: 'No import process is running',
      });
    }

    const importControl = runningImports.get(importKey);
    if (importControl) {
      importControl.stop = true;
      console.log(`[DEBUG] Stopping import process for key ${importKey}`);
    }
    runningImports.delete(importKey);

    console.log(`[DEBUG] Import process stopped for key ${importKey}`);
    return res.status(200).json({
      success: true,
      message: 'Import process stopped',
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

async function startImportProcess(
  importKey: string,
  control: { stop: boolean }
) {
  console.log(`[DEBUG] [${importKey}] Connecting to database...`);
  await connectDB();
  console.log(`[DEBUG] [${importKey}] Database connected successfully`);

  let processedCount = 0;
  let errorCount = 0;
  let skippedCount = 0;
  const delayBetweenRequests = 2000; // 2 seconds delay between requests

  console.log(`[DEBUG] [${importKey}] Starting TheMealDB import process`);
  console.log(`[DEBUG] [${importKey}] Delay between requests: ${delayBetweenRequests}ms`);

  while (!control.stop) {
    try {
      console.log(`[DEBUG] [${importKey}] Fetching random recipe from TheMealDB...`);
      
      // Fetch random recipe from TheMealDB
      const response = await fetch('https://www.themealdb.com/api/json/v1/1/random.php');
      
      console.log(`[DEBUG] [${importKey}] TheMealDB API response status: ${response.status}`);
      
      if (!response.ok) {
        throw new Error(`TheMealDB API error: ${response.status}`);
      }

      const data = await response.json();
      console.log(`[DEBUG] [${importKey}] TheMealDB API response received:`, {
        hasMeals: !!data.meals,
        mealsCount: data.meals?.length || 0,
      });

      if (!data.meals || data.meals.length === 0) {
        console.log(`[DEBUG] [${importKey}] No meal data received, skipping...`);
        await sleep(delayBetweenRequests);
        continue;
      }

      const meal = data.meals[0];
      const recipeId = `themealdb-${meal.idMeal}`;
      
      console.log(`[DEBUG] [${importKey}] Processing meal:`, {
        idMeal: meal.idMeal,
        strMeal: meal.strMeal,
        strCategory: meal.strCategory,
        strArea: meal.strArea,
        recipeId: recipeId,
      });

      // Check if recipe already exists
      console.log(`[DEBUG] [${importKey}] Checking if recipe ${recipeId} already exists...`);
      const existingRecipe = await RecipeModel.findOne({ 
        id: recipeId 
      });

      if (existingRecipe) {
        skippedCount++;
        console.log(`[DEBUG] [${importKey}] Recipe ${meal.idMeal} (${meal.strMeal}) already exists, skipping... (Skipped: ${skippedCount})`);
        await sleep(delayBetweenRequests);
        continue;
      }

      console.log(`[DEBUG] [${importKey}] Recipe ${recipeId} is new, proceeding with import...`);

      // Transform TheMealDB format to our recipe text format
      const recipeText = transformMealDBToText(meal, recipeId);
      console.log(`[DEBUG] [${importKey}] Recipe text transformed, length: ${recipeText.length} characters`);

      // Process and save recipe using our existing function
      console.log(`[DEBUG] [${importKey}] Sending recipe to OpenAI for processing...`);
      const result = await analyzeTextAndSaveRecipe(recipeText);
      console.log(`[DEBUG] [${importKey}] OpenAI processing result:`, {
        success: result.success,
        hasData: !!result.data,
        error: result.error,
      });

      if (result.success && result.data) {
        console.log(`[DEBUG] [${importKey}] Recipe processed successfully, updating metadata...`);
        
        // Update the recipe ID and source URL using the MongoDB _id
        const recipeDoc = await RecipeModel.findById(result.data._id || result.data.id);
        if (recipeDoc) {
          console.log(`[DEBUG] [${importKey}] Found recipe document, updating ID and metadata...`);
          recipeDoc.id = recipeId;
          recipeDoc.sourceUrl = meal.strSource || `https://www.themealdb.com/meal.php?c=${meal.idMeal}`;
          if (meal.strMealThumb) {
            recipeDoc.imageUrl = meal.strMealThumb;
          }
          await recipeDoc.save();
          console.log(`[DEBUG] [${importKey}] Recipe document updated successfully`);
        } else {
          console.warn(`[DEBUG] [${importKey}] Recipe document not found after save, ID: ${result.data._id || result.data.id}`);
        }

        processedCount++;
        console.log(`[SUCCESS] [${importKey}] Successfully imported recipe: ${meal.strMeal} (${meal.idMeal})`);
        console.log(`[STATS] [${importKey}] Total processed: ${processedCount}, Errors: ${errorCount}, Skipped: ${skippedCount}`);
      } else {
        errorCount++;
        console.error(`[ERROR] [${importKey}] Failed to import recipe ${meal.idMeal} (${meal.strMeal}):`, result.error);
        console.log(`[STATS] [${importKey}] Total processed: ${processedCount}, Errors: ${errorCount}, Skipped: ${skippedCount}`);
      }

      // Wait before next request
      console.log(`[DEBUG] [${importKey}] Waiting ${delayBetweenRequests}ms before next request...`);
      await sleep(delayBetweenRequests);

    } catch (error) {
      errorCount++;
      console.error(`[ERROR] [${importKey}] Error in import process:`, error);
      console.error(`[ERROR] [${importKey}] Error stack:`, error instanceof Error ? error.stack : 'No stack trace');
      console.log(`[STATS] [${importKey}] Total processed: ${processedCount}, Errors: ${errorCount}, Skipped: ${skippedCount}`);
      
      // Wait a bit longer on error before retrying
      console.log(`[DEBUG] [${importKey}] Waiting ${delayBetweenRequests * 2}ms before retrying after error...`);
      await sleep(delayBetweenRequests * 2);
    }
  }

  console.log(`[DEBUG] [${importKey}] Import process stopped by user`);
  console.log(`[FINAL STATS] [${importKey}] Processed: ${processedCount}, Errors: ${errorCount}, Skipped: ${skippedCount}`);
  runningImports.delete(importKey);
  console.log(`[DEBUG] [${importKey}] Import process cleaned up`);
}

function transformMealDBToText(meal: any, recipeId: string): string {
  console.log(`[DEBUG] Transforming TheMealDB meal to text format for recipe ${recipeId}`);
  
  // Build ingredients list
  const ingredients: string[] = [];
  for (let i = 1; i <= 20; i++) {
    const ingredient = meal[`strIngredient${i}`];
    const measure = meal[`strMeasure${i}`];
    if (ingredient && ingredient.trim()) {
      const measureText = measure && measure.trim() ? measure.trim() : '';
      ingredients.push(`${measureText} ${ingredient}`.trim());
    }
  }

  console.log(`[DEBUG] Extracted ${ingredients.length} ingredients from meal ${recipeId}`);

  // Build recipe text with ID included so it can be extracted
  const recipeText = `
Recipe ID: ${recipeId}
Recipe Name: ${meal.strMeal || 'Untitled Recipe'}

Category: ${meal.strCategory || 'Unknown'}
Cuisine: ${meal.strArea || 'Unknown'}

Description: ${meal.strMealAlternate || meal.strMeal || ''}

Ingredients:
${ingredients.map((ing, idx) => `${idx + 1}. ${ing}`).join('\n')}

Instructions:
${meal.strInstructions || 'No instructions provided.'}

${meal.strYoutube ? `Video: ${meal.strYoutube}` : ''}
${meal.strSource ? `Source: ${meal.strSource}` : ''}
`.trim();

  console.log(`[DEBUG] Recipe text generated for ${recipeId}, length: ${recipeText.length} characters`);
  return recipeText;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// export default withAdmin(handler);
export default handler;
