import type { NextApiResponse } from 'next';
import connectDB from '@/lib/mongodb';
import RecipeModel from '@/models/Recipe';
import { withAdmin } from '@/middleware/auth';
import type { AuthenticatedRequest } from '@/middleware/auth';

/**
 * GET /api/admin/recipes-filters - Get available filter options (admin only)
 */
async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  await connectDB();

  try {
    // Get distinct cuisines
    const cuisines = await RecipeModel.distinct('cuisineType');
    // Flatten array cuisines and get unique values
    const uniqueCuisines = Array.from(
      new Set(
        cuisines.flatMap((c: any) => {
          if (Array.isArray(c)) {
            return c;
          }
          return [c];
        })
      )
    ).filter((c: any) => c && typeof c === 'string').sort();

    // Get distinct meal types
    const mealTypes = await RecipeModel.distinct('mealType').sort();

    // Get distinct first letters from recipe names
    const recipes = await RecipeModel.find({}, { 'name.text': 1 }).lean();
    const letters = new Set<string>();
    recipes.forEach((recipe: any) => {
      const nameEn = recipe.name?.find((n: any) => n.language === 'en')?.text || recipe.name?.[0]?.text || '';
      if (nameEn && nameEn.length > 0) {
        const firstLetter = nameEn.charAt(0).toUpperCase();
        if (/[A-Z]/.test(firstLetter)) {
          letters.add(firstLetter);
        }
      }
    });
    const sortedLetters = Array.from(letters).sort();

    return res.status(200).json({
      success: true,
      data: {
        cuisines: uniqueCuisines,
        mealTypes,
        letters: sortedLetters,
      },
    });
  } catch (error) {
    console.error('Error fetching filter options:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch filter options',
    });
  }
}

export default withAdmin(handler);

