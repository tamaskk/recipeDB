import Head from 'next/head';
import Link from 'next/link';
import { useState } from 'react';
import { Recipe } from '@/types/recipe';

export default function TextPage() {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; data?: Recipe; error?: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: text.trim() }),
      });

      const data = await response.json();
      setResult(data);

      // Clear textarea on success
      if (data.success) {
        setText('');
      }
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setText('');
    setResult(null);
  };

  return (
    <>
      <Head>
        <title>Analyze Recipe Text - Recipe DB</title>
        <meta name="description" content="Paste recipe text and let AI analyze, translate, and save it" />
      </Head>

      <main className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white shadow-lg rounded-lg overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-8">
              <h1 className="text-3xl font-bold text-white mb-2">
                Analyze Recipe Text
              </h1>
              <p className="text-blue-100">
                Paste any recipe text below and our AI will analyze, translate, and save it to the database
              </p>
            </div>

            {/* Form */}
            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="recipe-text" className="block text-sm font-medium text-gray-700 mb-2">
                    Recipe Text
                  </label>
                  <textarea
                    id="recipe-text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Paste your recipe text here...&#10;&#10;Example:&#10;Chocolate Chip Cookies&#10;&#10;Ingredients:&#10;- 2 cups flour&#10;- 1 cup sugar&#10;- 1/2 cup butter&#10;&#10;Instructions:&#10;1. Mix ingredients&#10;2. Bake at 350°F for 12 minutes"
                    rows={15}
                    className="w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y font-mono text-sm"
                    required
                    disabled={loading}
                  />
                  <p className="mt-2 text-sm text-gray-500">
                    {text.length} characters
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={loading || !text.trim()}
                    className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 12 5.373 12 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Analyzing...
                      </span>
                    ) : (
                      'Analyze & Save Recipe'
                    )}
                  </button>
                  {text && (
                    <button
                      type="button"
                      onClick={handleClear}
                      disabled={loading}
                      className="px-6 py-3 border border-gray-300 rounded-md font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Results */}
            {result && (
              <div className={`px-6 pb-6 ${result.success ? 'bg-green-50' : 'bg-red-50'}`}>
                <div className={`p-4 rounded-md border ${result.success ? 'bg-white border-green-200' : 'bg-white border-red-200'}`}>
                  {result.success ? (
                    <div>
                      <div className="flex items-center mb-3">
                        <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <h3 className="text-lg font-semibold text-green-800">
                          Recipe Saved Successfully!
                        </h3>
                      </div>
                      <div className="mb-3">
                        <p className="text-sm text-gray-600 mb-2">
                          <strong>Recipe ID:</strong> {result.data?.id}
                        </p>
                        {result.data?.name && result.data.name.length > 0 && (
                          <p className="text-sm text-gray-600">
                            <strong>Name:</strong> {result.data.name.find(n => n.language === 'en')?.text || result.data.name[0]?.text}
                          </p>
                        )}
                      </div>
                      <details className="mt-4">
                        <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                          View Full Recipe Data
                        </summary>
                        <pre className="mt-2 p-4 bg-gray-900 text-green-400 rounded-md text-xs overflow-auto max-h-96">
                          {JSON.stringify(result.data, null, 2)}
                        </pre>
                      </details>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center mb-3">
                        <svg className="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <h3 className="text-lg font-semibold text-red-800">
                          Error
                        </h3>
                      </div>
                      <p className="text-red-600">{result.error}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Info Section */}
            <div className="px-6 pb-6 bg-gray-50 border-t">
              <div className="mt-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Tips:</h3>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>Paste any recipe text - structured or unstructured</li>
                  <li>Include ingredients, amounts, and instructions for best results</li>
                  <li>The AI will automatically translate to 7 languages</li>
                  <li>Missing information will be filled with reasonable defaults</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="mt-6 text-center">
            <Link
              href="/"
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}

