import type { NextApiRequest, NextApiResponse } from 'next';
import { checkOpenAIConnection } from '@/lib/recipe';

/**
 * API route to check OpenAI connection status
 * GET /api/ollama/check (kept for backward compatibility)
 * GET /api/openai/check (new endpoint)
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const status = await checkOpenAIConnection();
    return res.status(200).json(status);
  } catch (error) {
    return res.status(500).json({
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

