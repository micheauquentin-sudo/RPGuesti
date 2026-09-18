import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);
    const rateLimit = checkRateLimit(`feedback:${clientIp}`, { limit: 15, windowMs: 60_000 });
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Trop de requêtes. Veuillez patienter.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { token, rating, tags, comment } = body;

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { error: 'Token de pass manquant ou invalide.' },
        { status: 400 }
      );
    }

    const numRating = Number(rating);
    if (isNaN(numRating) || numRating < 1 || numRating > 5) {
      return NextResponse.json(
        { error: 'La note doit être comprise entre 1 et 5 étoiles.' },
        { status: 400 }
      );
    }

    const supabaseAdmin = createAdminClient();

    // 1. Trouver l'inscription associée
    const { data: reg, error: regError } = await supabaseAdmin
      .from('registrations')
      .select('id, event_id, guest_id')
      .eq('qr_token', token.trim())
      .maybeSingle();

    if (regError || !reg) {
      return NextResponse.json(
        { error: 'Billet introuvable pour enregistrer cet avis.' },
        { status: 404 }
      );
    }

    // 2. Vérifier si un avis existe déjà pour cette inscription
    const { data: existing } = await supabaseAdmin
      .from('guest_feedbacks')
      .select('id')
      .eq('registration_id', reg.id)
      .maybeSingle();

    const cleanTags = Array.isArray(tags) 
      ? tags.map((t) => String(t).slice(0, 50)).slice(0, 8) 
      : [];
    const cleanComment = comment ? String(comment).trim().slice(0, 500) : null;

    if (existing) {
      await supabaseAdmin
        .from('guest_feedbacks')
        .update({
          rating: Math.round(numRating),
          tags: cleanTags,
          comment: cleanComment,
          created_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
    } else {
      await supabaseAdmin
        .from('guest_feedbacks')
        .insert({
          registration_id: reg.id,
          event_id: reg.event_id,
          guest_id: reg.guest_id,
          rating: Math.round(numRating),
          tags: cleanTags,
          comment: cleanComment,
        });
    }

    return NextResponse.json({
      success: true,
      message: 'Votre avis a bien été enregistré. Merci beaucoup !',
    });
  } catch (err: unknown) {
    const error = err as Error;
    console.error('Feedback submission error:', error);
    return NextResponse.json(
      { error: error?.message || 'Erreur interne lors de l’envoi de l’avis.' },
      { status: 500 }
    );
  }
}
