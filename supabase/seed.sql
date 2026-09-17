-- =====================================================================
-- ASTRA RP — SEED DE DÉVELOPPEMENT
-- ATTENTION : Ces données sont destinées uniquement au test local.
-- =====================================================================

-- 1. RP de test
INSERT INTO public.promoters (id, first_name, last_name, instagram_handle, slug, is_active)
VALUES 
    ('11111111-1111-1111-1111-111111111111', 'Lucas', 'Bernard', 'lucas_astra', 'lucas', true),
    ('22222222-2222-2222-2222-222222222222', 'Emma', 'Moreau', 'emma.mru', 'emma', true),
    ('33333333-3333-3333-3333-333333333333', 'Tom', 'Leroy', 'tom_lry', 'tom', true),
    ('44444444-4444-4444-4444-444444444444', 'Chloé', 'Dubois', 'chloe.dbs', 'chloe', true),
    ('55555555-5555-5555-5555-555555555555', 'Maxime', 'Roux', 'maxime_rx', 'maxime', true),
    ('66666666-6666-6666-6666-666666666666', 'Léa', 'Fournier', 'lea_fnr', 'lea', true)
ON CONFLICT (slug) DO NOTHING;

-- 2. Événements de test
INSERT INTO public.events (id, name, slug, description, event_date, start_time, end_time, status)
VALUES 
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ASTRA — OPENING NIGHT', 'astra-opening-night', 'Soirée d''ouverture club ASTRA Orléans. Entrée gratuite sous présentation du QR code avant 01h00.', CURRENT_DATE + INTERVAL '2 days', '23:30:00', '06:00:00', 'published'),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'ASTRA CLUB — SATURDAY FEVER', 'astra-saturday-fever', 'Le rendez-vous incontournable du samedi soir.', CURRENT_DATE + INTERVAL '9 days', '23:30:00', '06:00:00', 'published')
ON CONFLICT (slug) DO NOTHING;

-- 3. Association RP aux événements
INSERT INTO public.event_promoters (event_id, promoter_id, is_active)
SELECT e.id, p.id, true
FROM public.events e
CROSS JOIN public.promoters p
ON CONFLICT (event_id, promoter_id) DO NOTHING;
