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
  Sparkles,
  Edit3,
  Trash2,
  Image as ImageIcon,
  Upload,
  X
} from 'lucide-react';

interface EventWithStats extends ClubEvent {
  registrations_count: number;
  entries_count: number;
}

// Affiches club ASTRA de haute qualité prédéfinies
const POSTER_PRESETS = [
  {
    name: 'Gold Luxury Club',
    url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&auto=format&fit=crop&q=80',
  },
  {
    name: 'Neon Violet Nightlife',
    url: 'https://images.unsplash.com/photo-1545128485-c400e7702796?w=800&auto=format&fit=crop&q=80',
  },
  {
    name: 'Laser Crowd ASTRA',
    url: 'https://images.unsplash.com/photo-1574391884720-bbc3740c59d1?w=800&auto=format&fit=crop&q=80',
  },
  {
    name: 'DJ Electro Stage',
    url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop&q=80',
  },
];

type PosterFormat = 'auto' | '9:16' | '4:5' | '4:3' | 'original';

interface FormatResult {
  dataUrl: string;
  analysisText: string;
  resolvedFormat: string;
}

function processPosterFormat(img: HTMLImageElement, format: PosterFormat): FormatResult {
  const nativeRatio = img.width / (img.height || 1);
  let resolvedFormat = format;

  if (format === 'auto') {
    if (nativeRatio <= 0.65) resolvedFormat = '9:16';
    else if (nativeRatio <= 0.95) resolvedFormat = '4:5';
    else resolvedFormat = '4:3';
  }

  let targetW = 800;
  let targetH = 1000;
  let formatLabel = 'Flyer Club (4:5)';

  if (resolvedFormat === '9:16') {
    targetW = 720;
    targetH = 1280;
    formatLabel = 'Format Story (9:16)';
  } else if (resolvedFormat === '4:5') {
    targetW = 800;
    targetH = 1000;
    formatLabel = 'Affiche Club (4:5)';
  } else if (resolvedFormat === '4:3') {
    targetW = 960;
    targetH = 720;
    formatLabel = 'Format Standard (4:3)';
  } else if (resolvedFormat === 'original') {
    targetW = Math.min(img.width, 1200);
    targetH = Math.round(targetW / nativeRatio);
    formatLabel = 'Format Original';
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return {
      dataUrl: img.src,
      analysisText: `${img.width}×${img.height}px`,
      resolvedFormat: formatLabel,
    };
  }

  // 1. Fond ambiance flou dérivé de l'affiche (zéro barre noire brute)
  ctx.save();
  ctx.filter = 'blur(28px) brightness(0.52)';
  ctx.drawImage(img, -20, -20, targetW + 40, targetH + 40);
  ctx.restore();

  // Voile sombre subtil pour contraste
  ctx.fillStyle = 'rgba(8, 10, 16, 0.45)';
  ctx.fillRect(0, 0, targetW, targetH);

  // 2. Image nette centrée sans coupure (object-fit: contain)
  let drawW = targetW;
  let drawH = targetW / nativeRatio;
  if (drawH > targetH) {
    drawH = targetH;
    drawW = targetH * nativeRatio;
  }
  const drawX = (targetW - drawW) / 2;
  const drawY = (targetH - drawH) / 2;

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
  ctx.shadowBlur = 24;
  ctx.drawImage(img, drawX, drawY, drawW, drawH);
  ctx.restore();

  const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
  const ratioLabel = nativeRatio < 0.7 ? 'Story 9:16' : nativeRatio <= 0.95 ? 'Flyer 4:5' : nativeRatio <= 1.1 ? 'Carré' : 'Bannière 4:3';
  const analysisText = `Image importée : ${img.width}×${img.height}px (${ratioLabel}) • Adaptée en ${formatLabel} avec centrage automatique sans coupure`;

  return { dataUrl, analysisText, resolvedFormat: formatLabel };
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
  const [coverImageUrl, setCoverImageUrl] = useState(POSTER_PRESETS[0].url);
  const [createRawImg, setCreateRawImg] = useState<HTMLImageElement | null>(null);
  const [createFormat, setCreateFormat] = useState<PosterFormat>('auto');
  const [createAnalysis, setCreateAnalysis] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modal Édition
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editEventId, setEditEventId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editEventDate, setEditEventDate] = useState('');
  const [editStartTime, setEditStartTime] = useState('23:30');
  const [editEndTime, setEditEndTime] = useState('06:00');
  const [editStatus, setEditStatus] = useState<EventStatus>('published');
  const [editDescription, setEditDescription] = useState('');
  const [editCoverImageUrl, setEditCoverImageUrl] = useState('');
  const [editRawImg, setEditRawImg] = useState<HTMLImageElement | null>(null);
  const [editFormat, setEditFormat] = useState<PosterFormat>('auto');
  const [editAnalysis, setEditAnalysis] = useState<string | null>(null);

  // Modal Récurrence
  const [recurrenceOpen, setRecurrenceOpen] = useState(false);
  const [recurrenceBaseName, setRecurrenceBaseName] = useState('ASTRA — SATURDAY NIGHT');
  const [recurrenceStartDate, setRecurrenceStartDate] = useState('');
  const [recurrenceWeeks, setRecurrenceWeeks] = useState(4);
  const [generatingRecurrence, setGeneratingRecurrence] = useState(false);

  const supabase = createClient();

  const loadEvents = async () => {
    setLoading(true);
    try {
      const { data: eList, error: eError } = await supabase
        .from('events')
        .select('*')
        .order('event_date', { ascending: false });

      if (eError) throw eError;

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

  const handleFilePosterUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    isEdit: boolean
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Veuillez sélectionner un fichier image valide (PNG, JPG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        if (isEdit) {
          setEditRawImg(img);
          const res = processPosterFormat(img, editFormat);
          setEditCoverImageUrl(res.dataUrl);
          setEditAnalysis(res.analysisText);
        } else {
          setCreateRawImg(img);
          const res = processPosterFormat(img, createFormat);
          setCoverImageUrl(res.dataUrl);
          setCreateAnalysis(res.analysisText);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const changeCreateFormat = (fmt: PosterFormat) => {
    setCreateFormat(fmt);
    if (createRawImg) {
      const res = processPosterFormat(createRawImg, fmt);
      setCoverImageUrl(res.dataUrl);
      setCreateAnalysis(res.analysisText);
    }
  };

  const changeEditFormat = (fmt: PosterFormat) => {
    setEditFormat(fmt);
    if (editRawImg) {
      const res = processPosterFormat(editRawImg, fmt);
      setEditCoverImageUrl(res.dataUrl);
      setEditAnalysis(res.analysisText);
    }
  };

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
          cover_image_url: coverImageUrl.trim() || null,
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
      setCreateRawImg(null);
      setCreateFormat('auto');
      setCreateAnalysis(null);
      loadEvents();
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMsg(error?.message || 'Erreur lors de la création');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (ev: EventWithStats) => {
    setEditEventId(ev.id);
    setEditName(ev.name);
    setEditEventDate(ev.event_date);
    setEditStartTime(ev.start_time.slice(0, 5));
    setEditEndTime(ev.end_time.slice(0, 5));
    setEditStatus(ev.status);
    setEditDescription(ev.description || '');
    setEditCoverImageUrl(ev.cover_image_url || POSTER_PRESETS[0].url);
    setEditRawImg(null);
    setEditFormat('auto');
    setEditAnalysis(null);
    setEditModalOpen(true);
  };

  const handleUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editEventId || !editName || !editEventDate) return;
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/events', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editEventId,
          name: editName,
          event_date: editEventDate,
          start_time: editStartTime,
          end_time: editEndTime,
          status: editStatus,
          description: editDescription,
          cover_image_url: editCoverImageUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur lors de la modification');

      setEditModalOpen(false);
      loadEvents();
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMsg(error?.message || 'Erreur de modification');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEvent = async (ev: EventWithStats) => {
    if (
      !confirm(
        `Êtes-vous certain de vouloir supprimer la soirée "${ev.name}" du ${formatFrenchDate(ev.event_date)} ?\n\nCette action supprimera également les inscriptions et entrées rattachées à cette date.`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/events?id=${ev.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur lors de la suppression');

      setEvents((prev) => prev.filter((item) => item.id !== ev.id));
    } catch (err: unknown) {
      const error = err as Error;
      alert(error?.message || 'Erreur lors de la suppression');
    }
  };

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
            description: 'Soirée officielle ASTRA Orléans. Entrée gratuite sous présentation du QR code.',
            cover_image_url: POSTER_PRESETS[i % POSTER_PRESETS.length].url,
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
            Programmation des soirées ASTRA avec affiches, horaires et gestion des inscriptions.
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
                <th className="py-3.5 px-5 font-semibold">Affiche & Soirée</th>
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
                        <div className="flex items-center gap-3">
                          {ev.cover_image_url ? (
                            <img
                              src={ev.cover_image_url}
                              alt={ev.name}
                              className="w-12 h-14 object-cover rounded-xl border border-[#2b3044] shadow"
                            />
                          ) : (
                            <div className="w-12 h-14 rounded-xl bg-[#171a25] border border-[#252b3d] flex items-center justify-center text-gray-500">
                              <ImageIcon className="w-5 h-5 text-gray-600" />
                            </div>
                          )}
                          <div>
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
                          </div>
                        </div>
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
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(ev)}
                            title="Modifier cette soirée"
                            className="p-1.5 rounded-lg bg-[#171a25] hover:bg-[#202534] border border-[#262c3e] text-gray-300 hover:text-white transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <Link
                            href={`/admin/events/${ev.id}`}
                            title="Invités & Détails"
                            className="p-1.5 rounded-lg bg-[#171a25] hover:bg-[#202534] border border-[#262c3e] text-gray-300 hover:text-white transition-colors"
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                          <button
                            onClick={() => handleDeleteEvent(ev)}
                            title="Supprimer cette soirée"
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL CRÉATION DE SOIRÉE */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0f1118] border border-[#232738] rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto">
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

              {/* Sélection ou Import de l'Affiche */}
              <div>
                <label className="block font-semibold text-gray-300 mb-1.5">
                  Affiche de la soirée (affichée sur les billets QR des invités)
                </label>

                {/* Bouton d'import direct de fichier depuis le PC/mobile */}
                <div className="mb-2.5">
                  <label className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-[#1b1e2c] hover:bg-[#252b3d] border border-dashed border-[#e5b85c]/60 rounded-xl text-xs text-[#e5b85c] font-bold cursor-pointer transition-all shadow group">
                    <Upload className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    <span>📁 Importer mon affiche perso (PNG, JPG, WebP)</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFilePosterUpload(e, false)}
                    />
                  </label>
                </div>

                {/* Analyse intelligente et Sélecteur de Ratio/Format */}
                {createAnalysis && (
                  <div className="mb-3 p-2.5 rounded-xl bg-[#141724] border border-[#e5b85c]/30 text-xs">
                    <div className="flex items-center gap-1.5 text-[#e5b85c] font-bold text-[11px] mb-2">
                      <Sparkles className="w-3.5 h-3.5 shrink-0" />
                      <span>{createAnalysis}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] text-gray-400 mr-1 font-medium">Format cible :</span>
                      {[
                        { id: 'auto', label: '⚡ Auto' },
                        { id: '9:16', label: '📱 9:16 Story' },
                        { id: '4:5', label: '🎨 4:5 Flyer' },
                        { id: '4:3', label: '🖼️ 4:3' },
                        { id: 'original', label: '📐 Original' },
                      ].map((fmt) => (
                        <button
                          key={fmt.id}
                          type="button"
                          onClick={() => changeCreateFormat(fmt.id as PosterFormat)}
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                            createFormat === fmt.id
                              ? 'bg-[#e5b85c] text-black shadow'
                              : 'bg-[#1b1f2e] text-gray-300 hover:text-white border border-[#272e42]'
                          }`}
                        >
                          {fmt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Prévisualisation de l'affiche sélectionnée si présente */}
                {coverImageUrl && (
                  <div className="relative mb-2.5 h-36 rounded-xl overflow-hidden border border-[#e5b85c]/40 group bg-black/40 flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={coverImageUrl} alt="Aperçu affiche" className="w-full h-full object-contain" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <span className="text-[11px] font-bold text-white bg-black/70 px-2 py-1 rounded">Affiche active</span>
                      <button
                        type="button"
                        onClick={() => {
                          setCoverImageUrl('');
                          setCreateRawImg(null);
                          setCreateAnalysis(null);
                        }}
                        className="px-2 py-1 bg-rose-600/90 hover:bg-rose-600 text-white rounded text-[11px] font-bold cursor-pointer"
                      >
                        Retirer
                      </button>
                    </div>
                  </div>
                )}

                <p className="text-[10px] text-gray-400 font-medium mb-1">Ou choisir parmi les thèmes ASTRA :</p>
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {POSTER_PRESETS.map((preset) => (
                    <button
                      type="button"
                      key={preset.name}
                      onClick={() => setCoverImageUrl(preset.url)}
                      className={`relative rounded-xl overflow-hidden border-2 transition-all cursor-pointer h-16 ${
                        coverImageUrl === preset.url
                          ? 'border-[#e5b85c] scale-105 shadow-md ring-2 ring-[#e5b85c]/30'
                          : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={preset.url} alt={preset.name} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={coverImageUrl}
                  onChange={(e) => setCoverImageUrl(e.target.value)}
                  placeholder="Ou collez une URL d'image personnalisée"
                  className="w-full px-3 py-2 bg-[#151822] border border-[#24283b] rounded-xl text-white font-mono text-[11px] focus:outline-none focus:border-[#e5b85c]"
                />
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

      {/* MODAL MODIFICATION DE SOIRÉE */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0f1118] border border-[#232738] rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-2 mb-4">
              <Edit3 className="w-5 h-5 text-[#e5b85c]" />
              <h2 className="text-lg font-bold text-white">Modifier la soirée</h2>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleUpdateEvent} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-gray-300 mb-1">Nom de la soirée *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#151822] border border-[#24283b] rounded-xl text-white focus:outline-none focus:border-[#e5b85c]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-300 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={editEventDate}
                    onChange={(e) => setEditEventDate(e.target.value)}
                    className="w-full px-3 py-2 bg-[#151822] border border-[#24283b] rounded-xl text-white focus:outline-none focus:border-[#e5b85c]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-300 mb-1">Statut</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as EventStatus)}
                    className="w-full px-3 py-2 bg-[#151822] border border-[#24283b] rounded-xl text-white focus:outline-none focus:border-[#e5b85c]"
                  >
                    <option value="published">Publié (ouvert aux réservations)</option>
                    <option value="closed">Fermé (soirée terminée)</option>
                    <option value="draft">Brouillon</option>
                    <option value="cancelled">Annulé</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-300 mb-1">Début</label>
                  <input
                    type="time"
                    value={editStartTime}
                    onChange={(e) => setEditStartTime(e.target.value)}
                    className="w-full px-3 py-2 bg-[#151822] border border-[#24283b] rounded-xl text-white focus:outline-none focus:border-[#e5b85c]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-300 mb-1">Fin</label>
                  <input
                    type="time"
                    value={editEndTime}
                    onChange={(e) => setEditEndTime(e.target.value)}
                    className="w-full px-3 py-2 bg-[#151822] border border-[#24283b] rounded-xl text-white focus:outline-none focus:border-[#e5b85c]"
                  />
                </div>
              </div>

              {/* Sélection ou Import de l'Affiche */}
              <div>
                <label className="block font-semibold text-gray-300 mb-1.5">
                  Affiche de la soirée (affichée sur les billets QR)
                </label>

                {/* Bouton d'import direct de fichier depuis le PC/mobile */}
                <div className="mb-2.5">
                  <label className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-[#1b1e2c] hover:bg-[#252b3d] border border-dashed border-[#e5b85c]/60 rounded-xl text-xs text-[#e5b85c] font-bold cursor-pointer transition-all shadow group">
                    <Upload className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    <span>📁 Importer une nouvelle affiche perso (PNG, JPG, WebP)</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFilePosterUpload(e, true)}
                    />
                  </label>
                </div>

                {/* Analyse intelligente et Sélecteur de Ratio/Format */}
                {editAnalysis && (
                  <div className="mb-3 p-2.5 rounded-xl bg-[#141724] border border-[#e5b85c]/30 text-xs">
                    <div className="flex items-center gap-1.5 text-[#e5b85c] font-bold text-[11px] mb-2">
                      <Sparkles className="w-3.5 h-3.5 shrink-0" />
                      <span>{editAnalysis}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] text-gray-400 mr-1 font-medium">Format cible :</span>
                      {[
                        { id: 'auto', label: '⚡ Auto' },
                        { id: '9:16', label: '📱 9:16 Story' },
                        { id: '4:5', label: '🎨 4:5 Flyer' },
                        { id: '4:3', label: '🖼️ 4:3' },
                        { id: 'original', label: '📐 Original' },
                      ].map((fmt) => (
                        <button
                          key={fmt.id}
                          type="button"
                          onClick={() => changeEditFormat(fmt.id as PosterFormat)}
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                            editFormat === fmt.id
                              ? 'bg-[#e5b85c] text-black shadow'
                              : 'bg-[#1b1f2e] text-gray-300 hover:text-white border border-[#272e42]'
                          }`}
                        >
                          {fmt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Prévisualisation de l'affiche sélectionnée si présente */}
                {editCoverImageUrl && (
                  <div className="relative mb-2.5 h-36 rounded-xl overflow-hidden border border-[#e5b85c]/40 group bg-black/40 flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={editCoverImageUrl} alt="Aperçu affiche" className="w-full h-full object-contain" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <span className="text-[11px] font-bold text-white bg-black/70 px-2 py-1 rounded">Affiche actuelle</span>
                      <button
                        type="button"
                        onClick={() => {
                          setEditCoverImageUrl('');
                          setEditRawImg(null);
                          setEditAnalysis(null);
                        }}
                        className="px-2 py-1 bg-rose-600/90 hover:bg-rose-600 text-white rounded text-[11px] font-bold cursor-pointer"
                      >
                        Retirer
                      </button>
                    </div>
                  </div>
                )}

                <p className="text-[10px] text-gray-400 font-medium mb-1">Ou choisir parmi les thèmes ASTRA :</p>
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {POSTER_PRESETS.map((preset) => (
                    <button
                      type="button"
                      key={preset.name}
                      onClick={() => setEditCoverImageUrl(preset.url)}
                      className={`relative rounded-xl overflow-hidden border-2 transition-all cursor-pointer h-16 ${
                        editCoverImageUrl === preset.url
                          ? 'border-[#e5b85c] scale-105 shadow-md ring-2 ring-[#e5b85c]/30'
                          : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={preset.url} alt={preset.name} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={editCoverImageUrl}
                  onChange={(e) => setEditCoverImageUrl(e.target.value)}
                  placeholder="https://... URL personnalisée de l'affiche"
                  className="w-full px-3 py-2 bg-[#151822] border border-[#24283b] rounded-xl text-white font-mono text-[11px] focus:outline-none focus:border-[#e5b85c]"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-300 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-[#151822] border border-[#24283b] rounded-xl text-white focus:outline-none focus:border-[#e5b85c]"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="flex-1 py-2.5 bg-[#171a25] hover:bg-[#202534] text-gray-300 rounded-xl font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-[#e5b85c] text-black font-bold rounded-xl disabled:opacity-50"
                >
                  {submitting ? 'Enregistrement...' : 'Enregistrer les modifications'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL RÉCURRENCE */}
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
                <label className="block font-semibold text-gray-300 mb-1">Date du 1er samedi</label>
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
