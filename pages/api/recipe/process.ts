import type { NextApiResponse } from 'next';
import { processAndSaveRecipe } from '@/lib/recipe';
import { withApiKey } from '@/middleware/auth';
import type { AuthenticatedRequest } from '@/middleware/auth';

/**
 * API route to process a recipe from an external URL
 * POST /api/recipe/process
 * Requires: X-API-Key header
 * Body: { recipeUrl: string }
 */
async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { recipeUrl } = req.body;

    if (!recipeUrl || typeof recipeUrl !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'recipeUrl is required and must be a string',
      });
    }

    const result = await processAndSaveRecipe(recipeUrl);

    if (!result.success) {
      return res.status(500).json(result);
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error('API route error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process recipe',
    });
  }
}

export default withApiKey(handler);

