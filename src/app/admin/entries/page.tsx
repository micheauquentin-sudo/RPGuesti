'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { type ClubEvent, type Promoter } from '@/lib/types';
import { formatFrenchDate } from '@/lib/utils';
import { 
  CheckSquare, 
  Download, 
  Filter, 
  Search, 
  XCircle, 
  Calendar,
  AlertCircle
} from 'lucide-react';

interface EntryRow {
  id: string;
  registration_id: string;
  scanned_at: string;
  status: string;
  guest: {
    first_name: string;
    last_name: string;
    phone: string | null;
  };
  promoter: {
    first_name: string;
    last_name: string;
  };
  event: {
    id: string;
    name: string;
    event_date: string;
  };
  scanner: {
    first_name: string | null;
    last_name: string | null;
    email: string;
  } | null;
}

export default function AdminEntriesPage() {
  const [entries, setEntries] = useState<EntryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [promoters, setPromoters] = useState<Promoter[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('all');
  const [selectedPromoterId, setSelectedPromoterId] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const supabase = createClient();

  useEffect(() => {
    async function loadFilters() {
      const { data: eData } = await supabase.from('events').select('*').order('event_date', { ascending: false });
      if (eData) setEvents(eData);

      const { data: pData } = await supabase.from('promoters').select('id, first_name, last_name, slug, avatar_url').order('first_name');
      if (pData) setPromoters(pData as unknown as typeof promoters);
    }
    loadFilters();
  }, []);

  const loadEntries = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('entries')
        .select(`
          id,
          registration_id,
          scanned_at,
          status,
          guest:guests(first_name, last_name, phone),
          promoter:promoters(first_name, last_name),
          event:events(id, name, event_date),
          scanner:profiles(first_name, last_name, email)
        `)
        .order('scanned_at', { ascending: false });

      if (selectedEventId !== 'all') {
        query = query.eq('event_id', selectedEventId);
      }

      if (selectedPromoterId !== 'all') {
        query = query.eq('promoter_id', selectedPromoterId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const formatted: EntryRow[] = (data || []).map((e) => ({
        id: e.id,
        registration_id: e.registration_id,
        scanned_at: e.scanned_at,
        status: e.status,
        guest: Array.isArray(e.guest) ? e.guest[0] : (e.guest as unknown as EntryRow['guest']),
        promoter: Array.isArray(e.promoter) ? e.promoter[0] : (e.promoter as unknown as EntryRow['promoter']),
        event: Array.isArray(e.event) ? e.event[0] : (e.event as unknown as EntryRow['event']),
        scanner: Array.isArray(e.scanner) ? e.scanner[0] : (e.scanner as unknown as EntryRow['scanner']),
      }));

      setEntries(formatted);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEntries();
  }, [selectedEventId, selectedPromoterId]);

  const cancelEntry = async (entryId: string) => {
    if (!confirm('Voulez-vous vraiment annuler cette entrée ? Le compteur du RP sera décrémenté.')) return;

    const { error } = await supabase
      .from('entries')
      .update({ status: 'cancelled' })
      .eq('id', entryId);

    if (!error) {
      setEntries((prev) =>
        prev.map((e) => (e.id === entryId ? { ...e, status: 'cancelled' } : e))
      );
    }
  };

  const handleExportCsv = () => {
    window.location.href = `/api/export?type=entries&event_id=${selectedEventId}&promoter_id=${selectedPromoterId}`;
  };

  const filtered = entries.filter((e) => {
    const q = searchQuery.toLowerCase();
    const gName = `${e.guest?.first_name || ''} ${e.guest?.last_name || ''}`.toLowerCase();
    const pName = `${e.promoter?.first_name || ''} ${e.promoter?.last_name || ''}`.toLowerCase();
    return gName.includes(q) || pName.includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-wider">
            Journal des Entrées Réelles
          </h1>
          <p className="text-gray-400 text-xs sm:text-sm mt-1">
            Chaque ligne représente un QR code scanné et validé à l&apos;entrée du club ASTRA.
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          className="py-2 px-3.5 bg-[#e5b85c] hover:bg-[#f0c773] text-black font-extrabold rounded-xl text-xs flex items-center gap-2 self-start sm:self-auto cursor-pointer shadow"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Exporter CSV Excel</span>
        </button>
      </div>

      {/* Barre de Filtres */}
      <div className="bg-[#0f1118] border border-[#1d212f] rounded-2xl p-4 flex flex-wrap items-center gap-3 text-xs">
        <div className="relative max-w-xs flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher invité ou RP..."
            className="w-full pl-9 pr-3 py-1.5 bg-[#141722] border border-[#232738] rounded-xl text-white text-xs placeholder-gray-500 focus:outline-none focus:border-[#e5b85c]"
          />
        </div>

        {/* Filtre Soirée */}
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

        {/* Filtre RP */}
        <select
          value={selectedPromoterId}
          onChange={(e) => setSelectedPromoterId(e.target.value)}
          className="px-3 py-1.5 bg-[#141722] border border-[#232738] rounded-xl text-white focus:outline-none focus:border-[#e5b85c]"
        >
          <option value="all">Tous les promoteurs RP</option>
          {promoters.map((p) => (
            <option key={p.id} value={p.id}>
              {p.first_name} {p.last_name}
            </option>
          ))}
        </select>
      </div>

      {/* Table des Entrées */}
      <div className="bg-[#0f1118] border border-[#1d212f] rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#1d212f] bg-[#121520] text-gray-400 uppercase text-[10px] tracking-wider">
                <th className="py-3.5 px-5 font-semibold">Invité</th>
                <th className="py-3.5 px-4 font-semibold">RP Crédité</th>
                <th className="py-3.5 px-4 font-semibold">Soirée</th>
                <th className="py-3.5 px-4 font-semibold">Heure de Scan</th>
                <th className="py-3.5 px-4 font-semibold">Scanné par</th>
                <th className="py-3.5 px-4 font-semibold text-center">Statut</th>
                <th className="py-3.5 px-5 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#181b28]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-500">
                    Chargement des entrées...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-500">
                    Aucune entrée trouvée.
                  </td>
                </tr>
              ) : (
                filtered.map((e) => {
                  const scanDate = new Date(e.scanned_at);
                  const scanTime = scanDate.toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    timeZone: 'Europe/Paris',
                  });

                  return (
                    <tr key={e.id} className="hover:bg-[#141722]/80 transition-colors">
                      <td className="py-4 px-5 font-bold text-white">
                        {e.guest.first_name} {e.guest.last_name}
                      </td>

                      <td className="py-4 px-4 font-semibold text-[#e5b85c]">
                        {e.promoter.first_name} {e.promoter.last_name}
                      </td>

                      <td className="py-4 px-4 text-gray-300">
                        {e.event.name}
                      </td>

                      <td className="py-4 px-4 font-mono text-gray-300">
                        {scanTime}
                      </td>

                      <td className="py-4 px-4 text-gray-400">
                        {e.scanner ? `${e.scanner.first_name || ''} ${e.scanner.last_name || ''}`.trim() || e.scanner.email : 'Staff Porte'}
                      </td>

                      <td className="py-4 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                            e.status === 'valid'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {e.status === 'valid' ? 'Validée' : 'Annulée'}
                        </span>
                      </td>

                      <td className="py-4 px-5 text-right">
                        {e.status === 'valid' && (
                          <button
                            onClick={() => cancelEntry(e.id)}
                            title="Annuler cette entrée si scannée par erreur"
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
