-- =====================================================================
-- ASTRA RP — MIGRATION : PSEUDO / NOM DE SCÈNE DU RP
-- Migration: 20260918000006_add_promoter_pseudo.sql
-- =====================================================================

-- 1. Ajout de la colonne pseudo (optionnelle) sur promoters
ALTER TABLE public.promoters 
  ADD COLUMN IF NOT EXISTS pseudo TEXT;

-- 2. Index pour recherche rapide éventuelle
CREATE INDEX IF NOT EXISTS idx_promoters_pseudo 
  ON public.promoters(lower(pseudo)) 
  WHERE pseudo IS NOT NULL;

-- 3. Mise à jour de la fonction check_in_guest pour renvoyer le pseudo prioritaire au scanner
CREATE OR REPLACE FUNCTION public.check_in_guest(
    p_qr_token TEXT,
    p_scanned_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_reg RECORD;
    v_entry RECORD;
    v_new_entry_id UUID;
BEGIN
    -- 1. Recherche et verrouillage de ligne de l'inscription pour atomicité
    SELECT 
        r.id AS reg_id,
        r.status AS reg_status,
        r.event_id,
        r.promoter_id,
        r.guest_id,
        e.name AS event_name,
        e.event_date,
        e.status AS event_status,
        g.first_name AS guest_first_name,
        g.last_name AS guest_last_name,
        COALESCE(NULLIF(p.pseudo, ''), p.first_name || ' ' || p.last_name) AS promoter_display_name
    INTO v_reg
    FROM public.registrations r
    JOIN public.events e ON e.id = r.event_id
    JOIN public.guests g ON g.id = r.guest_id
    JOIN public.promoters p ON p.id = r.promoter_id
    WHERE r.qr_token = p_qr_token
    FOR UPDATE OF r;

    -- Cas 1 : QR introuvable
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'status', 'NOT_FOUND',
            'message', 'QR code inconnu ou invalide'
        );
    END IF;

    -- Cas 2 : Inscription annulée
    IF v_reg.reg_status = 'cancelled' THEN
        RETURN jsonb_build_object(
            'success', false,
            'status', 'CANCELLED',
            'message', 'Cette inscription a été annulée',
            'guest_name', v_reg.guest_first_name || ' ' || v_reg.guest_last_name
        );
    END IF;

    -- Cas 3 : Événement non actif
    IF v_reg.event_status IN ('cancelled', 'draft') THEN
        RETURN jsonb_build_object(
            'success', false,
            'status', 'EVENT_NOT_ACTIVE',
            'message', 'Soirée non active ou annulée',
            'event_name', v_reg.event_name
        );
    END IF;

    -- Cas 4 : Déjà scanné ?
    SELECT 
        en.id,
        en.scanned_at,
        pr.first_name AS scanner_first_name,
        pr.last_name AS scanner_last_name
    INTO v_entry
    FROM public.entries en
    LEFT JOIN public.profiles pr ON pr.id = en.scanned_by
    WHERE en.registration_id = v_reg.reg_id;

    IF FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'status', 'ALREADY_USED',
            'message', 'QR DÉJÀ UTILISÉ',
            'scanned_at', v_entry.scanned_at,
            'scanned_by', COALESCE(v_entry.scanner_first_name || ' ' || v_entry.scanner_last_name, 'Staff'),
            'guest_name', v_reg.guest_first_name || ' ' || v_reg.guest_last_name,
            'promoter_name', v_reg.promoter_display_name,
            'event_name', v_reg.event_name
        );
    END IF;

    -- Cas 5 : Validation réussie ! Insertion atomique
    INSERT INTO public.entries (
        registration_id,
        event_id,
        promoter_id,
        guest_id,
        scanned_by,
        scanned_at,
        status
    ) VALUES (
        v_reg.reg_id,
        v_reg.event_id,
        v_reg.promoter_id,
        v_reg.guest_id,
        p_scanned_by,
        now(),
        'valid'
    ) RETURNING id INTO v_new_entry_id;

    -- Log d'audit
    INSERT INTO public.audit_logs (
        user_id,
        action,
        entity_type,
        entity_id,
        metadata
    ) VALUES (
        p_scanned_by,
        'CHECK_IN_SUCCESS',
        'entry',
        v_new_entry_id::text,
        jsonb_build_object(
            'registration_id', v_reg.reg_id,
            'event_name', v_reg.event_name,
            'guest_name', v_reg.guest_first_name || ' ' || v_reg.guest_last_name,
            'promoter_name', v_reg.promoter_display_name
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'status', 'VALID',
        'message', 'ENTRÉE VALIDÉE',
        'entry_id', v_new_entry_id,
        'guest_name', v_reg.guest_first_name || ' ' || v_reg.guest_last_name,
        'promoter_name', v_reg.promoter_display_name,
        'event_name', v_reg.event_name,
        'scanned_at', now()
    );
END;
$$;
