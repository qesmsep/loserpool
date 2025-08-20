'use client'

import { useState } from 'react'
import { Mail, Send, CheckCircle, AlertCircle } from 'lucide-react'

export default function TestSignupEmailPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const sendTestSignupEmail = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/test-signup-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({})
      })

      const data = await response.json()

      if (response.ok) {
        setResult(data)
      } else {
        setError(data.error || 'Failed to send test signup email')
      }
    } catch (err) {
      setError('Network error: ' + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen app-bg flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Mail className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Test Signup Email</h1>
          <p className="text-gray-600 mt-2">Send a test signup confirmation email</p>
        </div>

        <div className="space-y-6">
          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded">
            <p className="text-sm">
              <strong>What this does:</strong>
            </p>
            <ul className="list-disc list-inside mt-2 text-sm space-y-1">
              <li>Sends a test signup confirmation email to tim@828.life</li>
              <li>Uses the same styling as purchase notification emails</li>
              <li>Includes confirmation link and welcome message</li>
              <li>Tests the email delivery system</li>
            </ul>
          </div>

          {/* Test Button */}
          <button
            onClick={sendTestSignupEmail}
            disabled={loading}
            className="w-full flex items-center justify-center bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Sending...
              </>
            ) : (
              <>
                <Send className="w-5 h-5 mr-2" />
                Send Test Signup Email
              </>
            )}
          </button>

          {/* Success Result */}
          {result && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 mr-2" />
                <span className="font-semibold">Success!</span>
              </div>
              <p className="mt-2 text-sm">{result.message}</p>
              {result.emailSent && (
                <p className="mt-1 text-sm opacity-75">{result.emailSent}</p>
              )}
              {result.confirmationLink && (
                <div className="mt-2">
                  <p className="text-xs font-semibold">Confirmation Link:</p>
                  <p className="text-xs bg-green-100 p-2 rounded break-all">
                    {result.confirmationLink}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Error Result */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 mr-2" />
                <span className="font-semibold">Error</span>
              </div>
              <p className="mt-2 text-sm">{error}</p>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-gray-50 border border-gray-200 text-gray-700 px-4 py-3 rounded">
            <p className="text-sm">
              <strong>Next steps:</strong>
            </p>
            <ol className="list-decimal list-inside mt-2 text-sm space-y-1">
              <li>Click the button above to send the test email</li>
              <li>Check your email (tim@828.life) for the signup confirmation</li>
              <li>Review the email styling and content</li>
              <li>Test the confirmation link if needed</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}
