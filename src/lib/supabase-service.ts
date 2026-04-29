import { supabase } from './supabase'

export { supabase }

export function createRealtimeChannel(channelName: string) {
  return supabase.channel(channelName)
}
