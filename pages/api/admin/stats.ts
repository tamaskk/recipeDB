import type { NextApiResponse } from 'next';
import connectDB from '@/lib/mongodb';
import RecipeModel from '@/models/Recipe';
import UserModel from '@/models/User';
import { withAdmin } from '@/middleware/auth';
import type { AuthenticatedRequest } from '@/middleware/auth';

/**
 * GET /api/admin/stats - Get admin statistics (admin only)
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
    const [
      totalRecipes,
      publishedRecipes,
      totalUsers,
      activeUsers,
      totalRequests,
      recipesByMealType,
      recipesByCuisine,
    ] = await Promise.all([
      RecipeModel.countDocuments(),
      RecipeModel.countDocuments({ isPublished: true }),
      UserModel.countDocuments(),
      UserModel.countDocuments({ isActive: true }),
      UserModel.aggregate([
        { $group: { _id: null, total: { $sum: '$requestCount' } } },
      ]),
      RecipeModel.aggregate([
        { $group: { _id: '$mealType', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      RecipeModel.aggregate([
        { $group: { _id: '$cuisineType', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        recipes: {
          total: totalRecipes,
          published: publishedRecipes,
          unpublished: totalRecipes - publishedRecipes,
          byMealType: recipesByMealType,
          byCuisine: recipesByCuisine,
        },
        users: {
          total: totalUsers,
          active: activeUsers,
          inactive: totalUsers - activeUsers,
        },
        api: {
          totalRequests: totalRequests[0]?.total || 0,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch stats',
    });
  }
}

export default withAdmin(handler);

