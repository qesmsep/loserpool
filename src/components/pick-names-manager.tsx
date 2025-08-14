'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Check, X, Tag } from 'lucide-react'
import { PickNamesService, PickNameWithUsage } from '@/lib/pick-names-service'
import { useAuth } from './auth-provider'

interface PickNamesManagerProps {
  onPickNameSelect?: (pickName: PickNameWithUsage) => void
  showUsed?: boolean
  className?: string
}

export default function PickNamesManager({ 
  onPickNameSelect, 
  showUsed = true, 
  className = '' 
}: PickNamesManagerProps) {
  const { user, loading: authLoading } = useAuth()
  const [pickNames, setPickNames] = useState<PickNameWithUsage[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const pickNamesService = new PickNamesService()

  useEffect(() => {
    if (!authLoading && user) {
      loadPickNames()
    }
  }, [loadPickNames, authLoading, user])

  const loadPickNames = async () => {
    setLoading(true)
    try {
      const names = await pickNamesService.getUserPickNamesWithUsage()
      setPickNames(names)
    } catch {
      setError('Failed to load pick names')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
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
    } catch {
      setError('Failed to create pick name')
    }
  }

  const handleUpdate = async (id: string, name: string, description?: string) => {
    if (!name.trim()) {
      setError('Pick name is required')
      return
    }

    setError('')
    try {
      const updated = await pickNamesService.updatePickName(id, name.trim(), description?.trim())
      if (updated) {
        setEditingId(null)
        setSuccess('Pick name updated successfully')
        loadPickNames()
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError('Failed to update pick name')
      }
    } catch {
      setError('Failed to update pick name')
    }
  }

  const handleDelete = async (id: string) => {
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
    } catch {
      setError('Failed to delete pick name')
    }
  }

  const filteredPickNames = showUsed 
    ? pickNames 
    : pickNames.filter(pickName => !pickName.is_used)

  if (authLoading || loading) {
    return (
      <div className={`bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-white/20 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 bg-white/10 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Tag className="w-5 h-5 text-blue-300" />
          <h3 className="text-lg font-semibold text-white">My Pick Names</h3>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Name
        </button>
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500/30 text-red-200 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-500/20 border border-green-500/30 text-green-200 px-4 py-3 rounded-lg mb-4">
          {success}
        </div>
      )}

      {/* Create Form */}
      {showCreateForm && (
        <div className="bg-white/5 border border-white/20 rounded-lg p-4 mb-4">
          <h4 className="text-white font-medium mb-3">Create New Pick Name</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-blue-200 mb-1">Name</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g., Chad1, Finance 1, Sales 1"
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:border-blue-400"
              />
            </div>
            <div>
              <label className="block text-sm text-blue-200 mb-1">Description (optional)</label>
              <input
                type="text"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="e.g., Chad's first pick, Finance team pick"
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:border-blue-400"
              />
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handleCreate}
                className="flex items-center bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                <Check className="w-4 h-4 mr-1" />
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
                <X className="w-4 h-4 mr-1" />
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pick Names List */}
      <div className="space-y-3">
        {filteredPickNames.length === 0 ? (
          <div className="text-center py-8 text-blue-200">
            <Tag className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No pick names found</p>
            <p className="text-sm opacity-75">Create your first pick name to get started</p>
          </div>
        ) : (
          filteredPickNames.map((pickName) => (
            <div
              key={pickName.id}
              className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                pickName.is_used
                  ? 'bg-gray-500/20 border-gray-500/30 text-gray-300'
                  : 'bg-white/5 border-white/20 text-white hover:bg-white/10'
              } ${onPickNameSelect && !pickName.is_used ? 'cursor-pointer' : ''}`}
              onClick={() => onPickNameSelect && !pickName.is_used && onPickNameSelect(pickName)}
            >
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <span className="font-medium">{pickName.name}</span>
                  {pickName.is_used && (
                    <span className="text-xs bg-gray-600 text-gray-200 px-2 py-1 rounded">
                      Used (Week {pickName.used_in_week} - {pickName.used_for_team})
                    </span>
                  )}
                </div>
                {pickName.description && (
                  <p className="text-sm opacity-75 mt-1">{pickName.description}</p>
                )}
              </div>
              
              {!pickName.is_used && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setEditingId(pickName.id)
                    }}
                    className="p-1 text-blue-300 hover:text-blue-200 transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(pickName.id)
                    }}
                    className="p-1 text-red-300 hover:text-red-200 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Edit Modal */}
      {editingId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-white/20 rounded-lg p-6 w-full max-w-md mx-4">
            <h4 className="text-white font-medium mb-4">Edit Pick Name</h4>
            {(() => {
              const pickName = pickNames.find(pn => pn.id === editingId)
              if (!pickName) return null

              return (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-blue-200 mb-1">Name</label>
                    <input
                      type="text"
                      defaultValue={pickName.name}
                      id="edit-name"
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-blue-200 mb-1">Description (optional)</label>
                    <input
                      type="text"
                      defaultValue={pickName.description || ''}
                      id="edit-description"
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-400"
                    />
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        const nameInput = document.getElementById('edit-name') as HTMLInputElement
                        const descInput = document.getElementById('edit-description') as HTMLInputElement
                        handleUpdate(editingId, nameInput.value, descInput.value)
                      }}
                      className="flex items-center bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="flex items-center bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Cancel
                    </button>
                  </div>
                </div>
              )
            })()}
          </div>
        </div>
      )}
    </div>
  )
}
