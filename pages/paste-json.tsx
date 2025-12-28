import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

export default function PasteJsonPage() {
  const router = useRouter();
  const [jsonText, setJsonText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message?: string;
    error?: string;
    processed?: number;
    errors?: number;
    skipped?: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const token = localStorage.getItem('adminToken');
    if (token) {
      setIsAuthenticated(true);
    } else {
      router.push('/admin');
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!jsonText.trim()) {
      setError('Please enter JSON text.');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setResult(null);

    try {
      // Validate JSON
      let jsonContent;
      try {
        jsonContent = JSON.parse(jsonText);
      } catch (parseError) {
        setError(`Invalid JSON: ${parseError instanceof Error ? parseError.message : 'Parse error'}`);
        setIsProcessing(false);
        return;
      }

      // Send to API
      const authToken = localStorage.getItem('adminToken');
      if (!authToken) {
        setError('Authentication required. Please login.');
        setIsProcessing(false);
        router.push('/admin');
        return;
      }

      const response = await fetch('/api/admin/paste-json', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ json: jsonContent }),
      });

      if (response.status === 401) {
        localStorage.removeItem('adminToken');
        setIsAuthenticated(false);
        setError('Session expired. Please login again.');
        router.push('/admin');
        return;
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to process JSON');
      }

      setResult({
        success: true,
        message: data.message,
        processed: data.data?.processed || 0,
        errors: data.data?.errors || 0,
        skipped: data.data?.skipped || 0,
      });
      
      // Clear the textarea on success
      setJsonText('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process JSON');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClear = () => {
    setJsonText('');
    setResult(null);
    setError(null);
  };

  if (!isMounted) {
    return null;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      <Head>
        <title>Paste JSON - Recipe DB</title>
      </Head>
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Paste JSON Recipe</h1>
                <p className="mt-2 text-sm text-gray-600">
                  Paste JSON recipe data and save it to the database
                </p>
              </div>
              <Link
                href="/admin"
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
              >
                Back to Admin
              </Link>
            </div>
          </div>

          {/* Form */}
          <div className="bg-white shadow rounded-lg">
            <form onSubmit={handleSubmit} className="p-6">
              <div className="mb-6">
                <label htmlFor="json-text" className="block text-sm font-medium text-gray-700 mb-2">
                  JSON Recipe Data
                </label>
                <textarea
                  id="json-text"
                  name="json-text"
                  rows={20}
                  value={jsonText}
                  onChange={(e) => setJsonText(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 font-mono text-sm text-black"
                  placeholder='Paste your JSON recipe here, for example:&#10;{&#10;  "id": "recipe-123",&#10;  "name": "Chicken Curry",&#10;  "ingredients": [...],&#10;  "steps": [...]&#10;}'
                />
                <p className="mt-2 text-sm text-gray-500">
                  Paste a single recipe object or an array of recipes. The JSON will be processed and saved to the database.
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-800">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Success Message */}
              {result && result.success && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-green-800">{result.message}</p>
                      {result.processed !== undefined && (
                        <div className="mt-2 text-sm text-green-700">
                          <p>Processed: {result.processed}</p>
                          {result.errors !== undefined && result.errors > 0 && (
                            <p>Errors: {result.errors}</p>
                          )}
                          {result.skipped !== undefined && result.skipped > 0 && (
                            <p>Skipped: {result.skipped}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Buttons */}
              <div className="flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={handleClear}
                  disabled={isProcessing}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Clear
                </button>
                <button
                  id="submit-button"
                  type="submit"
                  disabled={isProcessing || !jsonText.trim()}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </>
                  ) : (
                    'Save to Database'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </>
  );
}
