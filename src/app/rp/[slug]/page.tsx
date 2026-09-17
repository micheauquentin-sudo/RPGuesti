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

  // Formulaire
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [instagram, setInstagram] = useState('');
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
          phone,
          instagram_handle: instagram,
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
        {/* Header ASTRA + RP */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#0f1118] border border-[#232738] mb-3 shadow-xl">
            <Sparkles className="w-7 h-7 text-[#e5b85c]" />
          </div>
          <h1 className="text-2xl font-black tracking-widest text-white uppercase">
            ASTRA
          </h1>
          <p className="text-[11px] uppercase tracking-widest text-[#e5b85c] font-semibold">
            Club Privé — Orléans
          </p>

          {/* Badges RP */}
          <div className="mt-3 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#151822] border border-[#232738] text-xs">
            <UserCheck className="w-3.5 h-3.5 text-[#e5b85c]" />
            <span className="text-gray-300 font-medium">
              Invité par <strong className="text-white">{promoter.first_name} {promoter.last_name}</strong>
            </span>
            {promoter.instagram_handle && (
              <span className="text-gray-500 flex items-center gap-1 border-l border-gray-700 pl-2">
                <InstagramIcon className="w-3 h-3" />
                @{promoter.instagram_handle}
              </span>
            )}
          </div>
        </div>

        {/* Soirée disponible */}
        {currentEvent ? (
          <div className="bg-[#0f1118] border border-[#1d212f] rounded-3xl p-6 sm:p-7 shadow-2xl backdrop-blur-xl">
            {/* Tag Entrée Gratuite */}
            <div className="flex items-center justify-between mb-4">
              <span className="px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Entrée Gratuite
              </span>
              <span className="text-[11px] text-gray-400 font-medium">
                Accès Prioritaire QR
              </span>
            </div>

            {/* Titre & Date Soirée */}
            <h2 className="text-xl font-bold text-white mb-3">
              {currentEvent.name}
            </h2>

            <div className="space-y-1.5 mb-6 text-sm text-gray-300">
              <div className="flex items-center gap-2.5">
                <Calendar className="w-4 h-4 text-[#e5b85c]" />
                <span className="capitalize">{formatFrenchDate(currentEvent.event_date)}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-[#e5b85c]" />
                <span>{formatFrenchTime(currentEvent.start_time)} → {formatFrenchTime(currentEvent.end_time)}</span>
              </div>
            </div>

            {currentEvent.description && (
              <p className="text-xs text-gray-400 mb-6 line-clamp-2 bg-[#141620] p-3 rounded-xl border border-[#202434]">
                {currentEvent.description}
              </p>
            )}

            {errorMsg && (
              <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Formulaire Frictionless */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
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
                  <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
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

              <div>
                <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                  Téléphone <span className="text-gray-500 text-[10px] normal-case">(facultatif)</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="06 12 34 56 78"
                  className="w-full px-3.5 py-2.5 bg-[#141722] border border-[#232738] rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-[#e5b85c]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                  Instagram <span className="text-gray-500 text-[10px] normal-case">(facultatif)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-sm">@</span>
                  <input
                    type="text"
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value)}
                    placeholder="votre_pseudo"
                    className="w-full pl-8 pr-3.5 py-2.5 bg-[#141722] border border-[#232738] rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-[#e5b85c]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-4 py-3.5 px-4 bg-gradient-to-r from-[#e5b85c] to-[#d4a037] hover:from-[#f0c773] hover:to-[#e5b85c] text-black font-extrabold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-sm uppercase tracking-wider"
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
              Génération instantanée de votre QR code • Sans création de compte
            </p>
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
