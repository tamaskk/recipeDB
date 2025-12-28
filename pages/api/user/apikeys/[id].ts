import type { NextApiResponse } from 'next';
import connectDB from '@/lib/mongodb';
import ApiKeyModel from '@/models/ApiKey';
import { withAuth } from '@/middleware/auth';
import type { AuthenticatedRequest } from '@/middleware/auth';

/**
 * PUT /api/user/apikeys/[id] - Update API key (name, isActive)
 * DELETE /api/user/apikeys/[id] - Delete API key
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
      error: 'API key ID is required',
    });
  }

  if (req.method === 'PUT') {
    try {
      const { name, isActive } = req.body;

      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (isActive !== undefined) updateData.isActive = isActive;

      const apiKey = await ApiKeyModel.findOneAndUpdate(
        { _id: id, userId: req.user!.id },
        updateData,
        { new: true }
      ).select('-keyHash').lean();

      if (!apiKey) {
        return res.status(404).json({
          success: false,
          error: 'API key not found',
        });
      }

      return res.status(200).json({
        success: true,
        data: apiKey,
      });
    } catch (error) {
      console.error('Error updating API key:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update API key',
      });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const apiKey = await ApiKeyModel.findOneAndDelete({
        _id: id,
        userId: req.user!.id,
      });

      if (!apiKey) {
        return res.status(404).json({
          success: false,
          error: 'API key not found',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'API key deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting API key:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete API key',
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default withAuth(handler);

