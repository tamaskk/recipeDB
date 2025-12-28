import type { NextApiResponse } from 'next';
import connectDB from '@/lib/mongodb';
import RecipeModel from '@/models/Recipe';
import { withAdmin } from '@/middleware/auth';
import type { AuthenticatedRequest } from '@/middleware/auth';
import { Language, MultilingualText } from '@/types/recipe';

/**
 * POST /api/admin/paste-json - Process JSON recipe text pasted by user
 * Body: { json: any }
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
    const { json } = req.body;

    if (!json) {
      return res.status(400).json({
        success: false,
        error: 'JSON data is required',
      });
    }

    console.log(`[PASTE-JSON] Processing pasted JSON data`);

    // Handle different JSON structures
    let recipes: any[] = [];

    // If content is an array, use it directly
    if (Array.isArray(json)) {
      recipes = json;
    }
    // If content has a 'recipes' or 'data' property, use that
    else if (json.recipes && Array.isArray(json.recipes)) {
      recipes = json.recipes;
    } else if (json.data && Array.isArray(json.data)) {
      recipes = json.data;
    }
    // If content is a single recipe object, wrap it in an array
    else if (typeof json === 'object' && json !== null) {
      recipes = [json];
    } else {
      return res.status(400).json({
        success: false,
        error: 'Invalid JSON structure. Expected recipe object or array of recipes.',
      });
    }

    console.log(`[PASTE-JSON] Found ${recipes.length} recipe(s) to process`);

    let processed = 0;
    let errors = 0;
    let skipped = 0;
    const errorMessages: string[] = [];

    // Process recipes one by one
    for (let i = 0; i < recipes.length; i++) {
      const recipe = recipes[i];
      const recipeIndex = i + 1;

      try {
        console.log(`[PASTE-JSON] [${recipeIndex}/${recipes.length}] Processing recipe...`);

        // Transform JSON to Recipe model format
        const recipeData = transformJsonToRecipeModel(recipe);

        // Generate unique ID if not provided
        if (!recipeData.id) {
          recipeData.id = `paste-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        }

        // Check if recipe with same ID already exists
        const existingRecipe = await RecipeModel.findOne({ id: recipeData.id });
        
        if (existingRecipe) {
          console.log(`[PASTE-JSON] Recipe ${recipeIndex} skipped (already exists)`);
          skipped++;
          continue;
        }

        // Save recipe directly to database
        const savedRecipe = await RecipeModel.create(recipeData);
        
        if (savedRecipe) {
          console.log(`[PASTE-JSON] Recipe ${recipeIndex} saved successfully`);
          processed++;
        } else {
          throw new Error('Failed to save recipe to database');
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[PASTE-JSON] Recipe ${recipeIndex} error:`, errorMsg);
        errors++;
        errorMessages.push(`Recipe ${recipeIndex}: ${errorMsg}`);
      }
    }

    const message = `Processed ${recipes.length} recipe(s). ${processed} successful, ${errors} failed${skipped > 0 ? `, ${skipped} skipped` : ''}.`;

    return res.status(200).json({
      success: true,
      message,
      data: {
        processed,
        errors,
        skipped,
        errorMessages: errorMessages.length > 0 ? errorMessages : undefined,
      },
    });
  } catch (error) {
    console.error('[PASTE-JSON] Error processing JSON:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process JSON',
    });
  }
}

/**
 * Transform JSON recipe to Recipe model format
 */
