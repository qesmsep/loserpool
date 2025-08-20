'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Settings } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function AdminButton() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function checkAdminStatus() {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (userError) {
          console.error('Error getting user:', userError)
          setIsLoading(false)
          return
        }
        
        if (user) {
          console.log('Checking admin status for user:', user.email)
          
          try {
            const { data: profile, error: profileError } = await supabase
              .from('users')
              .select('is_admin')
              .eq('id', user.id)
              .single()
            
            if (profileError) {
              console.error('Error getting profile:', profileError)
              setIsAdmin(false)
            } else {
              console.log('Admin status from DB:', profile?.is_admin)
              setIsAdmin(!!profile?.is_admin)
            }
          } catch (dbError) {
            console.error('Database error:', dbError)
            setIsAdmin(false)
          }
        } else {
          console.log('No user found')
          setIsAdmin(false)
        }
      } catch (error) {
        console.error('Error checking admin status:', error)
        setIsAdmin(false)
      } finally {
        setIsLoading(false)
      }
    }

    checkAdminStatus()
  }, [])

  // Show loading spinner while checking admin status
  if (isLoading) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <div className="flex items-center justify-center w-12 h-12 bg-gray-500/20 backdrop-blur-sm rounded-full border border-gray-500/30">
          <div className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    )
  }

  // Don't render anything if user is not an admin
  if (!isAdmin) {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Link
        href="/admin"
        className="flex items-center justify-center w-12 h-12 bg-red-500/20 backdrop-blur-sm rounded-full border border-red-500/30 hover:bg-red-500/30 transition-all duration-200 shadow-lg hover:shadow-xl"
        title="Admin Panel"
      >
        <Settings className="w-5 h-5 text-red-200" />
      </Link>
    </div>
  )
} 