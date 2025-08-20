'use client'

import { useState } from 'react'

export default function TestResendDirectPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const sendDirectTest = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/test-resend-direct', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: 'tim@828.life'
        })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to send direct test email')
      } else {
        setResult(data)
      }
    } catch (err) {
      setError('Network error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Test Direct Resend API</h1>
          <p className="text-gray-600 mb-6">Test Resend API directly, bypassing email service</p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">What this test does:</h3>
            <ul className="text-blue-800 space-y-1">
              <li>• Makes a direct HTTP call to Resend's API</li>
              <li>• Bypasses our email service completely</li>
              <li>• Tests if the API key works at the most basic level</li>
              <li>• Shows detailed response from Resend</li>
            </ul>
          </div>

          <button
            onClick={sendDirectTest}
            disabled={loading}
            className="px-6 py-3 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 mb-6"
          >
            {loading ? 'Sending Direct API Test...' : 'Send Direct Resend API Test'}
          </button>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-semibold text-red-900 mb-2">Error:</h3>
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {result && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-green-900 mb-4">Direct API Test Results:</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="bg-white rounded p-3">
                  <div className="text-2xl font-bold text-blue-600">{result.success ? '✅ Success' : '❌ Failed'}</div>
                  <div className="text-sm text-gray-600">API Call Status</div>
                </div>
                <div className="bg-white rounded p-3">
                  <div className="text-2xl font-bold text-green-600">{result.status || 'N/A'}</div>
                  <div className="text-sm text-gray-600">HTTP Status</div>
                </div>
              </div>

              <div className="space-y-2">
                <div><strong>Message:</strong> {result.message}</div>
                {result.emailId && <div><strong>Email ID:</strong> {result.emailId}</div>}
                {result.error && <div><strong>Error:</strong> {result.error}</div>}
              </div>

              {result.details && (
                <div className="mt-4 p-4 bg-gray-100 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-2">API Response Details:</h4>
                  <pre className="text-sm text-gray-700 overflow-auto">
                    {JSON.stringify(result.details, null, 2)}
                  </pre>
                </div>
              )}

              <div className="mt-6 p-4 bg-blue-100 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">Next Steps:</h4>
                <ul className="text-blue-800 space-y-1">
                  <li>• Check your email inbox (tim@828.life)</li>
                  <li>• If you received the email, Resend API key is working!</li>
                  <li>• If not, check the error details above</li>
                  <li>• Once confirmed working, we can debug the email service integration</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
