import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);
    const body = await request.json();
    const { promoter_slug } = body;

    if (!promoter_slug || typeof promoter_slug !== 'string') {
      return NextResponse.json({ error: 'Slug requis.' }, { status: 400 });
    }

    const cleanSlug = promoter_slug.toLowerCase().trim();

    // Limiter les vues répétées par IP (max 1 vue par heure par couple IP-Promoteur)
    const rateLimit = checkRateLimit(`view-promoter:${clientIp}:${cleanSlug}`, {
      limit: 1,
      windowMs: 60 * 60 * 1000,
    });

    // Si déjà comptabilisé dans la dernière heure, retourner 200 sans incrémenter
    if (!rateLimit.success) {
      return NextResponse.json({ success: true, already_counted: true });
    }

    const supabaseAdmin = createAdminClient();

    const { data: promoter } = await supabaseAdmin
      .from('promoters')
      .select('id, views_count')
      .eq('slug', cleanSlug)
      .maybeSingle();

    if (promoter) {
      await supabaseAdmin
        .from('promoters')
        .update({ views_count: (promoter.views_count || 0) + 1 })
        .eq('id', promoter.id);
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error?.message || 'Erreur interne' }, { status: 500 });
  }
}
