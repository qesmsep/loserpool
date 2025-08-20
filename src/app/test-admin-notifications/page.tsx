'use client'

import { useState } from 'react'

export default function TestAdminNotificationsPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const testAdminNotifications = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/test-admin-notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to test admin notifications')
      } else {
        setResult(data)
      }
    } catch (err) {
      setError('Network error occurred')
    } finally {
      setLoading(false)
    }
  }

  const checkAdminUsers = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/test-admin-notifications', {
        method: 'GET'
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to check admin users')
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Test Admin Notifications</h1>
          <p className="text-gray-600 mb-6">Test the admin notification system to verify all admins receive emails</p>

          <div className="space-y-4 mb-8">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">What this test does:</h3>
              <ul className="text-blue-800 space-y-1">
                <li>• Fetches all users with <code>is_admin = true</code> from the database</li>
                <li>• Sends a test notification email to each admin user</li>
                <li>• Reports success/failure for each email send</li>
                <li>• Shows detailed results including admin count and email status</li>
              </ul>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-yellow-900 mb-2">Expected Results:</h3>
              <ul className="text-yellow-800 space-y-1">
                <li>• All admin users should receive the test email</li>
                <li>• Check your email inbox for the test notification</li>
                <li>• The email will show all admin users found in the system</li>
                <li>• If only one admin receives it, there may be an issue with the notification system</li>
              </ul>
            </div>
          </div>

          <div className="flex space-x-4 mb-6">
            <button
              onClick={checkAdminUsers}
              disabled={loading}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
            >
              {loading ? 'Checking...' : 'Check Admin Users Only'}
            </button>

            <button
              onClick={testAdminNotifications}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Testing...' : 'Send Test Notifications to All Admins'}
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-semibold text-red-900 mb-2">Error:</h3>
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {result && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-green-900 mb-4">Test Results:</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="bg-white rounded p-3">
                  <div className="text-2xl font-bold text-blue-600">{result.adminCount}</div>
                  <div className="text-sm text-gray-600">Total Admin Users</div>
                </div>
                <div className="bg-white rounded p-3">
                  <div className="text-2xl font-bold text-green-600">{result.successfulSends || 0}</div>
                  <div className="text-sm text-gray-600">Successful Sends</div>
                </div>
                <div className="bg-white rounded p-3">
                  <div className="text-2xl font-bold text-red-600">{result.failedSends || 0}</div>
                  <div className="text-sm text-gray-600">Failed Sends</div>
                </div>
              </div>

              {result.admins && (
                <div className="mb-4">
                  <h4 className="font-semibold text-green-900 mb-2">Admin Users Found:</h4>
                  <ul className="space-y-1">
                    {result.admins.map((admin: any, index: number) => (
                      <li key={index} className="text-green-800">
                        • {admin.email} ({admin.first_name || ''} {admin.last_name || ''})
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.results && (
                <div>
                  <h4 className="font-semibold text-green-900 mb-2">Email Send Results:</h4>
                  <div className="space-y-2">
                    {result.results.map((emailResult: any, index: number) => (
                      <div key={index} className={`p-2 rounded ${emailResult.success ? 'bg-green-100' : 'bg-red-100'}`}>
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{emailResult.email}</span>
                          <span className={`px-2 py-1 rounded text-xs ${emailResult.success ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                            {emailResult.success ? '✅ Sent' : '❌ Failed'}
                          </span>
                        </div>
                        {!emailResult.success && (
                          <div className="text-sm text-red-700 mt-1">
                            Error: {emailResult.error}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-6 p-4 bg-blue-100 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">Next Steps:</h4>
                <ul className="text-blue-800 space-y-1">
                  <li>• Check your email inbox for the test notification</li>
                  <li>• Verify that all admin users received the email</li>
                  <li>• If only one admin received it, there may be an issue with the notification system</li>
                  <li>• Check the console logs for detailed debugging information</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
