import type { NextApiRequest, NextApiResponse } from 'next';
import connectDB from '@/lib/mongodb';
import ApiKeyModel from '@/models/ApiKey';
import UserModel from '@/models/User';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export interface AuthenticatedRequest extends NextApiRequest {
  user?: {
    id: string;
    email: string;
    name: string;
    isAdmin: boolean;
  };
  apiKey?: {
    id: string;
    userId: string;
    name: string;
  };
}

/**
 * JWT authentication middleware
 */
export async function authenticateJWT(
  req: AuthenticatedRequest,
  res: NextApiResponse,
  next: () => void
): Promise<boolean> {
  await connectDB();

  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    res.status(401).json({
      success: false,
      error: 'Authentication token is required',
    });
    return false;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      email: string;
      isAdmin: boolean;
    };

    const user = await UserModel.findById(decoded.userId);
    if (!user || !user.isActive) {
      res.status(401).json({
        success: false,
        error: 'Invalid or inactive user',
      });
      return false;
    }

    req.user = {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      isAdmin: user.isAdmin,
    };

    next();
    return true;
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Invalid or expired token',
    });
    return false;
  }
}

/**
 * API Key authentication middleware
 */
export async function authenticateApiKey(
  req: AuthenticatedRequest,
  res: NextApiResponse,
  next: () => void
): Promise<boolean> {
  await connectDB();

  const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');

  if (!apiKey || typeof apiKey !== 'string') {
    res.status(401).json({
      success: false,
      error: 'API key is required. Provide it in X-API-Key header or Authorization: Bearer <key>',
    });
    return false;
  }

  try {
    const apiKeyDoc = await ApiKeyModel.findByKey(apiKey);

    if (!apiKeyDoc) {
      res.status(401).json({
        success: false,
        error: 'Invalid or inactive API key',
      });
      return false;
    }

    // Get user from populated userId or fetch it
    let user: any;
    if (apiKeyDoc.userId && typeof apiKeyDoc.userId === 'object' && '_id' in apiKeyDoc.userId) {
      user = apiKeyDoc.userId;
    } else {
      user = await UserModel.findById(apiKeyDoc.userId);
    }

    if (!user || !user.isActive) {
      res.status(401).json({
        success: false,
        error: 'User account is inactive',
      });
      return false;
    }

    // Increment request count
    await apiKeyDoc.incrementRequestCount();

    // Attach user and API key info to request
    req.user = {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      isAdmin: user.isAdmin,
    };

    req.apiKey = {
      id: apiKeyDoc._id.toString(),
      userId: user._id.toString(),
      name: apiKeyDoc.name,
    };

    next();
    return true;
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication failed',
    });
    return false;
  }
}

/**
 * Admin-only middleware
 */
export function requireAdmin(
  req: AuthenticatedRequest,
  res: NextApiResponse,
  next: () => void
): boolean {
  if (!req.user || !req.user.isAdmin) {
    res.status(403).json({
      success: false,
      error: 'Admin access required',
    });
    return false;
  }

  next();
  return true;
}

/**
 * Wrapper for API routes that require JWT authentication
 */
export function withAuth(
  handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void> | void
) {
  return async (req: AuthenticatedRequest, res: NextApiResponse) => {
    const authenticated = await authenticateJWT(req, res, () => {});

    if (!authenticated) {
      return; // Response already sent by authenticateJWT
    }

    return handler(req, res);
  };
}

/**
 * Wrapper for API routes that require API key authentication
 */
export function withApiKey(
  handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void> | void
) {
  return async (req: AuthenticatedRequest, res: NextApiResponse) => {
    const authenticated = await authenticateApiKey(req, res, () => {});

    if (!authenticated) {
      return; // Response already sent by authenticateApiKey
    }

    return handler(req, res);
  };
}

/**
 * Wrapper for API routes that require admin access
 */
export function withAdmin(
  handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void> | void
) {
  return async (req: AuthenticatedRequest, res: NextApiResponse) => {
    const authenticated = await authenticateJWT(req, res, () => {});

    if (!authenticated) {
      return;
    }

    const authorized = requireAdmin(req, res, () => {});

    if (!authorized) {
      return;
    }

    return handler(req, res);
  };
}
