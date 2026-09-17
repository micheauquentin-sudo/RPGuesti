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
  AlertCircle,
  Trash2,
  KeyRound,
  Send,
  Share2,
  Lock,
  Mail,
  CheckCircle2,
  X
} from 'lucide-react';
import { InstagramIcon } from '@/components/ui/InstagramIcon';

interface PromoterWithStats extends Promoter {
  registrations_count: number;
  entries_count: number;
  entries_this_year: number;
  email?: string | null;
  invite_token?: string | null;
}

interface InviteModalInfo {
  promoterName: string;
  slug: string;
  inviteUrl: string;
  email?: string | null;
}

interface DirectModalInfo {
  promoterName: string;
  slug: string;
  email: string;
  password: string;
}

export default function AdminPromotersPage() {
  const [promoters, setPromoters] = useState<PromoterWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  // Modal création
  const [modalOpen, setModalOpen] = useState(false);
  const [creationMode, setCreationMode] = useState<'invite' | 'direct'>('invite');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [instagram, setInstagram] = useState('');
  const [customSlug, setCustomSlug] = useState('');
  const [autoSlug, setAutoSlug] = useState(true);
  const [promoterEmail, setPromoterEmail] = useState('');
  const [promoterPassword, setPromoterPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modales de succès d'accès
  const [inviteModalData, setInviteModalData] = useState<InviteModalInfo | null>(null);
  const [copiedInviteUrl, setCopiedInviteUrl] = useState(false);
  const [copiedInviteMsg, setCopiedInviteMsg] = useState(false);

  const [directModalData, setDirectModalData] = useState<DirectModalInfo | null>(null);
  const [copiedDirectCreds, setCopiedDirectCreds] = useState(false);

  const supabase = createClient();
  const currentYear = new Date().getFullYear();
  const yearStart = `${currentYear}-01-01T00:00:00Z`;

  const loadPromoters = async () => {
    setLoading(true);
    try {
      // 1. Récupérer tous les promoteurs
      const { data: pList, error: pError } = await supabase
        .from('promoters')
        .select('id, profile_id, first_name, last_name, slug, email, phone, instagram_handle, avatar_url, commission_per_entry, is_active, created_at, updated_at')
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

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$';
    let res = '';
    for (let i = 0; i < 10; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPromoterPassword(res);
  };

  const handleCreatePromoter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !customSlug) return;
    if (creationMode === 'direct' && (!promoterEmail || !promoterPassword)) {
      setErrorMsg('Veuillez renseigner un email et un mot de passe.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const cleanSlug = slugify(customSlug);
      const cleanInsta = instagram.trim().replace(/^@/, '');
      const cleanEmail = promoterEmail.trim().toLowerCase() || null;

      // 1. Créer la fiche promoter
      const { data: newPromoter, error: insertError } = await supabase
        .from('promoters')
        .insert({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          instagram_handle: cleanInsta || null,
          slug: cleanSlug,
          email: cleanEmail,
          is_active: true,
        })
        .select()
        .single();

      if (insertError) {
        if (insertError.code === '23505') {
          throw new Error('Ce slug existe déjà. Choisissez un autre identifiant unique.');
        }
        throw insertError;
      }

      // 2. Traitement selon le mode d'accès
      if (creationMode === 'invite') {
        // Générer le lien d'invitation
        const inviteRes = await fetch('/api/admin/promoters/invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'generate_invite',
            promoter_id: newPromoter.id,
          }),
        });
        const inviteData = await inviteRes.json();
        if (!inviteRes.ok) throw new Error(inviteData.error || 'Erreur lors de la génération du lien');

        setModalOpen(false);
        resetForm();
        loadPromoters();

        // Ouvrir modale de succès avec le lien
        setInviteModalData({
          promoterName: `${newPromoter.first_name} ${newPromoter.last_name}`,
          slug: newPromoter.slug,
          inviteUrl: inviteData.invite_url,
          email: cleanEmail,
        });
      } else {
        // Mode direct : créer le compte Auth
        const credsRes = await fetch('/api/admin/promoters/invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'set_credentials',
            promoter_id: newPromoter.id,
            email: cleanEmail,
            password: promoterPassword,
          }),
        });
        const credsData = await credsRes.json();
        if (!credsRes.ok) throw new Error(credsData.error || 'Erreur lors de la création des identifiants');

        setModalOpen(false);
        resetForm();
        loadPromoters();

        // Ouvrir modale de succès direct
        setDirectModalData({
          promoterName: `${newPromoter.first_name} ${newPromoter.last_name}`,
          slug: newPromoter.slug,
          email: cleanEmail!,
          password: promoterPassword,
        });
      }
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMsg(error?.message || 'Erreur lors de la création');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setInstagram('');
    setCustomSlug('');
    setPromoterEmail('');
    setPromoterPassword('');
    setCreationMode('invite');
    setErrorMsg(null);
  };

  // Génération rapide de lien d'invitation pour un RP existant
  const handleQuickInvite = async (p: PromoterWithStats) => {
    try {
      const inviteRes = await fetch('/api/admin/promoters/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_invite',
          promoter_id: p.id,
        }),
      });
      const inviteData = await inviteRes.json();
      if (!inviteRes.ok) throw new Error(inviteData.error || 'Erreur');

      setInviteModalData({
        promoterName: `${p.first_name} ${p.last_name}`,
        slug: p.slug,
        inviteUrl: inviteData.invite_url,
        email: p.email,
      });
    } catch (err: unknown) {
      const error = err as Error;
      alert(error.message || 'Impossible de générer le lien d\'invitation.');
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

  const handleDeletePromoter = async (promoter: PromoterWithStats) => {
    if (
      !confirm(
        `Supprimer définitivement le RP ${promoter.first_name} ${promoter.last_name} ?\n\nAttention : son lien /rp/${promoter.slug} cessera immédiatement de fonctionner.`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/promoters?id=${promoter.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors de la suppression');
      }
      setPromoters((prev) => prev.filter((p) => p.id !== promoter.id));
    } catch (err: unknown) {
      const error = err as Error;
      alert(error?.message || 'Erreur lors de la suppression');
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
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Users className="w-7 h-7 text-[#e5b85c]" />
            <span>Promoteurs & RP</span>
          </h1>
          <p className="text-gray-400 text-xs mt-1">
            Gérez votre équipe de relations publiques, leurs liens personnalisés et leurs accès.
          </p>
        </div>

        <button
          onClick={() => {
            resetForm();
            setModalOpen(true);
          }}
          className="py-2.5 px-4 bg-gradient-to-r from-[#e5b85c] to-[#d4a037] hover:from-[#f0c773] hover:to-[#e5b85c] text-black font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-lg cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Nouveau RP</span>
        </button>
      </div>

      {/* Barre de recherche */}
      <div className="bg-[#0f1118] border border-[#1d212f] rounded-2xl p-4 flex items-center gap-3">
        <Search className="w-4 h-4 text-gray-500 shrink-0" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Rechercher un RP par son nom, prénom, slug ou compte Instagram..."
          className="bg-transparent border-none text-white text-xs w-full focus:outline-none placeholder-gray-500"
        />
      </div>

      {/* Tableau des RP */}
      <div className="bg-[#0f1118] border border-[#1d212f] rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#1d212f] bg-[#121520] text-gray-400 uppercase text-[10px] tracking-wider">
                <th className="py-3.5 px-5 font-semibold">RP / Nom</th>
                <th className="py-3.5 px-5 font-semibold">Lien Permanent</th>
                <th className="py-3.5 px-4 font-semibold text-center">Compte & Accès</th>
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

                    {/* Compte & Accès */}
                    <td className="py-4 px-4 text-center">
                      <div className="inline-flex flex-col items-center gap-1">
                        {p.profile_id ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Compte Actif
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            En attente
                          </span>
                        )}
                        {!p.is_active && (
                          <span className="text-[9px] text-gray-500 uppercase">Désactivé</span>
                        )}
                      </div>
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
                        {/* Bouton invitation / accès */}
                        <button
                          onClick={() => handleQuickInvite(p)}
                          title="Générer un lien d'activation / inviter le RP"
                          className="p-1.5 rounded-lg bg-[#1e2335] hover:bg-[#2a3048] border border-[#2e3752] text-[#e5b85c] hover:text-white transition-colors cursor-pointer"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                        </button>

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
                          className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                            p.is_active
                              ? 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20'
                              : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                          }`}
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeletePromoter(p)}
                          title="Supprimer définitivement ce RP"
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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
          <div className="bg-[#0f1118] border border-[#232738] rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#e5b85c]" />
                <h2 className="text-lg font-bold text-white">Ajouter un nouveau RP</h2>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-gray-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Onglets Choix du mode d'accès */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-[#141722] border border-[#202536] rounded-xl mb-5 text-xs">
              <button
                type="button"
                onClick={() => setCreationMode('invite')}
                className={`py-2 px-3 rounded-lg font-semibold transition-all cursor-pointer ${
                  creationMode === 'invite'
                    ? 'bg-[#e5b85c] text-black shadow'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Lien d&apos;activation (Recommandé)
              </button>
              <button
                type="button"
                onClick={() => setCreationMode('direct')}
                className={`py-2 px-3 rounded-lg font-semibold transition-all cursor-pointer ${
                  creationMode === 'direct'
                    ? 'bg-[#e5b85c] text-black shadow'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Mot de passe direct
              </button>
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
                <label className="block font-semibold text-gray-300 mb-1">Compte Instagram (optionnel)</label>
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
              </div>

              {/* CHAMPS SPÉCIFIQUES SELON LE MODE */}
              {creationMode === 'invite' ? (
                <div className="p-3.5 bg-[#141722] border border-[#202536] rounded-2xl space-y-2">
                  <p className="text-[11px] text-gray-300 font-medium">
                    ⚡ <strong>Lien d&apos;activation sans mot de passe</strong>
                  </p>
                  <p className="text-[10px] text-gray-400 leading-relaxed">
                    Un lien sécurisé unique sera généré à la création. Vous pourrez le copier ou l&apos;envoyer sur WhatsApp en 1 clic. Le RP entrera son email et choisira son mot de passe pour activer son espace.
                  </p>
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-400 mb-1">
                      Email de référence (optionnel, pré-rempli sur sa page)
                    </label>
                    <input
                      type="email"
                      value={promoterEmail}
                      onChange={(e) => setPromoterEmail(e.target.value)}
                      placeholder="lucas@exemple.com"
                      className="w-full px-3 py-2 bg-[#181b28] border border-[#272d42] rounded-xl text-white text-xs focus:outline-none focus:border-[#e5b85c]"
                    />
                  </div>
                </div>
              ) : (
                <div className="p-3.5 bg-[#141722] border border-[#202536] rounded-2xl space-y-3">
                  <p className="text-[11px] text-gray-300 font-medium">
                    🔑 <strong>Identifiants de connexion immédiats</strong>
                  </p>
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-300 mb-1">
                      Adresse Email de connexion *
                    </label>
                    <input
                      type="email"
                      required
                      value={promoterEmail}
                      onChange={(e) => setPromoterEmail(e.target.value)}
                      placeholder="lucas@exemple.com"
                      className="w-full px-3 py-2 bg-[#181b28] border border-[#272d42] rounded-xl text-white text-xs focus:outline-none focus:border-[#e5b85c]"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[10px] font-semibold text-gray-300">
                        Mot de passe * (min 6 car.)
                      </label>
                      <button
                        type="button"
                        onClick={generateRandomPassword}
                        className="text-[10px] text-[#e5b85c] hover:underline cursor-pointer"
                      >
                        Générer aléatoire
                      </button>
                    </div>
                    <input
                      type="text"
                      required
                      minLength={6}
                      value={promoterPassword}
                      onChange={(e) => setPromoterPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full px-3 py-2 bg-[#181b28] border border-[#272d42] rounded-xl text-white font-mono text-xs focus:outline-none focus:border-[#e5b85c]"
                    />
                  </div>
                </div>
              )}

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
                  {submitting ? 'Création...' : creationMode === 'invite' ? 'Créer & Générer Lien' : 'Créer & Activer Compte'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL SUCCÈS : LIEN D'ACTIVATION RP */}
      {inviteModalData && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0f1118] border border-[#232738] rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <h2 className="text-base font-bold text-white">Lien d&apos;activation prêt !</h2>
              </div>
              <button
                onClick={() => setInviteModalData(null)}
                className="text-gray-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-gray-300">
              Lien sécurisé pour <strong>{inviteModalData.promoterName}</strong> :
            </p>

            <div className="bg-[#141722] border border-[#24283a] rounded-xl p-3 flex items-center justify-between gap-2">
              <input
                type="text"
                readOnly
                value={inviteModalData.inviteUrl}
                className="bg-transparent text-xs text-[#e5b85c] font-mono w-full focus:outline-none select-all"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(inviteModalData.inviteUrl);
                  setCopiedInviteUrl(true);
                  setTimeout(() => setCopiedInviteUrl(false), 2000);
                }}
                className="py-1.5 px-3 bg-[#1e2335] hover:bg-[#282f48] text-white rounded-lg text-xs font-semibold shrink-0 cursor-pointer"
              >
                {copiedInviteUrl ? 'Copié !' : 'Copier'}
              </button>
            </div>

            {/* Message WhatsApp pré-rédigé */}
            <div className="space-y-2 pt-1">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                Message WhatsApp prêt à envoyer :
              </p>
              <div className="p-3 bg-[#12141e] border border-[#1e2230] rounded-xl text-xs text-gray-300 whitespace-pre-line leading-relaxed font-sans">
                {`Salut ${inviteModalData.promoterName.split(' ')[0]} ! Voici ton lien officiel pour activer ton espace RP au Club ASTRA : ${inviteModalData.inviteUrl}\n\nEntre simplement ton email et choisis ton mot de passe pour suivre tes entrées et ton classement en direct !`}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => {
                    const msg = `Salut ${inviteModalData.promoterName.split(' ')[0]} ! Voici ton lien officiel pour activer ton espace RP au Club ASTRA : ${inviteModalData.inviteUrl}\n\nEntre simplement ton email et choisis ton mot de passe pour suivre tes entrées et ton classement en direct !`;
                    navigator.clipboard.writeText(msg);
                    setCopiedInviteMsg(true);
                    setTimeout(() => setCopiedInviteMsg(false), 2000);
                  }}
                  className="flex-1 py-2.5 bg-[#1a1e2c] hover:bg-[#23283b] text-gray-200 border border-[#2b3248] rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedInviteMsg ? 'Message copié !' : 'Copier message'}</span>
                </button>

                <button
                  onClick={() => {
                    const msg = encodeURIComponent(
                      `Salut ${inviteModalData.promoterName.split(' ')[0]} ! Voici ton lien officiel pour activer ton espace RP au Club ASTRA : ${inviteModalData.inviteUrl}\n\nEntre simplement ton email et choisis ton mot de passe pour suivre tes entrées et ton classement en direct !`
                    );
                    window.open(`https://wa.me/?text=${msg}`, '_blank');
                  }}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Envoyer WhatsApp</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL SUCCÈS : IDENTIFIANTS DIRECTS */}
      {directModalData && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0f1118] border border-[#232738] rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <h2 className="text-base font-bold text-white">Compte RP créé & activé !</h2>
              </div>
              <button
                onClick={() => setDirectModalData(null)}
                className="text-gray-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-gray-300">
              Identifiants de connexion pour <strong>{directModalData.promoterName}</strong> :
            </p>

            <div className="bg-[#141722] border border-[#24283a] rounded-xl p-3.5 space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-gray-400">Email :</span>
                <span className="text-white font-bold">{directModalData.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Mot de passe :</span>
                <span className="text-[#e5b85c] font-bold">{directModalData.password}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-[#232738] text-[11px]">
                <span className="text-gray-400">Lien connexion :</span>
                <span className="text-gray-300">/login</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://rp-guesti.vercel.app';
                  const text = `Salut ${directModalData.promoterName.split(' ')[0]} ! Voici tes accès RP pour le club ASTRA :\n\nLien : ${origin}/login\nEmail : ${directModalData.email}\nMot de passe : ${directModalData.password}\n\nTon lien public pour tes invités : ${origin}/rp/${directModalData.slug}`;
                  navigator.clipboard.writeText(text);
                  setCopiedDirectCreds(true);
                  setTimeout(() => setCopiedDirectCreds(false), 2000);
                }}
                className="w-full py-2.5 bg-[#e5b85c] text-black font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copiedDirectCreds ? 'Identifiants copiés !' : 'Copier les accès complets'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
