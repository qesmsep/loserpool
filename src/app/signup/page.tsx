'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { checkPoolLock } from '@/lib/pool-status-client'

function SignupForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [retryCount] = useState(0)
  const [cooldown, setCooldown] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const inviteCode = searchParams.get('invite')

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    console.log('🚀 SIGNUP ATTEMPT STARTED')
    console.log('📧 Email:', email)
    console.log('📱 Phone:', phone)
    console.log('👤 First Name:', firstName)
    console.log('👤 Last Name:', lastName)
    console.log('🏷️ Username:', username)
    console.log('🎯 Invite Code:', inviteCode)

    // Validate password confirmation
    if (password !== confirmPassword) {
      console.log('❌ Password validation failed: passwords do not match')
      setError('Passwords do not match. Please try again.')
      setLoading(false)
      return
    }

    // Validate password strength
    if (password.length < 6) {
      console.log('❌ Password validation failed: too short')
      setError('Password must be at least 6 characters long.')
      setLoading(false)
      return
    }

    console.log('✅ Password validation passed')

    try {
      console.log('🔍 Checking pool lock status...')
      // Check pool lock status
      const poolStatus = await checkPoolLock()
      console.log('🔒 Pool lock status:', poolStatus)
      if (!poolStatus.allowed) {
        console.log('❌ Pool is locked:', poolStatus.message)
        setError(poolStatus.message)
        setLoading(false)
        return
      }

      console.log('🔍 Checking total entries limit...')
      // Check total entries limit
      const { data: totalEntries } = await supabase
        .from('global_settings')
        .select('value')
        .eq('key', 'max_total_entries')
        .single()

      const { count: currentEntries } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })

      console.log('📊 Entries check:', { totalEntries: totalEntries?.value, currentEntries })

      if (totalEntries && currentEntries && currentEntries >= parseInt(totalEntries.value)) {
        console.log('❌ Pool is full')
        setError('Sorry, the pool is full! No more entries are allowed.')
        setLoading(false)
        return
      }

      let signUpError = null
      let user = null

      console.log('🎯 Starting Supabase auth signup...')
      for (let attempt = 0; attempt <= retryCount; attempt++) {
        console.log(`🔄 Signup attempt ${attempt + 1}/${retryCount + 1}`)
        
        const signupOptions = {
          email,
          password,
          options: {
    
            data: {
              phone: phone || null,
              first_name: firstName,
              last_name: lastName,
              username: username || null,
              is_admin: false,
              user_type: 'registered',
              default_week: 1,
              needs_password_change: false
            }
          }
        }
        
        console.log('📤 Signup options:', JSON.stringify(signupOptions, null, 2))
        
        // Sign up with Supabase's default email confirmation
        const { data: { user: signUpUser }, error } = await supabase.auth.signUp(signupOptions)

        console.log('📥 Supabase response received')
        console.log('👤 User data:', signUpUser ? { id: signUpUser.id, email: signUpUser.email } : 'null')
        console.log('❌ Error:', error ? { message: error.message, status: error.status } : 'null')

        if (error) {
          console.log('🚨 Signup error occurred:', error.message)
          if (error.message.includes('429') || error.message.includes('Too Many Requests')) {
            console.log('⏰ Rate limit error, attempting retry...')
            if (attempt < retryCount) {
              await delay(Math.min(1000 * Math.pow(2, attempt), 10000))
              continue
            } else {
              console.log('❌ Max retries reached for rate limit')
              setError('Too many signup attempts. Please wait a few minutes before trying again.')
              setCooldown(true)
              setTimeout(() => setCooldown(false), 60000)
              setLoading(false)
              return
            }
          } else {
            console.log('❌ Non-retryable error:', error.message)
            signUpError = error
            break
          }
        } else {
          console.log('✅ Signup successful!')
          user = signUpUser
          break
        }
      }

      if (signUpError) {
        console.log('❌ Signup failed with error:', signUpError.message)
        setError(signUpError.message)
        setLoading(false)
        return
      }

      if (user) {
        console.log('🎉 User created successfully:', user.id)
        console.log('⏳ Waiting 2 seconds for auth user to fully commit...')
        await delay(2000) // Wait for auth user to fully commit

        // Manual fallback: Create user profile to ensure it exists
        console.log('🔍 Checking if user profile exists...')
        try {
          const { data: existingUser } = await supabase.from('users').select('id').eq('id', user.id).single()
          console.log('👤 Existing user check:', existingUser ? 'Found' : 'Not found')
          
          if (!existingUser) {
            console.log('🔧 Creating user profile manually...')
            const userProfileData = {
              id: user.id,
              email: user.email!,
              phone,
              first_name: firstName,
              last_name: lastName,
              username: username || null,
              is_admin: false,
              user_type: 'registered',
              default_week: 1,
              needs_password_change: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
            console.log('📤 Manual user profile data:', JSON.stringify(userProfileData, null, 2))
            
            const { error: userInsertError } = await supabase.from('users').insert(userProfileData)
            if (userInsertError) {
              console.warn('❌ Manual user creation failed:', userInsertError.message)
            } else {
              console.log('✅ User profile created manually')
            }
          } else {
            console.log('✅ User profile already exists')
          }
        } catch (err) {
          console.warn('⚠️ Manual user creation error:', err)
        }

        // Handle invitation if present
        if (inviteCode) {
          console.log('🎫 Processing invitation code:', inviteCode)
          try {
            const { error: inviteError } = await supabase
              .from('invitations')
              .update({ used_by: user.id })
              .eq('invite_code', inviteCode)
            if (!inviteError) {
              console.log('✅ Invitation updated successfully')
              await supabase
                .from('users')
                .update({ invited_by: inviteCode })
                .eq('id', user.id)
              console.log('✅ User invited_by field updated')
            } else {
              console.warn('⚠️ Invitation update error:', inviteError.message)
            }
          } catch (inviteErr) {
            console.warn('⚠️ Invitation handling error:', inviteErr)
          }
        }

        // Note: Supabase automatically sends a confirmation email
        // Our custom email system is available for additional emails if needed
        console.log('✅ User created successfully - Supabase will send confirmation email automatically')
        
        // Send admin notification for new user signup
        try {
          const response = await fetch('/api/auth/signup-notification', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userEmail: email,
              username: username,
              firstName: firstName,
              lastName: lastName,
              signupId: user.id
            }),
          })

          if (response.ok) {
            console.log('✅ Admin notification sent for new user signup')
          } else {
            console.error('❌ Failed to send admin notification')
          }
        } catch (emailError) {
          console.error('❌ Error sending admin notification for signup:', emailError)
          // Don't fail the signup if email fails
        }
        
        console.log('🔄 Redirecting to confirm-email page...')

        router.push('/confirm-email')
      }
    } catch (err) {
      console.error('🚨 UNEXPECTED SIGNUP ERROR:', err)
      console.error('📋 Error details:', {
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : 'No stack trace',
        type: typeof err
      })
      setError('An unexpected error occurred. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="app-bg flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Sign Up</h1>
          <p className="text-gray-600 mt-2">Join The Loser Pool</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {cooldown && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded">
              Please wait a moment before trying again.
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                First Name *
              </label>
              <input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                disabled={cooldown}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              />
            </div>

            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                Last Name *
              </label>
              <input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                disabled={cooldown}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              />
            </div>
          </div>

          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
              Username *
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={cooldown}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email *
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={cooldown}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number *
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              disabled={cooldown}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password *
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={cooldown}
              minLength={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
            <p className="text-xs text-gray-500 mt-1">Must be at least 6 characters long</p>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
              Confirm Password *
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={cooldown}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 ${
                confirmPassword && password !== confirmPassword 
                  ? 'border-red-300 focus:ring-red-500' 
                  : 'border-gray-300'
              }`}
            />
            {confirmPassword && password !== confirmPassword && (
              <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || cooldown || Boolean(confirmPassword && password !== confirmPassword)}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            Already have an account?{' '}
            <Link href="/login" className="text-blue-600 hover:text-blue-500">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SignupForm />
    </Suspense>
  )
} 