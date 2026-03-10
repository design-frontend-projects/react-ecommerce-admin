import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export const userSearchQueryKey = (search: string) => ['users-search', search] as const;

export function useSearchClerkUsers(search: string) {
  return useQuery({
    queryKey: userSearchQueryKey(search),
    queryFn: async () => {
      if (!search || search.length < 2) return [];
      
      const { data, error } = await supabase
        .from('users')
        .select('id, clerk_user_id, email, first_name, last_name')
        .or(`email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`)
        .limit(10);

      if (error) throw error;
      return data;
    },
    enabled: search.length >= 2,
  });
}
