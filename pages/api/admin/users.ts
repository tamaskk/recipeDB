import type { NextApiResponse } from 'next';
import connectDB from '@/lib/mongodb';
import UserModel from '@/models/User';
import { withAdmin } from '@/middleware/auth';
import type { AuthenticatedRequest } from '@/middleware/auth';

/**
 * GET /api/admin/users - Get all users (admin only)
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
    const {
      page = '1',
      limit = '50',
      isActive,
      isAdmin,
      search,
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const query: any = {};

    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (isAdmin !== undefined) query.isAdmin = isAdmin === 'true';
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
      ];
    }

    const users = await UserModel.find(query)
      .select('-apiKeyHash')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const total = await UserModel.countDocuments(query);

    return res.status(200).json({
      success: true,
      data: users,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch users',
    });
  }
}

export default withAdmin(handler);

