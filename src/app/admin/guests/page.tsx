'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { type Guest } from '@/lib/types';
import { formatFrenchDate } from '@/lib/utils';
import { 
  UserCheck, 
  Search, 
  Trash2, 
  Phone, 
  ShieldCheck, 
  AlertCircle,
  Heart,
  Award,
  Users,
  Flame
} from 'lucide-react';
import { InstagramIcon } from '@/components/ui/InstagramIcon';

interface GuestWithActivity extends Guest {
  total_registrations: number;
  total_entries: number;
}

export default function AdminGuestsPage() {
  const [guests, setGuests] = useState<GuestWithActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [segmentFilter, setSegmentFilter] = useState<'all' | 'vip' | 'new' | 'blacklisted'>('all');

  const supabase = createClient();

  const loadGuests = async () => {
    setLoading(true);
    try {
      // 1. Tous les invités
      const { data: gList, error: gError } = await supabase
        .from('guests')
        .select('*')
        .order('created_at', { ascending: false });

      if (gError) throw gError;

      // 2. Compter les inscriptions et entrées par invité
      const { data: regs } = await supabase.from('registrations').select('guest_id');
      const { data: entries } = await supabase.from('entries').select('guest_id').eq('status', 'valid');

      const regMap: Record<string, number> = {};
      const entryMap: Record<string, number> = {};

      (regs || []).forEach((r) => {
        regMap[r.guest_id] = (regMap[r.guest_id] || 0) + 1;
      });

      (entries || []).forEach((e) => {
        entryMap[e.guest_id] = (entryMap[e.guest_id] || 0) + 1;
      });

      const formatted: GuestWithActivity[] = (gList || []).map((g) => ({
        ...g,
        total_registrations: regMap[g.id] || 0,
        total_entries: entryMap[g.id] || 0,
      }));

      setGuests(formatted);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGuests();
  }, []);

  const deleteGuest = async (guestId: string, name: string) => {
    if (!confirm(`Confirmez-vous la suppression RGPD de l'invité ${name} ? Toutes ses inscriptions seront retirées.`)) {
      return;
    }

    const { error } = await supabase.from('guests').delete().eq('id', guestId);
    if (!error) {
      setGuests((prev) => prev.filter((g) => g.id !== guestId));
    }
  };

  const toggleBlacklist = async (guestId: string, current: boolean, name: string) => {
    if (current) {
      if (!confirm(`Lever la blacklist et réautoriser l'accès pour ${name} ?`)) return;
      const { error } = await supabase
        .from('guests')
        .update({ is_blacklisted: false, blacklist_reason: null })
        .eq('id', guestId);
      if (!error) {
        setGuests((prev) =>
          prev.map((g) => (g.id === guestId ? { ...g, is_blacklisted: false, blacklist_reason: null } : g))
        );
      }
    } else {
      const reason = prompt(`Motif du signalement / blacklist pour ${name} :`, 'Comportement inadapté à la porte');
      if (reason === null) return;
      const cleanReason = reason.trim() || 'Signalé par la sécurité';
      const { error } = await supabase
        .from('guests')
        .update({ is_blacklisted: true, blacklist_reason: cleanReason })
        .eq('id', guestId);
      if (!error) {
        setGuests((prev) =>
          prev.map((g) =>
            g.id === guestId
              ? { ...g, is_blacklisted: true, blacklist_reason: cleanReason }
              : g
          )
        );
      }
    }
  };

  const totalGuests = guests.length;
  const vipGuestsCount = guests.filter((g) => !g.is_blacklisted && (g.total_entries >= 2 || g.total_registrations >= 2)).length;
  const newGuestsCount = guests.filter((g) => !g.is_blacklisted && g.total_entries <= 1 && g.total_registrations <= 1).length;
  const blacklistedCount = guests.filter((g) => g.is_blacklisted).length;

  const repeatGuests = guests.filter((g) => g.total_entries >= 2 || g.total_registrations >= 2).length;
  const retentionRate = totalGuests > 0 ? Math.round((repeatGuests / totalGuests) * 100) : 0;

  const filtered = guests.filter((g) => {
    // 1. Filtre par segment
    if (segmentFilter === 'vip') {
      if (g.is_blacklisted || (g.total_entries < 2 && g.total_registrations < 2)) return false;
    } else if (segmentFilter === 'new') {
      if (g.is_blacklisted || g.total_entries > 1 || g.total_registrations > 1) return false;
    } else if (segmentFilter === 'blacklisted') {
      if (!g.is_blacklisted) return false;
    }

    // 2. Recherche textuelle
    const q = searchQuery.toLowerCase();
    const fullName = `${g.first_name} ${g.last_name}`.toLowerCase();
    const phone = (g.phone || '').toLowerCase();
    const insta = (g.instagram_handle || '').toLowerCase();
    return fullName.includes(q) || phone.includes(q) || insta.includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-wider">
            Répertoire Invités
          </h1>
          <p className="text-gray-400 text-xs sm:text-sm mt-1">
            Gestion de la base invités • Rétention &amp; Conforme RGPD.
          </p>
        </div>

        <div className="relative max-w-xs w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher nom, téléphone, insta..."
            className="w-full pl-9 pr-3 py-2 bg-[#0f1118] border border-[#1d212f] rounded-xl text-white text-xs placeholder-gray-500 focus:outline-none focus:border-[#e5b85c]"
          />
        </div>
      </div>

      {/* Cartes Métriques de Rétention & Fidélité */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#0f1118] border border-[#1d212f] rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Base Invités Unique</p>
            <p className="text-2xl font-black text-white mt-0.5">{totalGuests}</p>
            <p className="text-[10px] text-gray-500">Profils enregistrés</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#0f1118] border border-[#1d212f] rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Invités Fidèles (2+)</p>
            <p className="text-2xl font-black text-[#e5b85c] mt-0.5">{repeatGuests}</p>
            <p className="text-[10px] text-gray-500">Revenus sur plusieurs soirées</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#e5b85c]/10 border border-[#e5b85c]/20 text-[#e5b85c] flex items-center justify-center">
            <Award className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#0f1118] border border-[#1d212f] rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Taux de Rétention</p>
            <p className="text-2xl font-black text-emerald-400 mt-0.5">{retentionRate}%</p>
            <p className="text-[10px] text-gray-500">Habitués du Club ASTRA</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Flame className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Barre de Filtres de Segmentation VIP & Clubbers */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setSegmentFilter('all')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            segmentFilter === 'all'
              ? 'bg-white text-black font-black shadow'
              : 'bg-[#0f1118] text-gray-400 hover:text-white border border-[#1d212f]'
          }`}
        >
          Tous les invités ({totalGuests})
        </button>

        <button
          onClick={() => setSegmentFilter('vip')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            segmentFilter === 'vip'
              ? 'bg-[#e5b85c] text-black font-black shadow'
              : 'bg-[#0f1118] text-gray-400 hover:text-[#e5b85c] border border-[#1d212f]'
          }`}
        >
          <span>👑 Habitués VIP ({vipGuestsCount})</span>
        </button>

        <button
          onClick={() => setSegmentFilter('new')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            segmentFilter === 'new'
              ? 'bg-blue-500 text-white font-black shadow'
              : 'bg-[#0f1118] text-gray-400 hover:text-blue-400 border border-[#1d212f]'
          }`}
        >
          <span>⭐ Nouveaux Clubbers ({newGuestsCount})</span>
        </button>

        <button
          onClick={() => setSegmentFilter('blacklisted')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            segmentFilter === 'blacklisted'
              ? 'bg-red-600 text-white font-black shadow'
              : 'bg-[#0f1118] text-gray-400 hover:text-red-400 border border-[#1d212f]'
          }`}
        >
          <span>⛔ Blacklistés ({blacklistedCount})</span>
        </button>
      </div>

      {/* Table des Invités */}
      <div className="bg-[#0f1118] border border-[#1d212f] rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#1d212f] bg-[#121520] text-gray-400 uppercase text-[10px] tracking-wider">
                <th className="py-3.5 px-5 font-semibold">Nom & Prénom</th>
                <th className="py-3.5 px-4 font-semibold">Téléphone</th>
                <th className="py-3.5 px-4 font-semibold">Instagram</th>
                <th className="py-3.5 px-4 font-semibold text-right">Inscriptions</th>
                <th className="py-3.5 px-4 font-semibold text-right">Entrées Réelles</th>
                <th className="py-3.5 px-5 font-semibold text-right">RGPD</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#181b28]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-500">
                    Chargement des invités...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-500">
                    Aucun invité trouvé.
                  </td>
                </tr>
              ) : (
                filtered.map((g) => (
                  <tr key={g.id} className="hover:bg-[#141722]/80 transition-colors">
                    <td className="py-4 px-5 text-white">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold">{g.first_name} {g.last_name}</span>
                        {g.is_blacklisted ? (
                          <span 
                            title={g.blacklist_reason || 'Signalé'}
                            className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/40 text-[9px] font-black uppercase tracking-wider shrink-0"
                          >
                            ⛔ BLACKLISTÉ
                          </span>
                        ) : g.total_entries >= 3 ? (
                          <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-[#e5b85c]/25 to-amber-500/25 text-[#e5b85c] border border-[#e5b85c]/50 text-[9px] font-black uppercase tracking-wider shrink-0 shadow-xs">
                            👑 VIP GOLD ({g.total_entries} entrées)
                          </span>
                        ) : g.total_entries >= 2 || g.total_registrations >= 2 ? (
                          <span className="px-2 py-0.5 rounded-full bg-[#e5b85c]/15 text-[#e5b85c] border border-[#e5b85c]/30 text-[9px] font-black uppercase tracking-wider shrink-0">
                            ★ HABITUÉ
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30 text-[9px] font-bold uppercase tracking-wider shrink-0">
                            ⭐ NOUVEAU
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-4 px-4 text-gray-300">
                      {g.phone ? (
                        <span className="flex items-center gap-1.5">
                          <Phone className="w-3 h-3 text-[#e5b85c]" />
                          {g.phone}
                        </span>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>

                    <td className="py-4 px-4 text-gray-300">
                      {g.instagram_handle ? (
                        <span className="flex items-center gap-1.5 text-gray-300">
                          <InstagramIcon className="w-3 h-3 text-[#e5b85c]" />
                          @{g.instagram_handle}
                        </span>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>

                    <td className="py-4 px-4 text-right font-medium text-gray-300">
                      {g.total_registrations}
                    </td>

                    <td className="py-4 px-4 text-right font-bold text-emerald-400">
                      {g.total_entries}
                    </td>

                    <td className="py-4 px-5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => toggleBlacklist(g.id, !!g.is_blacklisted, `${g.first_name} ${g.last_name}`)}
                          title={g.is_blacklisted ? "Lever le signalement / Débloquer l'accès" : "Signaler / Blacklister cet invité à l'entrée"}
                          className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                            g.is_blacklisted
                              ? 'bg-red-500 text-white border-red-400 hover:bg-red-600'
                              : 'bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 border-white/10'
                          }`}
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteGuest(g.id, `${g.first_name} ${g.last_name}`)}
                          title="Supprimer les données de l'invité (Droit à l'oubli)"
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
    </div>
  );
}
