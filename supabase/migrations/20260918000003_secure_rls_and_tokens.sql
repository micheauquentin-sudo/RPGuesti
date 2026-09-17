-- =====================================================================
-- ASTRA RP — SECURING RLS POLICIES & TOKEN PRIVACY
-- Migration: 20260918000003_secure_rls_and_tokens.sql
-- =====================================================================

-- 1. REVOKE SELECT on sensitive columns in public.promoters
-- Empêche le scraping des tokens d'invitation par des utilisateurs anonymes ou connectés
REVOKE SELECT (invite_token, invite_expires_at) ON public.promoters FROM anon, authenticated;

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
