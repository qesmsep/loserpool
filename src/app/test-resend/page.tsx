'use client'

import { useState } from 'react'

export default function TestResendPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const sendTestEmail = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/test-resend-email', {
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
        setError(data.error || 'Failed to send test email')
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Test Resend Email</h1>
          <p className="text-gray-600 mb-6">Test if Resend is working correctly</p>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-green-900 mb-2">✅ Configuration Status</h3>
            <ul className="text-green-800 space-y-1">
              <li>• Provider: resend</li>
              <li>• Resend API Key: SET</li>
              <li>• Email API Key: SET</li>
              <li>• From Email: onboarding@resend.dev</li>
            </ul>
          </div>

          <button
            onClick={sendTestEmail}
            disabled={loading}
            className="px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 mb-6"
          >
            {loading ? 'Sending...' : 'Send Test Email to tim@828.life'}
          </button>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-semibold text-red-900 mb-2">Error:</h3>
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {result && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-green-900 mb-4">Test Results:</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="bg-white rounded p-3">
                  <div className="text-2xl font-bold text-blue-600">{result.success ? '✅ Success' : '❌ Failed'}</div>
                  <div className="text-sm text-gray-600">Email Status</div>
                </div>
                <div className="bg-white rounded p-3">
                  <div className="text-2xl font-bold text-green-600">{result.provider}</div>
                  <div className="text-sm text-gray-600">Provider Used</div>
                </div>
              </div>

              <div className="space-y-2">
                <div><strong>Message:</strong> {result.message}</div>
                {result.emailId && <div><strong>Email ID:</strong> {result.emailId}</div>}
                {result.error && <div><strong>Error:</strong> {result.error}</div>}
              </div>

              <div className="mt-6 p-4 bg-blue-100 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">Next Steps:</h4>
                <ul className="text-blue-800 space-y-1">
                  <li>• Check your email inbox (tim@828.life)</li>
                  <li>• If you received the email, Resend is working!</li>
                  <li>• If not, check the error details above</li>
                  <li>• Once confirmed working, test admin notifications</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
