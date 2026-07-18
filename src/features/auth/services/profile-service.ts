import { supabase } from '@/lib/supabase'

export interface Profile {
  id: string
  auth_user_id: string
  email: string
  first_name: string | null
  last_name: string | null
  phone: string | null
  is_owner: boolean
  system_owner: boolean
  onboarding_complete: boolean
  activity: string | null
  payment_method: string | null
  transfer_ref: string | null
  branch_id: string | null
  created_at: string
  updated_at: string
}

export const profileService = {
  async getProfile(authUserId: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('auth_user_id', authUserId)
      .maybeSingle()

    if (error) throw error
    return data
  },

  async createProfile(params: {
    auth_user_id: string
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
          auth_user_id: params.auth_user_id,
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
    auth_user_id: string
    email: string
    first_name?: string
    last_name?: string
    phone?: string
  }): Promise<Profile> {
    const profile = await this.getProfile(params.auth_user_id)
    if (profile) return profile

    return this.createProfile(params)
  },

  async updateProfile(
    clerkUserId: string,
    updates: Partial<Omit<Profile, 'id' | 'auth_user_id' | 'created_at'>>
  ): Promise<Profile> {
    const { data, error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('auth_user_id', clerkUserId)
      .select()
      .maybeSingle()

    if (error) throw error
    return data
  },
}
