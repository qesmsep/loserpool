import { createClient } from '@supabase/supabase-js'

export interface PickName {
  id: string
  user_id: string
  name: string
  description?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

// Server-side service for admin operations
export class PickNamesServiceServer {
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )

  // Get all pick names for a specific user (admin function)
  async getUserPickNames(userId: string): Promise<PickName[]> {
    try {
      const { data, error } = await this.supabase
        .from('pick_names')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching user pick names (server):', error)
      return []
    }
  }

  // Generate default pick names for a user (admin function)
  async generateDefaultPickNames(userId: string, count: number): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .rpc('generate_default_pick_names', {
          user_uuid: userId,
          count: count
        })

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error generating default pick names (server):', error)
      return false
    }
  }
}
