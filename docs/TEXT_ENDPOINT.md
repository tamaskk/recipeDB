# Text Analysis Endpoint

The `/api/text` endpoint allows you to paste any recipe text and have it automatically analyzed, structured, translated, and saved to the database.

## Endpoint

```
POST /api/text
```

## Request Body

```json
{
  "text": "Your recipe text here..."
}
```

## Response

### Success Response (200)

```json
{
  "success": true,
  "data": {
    "id": "recipe-1234567890-abc123",
    "name": [
      { "language": "en", "text": "Recipe Name" },
      { "language": "de", "text": "Rezeptname" },
      ...
    ],
    "ingredients": [...],
    "steps": [...],
    ...
  }
}
```

### Error Response (400/500)

```json
{
  "success": false,
  "error": "Error message here"
}
```

## Usage Examples

### Using cURL

```bash
curl -X POST http://localhost:3000/api/text \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Chocolate Chip Cookies\n\nIngredients:\n- 2 cups flour\n- 1 cup sugar\n- 1/2 cup butter\n\nInstructions:\n1. Mix ingredients\n2. Bake at 350°F for 12 minutes"
  }'
```

### Using JavaScript/TypeScript

```typescript
const response = await fetch('/api/text', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    text: `
      Classic Chocolate Chip Cookies
      
      Ingredients:
      - 2.5 cups all-purpose flour
      - 1 cup butter, softened
      - 1 cup brown sugar
      - 1/2 cup white sugar
      - 2 eggs
      - 2 cups chocolate chips
      - 1 tsp vanilla extract
      
      Instructions:
      1. Preheat oven to 375°F (190°C)
      2. Mix butter and sugars until creamy
      3. Add eggs and vanilla
      4. Gradually mix in flour
      5. Stir in chocolate chips
      6. Drop rounded tablespoons onto baking sheet
      7. Bake for 9-11 minutes until golden brown
    `,
  }),
});

const result = await response.json();
if (result.success) {
  console.log('Recipe saved:', result.data);
} else {
  console.error('Error:', result.error);
}
```

### Using React Component

```typescript
'use client';

import { useState } from 'react';

export function RecipeTextInput() {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste your recipe text here..."
        rows={10}
        className="w-full p-4 border rounded"
      />
      <button
        type="submit"
        disabled={loading || !text.trim()}
        className="mt-4 px-6 py-2 bg-blue-600 text-white rounded disabled:bg-gray-400"
      >
        {loading ? 'Analyzing...' : 'Analyze & Save Recipe'}
      </button>
      {result && (
        <div className="mt-4">
          {result.success ? (
            <div className="p-4 bg-green-50 rounded">
              <p className="text-green-800">Recipe saved successfully!</p>
              <pre className="mt-2 text-sm overflow-auto">
                {JSON.stringify(result.data, null, 2)}
              </pre>
            </div>
          ) : (
            <div className="p-4 bg-red-50 rounded">
              <p className="text-red-800">Error: {result.error}</p>
            </div>
          )}
        </div>
      )}
    </form>
  );
}
```

## How It Works

1. **Text Input**: You paste any recipe text (structured or unstructured)
2. **AI Analysis**: Ollama analyzes the text and extracts:
   - Recipe name
   - Ingredients with amounts and units
   - Cooking steps
   - Preparation and cooking times
   - Difficulty level
   - Nutritional information (if available)
   - Meal type and cuisine type
   - Tags and dietary information
3. **Translation**: The recipe is automatically translated into all 7 supported languages:
   - English (en)
   - German (de)
   - Dutch (nl)
   - Hungarian (hu)
   - French (fr)
   - Spanish (es)
   - Portuguese (pt)
4. **Database Save**: The structured recipe is saved to MongoDB
5. **Response**: The saved recipe is returned with a unique ID

## Supported Text Formats

The endpoint can handle various text formats:

- **Structured recipes** with clear sections (Ingredients, Instructions, etc.)
- **Unstructured recipes** in paragraph form
- **Recipe lists** with bullet points or numbered steps
- **Mixed formats** combining different styles

The AI will do its best to extract and structure the information, even from informal or incomplete text.

## Tips

1. **Be Descriptive**: Include as much detail as possible (ingredients, amounts, steps, cooking times)
2. **Clear Formatting**: While the AI can handle various formats, clear structure helps:
   - Separate ingredients from instructions
   - Use line breaks between steps
   - Include measurements and units
3. **Missing Information**: If some information is missing (like cooking time or difficulty), the AI will use reasonable defaults
4. **Language**: The text can be in any of the 7 supported languages - the AI will translate it to all languages

## Error Handling

- **Empty Text**: Returns 400 if text is empty or only whitespace
- **AI Processing Errors**: Returns 500 if Ollama processing fails
- **Database Errors**: Returns 500 if saving to MongoDB fails

## Example Recipe Text

```
Classic Margherita Pizza

Ingredients:
- 1 pizza dough (store-bought or homemade)
- 1/2 cup tomato sauce
- 8 oz fresh mozzarella, sliced
- Fresh basil leaves
- 2 tbsp olive oil
- Salt and pepper to taste

Instructions:
1. Preheat oven to 475°F (245°C)
2. Roll out pizza dough on a floured surface
3. Transfer to pizza pan or baking sheet
4. Spread tomato sauce evenly
5. Arrange mozzarella slices
6. Drizzle with olive oil
7. Season with salt and pepper
8. Bake for 12-15 minutes until crust is golden
9. Top with fresh basil before serving

Serves 2-3 people. Prep time: 15 minutes. Cook time: 15 minutes.
```

