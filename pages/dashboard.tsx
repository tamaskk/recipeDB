import Head from 'next/head';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

interface ApiKey {
  id: string;
  name: string;
  key?: string; // Only present when first created
  isActive: boolean;
  requestCount: number;
  lastUsedAt?: string;
  createdAt: string;
}

interface User {
  id: string;
  email: string;
  name: string;
  country: string;
}

interface CallStats {
  totalCalls: number;
  apiKeys: Array<{
    id: string;
    name: string;
    requestCount: number;
    lastUsedAt?: string;
    createdAt: string;
  }>;
}

export default function Dashboard() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [callStats, setCallStats] = useState<CallStats | null>(null);
  const [activeTab, setActiveTab] = useState<'apikeys' | 'settings' | 'calls'>('apikeys');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // API Key creation
  const [newKeyName, setNewKeyName] = useState('');
  const [creatingKey, setCreatingKey] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  
  // Settings
  const [settings, setSettings] = useState({ name: '', country: '' });
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    const storedToken = localStorage.getItem('authToken');
    if (!storedToken) {
      router.push('/login');
      return;
    }
    setToken(storedToken);
    loadUserData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadUserData = async () => {
    const storedToken = localStorage.getItem('authToken');
    if (!storedToken) return;

    setLoading(true);
    setError(null);

    try {
      const headers = {
        'Authorization': `Bearer ${storedToken}`,
      };

      const [profileRes, keysRes, callsRes] = await Promise.all([
        fetch('/api/user/profile', { headers }),
        fetch('/api/user/apikeys', { headers }),
        fetch('/api/user/calls', { headers }),
      ]);

      if (!profileRes.ok) {
        throw new Error('Failed to load user data');
      }

      const profileData = await profileRes.json();
      const keysData = await keysRes.json();
      const callsData = await callsRes.json();

      setUser(profileData.data);
      setApiKeys(keysData.data || []);
      setCallStats(callsData.data);
      setSettings({
        name: profileData.data.name,
        country: profileData.data.country,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
      if (err instanceof Error && err.message.includes('401')) {
        localStorage.removeItem('authToken');
        router.push('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingKey(true);
    setNewKey(null);
    setError(null);

    try {
      const response = await fetch('/api/user/apikeys', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newKeyName || undefined }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to create API key');
      }

      setNewKey(data.data.key);
      setNewKeyName('');
      loadUserData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create API key');
    } finally {
      setCreatingKey(false);
    }
  };

  const handleDeleteApiKey = async (id: string) => {
    if (!confirm('Are you sure you want to delete this API key?')) return;

    try {
      const response = await fetch(`/api/user/apikeys/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to delete API key');
      }

      loadUserData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete API key');
    }
  };

  const handleToggleApiKey = async (id: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/user/apikeys/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: !isActive }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to update API key');
      }

      loadUserData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update API key');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setError(null);

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to update settings');
      }

      setUser(data.data);
      alert('Settings saved successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    router.push('/');
  };

  if (loading) {
    return (
      <>
        <Head>
          <title>Dashboard - Recipe DB</title>
        </Head>
        <main className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Dashboard - Recipe DB</title>
      </Head>
      <main className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
                  <p className="text-sm text-gray-500">{user?.email}</p>
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
                  onClick={() => setActiveTab('apikeys')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'apikeys'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="flex items-center space-x-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                    <span>API Keys</span>
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('calls')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'calls'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="flex items-center space-x-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <span>Calls</span>
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('settings')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'settings'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="flex items-center space-x-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>Settings</span>
                  </span>
                </button>
              </nav>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {/* API Keys Tab */}
          {activeTab === 'apikeys' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Create New API Key</h2>
                <form onSubmit={handleCreateApiKey} className="space-y-4">
                  <div>
                    <label htmlFor="keyName" className="block text-sm font-medium text-gray-700 mb-2">
                      Key Name (optional)
                    </label>
                    <input
                      id="keyName"
                      type="text"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      placeholder="e.g. Production Key, Development Key"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={creatingKey}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {creatingKey ? 'Creating...' : 'Create API Key'}
                  </button>
                </form>

                {newKey && (
                  <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm font-semibold text-green-800 mb-2">API Key Created!</p>
                    <code className="block p-3 bg-white rounded text-sm break-all mb-2">{newKey}</code>
                    <p className="text-xs text-red-600 font-semibold">
                      ⚠️ Save this API key securely! It will not be shown again.
                    </p>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                  <h2 className="text-xl font-bold text-gray-900">Your API Keys</h2>
                  <p className="text-sm text-gray-600 mt-1">{apiKeys.length} total keys</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Requests</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Last Used</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {apiKeys.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                            No API keys yet. Create your first one above.
                          </td>
                        </tr>
                      ) : (
                        apiKeys.map((key) => (
                          <tr key={key.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                              <div className="text-sm font-medium text-gray-900">{key.name}</div>
                              <div className="text-xs text-gray-500">{key.id}</div>
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  key.isActive
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {key.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {key.requestCount.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">
                              {key.lastUsedAt
                                ? new Date(key.lastUsedAt).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : 'Never'}
                            </td>
                            <td className="px-6 py-4 text-sm">
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => handleToggleApiKey(key.id, key.isActive)}
                                  className={`px-3 py-1 rounded text-xs font-medium ${
                                    key.isActive
                                      ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                                      : 'bg-green-100 text-green-800 hover:bg-green-200'
                                  }`}
                                >
                                  {key.isActive ? 'Deactivate' : 'Activate'}
                                </button>
                                <button
                                  onClick={() => handleDeleteApiKey(key.id)}
                                  className="px-3 py-1 bg-red-100 text-red-800 rounded text-xs font-medium hover:bg-red-200"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Calls Tab */}
          {activeTab === 'calls' && callStats && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Total API Calls</h2>
                <p className="text-4xl font-bold text-blue-600">{callStats.totalCalls.toLocaleString()}</p>
              </div>

              <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                  <h2 className="text-xl font-bold text-gray-900">Calls by API Key</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">API Key Name</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Total Calls</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Last Used</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Created</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {callStats.apiKeys.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                            No API calls yet.
                          </td>
                        </tr>
                      ) : (
                        callStats.apiKeys.map((key) => (
                          <tr key={key.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                              <div className="text-sm font-medium text-gray-900">{key.name}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-lg font-bold text-gray-900">{key.requestCount.toLocaleString()}</div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">
                              {key.lastUsedAt
                                ? new Date(key.lastUsedAt).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : 'Never'}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">
                              {new Date(key.createdAt).toLocaleDateString('en-US', {
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
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Account Settings</h2>
              <form onSubmit={handleSaveSettings} className="space-y-6 max-w-md">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">Email cannot be changed</p>
                </div>

                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={settings.name}
                    onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-2">
                    Country
                  </label>
                  <input
                    id="country"
                    type="text"
                    value={settings.country}
                    onChange={(e) => setSettings({ ...settings, country: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={savingSettings}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingSettings ? 'Saving...' : 'Save Settings'}
                </button>
              </form>
            </div>
          )}
        </div>
      </main>
    </>
  );
}

