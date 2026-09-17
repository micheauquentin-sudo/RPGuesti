import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

// 1. VALIDATION DU LIEN D'INVITATION (GET)
export async function GET(request: Request) {
  try {
    const clientIp = getClientIp(request);
    const rateLimit = checkRateLimit(`invite-get:${clientIp}`, { limit: 20, windowMs: 60_000 });
    if (!rateLimit.success) {
      return NextResponse.json(
        { valid: false, error: 'Trop de requêtes. Veuillez patienter un instant.' },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token')?.trim();

    if (!token) {
      return NextResponse.json(
        { valid: false, error: 'Lien d\'invitation manquant ou invalide.' },
        { status: 400 }
      );
    }

    const supabaseAdmin = createAdminClient();

    const { data: invite, error } = await supabaseAdmin
      .from('promoter_invites')
      .select('id, token, expires_at, promoter:promoters(id, first_name, last_name, slug, email, profile_id)')
      .eq('token', token)
      .maybeSingle();

    if (error || !invite || !invite.promoter) {
      return NextResponse.json(
        { valid: false, error: 'Lien d\'invitation invalide ou expiré.' },
        { status: 404 }
      );
    }

    const promoter = Array.isArray(invite.promoter) ? invite.promoter[0] : (invite.promoter as unknown as { id: string; first_name: string; last_name: string; slug: string; email: string | null; profile_id: string | null });

    // Vérifier l'expiration
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return NextResponse.json(
        { valid: false, error: 'Ce lien d\'invitation a expiré. Demandez un nouveau lien à la direction du club.' },
        { status: 410 }
      );
    }

    // Vérifier si un compte est déjà lié
    if (promoter.profile_id) {
      return NextResponse.json(
        { valid: false, already_activated: true, error: 'Ce compte RP a déjà été activé. Vous pouvez vous connecter directement.' },
        { status: 409 }
      );
    }

    return NextResponse.json({
      valid: true,
      promoter: {
        first_name: promoter.first_name,
        last_name: promoter.last_name,
        slug: promoter.slug,
        email: promoter.email,
      },
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      { valid: false, error: error?.message || 'Erreur lors de la vérification du lien.' },
      { status: 500 }
    );
  }
}

// 2. CRÉATION DE L'ESPACE RP PAR LE PROMOTEUR (POST)
export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);
    const rateLimit = checkRateLimit(`invite-post:${clientIp}`, { limit: 5, windowMs: 60_000 });
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Trop de tentatives de création de compte. Veuillez patienter une minute.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { token, email, password } = body;

    if (!token || !email || !password) {
      return NextResponse.json(
        { error: 'Token d\'invitation, email et mot de passe sont requis.' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Le mot de passe doit comporter au moins 6 caractères.' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanToken = token.trim();

    const supabaseAdmin = createAdminClient();

    // Vérifier à nouveau le promoteur et le token
    const { data: invite, error: pErr } = await supabaseAdmin
      .from('promoter_invites')
      .select('id, token, expires_at, promoter:promoters(id, first_name, last_name, slug, email, profile_id)')
      .eq('token', cleanToken)
      .maybeSingle();

    if (pErr || !invite || !invite.promoter) {
      return NextResponse.json(
        { error: 'Lien d\'invitation invalide ou déjà utilisé.' },
        { status: 404 }
      );
    }

    const promoter = Array.isArray(invite.promoter) ? invite.promoter[0] : (invite.promoter as unknown as { id: string; first_name: string; last_name: string; slug: string; email: string | null; profile_id: string | null });

    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Ce lien d\'invitation a expiré.' },
        { status: 410 }
      );
    }

    // Créer ou récupérer l'utilisateur Auth Supabase
    const { data: usersList } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = usersList?.users?.find(
      (u) => u.email?.toLowerCase() === cleanEmail
    );

    let authUserId = existingUser?.id;

    if (existingUser) {
      // Si l'utilisateur existe déjà, mettre à jour le mot de passe
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
      // Création du nouvel utilisateur Auth
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

    // Assurer le profil dans public.profiles avec le rôle promoter
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

    // Lier définitivement la fiche promoter
    const { error: linkErr } = await supabaseAdmin
      .from('promoters')
      .update({
        profile_id: authUserId,
        email: cleanEmail,
        updated_at: new Date().toISOString(),
      })
      .eq('id', promoter.id);

    if (linkErr) throw linkErr;

    // Consommer définitivement le token d'invitation
    await supabaseAdmin
      .from('promoter_invites')
      .delete()
      .eq('id', invite.id);

    // Log d'audit
    await supabaseAdmin.from('audit_logs').insert({
      user_id: authUserId,
      action: 'PROMOTER_ACCOUNT_ACTIVATED',
      entity_type: 'promoter',
      entity_id: promoter.id,
      metadata: {
        email: cleanEmail,
        name: `${promoter.first_name} ${promoter.last_name}`,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Compte RP activé avec succès !',
      email: cleanEmail,
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      { error: error?.message || 'Erreur lors de l\'activation de votre compte RP.' },
      { status: 500 }
    );
  }
}
