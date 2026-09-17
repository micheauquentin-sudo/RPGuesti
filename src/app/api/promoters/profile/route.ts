import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';

// 1. OBTENIR LE PROFIL ET STATS DU RP CONNECTÉ (GET)
export async function GET() {
  try {
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
      return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
    }

    const supabaseAdmin = createAdminClient();

    // Récupérer le profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    // Trouver le promoter associé à cet utilisateur
    let { data: promoter } = await supabaseAdmin
      .from('promoters')
      .select('*')
      .eq('profile_id', user.id)
      .maybeSingle();

    // Si non associé directement par profile_id, tenter par email ou associer le premier RP actif disponible
    if (!promoter && user.email) {
      const emailPrefix = user.email.split('@')[0].toLowerCase();
      const { data: candidate } = await supabaseAdmin
        .from('promoters')
        .select('*')
        .ilike('slug', `%${emailPrefix}%`)
        .is('profile_id', null)
        .maybeSingle();

      if (candidate) {
        await supabaseAdmin
          .from('promoters')
          .update({ profile_id: user.id })
          .eq('id', candidate.id);
        promoter = { ...candidate, profile_id: user.id };
      }
    }

    // Si toujours aucun RP trouvé et que l'utilisateur est admin, prendre le premier RP ou en créer un profil démo
    if (!promoter && profile?.role === 'admin') {
      const { data: firstPromoter } = await supabaseAdmin
        .from('promoters')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      promoter = firstPromoter;
    }

    // Récupérer le classement global (basé STRICTEMENT sur les entrées validées)
    const { data: allPromoters } = await supabaseAdmin
      .from('promoters')
      .select('id, first_name, last_name, instagram_handle, slug, avatar_url, is_active')
      .eq('is_active', true);

    const { data: allEntries } = await supabaseAdmin
      .from('entries')
      .select('promoter_id')
      .eq('status', 'valid');

    const { data: allRegs } = await supabaseAdmin
      .from('registrations')
      .select('promoter_id')
      .eq('status', 'registered');

    const entryCounts: Record<string, number> = {};
    (allEntries || []).forEach((e) => {
      entryCounts[e.promoter_id] = (entryCounts[e.promoter_id] || 0) + 1;
    });

    const regCounts: Record<string, number> = {};
    (allRegs || []).forEach((r) => {
      regCounts[r.promoter_id] = (regCounts[r.promoter_id] || 0) + 1;
    });

    // Construire le classement ordonné
    const leaderboard = (allPromoters || [])
      .map((p) => {
        const entries = entryCounts[p.id] || 0;
        const regs = regCounts[p.id] || 0;
        const rate = regs > 0 ? Math.round((entries / regs) * 100) : 0;
        return {
          id: p.id,
          first_name: p.first_name,
          last_name: p.last_name,
          instagram_handle: p.instagram_handle,
          slug: p.slug,
          avatar_url: p.avatar_url,
          entries_count: entries,
          registrations_count: regs,
          attendance_rate: rate,
          rank: 0,
        };
      })
      .sort((a, b) => b.entries_count - a.entries_count || b.registrations_count - a.registrations_count)
      .map((item, index) => ({
        ...item,
        rank: index + 1,
      }));

    // Prochaine soirée active pour les partages
    const { data: upcomingEvent } = await supabaseAdmin
      .from('events')
      .select('id, name, event_date, start_time, end_time, cover_image_url')
      .eq('status', 'published')
      .gte('event_date', new Date().toISOString().split('T')[0])
      .order('event_date', { ascending: true })
      .limit(1)
      .maybeSingle();

    return NextResponse.json({
      promoter,
      profile,
      leaderboard,
      upcomingEvent,
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      { error: error?.message || 'Erreur lors du chargement de l’espace RP.' },
      { status: 500 }
    );
  }
}

// 2. METTRE À JOUR LE PROFIL DU RP (PUT)
export async function PUT(request: Request) {
  try {
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
      return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
    }

    const body = await request.json();
    const { promoter_id, first_name, last_name, instagram_handle, avatar_url } = body;

    if (!first_name || !last_name) {
      return NextResponse.json(
        { error: 'Le prénom et le nom sont requis.' },
        { status: 400 }
      );
    }

    const supabaseAdmin = createAdminClient();

    // Vérifier les permissions : le promoter doit appartenir à cet utilisateur (ou l'utilisateur est admin)
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin = profile?.role === 'admin';

    // Trouver le promoter cible
    let targetPromoterId = promoter_id;

    if (!targetPromoterId) {
      const { data: p } = await supabaseAdmin
        .from('promoters')
        .select('id')
        .eq('profile_id', user.id)
        .maybeSingle();

      targetPromoterId = p?.id;
    }

    if (!targetPromoterId && !isAdmin) {
      return NextResponse.json(
        { error: 'Aucun compte RP associé à votre session.' },
        { status: 404 }
      );
    }

    const cleanInsta = instagram_handle ? instagram_handle.trim().replace(/^@/, '') : null;
    const cleanAvatar = avatar_url ? avatar_url.trim() : null;

    const updateData: Record<string, unknown> = {
      first_name: first_name.trim(),
      last_name: last_name.trim(),
      instagram_handle: cleanInsta,
      avatar_url: cleanAvatar,
      updated_at: new Date().toISOString(),
    };

    const { data: updatedPromoter, error: updateError } = await supabaseAdmin
      .from('promoters')
      .update(updateData)
      .eq('id', targetPromoterId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    // Mettre à jour également la table profiles pour synchroniser
    await supabaseAdmin
      .from('profiles')
      .update({
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        avatar_url: cleanAvatar,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    // Audit log
    await supabaseAdmin.from('audit_logs').insert({
      user_id: user.id,
      action: 'PROMOTER_PROFILE_UPDATED',
      entity_type: 'promoter',
      entity_id: targetPromoterId,
      metadata: {
        first_name,
        last_name,
        instagram_handle: cleanInsta,
      },
    });

    return NextResponse.json({
      success: true,
      promoter: updatedPromoter,
      message: 'Votre profil RP a été mis à jour avec succès.',
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      { error: error?.message || 'Erreur lors de la mise à jour du profil.' },
      { status: 500 }
    );
  }
}
