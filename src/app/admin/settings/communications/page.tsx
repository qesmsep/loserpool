'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import AdminHeader from '@/components/admin-header'
import { Mail, Edit, Plus, Trash2, Save } from 'lucide-react'

interface EmailTemplate {
  id: string
  name: string
  subject: string
  body: string
  trigger_type: 'pick_reminder' | 'welcome' | 'elimination' | 'custom'
  timing: 'immediately' | 'morning_before_first_game' | 'day_before' | 'custom'
  custom_timing?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

interface TemplateForm {
  name: string
  subject: string
  body: string
  trigger_type: 'pick_reminder' | 'welcome' | 'elimination' | 'custom'
  timing: 'immediately' | 'morning_before_first_game' | 'day_before' | 'custom'
  custom_timing?: string
  is_active: boolean
  recipient_type: 'specific_email' | 'all_users' | 'all_active_players' | 'all_admins' | 'custom'
  specific_email?: string
  custom_recipients?: string
}

const PROXIMITY_VARIABLES = [
  { variable: '{{user_name}}', description: 'User\'s first name' },
  { variable: '{{user_email}}', description: 'User\'s email address' },
  { variable: '{{week_number}}', description: 'Current week number' },
  { variable: '{{picks_deadline}}', description: 'Picks deadline date/time' },
  { variable: '{{picks_remaining}}', description: 'User\'s remaining picks' },
  { variable: '{{pool_name}}', description: 'Pool name' },
  { variable: '{{admin_name}}', description: 'Admin\'s name' },
  { variable: '{{elimination_reason}}', description: 'Reason for elimination' },
  { variable: '{{game_details}}', description: 'Details of the game that caused elimination' },
  { variable: '{{leaderboard_position}}', description: 'User\'s current position' },
  { variable: '{{total_players}}', description: 'Total number of players' },
  { variable: '{{prize_pool}}', description: 'Current prize pool amount' }
]

const TIMING_OPTIONS = [
  { value: 'immediately', label: 'Immediately', description: 'Send right away' },
  { value: 'morning_before_first_game', label: 'Morning Before First Game', description: '9 AM local time on game day' },
  { value: 'day_before', label: 'Day Before', description: '24 hours before first game' },
  { value: 'custom', label: 'Custom Timing', description: 'Set specific time' }
]

const TRIGGER_TYPES = [
  { value: 'pick_reminder', label: 'Pick Reminders', description: 'Weekly reminder to make picks' },
  { value: 'welcome', label: 'Welcome Messages', description: 'New user onboarding' },
  { value: 'elimination', label: 'Elimination Notifications', description: 'When users are eliminated' },
  { value: 'custom', label: 'Custom Trigger', description: 'Custom automated trigger' }
]

const RECIPIENT_TYPES = [
  { value: 'specific_email', label: 'Specific Email', description: 'Send to one specific email address' },
  { value: 'all_users', label: 'All Users', description: 'Send to all registered users' },
  { value: 'all_active_players', label: 'All Active Players', description: 'Send to users who have made picks' },
  { value: 'all_admins', label: 'All Admins', description: 'Send to all admin users' },
  { value: 'custom', label: 'Custom Recipients', description: 'Enter custom email addresses' }
]

export default function AdminCommunicationsPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null)

  const [form, setForm] = useState<TemplateForm>({
    name: '',
    subject: '',
    body: '',
    trigger_type: 'pick_reminder',
    timing: 'morning_before_first_game',
    custom_timing: '',
    is_active: true,
    recipient_type: 'all_users',
    specific_email: '',
    custom_recipients: ''
  })

  useEffect(() => {
    loadTemplates()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const loadTemplates = async () => {
    try {
      setLoading(true)
      
      // Check if user is admin
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('Authentication required')
        return
      }

      const { data: userProfile } = await supabase
        .from('users')
        .select('is_admin')
        .eq('id', user.id)
        .single()

      if (!userProfile?.is_admin) {
        setError('Admin access required')
        return
      }

      // Load templates from email_templates table
      const { data: templatesData, error: templatesError } = await supabase
        .from('email_templates')
        .select('*')
        .order('created_at', { ascending: false })

      if (templatesError) {
        console.error('Error loading templates:', templatesError)
        // For now, create some default templates if table doesn't exist
        setTemplates(getDefaultTemplates())
      } else {
        setTemplates(templatesData || getDefaultTemplates())
      }
    } catch {
      setError('Failed to load templates')
      setTemplates(getDefaultTemplates())
    } finally {
      setLoading(false)
    }
  }

  const getDefaultTemplates = (): EmailTemplate[] => {
    return [
      {
        id: '1',
        name: 'Weekly Pick Reminder',
        subject: 'Make Your Picks - Week {{week_number}}',
        body: `Hi {{user_name}},

Don't forget to make your picks for Week {{week_number}}! 

Deadline: {{picks_deadline}}
Picks Remaining: {{picks_remaining}}

Make your picks at: [Pool URL]

Good luck!
{{admin_name}}`,
        trigger_type: 'pick_reminder',
        timing: 'morning_before_first_game',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '2',
        name: 'Welcome to The Loser Pool',
        subject: 'Welcome to {{pool_name}}!',
        body: `Welcome {{user_name}}!

You've successfully joined {{pool_name}}. Here's what you need to know:

- Pick teams that will LOSE each week
- If your pick wins, you're eliminated
- Last person standing wins the pool!
- You have {{picks_remaining}} picks to use

Make your first picks at: [Pool URL]

Good luck!
{{admin_name}}`,
        trigger_type: 'welcome',
        timing: 'immediately',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '3',
        name: 'Elimination Notification',
        subject: 'You\'ve Been Eliminated - Week {{week_number}}',
        body: `Hi {{user_name}},

Unfortunately, you've been eliminated from {{pool_name}} in Week {{week_number}}.

{{elimination_reason}}

Game Details: {{game_details}}

You finished in position {{leaderboard_position}} out of {{total_players}} players.

Thanks for playing!
{{admin_name}}`,
        trigger_type: 'elimination',
        timing: 'immediately',
        is_active: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ]
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError('')
      setSuccess('')

      if (!form.name || !form.subject || !form.body) {
        setError('Please fill in all required fields')
        return
      }

      // If timing is immediately, send the email right away
      if (form.timing === 'immediately') {
        try {
          const response = await fetch('/api/admin/send-immediate-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form)
          })
          
          const result = await response.json()
          
          if (result.success) {
            setSuccess(`Email sent successfully! ${result.message}`)
          } else {
            setError(`Failed to send email: ${result.message}`)
            return
          }
        } catch {
          setError('Failed to send email')
          return
        }
      }

      // Save the template
      if (editingTemplate) {
        setTemplates(prev => prev.map(t => 
          t.id === editingTemplate 
            ? { ...t, ...form, updated_at: new Date().toISOString() }
            : t
        ))
      } else {
        const newTemplate: EmailTemplate = {
          id: Date.now().toString(),
          ...form,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
        setTemplates(prev => [newTemplate, ...prev])
      }

      setSuccess(form.timing === 'immediately' 
        ? 'Email sent and template saved successfully!' 
        : (editingTemplate ? 'Template updated successfully!' : 'Template created successfully!')
      )
      setShowForm(false)
      setEditingTemplate(null)
      resetForm()
    } catch {
      setError('Failed to save template')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (template: EmailTemplate) => {
    setForm({
      name: template.name,
      subject: template.subject,
      body: template.body,
      trigger_type: template.trigger_type,
      timing: template.timing,
      custom_timing: template.custom_timing,
      is_active: template.is_active,
      recipient_type: 'all_users', // Default for existing templates
      specific_email: '',
      custom_recipients: ''
    })
    setEditingTemplate(template.id)
    setShowForm(true)
  }

  const handleDelete = (templateId: string) => {
    setTemplates(prev => prev.filter(t => t.id !== templateId))
    setSuccess('Template deleted successfully!')
  }

  const resetForm = () => {
    setForm({
      name: '',
      subject: '',
      body: '',
      trigger_type: 'pick_reminder',
      timing: 'morning_before_first_game',
      custom_timing: '',
      is_active: true,
      recipient_type: 'all_users',
      specific_email: '',
      custom_recipients: ''
    })
  }

  const insertVariable = (variable: string) => {
    setForm(prev => ({
      ...prev,
      body: prev.body + variable
    }))
  }

  const getTriggerTypeLabel = (type: string): string => {
    return TRIGGER_TYPES.find(t => t.value === type)?.label || type
  }

  const getTimingLabel = (timing: string): string => {
    return TIMING_OPTIONS.find(t => t.value === timing)?.label || timing
  }

  if (loading) {
    return (
      <div className="min-h-screen app-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-300 mx-auto"></div>
          <p className="mt-4 text-blue-200">Loading templates...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen app-bg">
      <AdminHeader 
        title="Communications"
        subtitle="Manage email templates and automated messages"
        showBackButton={true}
        backHref="/admin/settings"
        backText="Back to Settings"
      />

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

        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-white">Email Templates</h1>
          <div className="flex space-x-4">
            <button
              onClick={async () => {
                try {
                  const response = await fetch('/api/admin/email-debug', {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' }
                  })
                  const result = await response.json()
                  if (result.success) {
                    console.log('🔍 Email Config Debug:', result)
                    setSuccess(`Email config: ${result.configStatus.provider} (${result.configStatus.configured ? 'configured' : 'not configured'})`)
                  } else {
                    setError(result.message || 'Failed to get email config')
                  }
                } catch {
                  setError('Failed to get email config')
                }
              }}
              className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors flex items-center"
            >
              <Mail className="w-4 h-4 mr-2" />
              Debug Config
            </button>
            <button
              onClick={async () => {
                try {
                  const response = await fetch('/api/admin/email-debug', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ testEmail: 'tim@828.life' })
                  })
                  const result = await response.json()
                  if (result.success) {
                    setSuccess(`Test email sent! Provider: ${result.provider}`)
                  } else {
                    setError(result.message || 'Failed to send test email')
                  }
                } catch {
                  setError('Failed to send test email')
                }
              }}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center"
            >
              <Mail className="w-4 h-4 mr-2" />
              Send Test Email
            </button>
            <button
              onClick={() => {
                resetForm()
                setShowForm(true)
                setEditingTemplate(null)
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Template
            </button>
          </div>
        </div>

        {/* Template Form */}
        {showForm && (
          <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 mb-8">
            <div className="px-6 py-4 border-b border-white/20">
              <h2 className="text-xl font-semibold text-white">
                {editingTemplate ? 'Edit Template' : 'Create New Template'}
              </h2>
            </div>
            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Template Name *
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({...form, name: e.target.value})}
                    className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Weekly Pick Reminder"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Trigger Type
                  </label>
                  <select
                    value={form.trigger_type}
                    onChange={(e) => setForm({...form, trigger_type: e.target.value as 'pick_reminder' | 'welcome' | 'elimination' | 'custom'})}
                    className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {TRIGGER_TYPES.map(trigger => (
                      <option key={trigger.value} value={trigger.value}>
                        {trigger.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Recipients */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Recipients
                  </label>
                  <select
                    value={form.recipient_type}
                    onChange={(e) => setForm({...form, recipient_type: e.target.value as 'specific_email' | 'all_users' | 'all_active_players' | 'all_admins' | 'custom'})}
                    className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {RECIPIENT_TYPES.map(recipient => (
                      <option key={recipient.value} value={recipient.value}>
                        {recipient.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  {form.recipient_type === 'specific_email' && (
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={form.specific_email || ''}
                        onChange={(e) => setForm({...form, specific_email: e.target.value})}
                        className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="user@example.com"
                      />
                    </div>
                  )}
                  {form.recipient_type === 'custom' && (
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        Custom Email Addresses
                      </label>
                      <textarea
                        value={form.custom_recipients || ''}
                        onChange={(e) => setForm({...form, custom_recipients: e.target.value})}
                        className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="user1@example.com, user2@example.com, user3@example.com"
                        rows={3}
                      />
                      <p className="text-sm text-gray-400 mt-1">
                        Separate multiple email addresses with commas
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Timing */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Timing
                  </label>
                  <select
                    value={form.timing}
                    onChange={(e) => setForm({...form, timing: e.target.value as 'immediately' | 'morning_before_first_game' | 'day_before' | 'custom'})}
                    className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {TIMING_OPTIONS.map(timing => (
                      <option key={timing.value} value={timing.value}>
                        {timing.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Status
                  </label>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.is_active}
                      onChange={(e) => setForm({...form, is_active: e.target.checked})}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                    <span className="ml-3 text-sm text-white">
                      {form.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </label>
                </div>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Email Subject *
                </label>
                <input
                  type="text"
                  value={form.subject}
                  onChange={(e) => setForm({...form, subject: e.target.value})}
                  className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Make Your Picks - Week {{week_number}}"
                />
              </div>

              {/* Variables */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Available Variables
                </label>
                <div className="bg-white/5 border border-white/20 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {PROXIMITY_VARIABLES.map((variable, index) => (
                      <button
                        key={index}
                        onClick={() => insertVariable(variable.variable)}
                        className="text-left p-2 hover:bg-white/10 rounded text-sm"
                      >
                        <code className="text-blue-300 font-mono">{variable.variable}</code>
                        <div className="text-gray-400 text-xs">{variable.description}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Body */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Email Body *
                </label>
                <textarea
                  value={form.body}
                  onChange={(e) => setForm({...form, body: e.target.value})}
                  rows={12}
                  className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  placeholder="Enter your email template here. Use variables like {{user_name}} to personalize the message."
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => {
                    setShowForm(false)
                    setEditingTemplate(null)
                    resetForm()
                  }}
                  className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Saving...' : (
                    form.timing === 'immediately' ? 'Send' : (editingTemplate ? 'Update' : 'Create')
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Templates List */}
        <div className="space-y-4">
          {templates.map((template) => (
            <div key={template.id} className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
              <div className="px-6 py-4 border-b border-white/20">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white">{template.name}</h3>
                    <p className="text-blue-200 text-sm">{template.subject}</p>
                    <div className="flex items-center space-x-4 mt-2">
                      <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-blue-500/20 text-blue-200">
                        {getTriggerTypeLabel(template.trigger_type)}
                      </span>
                      <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-purple-500/20 text-purple-200">
                        {getTimingLabel(template.timing)}
                      </span>
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${
                        template.is_active 
                          ? 'bg-green-500/20 text-green-200' 
                          : 'bg-gray-500/20 text-gray-200'
                      }`}>
                        {template.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEdit(template)}
                      className="p-2 text-blue-200 hover:text-white hover:bg-white/10 rounded transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(template.id)}
                      className="p-2 text-red-200 hover:text-red-100 hover:bg-red-500/10 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
              <div className="px-6 py-4">
                <div className="text-sm text-gray-300 font-mono bg-white/5 p-3 rounded border border-white/10">
                  {template.body.substring(0, 200)}
                  {template.body.length > 200 && '...'}
                </div>
              </div>
            </div>
          ))}
        </div>

        {templates.length === 0 && !showForm && (
          <div className="text-center py-12">
            <Mail className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-300 mb-2">No templates yet</h3>
            <p className="text-gray-400 mb-4">Create your first email template to get started</p>
            <button
              onClick={() => {
                resetForm()
                setShowForm(true)
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Template
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
