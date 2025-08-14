import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export interface PickName {
  id: string
  user_id: string
  name: string
  description?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface PickNameWithUsage extends PickName {
  is_used: boolean
  used_in_week?: number
  used_for_team?: string
}

export class PickNamesService {
  private supabase = createClientComponentClient()

  // Get all pick names for the current user
  async getUserPickNames(): Promise<PickName[]> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) {
        console.log('User not authenticated in getUserPickNames')
        return []
      }

      const { data, error } = await this.supabase
        .from('pick_names')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching user pick names:', error)
      return []
    }
  }

  // Get pick names with usage information
  async getUserPickNamesWithUsage(): Promise<PickNameWithUsage[]> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) {
        console.log('User not authenticated in getUserPickNamesWithUsage')
        return []
      }

      // Get pick names
      const { data: pickNames, error: pickNamesError } = await this.supabase
        .from('pick_names')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('name')

      if (pickNamesError) throw pickNamesError

      // Get picks with matchup info to see usage
      const { data: picks, error: picksError } = await this.supabase
        .from('picks')
        .select(`
          pick_name_id,
          team_picked,
          matchups (
            week
          )
        `)
        .eq('user_id', user.id)
        .not('pick_name_id', 'is', null)

      if (picksError) throw picksError

      // Create a map of used pick names
      const usedPickNames = new Map<string, { week: number; team: string }>()
      picks?.forEach(pick => {
        if (pick.pick_name_id && pick.matchups) {
          usedPickNames.set(pick.pick_name_id, {
            week: pick.matchups.week,
            team: pick.team_picked
          })
        }
      })

      // Combine the data
      return (pickNames || []).map(pickName => ({
        ...pickName,
        is_used: usedPickNames.has(pickName.id),
        used_in_week: usedPickNames.get(pickName.id)?.week,
        used_for_team: usedPickNames.get(pickName.id)?.team
      }))
    } catch (error) {
      console.error('Error fetching pick names with usage:', error)
      return []
    }
  }

  // Get available (unused) pick names
  async getAvailablePickNames(): Promise<PickName[]> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) {
        console.log('User not authenticated in getAvailablePickNames')
        return []
      }

      const { data, error } = await this.supabase
        .rpc('get_available_pick_names', { user_uuid: user.id })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching available pick names:', error)
      return []
    }
  }

  // Create a new pick name
  async createPickName(name: string, description?: string): Promise<PickName | null> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) {
        console.log('User not authenticated in createPickName')
        return null
      }

      const { data, error } = await this.supabase
        .from('pick_names')
        .insert({
          user_id: user.id,
          name: name.trim(),
          description: description?.trim()
        })
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error creating pick name:', error)
      return null
    }
  }

  // Update a pick name
  async updatePickName(id: string, name: string, description?: string): Promise<PickName | null> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) {
        console.log('User not authenticated in updatePickName')
        return null
      }

      const { data, error } = await this.supabase
        .from('pick_names')
        .update({
          name: name.trim(),
          description: description?.trim()
        })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error updating pick name:', error)
      return null
    }
  }

  // Delete a pick name (soft delete by setting is_active to false)
  async deletePickName(id: string): Promise<boolean> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) {
        console.log('User not authenticated in deletePickName')
        return false
      }

      const { error } = await this.supabase
        .from('pick_names')
        .update({ is_active: false })
        .eq('id', id)
        .eq('user_id', user.id)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error deleting pick name:', error)
      return false
    }
  }

  // Check if a pick name is available for the current user
  async isPickNameAvailable(name: string): Promise<boolean> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { data, error } = await this.supabase
        .from('pick_names')
        .select('id')
        .eq('user_id', user.id)
        .eq('name', name.trim())
        .eq('is_active', true)
        .single()

      if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows returned
      return !data // Return true if no data found (name is available)
    } catch (error) {
      console.error('Error checking pick name availability:', error)
      return false
    }
  }

  // Get pick name by ID
  async getPickNameById(id: string): Promise<PickName | null> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { data, error } = await this.supabase
        .from('pick_names')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error fetching pick name by ID:', error)
      return null
    }
  }
}
