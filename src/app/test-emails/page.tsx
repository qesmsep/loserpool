'use client'

import { useState } from 'react'
import { Send, CheckCircle, AlertCircle } from 'lucide-react'

export default function TestEmailsPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const sendTestEmails = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/test-emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send test emails')
      }

      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen app-bg">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-4">🧪 Test Email System</h1>
          <p className="text-blue-200">Send test purchase notification emails to tim@828.life</p>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-8">
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold text-white mb-2">Test Purchase Emails</h2>
            <p className="text-blue-200 mb-4">
              This will send both the admin notification and user confirmation emails to tim@828.life
            </p>
            
            <div className="bg-blue-600/20 border border-blue-500/30 rounded-lg p-4 mb-6">
              <h3 className="text-white font-medium mb-2">Test Purchase Details:</h3>
              <div className="text-blue-200 text-sm space-y-1">
                <div>User: Tim Wirick (tim@828.life)</div>
                <div>Picks: 5</div>
                <div>Amount: $105.00</div>
                <div>Purchase ID: test-purchase-12345</div>
              </div>
            </div>
          </div>

          <div className="text-center">
            <button
              onClick={sendTestEmails}
              disabled={loading}
              className="inline-flex items-center bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-semibold transition-all transform hover:scale-105 shadow-lg"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Sending Test Emails...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5 mr-2" />
                  Send Test Emails
                </>
              )}
            </button>
          </div>

          {/* Results */}
          {result && (
            <div className="mt-6 bg-green-600/20 border border-green-500/30 rounded-lg p-4">
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-400 mr-2" />
                <h3 className="text-green-200 font-medium">Success!</h3>
              </div>
              <p className="text-green-100 mt-2">{result.message}</p>
              <div className="mt-3">
                <h4 className="text-green-200 font-medium mb-2">Emails Sent:</h4>
                <ul className="text-green-100 text-sm space-y-1">
                  {result.emailsSent.map((email: string, index: number) => (
                    <li key={index}>• {email}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-6 bg-red-600/20 border border-red-500/30 rounded-lg p-4">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
                <h3 className="text-red-200 font-medium">Error</h3>
              </div>
              <p className="text-red-100 mt-2">{error}</p>
            </div>
          )}
        </div>

        <div className="mt-8 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">📧 Email Types Being Tested</h3>
          <div className="space-y-4">
            <div className="bg-blue-600/20 border border-blue-500/30 rounded-lg p-4">
              <h4 className="text-white font-medium mb-2">1. Admin Purchase Notification</h4>
              <p className="text-blue-200 text-sm">
                Sent to all admin users when a purchase is completed. Includes purchase details, 
                user information, and quick action buttons to view user profile and purchase history.
              </p>
            </div>
            <div className="bg-green-600/20 border border-green-500/30 rounded-lg p-4">
              <h4 className="text-white font-medium mb-2">2. User Purchase Confirmation</h4>
              <p className="text-green-200 text-sm">
                Sent to the purchasing user as a receipt. Includes purchase summary, next steps, 
                dashboard button, and important reminders about the pool rules.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-blue-200 text-sm">
            Check the browser console and your email inbox for the test emails.
          </p>
        </div>
      </div>
    </div>
  )
}
