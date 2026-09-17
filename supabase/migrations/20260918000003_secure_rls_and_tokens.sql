-- =====================================================================
-- ASTRA RP — SECURING RLS POLICIES & SEPARATING INVITE TOKENS
-- Migration: 20260918000003_secure_rls_and_tokens.sql
-- =====================================================================

-- 1. TABLE DÉDIÉE ET PRIVÉE POUR LES TOKENS D'INVITATION RP
-- Ne jamais stocker de tokens dans la table publique `promoters`
CREATE TABLE IF NOT EXISTS public.promoter_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promoter_id UUID NOT NULL REFERENCES public.promoters(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Activation du Row Level Security : AUCUNE policy pour anon ni authenticated
-- Seul le backend (service_role) peut lire et écrire cette table
ALTER TABLE public.promoter_invites ENABLE ROW LEVEL SECURITY;

-- Migration des éventuels tokens existants
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'promoters' AND column_name = 'invite_token'
  ) THEN
    INSERT INTO public.promoter_invites (promoter_id, token, expires_at)
    SELECT id, invite_token, COALESCE(invite_expires_at, now() + interval '7 days')
    FROM public.promoters
    WHERE invite_token IS NOT NULL
    ON CONFLICT (token) DO NOTHING;

    ALTER TABLE public.promoters DROP COLUMN IF EXISTS invite_token CASCADE;
    ALTER TABLE public.promoters DROP COLUMN IF EXISTS invite_expires_at CASCADE;
  END IF;
END $$;

-- 2. SUPPRESSION DE L'INSERT ANONYME DIRECT SUR LES TABLES SENSIBLES
-- Les inscriptions doivent obligatoirement transiter par /api/register (validé, assaini et rate-limité)
DROP POLICY IF EXISTS "Creation guest autorisee" ON public.guests;
DROP POLICY IF EXISTS "Creation registration autorisee" ON public.registrations;

-- 3. VERROUILLAGE DE LA LECTURE DES REGISTRATIONS
-- Supprime la lecture publique complète (anciennement USING (true))
DROP POLICY IF EXISTS "Lecture registration par token pour pass invité" ON public.registrations;

-- Permet aux RP de consulter uniquement leurs propres inscriptions (ou staff/admin)
DROP POLICY IF EXISTS "RP lecture de ses propres registrations" ON public.registrations;
CREATE POLICY "RP lecture de ses propres registrations"
ON public.registrations FOR SELECT
USING (
    promoter_id IN (
        SELECT id FROM public.promoters WHERE profile_id = auth.uid()
    ) OR public.is_staff_or_admin()
);

-- Assure la gestion complète par staff et admin
DROP POLICY IF EXISTS "Admin et staff gestion registrations" ON public.registrations;
CREATE POLICY "Admin et staff gestion registrations" 
ON public.registrations FOR ALL 
USING (public.is_staff_or_admin());
