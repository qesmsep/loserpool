'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { ArrowLeft, Users, Mail, Calendar, Plus, Edit, Trash2, Save, X } from 'lucide-react'

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
  const [showAddPicks, setShowAddPicks] = useState<string | null>(null)
  const [showTemporaryPassword, setShowTemporaryPassword] = useState<{email: string, password: string} | null>(null)
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
    is_admin: false
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
          isEliminated: activePicks === 0 && totalPurchased > 0
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
      
      // Show temporary password if provided
      if (result.temporaryPassword) {
        setShowTemporaryPassword({
          email: newUser.email,
          password: result.temporaryPassword
        })
      }
      
      setNewUser({
        email: '',
        username: '',
        first_name: '',
        last_name: '',
        phone: '',
        is_admin: false
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

      // Add purchase record
      const { error } = await supabase
        .from('purchases')
        .insert({
          user_id: userId,
          picks_count: picksToAdd,
          amount: picksToAdd * 2100, // $21 per pick in cents
          status: 'completed'
        })

      if (error) throw error

      setSuccess(`${picksToAdd} picks added successfully`)
      setShowAddPicks(null)
      setPicksToAdd(0)
      loadUsers()
    } catch (error) {
      console.error('Error adding picks:', error)
      setError('Failed to add picks')
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return
    }

    try {
      setError('')
      
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId)

      if (error) throw error

      setSuccess('User deleted successfully')
      loadUsers()
    } catch (error) {
      console.error('Error deleting user:', error)
      setError('Failed to delete user')
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
      {/* Header */}
      <header className="bg-white/10 backdrop-blur-sm border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <Link
                href="/admin"
                className="flex items-center text-blue-100 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Admin
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-white">Manage Users</h1>
                <p className="text-blue-100">View and manage user accounts</p>
              </div>
            </div>
            <button
              onClick={() => setShowAddUser(true)}
              className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add User
            </button>
          </div>
        </div>
      </header>

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
                        {user.isEliminated ? 'Eliminated' : user.totalPurchased > 0 ? 'Active' : user.is_admin ? 'Admin' : 'No Picks'}
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
                          onClick={() => setShowAddPicks(user.id)}
                          className="text-green-200 hover:text-white"
                          title="Add picks"
                        >
                          <Plus className="w-4 h-4" />
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

        {/* Add Picks Modal */}
        {showAddPicks && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-white">Add Picks</h3>
                <button
                  onClick={() => setShowAddPicks(null)}
                  className="text-blue-200 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-1">Number of Picks</label>
                  <input
                    type="number"
                    min="1"
                    value={picksToAdd}
                    onChange={(e) => setPicksToAdd(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-white/30 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/10 text-white"
                  />
                </div>
                
                <div className="text-sm text-blue-200">
                  This will add {picksToAdd} picks to the user&apos;s account as a completed purchase.
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowAddPicks(null)}
                  className="px-4 py-2 text-blue-200 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleAddPicks(showAddPicks)}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Add Picks
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Temporary Password Modal */}
        {showTemporaryPassword && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-white">Temporary Password Generated</h3>
                <button
                  onClick={() => setShowTemporaryPassword(null)}
                  className="text-blue-200 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="bg-yellow-500/20 border border-yellow-500/30 rounded p-4">
                  <p className="text-sm text-yellow-200 mb-2">
                    A temporary password has been generated for the new user. Please provide this to the user securely.
                  </p>
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm font-medium text-white">Email:</span>
                      <span className="text-sm text-blue-200 ml-2">{showTemporaryPassword.email}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-white">Temporary Password:</span>
                      <div className="flex items-center space-x-2 mt-1">
                        <input
                          type="text"
                          value={showTemporaryPassword.password}
                          readOnly
                          className="flex-1 px-2 py-1 bg-white/10 border border-white/30 rounded text-sm text-white font-mono"
                        />
                        <button
                          onClick={() => navigator.clipboard.writeText(showTemporaryPassword.password)}
                          className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="text-sm text-blue-200">
                  <p className="mb-2">Important:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>The user will be prompted to change their password on first login</li>
                    <li>Share this password securely with the user</li>
                    <li>The password will not be shown again</li>
                  </ul>
                </div>
              </div>
              
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowTemporaryPassword(null)}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Got it
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 