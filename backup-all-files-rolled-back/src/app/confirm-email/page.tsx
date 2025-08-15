import Link from 'next/link'
import { Mail, ArrowRight } from 'lucide-react'

export default function ConfirmEmailPage() {
  return (
    <div className="min-h-screen app-bg flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <Mail className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Check Your Email</h1>
          <p className="text-gray-600 mt-2">We&apos;ve sent you a confirmation link</p>
        </div>

        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded">
            <p className="text-sm">
              <strong>Next steps:</strong>
            </p>
            <ol className="list-decimal list-inside mt-2 text-sm space-y-1">
              <li>Check your email for a confirmation link</li>
              <li>Click the confirmation link in the email</li>
              <li>Come back here and sign in to access your dashboard</li>
            </ol>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded">
            <p className="text-sm">
              <strong>Didn&apos;t receive the email?</strong>
            </p>
            <ul className="list-disc list-inside mt-2 text-sm space-y-1">
              <li>Check your spam folder</li>
              <li>Make sure you entered the correct email address</li>
              <li>Wait a few minutes for the email to arrive</li>
            </ul>
          </div>

          <div className="flex items-center justify-between">
            <Link
              href="/login"
              className="flex items-center text-blue-600 hover:text-blue-500"
            >
              <ArrowRight className="w-4 h-4 mr-2" />
              Ready to sign in?
            </Link>
          </div>

          <div className="text-center">
            <Link
              href="/"
              className="text-gray-500 hover:text-gray-700 text-sm"
            >
              ← Back to home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
} 