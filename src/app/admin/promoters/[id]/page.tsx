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
  Trash2
} from 'lucide-react';
import { InstagramIcon } from '@/components/ui/InstagramIcon';

interface EventStat {
  event: ClubEvent;
  registrations: number;
  entries: number;
  rate: number;
}

export default function PromoterDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [promoter, setPromoter] = useState<Promoter | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [totalRegs, setTotalRegs] = useState(0);
  const [totalEntries, setTotalEntries] = useState(0);
  const [eventStats, setEventStats] = useState<EventStat[]>([]);

  const supabase = createClient();

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        // 1. Récupérer le promoteur
        const { data: pData, error: pError } = await supabase
          .from('promoters')
          .select('*')
          .eq('id', id)
          .single();

        if (pError || !pData) throw new Error('Promoteur introuvable');
        setPromoter(pData);

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
    }

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

  const router = useRouter();

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
    </div>
  );
}
