'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { type LeaderboardItem, type ClubEvent } from '@/lib/types';
import { calculateAttendanceRate } from '@/lib/utils';
import { 
  Trophy, 
  Filter, 
  ArrowUpRight, 
  Sparkles, 
  Download 
} from 'lucide-react';
import { InstagramIcon } from '@/components/ui/InstagramIcon';

export default function AdminLeaderboardPage() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedEventId, setSelectedEventId] = useState<string>('all');

  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    async function loadEvents() {
      const { data } = await supabase
        .from('events')
        .select('*')
        .order('event_date', { ascending: false });
      if (data) setEvents(data);
    }
    loadEvents();
  }, []);

  useEffect(() => {
    async function computeLeaderboard() {
      setLoading(true);
      try {
        // 1. Récupérer tous les RP
        const { data: promoters } = await supabase
          .from('promoters')
          .select('*');

        if (!promoters) return;

        // 2. Construire la requête sur entries avec filtres
        let entryQuery = supabase
          .from('entries')
          .select('promoter_id, scanned_at, event_id')
          .eq('status', 'valid');

        // Filtre événement spécifique ou par date
        if (selectedEventId !== 'all') {
          entryQuery = entryQuery.eq('event_id', selectedEventId);
        } else {
          // Filtrer par année
          const startYear = `${selectedYear}-01-01T00:00:00Z`;
          const endYear = `${selectedYear}-12-31T23:59:59Z`;
          entryQuery = entryQuery.gte('scanned_at', startYear).lte('scanned_at', endYear);

          // Filtrer par mois si spécifié
          if (selectedMonth !== 'all') {
            const m = parseInt(selectedMonth);
            const startMonth = new Date(Date.UTC(selectedYear, m, 1)).toISOString();
            const endMonth = new Date(Date.UTC(selectedYear, m + 1, 0, 23, 59, 59)).toISOString();
            entryQuery = entryQuery.gte('scanned_at', startMonth).lte('scanned_at', endMonth);
          }
        }

        const { data: entries } = await entryQuery;

        // 3. Récupérer les inscriptions pour le taux de présence
        let regQuery = supabase
          .from('registrations')
          .select('promoter_id, registered_at, event_id')
          .eq('status', 'registered');

        if (selectedEventId !== 'all') {
          regQuery = regQuery.eq('event_id', selectedEventId);
        } else {
          const startYear = `${selectedYear}-01-01T00:00:00Z`;
          const endYear = `${selectedYear}-12-31T23:59:59Z`;
          regQuery = regQuery.gte('registered_at', startYear).lte('registered_at', endYear);
          if (selectedMonth !== 'all') {
            const m = parseInt(selectedMonth);
            const startMonth = new Date(Date.UTC(selectedYear, m, 1)).toISOString();
            const endMonth = new Date(Date.UTC(selectedYear, m + 1, 0, 23, 59, 59)).toISOString();
            regQuery = regQuery.gte('registered_at', startMonth).lte('registered_at', endMonth);
          }
        }

        const { data: regs } = await regQuery;

        // 4. Agréger les données strictement
        const entryCountMap: Record<string, number> = {};
        (entries || []).forEach((e) => {
          entryCountMap[e.promoter_id] = (entryCountMap[e.promoter_id] || 0) + 1;
        });

        const regCountMap: Record<string, number> = {};
        (regs || []).forEach((r) => {
          regCountMap[r.promoter_id] = (regCountMap[r.promoter_id] || 0) + 1;
        });

        // 5. Construire le tableau de classement trié par entries_count
        const items: LeaderboardItem[] = promoters.map((p) => {
          const eCount = entryCountMap[p.id] || 0;
          const rCount = regCountMap[p.id] || 0;
          return {
            promoter_id: p.id,
            first_name: p.first_name,
            last_name: p.last_name,
            pseudo: p.pseudo,
            instagram_handle: p.instagram_handle,
            slug: p.slug,
            avatar_url: p.avatar_url,
            entries_count: eCount,
            registrations_count: rCount,
            attendance_rate: calculateAttendanceRate(eCount, rCount),
            rank: 0,
          };
        });

        items.sort((a, b) => b.entries_count - a.entries_count);

        // Attribuer les rangs
        items.forEach((item, index) => {
          item.rank = index + 1;
        });

        setLeaderboard(items);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    computeLeaderboard();
  }, [selectedYear, selectedMonth, selectedEventId]);

  const top3 = leaderboard.slice(0, 3);

  const downloadCsv = () => {
    window.location.href = `/api/export?type=leaderboard&year=${selectedYear}&month=${selectedMonth}&event_id=${selectedEventId}`;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Trophy className="w-6 h-6 text-[#e5b85c]" />
            <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-wider">
              Classement Concours RP
            </h1>
          </div>
          <p className="text-gray-400 text-xs sm:text-sm mt-1">
            Concours officiel ASTRA • Calculé <strong className="text-white">UNIQUEMENT</strong> sur les entrées réelles validées.
          </p>
        </div>

        <button
          onClick={downloadCsv}
          className="py-2 px-3.5 bg-[#141722] hover:bg-[#1d2232] border border-[#262c3e] text-white font-semibold rounded-xl text-xs flex items-center gap-2 self-start sm:self-auto cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 text-[#e5b85c]" />
          <span>Exporter CSV</span>
        </button>
      </div>

      {/* Barre de filtres */}
      <div className="bg-[#0f1118] border border-[#1d212f] rounded-2xl p-4 flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5 text-gray-400 font-semibold uppercase text-[10px] tracking-wider">
          <Filter className="w-3.5 h-3.5 text-[#e5b85c]" />
          <span>Filtres :</span>
        </div>

        {/* Année */}
        <select
          value={selectedYear}
          onChange={(e) => {
            setSelectedYear(parseInt(e.target.value));
            setSelectedEventId('all');
          }}
          className="px-3 py-1.5 bg-[#141722] border border-[#232738] rounded-xl text-white focus:outline-none focus:border-[#e5b85c]"
        >
          <option value={2026}>Année 2026</option>
          <option value={2025}>Année 2025</option>
        </select>

        {/* Mois */}
        <select
          value={selectedMonth}
          onChange={(e) => {
            setSelectedMonth(e.target.value);
            setSelectedEventId('all');
          }}
          disabled={selectedEventId !== 'all'}
          className="px-3 py-1.5 bg-[#141722] border border-[#232738] rounded-xl text-white focus:outline-none focus:border-[#e5b85c] disabled:opacity-40"
        >
          <option value="all">Tous les mois (Annuel)</option>
          <option value="0">Janvier</option>
          <option value="1">Février</option>
          <option value="2">Mars</option>
          <option value="3">Avril</option>
          <option value="4">Mai</option>
          <option value="5">Juin</option>
          <option value="6">Juillet</option>
          <option value="7">Août</option>
          <option value="8">Septembre</option>
          <option value="9">Octobre</option>
          <option value="10">Novembre</option>
          <option value="11">Décembre</option>
        </select>

        {/* Soirée spécifique */}
        <select
          value={selectedEventId}
          onChange={(e) => setSelectedEventId(e.target.value)}
          className="px-3 py-1.5 bg-[#141722] border border-[#232738] rounded-xl text-white focus:outline-none focus:border-[#e5b85c]"
        >
          <option value="all">Toutes les soirées</option>
          {events.map((ev) => (
            <option key={ev.id} value={ev.id}>
              {ev.name} ({ev.event_date})
            </option>
          ))}
        </select>
      </div>

      {/* Podium Top 3 */}
      {!loading && top3.length >= 3 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
          {/* 2e Place */}
          <div className="order-2 sm:order-1 bg-[#0f1118] border border-gray-700/50 rounded-3xl p-6 text-center shadow-lg relative flex flex-col justify-between">
            <span className="w-8 h-8 rounded-full bg-gray-300 text-black font-black text-sm flex items-center justify-center mx-auto mb-3 shadow">
              2
            </span>
            <div>
              <h3 className="text-lg font-bold text-white">
                {top3[1].pseudo || `${top3[1].first_name} ${top3[1].last_name}`}
              </h3>
              {top3[1].instagram_handle && (
                <p className="text-xs text-gray-400">@{top3[1].instagram_handle}</p>
              )}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-800">
              <span className="text-3xl font-black text-white">{top3[1].entries_count}</span>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider">entrées réelles</p>
            </div>
          </div>

          {/* 1ère Place (Gold Winner) */}
          <div className="order-1 sm:order-2 bg-gradient-to-b from-[#1c1810] to-[#0f1118] border-2 border-[#e5b85c] rounded-3xl p-7 text-center shadow-2xl relative sm:-translate-y-3 flex flex-col justify-between">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-[#e5b85c] text-black font-black text-[10px] uppercase tracking-widest shadow">
              LEADER ACTUEL
            </div>
            <span className="w-10 h-10 rounded-full bg-[#e5b85c] text-black font-black text-base flex items-center justify-center mx-auto mb-3 shadow-[0_0_20px_#e5b85c]">
              1
            </span>
            <div>
              <h3 className="text-xl font-black text-white">
                {top3[0].pseudo || `${top3[0].first_name} ${top3[0].last_name}`}
              </h3>
              {top3[0].instagram_handle && (
                <p className="text-xs text-[#e5b85c]">@{top3[0].instagram_handle}</p>
              )}
            </div>
            <div className="mt-4 pt-4 border-t border-[#e5b85c]/30">
              <span className="text-4xl font-black text-[#e5b85c]">{top3[0].entries_count}</span>
              <p className="text-[10px] text-white uppercase tracking-wider font-bold">entrées réelles</p>
            </div>
          </div>

          {/* 3e Place */}
          <div className="order-3 sm:order-3 bg-[#0f1118] border border-amber-900/40 rounded-3xl p-6 text-center shadow-lg relative flex flex-col justify-between">
            <span className="w-8 h-8 rounded-full bg-amber-700 text-white font-black text-sm flex items-center justify-center mx-auto mb-3 shadow">
              3
            </span>
            <div>
              <h3 className="text-lg font-bold text-white">
                {top3[2].pseudo || `${top3[2].first_name} ${top3[2].last_name}`}
              </h3>
              {top3[2].instagram_handle && (
                <p className="text-xs text-gray-400">@{top3[2].instagram_handle}</p>
              )}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-800">
              <span className="text-3xl font-black text-white">{top3[2].entries_count}</span>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider">entrées réelles</p>
            </div>
          </div>
        </div>
      )}

      {/* Table complète du classement */}
      <div className="bg-[#0f1118] border border-[#1d212f] rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#1d212f] bg-[#121520] text-gray-400 uppercase text-[10px] tracking-wider">
                <th className="py-3.5 px-5 font-semibold text-center w-16">Rang</th>
                <th className="py-3.5 px-5 font-semibold">Promoteur RP</th>
                <th className="py-3.5 px-4 font-semibold text-right text-white">Entrées Réelles (Scans)</th>
                <th className="py-3.5 px-4 font-semibold text-right">Inscriptions Demandées</th>
                <th className="py-3.5 px-4 font-semibold text-right">Taux Présence</th>
                <th className="py-3.5 px-5 font-semibold text-right">Fiche</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#181b28]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-500">
                    Calcul du classement en direct...
                  </td>
                </tr>
              ) : leaderboard.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-500">
                    Aucune donnée pour cette sélection.
                  </td>
                </tr>
              ) : (
                leaderboard.map((item) => (
                  <tr key={item.promoter_id} className="hover:bg-[#141722]/80 transition-colors">
                    {/* Rang */}
                    <td className="py-4 px-5 text-center">
                      <span className={`w-7 h-7 inline-flex items-center justify-center rounded-full font-black text-xs ${
                        item.rank === 1
                          ? 'bg-[#e5b85c] text-black shadow'
                          : item.rank === 2
                          ? 'bg-gray-300 text-black shadow'
                          : item.rank === 3
                          ? 'bg-amber-700 text-white shadow'
                          : 'bg-gray-800 text-gray-400'
                      }`}>
                        {item.rank}
                      </span>
                    </td>

                    {/* RP */}
                    <td className="py-4 px-5">
                      <div className="font-bold text-white text-sm">
                        {item.pseudo ? (
                          <span className="flex items-center gap-1.5 flex-wrap">
                            <span>{item.pseudo}</span>
                            <span className="text-xs text-gray-400 font-normal">({item.first_name} {item.last_name})</span>
                          </span>
                        ) : (
                          `${item.first_name} ${item.last_name}`
                        )}
                      </div>
                      {item.instagram_handle && (
                        <span className="text-[11px] text-gray-400 flex items-center gap-1">
                          <InstagramIcon className="w-3 h-3 text-[#e5b85c]" />
                          @{item.instagram_handle}
                        </span>
                      )}
                    </td>

                    {/* Entrées validées */}
                    <td className="py-4 px-4 text-right">
                      <span className="font-black text-base text-[#e5b85c]">
                        {item.entries_count}
                      </span>
                      <span className="text-[10px] text-gray-500 ml-1">entrées</span>
                    </td>

                    {/* Inscriptions */}
                    <td className="py-4 px-4 text-right font-medium text-gray-300">
                      {item.registrations_count}
                    </td>

                    {/* Taux de présence */}
                    <td className="py-4 px-4 text-right font-bold text-white">
                      {item.attendance_rate}%
                    </td>

                    {/* Fiche */}
                    <td className="py-4 px-5 text-right">
                      <Link
                        href={`/admin/promoters/${item.promoter_id}`}
                        className="inline-flex items-center gap-1 py-1.5 px-3 bg-[#171a25] hover:bg-[#202534] border border-[#262c3e] text-gray-300 hover:text-white rounded-lg text-xs font-semibold"
                      >
                        <span>Détails</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
