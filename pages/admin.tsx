import Head from 'next/head';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import RecipeModal from '@/components/RecipeModal';

interface Stats {
  recipes: {
    total: number;
    published: number;
    unpublished: number;
    byMealType: Array<{ _id: string; count: number }>;
    byCuisine: Array<{ _id: string; count: number }>;
  };
  users: {
    total: number;
    active: number;
    inactive: number;
  };
  api: {
    totalRequests: number;
  };
}

interface User {
  _id: string;
  email: string;
  name: string;
  country: string;
  isActive: boolean;
  isAdmin: boolean;
  createdAt: string;
}

interface Recipe {
  _id: string;
  id: string;
  name: Array<{ language: string; text: string }>;
  description?: Array<{ language: string; text: string }>;
  isPublished: boolean;
  isFeatured: boolean;
  mealType: string;
  cuisineType: string;
  createdAt: string;
  updatedAt: string;
}

interface RecipesPagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export default function AdminPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [recipesPagination, setRecipesPagination] = useState<RecipesPagination | null>(null);
  const [recipesLoading, setRecipesLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [hasSearched, setHasSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'stats' | 'users' | 'recipes' | 'upload' | 'paste'>('stats');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  
  // Sorting state: null = original, 'asc' = ascending, 'desc' = descending
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>(null);
  
  // Filter state
  const [filterCuisine, setFilterCuisine] = useState<string>('');
  const [filterMealType, setFilterMealType] = useState<string>('');
  const [filterLetter, setFilterLetter] = useState<string>('');
  
  // Filter options
  const [filterOptions, setFilterOptions] = useState<{
    cuisines: string[];
    mealTypes: string[];
    letters: string[];
  }>({ cuisines: [], mealTypes: [], letters: [] });

  // Upload JSON state
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploadProcessing, setIsUploadProcessing] = useState(false);
  const [uploadResults, setUploadResults] = useState<Array<{
    fileName: string;
    success: boolean;
    processed: number;
    errors: number;
    skipped: number;
    error?: string;
  }> | null>(null);

  // Recipe modal state
  const [selectedRecipe, setSelectedRecipe] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleRecipeClick = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setIsModalOpen(true);
  };
  const [uploadTotals, setUploadTotals] = useState<{ processed: number; errors: number; skipped: number } | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      // Check if response is ok and has content
      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          // If response is not JSON, use status text
          const text = await response.text();
          if (text) errorMessage = text;
        }
        setError(errorMessage);
        return;
      }

      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Login failed');
        return;
      }

      if (!data.data.user.isAdmin) {
        setError('Access denied. Admin privileges required.');
        return;
      }

      // Store token
      const authToken = data.data.token;
      localStorage.setItem('adminToken', authToken);
      setToken(authToken);
      setIsAuthenticated(true);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to authenticate');
    } finally {
      setLoading(false);
    }
  };

  const loadData = async () => {
    const authToken = localStorage.getItem('adminToken');
    if (!authToken) return;

    setLoading(true);
    setError(null);

    try {
      const headers = {
        'Authorization': `Bearer ${authToken}`,
      };

      const [statsRes, usersRes] = await Promise.all([
        fetch('/api/admin/stats', { headers }),
        fetch('/api/admin/users', { headers }),
      ]);

      if (!statsRes.ok || !usersRes.ok) {
        if (statsRes.status === 401 || usersRes.status === 401) {
          localStorage.removeItem('adminToken');
          setToken(null);
          setError('Session expired. Please login again.');
          return;
        }
        throw new Error('Failed to load data');
      }

      const statsData = await statsRes.json();
      const usersData = await usersRes.json();

      if (!statsData.success || !usersData.success) {
        throw new Error('Failed to load data');
      }

      setStats(statsData.data);
      setUsers(usersData.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
      if (err instanceof Error && err.message.includes('401')) {
        localStorage.removeItem('adminToken');
        setToken(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setIsMounted(true);
    
    const storedToken = localStorage.getItem('adminToken');
    if (storedToken) {
      setToken(storedToken);
      setIsAuthenticated(true);
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load filter options when Recipes tab becomes active
  useEffect(() => {
    if (isAuthenticated && activeTab === 'recipes') {
      loadFilterOptions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, isAuthenticated]);

  // Auto-load recipes when Recipes tab becomes active
  useEffect(() => {
    if (isAuthenticated && activeTab === 'recipes' && !hasSearched && recipes.length === 0) {
      setHasSearched(true);
      loadRecipes(1, 10, '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, isAuthenticated]);

  const loadFilterOptions = async () => {
    const authToken = localStorage.getItem('adminToken');
    if (!authToken) return;

    try {
      const response = await fetch('/api/admin/recipes-filters', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setFilterOptions(data.data);
        }
      }
    } catch (err) {
      console.error('Failed to load filter options:', err);
    }
  };

  const loadRecipes = async (
    page: number = currentPage,
    limit: number = pageSize,
    search: string = searchQuery,
    sort: { sortBy: string | null; sortOrder: 'asc' | 'desc' | null } = { sortBy, sortOrder },
    filters: { cuisine: string; mealType: string; letter: string } = { cuisine: filterCuisine, mealType: filterMealType, letter: filterLetter }
  ) => {
    const authToken = localStorage.getItem('adminToken');
    if (!authToken) return;

    setRecipesLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      
      if (search && search.trim()) {
        params.append('search', search.trim());
      }

      if (sort.sortBy && sort.sortOrder) {
        params.append('sortBy', sort.sortBy);
        params.append('sortOrder', sort.sortOrder);
      }

      if (filters.cuisine) {
        params.append('cuisine', filters.cuisine);
      }

      if (filters.mealType) {
        params.append('mealType', filters.mealType);
      }

      if (filters.letter) {
        params.append('letter', filters.letter);
      }

      const response = await fetch(`/api/admin/recipes?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('adminToken');
          setToken(null);
          setError('Session expired. Please login again.');
          return;
        }
        throw new Error('Failed to load recipes');
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to load recipes');
      }

      setRecipes(data.data);
      setRecipesPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load recipes');
    } finally {
      setRecipesLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    setHasSearched(true);
    loadRecipes(1, pageSize, searchQuery, { sortBy, sortOrder }, { cuisine: filterCuisine, mealType: filterMealType, letter: filterLetter });
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    loadRecipes(newPage, pageSize, searchQuery, { sortBy, sortOrder }, { cuisine: filterCuisine, mealType: filterMealType, letter: filterLetter });
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
    loadRecipes(1, newSize, searchQuery, { sortBy, sortOrder }, { cuisine: filterCuisine, mealType: filterMealType, letter: filterLetter });
  };

  const handleSort = (column: string) => {
    let newSortOrder: 'asc' | 'desc' | null = null;
    let newSortBy: string | null = null;

    if (sortBy === column) {
      // Cycle through: asc -> desc -> original (null)
      if (sortOrder === 'asc') {
        newSortOrder = 'desc';
        newSortBy = column;
      } else if (sortOrder === 'desc') {
        newSortOrder = null;
        newSortBy = null;
      }
    } else {
      // New column, start with asc
      newSortOrder = 'asc';
      newSortBy = column;
    }

    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
    setCurrentPage(1);
    loadRecipes(1, pageSize, searchQuery, { sortBy: newSortBy, sortOrder: newSortOrder }, { cuisine: filterCuisine, mealType: filterMealType, letter: filterLetter });
  };

  const handleFilterChange = (filterType: 'cuisine' | 'mealType' | 'letter', value: string) => {
    if (filterType === 'cuisine') {
      setFilterCuisine(value);
    } else if (filterType === 'mealType') {
      setFilterMealType(value);
    } else if (filterType === 'letter') {
      setFilterLetter(value);
    }
    setCurrentPage(1);
    setHasSearched(true);
    
    const newFilters = {
      cuisine: filterType === 'cuisine' ? value : filterCuisine,
      mealType: filterType === 'mealType' ? value : filterMealType,
      letter: filterType === 'letter' ? value : filterLetter,
    };
    
    loadRecipes(1, pageSize, searchQuery, { sortBy, sortOrder }, newFilters);
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    setToken(null);
    setIsAuthenticated(false);
    setStats(null);
    setUsers([]);
    setRecipes([]);
    setRecipesPagination(null);
    setEmail('');
    setPassword('');
  };

  // Upload JSON handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      (file) => file.type === 'application/json' || file.name.endsWith('.json')
    );

    if (droppedFiles.length > 0) {
      setUploadFiles((prev) => [...prev, ...droppedFiles]);
      setError(null);
    } else {
      setError('Please drop JSON files only.');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []).filter(
      (file) => file.type === 'application/json' || file.name.endsWith('.json')
    );

    if (selectedFiles.length > 0) {
      setUploadFiles((prev) => [...prev, ...selectedFiles]);
      setError(null);
    }
  };

  const removeUploadFile = (index: number) => {
    setUploadFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleProcessUpload = async () => {
    if (uploadFiles.length === 0) {
      setError('Please select at least one JSON file.');
      return;
    }

    setIsUploadProcessing(true);
    setError(null);
    setUploadResults(null);
    setUploadTotals(null);

    try {
      const authToken = localStorage.getItem('adminToken');
      if (!authToken) {
        setError('Authentication required. Please login again.');
        setIsUploadProcessing(false);
        return;
      }

      // Read all files
      const fileContents = await Promise.all(
        uploadFiles.map(async (file) => {
          const text = await file.text();
          try {
            const content = JSON.parse(text);
            return { name: file.name, content };
          } catch (parseError) {
            throw new Error(`Failed to parse ${file.name}: ${parseError instanceof Error ? parseError.message : 'Invalid JSON'}`);
          }
        })
      );

      // Send to API
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
        setToken(null);
        setError('Session expired. Please login again.');
        setIsUploadProcessing(false);
        return;
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to process files');
      }

      setUploadResults(data.results);
      setUploadTotals(data.totals);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process files');
    } finally {
      setIsUploadProcessing(false);
    }
  };

  const handleClearUpload = () => {
    setUploadFiles([]);
    setUploadResults(null);
    setUploadTotals(null);
    setError(null);
  };

  // Prevent hydration mismatch by not rendering until mounted
  if (!isMounted) {
    return (
      <>
        <Head>
          <title>Admin Dashboard - Recipe DB</title>
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
    return (
      <>
        <Head>
          <title>Admin Login - Recipe DB</title>
        </Head>
        <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl mb-4 shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">Admin Login</h1>
              <p className="text-white/70 text-sm">Enter your admin credentials to continue</p>
            </div>
            
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-white/90 mb-2">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-white/90 mb-2">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  required
                  disabled={loading}
                />
              </div>
              
              {error && (
                <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-200 text-sm backdrop-blur-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 px-4 rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 12 5.373 12 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Logging in...
                  </span>
                ) : (
                  'Login'
                )}
              </button>
            </form>

            <div className="mt-6 text-center space-y-2">
              <Link href="/" className="text-white/70 hover:text-white text-sm block">
                ← Back to Home
              </Link>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Admin Dashboard - Recipe DB</title>
      </Head>
      <main className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>
                  <p className="text-sm text-gray-500">Recipe DB Administration</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <Link href="/" className="text-gray-600 hover:text-gray-900 text-sm font-medium">
                  Home
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-red-600 hover:text-red-700 text-sm font-medium"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Tabs */}
          <div className="mb-8">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('stats')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'stats'
                      ? 'border-purple-600 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="flex items-center space-x-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <span>Statistics</span>
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('users')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'users'
                      ? 'border-purple-600 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="flex items-center space-x-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    <span>Users</span>
                  </span>
                </button>
                <button
                  onClick={() => {
                    setActiveTab('recipes');
                    if (!hasSearched && recipes.length === 0) {
                      // Auto-load first 10 recipes when tab is opened
                      setHasSearched(true);
                      loadRecipes(1, 10, '');
                    }
                  }}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'recipes'
                      ? 'border-purple-600 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="flex items-center space-x-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <span>Recipes</span>
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('upload')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'upload'
                      ? 'border-purple-600 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="flex items-center space-x-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <span>Upload JSON</span>
                  </span>
                </button>
                <Link
                  href="/paste-json"
                  className="py-4 px-1 border-b-2 font-medium text-sm transition-colors border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                >
                  <span className="flex items-center space-x-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>Paste JSON</span>
                  </span>
                </Link>
              </nav>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {loading && !stats && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent"></div>
              <p className="mt-4 text-gray-600">Loading...</p>
            </div>
          )}

          {/* Statistics Tab */}
          {activeTab === 'stats' && stats && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Recipes</p>
                      <p className="text-3xl font-bold text-gray-900 mt-2">{stats.recipes.total}</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center text-sm">
                    <span className="text-green-600 font-medium">{stats.recipes.published} published</span>
                    <span className="text-gray-400 mx-2">•</span>
                    <span className="text-gray-600">{stats.recipes.unpublished} unpublished</span>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Users</p>
                      <p className="text-3xl font-bold text-gray-900 mt-2">{stats.users.total}</p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center text-sm">
                    <span className="text-green-600 font-medium">{stats.users.active} active</span>
                    <span className="text-gray-400 mx-2">•</span>
                    <span className="text-gray-600">{stats.users.inactive} inactive</span>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total API Requests</p>
                      <p className="text-3xl font-bold text-gray-900 mt-2">{stats.api.totalRequests.toLocaleString()}</p>
                    </div>
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recipes by Meal Type */}
              {stats.recipes.byMealType.length > 0 && (
                <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
                  <h2 className="text-lg font-bold text-gray-900 mb-4">Recipes by Meal Type</h2>
                  <div className="space-y-3">
                    {stats.recipes.byMealType.map((item) => (
                      <div key={item._id} className="flex items-center justify-between">
                        <span className="text-gray-700 capitalize">{item._id}</span>
                        <span className="font-semibold text-gray-900">{item.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recipes by Cuisine */}
              {stats.recipes.byCuisine.length > 0 && (
                <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
                  <h2 className="text-lg font-bold text-gray-900 mb-4">Recipes by Cuisine</h2>
                  <div className="space-y-3">
                    {stats.recipes.byCuisine.map((item) => (
                      <div key={item._id} className="flex items-center justify-between">
                        <span className="text-gray-700 capitalize">{item._id}</span>
                        <span className="font-semibold text-gray-900">{item.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Recipes Tab */}
          {activeTab === 'recipes' && (
            <div className="space-y-6">
              {/* Search and Filters */}
              <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
                <form onSubmit={handleSearch} className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                        Search Recipes
                      </label>
                      <input
                        id="search"
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by name, description, or ID..."
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900 bg-white"
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        type="submit"
                        disabled={recipesLoading}
                        className="w-full sm:w-auto px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {recipesLoading ? 'Searching...' : 'Search'}
                      </button>
                    </div>
                  </div>
                  
                  {/* Filter Dropdowns */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
                    <div>
                      <label htmlFor="filter-cuisine" className="block text-sm font-medium text-gray-700 mb-2">
                        Filter by Cuisine
                      </label>
                      <select
                        id="filter-cuisine"
                        value={filterCuisine}
                        onChange={(e) => handleFilterChange('cuisine', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white text-gray-900"
                      >
                        <option value="">All Cuisines</option>
                        {filterOptions.cuisines.map((cuisine) => (
                          <option key={cuisine} value={cuisine}>
                            {cuisine.charAt(0).toUpperCase() + cuisine.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label htmlFor="filter-meal-type" className="block text-sm font-medium text-gray-700 mb-2">
                        Filter by Meal Type
                      </label>
                      <select
                        id="filter-meal-type"
                        value={filterMealType}
                        onChange={(e) => handleFilterChange('mealType', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white text-gray-900"
                      >
                        <option value="">All Meal Types</option>
                        {filterOptions.mealTypes.map((mealType) => (
                          <option key={mealType} value={mealType}>
                            {mealType.charAt(0).toUpperCase() + mealType.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label htmlFor="filter-letter" className="block text-sm font-medium text-gray-700 mb-2">
                        Filter by Letter
                      </label>
                      <select
                        id="filter-letter"
                        value={filterLetter}
                        onChange={(e) => handleFilterChange('letter', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white text-gray-900"
                      >
                        <option value="">All Letters</option>
                        {filterOptions.letters.map((letter) => (
                          <option key={letter} value={letter}>
                            {letter}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </form>
              </div>

              {/* Recipes Table */}
              <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                  <h2 className="text-xl font-bold text-gray-900">Recipes</h2>
                </div>
                {recipesLoading ? (
                  <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-purple-600 border-t-transparent"></div>
                    <p className="mt-4 text-gray-600">Loading recipes...</p>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th 
                              className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase cursor-pointer hover:bg-gray-100 select-none"
                              onClick={() => handleSort('id')}
                            >
                              <div className="flex items-center space-x-1">
                                <span>ID</span>
                                {sortBy === 'id' && (
                                  <span className="text-purple-600">
                                    {sortOrder === 'asc' ? '↑' : sortOrder === 'desc' ? '↓' : ''}
                                  </span>
                                )}
                              </div>
                            </th>
                            <th 
                              className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase cursor-pointer hover:bg-gray-100 select-none"
                              onClick={() => handleSort('name')}
                            >
                              <div className="flex items-center space-x-1">
                                <span>Name</span>
                                {sortBy === 'name' && (
                                  <span className="text-purple-600">
                                    {sortOrder === 'asc' ? '↑' : sortOrder === 'desc' ? '↓' : ''}
                                  </span>
                                )}
                              </div>
                            </th>
                            <th 
                              className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase cursor-pointer hover:bg-gray-100 select-none"
                              onClick={() => handleSort('mealType')}
                            >
                              <div className="flex items-center space-x-1">
                                <span>Meal Type</span>
                                {sortBy === 'mealType' && (
                                  <span className="text-purple-600">
                                    {sortOrder === 'asc' ? '↑' : sortOrder === 'desc' ? '↓' : ''}
                                  </span>
                                )}
                              </div>
                            </th>
                            <th 
                              className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase cursor-pointer hover:bg-gray-100 select-none"
                              onClick={() => handleSort('cuisine')}
                            >
                              <div className="flex items-center space-x-1">
                                <span>Cuisine</span>
                                {sortBy === 'cuisine' && (
                                  <span className="text-purple-600">
                                    {sortOrder === 'asc' ? '↑' : sortOrder === 'desc' ? '↓' : ''}
                                  </span>
                                )}
                              </div>
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                            <th 
                              className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase cursor-pointer hover:bg-gray-100 select-none"
                              onClick={() => handleSort('created')}
                            >
                              <div className="flex items-center space-x-1">
                                <span>Created</span>
                                {sortBy === 'created' && (
                                  <span className="text-purple-600">
                                    {sortOrder === 'asc' ? '↑' : sortOrder === 'desc' ? '↓' : ''}
                                  </span>
                                )}
                              </div>
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {recipes.length === 0 && !recipesLoading ? (
                            <tr>
                              <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                {hasSearched ? 'No recipes found matching your search.' : 'Click Search to load recipes.'}
                              </td>
                            </tr>
                          ) : recipes.length > 0 ? (
                            recipes.map((recipe) => {
                              const nameEn = recipe.name.find((n) => n.language === 'en')?.text || recipe.name[0]?.text || 'Untitled';
                              return (
                                <tr 
                                  key={recipe._id} 
                                  className="hover:bg-gray-50 cursor-pointer"
                                  onClick={() => handleRecipeClick(recipe)}
                                >
                                  <td className="px-6 py-4">
                                    <div className="text-sm font-mono text-gray-900">{recipe.id}</div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="text-sm font-medium text-gray-900">{nameEn}</div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <span className="text-sm text-gray-600 capitalize">{recipe.mealType}</span>
                                  </td>
                                  <td className="px-6 py-4">
                                    <span className="text-sm text-gray-600 capitalize">
                                      {Array.isArray(recipe.cuisineType) 
                                        ? recipe.cuisineType.join(', ') 
                                        : recipe.cuisineType}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="flex items-center space-x-2">
                                      {recipe.isPublished ? (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                          Published
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                          Draft
                                        </span>
                                      )}
                                      {recipe.isFeatured && (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                          Featured
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 text-sm text-gray-500">
                                    {new Date(recipe.createdAt).toLocaleDateString('en-US', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric',
                                    })}
                                  </td>
                                </tr>
                              );
                            })
                          ) : null}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    {hasSearched && (
                      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-700">Items per page:</span>
                            <select
                              value={pageSize}
                              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                            >
                              <option value="5">5</option>
                              <option value="10">10</option>
                              <option value="25">25</option>
                            </select>
                          </div>
                          <div className="flex items-center space-x-2">
                            {recipesPagination ? (
                              <>
                                <span className="text-sm text-gray-700">
                                  {((recipesPagination.page - 1) * recipesPagination.limit) + 1}-
                                  {Math.min(recipesPagination.page * recipesPagination.limit, recipesPagination.total)} of {recipesPagination.total}
                                </span>
                                {recipesPagination.pages > 1 && (
                                  <div className="flex items-center space-x-1 ml-4">
                                    <button
                                      onClick={() => handlePageChange(1)}
                                      disabled={currentPage === 1 || recipesLoading}
                                      className="p-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
                                      title="First page"
                                    >
                                      &laquo;
                                    </button>
                                    <button
                                      onClick={() => handlePageChange(currentPage - 1)}
                                      disabled={currentPage === 1 || recipesLoading}
                                      className="p-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
                                      title="Previous page"
                                    >
                                      &lsaquo;
                                    </button>
                                    <button
                                      onClick={() => handlePageChange(currentPage + 1)}
                                      disabled={currentPage === recipesPagination.pages || recipesLoading}
                                      className="p-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
                                      title="Next page"
                                    >
                                      &rsaquo;
                                    </button>
                                    <button
                                      onClick={() => handlePageChange(recipesPagination.pages)}
                                      disabled={currentPage === recipesPagination.pages || recipesLoading}
                                      className="p-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
                                      title="Last page"
                                    >
                                      &raquo;
                                    </button>
                                  </div>
                                )}
                              </>
                            ) : (
                              <span className="text-sm text-gray-700">0 of 0</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Upload JSON Tab */}
          {activeTab === 'upload' && (
            <div className="space-y-6">
              {/* Upload Area */}
              <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Upload JSON Recipe Files</h2>
                
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
                {uploadFiles.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">
                      Selected Files ({uploadFiles.length})
                    </h3>
                    <div className="space-y-2">
                      {uploadFiles.map((file, index) => (
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
                            onClick={() => removeUploadFile(index)}
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
                    onClick={handleProcessUpload}
                    disabled={uploadFiles.length === 0 || isUploadProcessing}
                    className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUploadProcessing ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 12 5.373 12 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processing...
                      </span>
                    ) : (
                      `Process ${uploadFiles.length} File${uploadFiles.length !== 1 ? 's' : ''}`
                    )}
                  </button>
                  {uploadFiles.length > 0 && (
                    <button
                      onClick={handleClearUpload}
                      disabled={isUploadProcessing}
                      className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Clear All
                    </button>
                  )}
                </div>
              </div>

              {/* Results */}
              {uploadResults && uploadTotals && (
                <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
                  <h2 className="text-lg font-bold text-gray-900 mb-4">Processing Results</h2>
                  
                  {/* Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                      <p className="text-sm font-medium text-green-800">Processed</p>
                      <p className="text-2xl font-bold text-green-900">{uploadTotals.processed}</p>
                    </div>
                    <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                      <p className="text-sm font-medium text-yellow-800">Skipped</p>
                      <p className="text-2xl font-bold text-yellow-900">{uploadTotals.skipped}</p>
                    </div>
                    <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                      <p className="text-sm font-medium text-red-800">Errors</p>
                      <p className="text-2xl font-bold text-red-900">{uploadTotals.errors}</p>
                    </div>
                  </div>

                  {/* File Results */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-gray-700">File Details</h3>
                    {uploadResults.map((result, index) => (
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
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h2 className="text-xl font-bold text-gray-900">All Users</h2>
                <p className="text-sm text-gray-600 mt-1">{users.length} total users</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Country</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Role</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Joined</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                          {loading ? 'Loading users...' : 'No users found'}
                        </td>
                      </tr>
                    ) : (
                      users.map((user) => (
                        <tr key={user._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">{user.name}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">{user.email}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-500">{user.country}</div>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                user.isActive
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {user.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {user.isAdmin ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                Admin
                              </span>
                            ) : (
                              <span className="text-sm text-gray-500">User</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {new Date(user.createdAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Recipe Modal */}
      <RecipeModal
        recipe={selectedRecipe}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedRecipe(null);
        }}
      />
    </>
  );
}
