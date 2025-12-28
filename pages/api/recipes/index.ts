import type { NextApiResponse } from 'next';
import connectDB from '@/lib/mongodb';
import RecipeModel from '@/models/Recipe';
import { withApiKey } from '@/middleware/auth';
import type { AuthenticatedRequest } from '@/middleware/auth';

/**
 * GET /api/recipes - Get all recipes (with optional filters)
 * POST /api/recipes - Create a new recipe
 * Requires: X-API-Key header
 */
async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse
) {
  await connectDB();

  if (req.method === 'GET') {
    try {
      const {
        page = '1',
        limit = '10',
        mealType,
        cuisineType,
        isPublished,
        isFeatured,
        search,
      } = req.query;

      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);
      const skip = (pageNum - 1) * limitNum;

      // Build query
      const query: any = {};

      if (mealType) query.mealType = mealType;
      if (cuisineType) {
        // Handle cuisineType filtering - MongoDB's equality check works for both:
        // - String: exact match
        // - Array: checks if array contains the value
        const cuisineValue = cuisineType as string;
        if (search) {
          // Will combine with search conditions below
          query._cuisineCondition = { cuisineType: cuisineValue };
        } else {
          query.cuisineType = cuisineValue;
        }
      }
      if (isPublished !== undefined) query.isPublished = isPublished === 'true';
      if (isFeatured !== undefined) query.isFeatured = isFeatured === 'true';
      if (search) {
        const searchConditions = [
          { 'name.text': { $regex: search, $options: 'i' } },
          { 'description.text': { $regex: search, $options: 'i' } },
        ];
        // Combine with cuisineType condition if it exists
        if (query._cuisineCondition) {
          query.$and = [
            query._cuisineCondition, // cuisineType condition
            { $or: searchConditions }, // search conditions
          ];
          delete query._cuisineCondition;
        } else {
          query.$or = searchConditions;
        }
      }

      const recipes = await RecipeModel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean();

      const total = await RecipeModel.countDocuments(query);

      return res.status(200).json({
        success: true,
        data: recipes,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      });
    } catch (error) {
      console.error('Error fetching recipes:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch recipes',
      });
    }
  }

  if (req.method === 'POST') {
    try {
      const recipeData = req.body;

      // Generate ID if not provided
      if (!recipeData.id) {
        recipeData.id = `recipe-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      }

      // Check if recipe with same ID already exists
      const existingRecipe = await RecipeModel.findOne({ id: recipeData.id });
      if (existingRecipe) {
        return res.status(400).json({
          success: false,
          error: 'Recipe with this ID already exists',
        });
      }

      const recipe = await RecipeModel.create({
        ...recipeData,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return res.status(201).json({
        success: true,
        data: recipe.toJSON(),
      });
    } catch (error) {
      console.error('Error creating recipe:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create recipe',
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default withApiKey(handler);

