'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, LogOut } from 'lucide-react'

interface AdminHeaderProps {
  title: string
  subtitle?: string
  showBackButton?: boolean
  backHref?: string
  backText?: string
}

export default function AdminHeader({ 
  title, 
  subtitle, 
  showBackButton = false, 
  backHref = '/dashboard',
  backText = 'Back to Dashboard'
}: AdminHeaderProps) {
  const router = useRouter()

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Error signing out:', error)
      } else {
        router.push('/login')
      }
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  return (
    <header className="bg-white/10 backdrop-blur-sm border-b border-white/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-6">
          <div className="flex items-center space-x-4">
            {showBackButton && (
              <Link
                href={backHref}
                className="flex items-center text-blue-100 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                {backText}
              </Link>
            )}
            <div>
              <h1 className="text-3xl font-bold text-white">{title}</h1>
              {subtitle && <p className="text-blue-100">{subtitle}</p>}
            </div>
          </div>
          
          <button
            onClick={handleSignOut}
            className="flex items-center px-4 py-2 text-blue-100 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="Sign out"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </button>
        </div>
      </div>
    </header>
  )
} 