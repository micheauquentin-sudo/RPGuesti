'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { type ClubEvent, type EventStatus } from '@/lib/types';
import { formatFrenchDate, formatFrenchTime, slugify, calculateAttendanceRate } from '@/lib/utils';
import { 
  Calendar, 
  PlusCircle, 
  Repeat, 
  Clock, 
  ArrowRight, 
  AlertCircle,
  Sparkles
} from 'lucide-react';

interface EventWithStats extends ClubEvent {
  registrations_count: number;
  entries_count: number;
}

export default function AdminEventsPage() {
  const [events, setEvents] = useState<EventWithStats[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal Création Simple
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [startTime, setStartTime] = useState('23:30');
  const [endTime, setEndTime] = useState('06:00');
  const [status, setStatus] = useState<EventStatus>('published');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modal Récurrence (ex: chaque samedi)
  const [recurrenceOpen, setRecurrenceOpen] = useState(false);
  const [recurrenceBaseName, setRecurrenceBaseName] = useState('ASTRA CLUB — SATURDAY');
  const [recurrenceStartDate, setRecurrenceStartDate] = useState('');
  const [recurrenceWeeks, setRecurrenceWeeks] = useState(4);
  const [generatingRecurrence, setGeneratingRecurrence] = useState(false);

  const supabase = createClient();

  const loadEvents = async () => {
    setLoading(true);
    try {
      // 1. Tous les événements
      const { data: eList, error: eError } = await supabase
        .from('events')
        .select('*')
        .order('event_date', { ascending: false });

      if (eError) throw eError;

      // 2. Inscriptions et entrées
      const { data: regs } = await supabase
        .from('registrations')
        .select('event_id, status')
        .eq('status', 'registered');

      const { data: entries } = await supabase
        .from('entries')
        .select('event_id, status')
        .eq('status', 'valid');

      const statsMap: Record<string, { regs: number; entries: number }> = {};

      (regs || []).forEach((r) => {
        if (!statsMap[r.event_id]) statsMap[r.event_id] = { regs: 0, entries: 0 };
        statsMap[r.event_id].regs += 1;
      });

      (entries || []).forEach((e) => {
        if (!statsMap[e.event_id]) statsMap[e.event_id] = { regs: 0, entries: 0 };
        statsMap[e.event_id].entries += 1;
      });

      const enriched: EventWithStats[] = (eList || []).map((ev) => ({
        ...ev,
        registrations_count: statsMap[ev.id]?.regs || 0,
        entries_count: statsMap[ev.id]?.entries || 0,
      }));

      setEvents(enriched);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !eventDate) return;
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const generatedSlug = slugify(`${name}-${eventDate}`);

      const { data: newEv, error } = await supabase
        .from('events')
        .insert({
          name: name.trim(),
          slug: generatedSlug,
          event_date: eventDate,
          start_time: startTime + ':00',
          end_time: endTime + ':00',
          status,
          description: description.trim() || null,
        })
        .select('id')
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new Error('Un événement avec ce nom et cette date existe déjà.');
        }
        throw error;
      }

      // Associer automatiquement tous les RP actifs à la soirée
      const { data: activePromoters } = await supabase
        .from('promoters')
        .select('id')
        .eq('is_active', true);

      if (activePromoters && activePromoters.length > 0 && newEv) {
        const associations = activePromoters.map((p) => ({
          event_id: newEv.id,
          promoter_id: p.id,
          is_active: true,
        }));
        await supabase.from('event_promoters').insert(associations);
      }

      setModalOpen(false);
      setName('');
      setEventDate('');
      setDescription('');
      loadEvents();
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMsg(error?.message || 'Erreur lors de la création');
    } finally {
      setSubmitting(false);
    }
  };

  // Générateur de récurrence (ex: 4 prochains samedis)
  const handleGenerateRecurrence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recurrenceStartDate || recurrenceWeeks < 1) return;
    setGeneratingRecurrence(true);
    setErrorMsg(null);

    try {
      const start = new Date(recurrenceStartDate);
      const activePromoters = (await supabase.from('promoters').select('id').eq('is_active', true)).data || [];

      for (let i = 0; i < recurrenceWeeks; i++) {
        const curDate = new Date(start);
        curDate.setDate(start.getDate() + i * 7);
        const dateStr = curDate.toISOString().split('T')[0];
        const eventSlug = slugify(`${recurrenceBaseName}-${dateStr}`);

        const { data: createdEv } = await supabase
          .from('events')
          .insert({
            name: `${recurrenceBaseName}`,
            slug: eventSlug,
            event_date: dateStr,
            start_time: '23:30:00',
            end_time: '06:00:00',
            status: 'published',
            description: 'Soirée ASTRA Orléans. Entrée gratuite avec QR code.',
          })
          .select('id')
          .maybeSingle();

        if (createdEv && activePromoters.length > 0) {
          const links = activePromoters.map((p) => ({
            event_id: createdEv.id,
            promoter_id: p.id,
            is_active: true,
          }));
          await supabase.from('event_promoters').insert(links);
        }
      }

      setRecurrenceOpen(false);
      loadEvents();
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMsg(error?.message || 'Erreur lors de la génération de récurrence');
    } finally {
      setGeneratingRecurrence(false);
    }
  };

  const updateEventStatus = async (eventId: string, newStatus: EventStatus) => {
    const { error } = await supabase
      .from('events')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', eventId);

    if (!error) {
      setEvents((prev) =>
        prev.map((ev) => (ev.id === eventId ? { ...ev, status: newStatus } : ev))
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-wider">
            Soirées & Événements
          </h1>
          <p className="text-gray-400 text-xs sm:text-sm mt-1">
            Programmation des soirées ASTRA. Les RP permanents s&apos;adaptent automatiquement.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={() => setRecurrenceOpen(true)}
            className="py-2.5 px-3.5 bg-[#141722] hover:bg-[#1d2232] border border-[#262c3e] text-gray-200 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Repeat className="w-4 h-4 text-[#e5b85c]" />
            <span>Série Récurrente</span>
          </button>

          <button
            onClick={() => setModalOpen(true)}
            className="py-2.5 px-4 bg-[#e5b85c] hover:bg-[#f0c773] text-black font-extrabold rounded-xl text-xs flex items-center gap-2 shadow-lg transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Nouvelle Soirée</span>
          </button>
        </div>
      </div>

      {/* Table des événements */}
      <div className="bg-[#0f1118] border border-[#1d212f] rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#1d212f] bg-[#121520] text-gray-400 uppercase text-[10px] tracking-wider">
                <th className="py-3.5 px-5 font-semibold">Nom de la soirée</th>
                <th className="py-3.5 px-4 font-semibold">Date & Heure</th>
                <th className="py-3.5 px-4 font-semibold text-center">Statut</th>
                <th className="py-3.5 px-4 font-semibold text-right">Inscriptions</th>
                <th className="py-3.5 px-4 font-semibold text-right">Entrées Scannées</th>
                <th className="py-3.5 px-4 font-semibold text-right">Taux Présence</th>
                <th className="py-3.5 px-5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#181b28]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-500">
                    Chargement des soirées...
                  </td>
                </tr>
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-500">
                    Aucune soirée enregistrée. Créez-en une pour ouvrir les réservations !
                  </td>
                </tr>
              ) : (
                events.map((ev) => {
                  const rate = calculateAttendanceRate(ev.entries_count, ev.registrations_count);

                  return (
                    <tr key={ev.id} className="hover:bg-[#141722]/80 transition-colors">
                      <td className="py-4 px-5">
                        <Link
                          href={`/admin/events/${ev.id}`}
                          className="font-bold text-white text-sm hover:text-[#e5b85c] transition-colors"
                        >
                          {ev.name}
                        </Link>
                        {ev.description && (
                          <p className="text-[11px] text-gray-400 line-clamp-1 mt-0.5">
                            {ev.description}
                          </p>
                        )}
                      </td>

                      <td className="py-4 px-4">
                        <div className="font-semibold text-white capitalize">
                          {formatFrenchDate(ev.event_date)}
                        </div>
                        <div className="text-[11px] text-gray-400 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-[#e5b85c]" />
                          <span>{formatFrenchTime(ev.start_time)} → {formatFrenchTime(ev.end_time)}</span>
                        </div>
                      </td>

                      <td className="py-4 px-4 text-center">
                        <select
                          value={ev.status}
                          onChange={(e) => updateEventStatus(ev.id, e.target.value as EventStatus)}
                          className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full border bg-transparent focus:outline-none cursor-pointer ${
                            ev.status === 'published'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : ev.status === 'closed'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                              : ev.status === 'cancelled'
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                              : 'bg-gray-800 text-gray-400 border-gray-700'
                          }`}
                        >
                          <option value="published" className="bg-[#0f1118] text-emerald-400">Publié</option>
                          <option value="closed" className="bg-[#0f1118] text-amber-400">Fermé</option>
                          <option value="draft" className="bg-[#0f1118] text-gray-400">Brouillon</option>
                          <option value="cancelled" className="bg-[#0f1118] text-rose-400">Annulé</option>
                        </select>
                      </td>

                      <td className="py-4 px-4 text-right font-medium text-gray-300">
                        {ev.registrations_count}
                      </td>

                      <td className="py-4 px-4 text-right font-bold text-white">
                        {ev.entries_count}
                      </td>

                      <td className="py-4 px-4 text-right font-black text-[#e5b85c]">
                        {rate}%
                      </td>

                      <td className="py-4 px-5 text-right">
                        <Link
                          href={`/admin/events/${ev.id}`}
                          className="inline-flex items-center gap-1 py-1.5 px-3 bg-[#171a25] hover:bg-[#202534] border border-[#262c3e] text-gray-300 hover:text-white rounded-lg text-xs font-semibold transition-colors"
                        >
                          <span>Invités & Détails</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Création d'événement */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0f1118] border border-[#232738] rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-[#e5b85c]" />
              <h2 className="text-lg font-bold text-white">Créer une nouvelle soirée</h2>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreateEvent} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-gray-300 mb-1">Nom de la soirée *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ASTRA — OPENING NIGHT"
                  className="w-full px-3 py-2 bg-[#151822] border border-[#24283b] rounded-xl text-white focus:outline-none focus:border-[#e5b85c]"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-300 mb-1">Date de la soirée *</label>
                <input
                  type="date"
                  required
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full px-3 py-2 bg-[#151822] border border-[#24283b] rounded-xl text-white focus:outline-none focus:border-[#e5b85c]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-300 mb-1">Début</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2 bg-[#151822] border border-[#24283b] rounded-xl text-white focus:outline-none focus:border-[#e5b85c]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-300 mb-1">Fin</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3 py-2 bg-[#151822] border border-[#24283b] rounded-xl text-white focus:outline-none focus:border-[#e5b85c]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-300 mb-1">Statut initial</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as EventStatus)}
                  className="w-full px-3 py-2 bg-[#151822] border border-[#24283b] rounded-xl text-white focus:outline-none focus:border-[#e5b85c]"
                >
                  <option value="published">Publié (ouvert immédiatement aux inscriptions)</option>
                  <option value="draft">Brouillon (non visible)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-300 mb-1">Description (optionnelle)</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Entrée gratuite sous présentation du QR code avant 01h00."
                  className="w-full px-3 py-2 bg-[#151822] border border-[#24283b] rounded-xl text-white focus:outline-none focus:border-[#e5b85c]"
                />
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
                  {submitting ? 'Création...' : 'Créer la soirée'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Récurrence (Ex: chaque samedi) */}
      {recurrenceOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0f1118] border border-[#232738] rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl">
            <div className="flex items-center gap-2 mb-2">
              <Repeat className="w-5 h-5 text-[#e5b85c]" />
              <h2 className="text-lg font-bold text-white">Générateur de soirées récurrentes</h2>
            </div>
            <p className="text-xs text-gray-400 mb-4">
              Génère automatiquement une série de soirées espacées de 7 jours (ex: tous les samedis).
            </p>

            <form onSubmit={handleGenerateRecurrence} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-gray-300 mb-1">Nom de base de la série</label>
                <input
                  type="text"
                  required
                  value={recurrenceBaseName}
                  onChange={(e) => setRecurrenceBaseName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#151822] border border-[#24283b] rounded-xl text-white focus:outline-none focus:border-[#e5b85c]"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-300 mb-1">Date du 1er samedi (ou jour de série)</label>
                <input
                  type="date"
                  required
                  value={recurrenceStartDate}
                  onChange={(e) => setRecurrenceStartDate(e.target.value)}
                  className="w-full px-3 py-2 bg-[#151822] border border-[#24283b] rounded-xl text-white focus:outline-none focus:border-[#e5b85c]"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-300 mb-1">Nombre de semaines à générer</label>
                <input
                  type="number"
                  min={1}
                  max={26}
                  value={recurrenceWeeks}
                  onChange={(e) => setRecurrenceWeeks(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 bg-[#151822] border border-[#24283b] rounded-xl text-white focus:outline-none focus:border-[#e5b85c]"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRecurrenceOpen(false)}
                  className="flex-1 py-2.5 bg-[#171a25] hover:bg-[#202534] text-gray-300 rounded-xl font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={generatingRecurrence}
                  className="flex-1 py-2.5 bg-[#e5b85c] text-black font-bold rounded-xl disabled:opacity-50"
                >
                  {generatingRecurrence ? 'Génération...' : `Générer ${recurrenceWeeks} soirées`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
