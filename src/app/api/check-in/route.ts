import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(request: Request) {
  try {
    // 1. Rate Limiting : max 60 scans par minute par IP
    const clientIp = getClientIp(request);
    const rateLimit = checkRateLimit(`checkin:${clientIp}`, { limit: 60, windowMs: 60_000 });
    if (!rateLimit.success) {
      return NextResponse.json(
        { success: false, status: 'RATE_LIMITED', message: 'Trop de scans consécutifs. Veuillez patienter.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { qr_data } = body;

    if (!qr_data) {
      return NextResponse.json(
        { success: false, status: 'NOT_FOUND', message: 'Aucun code QR détecté' },
        { status: 400 }
      );
    }

    // 2. Extraire le token propre
    let qrToken = String(qr_data).trim();
    if (qrToken.includes('/check-in/')) {
      qrToken = qrToken.split('/check-in/')[1]?.split('?')[0]?.trim() || qrToken;
    } else if (qrToken.includes('/qr/')) {
      qrToken = qrToken.split('/qr/')[1]?.split('?')[0]?.trim() || qrToken;
    }

    // 3. SÉCURITÉ : Authentification OBLIGATOIRE du scanner
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
        { success: false, status: 'UNAUTHORIZED', message: 'Connexion requise pour valider un pass invité.' },
        { status: 401 }
      );
    }

    const supabaseAdmin = createAdminClient();

    // Vérifier le rôle de l'utilisateur
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['staff', 'admin', 'promoter'].includes(profile.role)) {
      return NextResponse.json(
        { success: false, status: 'FORBIDDEN', message: 'Accès non autorisé. Réservé au staff, admin et RP.' },
        { status: 403 }
      );
    }

    const scannedBy = user.id;

    // 4. Vérifier si l'invité est blacklisté ou si l'événement a expiré
    const { data: regCheck } = await supabaseAdmin
      .from('registrations')
      .select('guest:guests(first_name, last_name, is_blacklisted, blacklist_reason), event:events(name, event_date, end_time, status)')
      .eq('qr_token', qrToken)
      .maybeSingle();

    if (regCheck?.guest) {
      const g = Array.isArray(regCheck.guest) 
        ? regCheck.guest[0] 
        : (regCheck.guest as unknown as { first_name: string; last_name: string; is_blacklisted?: boolean; blacklist_reason?: string });
      
      if (g?.is_blacklisted) {
        return NextResponse.json({
          success: false,
          status: 'BLACKLISTED',
          message: g.blacklist_reason ? `INDIVIDU SIGNALÉ : ${g.blacklist_reason}` : 'INDIVIDU SIGNALÉ — ACCÈS STRICTEMENT REFUSÉ',
          guest_name: `${g.first_name} ${g.last_name}`,
        });
      }
    }

    if (regCheck?.event) {
      const ev = Array.isArray(regCheck.event) ? regCheck.event[0] : (regCheck.event as unknown as { name: string; event_date: string; end_time: string; status: string });
      if (ev?.event_date) {
        const [year, month, day] = ev.event_date.split('-').map(Number);
        // La soirée se termine au plus tard le lendemain matin à 12h00
        const expiryTime = new Date(year, month - 1, day + 1, 12, 0, 0);
        if (new Date() > expiryTime || ev.status === 'closed' || ev.status === 'cancelled') {
          return NextResponse.json({
            success: false,
            status: 'EXPIRED',
            message: 'Cette soirée est terminée. Ce pass QR n’est plus actif.',
            event_name: ev.name,
          });
        }
      }
    }

    // 5. Appel de la fonction atomique PostgreSQL
    const { data, error } = await supabaseAdmin.rpc('check_in_guest', {
      p_qr_token: qrToken,
      p_scanned_by: scannedBy,
    });

    if (error) {
      console.error('RPC Error check_in_guest:', error);
      return NextResponse.json(
        { success: false, status: 'ERROR', message: 'Erreur base de données lors du scan' },
        { status: 500 }
      );
    }

    // 6. Calcul du badge de fidélité & accueil VIP personnalisé
    if (data && data.status === 'VALID') {
      try {
        const { data: regInfo } = await supabaseAdmin
          .from('registrations')
          .select('guest_id, companion_first_name')
          .eq('qr_token', qrToken)
          .maybeSingle();

        if (regInfo?.guest_id) {
          const { count } = await supabaseAdmin
            .from('entries')
            .select('*', { count: 'exact', head: true })
            .eq('guest_id', regInfo.guest_id)
            .in('status', ['valid', 'VALID']);

          const visitsCount = count || 1;
          const isDuo = Boolean(regInfo.companion_first_name);

          let badgeType: 'VIP_REGULAR' | 'NEW_CLUBBER' | 'DUO_AMBASSADOR' | 'REGULAR' = 'REGULAR';
          let badgeLabel = 'Clubber ASTRA';
          let welcomeMsg = 'Entrée validée. Bonne soirée !';

          if (visitsCount >= 3) {
            badgeType = 'VIP_REGULAR';
            badgeLabel = `👑 HABITUÉ VIP (${visitsCount}e venue)`;
            welcomeMsg = 'Bon retour parmi nous !';
          } else if (visitsCount === 1) {
            badgeType = 'NEW_CLUBBER';
            badgeLabel = '⭐ NOUVEAU CLUBBER';
            welcomeMsg = "Bienvenue à l'ASTRA pour la première fois !";
          } else if (isDuo) {
            badgeType = 'DUO_AMBASSADOR';
            badgeLabel = '👥 PASS DUO (+1)';
            welcomeMsg = 'Bienvenue à tous les deux !';
          }

          data.guest_badge = {
            type: badgeType,
            label: badgeLabel,
            welcomeMsg,
            visitsCount,
          };
        }
      } catch (badgeErr) {
        console.warn('Erreur calcul badge invité:', badgeErr);
      }
    }

    return NextResponse.json(data);
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      { success: false, status: 'ERROR', message: error?.message || 'Erreur interne' },
      { status: 500 }
    );
  }
}
