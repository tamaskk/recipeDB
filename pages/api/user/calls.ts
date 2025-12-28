import type { NextApiResponse } from 'next';
import connectDB from '@/lib/mongodb';
import ApiKeyModel from '@/models/ApiKey';
import { withAuth } from '@/middleware/auth';
import type { AuthenticatedRequest } from '@/middleware/auth';

/**
 * GET /api/user/calls - Get call statistics for all API keys
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
    const apiKeys = await ApiKeyModel.find({ userId: req.user!.id })
      .select('name key requestCount lastUsedAt createdAt')
      .sort({ requestCount: -1 })
      .lean();

    const totalCalls = apiKeys.reduce((sum, key) => sum + key.requestCount, 0);

    return res.status(200).json({
      success: true,
      data: {
        totalCalls,
        apiKeys: apiKeys.map(key => ({
          id: key._id.toString(),
          name: key.name,
          requestCount: key.requestCount,
          lastUsedAt: key.lastUsedAt,
          createdAt: key.createdAt,
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching call statistics:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch call statistics',
    });
  }
}

export default withAuth(handler);

