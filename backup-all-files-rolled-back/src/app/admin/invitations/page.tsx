import { requireAdmin } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import Link from 'next/link'
import { ArrowLeft, Mail, Users, CheckCircle, Clock } from 'lucide-react'

export default async function AdminInvitationsPage() {
  await requireAdmin()
  const supabase = await createServerSupabaseClient()

  // Get all invitations with user data
  const { data: invitations } = await supabase
    .from('invitations')
    .select(`
      *,
      users!inner(
        username,
        email,
        first_name,
        last_name
      ),
      used_by_user:users!inner(
        username,
        email,
        first_name,
        last_name
      )
    `)
    .order('created_at', { ascending: false })

  // Calculate stats
  const totalInvitations = invitations?.length || 0
  const usedInvitations = invitations?.filter(i => i.used_by !== null).length || 0
  const unusedInvitations = invitations?.filter(i => i.used_by === null).length || 0
  const conversionRate = totalInvitations > 0 ? (usedInvitations / totalInvitations * 100).toFixed(1) : '0'

  return (
    <div className="min-h-screen app-bg">
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
                <h1 className="text-3xl font-bold text-white">Invitations</h1>
                <p className="text-blue-100">Manage user invitations</p>
              </div>
            </div>
            <div>
              <Link
                href="/admin/invitations/create"
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                Create Invitation
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Mail className="w-6 h-6 text-blue-200" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-blue-100">Total Invitations</p>
                <p className="text-2xl font-bold text-white">{totalInvitations}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-200" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-green-100">Used</p>
                <p className="text-2xl font-bold text-white">{usedInvitations}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-500/20 rounded-lg">
                <Clock className="w-6 h-6 text-orange-200" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-orange-100">Unused</p>
                <p className="text-2xl font-bold text-white">{unusedInvitations}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Users className="w-6 h-6 text-purple-200" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-purple-100">Conversion Rate</p>
                <p className="text-2xl font-bold text-white">{conversionRate}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Invitations Table */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
          <div className="px-6 py-4 border-b border-white/20">
            <h2 className="text-xl font-semibold text-white">All Invitations</h2>
            <p className="text-blue-100">Complete invitation history</p>
          </div>
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-white/20">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-blue-200 uppercase tracking-wider">
                    Created By
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-blue-200 uppercase tracking-wider">
                    Invite Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-blue-200 uppercase tracking-wider">
                    Used By
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-blue-200 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-blue-200 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white/5 divide-y divide-white/20">
                {invitations?.map((invitation) => (
                  <tr key={invitation.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                            <span className="text-sm font-medium text-white">
                              {invitation.users?.username?.[0]?.toUpperCase() || 
                               invitation.users?.email?.[0]?.toUpperCase() || '?'}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-white">
                            {invitation.users?.username || 'No username'}
                          </div>
                          <div className="text-sm text-blue-200">
                            {invitation.users?.first_name} {invitation.users?.last_name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-mono text-white">
                        {invitation.invite_code}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {invitation.used_by ? (
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8">
                            <div className="h-8 w-8 rounded-full bg-green-500/20 flex items-center justify-center">
                              <span className="text-xs font-medium text-white">
                                {invitation.used_by_user?.username?.[0]?.toUpperCase() || 
                                 invitation.used_by_user?.email?.[0]?.toUpperCase() || '?'}
                              </span>
                            </div>
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-white">
                              {invitation.used_by_user?.username || 'No username'}
                            </div>
                            <div className="text-sm text-blue-200">
                              {invitation.used_by_user?.first_name} {invitation.used_by_user?.last_name}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-blue-200">Not used</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        invitation.used_by
                          ? 'bg-green-500/20 text-green-200'
                          : 'bg-orange-500/20 text-orange-200'
                      }`}>
                        {invitation.used_by ? 'Used' : 'Unused'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-200">
                      {new Date(invitation.created_at).toLocaleDateString()}
                      <br />
                      <span className="text-xs">
                        {new Date(invitation.created_at).toLocaleTimeString()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {invitations?.length === 0 && (
          <div className="text-center py-12">
            <div className="text-blue-200 text-lg">No invitations found</div>
            <p className="text-blue-100 mt-2">Create your first invitation to get started</p>
            <Link
              href="/admin/invitations/create"
              className="inline-block mt-4 bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors"
            >
              Create First Invitation
            </Link>
          </div>
        )}
      </div>
    </div>
  )
} 