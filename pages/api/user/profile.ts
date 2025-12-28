import type { NextApiResponse } from 'next';
import connectDB from '@/lib/mongodb';
import UserModel from '@/models/User';
import { withAuth } from '@/middleware/auth';
import type { AuthenticatedRequest } from '@/middleware/auth';

/**
 * GET /api/user/profile - Get user profile
 * PUT /api/user/profile - Update user profile
 */
async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse
) {
  await connectDB();

  if (req.method === 'GET') {
    try {
      const user = await UserModel.findById(req.user!.id).select('-password').lean();

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        });
      }

      return res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch profile',
      });
    }
  }

  if (req.method === 'PUT') {
    try {
      const { name, country } = req.body;

      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (country !== undefined) updateData.country = country;

      const user = await UserModel.findByIdAndUpdate(
        req.user!.id,
        updateData,
        { new: true }
      ).select('-password').lean();

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        });
      }

      return res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update profile',
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default withAuth(handler);

