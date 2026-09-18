import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export async function GET(request: Request) {
  try {
    // 1. Rate Limiting : 60 requêtes/min par IP
    const clientIp = getClientIp(request);
    const rateLimit = checkRateLimit(`search-checkin:${clientIp}`, { limit: 60, windowMs: 60_000 });
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Trop de recherches. Veuillez patienter un instant.' },
        { status: 429 }
      );
    }

    // 2. Authentification obligatoire : staff, admin ou promoter
    const cookieStore = await cookies();
    const supabaseUser = createServerClient(
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

    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Connexion requise pour rechercher un invité.' },
        { status: 401 }
      );
    }

    const supabaseAdmin = createAdminClient();

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['staff', 'admin', 'promoter'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Accès réservé au staff, admin et RP.' },
        { status: 403 }
      );
    }

    // 3. Validation de la recherche
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim() || '';

    if (q.length < 2) {
      return NextResponse.json({
        success: true,
        candidates: [],
      });
    }

    const cleanQuery = q.slice(0, 50).toLowerCase();

    // 4. Recherche dans guests matching first_name ou last_name
    const { data: matchingGuests, error: gErr } = await supabaseAdmin
      .from('guests')
      .select('id, first_name, last_name, phone')
      .or(`first_name.ilike.%${cleanQuery}%,last_name.ilike.%${cleanQuery}%,phone.ilike.%${cleanQuery}%`)
      .limit(20);

    if (gErr || !matchingGuests || matchingGuests.length === 0) {
      return NextResponse.json({
        success: true,
        candidates: [],
      });
    }

    const guestIds = matchingGuests.map((g) => g.id);

    // 5. Récupérer les inscriptions pour ces invités
    const { data: registrations, error: rErr } = await supabaseAdmin
      .from('registrations')
      .select(`
        id,
        qr_token,
        status,
        registered_at,
        guest_id,
        event:events(id, name, event_date, status),
        promoter:promoters(first_name, last_name)
      `)
      .in('guest_id', guestIds)
      .order('registered_at', { ascending: false })
      .limit(25);

    if (rErr || !registrations) {
      return NextResponse.json({
        success: true,
        candidates: [],
      });
    }

    const regIds = registrations.map((r) => r.id);

    // 6. Vérifier si une entrée existe déjà dans entries
    const { data: entries } = await supabaseAdmin
      .from('entries')
      .select('registration_id, scanned_at, status')
      .in('registration_id', regIds);

    const entriesMap = new Map<string, { scanned_at: string; status: string }>();
    if (entries) {
      for (const e of entries) {
        entriesMap.set(e.registration_id, { scanned_at: e.scanned_at, status: e.status });
      }
    }

    // Associer les données
    const candidates = registrations.map((reg) => {
      const guest = matchingGuests.find((g) => g.id === reg.guest_id);
      const evObj = Array.isArray(reg.event) ? reg.event[0] : (reg.event as unknown as { id: string; name: string; event_date: string; status: string });
      const pObj = Array.isArray(reg.promoter) ? reg.promoter[0] : (reg.promoter as unknown as { first_name: string; last_name: string });
      const entry = entriesMap.get(reg.id);

      let computedStatus: 'VALID' | 'ALREADY_USED' | 'CANCELLED' = 'VALID';
      if (entry) {
        computedStatus = 'ALREADY_USED';
      } else if (reg.status === 'cancelled') {
        computedStatus = 'CANCELLED';
      }

      return {
        registration_id: reg.id,
        qr_token: reg.qr_token,
        guest_name: `${guest?.first_name || ''} ${guest?.last_name || ''}`.trim(),
        phone: guest?.phone || null,
        promoter_name: pObj ? `${pObj.first_name} ${pObj.last_name}` : 'Club ASTRA',
        event_name: evObj?.name || 'Soirée ASTRA',
        event_date: evObj?.event_date || '',
        status: computedStatus,
        scanned_at: entry?.scanned_at || null,
      };
    });

    return NextResponse.json({
      success: true,
      candidates,
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      { error: error?.message || 'Erreur lors de la recherche.' },
      { status: 500 }
    );
  }
}
