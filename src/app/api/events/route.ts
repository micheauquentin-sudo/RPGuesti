import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { slugify } from '@/lib/utils';

// Helper pour vérifier que l'utilisateur est admin
async function verifyAdmin() {
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
  if (!user) return null;

  const { data: profile } = await supabaseUser
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') return null;
  return user;
}

// 1. MODIFIER UN ÉVÉNEMENT (PUT)
export async function PUT(request: Request) {
  try {
    const adminUser = await verifyAdmin();
    if (!adminUser) {
      return NextResponse.json(
        { error: 'Action réservée aux administrateurs.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, name, event_date, start_time, end_time, status, description, cover_image_url } = body;

    if (!id || !name || !event_date) {
      return NextResponse.json(
        { error: 'ID, nom et date sont requis.' },
        { status: 400 }
      );
    }

    const supabaseAdmin = createAdminClient();

    const updateData: Record<string, unknown> = {
      name: name.trim(),
      event_date,
      start_time: start_time.includes(':') && start_time.split(':').length === 2 ? `${start_time}:00` : start_time,
      end_time: end_time.includes(':') && end_time.split(':').length === 2 ? `${end_time}:00` : end_time,
      status: status || 'published',
      description: description?.trim() || null,
      cover_image_url: cover_image_url?.trim() || null,
      updated_at: new Date().toISOString(),
    };

    const { data: updatedEvent, error } = await supabaseAdmin
      .from('events')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Log d'audit
    await supabaseAdmin.from('audit_logs').insert({
      user_id: adminUser.id,
      action: 'EVENT_UPDATED',
      entity_type: 'event',
      entity_id: id,
      metadata: {
        name: updatedEvent.name,
        date: updatedEvent.event_date,
        status: updatedEvent.status,
      },
    });

    return NextResponse.json({
      success: true,
      event: updatedEvent,
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      { error: error?.message || 'Erreur lors de la modification de la soirée.' },
      { status: 500 }
    );
  }
}

// 2. SUPPRIMER UN ÉVÉNEMENT (DELETE)
export async function DELETE(request: Request) {
  try {
    const adminUser = await verifyAdmin();
    if (!adminUser) {
      return NextResponse.json(
        { error: 'Action réservée aux administrateurs.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Identifiant de la soirée manquant.' },
        { status: 400 }
      );
    }

    const supabaseAdmin = createAdminClient();

    // Récupérer le nom de la soirée pour les logs
    const { data: event } = await supabaseAdmin
      .from('events')
      .select('id, name, event_date')
      .eq('id', id)
      .single();

    if (!event) {
      return NextResponse.json({ error: 'Soirée introuvable.' }, { status: 404 });
    }

    // Suppression (Postgres supprime en cascade les event_promoters, registrations et entries associées)
    const { error: deleteError } = await supabaseAdmin
      .from('events')
      .delete()
      .eq('id', id);

    if (deleteError) {
      throw deleteError;
    }

    // Log d'audit
    await supabaseAdmin.from('audit_logs').insert({
      user_id: adminUser.id,
      action: 'EVENT_DELETED',
      entity_type: 'event',
      entity_id: id,
      metadata: {
        name: event.name,
        event_date: event.event_date,
      },
    });

    return NextResponse.json({
      success: true,
      message: `La soirée ${event.name} a été supprimée.`,
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      { error: error?.message || 'Erreur lors de la suppression de la soirée.' },
      { status: 500 }
    );
  }
}
