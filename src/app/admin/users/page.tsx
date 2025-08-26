'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Users, Mail, Calendar, Plus, Edit, Trash2, X, Check, Eye, Clock, Trophy, AlertTriangle, Download, Filter } from 'lucide-react'
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
  currentWeekPicks: Array<{
    pick_name: string
    status: string
    picks_count: number
    team_matchup_id: string
  }>
}

interface UserPick {
  id: string
  pick_name: string
  picks_count: number
  status: string
  team_picked: string
  opponent: string
  is_home: boolean
  game_time: string | null
  game_status: string | null
  away_score: number | null
  home_score: number | null
  has_team_selected: boolean
}

interface UserDetails {
  user: User
  currentWeek: number
  picks: UserPick[]
  purchases: Array<{
    created_at: string
    picks_count: number
    amount_paid: number
    status: string
  }>
  stats: {
    totalPurchased: number
    activePicks: number
    eliminatedPicks: number
    isEliminated: boolean
  }
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

// Export to CSV function
const exportToCSV = (users: User[], filterName: string) => {
  const headers = [
    'ID',
    'Email',
    'Username',
    'First Name',
    'Last Name',
    'Phone',
    'User Type',
    'Is Admin',
    'Total Purchased',
    'Active Picks',
    'Eliminated Picks',
    'Is Eliminated',
    'Created At'
  ]

  const csvContent = [
    headers.join(','),
    ...users.map(user => [
      user.id,
      `"${user.email}"`,
      `"${user.username || ''}"`,
      `"${user.first_name || ''}"`,
      `"${user.last_name || ''}"`,
      `"${formatPhoneNumber(user.phone)}"`,
      user.user_type,
      user.is_admin ? 'Yes' : 'No',
      user.totalPurchased,
      user.activePicks,
      user.eliminatedPicks,
      user.isEliminated ? 'Yes' : 'No',
      new Date(user.created_at).toLocaleDateString()
    ].join(','))
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `users_${filterName}_${new Date().toISOString().split('T')[0]}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [authLoading, setAuthLoading] = useState(true)
  const [showAddUser, setShowAddUser] = useState(false)
  const [editingUser, setEditingUser] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<UserDetails | null>(null)
  const [modalEditMode, setModalEditMode] = useState(false)
  const [modalEditData, setModalEditData] = useState({
    email: '',
    username: '',
    first_name: '',
    last_name: '',
    phone: '',
    is_admin: false,
    user_type: 'registered' as 'registered' | 'active' | 'tester' | 'eliminated' | 'pending'
  })

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
  const [picksToReduce, setPicksToReduce] = useState(0)
  const [modalPicksToAdd, setModalPicksToAdd] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  
  // Enhanced filter states
  const [filters, setFilters] = useState({
    userType: 'all' as 'all' | 'registered' | 'active' | 'tester' | 'eliminated' | 'pending',
    purchaseStatus: 'all' as 'all' | 'no_purchases' | 'has_purchases' | 'has_picks_left',
    adminStatus: 'all' as 'all' | 'admin' | 'non_admin',
    eliminationStatus: 'all' as 'all' | 'eliminated' | 'active'
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

    // Purchase status filter
    if (filters.purchaseStatus !== 'all') {
      switch (filters.purchaseStatus) {
        case 'no_purchases':
          if (user.totalPurchased > 0) return false
          break
        case 'has_purchases':
          if (user.totalPurchased === 0) return false
          break
        case 'has_picks_left':
          if (user.activePicks === 0) return false
          break
      }
    }

    // Admin status filter
    if (filters.adminStatus !== 'all') {
      if (filters.adminStatus === 'admin' && !user.is_admin) return false
      if (filters.adminStatus === 'non_admin' && user.is_admin) return false
    }

    // Elimination status filter
    if (filters.eliminationStatus !== 'all') {
      if (filters.eliminationStatus === 'eliminated' && !user.isEliminated) return false
      if (filters.eliminationStatus === 'active' && user.isEliminated) return false
    }

    return true
  })

  // Get filter description for export
  const getFilterDescription = () => {
    const descriptions = []
    
    if (filters.userType !== 'all') {
      descriptions.push(`User Type: ${filters.userType}`)
    }
    if (filters.purchaseStatus !== 'all') {
      const purchaseLabels = {
        'no_purchases': 'No Purchases',
        'has_purchases': 'Has Purchases',
        'has_picks_left': 'Has Picks Left'
      }
      descriptions.push(`Purchase Status: ${purchaseLabels[filters.purchaseStatus]}`)
    }
    if (filters.adminStatus !== 'all') {
      descriptions.push(`Admin Status: ${filters.adminStatus === 'admin' ? 'Admin Only' : 'Non-Admin Only'}`)
    }
    if (filters.eliminationStatus !== 'all') {
      descriptions.push(`Elimination Status: ${filters.eliminationStatus === 'eliminated' ? 'Eliminated' : 'Active'}`)
    }
    
    return descriptions.length > 0 ? descriptions.join('_') : 'all_users'
  }

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('')
    setFilters({
      userType: 'all',
      purchaseStatus: 'all',
      adminStatus: 'all',
      eliminationStatus: 'all'
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

  const handleReducePicks = async (userId: string) => {
    try {
      setError('')
      
      if (picksToReduce <= 0) {
        setError('Please enter a valid number of picks to reduce')
        return
      }

      if (!confirm(`Are you sure you want to reduce ${picksToReduce} picks for this user? This action cannot be undone.`)) {
        return
      }

      const response = await fetch('/api/admin/reduce-picks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          userId, 
          picksCount: picksToReduce 
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to reduce picks')
      }

      setSuccess(`${picksToReduce} picks reduced successfully`)
      setPicksToReduce(0)
      loadUsers()
    } catch (error) {
      console.error('Error reducing picks:', error)
      setError(`Failed to reduce picks: ${error instanceof Error ? error.message : 'Unknown error'}`)
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
    setPicksToReduce(0)
  }

  const cancelEdit = () => {
    setEditingUser(null)
    setPicksToAdd(0)
    setPicksToReduce(0)
  }

  const handleViewUserDetails = async (userId: string) => {
    try {
      setError('')
      
      const response = await fetch(`/api/admin/user-details?userId=${userId}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch user details')
      }

      const userDetails = await response.json()
      setSelectedUser(userDetails)
      
      // Set up modal edit data
      setModalEditData({
        email: userDetails.user.email,
        username: userDetails.user.username || '',
        first_name: userDetails.user.first_name || '',
        last_name: userDetails.user.last_name || '',
        phone: userDetails.user.phone || '',
        is_admin: userDetails.user.is_admin,
        user_type: userDetails.user.user_type
      })
      setModalEditMode(false)
      
      // Reset picks management state
      setModalPicksToAdd(0)
    } catch (error) {
      console.error('Error loading user details:', error)
      setError(`Failed to load user details: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const closeUserDetails = () => {
    setSelectedUser(null)
    setModalEditMode(false)
  }

  const handleModalUpdateUser = async () => {
    if (!selectedUser) return
    
    try {
      setError('')
      
      const updateData = {
        email: modalEditData.email,
        username: modalEditData.username || null,
        first_name: modalEditData.first_name || null,
        last_name: modalEditData.last_name || null,
        phone: modalEditData.phone || null,
        is_admin: modalEditData.is_admin,
        user_type: modalEditData.user_type
      }
      
      const response = await fetch('/api/admin/update-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: selectedUser.user.id, updateData })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update user')
      }

      setSuccess('User updated successfully')
      setModalEditMode(false)
      
      // Refresh the user details
      await handleViewUserDetails(selectedUser.user.id)
      loadUsers()
    } catch (error) {
      console.error('Error updating user:', error)
      setError(`Failed to update user: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleModalAddPicks = async () => {
    if (!selectedUser) return
    
    try {
      setError('')
      
      if (modalPicksToAdd <= 0) {
        setError('Please enter a valid number of picks')
        return
      }

      const response = await fetch('/api/admin/add-picks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          userId: selectedUser.user.id, 
          picksCount: modalPicksToAdd 
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to add picks')
      }

      setSuccess(`${modalPicksToAdd} picks added successfully`)
      setModalPicksToAdd(0)
      
      // Refresh the user details
      await handleViewUserDetails(selectedUser.user.id)
      loadUsers()
    } catch (error) {
      console.error('Error adding picks:', error)
      setError(`Failed to add picks: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
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
                    <option value="registered">Registered</option>
                    <option value="active">Active</option>
                    <option value="tester">Tester</option>
                    <option value="eliminated">Eliminated</option>
                  </select>
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

          {/* Quick Filters */}
          <div className="px-6 py-3 border-b border-white/20 bg-white/5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-blue-200" />
                <h3 className="text-sm font-medium text-blue-200">Quick Filters</h3>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => exportToCSV(filteredUsers, getFilterDescription())}
                  className="flex items-center px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                  title="Export filtered users to CSV"
                >
                  <Download className="w-4 h-4 mr-1" />
                  Export CSV
                </button>
                <button
                  onClick={clearFilters}
                  className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                >
                  Clear All Filters
                </button>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilters({
                  userType: 'all',
                  purchaseStatus: 'no_purchases',
                  adminStatus: 'all',
                  eliminationStatus: 'all'
                })}
                className={`px-3 py-1 text-xs rounded transition-colors ${
                  filters.purchaseStatus === 'no_purchases' && filters.userType === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white/10 text-blue-200 hover:bg-white/20'
                }`}
              >
                No Purchases ({users.filter(u => u.totalPurchased === 0).length})
              </button>
              
              <button
                onClick={() => setFilters({
                  userType: 'all',
                  purchaseStatus: 'has_picks_left',
                  adminStatus: 'all',
                  eliminationStatus: 'all'
                })}
                className={`px-3 py-1 text-xs rounded transition-colors ${
                  filters.purchaseStatus === 'has_picks_left' && filters.userType === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white/10 text-blue-200 hover:bg-white/20'
                }`}
              >
                Has Picks Left ({users.filter(u => u.activePicks > 0).length})
              </button>
              
              <button
                onClick={() => setFilters({
                  userType: 'all',
                  purchaseStatus: 'all',
                  adminStatus: 'all',
                  eliminationStatus: 'eliminated'
                })}
                className={`px-3 py-1 text-xs rounded transition-colors ${
                  filters.eliminationStatus === 'eliminated' && filters.purchaseStatus === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white/10 text-blue-200 hover:bg-white/20'
                }`}
              >
                Eliminated ({users.filter(u => u.isEliminated).length})
              </button>
              
              <button
                onClick={() => setFilters({
                  userType: 'all',
                  purchaseStatus: 'all',
                  adminStatus: 'admin',
                  eliminationStatus: 'all'
                })}
                className={`px-3 py-1 text-xs rounded transition-colors ${
                  filters.adminStatus === 'admin' && filters.purchaseStatus === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white/10 text-blue-200 hover:bg-white/20'
                }`}
              >
                Admin Users ({users.filter(u => u.is_admin).length})
              </button>
              
              <button
                onClick={() => setFilters({
                  userType: 'registered',
                  purchaseStatus: 'all',
                  adminStatus: 'all',
                  eliminationStatus: 'all'
                })}
                className={`px-3 py-1 text-xs rounded transition-colors ${
                  filters.userType === 'registered' && filters.purchaseStatus === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white/10 text-blue-200 hover:bg-white/20'
                }`}
              >
                Registered Only ({users.filter(u => u.user_type === 'registered').length})
              </button>
            </div>
          </div>

          {/* Advanced Filters */}
          <div className="px-6 py-4 border-b border-white/20 bg-white/5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-blue-200" />
                <h3 className="text-sm font-medium text-blue-200">Advanced Filters</h3>
              </div>
            </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* User Type Filter */}
            <div>
              <label className="block text-xs font-medium text-blue-200 mb-1">User Type</label>
              <select
                value={filters.userType}
                onChange={(e) => setFilters({...filters, userType: e.target.value as 'all' | 'registered' | 'active' | 'tester' | 'eliminated' | 'pending'})}
                className="w-full px-3 py-1 text-sm border border-white/30 rounded bg-white/10 text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">All Types</option>
                <option value="registered">Registered</option>
                <option value="pending">Pending</option>
                <option value="active">Active</option>
                <option value="eliminated">Eliminated</option>
                <option value="tester">Tester</option>
              </select>
            </div>

            {/* Purchase Status Filter */}
            <div>
              <label className="block text-xs font-medium text-blue-200 mb-1">Purchase Status</label>
              <select
                value={filters.purchaseStatus}
                onChange={(e) => setFilters({...filters, purchaseStatus: e.target.value as 'all' | 'no_purchases' | 'has_purchases' | 'has_picks_left'})}
                className="w-full px-3 py-1 text-sm border border-white/30 rounded bg-white/10 text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">All Purchase Status</option>
                <option value="no_purchases">No Purchases</option>
                <option value="has_purchases">Has Purchases</option>
                <option value="has_picks_left">Has Picks Left</option>
              </select>
            </div>

            {/* Admin Status Filter */}
            <div>
              <label className="block text-xs font-medium text-blue-200 mb-1">Admin Status</label>
              <select
                value={filters.adminStatus}
                onChange={(e) => setFilters({...filters, adminStatus: e.target.value as 'all' | 'admin' | 'non_admin'})}
                className="w-full px-3 py-1 text-sm border border-white/30 rounded bg-white/10 text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">All Users</option>
                <option value="admin">Admin Only</option>
                <option value="non_admin">Non-Admin Only</option>
              </select>
            </div>

            {/* Elimination Status Filter */}
            <div>
              <label className="block text-xs font-medium text-blue-200 mb-1">Elimination Status</label>
              <select
                value={filters.eliminationStatus}
                onChange={(e) => setFilters({...filters, eliminationStatus: e.target.value as 'all' | 'eliminated' | 'active'})}
                className="w-full px-3 py-1 text-sm border border-white/30 rounded bg-white/10 text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="eliminated">Eliminated</option>
              </select>
            </div>
          </div>

          {/* Filter Summary */}
          <div className="mt-3 text-xs text-blue-200">
            Showing {filteredUsers.length} of {users.length} users
            {filters.userType !== 'all' && <span className="ml-2">• Type: {filters.userType}</span>}
            {filters.purchaseStatus !== 'all' && (
              <span className="ml-2">• Purchase: {
                filters.purchaseStatus === 'no_purchases' ? 'No Purchases' :
                filters.purchaseStatus === 'has_purchases' ? 'Has Purchases' :
                'Has Picks Left'
              }</span>
            )}
            {filters.adminStatus !== 'all' && (
              <span className="ml-2">• Admin: {filters.adminStatus === 'admin' ? 'Admin Only' : 'Non-Admin Only'}</span>
            )}
            {filters.eliminationStatus !== 'all' && (
              <span className="ml-2">• Status: {filters.eliminationStatus === 'eliminated' ? 'Eliminated' : 'Active'}</span>
            )}
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
                    Admin
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
                            </div>
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="pl-2 pr-6 py-4 whitespace-nowrap">
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
                      <div className="text-xs text-blue-200 space-y-1">
                        <div>{user.activePicks} active</div>
                        <div>{user.totalPurchased} total</div>
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
                          
                          <div className="border-t border-white/20 pt-2">
                            <div>
                              <label className="block text-xs font-medium text-red-200 mb-1">Reduce Picks</label>
                              <input
                                type="number"
                                min="1"
                                value={picksToReduce}
                                onChange={(e) => setPicksToReduce(parseInt(e.target.value) || 0)}
                                className="w-full px-2 py-1 text-sm border border-white/30 rounded focus:outline-none focus:ring-1 focus:ring-red-500 bg-white/10 text-white"
                                placeholder="0"
                              />
                            </div>
                            <button
                              onClick={() => handleReducePicks(user.id)}
                              disabled={picksToReduce <= 0}
                              className="w-full px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed mt-1"
                            >
                              Reduce {picksToReduce} Picks
                            </button>
                          </div>
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
                        <div>
                          <label className="block text-xs font-medium text-blue-200 mb-1">User Type</label>
                          <select
                            value={editUser.user_type}
                            onChange={(e) => setEditUser({...editUser, user_type: e.target.value as 'registered' | 'active' | 'tester' | 'eliminated' | 'pending'})}
                            className="w-full px-2 py-1 text-sm border border-white/30 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white/10 text-white"
                          >
                            <option value="registered">Registered</option>
                            <option value="pending">Pending</option>
                            <option value="active">Active</option>
                            <option value="tester">Tester</option>
                            <option value="eliminated">Eliminated</option>
                          </select>
                        </div>
                      ) : (
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
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingUser === user.id ? (
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
                        </div>
                      ) : (
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          user.is_admin
                            ? 'bg-yellow-500/20 text-yellow-200'
                            : 'bg-gray-500/20 text-gray-200'
                        }`}>
                          {user.is_admin ? '⭐ Admin' : 'User'}
                        </span>
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
                            className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded-lg transition-colors flex items-center space-x-1"
                            title="Cancel edit"
                          >
                            <X className="w-4 h-4" />
                            <span className="text-sm font-medium">Cancel</span>
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
                      ) : (
                        <button
                          onClick={() => handleViewUserDetails(user.id)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg transition-colors flex items-center space-x-1"
                          title="View/Edit user"
                        >
                          <Edit className="w-4 h-4" />
                          <span className="text-sm font-medium">View/Edit</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* User Details Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-semibold text-white">
                  {modalEditMode ? 'Edit User' : 'User Details'}: {selectedUser.user.username || selectedUser.user.email}
                </h3>
                <p className="text-blue-200">
                  {modalEditMode ? 'Modify user information' : `Week ${selectedUser.currentWeek} Picks & Information`}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                {modalEditMode ? (
                  <>
                    <button
                      onClick={handleModalUpdateUser}
                      className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg transition-colors flex items-center space-x-1"
                    >
                      <Check className="w-4 h-4" />
                      <span>Save</span>
                    </button>
                    <button
                      onClick={() => setModalEditMode(false)}
                      className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded-lg transition-colors flex items-center space-x-1"
                    >
                      <X className="w-4 h-4" />
                      <span>Cancel</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setModalEditMode(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg transition-colors flex items-center space-x-1"
                  >
                    <Edit className="w-4 h-4" />
                    <span>Edit</span>
                  </button>
                )}
                <button
                  onClick={closeUserDetails}
                  className="text-blue-200 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* User Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-white/5 rounded-lg p-4">
                <h4 className="text-lg font-medium text-white mb-3">User Information</h4>
                {modalEditMode ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-blue-200 mb-1">Email</label>
                      <input
                        type="email"
                        value={modalEditData.email}
                        onChange={(e) => setModalEditData({...modalEditData, email: e.target.value})}
                        className="w-full px-3 py-2 border border-white/30 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/10 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-blue-200 mb-1">Username</label>
                      <input
                        type="text"
                        value={modalEditData.username}
                        onChange={(e) => setModalEditData({...modalEditData, username: e.target.value})}
                        className="w-full px-3 py-2 border border-white/30 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/10 text-white"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-blue-200 mb-1">First Name</label>
                        <input
                          type="text"
                          value={modalEditData.first_name}
                          onChange={(e) => setModalEditData({...modalEditData, first_name: e.target.value})}
                          className="w-full px-3 py-2 border border-white/30 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/10 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-blue-200 mb-1">Last Name</label>
                        <input
                          type="text"
                          value={modalEditData.last_name}
                          onChange={(e) => setModalEditData({...modalEditData, last_name: e.target.value})}
                          className="w-full px-3 py-2 border border-white/30 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/10 text-white"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-blue-200 mb-1">Phone</label>
                      <input
                        type="tel"
                        value={modalEditData.phone}
                        onChange={(e) => setModalEditData({...modalEditData, phone: e.target.value})}
                        className="w-full px-3 py-2 border border-white/30 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/10 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-blue-200 mb-1">User Type</label>
                      <select
                        value={modalEditData.user_type}
                        onChange={(e) => setModalEditData({...modalEditData, user_type: e.target.value as 'registered' | 'active' | 'tester' | 'eliminated' | 'pending'})}
                        className="w-full px-3 py-2 border border-white/30 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/10 text-white"
                      >
                        <option value="registered">Registered</option>
                        <option value="pending">Pending</option>
                        <option value="active">Active</option>
                        <option value="tester">Tester</option>
                        <option value="eliminated">Eliminated</option>
                      </select>
                    </div>
                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded p-3 cursor-pointer hover:bg-yellow-500/20 transition-colors" 
                         onClick={() => setModalEditData({...modalEditData, is_admin: !modalEditData.is_admin})}>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={modalEditData.is_admin}
                          onChange={(e) => setModalEditData({...modalEditData, is_admin: e.target.checked})}
                          className="mr-2 cursor-pointer"
                        />
                        <label className="text-sm text-yellow-200 font-medium cursor-pointer">
                          {modalEditData.is_admin ? '⭐ Remove Admin Access' : '⭐ Grant Admin Access'}
                        </label>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 text-sm">
                    <div><span className="text-blue-200">User ID:</span> <span className="text-white font-mono">{selectedUser.user.id}</span></div>
                    <div><span className="text-blue-200">Name:</span> <span className="text-white">{selectedUser.user.first_name} {selectedUser.user.last_name}</span></div>
                    <div><span className="text-blue-200">Email:</span> <span className="text-white">{selectedUser.user.email}</span></div>
                    <div><span className="text-blue-200">Username:</span> <span className="text-white">{selectedUser.user.username || 'Not set'}</span></div>
                    <div><span className="text-blue-200">Phone:</span> <span className="text-white">{formatPhoneNumber(selectedUser.user.phone)}</span></div>
                    <div><span className="text-blue-200">User Type:</span> 
                      <span className={`ml-2 px-2 py-1 text-xs rounded ${
                        selectedUser.user.user_type === 'tester' ? 'bg-purple-500/20 text-purple-200' :
                        selectedUser.user.user_type === 'active' ? 'bg-green-500/20 text-green-200' :
                        selectedUser.user.user_type === 'pending' ? 'bg-orange-500/20 text-orange-200' :
                        selectedUser.user.user_type === 'registered' ? 'bg-yellow-500/20 text-yellow-200' :
                        'bg-red-500/20 text-red-200'
                      }`}>
                        {selectedUser.user.user_type}
                      </span>
                    </div>
                    {selectedUser.user.is_admin && (
                      <div><span className="text-yellow-200">⭐ Admin User</span></div>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-white/5 rounded-lg p-4">
                <h4 className="text-lg font-medium text-white mb-3">Pick Statistics</h4>
                <div className="space-y-2 text-sm mb-4">
                  <div className="flex items-center">
                    <Trophy className="w-4 h-4 text-green-300 mr-2" />
                    <span className="text-blue-200">Active Picks:</span> 
                    <span className="ml-2 text-green-300 font-medium">{selectedUser.stats.activePicks}</span>
                  </div>
                  <div className="flex items-center">
                    <AlertTriangle className="w-4 h-4 text-red-300 mr-2" />
                    <span className="text-blue-200">Eliminated Picks:</span> 
                    <span className="ml-2 text-red-300 font-medium">{selectedUser.stats.eliminatedPicks}</span>
                  </div>
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 text-blue-300 mr-2" />
                    <span className="text-blue-200">Total Purchased:</span> 
                    <span className="ml-2 text-blue-300 font-medium">{selectedUser.stats.totalPurchased}</span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 text-purple-300 mr-2" />
                    <span className="text-blue-200">Current Week:</span> 
                    <span className="ml-2 text-purple-300 font-medium">{selectedUser.currentWeek}</span>
                  </div>
                </div>

                {/* Picks Management Section */}
                <div className="border-t border-white/20 pt-4">
                  <h5 className="text-md font-medium text-white mb-3">Manage Picks</h5>
                  
                  {/* Add Picks */}
                  <div>
                    <label className="block text-sm font-medium text-green-200 mb-2">Add Picks</label>
                    <div className="flex space-x-2">
                      <input
                        type="number"
                        min="1"
                        value={modalPicksToAdd}
                        onChange={(e) => setModalPicksToAdd(parseInt(e.target.value) || 0)}
                        className="flex-1 px-3 py-2 text-sm border border-white/30 rounded focus:outline-none focus:ring-2 focus:ring-green-500 bg-white/10 text-white"
                        placeholder="Number of picks"
                      />
                      <button
                        onClick={handleModalAddPicks}
                        disabled={modalPicksToAdd <= 0}
                        className="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Current Week Picks */}
            <div className="bg-white/5 rounded-lg p-4 mb-6">
              <h4 className="text-lg font-medium text-white mb-4">Week {selectedUser.currentWeek} Picks</h4>
              {selectedUser.picks.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-blue-200">No picks made for this week yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-white/20">
                    <thead className="bg-white/5">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-blue-200 uppercase">Pick Name</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-blue-200 uppercase">Chosen Team</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-blue-200 uppercase">Picks Count</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-blue-200 uppercase">Status</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-blue-200 uppercase">Game Info</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/20">
                      {selectedUser.picks.map((pick) => (
                        <tr key={pick.id} className={`${
                          pick.status === 'eliminated' ? 'bg-red-500/5' :
                          pick.status === 'active' ? 'bg-green-500/5' :
                          'bg-blue-500/5'
                        }`}>
                          <td className="px-4 py-3 text-sm font-medium text-white">
                            {pick.pick_name}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div className="flex items-center space-x-2">
                              <span className={`font-medium ${
                                pick.team_picked === 'Pending' ? 'text-yellow-300' : 'text-white'
                              }`}>
                                {pick.team_picked}
                              </span>
                              {pick.team_picked !== 'Pending' && pick.is_home && (
                                <span className="text-xs text-blue-200">(Home)</span>
                              )}
                            </div>
                            {pick.team_picked !== 'Pending' && (
                              <div className="text-xs text-gray-400">
                                vs {pick.opponent}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-white">
                            {pick.picks_count}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-2 py-1 text-xs rounded ${
                              pick.status === 'eliminated' ? 'bg-red-500/20 text-red-200' :
                              pick.status === 'active' ? 'bg-green-500/20 text-green-200' :
                              'bg-blue-500/20 text-blue-200'
                            }`}>
                              {pick.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {pick.team_picked === 'Pending' ? (
                              <span className="text-yellow-300 text-xs">No team selected</span>
                            ) : (
                              <div className="space-y-1 text-xs">
                                {pick.game_status && (
                                  <div>
                                    <span className="text-blue-200">Status:</span> 
                                    <span className={`ml-1 ${
                                      pick.game_status === 'final' ? 'text-red-200' :
                                      pick.game_status === 'live' ? 'text-green-200' :
                                      'text-yellow-200'
                                    }`}>
                                      {pick.game_status}
                                    </span>
                                  </div>
                                )}
                                {pick.away_score !== null && pick.home_score !== null && (
                                  <div>
                                    <span className="text-blue-200">Score:</span> 
                                    <span className="ml-1 text-white">
                                      {pick.away_score} - {pick.home_score}
                                    </span>
                                  </div>
                                )}
                                {pick.game_time && (
                                  <div>
                                    <span className="text-blue-200">Time:</span> 
                                    <span className="ml-1 text-white">
                                      {new Date(pick.game_time).toLocaleString()}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Purchase History */}
            {selectedUser.purchases.length > 0 && (
              <div className="bg-white/5 rounded-lg p-4">
                <h4 className="text-lg font-medium text-white mb-4">Purchase History</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-white/20">
                    <thead className="bg-white/5">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-blue-200 uppercase">Date</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-blue-200 uppercase">Picks</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-blue-200 uppercase">Amount</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-blue-200 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/20">
                      {selectedUser.purchases.map((purchase, index) => (
                        <tr key={index}>
                          <td className="px-4 py-2 text-sm text-white">
                            {new Date(purchase.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-2 text-sm text-white">{purchase.picks_count}</td>
                          <td className="px-4 py-2 text-sm text-white">
                            ${purchase.amount_paid ? (purchase.amount_paid / 100).toFixed(2) : '0.00'}
                          </td>
                          <td className="px-4 py-2 text-sm">
                            <span className={`px-2 py-1 text-xs rounded ${
                              purchase.status === 'completed' ? 'bg-green-500/20 text-green-200' :
                              purchase.status === 'pending' ? 'bg-yellow-500/20 text-yellow-200' :
                              'bg-red-500/20 text-red-200'
                            }`}>
                              {purchase.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
} 