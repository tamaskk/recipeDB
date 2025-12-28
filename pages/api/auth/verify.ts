import type { NextApiResponse } from 'next';
import { withApiKey } from '@/middleware/auth';
import type { AuthenticatedRequest } from '@/middleware/auth';

/**
 * GET /api/auth/verify
 * Verify API key and get user info
 */
async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse
) {
  return res.status(200).json({
    success: true,
    data: {
      user: req.user,
      apiKey: req.apiKey,
    },
  });
}

export default withApiKey(handler);

