# MongoDB Setup Guide

This guide explains how to set up MongoDB for the Recipe DB application.

## Prerequisites

1. **MongoDB Atlas Account**: Sign up at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. **Connection String**: Get your MongoDB connection string from Atlas

## Configuration

### 1. Environment Variables

Create a `.env.local` file in your project root:

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=gpt-oss:120b-cloud
```

**Important**: Replace the connection string with your actual MongoDB Atlas connection string.

### 2. Connection String Format

Your MongoDB connection string should look like:
```
mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority
```

## Database Schema

The Recipe model is automatically created when you first save a recipe. The collection name is `recipes`.

### Recipe Document Structure

Each recipe document contains:
- **id**: Unique identifier (string)
- **slug**: URL-friendly identifier (multilingual array)
- **name**: Recipe name (multilingual array)
- **description**: Recipe description (multilingual array)
- **ingredients**: Array of ingredient objects
- **steps**: Array of recipe step objects
- **macros**: Nutritional information
- **time**: Preparation and cooking times
- **difficulty**: Difficulty level (1-10)
- **servings**: Number of servings
- And many more fields as defined in the Recipe type

## API Endpoints

### Process and Save Recipe

```bash
POST /api/recipe/process
Content-Type: application/json

{
  "recipeUrl": "https://api.example.com/recipes/123"
}
```

### Get All Recipes

```bash
GET /api/recipes?page=1&limit=10&mealType=dinner&cuisineType=italian
```

Query Parameters:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)
- `mealType`: Filter by meal type
- `cuisineType`: Filter by cuisine type
- `isPublished`: Filter by published status (true/false)
- `isFeatured`: Filter by featured status (true/false)
- `search`: Search in name and description

### Get Single Recipe

```bash
GET /api/recipes/[id]
```

### Create Recipe

```bash
POST /api/recipes
Content-Type: application/json

{
  "id": "recipe-123",
  "name": [...],
  "ingredients": [...],
  ...
}
```

### Update Recipe

```bash
PUT /api/recipes/[id]
Content-Type: application/json

{
  "name": [...],
  "difficulty": 5,
  ...
}
```

### Delete Recipe

```bash
DELETE /api/recipes/[id]
```

## Usage Examples

### Process a Recipe from External API

```typescript
const response = await fetch('/api/recipe/process', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    recipeUrl: 'https://api.example.com/recipes/123',
  }),
});

const result = await response.json();
console.log(result.data); // Saved recipe
```

### Fetch All Recipes

```typescript
const response = await fetch('/api/recipes?page=1&limit=10');
const result = await response.json();
console.log(result.data); // Array of recipes
console.log(result.pagination); // Pagination info
```

### Fetch Single Recipe

```typescript
const response = await fetch('/api/recipes/recipe-123');
const result = await response.json();
console.log(result.data); // Recipe object
```

## Indexes

The Recipe model includes the following indexes for optimal query performance:
- `id`: Unique index
- `slug.language` + `slug.text`: For slug lookups
- `name.language`: For name searches
- `mealType`: For filtering by meal type
- `cuisineType`: For filtering by cuisine type
- `isPublished`: For filtering published recipes
- `isFeatured`: For filtering featured recipes
- `createdAt`: For sorting by date

## Troubleshooting

### Connection Errors

If you get connection errors:
1. Verify your MongoDB URI is correct
2. Check that your IP address is whitelisted in MongoDB Atlas
3. Ensure your username and password are correct
4. Check network connectivity

### Model Not Found

If you get "Model not found" errors:
- The model is automatically registered when first imported
- Make sure you're calling `connectDB()` before using the model
- Check that the model file is being imported correctly

### Validation Errors

If you get validation errors:
- Check that all required fields are present
- Verify field types match the schema
- Ensure enum values are valid

## Production Considerations

1. **Connection Pooling**: The connection is cached globally to prevent connection exhaustion
2. **Error Handling**: Always wrap database operations in try-catch blocks
3. **Indexes**: Indexes are created automatically, but monitor query performance
4. **Backup**: Set up regular backups in MongoDB Atlas
5. **Monitoring**: Use MongoDB Atlas monitoring to track performance

