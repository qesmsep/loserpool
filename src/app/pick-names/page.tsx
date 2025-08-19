'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Header from '@/components/header'
import { Edit, Save, X, Tag, Plus } from 'lucide-react'

interface Pick {
  id: string
  user_id: string
  picks_count: number
  status: 'pending' | 'active' | 'lost' | 'safe'
  pick_name: string | null
  created_at: string
  updated_at: string
  // Week-specific team_matchup_id columns
  pre1_team_matchup_id?: string
  pre2_team_matchup_id?: string
  pre3_team_matchup_id?: string
  reg1_team_matchup_id?: string
  reg2_team_matchup_id?: string
  reg3_team_matchup_id?: string
  reg4_team_matchup_id?: string
  reg5_team_matchup_id?: string
  reg6_team_matchup_id?: string
  reg7_team_matchup_id?: string
  reg8_team_matchup_id?: string
  reg9_team_matchup_id?: string
  reg10_team_matchup_id?: string
  reg11_team_matchup_id?: string
  reg12_team_matchup_id?: string
  reg13_team_matchup_id?: string
  reg14_team_matchup_id?: string
  reg15_team_matchup_id?: string
  reg16_team_matchup_id?: string
  reg17_team_matchup_id?: string
  reg18_team_matchup_id?: string
  post1_team_matchup_id?: string
  post2_team_matchup_id?: string
  post3_team_matchup_id?: string
  post4_team_matchup_id?: string
}

