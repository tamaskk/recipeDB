import type { NextApiRequest, NextApiResponse } from 'next';
import connectDB from '@/lib/mongodb';
import UserModel from '@/models/User';

/**
 * POST /api/auth/register
 * Register a new user
 * Body: { email: string, name: string, password: string, country: string }
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  await connectDB();

  try {
    const { email, name, password, country } = req.body;

    if (!email || !name || !password || !country) {
      return res.status(400).json({
        success: false,
        error: 'Email, name, password, and country are required',
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters long',
      });
    }

    // Check if user already exists
    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'User with this email already exists',
      });
    }

    // Create user (password will be hashed by pre-save hook)
    const user = await UserModel.create({
      email,
      name,
      password,
      country,
      isActive: true,
      isAdmin: false,
    });

    return res.status(201).json({
      success: true,
      data: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        country: user.country,
        message: 'User registered successfully. Please login to access your dashboard.',
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to register user',
    });
  }
}
