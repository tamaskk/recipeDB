import Head from 'next/head';
import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function Home() {
  const [stats, setStats] = useState<{ recipes?: number; users?: number } | null>(null);

  useEffect(() => {
    // Try to fetch stats (will fail if not authenticated, that's ok)
    fetch('/api/admin/stats')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setStats({
            recipes: data.data.recipes.total,
            users: data.data.users.total,
          });
        }
      })
      .catch(() => {});
  }, []);

  return (
    <>
      <Head>
        <title>Recipe DB - Multilingual Recipe Database API</title>
        <meta name="description" content="A powerful multilingual recipe database API with AI-powered processing and translation. Get started with our simple API." />
      </Head>

      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Recipe DB
              </span>
            </div>
            <nav className="hidden md:flex items-center space-x-8">
              <Link href="/text" className="text-gray-600 hover:text-gray-900 font-medium transition-colors">
                Text Analyzer
              </Link>
              <Link href="/register" className="text-gray-600 hover:text-gray-900 font-medium transition-colors">
                Register
              </Link>
              <Link href="/api/openapi.json" className="text-gray-600 hover:text-gray-900 font-medium transition-colors">
                API Docs
              </Link>
              <Link href="/admin" className="text-gray-600 hover:text-gray-900 font-medium transition-colors">
                Admin
              </Link>
            </nav>
            <Link
              href="/register"
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-lg font-semibold hover:shadow-lg transition-all transform hover:-translate-y-0.5"
            >
              Start Trial
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-gray-50 to-blue-50 py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h1 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
                  Multilingual Recipe Database API for Modern Applications
                </h1>
                <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                  Recipe DB offers a simple, single API that delivers the most robust suite of multilingual recipe data with AI-powered processing and translation for your applications.
                </p>
                <div className="flex items-center space-x-4">
                  <Link
                    href="/register"
                    className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:shadow-xl transition-all transform hover:-translate-y-1 inline-flex items-center space-x-2"
                  >
                    <span>Connect with Us</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </Link>
                  <Link
                    href="/text"
                    className="text-gray-700 hover:text-gray-900 font-semibold text-lg transition-colors"
                  >
                    Try Text Analyzer →
                  </Link>
                </div>
              </div>
              <div className="relative">
                <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    </div>
                    <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm text-green-400">
                      <div className="mb-2">
                        <span className="text-purple-400">POST</span>{' '}
                        <span className="text-blue-400">/api/text</span>
                      </div>
                      <div className="mb-2 text-gray-400">{'{'}</div>
                      <div className="ml-4 text-yellow-400">&quot;text&quot;</div>
                      <div className="ml-4 text-gray-500">: &quot;Chocolate Chip Cookies...&quot;</div>
                      <div className="text-gray-400">{'}'}</div>
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center space-x-2 text-green-800">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="font-semibold">Recipe processed in 7 languages</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-4xl font-bold text-gray-900 mb-6">
                  Become an Industry Leader
                </h2>
                <p className="text-lg text-gray-600">
                  Build powerful recipe applications with the most comprehensive multilingual recipe database API available.
                </p>
              </div>
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <p className="text-lg font-semibold text-gray-900">
                      7 Languages Supported
                    </p>
                    <p className="text-gray-600">
                      More language coverage than any other recipe API provider in the market.
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <p className="text-lg font-semibold text-gray-900">
                      AI-Powered Processing
                    </p>
                    <p className="text-gray-600">
                      Advanced AI translation and recipe analysis powered by OpenAI.
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <p className="text-lg font-semibold text-gray-900">
                      Comprehensive Data Model
                    </p>
                    <p className="text-gray-600">
                      More recipe attributes including ingredients, steps, macros, and nutritional data than any competitor.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 bg-gradient-to-br from-blue-600 to-purple-700 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <span className="text-blue-200 text-sm font-semibold uppercase tracking-wider">OUR USP</span>
              <h2 className="text-4xl font-bold mt-2 mb-4">Why Use Recipe DB API?</h2>
              <p className="text-xl text-blue-100 max-w-2xl mx-auto">
                Accurately process and translate recipes from any language, faster than ever before.
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8 border border-white/20">
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-2">Automate Recipe Processing</h3>
                <p className="text-blue-100">
                  Real-time AI-powered recipe analysis, translation, and structuring supported by comprehensive data attributes.
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8 border border-white/20">
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-2">Simple to Use</h3>
                <p className="text-blue-100">
                  Our API gets you up and running in less than a day with comprehensive documentation and examples.
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8 border border-white/20">
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-2">Over 50 Recipe Attributes</h3>
                <p className="text-blue-100">
                  Recipe DB API offers a precise picture of recipe data including ingredients, steps, macros, difficulty, and more.
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8 border border-white/20">
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-2">Most Accurate Data Solutions</h3>
                <p className="text-blue-100">
                  Real-time AI processing with direct integration support for all major recipe formats and languages.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Use Cases Section */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 gap-12">
              <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-10 text-white">
                <div className="mb-6">
                  <svg className="w-12 h-12 text-blue-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-lg italic text-gray-300 mb-4">
                    &quot;Recipe DB offers very competitive and up-to-mark multilingual recipe solutions with a very energetic team consisting of a bunch of enthusiasts to service the customers.&quot;
                  </p>
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center font-bold">
                      JD
                    </div>
                    <div>
                      <p className="font-semibold">John Developer</p>
                      <p className="text-sm text-gray-400">San Francisco</p>
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">INDUSTRIES SERVED</span>
                <h2 className="text-3xl font-bold text-gray-900 mt-2 mb-8">Your Business Value</h2>
                <div className="grid grid-cols-2 gap-6">
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Recipe Apps</h3>
                      <p className="text-sm text-gray-600">Mobile & web applications</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Food Platforms</h3>
                      <p className="text-sm text-gray-600">E-commerce & marketplaces</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Content Management</h3>
                      <p className="text-sm text-gray-600">CMS & publishing platforms</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">API Integrations</h3>
                      <p className="text-sm text-gray-600">Third-party services</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Newsletter Section */}
        <section className="py-20 bg-gradient-to-br from-gray-50 to-blue-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">KEEP YOURSELF UPDATED</span>
            <h2 className="text-4xl font-bold text-gray-900 mt-2 mb-4">Get API Updates</h2>
            <p className="text-xl text-gray-600 mb-8">
              Join our email list to receive API updates, new features, tips from industry experts, and more.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
              <input
                type="email"
                placeholder="Enter your email address"
                className="flex-1 px-6 py-4 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-lg font-semibold hover:shadow-lg transition-all transform hover:-translate-y-0.5">
                Subscribe Now
              </button>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-gray-900 text-white py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-4 gap-8 mb-8">
              <div>
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <span className="text-xl font-bold">Recipe DB</span>
                </div>
                <p className="text-gray-400 text-sm">
                  Be sure to take a look at our Terms of Use and Privacy Policy.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-4">Product</h3>
                <ul className="space-y-2 text-gray-400 text-sm">
                  <li><Link href="/" className="hover:text-white transition-colors">Home</Link></li>
                  <li><Link href="/text" className="hover:text-white transition-colors">Text Analyzer</Link></li>
                  <li><Link href="/api/openapi.json" className="hover:text-white transition-colors">API Docs</Link></li>
                  <li><Link href="/register" className="hover:text-white transition-colors">Pricing</Link></li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-4">Company</h3>
                <ul className="space-y-2 text-gray-400 text-sm">
                  <li><Link href="/" className="hover:text-white transition-colors">About</Link></li>
                  <li><Link href="/admin" className="hover:text-white transition-colors">Admin</Link></li>
                  <li><Link href="/register" className="hover:text-white transition-colors">Register</Link></li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-4">Support</h3>
                <ul className="space-y-2 text-gray-400 text-sm">
                  <li><Link href="/api/openapi.json" className="hover:text-white transition-colors">Documentation</Link></li>
                  <li><Link href="/" className="hover:text-white transition-colors">Contact</Link></li>
                </ul>
              </div>
            </div>
            <div className="border-t border-gray-800 pt-8 flex flex-col sm:flex-row justify-between items-center">
              <p className="text-gray-400 text-sm">
                Recipe DB. © {new Date().getFullYear()} All Rights Reserved.
              </p>
            </div>
          </div>
        </footer>
      </main>
    </>
  );
}