function transformJsonToRecipeModel(recipe: any): any {
  const languages: Language[] = ['en', 'de', 'nl', 'hu', 'fr', 'es', 'pt'];
  
  // Helper to convert to MultilingualText array
  const toMultilingual = (field: any, defaultValue: string = ''): MultilingualText[] => {
    if (!field) {
      return [{ language: 'en', text: defaultValue }];
    }
    
    if (typeof field === 'string') {
      return [{ language: 'en', text: field }];
    }
    
    if (Array.isArray(field)) {
      // Already in MultilingualText format
      return field.filter((item: any) => item.language && item.text);
    }
    
    if (typeof field === 'object') {
      // Object with language keys
      const result: MultilingualText[] = [];
      languages.forEach(lang => {
        if (field[lang]) {
          result.push({ language: lang, text: String(field[lang]) });
        }
      });
      return result.length > 0 ? result : [{ language: 'en', text: defaultValue }];
    }
    
    return [{ language: 'en', text: defaultValue }];
  };

  // Helper to generate slug from name
  const generateSlug = (name: MultilingualText[]): MultilingualText[] => {
    return name.map(item => ({
      language: item.language,
      text: item.text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, ''),
    }));
  };

  // Transform recipe data
  const recipeData: any = {
    id: recipe.id || recipe.recipeId || recipe._id || `paste-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    slug: generateSlug(toMultilingual(recipe.name, 'untitled-recipe')),
    name: toMultilingual(recipe.name, 'Untitled Recipe'),
    description: toMultilingual(recipe.description, ''),
    info: recipe.info ? toMultilingual(recipe.info) : [],
    ingredients: recipe.ingredients ? recipe.ingredients.map((ing: any) => ({
      name: toMultilingual(ing.name, 'Ingredient'),
      amount: ing.amount || 0,
      unit: toMultilingual(ing.unit, ''),
      notes: ing.notes ? toMultilingual(ing.notes) : [],
      isOptional: ing.isOptional || false,
      category: ing.category ? toMultilingual(ing.category) : [],
    })) : [],
    steps: recipe.steps ? recipe.steps.map((step: any, index: number) => ({
      stepNumber: step.stepNumber || index + 1,
      instructions: toMultilingual(step.instructions || step.instruction || step.text, ''),
      imageUrl: step.imageUrl,
      timeMinutes: step.timeMinutes || step.time,
    })) : [],
    difficulty: recipe.difficulty || 5,
    servings: recipe.servings || 4,
    servingsUnit: recipe.servingsUnit ? toMultilingual(recipe.servingsUnit) : [],
    time: recipe.time || {
      prepMinutes: recipe.prepMinutes || 0,
      cookMinutes: recipe.cookMinutes || 0,
      totalMinutes: recipe.totalMinutes || recipe.prepMinutes + recipe.cookMinutes || 0,
    },
    macros: recipe.macros || {
      calories: recipe.calories || 500,
      protein: recipe.protein || 0,
      carbohydrates: recipe.carbohydrates || 0,
      fat: recipe.fat || 0,
    },
    macrosPerServing: recipe.macrosPerServing,
    mealType: recipe.mealType || 'dinner',
    cuisineType: recipe.cuisineType || 'unknown',
    tags: recipe.tags ? recipe.tags.map((tag: any) => toMultilingual(tag)) : [],
    dietaryTags: recipe.dietaryTags || [],
    cookingMethods: recipe.cookingMethods || [],
    imageUrl: recipe.imageUrl || recipe.image,
    imageUrls: recipe.imageUrls || [],
    videoUrl: recipe.videoUrl || recipe.video,
    equipment: recipe.equipment ? recipe.equipment.map((eq: any) => toMultilingual(eq)) : [],
    tips: recipe.tips ? toMultilingual(recipe.tips) : [],
    variations: recipe.variations ? toMultilingual(recipe.variations) : [],
    storage: recipe.storage ? toMultilingual(recipe.storage) : [],
    reheating: recipe.reheating ? toMultilingual(recipe.reheating) : [],
    sourceUrl: recipe.sourceUrl || recipe.source,
    sourceName: recipe.sourceName ? toMultilingual(recipe.sourceName) : [],
    author: recipe.author ? toMultilingual(recipe.author) : [],
    authorId: recipe.authorId,
    rating: recipe.rating,
    ratingCount: recipe.ratingCount,
    favoriteCount: recipe.favoriteCount,
    createdAt: recipe.createdAt ? new Date(recipe.createdAt) : new Date(),
    updatedAt: recipe.updatedAt ? new Date(recipe.updatedAt) : new Date(),
    publishedAt: recipe.publishedAt ? new Date(recipe.publishedAt) : undefined,
    isPublished: recipe.isPublished !== undefined ? recipe.isPublished : false,
    isFeatured: recipe.isFeatured || false,
    keywords: recipe.keywords ? recipe.keywords.map((kw: any) => toMultilingual(kw)) : [],
    metaDescription: recipe.metaDescription ? toMultilingual(recipe.metaDescription) : [],
    relatedRecipeIds: recipe.relatedRecipeIds || [],
    version: recipe.version || 1,
    parentRecipeId: recipe.parentRecipeId,
  };

  return recipeData;
}

export default withAdmin(handler);
