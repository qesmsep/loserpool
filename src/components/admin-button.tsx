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
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user) {
          const { data: profile } = await supabase
            .from('users')
            .select('is_admin')
            .eq('id', user.id)
            .single()
          
          setIsAdmin(profile?.is_admin || false)
        }
      } catch (error) {
        console.error('Error checking admin status:', error)
      } finally {
        setIsLoading(false)
      }
    }

    checkAdminStatus()
  }, [])

  if (isLoading || !isAdmin) {
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