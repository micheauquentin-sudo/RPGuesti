import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Identifiant du RP manquant.' },
        { status: 400 }
      );
    }

    // 1. Vérifier que l'utilisateur connecté est bien administrateur
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

    const { data: profile } = await supabaseUser
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Action réservée aux administrateurs.' },
        { status: 403 }
      );
    }

    const supabaseAdmin = createAdminClient();

    // 2. Récupérer les informations du RP avant suppression pour les logs d'audit
    const { data: promoter } = await supabaseAdmin
      .from('promoters')
      .select('id, first_name, last_name, slug')
      .eq('id', id)
      .single();

    if (!promoter) {
      return NextResponse.json(
        { error: 'Promoteur introuvable.' },
        { status: 404 }
      );
    }

    // 3. Supprimer le promoteur (la cascade Postgres s'occupe des associations event_promoters)
    const { error: deleteError } = await supabaseAdmin
      .from('promoters')
      .delete()
      .eq('id', id);

    if (deleteError) {
      throw deleteError;
    }

    // 4. Log d'audit
    await supabaseAdmin.from('audit_logs').insert({
      user_id: user.id,
      action: 'PROMOTER_DELETED',
      entity_type: 'promoter',
      entity_id: id,
      metadata: {
        first_name: promoter.first_name,
        last_name: promoter.last_name,
        slug: promoter.slug,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Le promoteur ${promoter.first_name} ${promoter.last_name} a été supprimé.`,
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      { error: error?.message || 'Erreur lors de la suppression du promoteur.' },
      { status: 500 }
    );
  }
}
