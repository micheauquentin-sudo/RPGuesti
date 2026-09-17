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

    // 3. Appel de la fonction atomique PostgreSQL
    const supabaseAdmin = createAdminClient();
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
