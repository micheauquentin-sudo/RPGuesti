'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { type Promoter } from '@/lib/types';
import { slugify } from '@/lib/utils';
import { 
  Users, 
  UserPlus, 
  Copy, 
  Check, 
  ExternalLink, 
  Power, 
  Search, 
  BarChart3,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { InstagramIcon } from '@/components/ui/InstagramIcon';

interface PromoterWithStats extends Promoter {
  registrations_count: number;
  entries_count: number;
  entries_this_year: number;
}

export default function AdminPromotersPage() {
  const [promoters, setPromoters] = useState<PromoterWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  // Modal création
  const [modalOpen, setModalOpen] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [instagram, setInstagram] = useState('');
  const [customSlug, setCustomSlug] = useState('');
  const [autoSlug, setAutoSlug] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const supabase = createClient();
  const currentYear = new Date().getFullYear();
  const yearStart = `${currentYear}-01-01T00:00:00Z`;

  const loadPromoters = async () => {
    setLoading(true);
    try {
      // 1. Récupérer tous les promoteurs
      const { data: pList, error: pError } = await supabase
        .from('promoters')
        .select('*')
        .order('created_at', { ascending: false });

      if (pError) throw pError;

      // 2. Récupérer les stats (inscriptions et entrées)
      const { data: regCounts } = await supabase
        .from('registrations')
        .select('promoter_id, status')
        .eq('status', 'registered');

      const { data: entryCounts } = await supabase
        .from('entries')
        .select('promoter_id, scanned_at, status')
        .eq('status', 'valid');

      const statsMap: Record<string, { regs: number; entries: number; yearEntries: number }> = {};

      (regCounts || []).forEach((r) => {
        if (!statsMap[r.promoter_id]) {
          statsMap[r.promoter_id] = { regs: 0, entries: 0, yearEntries: 0 };
        }
        statsMap[r.promoter_id].regs += 1;
      });

      (entryCounts || []).forEach((e) => {
        if (!statsMap[e.promoter_id]) {
          statsMap[e.promoter_id] = { regs: 0, entries: 0, yearEntries: 0 };
        }
        statsMap[e.promoter_id].entries += 1;
        if (new Date(e.scanned_at) >= new Date(yearStart)) {
          statsMap[e.promoter_id].yearEntries += 1;
        }
      });

      const enriched: PromoterWithStats[] = (pList || []).map((p) => ({
        ...p,
        registrations_count: statsMap[p.id]?.regs || 0,
        entries_count: statsMap[p.id]?.entries || 0,
        entries_this_year: statsMap[p.id]?.yearEntries || 0,
      }));

      setPromoters(enriched);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPromoters();
  }, []);

  // Slug automatique quand on tape le nom
  useEffect(() => {
    if (autoSlug) {
      const generated = slugify(`${firstName} ${lastName}`);
      setCustomSlug(generated);
    }
  }, [firstName, lastName, autoSlug]);

  const handleCreatePromoter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !customSlug) return;
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const cleanSlug = slugify(customSlug);
      const cleanInsta = instagram.trim().replace(/^@/, '');

      const { error } = await supabase.from('promoters').insert({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        instagram_handle: cleanInsta || null,
        slug: cleanSlug,
        is_active: true,
      });

      if (error) {
        if (error.code === '23505') {
          throw new Error('Ce slug existe déjà. Choisissez un autre identifiant unique.');
        }
        throw error;
      }

      setModalOpen(false);
      setFirstName('');
      setLastName('');
      setInstagram('');
      setCustomSlug('');
      loadPromoters();
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMsg(error?.message || 'Erreur lors de la création');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (promoter: PromoterWithStats) => {
    const nextStatus = !promoter.is_active;
    const { error } = await supabase
      .from('promoters')
      .update({ is_active: nextStatus, updated_at: new Date().toISOString() })
      .eq('id', promoter.id);

    if (!error) {
      setPromoters((prev) =>
        prev.map((p) => (p.id === promoter.id ? { ...p, is_active: nextStatus } : p))
      );
    }
  };

  const copyPromoterLink = (slug: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const fullUrl = `${origin}/rp/${slug}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  const filteredPromoters = promoters.filter((p) => {
    const q = searchQuery.toLowerCase();
    return (
      p.first_name.toLowerCase().includes(q) ||
      p.last_name.toLowerCase().includes(q) ||
      p.slug.toLowerCase().includes(q) ||
      (p.instagram_handle && p.instagram_handle.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-wider">
            Promoteurs RP
          </h1>
          <p className="text-gray-400 text-xs sm:text-sm mt-1">
            Gestion des liens permanents, attribution des inscriptions et performance au concours.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="py-2.5 px-4 bg-[#e5b85c] hover:bg-[#f0c773] text-black font-extrabold rounded-xl text-xs flex items-center gap-2 shadow-lg transition-all cursor-pointer self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>Ajouter un RP</span>
        </button>
      </div>

      {/* Barre de recherche */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Rechercher un RP par nom, slug, Instagram..."
          className="w-full pl-10 pr-4 py-2.5 bg-[#0f1118] border border-[#1d212f] rounded-xl text-white text-xs placeholder-gray-500 focus:outline-none focus:border-[#e5b85c]"
        />
      </div>

      {/* Table des RP */}
      <div className="bg-[#0f1118] border border-[#1d212f] rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#1d212f] bg-[#121520] text-gray-400 uppercase text-[10px] tracking-wider">
                <th className="py-3.5 px-5 font-semibold">RP / Nom</th>
                <th className="py-3.5 px-5 font-semibold">Lien Permanent</th>
                <th className="py-3.5 px-4 font-semibold text-center">Statut</th>
                <th className="py-3.5 px-4 font-semibold text-right">Inscriptions</th>
                <th className="py-3.5 px-4 font-semibold text-right">Entrées Totales</th>
                <th className="py-3.5 px-4 font-semibold text-right text-[#e5b85c]">Cette Année</th>
                <th className="py-3.5 px-5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#181b28]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-500">
                    Chargement des promoteurs...
                  </td>
                </tr>
              ) : filteredPromoters.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-500">
                    Aucun promoteur trouvé.
                  </td>
                </tr>
              ) : (
                filteredPromoters.map((p) => (
                  <tr key={p.id} className="hover:bg-[#141722]/80 transition-colors">
                    {/* Nom + Instagram */}
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#1b1f2e] border border-[#2d334a] flex items-center justify-center font-bold text-xs text-[#e5b85c]">
                          {p.first_name[0]}{p.last_name[0]}
                        </div>
                        <div>
                          <div className="font-bold text-white text-sm">
                            {p.first_name} {p.last_name}
                          </div>
                          {p.instagram_handle && (
                            <span className="text-[11px] text-gray-400 flex items-center gap-1">
                              <InstagramIcon className="w-3 h-3 text-[#e5b85c]" />
                              @{p.instagram_handle}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Lien permanent copiable */}
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-gray-300 text-[11px] bg-[#141722] px-2.5 py-1 rounded-lg border border-[#232738]">
                          /rp/{p.slug}
                        </span>
                        <button
                          onClick={() => copyPromoterLink(p.slug)}
                          title="Copier le lien d'invitation"
                          className="p-1.5 rounded-lg bg-[#1a1d2b] hover:bg-[#252a3d] text-gray-300 hover:text-white transition-colors cursor-pointer"
                        >
                          {copiedSlug === p.slug ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <Link
                          href={`/rp/${p.slug}`}
                          target="_blank"
                          title="Tester la page publique"
                          className="p-1.5 rounded-lg bg-[#1a1d2b] hover:bg-[#252a3d] text-gray-400 hover:text-[#e5b85c] transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </td>

                    {/* Statut */}
                    <td className="py-4 px-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                          p.is_active
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-gray-800 text-gray-400 border border-gray-700'
                        }`}
                      >
                        {p.is_active ? 'Actif' : 'Inactif'}
                      </span>
                    </td>

                    {/* Inscriptions */}
                    <td className="py-4 px-4 text-right font-medium text-gray-300">
                      {p.registrations_count}
                    </td>

                    {/* Entrées validées */}
                    <td className="py-4 px-4 text-right font-bold text-white">
                      {p.entries_count}
                    </td>

                    {/* Cette Année (Points concours) */}
                    <td className="py-4 px-4 text-right font-black text-sm text-[#e5b85c]">
                      {p.entries_this_year}
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/admin/promoters/${p.id}`}
                          title="Statistiques détaillées"
                          className="p-1.5 rounded-lg bg-[#171a25] hover:bg-[#202534] border border-[#232738] text-gray-300 hover:text-white"
                        >
                          <BarChart3 className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          onClick={() => toggleStatus(p)}
                          title={p.is_active ? 'Désactiver le RP' : 'Réactiver le RP'}
                          className={`p-1.5 rounded-lg border transition-colors ${
                            p.is_active
                              ? 'bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500/20'
                              : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                          }`}
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Création RP */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0f1118] border border-[#232738] rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-[#e5b85c]" />
              <h2 className="text-lg font-bold text-white">Ajouter un nouveau RP</h2>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreatePromoter} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-300 mb-1">Prénom *</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Lucas"
                    className="w-full px-3 py-2 bg-[#151822] border border-[#24283b] rounded-xl text-white focus:outline-none focus:border-[#e5b85c]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-300 mb-1">Nom *</label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Bernard"
                    className="w-full px-3 py-2 bg-[#151822] border border-[#24283b] rounded-xl text-white focus:outline-none focus:border-[#e5b85c]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-300 mb-1">Compte Instagram</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">@</span>
                  <input
                    type="text"
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value)}
                    placeholder="lucas_astra"
                    className="w-full pl-7 pr-3 py-2 bg-[#151822] border border-[#24283b] rounded-xl text-white focus:outline-none focus:border-[#e5b85c]"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-gray-300">Slug URL Unique *</label>
                  <label className="flex items-center gap-1.5 text-[10px] text-gray-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoSlug}
                      onChange={(e) => setAutoSlug(e.target.checked)}
                      className="rounded"
                    />
                    <span>Générer auto</span>
                  </label>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-mono text-[11px]">
                    /rp/
                  </span>
                  <input
                    type="text"
                    required
                    readOnly={autoSlug}
                    value={customSlug}
                    onChange={(e) => setCustomSlug(e.target.value)}
                    placeholder="lucas-bernard"
                    className="w-full pl-11 pr-3 py-2 bg-[#151822] border border-[#24283b] rounded-xl text-white font-mono focus:outline-none focus:border-[#e5b85c]"
                  />
                </div>
                <p className="text-[10px] text-gray-500 mt-1">
                  Ce lien sera permanent et fonctionnera pour toutes les soirées ASTRA.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-2.5 bg-[#171a25] hover:bg-[#202534] text-gray-300 rounded-xl font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-[#e5b85c] text-black font-bold rounded-xl disabled:opacity-50"
                >
                  {submitting ? 'Création...' : 'Créer le RP'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
