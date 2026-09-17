import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyAdmin } from '@/lib/api-auth';
import { generateInviteToken } from '@/lib/utils';
import pg from 'pg';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Helper pour s'assurer que les colonnes d'invitation existent
let migrationDone = false;
async function ensureColumnsExist() {
  if (migrationDone) return;
  const connectionString = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;
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
      ALTER TABLE public.promoters 
        ADD COLUMN IF NOT EXISTS email TEXT,
        ADD COLUMN IF NOT EXISTS invite_token TEXT UNIQUE,
        ADD COLUMN IF NOT EXISTS invite_expires_at TIMESTAMPTZ;
      CREATE INDEX IF NOT EXISTS idx_promoters_invite_token 
        ON public.promoters(invite_token) 
        WHERE invite_token IS NOT NULL;

      -- Revoke sensitive invite columns from anon and authenticated
      DO $$
      BEGIN
        REVOKE SELECT (invite_token, invite_expires_at) ON public.promoters FROM anon, authenticated;
      EXCEPTION WHEN OTHERS THEN NULL;
      END $$;

      -- Drop unsafe public policies
      DROP POLICY IF EXISTS "Creation guest autorisee" ON public.guests;
      DROP POLICY IF EXISTS "Lecture registration par token pour pass invité" ON public.registrations;
      DROP POLICY IF EXISTS "Creation registration autorisee" ON public.registrations;

      -- Secure registrations policy: RP reads own, staff/admin reads all
      DROP POLICY IF EXISTS "RP lecture de ses propres registrations" ON public.registrations;
      CREATE POLICY "RP lecture de ses propres registrations"
      ON public.registrations FOR SELECT
      USING (
          promoter_id IN (
              SELECT id FROM public.promoters WHERE profile_id = auth.uid()
          ) OR public.is_staff_or_admin()
      );
    `);
    await client.end();
    migrationDone = true;
  } catch (err) {
    console.warn('Auto-migration invite columns warning:', err);
  }
}

export async function POST(request: Request) {
  try {
    const adminUser = await verifyAdmin();
    if (!adminUser) {
      return NextResponse.json(
        { error: 'Action réservée aux administrateurs.' },
        { status: 403 }
      );
    }

    await ensureColumnsExist();

    const body = await request.json();
    const { action, promoter_id, email, password } = body;

    if (!promoter_id) {
      return NextResponse.json(
        { error: 'Identifiant du promoteur manquant.' },
        { status: 400 }
      );
    }

    const supabaseAdmin = createAdminClient();

    // Vérifier l'existence du promoteur
    const { data: promoter, error: pErr } = await supabaseAdmin
      .from('promoters')
      .select('*')
      .eq('id', promoter_id)
      .single();

    if (pErr || !promoter) {
      return NextResponse.json(
        { error: 'Promoteur introuvable.' },
        { status: 404 }
      );
    }

    // --- CAS 1 : GÉNÉRER UN LIEN D'INVITATION / ACTIVATION ---
    if (action === 'generate_invite') {
      const inviteToken = generateInviteToken();
      // Expiration dans 7 jours
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const { error: updateErr } = await supabaseAdmin
        .from('promoters')
        .update({
          invite_token: inviteToken,
          invite_expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        })
        .eq('id', promoter_id);

      if (updateErr) {
        throw updateErr;
      }

      // Log d'audit
      await supabaseAdmin.from('audit_logs').insert({
        user_id: adminUser.id,
        action: 'PROMOTER_INVITE_GENERATED',
        entity_type: 'promoter',
        entity_id: promoter_id,
        metadata: {
          promoter_name: `${promoter.first_name} ${promoter.last_name}`,
          expires_at: expiresAt,
        },
      });

      const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'https://rp-guesti.vercel.app';
      const inviteUrl = `${origin}/join/${inviteToken}`;

      return NextResponse.json({
        success: true,
        invite_token: inviteToken,
        invite_url: inviteUrl,
        expires_at: expiresAt,
        promoter: {
          id: promoter.id,
          first_name: promoter.first_name,
          last_name: promoter.last_name,
          slug: promoter.slug,
          email: promoter.email,
        },
      });
    }

    // --- CAS 2 : DÉFINIR DIRECTEMENT EMAIL ET MOT DE PASSE ---
    if (action === 'set_credentials') {
      if (!email || !password) {
        return NextResponse.json(
          { error: 'Email et mot de passe sont requis.' },
          { status: 400 }
        );
      }

      if (password.length < 6) {
        return NextResponse.json(
          { error: 'Le mot de passe doit contenir au moins 6 caractères.' },
          { status: 400 }
        );
      }

      const cleanEmail = email.trim().toLowerCase();

      // Vérifier si un compte auth existe déjà avec cet email
      const { data: usersList } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = usersList?.users?.find(
        (u) => u.email?.toLowerCase() === cleanEmail
      );

      let authUserId = existingUser?.id;

      if (existingUser) {
        // Mettre à jour le mot de passe du compte existant
        const { error: updateAuthErr } = await supabaseAdmin.auth.admin.updateUserById(
          existingUser.id,
          {
            password,
            user_metadata: {
              first_name: promoter.first_name,
              last_name: promoter.last_name,
              role: 'promoter',
            },
          }
        );
        if (updateAuthErr) throw updateAuthErr;
      } else {
        // Créer un nouvel utilisateur Auth Supabase
        const { data: newAuthUser, error: createAuthErr } = await supabaseAdmin.auth.admin.createUser({
          email: cleanEmail,
          password,
          email_confirm: true,
          user_metadata: {
            first_name: promoter.first_name,
            last_name: promoter.last_name,
            role: 'promoter',
          },
        });

        if (createAuthErr) throw createAuthErr;
        authUserId = newAuthUser.user.id;
      }

      // S'assurer que le profil est bien en rôle promoter
      await supabaseAdmin
        .from('profiles')
        .upsert({
          id: authUserId,
          email: cleanEmail,
          role: 'promoter',
          first_name: promoter.first_name,
          last_name: promoter.last_name,
          updated_at: new Date().toISOString(),
        });

      // Lier la fiche promoter
      await supabaseAdmin
        .from('promoters')
        .update({
          profile_id: authUserId,
          email: cleanEmail,
          invite_token: null,
          invite_expires_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', promoter_id);

      // Log d'audit
      await supabaseAdmin.from('audit_logs').insert({
        user_id: adminUser.id,
        action: 'PROMOTER_CREDENTIALS_SET',
        entity_type: 'promoter',
        entity_id: promoter_id,
        metadata: {
          email: cleanEmail,
          promoter_name: `${promoter.first_name} ${promoter.last_name}`,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Les identifiants pour ${promoter.first_name} ${promoter.last_name} ont été configurés avec succès.`,
        email: cleanEmail,
      });
    }

    return NextResponse.json(
      { error: 'Action non reconnue. Utilisez "generate_invite" ou "set_credentials".' },
      { status: 400 }
    );
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      { error: error?.message || 'Erreur lors de la gestion des accès du RP.' },
      { status: 500 }
    );
  }
}
