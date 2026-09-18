-- =====================================================================
-- ASTRA RP — MIGRATION : BLACKLIST, VUES LIENS RP, ET PASS DUO
-- Migration: 20260918000005_add_views_blacklist_duo_pass.sql
-- =====================================================================

-- 1. Sécurité physionomiste / portier : Signalement & Blacklist invités
ALTER TABLE public.guests 
  ADD COLUMN IF NOT EXISTS is_blacklisted BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS blacklist_reason TEXT;

-- Index partiel sur les invités signalés pour filtrage immédiat
CREATE INDEX IF NOT EXISTS idx_guests_blacklisted 
  ON public.guests(is_blacklisted) 
  WHERE is_blacklisted = true;

-- 2. Compteur d'audience / vues sur les liens personnalisés des RP
ALTER TABLE public.promoters 
  ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0;

-- 3. Métadonnées d'inscriptions Duo / Accompagnant
ALTER TABLE public.registrations 
  ADD COLUMN IF NOT EXISTS is_duo BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS companion_name TEXT;

-- 4. Champs optionnels profil RP (téléphone & commission)
ALTER TABLE public.promoters 
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS commission_per_entry NUMERIC DEFAULT 0;
