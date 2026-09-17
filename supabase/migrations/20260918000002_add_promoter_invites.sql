-- =====================================================================
-- ASTRA RP — MIGRATION : INVITATIONS ET ACCÈS RP
-- Ajout des champs pour les liens d'activation sans mot de passe
-- =====================================================================

-- 1. Colonnes d'invitation sur la table promoters
ALTER TABLE public.promoters 
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS invite_token TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS invite_expires_at TIMESTAMPTZ;

-- 2. Index pour recherche ultra-rapide par token d'invitation
CREATE INDEX IF NOT EXISTS idx_promoters_invite_token 
  ON public.promoters(invite_token) 
  WHERE invite_token IS NOT NULL;
