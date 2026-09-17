import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { qr_data } = body;

    if (!qr_data) {
      return NextResponse.json(
        { success: false, status: 'NOT_FOUND', message: 'Aucun code QR détecté' },
        { status: 400 }
      );
    }

    // 1. Extraire le token propre
    // Le QR code peut être soit l'URL complète "https://.../check-in/TOKEN", soit le TOKEN direct
    let qrToken = String(qr_data).trim();
    if (qrToken.includes('/check-in/')) {
      qrToken = qrToken.split('/check-in/')[1]?.split('?')[0]?.trim() || qrToken;
    } else if (qrToken.includes('/qr/')) {
      qrToken = qrToken.split('/qr/')[1]?.split('?')[0]?.trim() || qrToken;
    }

    // 2. Vérifier l'authentification de l'agent qui scanne
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
    let scannedBy: string | null = null;

    if (user) {
      scannedBy = user.id;
    }

    // 3. Vérifier si l'événement associé à ce pass a déjà expiré (soirée passée)
    const supabaseAdmin = createAdminClient();
    const { data: regCheck } = await supabaseAdmin
      .from('registrations')
      .select('event:events(name, event_date, end_time, status)')
      .eq('qr_token', qrToken)
      .maybeSingle();

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

    // 4. Appel de la fonction atomique PostgreSQL
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

    return NextResponse.json(data);
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      { success: false, status: 'ERROR', message: error?.message || 'Erreur interne' },
      { status: 500 }
    );
  }
}
