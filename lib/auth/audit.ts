import { createSupabaseServerClient } from './supabase-server';
import type { AuditLog } from '@/lib/types/auth';

interface AuditLogInput {
  userId?: string | null;
  userEmail?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function createAuditLog(input: AuditLogInput): Promise<AuditLog | null> {
  try {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('audit_logs')
      .insert({
        user_id: input.userId,
        user_email: input.userEmail,
        action: input.action,
        resource_type: input.resourceType,
        resource_id: input.resourceId,
        old_values: input.oldValues,
        new_values: input.newValues,
        ip_address: input.ipAddress,
        user_agent: input.userAgent
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create audit log:', error);
      return null;
    }

    return data as AuditLog;
  } catch (err) {
    console.error('Audit log error:', err);
    return null;
  }
}

export async function getAuditLogs(options: {
  limit?: number;
  offset?: number;
  userId?: string;
  resourceType?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
}): Promise<{ data: AuditLog[]; count: number }> {
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from('audit_logs')
    .select('*', { count: 'exact' });

  if (options.userId) {
    query = query.eq('user_id', options.userId);
  }

  if (options.resourceType) {
    query = query.eq('resource_type', options.resourceType);
  }

  if (options.action) {
    query = query.eq('action', options.action);
  }

  if (options.startDate) {
    query = query.gte('created_at', options.startDate);
  }

  if (options.endDate) {
    query = query.lte('created_at', options.endDate);
  }

  query = query
    .order('created_at', { ascending: false })
    .range(options.offset || 0, (options.offset || 0) + (options.limit || 50) - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('Failed to get audit logs:', error);
    return { data: [], count: 0 };
  }

  return { data: data as AuditLog[], count: count || 0 };
}

// Helper to get request metadata
export function getRequestMeta(request: Request): { ipAddress: string | null; userAgent: string | null } {
  return {
    ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] ||
               request.headers.get('x-real-ip') ||
               null,
    userAgent: request.headers.get('user-agent')
  };
}
