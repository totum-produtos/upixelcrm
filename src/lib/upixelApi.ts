import { supabase } from '@/integrations/supabase/client';

const API_BASE = (import.meta.env.VITE_UPIXEL_API_URL ?? 'https://api.upixelcrm.grupototum.com').replace(/\/+$/, '');

export async function apiFetch(path: string, options?: RequestInit): Promise<Response> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  const apiPath = path.startsWith('/') ? path : `/${path}`;

  return fetch(`${API_BASE}${apiPath}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
}
