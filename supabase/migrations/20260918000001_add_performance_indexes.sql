-- =====================================================================
-- ASTRA RP — MIGRATION : INDEXES ET CONTRAINTES ADDITIONNELS
-- Performance et intégrité des données
-- =====================================================================

-- Index partiel sur guests.phone pour les recherches rapides
-- (partiel car le phone est nullable)
CREATE INDEX IF NOT EXISTS idx_guests_phone
  ON public.guests(phone)
  WHERE phone IS NOT NULL;

-- Index sur guests par nom+prénom pour la déduplication
CREATE INDEX IF NOT EXISTS idx_guests_names
  ON public.guests(lower(first_name), lower(last_name));
