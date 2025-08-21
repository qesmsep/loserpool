'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Users, Mail, Calendar, Plus, Edit, Trash2, X, Check } from 'lucide-react'
import AdminHeader from '@/components/admin-header'

interface User {
  id: string
  email: string
  username: string | null
  first_name: string | null
  last_name: string | null
  phone: string | null
  is_admin: boolean
  user_type: 'registered' | 'active' | 'tester' | 'eliminated' | 'pending'
  created_at: string
  totalPurchased: number
  activePicks: number
  eliminatedPicks: number
  isEliminated: boolean
}

// Phone number formatting function
const formatPhoneNumber = (phone: string | null): string => {
  if (!phone) return 'No phone'
  
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '')
  
  // Check if it's a valid 10-digit number
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
  }
  
  // If it's not 10 digits, return the original or a formatted version
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `(${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`
  }
  
  // Return original if it doesn't match expected patterns
  return phone
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
    user_type: 'registered' as 'registered' | 'active' | 'tester' | 'eliminated' | 'pending',
    temporaryPassword: ''
  })

  const [editUser, setEditUser] = useState({
    email: '',
    username: '',
    first_name: '',
    last_name: '',
    phone: '',
    is_admin: false,
    user_type: 'registered' as 'registered' | 'active' | 'tester' | 'eliminated' | 'pending'
  })
  const [picksToAdd, setPicksToAdd] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  
  // Filter states
  const [filters, setFilters] = useState({
    userType: 'all' as 'all' | 'registered' | 'active' | 'tester' | 'eliminated' | 'pending'
  })

  // Filter users based on search term and filters
  const filteredUsers = users.filter(user => {
    // Text search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      const matchesSearch = (
        user.email?.toLowerCase().includes(searchLower) ||
        user.username?.toLowerCase().includes(searchLower) ||
        user.first_name?.toLowerCase().includes(searchLower) ||
        user.last_name?.toLowerCase().includes(searchLower) ||
        user.phone?.toLowerCase().includes(searchLower)
      )
      if (!matchesSearch) return false
    }

    // User type filter
    if (filters.userType !== 'all' && user.user_type !== filters.userType) {
      return false
    }

    return true
  })

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('')
    setFilters({
      userType: 'all'
    })
  }

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
      
      // Use the admin API route to fetch users (bypasses RLS)
      const response = await fetch('/api/admin/users')
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch users')
      }

      const { users: usersData } = await response.json()
      setUsers(usersData || [])
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
        user_type: 'registered',
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
      
      // Find the original user data to detect changes
      const originalUser = users.find(u => u.id === userId)
      if (!originalUser) {
        throw new Error('Original user data not found')
      }
      
      const updateData = {
        email: editUser.email,
        username: editUser.username || null,
        first_name: editUser.first_name || null,
        last_name: editUser.last_name || null,
        phone: editUser.phone || null,
        is_admin: editUser.is_admin,
        user_type: editUser.user_type
      }
      
      // Check if user type changed from tester to active
      const userTypeChanged = originalUser.user_type !== editUser.user_type
      const isTesterToActive = originalUser.user_type === 'tester' && editUser.user_type === 'active'
      
      console.log('Updating user with data:', updateData)
      console.log('User ID:', userId)
      console.log('User type changed:', userTypeChanged)
      console.log('Tester to Active transition:', isTesterToActive)
      
      const response = await fetch('/api/admin/update-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, updateData })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update user')
      }

      // Show appropriate success message
      if (isTesterToActive) {
        setSuccess(`User updated successfully! User type changed from Tester to Active. Default view will now show current Regular Season games.`)
      } else if (userTypeChanged) {
        setSuccess(`User updated successfully! User type changed from ${originalUser.user_type} to ${editUser.user_type}.`)
      } else {
        setSuccess('User updated successfully')
      }
      
      setEditingUser(null)
      loadUsers()
    } catch (error) {
      console.error('Error updating user:', error)
      setError(`Failed to update user: ${error instanceof Error ? error.message : 'Unknown error'}`)
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
      is_admin: user.is_admin,
      user_type: user.user_type
    })
    setPicksToAdd(0)
  }

  const cancelEdit = () => {
    setEditingUser(null)
    setPicksToAdd(0)
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen app-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-300 mx-auto"></div>
          <p className="mt-4 text-blue-200">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen app-bg">
      <AdminHeader 
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
                
                <div>
                  <label className="block text-sm font-medium text-white mb-1">User Type</label>
                  <select
                    value={newUser.user_type}
                                                  onChange={(e) => setNewUser({...newUser, user_type: e.target.value as 'registered' | 'active' | 'tester' | 'eliminated' | 'pending'})}
                    className="w-full px-3 py-2 border border-white/30 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/10 text-white"
                  >
                    <option value="registered">Registered (No Picks Yet)</option>
                    <option value="active">Active (Normal Pool)</option>
                    <option value="tester">Tester ($0 Picks)</option>
                    <option value="eliminated">Eliminated (No Picks)</option>
                  </select>
                  <p className="text-xs text-blue-200 mt-1">
                    Registered users haven&apos;t bought picks yet. Testers pay $0, active users pay normal price
                  </p>
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
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold text-white">All Users</h2>
                <p className="text-blue-100">Complete user list with stats</p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-64 px-4 py-2 pl-10 border border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/10 text-white placeholder-blue-200"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>
                <div className="text-sm text-blue-200">
                  {filteredUsers.length} of {users.length} users
                </div>
              </div>
            </div>
          </div>

          {/* User Type Filter */}
          <div className="px-6 py-4 border-b border-white/20 bg-white/5">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-blue-200">Filter by User Type:</label>
                <select
                  value={filters.userType}
                  onChange={(e) => setFilters({...filters, userType: e.target.value as 'all' | 'registered' | 'active' | 'tester' | 'eliminated' | 'pending'})}
                  className="px-3 py-1 text-sm border border-white/30 rounded bg-white/10 text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="all">All Types</option>
                  <option value="registered">Registered</option>
                  <option value="pending">Pending</option>
                  <option value="active">Active</option>
                  <option value="eliminated">Eliminated</option>
                  <option value="tester">Tester</option>
                </select>
              </div>

              {/* Clear Filters Button */}
              <button
                onClick={clearFilters}
                className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
              >
                Clear Filter
              </button>
            </div>
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
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-blue-200 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white/5 divide-y divide-white/20">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className={editingUser === user.id ? 'bg-blue-500/10' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingUser === user.id ? (
                        <div className="space-y-2">
                          <div>
                            <label className="block text-xs font-medium text-blue-200 mb-1">Username</label>
                            <input
                              type="text"
                              value={editUser.username}
                              onChange={(e) => setEditUser({...editUser, username: e.target.value})}
                              className="w-full px-2 py-1 text-sm border border-white/30 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white/10 text-white"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs font-medium text-blue-200 mb-1">First Name</label>
                              <input
                                type="text"
                                value={editUser.first_name}
                                onChange={(e) => setEditUser({...editUser, first_name: e.target.value})}
                                className="w-full px-2 py-1 text-sm border border-white/30 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white/10 text-white"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-blue-200 mb-1">Last Name</label>
                              <input
                                type="text"
                                value={editUser.last_name}
                                onChange={(e) => setEditUser({...editUser, last_name: e.target.value})}
                                className="w-full px-2 py-1 text-sm border border-white/30 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white/10 text-white"
                              />
                            </div>
                          </div>
                        </div>
                      ) : (
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
                            </div>
                            <div className="text-sm text-blue-200">
                              {user.first_name} {user.last_name}
                              {user.is_admin && (
                                <span className="ml-2 text-yellow-200 font-medium">⭐ Admin User</span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingUser === user.id ? (
                        <div className="space-y-2">
                          <div>
                            <label className="block text-xs font-medium text-blue-200 mb-1">Email</label>
                            <input
                              type="email"
                              value={editUser.email}
                              onChange={(e) => setEditUser({...editUser, email: e.target.value})}
                              className="w-full px-2 py-1 text-sm border border-white/30 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white/10 text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-blue-200 mb-1">Phone</label>
                            <input
                              type="tel"
                              value={editUser.phone}
                              onChange={(e) => setEditUser({...editUser, phone: e.target.value})}
                              className="w-full px-2 py-1 text-sm border border-white/30 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white/10 text-white"
                            />
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="text-sm text-white">{user.email}</div>
                          <div className="text-sm text-blue-200">{formatPhoneNumber(user.phone)}</div>
                        </>
                      )}
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
                      {editingUser === user.id && (
                        <div className="mt-2 space-y-2">
                          <div>
                            <label className="block text-xs font-medium text-blue-200 mb-1">Add Picks</label>
                            <input
                              type="number"
                              min="1"
                              value={picksToAdd}
                              onChange={(e) => setPicksToAdd(parseInt(e.target.value) || 0)}
                              className="w-full px-2 py-1 text-sm border border-white/30 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white/10 text-white"
                              placeholder="0"
                            />
                          </div>
                          <button
                            onClick={() => handleAddPicks(user.id)}
                            disabled={picksToAdd <= 0}
                            className="w-full px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Add {picksToAdd} Picks
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.isEliminated
                          ? 'bg-red-500/20 text-red-200'
                          : user.totalPurchased > 0
                          ? 'bg-green-500/20 text-green-200'
                          : 'bg-gray-500/20 text-gray-200'
                      }`}>
                        {user.isEliminated ? 'Eliminated' : user.totalPurchased > 0 ? 'Has Picks' : 'No Picks'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingUser === user.id ? (
                        <div className="space-y-2">
                          <div>
                            <label className="block text-xs font-medium text-blue-200 mb-1">User Type</label>
                            <select
                              value={editUser.user_type}
                              onChange={(e) => setEditUser({...editUser, user_type: e.target.value as 'registered' | 'active' | 'tester' | 'eliminated' | 'pending'})}
                              className="w-full px-2 py-1 text-sm border border-white/30 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white/10 text-white"
                            >
                              <option value="registered">Registered (No Picks Yet)</option>
                              <option value="pending">Pending (Purchased, No Selections)</option>
                              <option value="active">Active (Normal Pool)</option>
                              <option value="tester">Tester ($0 Picks)</option>
                              <option value="eliminated">Eliminated (No Picks)</option>
                            </select>
                            {/* Show helpful info about user type changes */}
                            {(() => {
                              const originalUser = users.find(u => u.id === editingUser)
                              if (!originalUser || originalUser.user_type === editUser.user_type) return null
                              
                              if (originalUser.user_type === 'tester' && editUser.user_type !== 'tester') {
                                return (
                                  <div className="mt-1 p-2 bg-green-500/10 border border-green-500/20 rounded text-xs text-green-200">
                                    ✅ Will automatically switch from Preseason Week 3 to current Regular Season games
                                  </div>
                                )
                              } else if (editUser.user_type === 'tester') {
                                // Check if we're past the preseason cutoff
                                const preseasonCutoff = new Date('2025-08-26')
                                const now = new Date()
                                
                                if (now >= preseasonCutoff) {
                                  return (
                                    <div className="mt-1 p-2 bg-purple-500/10 border border-purple-500/20 rounded text-xs text-purple-200">
                                      ✅ Will automatically switch to current Regular Season games ($0 picks)
                                    </div>
                                  )
                                } else {
                                  return (
                                    <div className="mt-1 p-2 bg-purple-500/10 border border-purple-500/20 rounded text-xs text-purple-200">
                                      ✅ Will automatically switch to Preseason Week 3 games ($0 picks)
                                    </div>
                                  )
                                }
                              } else if ((originalUser.user_type as string) !== 'tester' && editUser.user_type !== 'tester') {
                                return (
                                  <div className="mt-1 p-2 bg-blue-500/10 border border-blue-500/20 rounded text-xs text-blue-200">
                                    ✅ Will continue to see current Regular Season games
                                  </div>
                                )
                              }
                              return null
                            })()}
                          </div>
                          <div className="border-t border-white/20 pt-2">
                            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded p-2 cursor-pointer hover:bg-yellow-500/20 transition-colors" 
                                 onClick={() => setEditUser({...editUser, is_admin: !editUser.is_admin})}>
                              <div className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={editUser.is_admin}
                                  onChange={(e) => {
                                    console.log('Admin checkbox changed:', e.target.checked)
                                    setEditUser({...editUser, is_admin: e.target.checked})
                                  }}
                                  className="mr-2 cursor-pointer"
                                />
                                <label className="text-xs text-yellow-200 font-medium cursor-pointer">
                                  {editUser.is_admin ? '⭐ Remove Admin Access' : '⭐ Grant Admin Access'}
                                </label>
                              </div>
                              <div className="text-xs text-yellow-100 mt-1">
                                {editUser.is_admin ? 'Click to remove admin privileges' : 'Click to grant full system access'}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            user.user_type === 'tester'
                              ? 'bg-purple-500/20 text-purple-200'
                              : user.user_type === 'active'
                              ? 'bg-green-500/20 text-green-200'
                              : user.user_type === 'pending'
                              ? 'bg-orange-500/20 text-orange-200'
                              : user.user_type === 'registered'
                              ? 'bg-yellow-500/20 text-yellow-200'
                              : 'bg-red-500/20 text-red-200'
                          }`}>
                            {user.user_type === 'tester' ? 'Tester' : user.user_type === 'active' ? 'Active' : user.user_type === 'pending' ? 'Pending' : user.user_type === 'registered' ? 'Registered' : 'Eliminated'}
                          </span>
                          <div className="text-xs text-blue-200 mt-1">
                            {user.user_type === 'tester' ? '$0 picks' : user.user_type === 'active' ? 'Normal price' : user.user_type === 'pending' ? 'Purchased, no selections' : user.user_type === 'registered' ? 'No picks yet' : 'No picks'}
                          </div>
                        </>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingUser === user.id ? (
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleUpdateUser(user.id)}
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg transition-colors flex items-center space-x-1"
                            title="Save changes"
                          >
                            <Check className="w-4 h-4" />
                            <span className="text-sm font-medium">Save</span>
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg transition-colors flex items-center space-x-1"
                            title="Cancel edit"
                          >
                            <X className="w-4 h-4" />
                            <span className="text-sm font-medium">Cancel</span>
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => startEditUser(user)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg transition-colors flex items-center space-x-1"
                            title="Edit user"
                          >
                            <Edit className="w-4 h-4" />
                            <span className="text-sm font-medium">Edit</span>
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg transition-colors flex items-center space-x-1"
                            title="Delete user"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span className="text-sm font-medium">Delete</span>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
} 