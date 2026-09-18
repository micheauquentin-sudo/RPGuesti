import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
export async function GET(request: Request) {
  try {
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

    // Vérifier si le pass a été scanné à la porte
    const { data: entryCheck } = await supabaseAdmin
      .from('entries')
      .select('id, scanned_at')
      .eq('registration_id', data.id)
      .in('status', ['valid', 'VALID'])
      .maybeSingle();

    // Vérifier si un avis a déjà été soumis pour ce pass
    let hasFeedback = false;
    try {
      const { data: feedbackCheck } = await supabaseAdmin
        .from('guest_feedbacks')
        .select('id')
        .eq('registration_id', data.id)
        .maybeSingle();
      hasFeedback = Boolean(feedbackCheck);
    } catch {
      // Table en cours de création
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
        is_scanned: Boolean(entryCheck),
        has_feedback: hasFeedback,
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
