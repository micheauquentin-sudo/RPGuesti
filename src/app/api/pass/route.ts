import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import pg from 'pg';

let migrationChecked = false;
async function ensureSecurityPolicies() {
  if (migrationChecked) return;
  const connectionString =
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL;
  if (!connectionString) return;

  try {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    const cleanUrl = connectionString.split('?')[0];
    const client = new pg.Client({
      connectionString: cleanUrl,
      ssl: { rejectUnauthorized: false },
    });
    await client.connect();
    await client.query(`
      -- 1. Table dédiée et privée pour les tokens d'invitation RP
      CREATE TABLE IF NOT EXISTS public.promoter_invites (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        promoter_id UUID NOT NULL REFERENCES public.promoters(id) ON DELETE CASCADE,
        token TEXT NOT NULL UNIQUE,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now()
      );

      ALTER TABLE public.promoter_invites ENABLE ROW LEVEL SECURITY;

      -- Migration des anciens tokens et suppression définitive des colonnes de promoters
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' AND table_name = 'promoters' AND column_name = 'invite_token'
        ) THEN
          INSERT INTO public.promoter_invites (promoter_id, token, expires_at)
          SELECT id, invite_token, COALESCE(invite_expires_at, now() + interval '7 days')
          FROM public.promoters
          WHERE invite_token IS NOT NULL
          ON CONFLICT (token) DO NOTHING;

          ALTER TABLE public.promoters DROP COLUMN IF EXISTS invite_token CASCADE;
          ALTER TABLE public.promoters DROP COLUMN IF EXISTS invite_expires_at CASCADE;
        END IF;
      END $$;

      -- 2. Drop unsafe public policies
      DROP POLICY IF EXISTS "Creation guest autorisee" ON public.guests;
      DROP POLICY IF EXISTS "Lecture registration par token pour pass invité" ON public.registrations;
      DROP POLICY IF EXISTS "Creation registration autorisee" ON public.registrations;

      -- 3. Secure registrations policy
      DROP POLICY IF EXISTS "RP lecture de ses propres registrations" ON public.registrations;
      CREATE POLICY "RP lecture de ses propres registrations"
      ON public.registrations FOR SELECT
      USING (
          promoter_id IN (
              SELECT id FROM public.promoters WHERE profile_id = auth.uid()
          ) OR public.is_staff_or_admin()
      );

      -- 4. Colonnes Blacklist Invités & Vues Liens RP
      ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS is_blacklisted BOOLEAN DEFAULT false;
      ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS blacklist_reason TEXT;
      ALTER TABLE public.promoters ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0;
    `);
    await client.end();
    migrationChecked = true;
  } catch (err) {
    console.warn('Security policies auto-migration warning:', err);
  }
}

export async function GET(request: Request) {
  try {
    await ensureSecurityPolicies();
    // 1. Rate Limiting : max 30 requêtes par minute par IP
    const clientIp = getClientIp(request);
    const rateLimit = checkRateLimit(`pass:${clientIp}`, { limit: 30, windowMs: 60_000 });
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Trop de requêtes. Veuillez patienter un instant.' },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token')?.trim();

    if (!token || token.length > 100) {
      return NextResponse.json(
        { error: 'Paramètre token invalide ou manquant.' },
        { status: 400 }
      );
    }

    const supabaseAdmin = createAdminClient();

    // 2. Sélection sécurisée : uniquement les champs nécessaires à l'affichage du billet
    // Ne JAMAIS exposer l'email, le téléphone ou les données sensibles des invités
    const { data, error } = await supabaseAdmin
      .from('registrations')
      .select(`
        id,
        qr_token,
        status,
        guest:guests(first_name, last_name),
        event:events(name, event_date, start_time, end_time, cover_image_url),
        promoter:promoters(first_name, last_name, avatar_url, slug)
      `)
      .eq('qr_token', token)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json(
        { error: 'Billet ou code QR introuvable ou expiré.' },
        { status: 404 }
      );
    }

    const guestObj = Array.isArray(data.guest) ? data.guest[0] : data.guest;
    const eventObj = Array.isArray(data.event) ? data.event[0] : data.event;
    const promoterObj = Array.isArray(data.promoter) ? data.promoter[0] : data.promoter;

    return NextResponse.json({
      success: true,
      data: {
        id: data.id,
        qr_token: data.qr_token,
        status: data.status,
        guest: {
          first_name: guestObj?.first_name || '',
          last_name: guestObj?.last_name || '',
        },
        event: {
          name: eventObj?.name || '',
          event_date: eventObj?.event_date || '',
          start_time: eventObj?.start_time || '',
          end_time: eventObj?.end_time || '',
          cover_image_url: eventObj?.cover_image_url || null,
        },
        promoter: {
          first_name: promoterObj?.first_name || '',
          last_name: promoterObj?.last_name || '',
          avatar_url: promoterObj?.avatar_url || null,
          slug: promoterObj?.slug || '',
        },
      },
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      { error: error?.message || 'Erreur lors de la récupération du billet.' },
      { status: 500 }
    );
  }
}
