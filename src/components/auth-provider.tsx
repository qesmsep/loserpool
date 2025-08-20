'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface AuthContextType {
  user: User | null
  loading: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Error getting initial session:', error.message)
          setUser(null)
          setLoading(false)
          return
        }
        
        if (session) {
          // Check if session is expired
          if (session.expires_at) {
            const expiresAt = new Date(session.expires_at * 1000)
            const now = new Date()
            
            if (expiresAt <= now) {
              console.log('Initial session expired, attempting refresh')
              const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession()
              
              if (refreshError) {
                console.error('Session refresh error:', refreshError.message)
                setUser(null)
              } else if (refreshedSession) {
                setUser(refreshedSession.user)
              } else {
                setUser(null)
              }
            } else {
              setUser(session.user)
            }
          } else {
            setUser(session.user)
          }
        } else {
          setUser(null)
        }
      } catch (err) {
        console.error('Error in getInitialSession:', err)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user?.email)
        
        try {
          if (session) {
            // Check if session is expired
            if (session.expires_at) {
              const expiresAt = new Date(session.expires_at * 1000)
              const now = new Date()
              
              if (expiresAt <= now) {
                console.log('Session expired in auth state change, attempting refresh')
                const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession()
                
                if (refreshError) {
                  console.error('Session refresh error in auth state change:', refreshError.message)
                  setUser(null)
                } else if (refreshedSession) {
                  setUser(refreshedSession.user)
                } else {
                  setUser(null)
                }
              } else {
                setUser(session.user)
              }
            } else {
              setUser(session.user)
            }
          } else {
            setUser(null)
          }
        } catch (err) {
          console.error('Error in auth state change handler:', err)
          setUser(null)
        } finally {
          setLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Add default export
export default AuthProvider 