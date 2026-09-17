import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { 
  CheckSquare, 
  Users, 
  Trophy, 
  Calendar, 
  QrCode, 
  PlusCircle, 
  ArrowUpRight,
  TrendingUp,
  Sparkles
} from 'lucide-react';
import { formatFrenchDate } from '@/lib/utils';

export const revalidate = 0; // Données temps réel

export default async function AdminDashboardPage() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    }
  );

  const todayStr = new Date().toISOString().split('T')[0];
  const currentYear = new Date().getFullYear();
  const yearStart = `${currentYear}-01-01T00:00:00Z`;

  // 1. Entrées aujourd'hui
  const { count: entriesToday } = await supabase
    .from('entries')
    .select('*', { count: 'exact', head: true })
    .gte('scanned_at', `${todayStr}T00:00:00Z`);

  // 2. Inscriptions aujourd'hui
  const { count: registrationsToday } = await supabase
    .from('registrations')
    .select('*', { count: 'exact', head: true })
    .gte('registered_at', `${todayStr}T00:00:00Z`);

  // 3. RP Actifs
  const { count: activePromoters } = await supabase
    .from('promoters')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);

  // 4. Entrées cette année (Total Concours)
  const { count: entriesThisYear } = await supabase
    .from('entries')
    .select('*', { count: 'exact', head: true })
    .gte('scanned_at', yearStart)
    .eq('status', 'valid');

  // 5. Prochaine soirée
  const { data: nextEvent } = await supabase
    .from('events')
    .select('*')
    .eq('status', 'published')
    .gte('event_date', todayStr)
    .order('event_date', { ascending: true })
    .limit(1)
    .maybeSingle();

  // 6. Top RP de l'année (calcul strict basé sur entries)
  const { data: yearlyEntries } = await supabase
    .from('entries')
    .select(`
      promoter_id,
      promoter:promoters(first_name, last_name, slug)
    `)
    .gte('scanned_at', yearStart)
    .eq('status', 'valid');

  // Agréger par RP
  const promoterCountMap: Record<string, { name: string; slug: string; count: number }> = {};

  (yearlyEntries || []).forEach((item) => {
    const pId = item.promoter_id;
    const p = Array.isArray(item.promoter) ? item.promoter[0] : item.promoter;
    if (!promoterCountMap[pId]) {
      promoterCountMap[pId] = {
        name: p ? `${p.first_name} ${p.last_name}` : 'RP Inconnu',
        slug: p?.slug || '',
        count: 0,
      };
    }
    promoterCountMap[pId].count += 1;
  });

  const topPromoters = Object.entries(promoterCountMap)
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // 7. Derniers scans
  const { data: recentEntries } = await supabase
    .from('entries')
    .select(`
      id,
      scanned_at,
      guest:guests(first_name, last_name),
      promoter:promoters(first_name, last_name),
      event:events(name)
    `)
    .order('scanned_at', { ascending: false })
    .limit(6);

  return (
    <div className="space-y-8">
      {/* Header avec action rapide Scanner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-wider">
              Dashboard Opérationnel
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold animate-pulse">
              LIVE
            </span>
          </div>
          <p className="text-gray-400 text-xs sm:text-sm mt-1">
            Contrôle en direct du club ASTRA Orléans • Concours Annuel RP {currentYear}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/scan"
            className="py-2.5 px-4 bg-gradient-to-r from-[#e5b85c] to-[#d4a037] hover:brightness-110 text-black font-extrabold rounded-xl text-xs flex items-center gap-2 shadow-lg transition-all"
          >
            <QrCode className="w-4 h-4" />
            <span>Ouvrir Scanner Entrée</span>
          </Link>
        </div>
      </div>

      {/* 4 Cartes Statistiques Clés */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Entrées ce soir */}
        <div className="bg-[#0f1118] border border-[#1d212f] rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Entrées Ce Soir
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-white">
            {entriesToday ?? 0}
          </div>
          <p className="text-[11px] text-gray-500 mt-1 flex items-center gap-1">
            <span className="text-emerald-400 font-semibold">QR scannés & validés</span> à la porte
          </p>
        </div>

        {/* Inscriptions ce soir */}
        <div className="bg-[#0f1118] border border-[#1d212f] rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Inscriptions Jour
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-white">
            {registrationsToday ?? 0}
          </div>
          <p className="text-[11px] text-gray-500 mt-1">
            Pass générés via les liens RP
          </p>
        </div>

        {/* RP Actifs */}
        <div className="bg-[#0f1118] border border-[#1d212f] rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
              RP Actifs
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-white">
            {activePromoters ?? 0}
          </div>
          <p className="text-[11px] text-gray-500 mt-1">
            Promoteurs avec liens permanents
          </p>
        </div>

        {/* Entrées Année Concours */}
        <div className="bg-[#0f1118] border border-[#e5b85c]/30 rounded-2xl p-5 relative overflow-hidden bg-gradient-to-br from-[#12141e] to-[#0f1118]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[#e5b85c]">
              Total Annuel {currentYear}
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#e5b85c]/10 border border-[#e5b85c]/20 flex items-center justify-center text-[#e5b85c]">
              <Trophy className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-white">
            {entriesThisYear ?? 0}
          </div>
          <p className="text-[11px] text-[#e5b85c]/80 mt-1">
            Entrées réelles comptabilisées
          </p>
        </div>
      </div>

      {/* Grille principale : Soirée en cours + Top RP */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Prochaine soirée */}
        <div className="lg:col-span-2 bg-[#0f1118] border border-[#1d212f] rounded-3xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#e5b85c]" />
              <h2 className="font-bold text-white text-base">Prochaine Soirée Programmée</h2>
            </div>
            <Link
              href="/admin/events"
              className="text-xs font-semibold text-[#e5b85c] hover:underline flex items-center gap-1"
            >
              <span>Gérer les soirées</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {nextEvent ? (
            <div className="bg-[#141722] border border-[#232738] rounded-2xl p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div>
                  <span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Ouverte aux inscriptions
                  </span>
                  <h3 className="text-xl font-black text-white mt-2">
                    {nextEvent.name}
                  </h3>
                  <p className="text-xs text-[#e5b85c] font-medium capitalize mt-0.5">
                    {formatFrenchDate(nextEvent.event_date)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/admin/events/${nextEvent.id}`}
                    className="py-2 px-3.5 bg-[#1b2030] hover:bg-[#23293e] border border-[#2e354f] text-white rounded-xl text-xs font-semibold"
                  >
                    Détails & Invités
                  </Link>
                </div>
              </div>

              {nextEvent.description && (
                <p className="text-xs text-gray-400 border-t border-[#232738] pt-3">
                  {nextEvent.description}
                </p>
              )}
            </div>
          ) : (
            <div className="text-center py-8 bg-[#141722] border border-dashed border-[#232738] rounded-2xl">
              <Calendar className="w-8 h-8 text-gray-500 mx-auto mb-2" />
              <p className="text-sm font-semibold text-white">Aucune soirée active pour le moment</p>
              <p className="text-xs text-gray-400 mt-1 mb-4">
                Créez un événement pour ouvrir automatiquement les inscriptions sur tous les liens RP.
              </p>
              <Link
                href="/admin/events"
                className="inline-flex items-center gap-2 py-2 px-4 bg-[#e5b85c] text-black font-bold rounded-xl text-xs"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Créer une soirée</span>
              </Link>
            </div>
          )}

          {/* Raccourcis utiles */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-6 pt-6 border-t border-[#1d212f]">
            <Link
              href="/admin/promoters"
              className="p-3 bg-[#141722] hover:bg-[#1a1e2d] border border-[#232738] rounded-xl text-left transition-colors"
            >
              <Users className="w-4 h-4 text-[#e5b85c] mb-1.5" />
              <p className="font-bold text-xs text-white">Gérer les RP</p>
              <p className="text-[10px] text-gray-400">Liens permanents</p>
            </Link>

            <Link
              href="/admin/leaderboard"
              className="p-3 bg-[#141722] hover:bg-[#1a1e2d] border border-[#232738] rounded-xl text-left transition-colors"
            >
              <Trophy className="w-4 h-4 text-[#e5b85c] mb-1.5" />
              <p className="font-bold text-xs text-white">Concours Annuel</p>
              <p className="text-[10px] text-gray-400">Classement entrées</p>
            </Link>

            <Link
              href="/admin/entries"
              className="p-3 bg-[#141722] hover:bg-[#1a1e2d] border border-[#232738] rounded-xl text-left transition-colors col-span-2 sm:col-span-1"
            >
              <CheckSquare className="w-4 h-4 text-emerald-400 mb-1.5" />
              <p className="font-bold text-xs text-white">Journal des Scans</p>
              <p className="text-[10px] text-gray-400">Export CSV Excel</p>
            </Link>
          </div>
        </div>

        {/* Top 5 RP de l'année */}
        <div className="bg-[#0f1118] border border-[#1d212f] rounded-3xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-[#e5b85c]" />
                <h2 className="font-bold text-white text-base">Top RP {currentYear}</h2>
              </div>
              <Link
                href="/admin/leaderboard"
                className="text-xs font-semibold text-[#e5b85c] hover:underline"
              >
                Voir tout
              </Link>
            </div>
            <p className="text-[11px] text-gray-400 mb-4">
              Basé uniquement sur les entrées validées à la porte.
            </p>

            <div className="space-y-2.5">
              {topPromoters.length === 0 ? (
                <p className="text-gray-500 text-xs py-6 text-center">
                  Aucune entrée enregistrée pour le moment.
                </p>
              ) : (
                topPromoters.map((p, idx) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-[#141722] border border-[#232738]"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-xs ${
                        idx === 0 ? 'bg-[#e5b85c] text-black' : idx === 1 ? 'bg-gray-300 text-black' : idx === 2 ? 'bg-amber-700 text-white' : 'bg-gray-800 text-gray-400'
                      }`}>
                        {idx + 1}
                      </span>
                      <span className="text-xs font-bold text-white">{p.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-black text-sm text-[#e5b85c]">{p.count}</span>
                      <span className="text-[10px] text-gray-400 ml-1">entrées</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-[#1d212f]">
            <Link
              href="/admin/promoters"
              className="w-full py-2 px-3 bg-[#171a25] hover:bg-[#202534] border border-[#272d3f] text-gray-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <span>Consulter les profils RP</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Derniers scans en direct */}
      <div className="bg-[#0f1118] border border-[#1d212f] rounded-3xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#e5b85c]" />
            <h2 className="font-bold text-white text-base">Derniers passages scannés à l&apos;entrée</h2>
          </div>
          <Link
            href="/admin/entries"
            className="text-xs font-semibold text-[#e5b85c] hover:underline"
          >
            Historique complet & Export
          </Link>
        </div>

        {recentEntries && recentEntries.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#232738] text-gray-400 uppercase text-[10px] tracking-wider">
                  <th className="pb-3 font-semibold">Invité</th>
                  <th className="pb-3 font-semibold">RP Associé</th>
                  <th className="pb-3 font-semibold">Soirée</th>
                  <th className="pb-3 font-semibold text-right">Heure du scan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1b1f2e]">
                {recentEntries.map((e) => {
                  const g = Array.isArray(e.guest) ? e.guest[0] : e.guest;
                  const p = Array.isArray(e.promoter) ? e.promoter[0] : e.promoter;
                  const ev = Array.isArray(e.event) ? e.event[0] : e.event;
                  const scanDate = new Date(e.scanned_at);
                  const scanTime = scanDate.toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone: 'Europe/Paris'
                  });

                  return (
                    <tr key={e.id} className="hover:bg-[#141722]/60">
                      <td className="py-3 font-bold text-white">
                        {g ? `${g.first_name} ${g.last_name}` : 'Invité'}
                      </td>
                      <td className="py-3 text-[#e5b85c] font-medium">
                        {p ? `${p.first_name} ${p.last_name}` : '—'}
                      </td>
                      <td className="py-3 text-gray-400">
                        {ev?.name || 'ASTRA'}
                      </td>
                      <td className="py-3 text-right font-mono text-gray-300">
                        {scanTime}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-xs py-6 text-center">
            Aucun scan récent pour le moment.
          </p>
        )}
      </div>
    </div>
  );
}
