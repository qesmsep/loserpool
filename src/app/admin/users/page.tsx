'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Users, Mail, Calendar, Plus, Edit, Trash2, Save, X } from 'lucide-react'
import Header from '@/components/header'

interface User {
  id: string
  email: string
  username: string | null
  first_name: string | null
  last_name: string | null
  phone: string | null
  is_admin: boolean
  created_at: string
  totalPurchased: number
  activePicks: number
  eliminatedPicks: number
  isEliminated: boolean
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [authLoading, setAuthLoading] = useState(true)
  const [showAddUser, setShowAddUser] = useState(false)
  const [editingUser, setEditingUser] = useState<string | null>(null)


  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const router = useRouter()

  // Form states
  const [newUser, setNewUser] = useState({
    email: '',
    username: '',
    first_name: '',
    last_name: '',
    phone: '',
    is_admin: false,
    temporaryPassword: ''
  })

  const [editUser, setEditUser] = useState({
    email: '',
    username: '',
    first_name: '',
    last_name: '',
    phone: '',
    is_admin: false
  })
  const [picksToAdd, setPicksToAdd] = useState(0)

  // Check authentication and admin status
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          router.push('/login')
          return
        }

        // Check if user is admin
        const { data: userProfile } = await supabase
          .from('users')
          .select('is_admin')
          .eq('id', user.id)
          .single()

        if (!userProfile?.is_admin) {
          router.push('/dashboard')
          return
        }

        setAuthLoading(false)
        loadUsers()
      } catch (error) {
        console.error('Auth error:', error)
        router.push('/login')
      }
    }

    checkAuth()
  }, [router])

  const loadUsers = async () => {
    try {
      setLoading(true)
      
      // Get all users with their stats
      const { data: usersData } = await supabase
        .from('users')
        .select(`
          *,
          purchases(
            picks_count,
            status
          )
        `)

      // Get picks data for each user
      const { data: picks } = await supabase
        .from('picks')
        .select('user_id, status, picks_count')

      // Calculate stats for each user
      const usersWithStats = usersData?.map(user => {
        const userPurchases = user.purchases || []
        const userPicks = picks?.filter(p => p.user_id === user.id) || []
        
        const totalPurchased = userPurchases
          .filter((p: { status: string }) => p.status === 'completed')
          .reduce((sum: number, p: { picks_count: number }) => sum + p.picks_count, 0)
        
        const activePicks = userPicks
          .filter((p: { status: string }) => p.status === 'active')
          .reduce((sum: number, p: { picks_count: number }) => sum + p.picks_count, 0)
        
        const eliminatedPicks = userPicks
          .filter((p: { status: string }) => p.status === 'eliminated')
          .reduce((sum: number, p: { picks_count: number }) => sum + p.picks_count, 0)

        return {
          ...user,
          totalPurchased,
          activePicks,
          eliminatedPicks,
          isEliminated: eliminatedPicks > 0 && activePicks === 0 && totalPurchased > 0
        }
      }) || []

      setUsers(usersWithStats)
    } catch (error) {
      console.error('Error loading users:', error)
      setError('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const handleAddUser = async () => {
    try {
      setError('')
      
      const response = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newUser)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create user')
      }

      setSuccess('User added successfully')
      setShowAddUser(false)
      
      setNewUser({
        email: '',
        username: '',
        first_name: '',
        last_name: '',
        phone: '',
        is_admin: false,
        temporaryPassword: ''
      })
      loadUsers()
    } catch (error) {
      console.error('Error adding user:', error)
      setError(`Failed to add user: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleUpdateUser = async (userId: string) => {
    try {
      setError('')
      
      const { error } = await supabase
        .from('users')
        .update({
          email: editUser.email,
          username: editUser.username || null,
          first_name: editUser.first_name || null,
          last_name: editUser.last_name || null,
          phone: editUser.phone || null,
          is_admin: editUser.is_admin
        })
        .eq('id', userId)

      if (error) throw error

      setSuccess('User updated successfully')
      setEditingUser(null)
      loadUsers()
    } catch (error) {
      console.error('Error updating user:', error)
      setError('Failed to update user')
    }
  }

  const handleAddPicks = async (userId: string) => {
    try {
      setError('')
      
      if (picksToAdd <= 0) {
        setError('Please enter a valid number of picks')
        return
      }

      const response = await fetch('/api/admin/add-picks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          userId, 
          picksCount: picksToAdd 
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to add picks')
      }

      setSuccess(`${picksToAdd} picks added successfully`)
      setPicksToAdd(0)
      loadUsers()
    } catch (error) {
      console.error('Error adding picks:', error)
      setError(`Failed to add picks: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return
    }

    try {
      setError('')
      
      const response = await fetch('/api/admin/delete-user', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete user')
      }

      setSuccess('User deleted successfully')
      loadUsers()
    } catch (error) {
      console.error('Error deleting user:', error)
      setError(`Failed to delete user: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const startEditUser = (user: User) => {
    setEditingUser(user.id)
    setEditUser({
      email: user.email,
      username: user.username || '',
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      phone: user.phone || '',
      is_admin: user.is_admin
    })
    setPicksToAdd(0) // Reset picks count when opening edit modal
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-300 mx-auto"></div>
          <p className="mt-4 text-blue-200">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      <Header 
        title="Manage Users"
        subtitle="View and manage user accounts"
        showBackButton={true}
        backHref="/admin"
        backText="Back to Admin"
      />
      
      {/* Add User Button */}
      <div className="bg-white/10 backdrop-blur-sm border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-end py-2">
            <button
              onClick={() => setShowAddUser(true)}
              className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add User
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
              <div className="p-2 bg-green-500/20 rounded-lg">
                <Calendar className="w-6 h-6 text-green-200" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-green-100">Active Users</p>
                <p className="text-2xl font-bold text-white">
                  {users.filter(u => !u.isEliminated).length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <Users className="w-6 h-6 text-red-200" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-red-100">Eliminated</p>
                <p className="text-2xl font-bold text-white">
                  {users.filter(u => u.isEliminated).length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Mail className="w-6 h-6 text-purple-200" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-purple-100">With Purchases</p>
                <p className="text-2xl font-bold text-white">
                  {users.filter(u => u.totalPurchased > 0).length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Add User Modal */}
        {showAddUser && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-white">Add New User</h3>
                <button
                  onClick={() => setShowAddUser(false)}
                  className="text-blue-200 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-1">Email *</label>
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                    className="w-full px-3 py-2 border border-white/30 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/10 text-white"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-white mb-1">Username</label>
                  <input
                    type="text"
                    value={newUser.username}
                    onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                    className="w-full px-3 py-2 border border-white/30 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/10 text-white"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white mb-1">First Name</label>
                    <input
                      type="text"
                      value={newUser.first_name}
                      onChange={(e) => setNewUser({...newUser, first_name: e.target.value})}
                      className="w-full px-3 py-2 border border-white/30 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/10 text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-white mb-1">Last Name</label>
                    <input
                      type="text"
                      value={newUser.last_name}
                      onChange={(e) => setNewUser({...newUser, last_name: e.target.value})}
                      className="w-full px-3 py-2 border border-white/30 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/10 text-white"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-white mb-1">Phone</label>
                  <input
                    type="tel"
                    value={newUser.phone}
                    onChange={(e) => setNewUser({...newUser, phone: e.target.value})}
                    className="w-full px-3 py-2 border border-white/30 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/10 text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-white mb-1">Temporary Password *</label>
                  <input
                    type="text"
                    value={newUser.temporaryPassword}
                    onChange={(e) => setNewUser({...newUser, temporaryPassword: e.target.value})}
                    className="w-full px-3 py-2 border border-white/30 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/10 text-white"
                    placeholder="Enter temporary password"
                    required
                  />
                  <p className="text-xs text-blue-200 mt-1">
                    User will be prompted to change this password on first login
                  </p>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={newUser.is_admin}
                    onChange={(e) => setNewUser({...newUser, is_admin: e.target.checked})}
                    className="mr-2"
                  />
                  <label className="text-sm text-white">Admin user</label>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowAddUser(false)}
                  className="px-4 py-2 text-blue-200 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddUser}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Add User
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Users Table */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
          <div className="px-6 py-4 border-b border-white/20">
            <h2 className="text-xl font-semibold text-white">All Users</h2>
            <p className="text-blue-100">Complete user list with stats</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/20">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-blue-200 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-blue-200 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-blue-200 uppercase tracking-wider">
                    Picks
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-blue-200 uppercase tracking-wider">
                    Status
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
                          <div className="text-sm text-blue-200">
                            {user.first_name} {user.last_name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-white">{user.email}</div>
                      <div className="text-sm text-blue-200">{user.phone || 'No phone'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-white">
                        <span className="text-green-300">{user.activePicks} active</span>
                        {user.eliminatedPicks > 0 && (
                          <span className="text-red-300 ml-2">, {user.eliminatedPicks} eliminated</span>
                        )}
                      </div>
                      <div className="text-sm text-blue-200">
                        {user.totalPurchased} purchased
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.isEliminated
                          ? 'bg-red-500/20 text-red-200'
                          : user.totalPurchased > 0
                          ? 'bg-green-500/20 text-green-200'
                          : user.is_admin
                          ? 'bg-yellow-500/20 text-yellow-200'
                          : 'bg-gray-500/20 text-gray-200'
                      }`}>
                        {user.isEliminated ? 'Eliminated' : user.totalPurchased > 0 ? 'Has Picks' : user.is_admin ? 'Admin' : 'No Picks'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => startEditUser(user)}
                          className="text-blue-200 hover:text-white"
                          title="Edit user"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="text-red-200 hover:text-white"
                          title="Delete user"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Edit User Modal */}
        {editingUser && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-white">Edit User</h3>
                <button
                  onClick={() => setEditingUser(null)}
                  className="text-blue-200 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-1">Email *</label>
                  <input
                    type="email"
                    value={editUser.email}
                    onChange={(e) => setEditUser({...editUser, email: e.target.value})}
                    className="w-full px-3 py-2 border border-white/30 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/10 text-white"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-white mb-1">Username</label>
                  <input
                    type="text"
                    value={editUser.username}
                    onChange={(e) => setEditUser({...editUser, username: e.target.value})}
                    className="w-full px-3 py-2 border border-white/30 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/10 text-white"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white mb-1">First Name</label>
                    <input
                      type="text"
                      value={editUser.first_name}
                      onChange={(e) => setEditUser({...editUser, first_name: e.target.value})}
                      className="w-full px-3 py-2 border border-white/30 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/10 text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-white mb-1">Last Name</label>
                    <input
                      type="text"
                      value={editUser.last_name}
                      onChange={(e) => setEditUser({...editUser, last_name: e.target.value})}
                      className="w-full px-3 py-2 border border-white/30 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/10 text-white"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-white mb-1">Phone</label>
                  <input
                    type="tel"
                    value={editUser.phone}
                    onChange={(e) => setEditUser({...editUser, phone: e.target.value})}
                    className="w-full px-3 py-2 border border-white/30 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/10 text-white"
                  />
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={editUser.is_admin}
                    onChange={(e) => setEditUser({...editUser, is_admin: e.target.checked})}
                    className="mr-2"
                  />
                  <label className="text-sm text-white">Admin user</label>
                </div>

                {/* Add Picks Section */}
                <div className="border-t border-white/20 pt-4">
                  <h4 className="text-sm font-medium text-white mb-3">Add Picks</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-white mb-1">Number of Picks</label>
                      <input
                        type="number"
                        min="1"
                        value={picksToAdd}
                        onChange={(e) => setPicksToAdd(parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-white/30 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/10 text-white"
                        placeholder="0"
                      />
                    </div>
                    
                    <div className="text-sm text-blue-200">
                      This will add {picksToAdd} picks to the user&apos;s account as a completed purchase.
                    </div>
                    
                    <button
                      onClick={() => handleAddPicks(editingUser)}
                      disabled={picksToAdd <= 0}
                      className="w-full px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      Add {picksToAdd} Picks
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 text-blue-200 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleUpdateUser(editingUser)}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  <Save className="w-4 h-4 mr-2 inline" />
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}




      </div>
    </div>
  )
} 