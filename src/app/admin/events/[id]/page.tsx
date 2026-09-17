'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { type ClubEvent } from '@/lib/types';
import { formatFrenchDate, formatFrenchTime, calculateAttendanceRate } from '@/lib/utils';
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  Search, 
  CheckCircle2, 
  Hourglass, 
  XCircle, 
  AlertCircle,
  ExternalLink
} from 'lucide-react';

interface RegistrationRow {
  id: string;
  qr_token: string;
  status: string;
  registered_at: string;
  guest: {
    id: string;
    first_name: string;
    last_name: string;
    phone: string | null;
    instagram_handle: string | null;
  };
  promoter: {
    first_name: string;
    last_name: string;
    slug: string;
  };
  entry?: {
    id: string;
    scanned_at: string;
  } | null;
}

export default function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [event, setEvent] = useState<ClubEvent | null>(null);
  const [registrations, setRegistrations] = useState<RegistrationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const supabase = createClient();

  useEffect(() => {
    async function loadEventData() {
      setLoading(true);
      try {
        // 1. Événement
        const { data: evData, error: evError } = await supabase
          .from('events')
          .select('*')
          .eq('id', id)
          .single();

        if (evError || !evData) throw new Error('Événement introuvable');
        setEvent(evData);

        // 2. Inscriptions de cette soirée avec Guest, Promoter et Entry
        const { data: regList, error: regError } = await supabase
          .from('registrations')
          .select(`
            id,
            qr_token,
            status,
            registered_at,
            guest:guests(id, first_name, last_name, phone, instagram_handle),
            promoter:promoters(first_name, last_name, slug)
          `)
          .eq('event_id', id)
          .order('registered_at', { ascending: false });

        if (regError) throw regError;

        // 3. Entrées validées pour cet événement
        const { data: entryList } = await supabase
          .from('entries')
          .select('id, registration_id, scanned_at')
          .eq('event_id', id)
          .eq('status', 'valid');

        const entryMap = new Map<string, { id: string; scanned_at: string }>();
        (entryList || []).forEach((en) => {
          entryMap.set(en.registration_id, { id: en.id, scanned_at: en.scanned_at });
        });

        const formatted: RegistrationRow[] = (regList || []).map((r) => ({
          id: r.id,
          qr_token: r.qr_token,
          status: r.status,
          registered_at: r.registered_at,
          guest: Array.isArray(r.guest) ? r.guest[0] : (r.guest as unknown as RegistrationRow['guest']),
          promoter: Array.isArray(r.promoter) ? r.promoter[0] : (r.promoter as unknown as RegistrationRow['promoter']),
          entry: entryMap.get(r.id) || null,
        }));

        setRegistrations(formatted);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadEventData();
  }, [id]);

  const cancelRegistration = async (regId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir annuler cette inscription ?')) return;

    const { error } = await supabase
      .from('registrations')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('id', regId);

    if (!error) {
      setRegistrations((prev) =>
        prev.map((r) => (r.id === regId ? { ...r, status: 'cancelled' } : r))
      );
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-gray-500 text-xs">
        Chargement de la soirée...
      </div>
    );
  }

  if (!event) {
    return (
      <div className="p-8 bg-[#0f1118] border border-[#1d212f] rounded-3xl text-center">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-2" />
        <h2 className="text-lg font-bold text-white mb-2">Événement introuvable</h2>
        <Link href="/admin/events" className="text-xs text-[#e5b85c] hover:underline">
          Retour aux soirées
        </Link>
      </div>
    );
  }

  const entriesCount = registrations.filter((r) => r.entry).length;
  const attendanceRate = calculateAttendanceRate(entriesCount, registrations.length);

  const filtered = registrations.filter((r) => {
    const q = searchQuery.toLowerCase();
    const gName = `${r.guest?.first_name || ''} ${r.guest?.last_name || ''}`.toLowerCase();
    const pName = `${r.promoter?.first_name || ''} ${r.promoter?.last_name || ''}`.toLowerCase();
    const phone = (r.guest?.phone || '').toLowerCase();
    const insta = (r.guest?.instagram_handle || '').toLowerCase();
    return gName.includes(q) || pName.includes(q) || phone.includes(q) || insta.includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link
        href="/admin/events"
        className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-white"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Retour aux soirées</span>
      </Link>

      {/* Header Soirée */}
      <div className="bg-[#0f1118] border border-[#1d212f] rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-black text-white">{event.name}</h1>
              <span
                className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                  event.status === 'published'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-gray-800 text-gray-400 border border-gray-700'
                }`}
              >
                {event.status}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-400 mt-2">
              <span className="flex items-center gap-1.5 capitalize text-white">
                <Calendar className="w-4 h-4 text-[#e5b85c]" />
                {formatFrenchDate(event.event_date)}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[#e5b85c]" />
                {formatFrenchTime(event.start_time)} → {formatFrenchTime(event.end_time)}
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <Link
              href="/scan"
              className="py-2.5 px-4 bg-[#e5b85c] hover:bg-[#f0c773] text-black font-extrabold rounded-xl text-xs flex items-center gap-2 transition-all shadow"
            >
              <span>Scanner à la porte</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 3 Cartes de Statistiques */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#0f1118] border border-[#1d212f] rounded-2xl p-5">
          <span className="text-xs font-bold uppercase text-gray-400">Total Inscriptions</span>
          <div className="text-3xl font-black text-white mt-1">{registrations.length}</div>
          <p className="text-[11px] text-gray-500 mt-1">Pass générés par les RP</p>
        </div>

        <div className="bg-[#0f1118] border border-[#1d212f] rounded-2xl p-5">
          <span className="text-xs font-bold uppercase text-gray-400">Entrées Validées</span>
          <div className="text-3xl font-black text-emerald-400 mt-1">{entriesCount}</div>
          <p className="text-[11px] text-gray-500 mt-1">QR scannés à l&apos;entrée</p>
        </div>

        <div className="bg-[#0f1118] border border-[#1d212f] rounded-2xl p-5">
          <span className="text-xs font-bold uppercase text-gray-400">Taux de Présence</span>
          <div className="text-3xl font-black text-[#e5b85c] mt-1">{attendanceRate}%</div>
          <p className="text-[11px] text-gray-500 mt-1">Ratio entrées / inscrits</p>
        </div>
      </div>

      {/* Liste des invités et inscriptions */}
      <div className="bg-[#0f1118] border border-[#1d212f] rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-base font-bold text-white">
            Liste des Invités ({registrations.length})
          </h2>

          <div className="relative max-w-xs w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher nom, RP, téléphone..."
              className="w-full pl-9 pr-3 py-1.5 bg-[#141722] border border-[#232738] rounded-xl text-white text-xs placeholder-gray-500 focus:outline-none focus:border-[#e5b85c]"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="text-gray-500 text-xs py-8 text-center">
            Aucun invité trouvé pour cette soirée.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#232738] text-gray-400 uppercase text-[10px] tracking-wider">
                  <th className="pb-3 font-semibold">Invité</th>
                  <th className="pb-3 font-semibold">RP Associé</th>
                  <th className="pb-3 font-semibold">Téléphone / Insta</th>
                  <th className="pb-3 font-semibold text-center">Statut Entrée</th>
                  <th className="pb-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1b1f2e]">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-[#141722]/60">
                    <td className="py-3 font-bold text-white">
                      {r.guest.first_name} {r.guest.last_name}
                    </td>
                    <td className="py-3 text-[#e5b85c] font-medium">
                      {r.promoter.first_name} {r.promoter.last_name}
                    </td>
                    <td className="py-3 text-gray-400">
                      {r.guest.phone || (r.guest.instagram_handle ? `@${r.guest.instagram_handle}` : '—')}
                    </td>
                    <td className="py-3 text-center">
                      {r.entry ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" />
                          Entré à {new Date(r.entry.scanned_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' })}
                        </span>
                      ) : r.status === 'cancelled' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          <XCircle className="w-3 h-3" />
                          Annulé
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-800 text-gray-400 border border-gray-700">
                          <Hourglass className="w-3 h-3" />
                          En attente
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/qr/${r.qr_token}`}
                          target="_blank"
                          title="Voir le QR pass"
                          className="p-1 rounded bg-[#171a25] hover:bg-[#202534] text-gray-300 hover:text-white"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                        {r.status !== 'cancelled' && !r.entry && (
                          <button
                            onClick={() => cancelRegistration(r.id)}
                            title="Annuler cette inscription"
                            className="p-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
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
