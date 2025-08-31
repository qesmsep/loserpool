'use client'

import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function AdminDiagnosticPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    tests: Record<string, string>;
    userDetails?: Record<string, unknown>;
    passwordUpdateResults?: Array<{ test: string; success: boolean; message?: string; error?: string; code?: string; status?: string }>;
    recommendations?: string[];
    environment?: Record<string, unknown>;
  } | null>(null)
  const [error, setError] = useState('')

  const runDiagnostic = async () => {
    setLoading(true)
    setError('')
    setResult(null)

    try {
      const response = await fetch('/api/auth/comprehensive-diagnostic')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to run diagnostic')
      }

      setResult(data)
    } catch (error) {
      console.error('Diagnostic error:', error)
      setError(error instanceof Error ? error.message : 'Failed to run diagnostic')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen app-bg">
      {/* Header */}
      <header className="bg-white/10 backdrop-blur-sm border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Link
                href="/admin"
                className="text-white hover:text-blue-200 transition-colors mr-4"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <h1 className="text-2xl font-bold text-white">Supabase Diagnostic</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6">
          <h2 className="text-xl font-semibold text-white mb-6">Comprehensive Supabase Diagnostic</h2>
          
          {error && (
            <div className="bg-red-500/20 border border-red-300 text-red-200 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          <button
            onClick={runDiagnostic}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-2 px-4 rounded-md transition-colors mb-6"
          >
            {loading ? 'Running Diagnostic...' : 'Run Comprehensive Diagnostic'}
          </button>

          {result && (
            <div className="space-y-6">
              <div className={`p-4 rounded-md border ${
                result.success 
                  ? 'bg-green-500/20 border-green-300 text-green-200' 
                  : 'bg-red-500/20 border-red-300 text-red-200'
              }`}>
                <h3 className="font-semibold mb-2">Overall Result</h3>
                <p>{result.message}</p>
              </div>

              <div className="bg-white/5 rounded-md p-4">
                <h3 className="text-white font-semibold mb-3">Test Results</h3>
                <div className="space-y-2">
                  {Object.entries(result.tests).map(([test, status]) => (
                    <div key={test} className="flex justify-between items-center">
                      <span className="text-gray-300 capitalize">{test.replace(/([A-Z])/g, ' $1').trim()}</span>
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        status === 'passed' 
                          ? 'bg-green-500/20 text-green-200' 
                          : 'bg-red-500/20 text-red-200'
                      }`}>
                        {status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {result.userDetails && (
                <div className="bg-white/5 rounded-md p-4">
                  <h3 className="text-white font-semibold mb-3">User Details</h3>
                  <pre className="text-sm text-gray-300 overflow-auto">
                    {JSON.stringify(result.userDetails, null, 2)}
                  </pre>
                </div>
              )}

              {result.passwordUpdateResults && result.passwordUpdateResults.length > 0 && (
                <div className="bg-white/5 rounded-md p-4">
                  <h3 className="text-white font-semibold mb-3">Password Update Tests</h3>
                  <div className="space-y-2">
                    {result.passwordUpdateResults.map((test, index) => (
                      <div key={index} className={`p-3 rounded border ${
                        test.success 
                          ? 'bg-green-500/10 border-green-300' 
                          : 'bg-red-500/10 border-red-300'
                      }`}>
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-semibold text-white">{test.test}</span>
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            test.success 
                              ? 'bg-green-500/20 text-green-200' 
                              : 'bg-red-500/20 text-red-200'
                          }`}>
                            {test.success ? 'SUCCESS' : 'FAILED'}
                          </span>
                        </div>
                        {test.success ? (
                          <p className="text-green-200 text-sm">{test.message}</p>
                        ) : (
                          <div className="text-red-200 text-sm">
                            <p><strong>Error:</strong> {test.error}</p>
                            {test.code && <p><strong>Code:</strong> {test.code}</p>}
                            {test.status && <p><strong>Status:</strong> {test.status}</p>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.recommendations && result.recommendations.length > 0 && (
                <div className="bg-yellow-500/20 border border-yellow-300 rounded-md p-4">
                  <h3 className="text-yellow-200 font-semibold mb-3">Recommendations</h3>
                  <ul className="text-yellow-100 space-y-1">
                    {result.recommendations.map((rec: string, index: number) => (
                      <li key={index} className="text-sm">• {rec}</li>
                    ))}
                  </ul>
                </div>
              )}

              {result.environment && (
                <div className="bg-white/5 rounded-md p-4">
                  <h3 className="text-white font-semibold mb-3">Environment Check</h3>
                  <pre className="text-sm text-gray-300 overflow-auto">
                    {JSON.stringify(result.environment, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
