'use client'

import { useState } from 'react'
import { Mail, Send, CheckCircle, AlertCircle, Users } from 'lucide-react'

export default function TestAdminSignupNotificationPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const sendTestAdminSignupNotification = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/test-admin-signup-notification', {
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
        setError(data.error || 'Failed to send test admin signup notification')
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
            <Users className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Test Admin Signup Notification</h1>
          <p className="text-gray-600 mt-2">Send a test admin notification for new user signup</p>
        </div>

        <div className="space-y-6">
          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded">
            <p className="text-sm">
              <strong>What this does:</strong>
            </p>
            <ul className="list-disc list-inside mt-2 text-sm space-y-1">
              <li>Sends a test admin notification to tim@828.life</li>
              <li>Simulates a new user signup (John Doe)</li>
              <li>Uses the same styling as purchase notification emails</li>
              <li>Includes user details and admin action items</li>
            </ul>
          </div>

          {/* Test Button */}
          <button
            onClick={sendTestAdminSignupNotification}
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
                Send Test Admin Signup Notification
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
              {result.signupData && (
                <div className="mt-2">
                  <p className="text-xs font-semibold">Test User Data:</p>
                  <div className="text-xs bg-green-100 p-2 rounded">
                    <p><strong>Name:</strong> {result.signupData.firstName} {result.signupData.lastName}</p>
                    <p><strong>Email:</strong> {result.signupData.userEmail}</p>
                    <p><strong>Username:</strong> {result.signupData.username}</p>
                    <p><strong>Signup Time:</strong> {result.signupData.signupTime}</p>
                  </div>
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
              <li>Click the button above to send the test admin notification</li>
              <li>Check your email (tim@828.life) for the admin notification</li>
              <li>Review the email styling and admin-focused content</li>
              <li>Test the admin dashboard links if needed</li>
            </ol>
          </div>

          {/* Admin Features Highlight */}
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded">
            <p className="text-sm">
              <strong>Admin Notification Features:</strong>
            </p>
            <ul className="list-disc list-inside mt-2 text-sm space-y-1">
              <li>User signup details and contact info</li>
              <li>Quick action buttons to admin dashboard</li>
              <li>Pool impact and user journey tracking</li>
              <li>Admin next steps and monitoring guidance</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
