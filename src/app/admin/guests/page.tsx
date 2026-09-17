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
  AlertCircle 
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

  const filtered = guests.filter((g) => {
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
            Gestion de la base invités • Conforme RGPD (anonymisation et suppression).
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
                    <td className="py-4 px-5 font-bold text-white">
                      {g.first_name} {g.last_name}
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
                      <button
                        onClick={() => deleteGuest(g.id, `${g.first_name} ${g.last_name}`)}
                        title="Supprimer les données de l'invité (Droit à l'oubli)"
                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
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
