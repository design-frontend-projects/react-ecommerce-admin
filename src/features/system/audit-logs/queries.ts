import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface AuditLog {
  id: string;
  profile_id: string;
  activity_type_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  old_values: any;
  new_values: any;
  metadata: any;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  profiles: {
    email: string;
    first_name: string | null;
    last_name: string | null;
  };
  activity_types: {
    name: string;
    code: string;
  };
}

export interface ActivityType {
  id: string;
  code: string;
  name: string;
  description: string | null;
}

export const auditLogsKeys = {
  all: ['audit-logs'] as const,
  list: (filters: any) => [...auditLogsKeys.all, 'list', filters] as const,
  activityTypes: () => [...auditLogsKeys.all, 'activity-types'] as const,
};

export function useAuditLogs(filters: {
  profileId?: string;
  activityTypeId?: string;
  entityType?: string;
  dateFrom?: string;
  dateTo?: string;
} = {}) {
  return useQuery({
    queryKey: auditLogsKeys.list(filters),
    queryFn: async () => {
      let query = supabase
        .from('audit_logs')
        .select(`
          *,
          profiles (email, first_name, last_name),
          activity_types (name, code)
        `)
        .order('created_at', { ascending: false });

      if (filters.profileId) {
        query = query.eq('profile_id', filters.profileId);
      }
      if (filters.activityTypeId) {
        query = query.eq('activity_type_id', filters.activityTypeId);
      }
      if (filters.entityType) {
        query = query.eq('entity_type', filters.entityType);
      }
      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo);
      }

      const { data, error } = await query.limit(100);

      if (error) throw error;
      return data as AuditLog[];
    },
  });
}

export function useActivityTypes() {
  return useQuery({
    queryKey: auditLogsKeys.activityTypes(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_types')
        .select('*')
        .order('name');

      if (error) throw error;
      return data as ActivityType[];
    },
  });
}
