import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { slugify } from '@/lib/utils';

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

    // Si non associé directement par profile_id, tenter par email exact ou correspondance
    if (!promoter && user.email) {
      const emailClean = user.email.trim().toLowerCase();
      
      // 1. Chercher par email exact
      let { data: candidate } = await supabaseAdmin
        .from('promoters')
        .select('*')
        .eq('email', emailClean)
        .maybeSingle();

      // 2. Chercher par correspondance prénom / nom du profile
      if (!candidate && profile) {
        const { data: nameMatch } = await supabaseAdmin
          .from('promoters')
          .select('*')
          .ilike('first_name', profile.first_name || '')
          .ilike('last_name', profile.last_name || '')
          .maybeSingle();
        candidate = nameMatch;
      }

      // 3. Chercher par slug avec fragments de l'email
      if (!candidate) {
        const emailPrefix = emailClean.split('@')[0];
        const { data: slugMatch } = await supabaseAdmin
          .from('promoters')
          .select('*')
          .ilike('slug', `%${emailPrefix}%`)
          .is('profile_id', null)
          .maybeSingle();
        candidate = slugMatch;
      }

      if (candidate) {
        await supabaseAdmin
          .from('promoters')
          .update({ profile_id: user.id, email: emailClean })
          .eq('id', candidate.id);
        promoter = { ...candidate, profile_id: user.id, email: emailClean };
      }
    }

    // Si toujours aucun RP trouvé et que l'utilisateur est admin, associer le premier RP actif
    if (!promoter && profile?.role === 'admin') {
      const { data: firstPromoter } = await supabaseAdmin
        .from('promoters')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (firstPromoter) {
        await supabaseAdmin
          .from('promoters')
          .update({ profile_id: user.id, email: user.email || firstPromoter.email })
          .eq('id', firstPromoter.id);
        promoter = { ...firstPromoter, profile_id: user.id };
      }
    }

    // Récupérer le classement global (basé STRICTEMENT sur les entrées validées)
    const { data: allPromoters } = await supabaseAdmin
      .from('promoters')
      .select('id, first_name, last_name, pseudo, instagram_handle, slug, avatar_url, is_active, views_count')
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
        const pObj = p as unknown as { pseudo?: string | null; views_count?: number };
        const displayName = pObj.pseudo || `${p.first_name} ${p.last_name}`;
        return {
          id: p.id,
          first_name: p.first_name,
          last_name: p.last_name,
          pseudo: pObj.pseudo || null,
          name: displayName,
          instagram_handle: p.instagram_handle,
          slug: p.slug,
          avatar_url: p.avatar_url,
          views_count: pObj.views_count || 0,
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

    // Liste des invités du RP pour la soirée active/prochaine
    let eventGuests: Array<{
      id: string;
      guest_name: string;
      first_name: string;
      last_name: string;
      phone: string | null;
      registered_at: string;
      is_scanned: boolean;
      scanned_at: string | null;
    }> = [];

    if (promoter?.id && upcomingEvent?.id) {
      const { data: regs } = await supabaseAdmin
        .from('registrations')
        .select(`
          id,
          registered_at,
          guest:guests(id, first_name, last_name, phone),
          entry:entries(id, scanned_at, status)
        `)
        .eq('promoter_id', promoter.id)
        .eq('event_id', upcomingEvent.id)
        .order('registered_at', { ascending: false });

      if (regs) {
        eventGuests = regs.map((r) => {
          const g = Array.isArray(r.guest) ? r.guest[0] : r.guest;
          const e = Array.isArray(r.entry) ? r.entry[0] : r.entry;
          return {
            id: r.id,
            guest_name: g ? `${g.first_name} ${g.last_name}` : 'Invité inconnu',
            first_name: g?.first_name || '',
            last_name: g?.last_name || '',
            phone: g?.phone || null,
            registered_at: r.registered_at,
            is_scanned: Boolean(e && (e.status === 'valid' || e.status === 'VALID')),
            scanned_at: e?.scanned_at || null,
          };
        });
      }
    }

    return NextResponse.json({
      promoter,
      profile,
      leaderboard,
      upcomingEvent,
      eventGuests,
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
    const { promoter_id, first_name, last_name, pseudo, instagram_handle, avatar_url } = body;

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

    // Trouver le promoter cible (Sécurité anti-IDOR stricte)
    let targetPromoterId = promoter_id;

    if (!isAdmin) {
      // Pour les RP normaux : verrouillage strict sur leur propre profil uniquement
      const { data: ownPromoter } = await supabaseAdmin
        .from('promoters')
        .select('id')
        .eq('profile_id', user.id)
        .maybeSingle();

      if (!ownPromoter) {
        return NextResponse.json(
          { error: 'Aucun compte RP associé à votre session.' },
          { status: 403 }
        );
      }
      targetPromoterId = ownPromoter.id;
    } else if (!targetPromoterId) {
      const { data: p } = await supabaseAdmin
        .from('promoters')
        .select('id')
        .eq('profile_id', user.id)
        .maybeSingle();

      targetPromoterId = p?.id;
    }

    if (!targetPromoterId) {
      return NextResponse.json(
        { error: 'Identifiant du promoteur manquant.' },
        { status: 400 }
      );
    }

    const cleanInsta = instagram_handle ? instagram_handle.trim().replace(/^@/, '') : null;
    const cleanAvatar = avatar_url ? avatar_url.trim() : null;
    const cleanPseudo = pseudo !== undefined ? (typeof pseudo === 'string' && pseudo.trim().length > 0 ? pseudo.trim() : null) : undefined;

    // Récupérer le promoteur actuel pour vérifier son slug et son pseudo
    const { data: currentPromoter } = await supabaseAdmin
      .from('promoters')
      .select('id, slug, pseudo, first_name, last_name')
      .eq('id', targetPromoterId)
      .single();

    if (!currentPromoter) {
      return NextResponse.json({ error: 'Promoteur introuvable.' }, { status: 404 });
    }

    // Déterminer le slug : si pseudo renseigné, slugify(pseudo), sinon slugify(prénom + nom)
    const effectivePseudo = cleanPseudo !== undefined ? cleanPseudo : currentPromoter.pseudo;
    const desiredSlug = effectivePseudo 
      ? slugify(effectivePseudo) 
      : slugify(`${first_name.trim()} ${last_name.trim()}`);

    let newSlug = currentPromoter.slug;
    let slugChanged = false;

    if (desiredSlug && desiredSlug !== currentPromoter.slug) {
      // Vérifier si ce slug est déjà pris par un autre RP
      const { data: existingSlug } = await supabaseAdmin
        .from('promoters')
        .select('id')
        .eq('slug', desiredSlug)
        .neq('id', targetPromoterId)
        .maybeSingle();

      if (existingSlug) {
        return NextResponse.json(
          { error: `Le lien personnalisé "/rp/${desiredSlug}" correspondant à ce pseudo est déjà pris par un autre RP. Veuillez choisir un autre pseudo.` },
          { status: 400 }
        );
      }
      newSlug = desiredSlug;
      slugChanged = true;
    }

    const updateData: Record<string, unknown> = {
      first_name: first_name.trim(),
      last_name: last_name.trim(),
      instagram_handle: cleanInsta,
      avatar_url: cleanAvatar,
      slug: newSlug,
      updated_at: new Date().toISOString(),
    };

    if (cleanPseudo !== undefined) {
      updateData.pseudo = cleanPseudo;
    }

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
        pseudo: cleanPseudo,
        old_slug: currentPromoter.slug,
        new_slug: newSlug,
        slug_changed: slugChanged,
      },
    });

    return NextResponse.json({
      success: true,
      promoter: updatedPromoter,
      slug_changed: slugChanged,
      old_slug: currentPromoter.slug,
      new_slug: newSlug,
      message: slugChanged
        ? `Votre pseudo et votre lien personnel ont été mis à jour (/rp/${newSlug}). Pensez impérativement à repartager ce nouveau lien car l'ancien ne fonctionne plus !`
        : 'Votre profil RP a été mis à jour avec succès.',
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      { error: error?.message || 'Erreur lors de la mise à jour du profil.' },
      { status: 500 }
    );
  }
}
