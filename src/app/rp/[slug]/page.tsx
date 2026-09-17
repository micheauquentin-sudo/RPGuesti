'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { type ClubEvent, type Promoter } from '@/lib/types';
import { formatFrenchDate, formatFrenchTime } from '@/lib/utils';
import { Sparkles, Calendar, Clock, ArrowRight, AlertCircle, CheckCircle2, UserCheck } from 'lucide-react';
import { InstagramIcon } from '@/components/ui/InstagramIcon';

export default function PromoterPublicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const router = useRouter();

  const [promoter, setPromoter] = useState<Promoter | null>(null);
  const [currentEvent, setCurrentEvent] = useState<ClubEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Formulaire (Prénom & Nom uniquement pour inscription 100% rapide)
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setErrorMsg(null);
      const supabase = createClient();

      try {
        // 1. Récupérer le promoteur actif par son slug
        const { data: pData, error: pError } = await supabase
          .from('promoters')
          .select('*')
          .eq('slug', slug.toLowerCase())
          .eq('is_active', true)
          .maybeSingle();

        if (pError || !pData) {
          setErrorMsg('Promoteur introuvable ou inactif.');
          setLoading(false);
          return;
        }
        setPromoter(pData);

        // 2. Récupérer la prochaine soirée publiée
        const { data: eData } = await supabase
          .from('events')
          .select('*')
          .eq('status', 'published')
          .gte('event_date', new Date().toISOString().split('T')[0])
          .order('event_date', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (eData) {
          setCurrentEvent(eData);
        }
      } catch (err: unknown) {
        const error = err as Error;
        setErrorMsg(error?.message || 'Erreur lors du chargement.');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentEvent || !promoter) return;

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promoter_slug: promoter.slug,
          event_id: currentEvent.id,
          first_name: firstName,
          last_name: lastName,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors de l’inscription.');
      }

      // Rediriger vers la page du QR code
      router.push(`/qr/${data.qr_token}`);
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMsg(error?.message || 'Une erreur est survenue.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#08090d]">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-12 h-12 rounded-full border-2 border-[#e5b85c] border-t-transparent animate-spin" />
          <p className="text-gray-400 text-sm font-medium">Chargement de la soirée ASTRA...</p>
        </div>
      </div>
    );
  }

  if (!promoter) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#08090d] text-center">
        <div className="max-w-md p-8 bg-[#0f1118] border border-[#1d212f] rounded-2xl">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Lien RP introuvable</h1>
          <p className="text-gray-400 text-sm mb-6">
            Ce lien personnel ne correspond à aucun promoteur actif du club ASTRA.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 bg-[#08090d] text-gray-100">
      {/* Glow background accent */}
      <div className="fixed top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-[#e5b85c]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        {/* Header Official ASTRA Transparent Logo + RP */}
        <div className="text-center mb-6">
          <div className="flex flex-col items-center justify-center mb-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/astra-logo.png"
              alt="ASTRA Logo Officiel"
              className="w-28 sm:w-36 h-auto object-contain drop-shadow-[0_12px_28px_rgba(229,184,92,0.25)] animate-in fade-in zoom-in-95 duration-500"
            />
            <p className="text-[11px] uppercase tracking-widest text-[#e5b85c] font-black mt-2">
              ORLÉANS
            </p>
          </div>

          {/* Badges RP Inviteur */}
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-[#121522] border border-[#232738] text-xs shadow-lg">
            {promoter.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={promoter.avatar_url}
                alt={`${promoter.first_name} ${promoter.last_name}`}
                className="w-8 h-8 rounded-full object-cover border border-[#e5b85c]"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[#1b1f2e] border border-[#2e354c] flex items-center justify-center text-[#e5b85c] font-black text-xs">
                {promoter.first_name.charAt(0)}{promoter.last_name.charAt(0)}
              </div>
            )}
            <div className="text-left">
              <span className="text-gray-400 block text-[10px] uppercase font-semibold">Pass RP Officiel</span>
              <span className="text-white font-bold">{promoter.first_name} {promoter.last_name}</span>
            </div>
            {promoter.instagram_handle && (
              <span className="text-gray-500 flex items-center gap-1 border-l border-gray-700 pl-2">
                <InstagramIcon className="w-3 h-3 text-[#e5b85c]" />
                @{promoter.instagram_handle}
              </span>
            )}
          </div>
        </div>

        {/* Soirée disponible */}
        {currentEvent ? (
          <div className="bg-[#0f1118] border border-[#1d212f] rounded-3xl overflow-hidden shadow-2xl backdrop-blur-xl">
            {/* BANDEAU ENTRÉE 100% GRATUITE HAUTE VISIBILITÉ */}
            <div className="bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-500 text-black py-3.5 px-4 text-center font-black shadow-[0_0_25px_rgba(16,185,129,0.35)] flex flex-col items-center justify-center gap-1 border-b-2 border-emerald-300">
              <div className="flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4 text-black shrink-0 animate-pulse" />
                <span className="text-xs sm:text-sm font-black tracking-widest uppercase">
                  ENTRÉE 100% GRATUITE
                </span>
                <Sparkles className="w-4 h-4 text-black shrink-0 animate-pulse" />
              </div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider bg-black text-emerald-300 px-3 py-0.5 rounded-full">
                PASS INVITÉ COUPE-FILE
              </span>
            </div>

            {/* Event Poster adapté (9:16 / 4:5 / 4:3 centré avec ambiance lumineuse sans coupure) */}
            {currentEvent.cover_image_url && (
              <div className="relative w-full overflow-hidden border-b border-[#232738] bg-[#07080c] flex items-center justify-center min-h-[220px]">
                {/* Lueur d'ambiance floue dérivée de l'affiche */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={currentEvent.cover_image_url}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-40 scale-110 pointer-events-none"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0f1118] via-transparent to-black/60 z-0" />

                {/* Affiche nette centrée à ratio préservé */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={currentEvent.cover_image_url}
                  alt={currentEvent.name}
                  className="relative z-10 w-full max-h-[380px] sm:max-h-[440px] object-contain mx-auto drop-shadow-2xl"
                />

                <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-20">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/80 backdrop-blur-md border border-[#e5b85c]/40 shadow">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/astra-logo.png" alt="ASTRA" className="w-3.5 h-3.5 object-contain" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#e5b85c]">
                      ORLÉANS
                    </span>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500 text-black shadow">
                    100% Gratuit
                  </span>
                </div>
              </div>
            )}

            <div className="p-6 sm:p-7">
              {/* Titre & Date Soirée */}
              <h2 className="text-xl font-bold text-white mb-3">
                {currentEvent.name}
              </h2>

              <div className="space-y-1.5 mb-5 text-sm text-gray-300">
                <div className="flex items-center gap-2.5">
                  <Calendar className="w-4 h-4 text-[#e5b85c]" />
                  <span className="capitalize">{formatFrenchDate(currentEvent.event_date)}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-[#e5b85c]" />
                  <span>{formatFrenchTime(currentEvent.start_time)} → {formatFrenchTime(currentEvent.end_time)}</span>
                </div>
              </div>

              {/* CONSIGNE D'ARRIVÉE AU CLUB BIEN EN GROS */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#e5b85c]/20 via-[#e5b85c]/10 to-[#e5b85c]/20 border border-[#e5b85c]/50 text-center mb-5 shadow-sm">
                <p className="text-[10px] font-black uppercase text-[#e5b85c] tracking-widest mb-1">
                  ⚠️ CONSIGNE À L&apos;ARRIVÉE
                </p>
                <p className="text-xs sm:text-sm font-black text-white uppercase tracking-tight">
                  DEMANDEZ UNE ENTRÉE ASTRA À L&apos;ARRIVÉE AU CLUB
                </p>
              </div>

              {currentEvent.description && (
                <p className="text-xs text-gray-400 mb-5 line-clamp-2 bg-[#141622] p-3 rounded-xl border border-[#202434]">
                  {currentEvent.description}
                </p>
              )}

              {errorMsg && (
                <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Formulaire Ultra-Frictionless (Prénom & Nom uniquement) */}
              <form onSubmit={handleSubmit} className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                      Prénom *
                    </label>
                    <input
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Lucas"
                      className="w-full px-3.5 py-2.5 bg-[#141722] border border-[#232738] rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-[#e5b85c]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                      Nom *
                    </label>
                    <input
                      type="text"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Bernard"
                      className="w-full px-3.5 py-2.5 bg-[#141722] border border-[#232738] rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-[#e5b85c]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full mt-4 py-4 px-4 bg-gradient-to-r from-[#e5b85c] to-[#d4a037] hover:from-[#f0c773] hover:to-[#e5b85c] text-black font-black rounded-xl transition-all shadow-xl flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-sm uppercase tracking-wider active:scale-98"
                >
                  {submitting ? (
                    <span className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-black border-t-transparent" />
                  ) : (
                    <>
                      <span>Obtenir mon entrée gratuite</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              <p className="text-[11px] text-center text-gray-500 mt-4">
                Billet nominatif officiel • Entrée 100% gratuite garantie
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-[#0f1118] border border-[#1d212f] rounded-2xl p-8 text-center">
            <Calendar className="w-10 h-10 text-gray-500 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-white mb-2">Aucune soirée en cours</h2>
            <p className="text-gray-400 text-sm">
              Revenez très vite sur ce lien pour réserver votre prochaine entrée ASTRA avec {promoter.first_name}.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
