import type { NextApiResponse } from 'next';
import connectDB from '@/lib/mongodb';
import RecipeModel from '@/models/Recipe';
import { withAdmin } from '@/middleware/auth';
import type { AuthenticatedRequest } from '@/middleware/auth';

/**
 * GET /api/admin/recipes - Get recipes with search and pagination (admin only)
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
      limit = '10',
      search,
      sortBy,
      sortOrder,
      cuisine,
      mealType,
      letter,
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // Build query
    const query: any = {};
    const andConditions: any[] = [];

    // Search filter
    if (search && typeof search === 'string' && search.trim()) {
      andConditions.push({
        $or: [
          { 'name.text': { $regex: search.trim(), $options: 'i' } },
          { 'description.text': { $regex: search.trim(), $options: 'i' } },
          { id: { $regex: search.trim(), $options: 'i' } },
        ],
      });
    }

    // Filter by cuisine
    if (cuisine && typeof cuisine === 'string' && cuisine.trim()) {
      // Handle both string and array cuisineType
      andConditions.push({
        $or: [
          { cuisineType: cuisine.trim() },
          { cuisineType: { $in: [cuisine.trim()] } },
        ],
      });
    }

    // Filter by meal type
    if (mealType && typeof mealType === 'string' && mealType.trim()) {
      andConditions.push({ mealType: mealType.trim() });
    }

    // Filter by first letter of recipe name (must START with the letter)
    if (letter && typeof letter === 'string' && letter.trim().length === 1) {
      const letterRegex = new RegExp(`^${letter.trim()}`, 'i');
      // Match recipes where English name starts with the letter
      // The ^ in regex ensures it matches only at the start of the string
      andConditions.push({
        'name': { $elemMatch: { language: 'en', text: letterRegex } },
      });
    }

    // Combine all conditions
    if (andConditions.length > 0) {
      query.$and = andConditions;
    }

    // Build sort object
    let sortObj: any = { createdAt: -1 }; // Default sort

    if (sortBy && typeof sortBy === 'string') {
      const order = sortOrder === 'asc' ? 1 : sortOrder === 'desc' ? -1 : 0;
      
      if (order !== 0) {
        switch (sortBy) {
          case 'id':
            sortObj = { id: order };
            break;
          case 'name':
            sortObj = { 'name.text': order };
            break;
          case 'mealType':
            sortObj = { mealType: order };
            break;
          case 'cuisine':
            sortObj = { cuisineType: order };
            break;
          case 'created':
            sortObj = { createdAt: order };
            break;
          default:
            sortObj = { createdAt: -1 };
        }
      } else {
        // Original order (by creation date descending)
        sortObj = { createdAt: -1 };
      }
    }

    const recipes = await RecipeModel.find(query)
      .sort(sortObj)
      .skip(skip)
      .limit(limitNum)
      .lean();

    const total = await RecipeModel.countDocuments(query);

    return res.status(200).json({
      success: true,
      data: recipes,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Error fetching recipes:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch recipes',
    });
  }
}

export default withAdmin(handler);


