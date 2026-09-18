-- =====================================================================
-- ASTRA RP — TABLE DE RETOURS / AVIS POST-SOIRÉE (BAROMÈTRE AMBIANCE)
-- Migration: 20260918000004_create_guest_feedbacks.sql
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.guest_feedbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID REFERENCES public.registrations(id) ON DELETE SET NULL,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  guest_id UUID REFERENCES public.guests(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  tags TEXT[] DEFAULT '{}',
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index de performance pour lecture par événement et inscription
CREATE INDEX IF NOT EXISTS idx_guest_feedbacks_event_id ON public.guest_feedbacks(event_id);
CREATE INDEX IF NOT EXISTS idx_guest_feedbacks_registration_id ON public.guest_feedbacks(registration_id);
CREATE INDEX IF NOT EXISTS idx_guest_feedbacks_created_at ON public.guest_feedbacks(created_at DESC);

-- Sécurité RLS
ALTER TABLE public.guest_feedbacks ENABLE ROW LEVEL SECURITY;

-- Lecture autorisée uniquement pour l'équipe admin & staff
DROP POLICY IF EXISTS "Staff lecture feedbacks" ON public.guest_feedbacks;
CREATE POLICY "Staff lecture feedbacks" ON public.guest_feedbacks
  FOR SELECT USING (public.is_staff_or_admin());

-- Insertion et mise à jour gérées exclusivement par /api/feedback via service_role
