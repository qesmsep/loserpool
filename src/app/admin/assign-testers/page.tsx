'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Users, UserCheck, UserX, Save } from 'lucide-react'
import AdminHeader from '@/components/admin-header'

interface User {
  id: string
  email: string
  username: string | null
  first_name: string | null
  last_name: string | null
  is_admin: boolean
  user_type: 'registered' | 'active' | 'tester' | 'eliminated' | 'pending'
  created_at: string
}

export default function AssignTestersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')


  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      setLoading(true)
      
      const { data: usersData, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      setUsers(usersData || [])
    } catch (error) {
      console.error('Error loading users:', error)
      setError('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const toggleUserType = (userId: string) => {
    setUsers(users.map(user => 
      user.id === userId 
        ? { ...user, user_type: user.user_type === 'tester' ? 'active' : 'tester' }
        : user
    ))
  }

  const saveChanges = async () => {
    try {
      setSaving(true)
      setError('')
      setSuccess('')

      // Get users that have been changed
      const changedUsers = users.filter(() => {
        // We'll need to compare with original data, but for now, just update all
        return true
      })

      // Update all users
      for (const user of changedUsers) {
        const { error } = await supabase
          .from('users')
          .update({ user_type: user.user_type })
          .eq('id', user.id)

        if (error) throw error
      }

      setSuccess(`Successfully updated ${changedUsers.length} users`)
      setTimeout(() => setSuccess(''), 3000)
    } catch (error) {
      console.error('Error saving changes:', error)
      setError('Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  const getTesterCount = () => users.filter(u => u.user_type === 'tester').length
  const getActiveCount = () => users.filter(u => u.user_type === 'active').length
  const getEliminatedCount = () => users.filter(u => u.user_type === 'eliminated').length

  if (loading) {
    return (
      <div className="min-h-screen app-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-300 mx-auto"></div>
          <p className="mt-4 text-blue-200">Loading users...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen app-bg">
      <AdminHeader 
        title="Assign Testers"
        subtitle="Manage user access to preseason games"
        showBackButton={true}
        backHref="/admin"
        backText="Back to Admin"
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Messages */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/30 text-red-200 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-500/20 border border-green-500/30 text-green-200 px-4 py-3 rounded mb-6">
            {success}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Users className="w-6 h-6 text-blue-200" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-blue-100">Total Users</p>
                <p className="text-2xl font-bold text-white">{users.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <UserCheck className="w-6 h-6 text-purple-200" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-purple-100">Testers</p>
                <p className="text-2xl font-bold text-white">{getTesterCount()}</p>
                <p className="text-sm text-purple-200">Preseason access</p>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <UserCheck className="w-6 h-6 text-green-200" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-green-100">Active Users</p>
                <p className="text-2xl font-bold text-white">{getActiveCount()}</p>
                <p className="text-sm text-green-200">Normal price</p>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <UserX className="w-6 h-6 text-red-200" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-red-100">Eliminated Users</p>
                <p className="text-2xl font-bold text-white">{getEliminatedCount()}</p>
                <p className="text-sm text-red-200">No picks</p>
              </div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold text-blue-200 mb-2">Instructions</h3>
          <p className="text-blue-100 text-sm">
            <strong>Testers:</strong> Can buy picks for $0 and test the system<br/>
            <strong>Active Users:</strong> Pay normal price for picks and participate in the pool<br/>
            <strong>Eliminated Users:</strong> All picks have been eliminated, cannot buy more<br/>
            Click the toggle button next to each user to change their type.
          </p>
        </div>

        {/* Users List */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
          <div className="px-6 py-4 border-b border-white/20">
            <h2 className="text-xl font-semibold text-white">User Access Management</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/20">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-blue-200 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-blue-200 uppercase tracking-wider">
                    Current Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-blue-200 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white/5 divide-y divide-white/20">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                            <span className="text-sm font-medium text-white">
                              {user.username?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || '?'}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-white">
                            {user.username || 'No username'}
                            {user.is_admin && (
                              <span className="ml-2 inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-yellow-500/20 text-yellow-200">
                                Admin
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-blue-200">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.user_type === 'tester'
                          ? 'bg-purple-500/20 text-purple-200'
                          : user.user_type === 'active'
                          ? 'bg-green-500/20 text-green-200'
                          : user.user_type === 'pending'
                          ? 'bg-orange-500/20 text-orange-200'
                          : 'bg-red-500/20 text-red-200'
                      }`}>
                        {user.user_type === 'tester' ? 'Tester' : user.user_type === 'active' ? 'Active' : user.user_type === 'pending' ? 'Pending' : 'Eliminated'}
                      </span>
                      <div className="text-xs text-blue-200 mt-1">
                        {user.user_type === 'tester' ? '$0 picks' : user.user_type === 'active' ? 'Normal price' : user.user_type === 'pending' ? 'Purchased, no selections' : 'No picks'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => toggleUserType(user.id)}
                        disabled={user.is_admin} // Admins are always testers
                        className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                          user.is_admin
                            ? 'bg-gray-500/20 text-gray-400 cursor-not-allowed'
                            : user.user_type === 'tester'
                            ? 'bg-red-600/20 text-red-200 hover:bg-red-600/30'
                            : 'bg-green-600/20 text-green-200 hover:bg-green-600/30'
                        }`}
                        title={user.is_admin ? 'Admins are always testers' : `Make ${user.user_type === 'tester' ? 'active' : 'tester'}`}
                      >
                        {user.is_admin ? 'Admin (Always Tester)' : user.user_type === 'tester' ? 'Make Active' : 'Make Tester'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={saveChanges}
            disabled={saving}
            className="flex items-center bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
