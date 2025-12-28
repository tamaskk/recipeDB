import Head from 'next/head';
import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

interface FileResult {
  fileName: string;
  success: boolean;
  processed: number;
  errors: number;
  skipped: number;
  error?: string;
}

export default function UploadJsonPage() {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<FileResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [totals, setTotals] = useState<{ processed: number; errors: number; skipped: number } | null>(null);
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

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      (file) => file.type === 'application/json' || file.name.endsWith('.json')
    );

    if (droppedFiles.length > 0) {
      setFiles((prev) => [...prev, ...droppedFiles]);
      setError(null);
    } else {
      setError('Please drop JSON files only.');
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []).filter(
      (file) => file.type === 'application/json' || file.name.endsWith('.json')
    );

    if (selectedFiles.length > 0) {
      setFiles((prev) => [...prev, ...selectedFiles]);
      setError(null);
    }
  }, []);

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleProcess = async () => {
    if (files.length === 0) {
      setError('Please select at least one JSON file.');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setResults(null);
    setTotals(null);

    try {
      // Read all files
      const fileContents = await Promise.all(
        files.map(async (file) => {
          const text = await file.text();
          try {
            const content = JSON.parse(text);
            return { name: file.name, content };
          } catch (parseError) {
            throw new Error(`Failed to parse ${file.name}: ${parseError instanceof Error ? parseError.message : 'Invalid JSON'}`);
          }
        })
      );

      // Send to API with authentication
      const authToken = localStorage.getItem('adminToken');
      if (!authToken) {
        setError('Authentication required. Please login.');
        setIsProcessing(false);
        router.push('/admin');
        return;
      }

      const response = await fetch('/api/admin/upload-json', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ files: fileContents }),
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
        throw new Error(data.error || 'Failed to process files');
      }

      setResults(data.results);
      setTotals(data.totals);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process files');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClear = () => {
    setFiles([]);
    setResults(null);
    setTotals(null);
    setError(null);
  };

  if (!isMounted) {
    return (
      <>
        <Head>
          <title>Upload JSON Recipes - Recipe DB</title>
        </Head>
        <main className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </main>
      </>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      <Head>
        <title>Upload JSON Recipes - Recipe DB</title>
      </Head>
      <main className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Upload JSON Recipes</h1>
                  <p className="text-sm text-gray-500">Process multiple recipe JSON files</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <Link href="/admin" className="text-gray-600 hover:text-gray-900 text-sm font-medium">
                  Admin Dashboard
                </Link>
                <Link href="/" className="text-gray-600 hover:text-gray-900 text-sm font-medium">
                  Home
                </Link>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Upload Area */}
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Select JSON Files</h2>
            
            <div
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                isDragging
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <div className="mt-4">
                <label htmlFor="file-upload" className="cursor-pointer">
                  <span className="mt-2 block text-sm font-medium text-gray-900">
                    Drag and drop JSON files here, or{' '}
                    <span className="text-purple-600 hover:text-purple-500">browse</span>
                  </span>
                </label>
                <input
                  id="file-upload"
                  name="file-upload"
                  type="file"
                  multiple
                  accept=".json,application/json"
                  onChange={handleFileSelect}
                  className="sr-only"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">JSON files only. Up to 5 files processed concurrently.</p>
            </div>

            {/* File List */}
            {files.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  Selected Files ({files.length})
                </h3>
                <div className="space-y-2">
                  {files.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <svg
                          className="h-5 w-5 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                        <span className="text-sm font-medium text-gray-900">{file.name}</span>
                        <span className="text-xs text-gray-500">
                          ({(file.size / 1024).toFixed(2)} KB)
                        </span>
                      </div>
                      <button
                        onClick={() => removeFile(index)}
                        className="text-red-600 hover:text-red-700 text-sm font-medium"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-6 flex items-center space-x-4">
              <button
                onClick={handleProcess}
                disabled={files.length === 0 || isProcessing}
                className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 12 5.373 12 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </span>
                ) : (
                  `Process ${files.length} File${files.length !== 1 ? 's' : ''}`
                )}
              </button>
              {files.length > 0 && (
                <button
                  onClick={handleClear}
                  disabled={isProcessing}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Clear All
                </button>
              )}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {/* Results */}
          {results && totals && (
            <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Processing Results</h2>
              
              {/* Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <p className="text-sm font-medium text-green-800">Processed</p>
                  <p className="text-2xl font-bold text-green-900">{totals.processed}</p>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                  <p className="text-sm font-medium text-yellow-800">Skipped</p>
                  <p className="text-2xl font-bold text-yellow-900">{totals.skipped}</p>
                </div>
                <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                  <p className="text-sm font-medium text-red-800">Errors</p>
                  <p className="text-2xl font-bold text-red-900">{totals.errors}</p>
                </div>
              </div>

              {/* File Results */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-700">File Details</h3>
                {results.map((result, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border ${
                      result.success
                        ? 'bg-green-50 border-green-200'
                        : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{result.fileName}</p>
                        <div className="mt-2 flex items-center space-x-4 text-sm">
                          <span className="text-green-600">✓ {result.processed} processed</span>
                          {result.skipped > 0 && (
                            <span className="text-yellow-600">⊘ {result.skipped} skipped</span>
                          )}
                          {result.errors > 0 && (
                            <span className="text-red-600">✗ {result.errors} errors</span>
                          )}
                        </div>
                        {result.error && (
                          <p className="mt-2 text-sm text-red-700">{result.error}</p>
                        )}
                      </div>
                      {result.success ? (
                        <span className="text-green-600 font-medium">Success</span>
                      ) : (
                        <span className="text-red-600 font-medium">Failed</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}

