import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateQrToken } from '@/lib/utils';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { promoter_slug, event_id, first_name, last_name, phone, instagram_handle } = body;

    if (!promoter_slug || !event_id || !first_name || !last_name) {
      return NextResponse.json(
        { error: 'Prénom, nom, RP et soirée sont requis.' },
        { status: 400 }
      );
    }

    const trimmedFirstName = first_name.trim();
    const trimmedLastName = last_name.trim();
    const cleanPhone = phone?.trim() || null;
    const cleanInstagram = instagram_handle?.trim().replace(/^@/, '') || null;

    const supabase = createAdminClient();

    // 1. Vérifier le RP
    const { data: promoter, error: promoterError } = await supabase
      .from('promoters')
      .select('id, first_name, last_name, is_active')
      .eq('slug', promoter_slug)
      .single();

    if (promoterError || !promoter || !promoter.is_active) {
      return NextResponse.json(
        { error: 'Ce promoteur est introuvable ou inactif.' },
        { status: 404 }
      );
    }

    // 2. Vérifier l'événement
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, name, status, event_date')
      .eq('id', event_id)
      .single();

    if (eventError || !event || event.status !== 'published') {
      return NextResponse.json(
        { error: 'Cette soirée n’est plus ouverte aux inscriptions.' },
        { status: 400 }
      );
    }

    // 3. Rechercher ou créer l'invité
    let guestId: string | null = null;

    // Si téléphone renseigné, rechercher par téléphone en priorité
    if (cleanPhone) {
      const { data: existingGuestPhone } = await supabase
        .from('guests')
        .select('id')
        .eq('phone', cleanPhone)
        .maybeSingle();

      if (existingGuestPhone) {
        guestId = existingGuestPhone.id;
      }
    }

    // Sinon rechercher par nom + prénom insensible à la casse
    if (!guestId) {
      const { data: existingGuestName } = await supabase
        .from('guests')
        .select('id')
        .ilike('first_name', trimmedFirstName)
        .ilike('last_name', trimmedLastName)
        .maybeSingle();

      if (existingGuestName) {
        guestId = existingGuestName.id;
      }
    }

    // Si toujours pas trouvé, créer l'invité
    if (!guestId) {
      const { data: newGuest, error: createGuestError } = await supabase
        .from('guests')
        .insert({
          first_name: trimmedFirstName,
          last_name: trimmedLastName,
          phone: cleanPhone,
          instagram_handle: cleanInstagram,
        })
        .select('id')
        .single();

      if (createGuestError || !newGuest) {
        throw new Error('Impossible d’enregistrer vos informations invité.');
      }
      guestId = newGuest.id;
    }

    // 4. RÈGLE ANTI-DOUBLON ABSOLUE :
    // Vérifier si cet invité est déjà inscrit pour cet événement (même RP ou RP différent)
    const { data: existingReg } = await supabase
      .from('registrations')
      .select('qr_token, promoter_id, status')
      .eq('event_id', event.id)
      .eq('guest_id', guestId)
      .eq('status', 'registered')
      .maybeSingle();

    if (existingReg) {
      // L'invité est déjà inscrit : on préserve le 1er RP et on lui restitue son QR token
      return NextResponse.json({
        success: true,
        already_registered: true,
        qr_token: existingReg.qr_token,
        message: 'Vous êtes déjà inscrit pour cette soirée. Voici votre QR code d’accès.',
      });
    }

    // 5. Générer un token unique cryptographique
    const qr_token = generateQrToken();

    // 6. Insérer l'inscription
    const { data: newReg, error: regError } = await supabase
      .from('registrations')
      .insert({
        event_id: event.id,
        promoter_id: promoter.id,
        guest_id: guestId,
        qr_token,
        status: 'registered',
      })
      .select('id, qr_token')
      .single();

    if (regError || !newReg) {
      throw new Error('Erreur lors de la génération de l’inscription.');
    }

    // Log d'audit
    await supabase.from('audit_logs').insert({
      action: 'GUEST_REGISTRATION',
      entity_type: 'registration',
      entity_id: newReg.id,
      metadata: {
        event_id: event.id,
        event_name: event.name,
        promoter_id: promoter.id,
        guest_id: guestId,
      },
    });

    return NextResponse.json({
      success: true,
      already_registered: false,
      qr_token: newReg.qr_token,
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      { error: error?.message || 'Une erreur inattendue est survenue.' },
      { status: 500 }
    );
  }
}
