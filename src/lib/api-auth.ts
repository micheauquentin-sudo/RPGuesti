// =====================================================================
// ASTRA RP — VÉRIFICATION D'AUTHENTIFICATION API (PARTAGÉE)
// Utilisé par toutes les routes API nécessitant une vérification de rôle
// =====================================================================

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { User } from '@supabase/supabase-js';

/**
 * Vérifie que l'utilisateur connecté a le rôle admin.
 * Retourne l'objet User si OK, null sinon.
 */
export async function verifyAdmin(): Promise<User | null> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') return null;
  return user;
}

/**
 * Vérifie que l'utilisateur connecté est staff ou admin.
 * Retourne l'objet { user, role } si OK, null sinon.
 */
export async function verifyStaffOrAdmin(): Promise<{ user: User; role: string } | null> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['admin', 'staff'].includes(profile.role)) return null;
  return { user, role: profile.role };
}
