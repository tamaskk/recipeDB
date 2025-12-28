import type { NextApiResponse } from 'next';
import { analyzeTextAndSaveRecipe } from '@/lib/recipe';
import { withApiKey } from '@/middleware/auth';
import type { AuthenticatedRequest } from '@/middleware/auth';

/**
 * API route to analyze text and save recipe to database
 * POST /api/text
 * Requires: X-API-Key header
 * Body: { text: string }
 */
async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'text is required and must be a non-empty string',
      });
    }

    const result = await analyzeTextAndSaveRecipe(text.trim());

    if (!result.success) {
      return res.status(500).json(result);
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error('API route error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to analyze and save recipe',
    });
  }
}

export default withApiKey(handler);

