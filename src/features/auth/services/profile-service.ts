import { supabase } from '@/lib/supabase'

export interface Profile {
  id: string
  clerk_user_id: string
  email: string
  first_name: string | null
  last_name: string | null
  phone: string | null
  is_owner: boolean
  system_owner: boolean
  created_at: string
  updated_at: string
}

export const profileService = {
  async getProfile(clerkUserId: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('clerk_user_id', clerkUserId)
      .maybeSingle()

    if (error) throw error
    return data
  },

  async createProfile(params: {
    clerk_user_id: string
    email: string
    first_name?: string
    last_name?: string
    phone?: string
  }): Promise<Profile> {
    const { data, error } = await supabase
      .from('profiles')
      .insert([
        {
          clerk_user_id: params.clerk_user_id,
          email: params.email,
          first_name: params.first_name || null,
          last_name: params.last_name || null,
          phone: params.phone || null,
          is_owner: true, // Default to owner as per schema/logic
          system_owner: false,
        },
      ])
      .select()
      .maybeSingle()

    if (error) throw error
    return data
  },

  async getOrCreateProfile(params: {
    clerk_user_id: string
    email: string
    first_name?: string
    last_name?: string
    phone?: string
  }): Promise<Profile> {
    const profile = await this.getProfile(params.clerk_user_id)
    if (profile) return profile

    return this.createProfile(params)
  },

  async updateProfile(
    clerkUserId: string,
    updates: Partial<Omit<Profile, 'id' | 'clerk_user_id' | 'created_at'>>
  ): Promise<Profile> {
    const { data, error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('clerk_user_id', clerkUserId)
      .select()
      .maybeSingle()

    if (error) throw error
    return data
  },
}
