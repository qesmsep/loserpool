'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Header from '@/components/header'
import { PickNamesService, PickNameWithUsage } from '@/lib/pick-names-service'
import { Edit, Save, X, Tag, Plus } from 'lucide-react'

export default function PickNamesPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [pickNames, setPickNames] = useState<PickNameWithUsage[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [editingDescription, setEditingDescription] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const router = useRouter()

  const pickNamesService = new PickNamesService()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)
      loadPickNames()
    } catch (error) {
      console.error('Auth error:', error)
      setError('Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  const loadPickNames = async () => {
    try {
      const names = await pickNamesService.getUserPickNamesWithUsage()
      setPickNames(names)
    } catch (error) {
      setError('Failed to load pick names')
    }
  }

  const startEditing = (pickName: PickNameWithUsage) => {
    if (pickName.is_used) return // Don't allow editing used pick names
    setEditingId(pickName.id)
    setEditingName(pickName.name)
    setEditingDescription(pickName.description || '')
  }

  const saveEdit = async () => {
    if (!editingName.trim()) {
      setError('Pick name is required')
      return
    }

    setError('')
    try {
      const updated = await pickNamesService.updatePickName(editingId!, editingName.trim(), editingDescription.trim())
      if (updated) {
        setEditingId(null)
        setEditingName('')
        setEditingDescription('')
        setSuccess('Pick name updated successfully')
        loadPickNames()
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError('Failed to update pick name')
      }
    } catch (error) {
      setError('Failed to update pick name')
    }
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditingName('')
    setEditingDescription('')
    setError('')
  }

  const createPickName = async () => {
    if (!newName.trim()) {
      setError('Pick name is required')
      return
    }

    setError('')
    try {
      const created = await pickNamesService.createPickName(newName.trim(), newDescription.trim())
      if (created) {
        setNewName('')
        setNewDescription('')
        setShowCreateForm(false)
        setSuccess('Pick name created successfully')
        loadPickNames()
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError('Failed to create pick name')
      }
    } catch (error) {
      setError('Failed to create pick name')
    }
  }

  const deletePickName = async (id: string) => {
    if (!confirm('Are you sure you want to delete this pick name?')) return

    setError('')
    try {
      const deleted = await pickNamesService.deletePickName(id)
      if (deleted) {
        setSuccess('Pick name deleted successfully')
        loadPickNames()
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError('Failed to delete pick name')
      }
    } catch (error) {
      setError('Failed to delete pick name')
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

  if (error) {
    return (
      <div className="min-h-screen app-bg flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-200">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen app-bg">
      <Header 
        title="My Pick Names"
        subtitle="Manage your individual pick names"
        showBackButton={true}
        backHref="/dashboard"
        backText="Back to Dashboard"
      />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Introduction */}
        <div className="mb-6 bg-blue-500/20 border border-blue-500/30 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-2">About Pick Names</h3>
          <div className="text-blue-200 space-y-1">
            <p>• Name each of your picks individually (e.g., "Chad1", "Chad2", "Finance 1", "Sales 1")</p>
            <p>• Pick names help you track and organize your picks</p>
            <p>• You can edit names anytime before they're used</p>
            <p>• Used pick names are locked and cannot be changed</p>
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

        {/* Create New Pick Name */}
        <div className="mb-6 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Pick Names</h3>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add New Name
            </button>
          </div>

          {showCreateForm && (
            <div className="bg-white/5 border border-white/20 rounded-lg p-4 mb-4">
              <h4 className="text-white font-medium mb-3">Create New Pick Name</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-blue-200 mb-1">Name</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g., Chad1, Finance 1"
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-sm text-blue-200 mb-1">Description (optional)</label>
                  <input
                    type="text"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="e.g., Chad's first pick"
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
                      setNewDescription('')
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

          {/* Pick Names Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/20">
                  <th className="text-left py-3 px-4 text-blue-200 font-medium">Pick Name</th>
                  <th className="text-left py-3 px-4 text-blue-200 font-medium">Description</th>
                  <th className="text-left py-3 px-4 text-blue-200 font-medium">Status</th>
                  <th className="text-left py-3 px-4 text-blue-200 font-medium">Usage</th>
                  <th className="text-left py-3 px-4 text-blue-200 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pickNames.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-blue-200">
                      <Tag className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No pick names found</p>
                      <p className="text-sm opacity-75">Create your first pick name to get started</p>
                    </td>
                  </tr>
                ) : (
                  pickNames.map((pickName) => (
                    <tr key={pickName.id} className="border-b border-white/10 hover:bg-white/5">
                      <td className="py-3 px-4">
                        {editingId === pickName.id ? (
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            className="w-full bg-white/10 border border-white/20 rounded px-2 py-1 text-white focus:outline-none focus:border-blue-400"
                          />
                        ) : (
                          <div className="flex items-center">
                            <Tag className="w-4 h-4 text-purple-300 mr-2" />
                            <span className="font-medium text-white">{pickName.name}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {editingId === pickName.id ? (
                          <input
                            type="text"
                            value={editingDescription}
                            onChange={(e) => setEditingDescription(e.target.value)}
                            className="w-full bg-white/10 border border-white/20 rounded px-2 py-1 text-white focus:outline-none focus:border-blue-400"
                          />
                        ) : (
                          <span className="text-blue-200">{pickName.description || '-'}</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          pickName.is_used 
                            ? 'bg-gray-500/20 text-gray-200' 
                            : 'bg-green-500/20 text-green-200'
                        }`}>
                          {pickName.is_used ? 'Used' : 'Available'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {pickName.is_used ? (
                          <span className="text-sm text-blue-200">
                            Week {pickName.used_in_week} - {pickName.used_for_team}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">Not used yet</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {editingId === pickName.id ? (
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
                            {!pickName.is_used && (
                              <button
                                onClick={() => startEditing(pickName)}
                                className="p-1 text-blue-300 hover:text-blue-200 transition-colors"
                                title="Edit pick name"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                            )}
                            {!pickName.is_used && (
                              <button
                                onClick={() => deletePickName(pickName.id)}
                                className="p-1 text-red-300 hover:text-red-200 transition-colors"
                                title="Delete pick name"
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
