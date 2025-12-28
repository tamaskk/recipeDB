import type { NextApiResponse } from 'next';
import connectDB from '@/lib/mongodb';
import ApiKeyModel from '@/models/ApiKey';
import { withAuth } from '@/middleware/auth';
import type { AuthenticatedRequest } from '@/middleware/auth';

/**
 * GET /api/user/apikeys - Get all API keys for the authenticated user
 * POST /api/user/apikeys - Create a new API key
 */
async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse
) {
  await connectDB();

  if (req.method === 'GET') {
    try {
      const apiKeys = await ApiKeyModel.find({ userId: req.user!.id })
        .select('-keyHash')
        .sort({ createdAt: -1 })
        .lean();

      return res.status(200).json({
        success: true,
        data: apiKeys,
      });
    } catch (error) {
      console.error('Error fetching API keys:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch API keys',
      });
    }
  }

  if (req.method === 'POST') {
    try {
      const { name } = req.body;

      const keyName = name || `Key ${new Date().toLocaleDateString()}`;

      // Generate API key
      const key = ApiKeyModel.generateKey();
      const keyHash = ApiKeyModel.hashKey(key);

      // Create API key
      const apiKey = await ApiKeyModel.create({
        userId: req.user!.id,
        name: keyName,
        key,
        keyHash,
        isActive: true,
      });

      return res.status(201).json({
        success: true,
        data: {
          id: apiKey._id.toString(),
          name: apiKey.name,
          key, // Only returned once during creation
          isActive: apiKey.isActive,
          requestCount: apiKey.requestCount,
          createdAt: apiKey.createdAt,
          message: 'Save this API key securely. It will not be shown again.',
        },
      });
    } catch (error) {
      console.error('Error creating API key:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create API key',
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default withAuth(handler);

