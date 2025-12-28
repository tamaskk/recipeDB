# Ollama Integration Setup

This guide explains how to set up and use Ollama with your Next.js Recipe DB application.

## Prerequisites

1. **Install Ollama**: Download and install Ollama from [https://ollama.ai](https://ollama.ai)

2. **Pull a Model**: Download a model (e.g., llama3):
   ```bash
   ollama pull llama3
   ```

3. **Start Ollama**: Make sure Ollama is running:
   ```bash
   ollama serve
   ```
   Or start it as a service/daemon depending on your OS.

## Configuration

Create a `.env.local` file in your project root:

```env
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=llama3
```

## Usage

### 1. API Routes (Recommended)

Use the API route to process recipes:

```typescript
const response = await fetch('/api/recipe/process', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ recipeUrl: 'https://api.example.com/recipes/123' }),
});

const result = await response.json();
```

### 2. Using Library Functions Directly

You can also import and use the functions directly in API routes or server-side code:

```typescript
import { processAndSaveRecipe, checkOllamaConnection } from '@/lib/recipe';

// In an API route or server-side function
const result = await processAndSaveRecipe('https://api.example.com/recipes/123');
const status = await checkOllamaConnection();
```

### 3. Check Ollama Connection

Test if Ollama is running and accessible via API:

```bash
curl http://localhost:3000/api/ollama/check
```

## How It Works

1. **Fetch Recipe**: The function fetches recipe data from the provided URL
2. **Process with Ollama**: Sends the recipe to Ollama for refinement and translation into all 7 supported languages
3. **Transform**: Converts the Ollama response to match your Recipe model structure
4. **Return**: Returns the processed recipe ready to be saved to your database

## Supported Languages

The integration automatically translates recipes into:
- English (en)
- German (de)
- Dutch (nl)
- Hungarian (hu)
- French (fr)
- Spanish (es)
- Portuguese (pt)

## Example

### Client-Side Component

```typescript
'use client';

import { useState } from 'react';

export function RecipeProcessor() {
  const [recipeUrl, setRecipeUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/recipe/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipeUrl }),
      });

      const result = await response.json();
      
      if (result.success) {
        console.log('Processed recipe:', result.data);
        // Save to database
        // await saveRecipeToDB(result.data);
      } else {
        console.error('Error:', result.error);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form UI */}
    </form>
  );
}
```

### Server-Side (API Route)

```typescript
import type { NextApiRequest, NextApiResponse } from 'next';
import { processAndSaveRecipe } from '@/lib/recipe';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { recipeUrl } = req.body;
  const result = await processAndSaveRecipe(recipeUrl);
  res.json(result);
}
```

## Troubleshooting

### Ollama Not Running

If you get connection errors:
1. Check if Ollama is running: `curl http://localhost:11434/api/tags`
2. Start Ollama: `ollama serve`
3. Verify the model is installed: `ollama list`

### Model Not Found

If the specified model isn't available:
1. List available models: `ollama list`
2. Pull the model: `ollama pull llama3`
3. Update `.env.local` with the correct model name

### Timeout Issues

For production deployments (like Vercel), note that:
- Serverless functions have execution time limits
- Ollama processing can be slow
- Consider using a long-running server or background job queue for production

## Next Steps

1. Set up your database (Prisma, Drizzle, etc.)
2. Implement the save functionality in `processAndSaveRecipe`
3. Add error handling and validation
4. Create UI components for recipe processing

