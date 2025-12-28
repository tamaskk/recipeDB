import type { NextApiRequest, NextApiResponse } from 'next';
import connectDB from '@/lib/mongodb';
import RecipeModel from '@/models/Recipe';
import { analyzeTextAndSaveRecipe } from '@/lib/recipe';

// Store running import processes (in production, use Redis or a database)
// Key format: `import-letter-{letter}-{remoteAddress}`
const runningImports = new Map<string, { stop: boolean; letter: string }>();

// Concurrency limit for batch processing letters
const CONCURRENT_LETTERS = 5;
// Concurrency limit for processing meals within a letter
const CONCURRENT_MEALS = 5;

/**
 * POST /api/admin/import-mealdb-by-letter - Start importing recipes from TheMealDB by letter(s)
 *   Body: { letter: string } or { letters: string[] }
 * GET /api/admin/import-mealdb-by-letter - Get import status
 * DELETE /api/admin/import-mealdb-by-letter - Stop importing (all or specific letter)
 */
async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const baseKey = `import-letter-${req.socket.remoteAddress || 'anon'}`;

  if (req.method === 'POST') {
    console.log(`[DEBUG] POST /api/admin/import-mealdb-by-letter`);
    
    // Validate request body - accept either single letter or array of letters
    const { letter, letters } = req.body;
    
    let lettersToProcess: string[] = [];
    
    if (letters && Array.isArray(letters)) {
      // Batch mode: process multiple letters
      lettersToProcess = letters.map((l: string) => l.toLowerCase()).filter((l: string) => /^[a-z]$/.test(l));
      
      if (lettersToProcess.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid letters array. Please provide an array of valid letters (a-z, A-Z)',
        });
      }
    } else if (letter && typeof letter === 'string' && letter.length === 1) {
      // Single letter mode
      const normalizedLetter = letter.toLowerCase();
      if (!/^[a-z]$/.test(normalizedLetter)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid letter. Please provide a single letter (a-z, A-Z)',
        });
      }
      lettersToProcess = [normalizedLetter];
    } else {
      return res.status(400).json({
        success: false,
        error: 'Invalid request. Please provide either "letter" (string) or "letters" (array of strings)',
      });
    }

    // Check for already running letters
    const alreadyRunning: string[] = [];
    const newLetters: string[] = [];
    
    for (const l of lettersToProcess) {
      const importKey = `${baseKey}-${l}`;
      if (runningImports.has(importKey)) {
        alreadyRunning.push(l);
      } else {
        newLetters.push(l);
      }
    }

    if (alreadyRunning.length > 0) {
      console.log(`[DEBUG] Some letters already running: ${alreadyRunning.join(', ')}`);
    }

    if (newLetters.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'All requested letters are already being processed',
        alreadyRunning,
      });
    }

    console.log(`[DEBUG] Starting batch import for ${newLetters.length} letter(s): ${newLetters.join(', ')}`);
    console.log(`[DEBUG] Processing up to ${CONCURRENT_LETTERS} letters concurrently`);

    // Fetch meal counts for each letter before starting import
    const letterMealCounts: Array<{ letter: string; mealCount: number }> = [];
    
    for (const l of newLetters) {
      try {
        const mealCount = await fetchMealCountForLetter(l);
        letterMealCounts.push({ letter: l, mealCount });
        console.log(`[DEBUG] Letter '${l}' has ${mealCount} meals`);
      } catch (error) {
        console.error(`[ERROR] Failed to fetch meal count for letter '${l}':`, error);
        letterMealCounts.push({ letter: l, mealCount: 0 });
      }
    }

    const totalMeals = letterMealCounts.reduce((sum, item) => sum + item.mealCount, 0);

    // Process letters in batches with concurrency limit
    processLettersInBatches(newLetters, baseKey).catch((error) => {
      console.error(`[ERROR] Batch import process error:`, error);
    });

    return res.status(200).json({
      success: true,
      message: `Import process started for ${newLetters.length} letter(s)`,
      letters: newLetters,
      mealCounts: letterMealCounts,
      totalMeals,
      alreadyRunning: alreadyRunning.length > 0 ? alreadyRunning : undefined,
      concurrency: CONCURRENT_LETTERS,
      mealsConcurrency: CONCURRENT_MEALS,
    });
  }

  if (req.method === 'GET') {
    // Get import status for all running imports
    const runningLetters: string[] = [];
    const allRunning: Array<{ letter: string; key: string }> = [];
    
    for (const [key, value] of Array.from(runningImports.entries())) {
      if (key.startsWith(baseKey)) {
        runningLetters.push(value.letter);
        allRunning.push({ letter: value.letter, key });
      }
    }

    console.log(`[DEBUG] GET /api/admin/import-mealdb-by-letter - Running letters: ${runningLetters.join(', ') || 'none'}`);
    return res.status(200).json({
      success: true,
      data: {
        running: runningLetters.length > 0,
        runningLetters,
        count: runningLetters.length,
        allRunning,
      },
    });
  }

  if (req.method === 'DELETE') {
    console.log(`[DEBUG] DELETE /api/admin/import-mealdb-by-letter`);
    
    const { letter } = req.body;
    
    if (letter && typeof letter === 'string') {
      // Stop specific letter
      const normalizedLetter = letter.toLowerCase();
      const importKey = `${baseKey}-${normalizedLetter}`;
      
      if (!runningImports.has(importKey)) {
        return res.status(400).json({
          success: false,
          error: `No import process running for letter '${normalizedLetter}'`,
        });
      }

      const importControl = runningImports.get(importKey);
      if (importControl) {
        importControl.stop = true;
        console.log(`[DEBUG] Stopping import process for letter '${normalizedLetter}'`);
      }
      runningImports.delete(importKey);

      return res.status(200).json({
        success: true,
        message: `Import process stopped for letter '${normalizedLetter}'`,
      });
    } else {
      // Stop all running imports for this client
      const stoppedLetters: string[] = [];
      
      for (const [key, value] of Array.from(runningImports.entries())) {
        if (key.startsWith(baseKey)) {
          value.stop = true;
          stoppedLetters.push(value.letter);
          runningImports.delete(key);
        }
      }

      if (stoppedLetters.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No import processes are running',
        });
      }

      console.log(`[DEBUG] Stopped ${stoppedLetters.length} import process(es) for letters: ${stoppedLetters.join(', ')}`);
      return res.status(200).json({
        success: true,
        message: `Stopped ${stoppedLetters.length} import process(es)`,
        stoppedLetters,
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

/**
 * Fetch meal count for a specific letter from TheMealDB
 */
async function fetchMealCountForLetter(letter: string): Promise<number> {
  const apiUrl = `https://www.themealdb.com/api/json/v1/1/search.php?f=${letter}`;
  const response = await fetch(apiUrl);
  
  if (!response.ok) {
    throw new Error(`TheMealDB API error: ${response.status}`);
  }

  const data = await response.json();
  
  if (!data.meals || data.meals.length === 0) {
    return 0;
  }

  return data.meals.length;
}

/**
 * Process letters in batches with concurrency control
 */
async function processLettersInBatches(letters: string[], baseKey: string) {
  // Process letters in batches of CONCURRENT_LETTERS
  for (let i = 0; i < letters.length; i += CONCURRENT_LETTERS) {
    const batch = letters.slice(i, i + CONCURRENT_LETTERS);
    console.log(`[DEBUG] Processing batch ${Math.floor(i / CONCURRENT_LETTERS) + 1}: letters ${batch.join(', ')}`);
    
    // Process batch concurrently
    await Promise.all(
      batch.map((letter) => {
        const importKey = `${baseKey}-${letter}`;
        const importControl = { stop: false, letter };
        runningImports.set(importKey, importControl);
        
        console.log(`[DEBUG] Starting import process for letter: ${letter}`);
        
        return startImportProcess(importKey, importControl, letter).catch((error) => {
          console.error(`[ERROR] Import process error for letter ${letter}:`, error);
          runningImports.delete(importKey);
        });
      })
    );
    
    console.log(`[DEBUG] Batch completed: ${batch.join(', ')}`);
  }
  
  console.log(`[DEBUG] All letters processed: ${letters.join(', ')}`);
}

/**
 * Process a single meal
 * Returns: { processed: boolean, error: boolean, skipped: boolean }
 */
async function processMeal(
  importKey: string,
  meal: any,
  mealIndex: number,
  totalMeals: number
): Promise<{ processed: boolean; error: boolean; skipped: boolean }> {
  const recipeId = `themealdb-${meal.idMeal}`;
  
  console.log(`[DEBUG] [${importKey}] [${mealIndex}/${totalMeals}] Processing meal:`, {
    idMeal: meal.idMeal,
    strMeal: meal.strMeal,
    recipeId: recipeId,
  });

  try {
    // Check if recipe already exists
    console.log(`[DEBUG] [${importKey}] Checking if recipe ${recipeId} already exists...`);
    const existingRecipe = await RecipeModel.findOne({ 
      id: recipeId 
    });

    if (existingRecipe) {
      console.log(`[DEBUG] [${importKey}] Recipe ${meal.idMeal} (${meal.strMeal}) already exists, skipping...`);
      return { processed: false, error: false, skipped: true };
    }

    console.log(`[DEBUG] [${importKey}] Recipe ${recipeId} is new, proceeding with import...`);

    // Transform TheMealDB format to our recipe text format
    const recipeText = transformMealDBToText(meal, recipeId);
    console.log(`[DEBUG] [${importKey}] Recipe text transformed for ${recipeId}, length: ${recipeText.length} characters`);

    // Process and save recipe using our existing function
    console.log(`[DEBUG] [${importKey}] Sending recipe ${recipeId} to OpenAI for processing...`);
    const result = await analyzeTextAndSaveRecipe(recipeText);
    console.log(`[DEBUG] [${importKey}] OpenAI processing result for ${recipeId}:`, {
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

      console.log(`[SUCCESS] [${importKey}] Successfully imported recipe: ${meal.strMeal} (${meal.idMeal})`);
      return { processed: true, error: false, skipped: false };
    } else {
      console.error(`[ERROR] [${importKey}] Failed to import recipe ${meal.idMeal} (${meal.strMeal}):`, result.error);
      return { processed: false, error: true, skipped: false };
    }

  } catch (error) {
    console.error(`[ERROR] [${importKey}] Error processing meal ${meal.idMeal} (${meal.strMeal}):`, error);
    console.error(`[ERROR] [${importKey}] Error stack:`, error instanceof Error ? error.stack : 'No stack trace');
    return { processed: false, error: true, skipped: false };
  }
}

async function startImportProcess(
  importKey: string,
  control: { stop: boolean },
  letter: string
) {
  console.log(`[DEBUG] [${importKey}] Connecting to database...`);
  await connectDB();
  console.log(`[DEBUG] [${importKey}] Database connected successfully`);

  let processedCount = 0;
  let errorCount = 0;
  let skippedCount = 0;
  const delayBetweenBatches = 2000; // 2 seconds delay between batches

  console.log(`[DEBUG] [${importKey}] Starting TheMealDB import process for letter: ${letter}`);
  console.log(`[DEBUG] [${importKey}] Processing ${CONCURRENT_MEALS} meals concurrently per batch`);
  console.log(`[DEBUG] [${importKey}] Delay between batches: ${delayBetweenBatches}ms`);

  try {
    // Fetch meals from TheMealDB search API
    const apiUrl = `https://www.themealdb.com/api/json/v1/1/search.php?f=${letter}`;
    console.log(`[DEBUG] [${importKey}] Fetching meals from: ${apiUrl}`);
    
    const response = await fetch(apiUrl);
    
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
      console.log(`[DEBUG] [${importKey}] No meals found for letter '${letter}'`);
      runningImports.delete(importKey);
      return;
    }

    const meals = data.meals;
    console.log(`[DEBUG] [${importKey}] Processing ${meals.length} meals for letter '${letter}'...`);
    console.log(`[DEBUG] [${importKey}] Processing up to ${CONCURRENT_MEALS} meals concurrently`);

    // Process meals in batches with concurrency limit
    for (let i = 0; i < meals.length; i += CONCURRENT_MEALS) {
      // Check if process should stop
      if (control.stop) {
        console.log(`[DEBUG] [${importKey}] Import process stopped by user at meal ${i + 1}/${meals.length}`);
        break;
      }

      const batch = meals.slice(i, i + CONCURRENT_MEALS);
      const batchNumber = Math.floor(i / CONCURRENT_MEALS) + 1;
      const totalBatches = Math.ceil(meals.length / CONCURRENT_MEALS);
      
      console.log(`[DEBUG] [${importKey}] Processing batch ${batchNumber}/${totalBatches}: ${batch.length} meals concurrently`);

      // Process batch concurrently
      const batchResults = await Promise.allSettled(
        batch.map((meal: any, batchIndex: number) => 
          processMeal(importKey, meal, i + batchIndex + 1, meals.length)
        )
      );

      // Aggregate results from batch
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          const { processed, error, skipped } = result.value;
          if (processed) processedCount++;
          if (error) errorCount++;
          if (skipped) skippedCount++;
        } else {
          errorCount++;
          console.error(`[ERROR] [${importKey}] Batch processing error:`, result.reason);
        }
      }

      console.log(`[STATS] [${importKey}] Batch ${batchNumber} completed. Total processed: ${processedCount}, Errors: ${errorCount}, Skipped: ${skippedCount}`);

      // Small delay between batches (not between individual meals since they run concurrently)
      if (i + CONCURRENT_MEALS < meals.length) {
        console.log(`[DEBUG] [${importKey}] Waiting ${delayBetweenBatches}ms before next batch...`);
        await sleep(delayBetweenBatches);
      }
    }

    console.log(`[DEBUG] [${importKey}] Import process completed for letter '${letter}'`);
    console.log(`[FINAL STATS] [${importKey}] Processed: ${processedCount}, Errors: ${errorCount}, Skipped: ${skippedCount}`);

  } catch (error) {
    console.error(`[ERROR] [${importKey}] Error in import process:`, error);
    console.error(`[ERROR] [${importKey}] Error stack:`, error instanceof Error ? error.stack : 'No stack trace');
  } finally {
    runningImports.delete(importKey);
    console.log(`[DEBUG] [${importKey}] Import process cleaned up`);
  }
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

export default handler;