export default function PickNamesPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [picks, setPicks] = useState<Pick[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newName, setNewName] = useState('')
  const router = useRouter()

  // Helper function to get team info from the new schema
  const getTeamInfo = (pick: Pick) => {
    const weekColumns = [
      'pre1_team_matchup_id', 'pre2_team_matchup_id', 'pre3_team_matchup_id',
      'reg1_team_matchup_id', 'reg2_team_matchup_id', 'reg3_team_matchup_id', 'reg4_team_matchup_id',
      'reg5_team_matchup_id', 'reg6_team_matchup_id', 'reg7_team_matchup_id', 'reg8_team_matchup_id',
      'reg9_team_matchup_id', 'reg10_team_matchup_id', 'reg11_team_matchup_id', 'reg12_team_matchup_id',
      'reg13_team_matchup_id', 'reg14_team_matchup_id', 'reg15_team_matchup_id', 'reg16_team_matchup_id',
      'reg17_team_matchup_id', 'reg18_team_matchup_id',
      'post1_team_matchup_id', 'post2_team_matchup_id', 'post3_team_matchup_id', 'post4_team_matchup_id'
    ]
    
    for (const column of weekColumns) {
      const value = pick[column as keyof Pick]
      if (value && typeof value === 'string') {
        // Parse the team_matchup_id format: "matchupId_teamName"
        const parts = value.split('_')
        if (parts.length >= 2) {
          const teamName = parts.slice(1).join('_') // In case team name has underscores
          return { teamName, weekColumn: column }
        }
      }
    }
    return null
  }

  const checkAuth = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      loadPicks()
    } catch (error) {
      console.error('Auth error:', error)
      setError('Authentication failed')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  const loadPicks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      console.log('Loading picks for user:', user.id)
      
      // First try a simple query to check if the table exists and has data
      const { data: simplePicks, error: simpleError } = await supabase
        .from('picks')
        .select('id, user_id, pick_name, status')
        .eq('user_id', user.id)
        .limit(5)
      
      console.log('Simple picks query:', { simplePicks, simpleError })
      
      if (simpleError) {
        console.error('Simple query error:', simpleError)
        throw simpleError
      }
      
      // Now try the full query - updated for new schema
      const { data: picksData, error } = await supabase
        .from('picks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })

      console.log('Picks query result:', { picksData, error })
      
      if (error) {
        console.error('Database error:', error)
        throw error
      }
      
      setPicks(picksData || [])
    } catch (error) {
      console.error('Error loading picks:', error)
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        error: JSON.stringify(error, null, 2)
      })
      setError('Failed to load picks')
    }
  }

  const startEditing = (pick: Pick) => {
    if (pick.status !== 'pending') return // Don't allow editing used picks
    setEditingId(pick.id)
    setEditingName(pick.pick_name || '')
  }

  const saveEdit = async () => {
    if (!editingName.trim()) {
      setError('Pick name is required')
      return
    }

    setError('')
    try {
      const { error } = await supabase
        .from('picks')
        .update({ pick_name: editingName.trim() })
        .eq('id', editingId!)

      if (error) throw error

      setEditingId(null)
      setEditingName('')
      setSuccess('Pick name updated successfully')
      loadPicks()
      setTimeout(() => setSuccess(''), 3000)
    } catch (error) {
      console.error('Error updating pick name:', error)
      setError('Failed to update pick name')
    }
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditingName('')
    setError('')
  }

  const createPickName = async () => {
    if (!newName.trim()) {
      setError('Pick name is required')
      return
    }

    setError('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Create a new pick record with the custom name
      const { error } = await supabase
        .from('picks')
        .insert({
          user_id: user.id,
          picks_count: 1,
          status: 'pending',
          pick_name: newName.trim()
        })

      if (error) throw error

      setNewName('')
      setShowCreateForm(false)
      setSuccess('Pick name created successfully')
      loadPicks()
      setTimeout(() => setSuccess(''), 3000)
    } catch (error) {
      console.error('Error creating pick name:', error)
      setError('Failed to create pick name')
    }
  }

  const deletePick = async (id: string) => {
    if (!confirm('Are you sure you want to delete this pick?')) return

    setError('')
    try {
      const { error } = await supabase
        .from('picks')
        .delete()
        .eq('id', id)

      if (error) throw error

      setSuccess('Pick deleted successfully')
      loadPicks()
      setTimeout(() => setSuccess(''), 3000)
    } catch (error) {
      console.error('Error deleting pick:', error)
      setError('Failed to delete pick')
    }
  }

  if (loading) {
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
      <Header 
        title="My Picks"
        subtitle="Manage your individual picks"
        showBackButton={true}
        backHref="/dashboard"
        backText="Back to Dashboard"
      />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Introduction */}
        <div className="mb-6 bg-blue-500/20 border border-blue-500/30 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-2">About Pick Names</h3>
          <div className="text-blue-200 space-y-1">
            <p>• Each pick has a default name like "Pick 1", "Pick 2", etc.</p>
            <p>• You can rename your picks to anything you want (e.g., "Chad1", "Finance 1")</p>
            <p>• You can only edit names for picks that haven't been used yet</p>
            <p>• Used picks are locked and cannot be changed</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/30 text-red-200 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-500/20 border border-green-500/30 text-green-200 px-4 py-3 rounded-lg mb-6">
            {success}
          </div>
        )}

        {/* Create New Pick */}
        <div className="mb-6 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">My Picks</h3>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add New Pick
            </button>
          </div>

          {showCreateForm && (
            <div className="bg-white/5 border border-white/20 rounded-lg p-4 mb-4">
              <h4 className="text-white font-medium mb-3">Create New Pick</h4>
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <label className="block text-sm text-blue-200 mb-1">Pick Name</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g., Chad1, Finance 1"
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:border-blue-400"
                  />
                </div>
                <div className="flex items-end space-x-2">
                  <button
                    onClick={createPickName}
                    className="flex items-center bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Create
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateForm(false)
                      setNewName('')
                      setError('')
                    }}
                    className="flex items-center bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Picks Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/20">
                  <th className="text-left py-3 px-4 text-blue-200 font-medium">Pick Name</th>
                  <th className="text-left py-3 px-4 text-blue-200 font-medium">Status</th>
                  <th className="text-left py-3 px-4 text-blue-200 font-medium">Usage</th>
                  <th className="text-left py-3 px-4 text-blue-200 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {picks.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-blue-200">
                      <Tag className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No picks found</p>
                      <p className="text-sm opacity-75">Purchase picks or create new ones to get started</p>
                    </td>
                  </tr>
                ) : (
                  picks.map((pick) => (
                    <tr key={pick.id} className="border-b border-white/10 hover:bg-white/5">
                      <td className="py-3 px-4">
                        {editingId === pick.id ? (
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            className="w-full bg-white/10 border border-white/20 rounded px-2 py-1 text-white focus:outline-none focus:border-blue-400"
                          />
                        ) : (
                          <div className="flex items-center">
                            <Tag className="w-4 h-4 text-purple-300 mr-2" />
                            <span className="font-medium text-white">{pick.pick_name || 'Unnamed Pick'}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          pick.status === 'pending' 
                            ? 'bg-green-500/20 text-green-200'
                            : pick.status === 'active'
                            ? 'bg-blue-500/20 text-blue-200'
                            : pick.status === 'lost'
                            ? 'bg-red-500/20 text-red-200'
                            : pick.status === 'safe'
                            ? 'bg-purple-500/20 text-purple-200'
                            : 'bg-gray-500/20 text-gray-200'
                        }`}>
                          {pick.status.charAt(0).toUpperCase() + pick.status.slice(1)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {pick.status === 'pending' ? (
                          <span className="text-sm text-gray-400">Not used yet</span>
                        ) : (
                          (() => {
                            const teamInfo = getTeamInfo(pick)
                            if (teamInfo) {
                              const weekDisplay = teamInfo.weekColumn.startsWith('pre') 
                                ? `Preseason ${teamInfo.weekColumn.slice(3, 4)}`
                                : teamInfo.weekColumn.startsWith('reg')
                                ? `Week ${parseInt(teamInfo.weekColumn.slice(3))}`
                                : `Postseason ${teamInfo.weekColumn.slice(4, 5)}`
                              return (
                                <span className="text-sm text-blue-200">
                                  {weekDisplay} - {teamInfo.teamName}
                                </span>
                              )
                            }
                            return <span className="text-sm text-gray-400">Unknown usage</span>
                          })()
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {editingId === pick.id ? (
                          <div className="flex space-x-2">
                            <button
                              onClick={saveEdit}
                              className="p-1 text-green-300 hover:text-green-200 transition-colors"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="p-1 text-gray-300 hover:text-gray-200 transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex space-x-2">
                            {pick.status === 'pending' && (
                              <button
                                onClick={() => startEditing(pick)}
                                className="p-1 text-blue-300 hover:text-blue-200 transition-colors"
                                title="Edit pick name"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                            )}
                            {pick.status === 'pending' && (
                              <button
                                onClick={() => deletePick(pick.id)}
                                className="p-1 text-red-300 hover:text-red-200 transition-colors"
                                title="Delete pick"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
