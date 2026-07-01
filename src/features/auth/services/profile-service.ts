import { supabase } from '@/lib/supabase'

export interface Profile {
  id: string
  user_id: string
  email: string
  first_name: string | null
  last_name: string | null
  phone: string | null
  is_owner: boolean
  system_owner: boolean
  onboarding_complete: boolean
  activity: string | null
  branch_id: string | null
  created_at: string
  updated_at: string
}

export const profileService = {
  async getProfile(authUserId: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', authUserId)
      .maybeSingle()

    if (error) throw error
    return data
  },

  async createProfile(params: {
    user_id: string
    email: string
    first_name?: string
    last_name?: string
    phone?: string
    branch_id?: string
    onboarding_complete?: boolean
  }): Promise<Profile> {
    const { data, error } = await supabase
      .from('profiles')
      .insert([
        {
          user_id: params.user_id,
          email: params.email,
          first_name: params.first_name || null,
          last_name: params.last_name || null,
          phone: params.phone || null,
          branch_id: params.branch_id || null,
          is_owner: true, // Default to owner as per schema/logic
          system_owner: false,
          onboarding_complete: params.onboarding_complete ?? false,
          role: 'super_admin',
        },
      ])
      .select()
      .maybeSingle()

    if (error) throw error
    return data
  },

  async getOrCreateProfile(params: {
    user_id: string
    email: string
    first_name?: string
    last_name?: string
    phone?: string
  }): Promise<Profile> {
    const profile = await this.getProfile(params.user_id)
    if (profile) return profile

    return this.createProfile(params)
  },

  async updateProfile(
    clerkUserId: string,
    updates: Partial<Omit<Profile, 'id' | 'user_id' | 'created_at'>>
  ): Promise<Profile> {
    const { data, error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('user_id', clerkUserId)
      .select()
      .maybeSingle()

    if (error) throw error
    return data
  },
}
