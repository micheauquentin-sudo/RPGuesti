-- =====================================================================
-- ASTRA RP — MIGRATION INITIALE DU SCHÉMA COMPLET
-- Club ASTRA Orléans — Système RP & Gestion des Entrées
-- =====================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. TABLE PROFILES (Liée aux utilisateurs Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'promoter' CHECK (role IN ('admin', 'staff', 'promoter')),
    first_name TEXT,
    last_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. TABLE PROMOTERS (RP permanents du club)
CREATE TABLE IF NOT EXISTS public.promoters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    instagram_handle TEXT,
    slug TEXT NOT NULL UNIQUE,
    avatar_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. TABLE EVENTS (Soirées du club)
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    event_date DATE NOT NULL,
    start_time TIME NOT NULL DEFAULT '23:30:00',
    end_time TIME NOT NULL DEFAULT '06:00:00',
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'closed', 'cancelled')),
    cover_image_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. TABLE EVENT_PROMOTERS (Association RP - Événement)
CREATE TABLE IF NOT EXISTS public.event_promoters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    promoter_id UUID NOT NULL REFERENCES public.promoters(id) ON DELETE CASCADE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_event_promoter UNIQUE (event_id, promoter_id)
);

-- 6. TABLE GUESTS (Invités sans création de compte)
CREATE TABLE IF NOT EXISTS public.guests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT,
    instagram_handle TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. TABLE REGISTRATIONS (Inscriptions avec QR token unique)
CREATE TABLE IF NOT EXISTS public.registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    promoter_id UUID NOT NULL REFERENCES public.promoters(id) ON DELETE CASCADE,
    guest_id UUID NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
    qr_token TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'registered' CHECK (status IN ('registered', 'cancelled')),
    registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    cancelled_at TIMESTAMPTZ
);

-- 8. TABLE ENTRIES (Entrées réellement scannées - BASE UNIQUE DU CLASSEMENT)
-- CONTRAINTE FONDAMENTALE : registration_id UNIQUE empêche tout double scan
CREATE TABLE IF NOT EXISTS public.entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    registration_id UUID NOT NULL UNIQUE REFERENCES public.registrations(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    promoter_id UUID NOT NULL REFERENCES public.promoters(id) ON DELETE CASCADE,
    guest_id UUID NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
    scanned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    scanned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    status TEXT NOT NULL DEFAULT 'valid' CHECK (status IN ('valid', 'cancelled'))
);

-- 9. TABLE AUDIT_LOGS (Journalisation des opérations sensibles)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. INDEXES POUR LA PERFORMANCE MOBILE
CREATE INDEX IF NOT EXISTS idx_promoters_slug ON public.promoters(slug);
CREATE INDEX IF NOT EXISTS idx_events_date_status ON public.events(event_date, status);
CREATE INDEX IF NOT EXISTS idx_registrations_token ON public.registrations(qr_token);
CREATE INDEX IF NOT EXISTS idx_registrations_event_guest ON public.registrations(event_id, guest_id);
CREATE INDEX IF NOT EXISTS idx_registrations_promoter ON public.registrations(promoter_id);
CREATE INDEX IF NOT EXISTS idx_entries_promoter_year ON public.entries(promoter_id, scanned_at);
CREATE INDEX IF NOT EXISTS idx_entries_event ON public.entries(event_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- 11. HELPER FUNCTIONS POUR RLS
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin'
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_staff_or_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role IN ('admin', 'staff')
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 12. FONCTION CHECK-IN ATOMIQUE SÉCURISÉE (Scan à l'entrée)
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
        p.first_name AS promoter_first_name,
        p.last_name AS promoter_last_name
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
            'promoter_name', v_reg.promoter_first_name || ' ' || v_reg.promoter_last_name,
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
            'promoter_name', v_reg.promoter_first_name || ' ' || v_reg.promoter_last_name
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'status', 'VALID',
        'message', 'ENTRÉE VALIDÉE',
        'entry_id', v_new_entry_id,
        'guest_name', v_reg.guest_first_name || ' ' || v_reg.guest_last_name,
        'promoter_name', v_reg.promoter_first_name || ' ' || v_reg.promoter_last_name,
        'event_name', v_reg.event_name,
        'scanned_at', now()
    );
END;
$$;

-- 13. TRIGGER POUR NOUVEAU PROFIL AUTH
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, role, first_name, last_name)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'role', 'promoter'),
        new.raw_user_meta_data->>'first_name',
        new.raw_user_meta_data->>'last_name'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 14. ROW LEVEL SECURITY (RLS) ACTIVATION
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promoters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_promoters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- POLICIES PROFILES
CREATE POLICY "Profiles lecture par proprietaire ou staff" 
ON public.profiles FOR SELECT 
USING (auth.uid() = id OR public.is_staff_or_admin());

CREATE POLICY "Profiles modifiable par admin" 
ON public.profiles FOR ALL 
USING (public.is_admin());

-- POLICIES PROMOTERS
-- Public : lecture de tous les RP actifs (nécessaire pour /rp/[slug])
CREATE POLICY "Lecture publique des RP actifs" 
ON public.promoters FOR SELECT 
USING (is_active = true OR public.is_staff_or_admin());

CREATE POLICY "Admin gestion totale des RP" 
ON public.promoters FOR ALL 
USING (public.is_admin());

-- POLICIES EVENTS
-- Public : lecture des événements publiés
CREATE POLICY "Lecture publique des événements publiés" 
ON public.events FOR SELECT 
USING (status = 'published' OR public.is_staff_or_admin());

CREATE POLICY "Admin gestion totale des événements" 
ON public.events FOR ALL 
USING (public.is_admin());

-- POLICIES EVENT_PROMOTERS
CREATE POLICY "Lecture publique des associations event-rp" 
ON public.event_promoters FOR SELECT 
USING (true);

CREATE POLICY "Admin gestion event-rp" 
ON public.event_promoters FOR ALL 
USING (public.is_admin());

-- POLICIES GUESTS
CREATE POLICY "Creation guest autorisee" 
ON public.guests FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Lecture guests par admin et staff" 
ON public.guests FOR SELECT 
USING (public.is_staff_or_admin());

CREATE POLICY "Admin modification guests" 
ON public.guests FOR ALL 
USING (public.is_admin());

-- POLICIES REGISTRATIONS
CREATE POLICY "Creation registration autorisee" 
ON public.registrations FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Lecture registration par token pour pass invité" 
ON public.registrations FOR SELECT 
USING (true);

CREATE POLICY "Admin et staff gestion registrations" 
ON public.registrations FOR ALL 
USING (public.is_staff_or_admin());

-- POLICIES ENTRIES
CREATE POLICY "Lecture entries staff et admin" 
ON public.entries FOR SELECT 
USING (public.is_staff_or_admin());

CREATE POLICY "RP lecture de ses propres entries anonymisees" 
ON public.entries FOR SELECT 
USING (
    promoter_id IN (
        SELECT id FROM public.promoters WHERE profile_id = auth.uid()
    )
);

CREATE POLICY "Creation entries par staff et admin" 
ON public.entries FOR INSERT 
WITH CHECK (public.is_staff_or_admin());

-- POLICIES AUDIT_LOGS
CREATE POLICY "Admin lecture audit logs" 
ON public.audit_logs FOR SELECT 
USING (public.is_admin());

CREATE POLICY "Insertion audit logs par staff et admin" 
ON public.audit_logs FOR INSERT 
WITH CHECK (public.is_staff_or_admin());
