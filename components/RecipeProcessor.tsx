import { useState } from 'react';
import { Recipe } from '@/types/recipe';

export function RecipeProcessor() {
  const [recipeUrl, setRecipeUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; data?: Recipe; error?: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/recipe/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ recipeUrl }),
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
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4">Process Recipe with OpenAI</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="recipeUrl" className="block text-sm font-medium mb-2">
            Recipe URL
          </label>
          <input
            id="recipeUrl"
            type="url"
            value={recipeUrl}
            onChange={(e) => setRecipeUrl(e.target.value)}
            placeholder="https://api.example.com/recipes/123"
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
            disabled={loading}
          />
        </div>

        <button
          type="submit"
          disabled={loading || !recipeUrl}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {loading ? 'Processing...' : 'Process Recipe'}
        </button>
      </form>

      {result && (
        <div className={`mt-6 p-4 rounded-md ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          {result.success ? (
            <div>
              <h3 className="font-semibold text-green-800 mb-2">Success!</h3>
              <pre className="text-sm overflow-auto bg-white p-4 rounded border">
                {JSON.stringify(result.data, null, 2)}
              </pre>
            </div>
          ) : (
            <div>
              <h3 className="font-semibold text-red-800 mb-2">Error</h3>
              <p className="text-red-600">{result.error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

