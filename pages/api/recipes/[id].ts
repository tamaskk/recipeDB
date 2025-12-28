import type { NextApiResponse } from 'next';
import connectDB from '@/lib/mongodb';
import RecipeModel from '@/models/Recipe';
import { withApiKey } from '@/middleware/auth';
import type { AuthenticatedRequest } from '@/middleware/auth';

/**
 * GET /api/recipes/[id] - Get a single recipe by ID
 * PUT /api/recipes/[id] - Update a recipe
 * DELETE /api/recipes/[id] - Delete a recipe
 * Requires: X-API-Key header
 */
async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse
) {
  await connectDB();

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Recipe ID is required',
    });
  }

  if (req.method === 'GET') {
    try {
      const recipe = await RecipeModel.findOne({ id }).lean();

      if (!recipe) {
        return res.status(404).json({
          success: false,
          error: 'Recipe not found',
        });
      }

      return res.status(200).json({
        success: true,
        data: recipe,
      });
    } catch (error) {
      console.error('Error fetching recipe:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch recipe',
      });
    }
  }

  if (req.method === 'PUT') {
    try {
      const updateData = {
        ...req.body,
        updatedAt: new Date(),
      };

      const recipe = await RecipeModel.findOneAndUpdate(
        { id },
        updateData,
        { new: true, runValidators: true }
      ).lean();

      if (!recipe) {
        return res.status(404).json({
          success: false,
          error: 'Recipe not found',
        });
      }

      return res.status(200).json({
        success: true,
        data: recipe,
      });
    } catch (error) {
      console.error('Error updating recipe:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update recipe',
      });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const recipe = await RecipeModel.findOneAndDelete({ id }).lean();

      if (!recipe) {
        return res.status(404).json({
          success: false,
          error: 'Recipe not found',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Recipe deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting recipe:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete recipe',
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default withApiKey(handler);

