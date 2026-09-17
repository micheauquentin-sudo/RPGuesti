'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { type Promoter, type ClubEvent } from '@/lib/types';
import { formatFrenchDate, calculateAttendanceRate } from '@/lib/utils';
import { 
  ArrowLeft, 
  Copy, 
  Check, 
  ExternalLink, 
  CheckSquare, 
  Users, 
  Trophy, 
  Percent, 
  Calendar,
  AlertCircle,
  Trash2,
  KeyRound,
  Send,
  CheckCircle2,
  Lock,
  Mail,
  X,
  Sparkles
} from 'lucide-react';
import { InstagramIcon } from '@/components/ui/InstagramIcon';

interface EventStat {
  event: ClubEvent;
  registrations: number;
  entries: number;
  rate: number;
}

interface ExtendedPromoter extends Promoter {
  email?: string | null;
  invite_token?: string | null;
}

export default function PromoterDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [promoter, setPromoter] = useState<ExtendedPromoter | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [totalRegs, setTotalRegs] = useState(0);
  const [totalEntries, setTotalEntries] = useState(0);
  const [eventStats, setEventStats] = useState<EventStat[]>([]);

  // Modales d'accès
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteUrl, setInviteUrl] = useState('');
  const [copiedInviteUrl, setCopiedInviteUrl] = useState(false);
  const [copiedInviteMsg, setCopiedInviteMsg] = useState(false);
  const [generatingInvite, setGeneratingInvite] = useState(false);

  const [directModalOpen, setDirectModalOpen] = useState(false);
  const [directEmail, setDirectEmail] = useState('');
  const [directPassword, setDirectPassword] = useState('');
  const [settingDirect, setSettingDirect] = useState(false);
  const [directMsg, setDirectMsg] = useState<string | null>(null);

  const supabase = createClient();
  const router = useRouter();

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Récupérer le promoteur
      const { data: pData, error: pError } = await supabase
        .from('promoters')
        .select('id, profile_id, first_name, last_name, slug, email, phone, instagram_handle, avatar_url, commission_per_entry, is_active, created_at, updated_at')
        .eq('id', id)
        .single();

      if (pError || !pData) throw new Error('Promoteur introuvable');
      setPromoter(pData);
      if (pData.email) setDirectEmail(pData.email);

      // 2. Récupérer les inscriptions du RP
      const { data: regs } = await supabase
        .from('registrations')
        .select('id, event_id, status')
        .eq('promoter_id', id)
        .eq('status', 'registered');

      // 3. Récupérer les entrées du RP
      const { data: entries } = await supabase
        .from('entries')
        .select('id, event_id, status, scanned_at')
        .eq('promoter_id', id)
        .eq('status', 'valid');

      const regsCount = regs?.length || 0;
      const entriesCount = entries?.length || 0;
      setTotalRegs(regsCount);
      setTotalEntries(entriesCount);

      // 4. Récupérer les événements
      const { data: allEvents } = await supabase
        .from('events')
        .select('*')
        .order('event_date', { ascending: false });

      const eStats: EventStat[] = (allEvents || []).map((ev) => {
        const evRegs = (regs || []).filter((r) => r.event_id === ev.id).length;
        const evEntries = (entries || []).filter((e) => e.event_id === ev.id).length;
        return {
          event: ev,
          registrations: evRegs,
          entries: evEntries,
          rate: calculateAttendanceRate(evEntries, evRegs),
        };
      }).filter(item => item.registrations > 0 || item.entries > 0);

      setEventStats(eStats);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const copyLink = () => {
    if (!promoter) return;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const fullUrl = `${origin}/rp/${promoter.slug}`;
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGenerateInvite = async () => {
    if (!promoter) return;
    setGeneratingInvite(true);
    try {
      const res = await fetch('/api/admin/promoters/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_invite',
          promoter_id: promoter.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur lors de la génération du lien.');

      setInviteUrl(data.invite_url);
      setInviteModalOpen(true);
      loadData();
    } catch (err: unknown) {
      const error = err as Error;
      alert(error.message || 'Erreur');
    } finally {
      setGeneratingInvite(false);
    }
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$';
    let res = '';
    for (let i = 0; i < 10; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setDirectPassword(res);
  };

  const handleSetDirectCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoter || !directEmail || !directPassword) return;
    setSettingDirect(true);
    setDirectMsg(null);

    try {
      const res = await fetch('/api/admin/promoters/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'set_credentials',
          promoter_id: promoter.id,
          email: directEmail.trim(),
          password: directPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');

      alert(`Les identifiants pour ${promoter.first_name} ont été enregistrés avec succès !`);
      setDirectModalOpen(false);
      setDirectPassword('');
      loadData();
    } catch (err: unknown) {
      const error = err as Error;
      setDirectMsg(error.message || 'Erreur lors de la configuration.');
    } finally {
      setSettingDirect(false);
    }
  };

  const handleDelete = async () => {
    if (!promoter) return;
    if (
      !confirm(
        `Êtes-vous certain de vouloir supprimer définitivement le RP ${promoter.first_name} ${promoter.last_name} ?\n\nCette action est irréversible et son lien personnel /rp/${promoter.slug} cessera de fonctionner.`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/promoters?id=${promoter.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur lors de la suppression');
      router.push('/admin/promoters');
      router.refresh();
    } catch (err: unknown) {
      const error = err as Error;
      alert(error?.message || 'Erreur lors de la suppression');
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-gray-500 text-xs">
        Chargement de la fiche RP...
      </div>
    );
  }

  if (!promoter) {
    return (
      <div className="p-8 bg-[#0f1118] border border-[#1d212f] rounded-3xl text-center">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-2" />
        <h2 className="text-lg font-bold text-white mb-2">Promoteur introuvable</h2>
        <Link href="/admin/promoters" className="text-xs text-[#e5b85c] hover:underline">
          Retour à la liste des RP
        </Link>
      </div>
    );
  }

  const attendanceRate = calculateAttendanceRate(totalEntries, totalRegs);

  return (
    <div className="space-y-6">
      {/* Top Bar avec retour et suppression */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin/promoters"
          className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retour aux promoteurs</span>
        </Link>

        <button
          onClick={handleDelete}
          className="py-2 px-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Supprimer ce RP</span>
        </button>
      </div>

      {/* Profil RP Card */}
      <div className="bg-[#0f1118] border border-[#1d212f] rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#1b1f2e] border border-[#2d334a] flex items-center justify-center font-black text-xl text-[#e5b85c] shadow-lg">
              {promoter.first_name[0]}{promoter.last_name[0]}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-white">
                  {promoter.first_name} {promoter.last_name}
                </h1>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                    promoter.is_active
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-gray-800 text-gray-400 border border-gray-700'
                  }`}
                >
                  {promoter.is_active ? 'Actif' : 'Inactif'}
                </span>
              </div>
              {promoter.instagram_handle && (
                <div className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                  <InstagramIcon className="w-3.5 h-3.5 text-[#e5b85c]" />
                  <span>@{promoter.instagram_handle}</span>
                </div>
              )}
            </div>
          </div>

          {/* Boîte Lien Permanent */}
          <div className="bg-[#141722] border border-[#232738] rounded-2xl p-3.5 flex items-center gap-3">
            <div>
              <p className="text-[10px] uppercase font-bold text-gray-400">Lien personnel permanent</p>
              <p className="font-mono text-xs text-[#e5b85c]">/rp/{promoter.slug}</p>
            </div>
            <button
              onClick={copyLink}
              className="py-2 px-3 bg-[#1e2232] hover:bg-[#272d42] border border-[#2f354c] rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copié</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copier</span>
                </>
              )}
            </button>
            <Link
              href={`/rp/${promoter.slug}`}
              target="_blank"
              className="p-2 bg-[#1e2232] hover:bg-[#272d42] border border-[#2f354c] rounded-xl text-gray-400 hover:text-white transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* ENCART ACCÈS & CONNEXION AU DASHBOARD RP */}
      <div className="bg-[#0f1118] border border-[#222738] rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <KeyRound className="w-5 h-5 text-[#e5b85c]" />
              <h2 className="text-base font-bold text-white">Accès & Espace Personnel du RP</h2>
            </div>
            <p className="text-xs text-gray-400">
              Permet au promoteur d&apos;accéder à son espace <span className="text-[#e5b85c] font-mono">/promoter</span> pour suivre ses entrées et son classement.
            </p>
          </div>

          {/* Statut du compte */}
          <div className="flex items-center gap-3">
            {promoter.profile_id ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Compte Actif & Relié</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold">
                <AlertCircle className="w-4 h-4" />
                <span>En attente d&apos;activation</span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-5 pt-5 border-t border-[#1d2232] flex flex-wrap items-center gap-3">
          {/* Bouton générer lien d'activation */}
          <button
            onClick={handleGenerateInvite}
            disabled={generatingInvite}
            className="py-2.5 px-4 bg-gradient-to-r from-[#e5b85c] to-[#d4a037] hover:from-[#f0c773] hover:to-[#e5b85c] text-black font-bold rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer shadow disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{generatingInvite ? 'Génération...' : 'Envoyer un lien d\'activation (WhatsApp)'}</span>
          </button>

          {/* Bouton définir mot de passe direct */}
          <button
            onClick={() => {
              setDirectModalOpen(true);
              setDirectMsg(null);
            }}
            className="py-2.5 px-4 bg-[#1a1e2d] hover:bg-[#23283c] border border-[#2b334a] text-gray-200 font-semibold rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5 text-[#e5b85c]" />
            <span>Définir / Changer le mot de passe manuellement</span>
          </button>
        </div>
      </div>

      {/* 4 Métriques RP */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#0f1118] border border-[#1d212f] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase text-gray-400">Inscriptions</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-3xl font-black text-white">{totalRegs}</div>
          <p className="text-[11px] text-gray-500 mt-1">Pass demandés via son lien</p>
        </div>

        <div className="bg-[#0f1118] border border-[#1d212f] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase text-gray-400">Entrées Réelles</span>
            <CheckSquare className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-emerald-400">{totalEntries}</div>
          <p className="text-[11px] text-gray-500 mt-1">Personnes entrées au club</p>
        </div>

        <div className="bg-[#0f1118] border border-[#1d212f] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase text-gray-400">Taux de présence</span>
            <Percent className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-3xl font-black text-white">{attendanceRate}%</div>
          <p className="text-[11px] text-gray-500 mt-1">Ratio entrées / inscrits</p>
        </div>

        <div className="bg-[#0f1118] border border-[#e5b85c]/30 rounded-2xl p-5 bg-gradient-to-br from-[#12141e] to-[#0f1118]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase text-[#e5b85c]">Points Concours</span>
            <Trophy className="w-4 h-4 text-[#e5b85c]" />
          </div>
          <div className="text-3xl font-black text-white">{totalEntries}</div>
          <p className="text-[11px] text-[#e5b85c]/70 mt-1">Basé à 100% sur les entrées</p>
        </div>
      </div>

      {/* Détail par soirée */}
      <div className="bg-[#0f1118] border border-[#1d212f] rounded-3xl p-6 shadow-xl">
        <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[#e5b85c]" />
          <span>Performances par soirée</span>
        </h2>

        {eventStats.length === 0 ? (
          <p className="text-gray-500 text-xs py-8 text-center">
            Aucune inscription ou entrée enregistrée pour ce RP sur les soirées.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#232738] text-gray-400 uppercase text-[10px] tracking-wider">
                  <th className="pb-3 font-semibold">Soirée</th>
                  <th className="pb-3 font-semibold">Date</th>
                  <th className="pb-3 font-semibold text-right">Inscrits</th>
                  <th className="pb-3 font-semibold text-right">Entrées</th>
                  <th className="pb-3 font-semibold text-right">Taux Présence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1b1f2e]">
                {eventStats.map((item) => (
                  <tr key={item.event.id} className="hover:bg-[#141722]/60">
                    <td className="py-3 font-bold text-white">
                      {item.event.name}
                    </td>
                    <td className="py-3 text-gray-400 capitalize">
                      {formatFrenchDate(item.event.event_date)}
                    </td>
                    <td className="py-3 text-right text-gray-300 font-medium">
                      {item.registrations}
                    </td>
                    <td className="py-3 text-right text-white font-bold">
                      {item.entries}
                    </td>
                    <td className="py-3 text-right font-black text-[#e5b85c]">
                      {item.rate}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL LIEN D'INVITATION */}
      {inviteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0f1118] border border-[#232738] rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#e5b85c]" />
                <h2 className="text-base font-bold text-white">Lien d&apos;activation généré !</h2>
              </div>
              <button
                onClick={() => setInviteModalOpen(false)}
                className="text-gray-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-gray-300">
              Lien sécurisé pour <strong>{promoter.first_name} {promoter.last_name}</strong> :
            </p>

            <div className="bg-[#141722] border border-[#24283a] rounded-xl p-3 flex items-center justify-between gap-2">
              <input
                type="text"
                readOnly
                value={inviteUrl}
                className="bg-transparent text-xs text-[#e5b85c] font-mono w-full focus:outline-none select-all"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(inviteUrl);
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
                {`Salut ${promoter.first_name} ! Voici ton lien officiel pour activer ton espace RP au Club ASTRA : ${inviteUrl}\n\nEntre simplement ton email et choisis ton mot de passe pour suivre tes entrées et ton classement en direct !`}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => {
                    const msg = `Salut ${promoter.first_name} ! Voici ton lien officiel pour activer ton espace RP au Club ASTRA : ${inviteUrl}\n\nEntre simplement ton email et choisis ton mot de passe pour suivre tes entrées et ton classement en direct !`;
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
                      `Salut ${promoter.first_name} ! Voici ton lien officiel pour activer ton espace RP au Club ASTRA : ${inviteUrl}\n\nEntre simplement ton email et choisis ton mot de passe pour suivre tes entrées et ton classement en direct !`
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

      {/* MODAL CONFIGURATION MANUELLE DU MOT DE PASSE */}
      {directModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0f1118] border border-[#232738] rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-[#e5b85c]" />
                <h2 className="text-base font-bold text-white">Définir un mot de passe direct</h2>
              </div>
              <button
                onClick={() => setDirectModalOpen(false)}
                className="text-gray-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-gray-300">
              Configurez manuellement l&apos;adresse email et le mot de passe pour <strong>{promoter.first_name} {promoter.last_name}</strong>.
            </p>

            {directMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{directMsg}</span>
              </div>
            )}

            <form onSubmit={handleSetDirectCredentials} className="space-y-4 text-xs">
              <div>
                <label className="block text-gray-300 font-semibold mb-1">Adresse Email *</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="email"
                    required
                    value={directEmail}
                    onChange={(e) => setDirectEmail(e.target.value)}
                    placeholder="email@exemple.com"
                    className="w-full pl-9 pr-3 py-2 bg-[#151822] border border-[#24283b] rounded-xl text-white focus:outline-none focus:border-[#e5b85c]"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-gray-300 font-semibold">Mot de passe * (min 6 car.)</label>
                  <button
                    type="button"
                    onClick={generateRandomPassword}
                    className="text-[10px] text-[#e5b85c] hover:underline cursor-pointer"
                  >
                    Générer aléatoire
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    required
                    minLength={6}
                    value={directPassword}
                    onChange={(e) => setDirectPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-3 py-2 bg-[#151822] border border-[#24283b] rounded-xl text-white font-mono focus:outline-none focus:border-[#e5b85c]"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDirectModalOpen(false)}
                  className="flex-1 py-2.5 bg-[#171a25] hover:bg-[#202534] text-gray-300 rounded-xl font-semibold cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={settingDirect}
                  className="flex-1 py-2.5 bg-[#e5b85c] text-black font-bold rounded-xl disabled:opacity-50 cursor-pointer shadow"
                >
                  {settingDirect ? 'Enregistrement...' : 'Enregistrer les accès'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
