'use client';

import React, { useState, useTransition, useMemo } from 'react';
import { 
  Users, 
  Search, 
  CheckCircle2, 
  Clock, 
  Printer, 
  Copy, 
  Check, 
  UserCheck, 
  AlertCircle, 
  ExternalLink,
  Sparkles,
  QrCode,
  ShieldCheck,
  Download
} from 'lucide-react';

export interface GuestRegistrationItem {
  id: string;
  qr_token: string;
  guest_name: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  registered_at: string;
  promoter_name: string;
  is_duo: boolean;
  companion_name: string | null;
  is_checked_in: boolean;
  scanned_at: string | null;
}

interface EventGuestlistManagerProps {
  eventId: string;
  eventName: string;
  eventDate: string;
  initialGuests: GuestRegistrationItem[];
  maxCapacity?: number;
  onEntryValidated?: () => void;
}

export default function EventGuestlistManager({
  eventId,
  eventName,
  eventDate,
  initialGuests,
  maxCapacity = 600,
  onEntryValidated,
}: EventGuestlistManagerProps) {
  const [guests, setGuests] = useState<GuestRegistrationItem[]>(initialGuests);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'entered'>('all');
  const [isPending, startTransition] = useTransition();
  const [validatingId, setValidatingId] = useState<string | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [copiedSuccess, setCopiedSuccess] = useState(false);

  // Statistiques calculées
  const totalCount = guests.length;
  const enteredCount = guests.filter((g) => g.is_checked_in).length;
  const pendingCount = totalCount - enteredCount;

  // Filtrage
  const filteredGuests = useMemo(() => {
    return guests.filter((g) => {
      // Filtre statut
      if (statusFilter === 'pending' && g.is_checked_in) return false;
      if (statusFilter === 'entered' && !g.is_checked_in) return false;

      // Filtre recherche
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        g.guest_name.toLowerCase().includes(q) ||
        g.first_name.toLowerCase().includes(q) ||
        g.last_name.toLowerCase().includes(q) ||
        (g.companion_name && g.companion_name.toLowerCase().includes(q)) ||
        (g.phone && g.phone.toLowerCase().includes(q)) ||
        g.promoter_name.toLowerCase().includes(q)
      );
    });
  }, [guests, searchQuery, statusFilter]);

  // Validation manuelle de l'entrée sans QR code physique
  const handleManualCheckIn = async (guest: GuestRegistrationItem) => {
    if (guest.is_checked_in) return;
    setValidatingId(guest.id);
    setActionSuccessMsg(null);

    try {
      const res = await fetch('/api/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qr_token: guest.qr_token,
          scanned_by: 'MANUAL_ADMIN_STAFF',
        }),
      });

      const json = await res.json();

      if (res.ok && (json.status === 'VALID' || json.status === 'ALREADY_USED')) {
        // Mettre à jour l'état local immédiatement
        setGuests((prev) =>
          prev.map((item) =>
            item.id === guest.id
              ? {
                  ...item,
                  is_checked_in: true,
                  scanned_at: new Date().toISOString(),
                }
              : item
          )
        );
        setActionSuccessMsg(` Entrée gratuite validée pour ${guest.guest_name} !`);
        setTimeout(() => setActionSuccessMsg(null), 4000);
        if (onEntryValidated) onEntryValidated();
      } else {
        alert(`Erreur : ${json.message || 'Impossible de valider cette entrée.'}`);
      }
    } catch (err) {
      console.error('Erreur validation manuelle:', err);
      alert('Erreur réseau lors de la validation.');
    } finally {
      setValidatingId(null);
    }
  };

  // Copier le listing pour WhatsApp / SMS
  const handleCopyForWhatsApp = () => {
    if (guests.length === 0) return;

    const formattedDate = new Date(eventDate).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });

    let text = `📋 *LISTE ENTRÉES GRATUITES — ${eventName.toUpperCase()} (${formattedDate})*\n`;
    text += `Total inscrits : ${totalCount} | Déjà entrés : ${enteredCount}\n`;
    text += `------------------------------------\n\n`;

    // Trier par nom alphabétique
    const sorted = [...guests].sort((a, b) => a.last_name.localeCompare(b.last_name));

    sorted.forEach((g, idx) => {
      const checkIcon = g.is_checked_in ? '✅' : '⏳';
      const duoInfo = g.is_duo && g.companion_name ? ` (+1: ${g.companion_name})` : (g.is_duo ? ' (+1 Duo)' : '');
      const rpInfo = g.promoter_name ? ` [RP: ${g.promoter_name}]` : '';
      text += `${idx + 1}. ${checkIcon} *${g.last_name.toUpperCase()} ${g.first_name}*${duoInfo}${rpInfo}\n`;
    });

    text += `\n_Liste officielle générée depuis le Dashboard ASTRA_`;

    navigator.clipboard.writeText(text);
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 3000);
  };

  // Imprimer la liste pour la porte
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 md:p-6 backdrop-blur-sm relative overflow-hidden shadow-2xl">
      {/* En-tête de section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 text-indigo-300 rounded-xl">
              <Users className="w-5 h-5 text-indigo-400" />
            </span>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              Listing Salariés & Entrées Gratuites
              <span className="text-xs bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 px-2.5 py-0.5 rounded-full font-medium">
                {eventName}
              </span>
            </h2>
          </div>
          <p className="text-sm text-zinc-400">
            Tous les clubbers inscrits pour la soirée. Le personnel peut pointer les entrées sans scan physique.
          </p>
        </div>

        {/* Boutons d'export / transmission au staff */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleCopyForWhatsApp}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs font-semibold transition shadow-sm active:scale-95"
            title="Copier le listing prêt à être collé dans WhatsApp pour le salarié du club"
          >
            {copiedSuccess ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-emerald-400" />}
            {copiedSuccess ? 'Listing Copié !' : 'Copier pour WhatsApp'}
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white/10 hover:bg-white/15 border border-white/15 text-zinc-200 rounded-xl text-xs font-semibold transition active:scale-95"
            title="Imprimer la feuille de pointage papier pour la porte"
          >
            <Printer className="w-4 h-4 text-zinc-300" />
            Imprimer Fiche Porte
          </button>
        </div>
      </div>

      {/* Message de succès temporaire */}
      {actionSuccessMsg && (
        <div className="mt-4 p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl flex items-center gap-2.5 text-emerald-300 text-sm animate-fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* Barre d'outils : Métriques rapides, Recherche et Filtres */}
      <div className="mt-5 grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
        {/* Recherche */}
        <div className="md:col-span-6 relative">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher par prénom, nom, téléphone, RP..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-black/30 border border-white/10 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/60 transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-white"
            >
              Effacer
            </button>
          )}
        </div>

        {/* Filtres de statut */}
        <div className="md:col-span-6 flex items-center gap-1.5 justify-start md:justify-end overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-2 rounded-xl text-xs font-medium transition flex items-center gap-1.5 ${
              statusFilter === 'all'
                ? 'bg-indigo-600 text-white font-semibold shadow-lg shadow-indigo-600/30'
                : 'bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border border-white/5'
            }`}
          >
            <span>Tous</span>
            <span className="px-1.5 py-0.5 rounded-full bg-black/40 text-[10px]">{totalCount}</span>
          </button>

          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-2 rounded-xl text-xs font-medium transition flex items-center gap-1.5 ${
              statusFilter === 'pending'
                ? 'bg-amber-500/30 text-amber-200 border border-amber-500/50 font-semibold'
                : 'bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border border-white/5'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>En attente</span>
            <span className="px-1.5 py-0.5 rounded-full bg-black/40 text-[10px] text-amber-300">{pendingCount}</span>
          </button>

          <button
            onClick={() => setStatusFilter('entered')}
            className={`px-3 py-2 rounded-xl text-xs font-medium transition flex items-center gap-1.5 ${
              statusFilter === 'entered'
                ? 'bg-emerald-500/30 text-emerald-200 border border-emerald-500/50 font-semibold'
                : 'bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border border-white/5'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Déjà entrés</span>
            <span className="px-1.5 py-0.5 rounded-full bg-black/40 text-[10px] text-emerald-300">{enteredCount}</span>
          </button>
        </div>
      </div>

      {/* Liste des inscrits (Tableau PC / Cartes Mobile) */}
      <div className="mt-4">
        {filteredGuests.length === 0 ? (
          <div className="py-12 text-center bg-black/20 rounded-xl border border-white/5">
            <Users className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
            <p className="text-zinc-300 font-medium">Aucun inscrit ne correspond à votre recherche.</p>
            <p className="text-xs text-zinc-500 mt-1">
              {totalCount === 0
                ? 'Aucun pass réservé pour le moment sur cette soirée.'
                : 'Modifiez votre filtre ou votre recherche textuelle.'}
            </p>
          </div>
        ) : (
          <>
            {/* Version Bureau (Tableau) */}
            <div className="hidden md:block overflow-x-auto rounded-xl border border-white/10 bg-black/20">
              <table className="w-full text-left text-sm text-zinc-300">
                <thead className="bg-white/5 text-xs uppercase tracking-wider text-zinc-400 border-b border-white/10 font-semibold">
                  <tr>
                    <th className="py-3 px-4">Clubber (Prénom & Nom)</th>
                    <th className="py-3 px-3">Type de Pass</th>
                    <th className="py-3 px-3">RP Inviteur</th>
                    <th className="py-3 px-3">Téléphone</th>
                    <th className="py-3 px-3">Statut Entrée</th>
                    <th className="py-3 px-4 text-right">Action Salarié</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredGuests.map((guest) => {
                    const isValidating = validatingId === guest.id;

                    return (
                      <tr
                        key={guest.id}
                        className={`transition hover:bg-white/[0.04] ${
                          guest.is_checked_in ? 'bg-emerald-950/10' : ''
                        }`}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                              guest.is_checked_in 
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                                : 'bg-zinc-800 text-zinc-300 border border-white/10'
                            }`}>
                              {guest.first_name?.[0] || '?'}{guest.last_name?.[0] || ''}
                            </div>
                            <div>
                              <div className="font-semibold text-white">
                                {guest.first_name} {guest.last_name}
                              </div>
                              <div className="text-[11px] text-zinc-500">
                                Inscrit le {new Date(guest.registered_at).toLocaleDateString('fr-FR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          {guest.is_duo ? (
                            <div>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-medium">
                                👥 Pass Duo
                              </span>
                              {guest.companion_name && (
                                <div className="text-xs text-zinc-400 mt-0.5 font-normal">
                                  +1 : <span className="text-white font-medium">{guest.companion_name}</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 border border-white/5 text-xs">
                              Solo
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-3">
                          <span className="text-xs font-medium text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">
                            {guest.promoter_name}
                          </span>
                        </td>

                        <td className="py-3 px-3 text-xs text-zinc-400 font-mono">
                          {guest.phone || '—'}
                        </td>

                        <td className="py-3 px-3">
                          {guest.is_checked_in ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              Entré
                              {guest.scanned_at && (
                                <span className="text-[10px] text-emerald-400/80 font-normal">
                                  ({new Date(guest.scanned_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })})
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20 text-xs font-medium">
                              <Clock className="w-3.5 h-3.5 text-amber-400" />
                              En attente
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right">
                          {guest.is_checked_in ? (
                            <span className="text-xs text-zinc-500 italic">
                              Entrée déjà validée
                            </span>
                          ) : (
                            <button
                              onClick={() => handleManualCheckIn(guest)}
                              disabled={isValidating}
                              className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition shadow-md shadow-emerald-900/30 active:scale-95 inline-flex items-center gap-1.5"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              {isValidating ? 'Validation...' : 'Valider Entrée (Sans Scan)'}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Version Mobile (Cartes optimisées) */}
            <div className="md:hidden space-y-3">
              {filteredGuests.map((guest) => {
                const isValidating = validatingId === guest.id;

                return (
                  <div
                    key={guest.id}
                    className={`p-4 rounded-xl border transition ${
                      guest.is_checked_in
                        ? 'bg-emerald-950/15 border-emerald-500/30'
                        : 'bg-black/30 border-white/10'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-bold text-white text-base">
                          {guest.first_name} {guest.last_name}
                        </div>
                        {guest.phone && (
                          <div className="text-xs text-zinc-400 font-mono mt-0.5">
                            {guest.phone}
                          </div>
                        )}
                      </div>

                      <div>
                        {guest.is_checked_in ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold">
                            <Check className="w-3 h-3 text-emerald-400" />
                            Entré
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[11px] font-medium">
                            En attente
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Informations complémentaires */}
                    <div className="mt-3 pt-2.5 border-t border-white/5 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        {guest.is_duo && (
                          <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[11px]">
                            👥 Duo {guest.companion_name ? `(${guest.companion_name})` : ''}
                          </span>
                        )}
                        <span className="text-zinc-400">
                          RP: <strong className="text-indigo-300">{guest.promoter_name}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Bouton de validation pour mobile */}
                    {!guest.is_checked_in && (
                      <button
                        onClick={() => handleManualCheckIn(guest)}
                        disabled={isValidating}
                        className="mt-3 w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-md shadow-emerald-900/30 active:scale-95 flex items-center justify-center gap-2"
                      >
                        <UserCheck className="w-4 h-4" />
                        {isValidating ? 'Validation en cours...' : 'Valider Entrée Gratuite'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Vue d'impression masquée à l'écran, active lors du print */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-area, #print-area * {
            visibility: visible;
          }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            color: black !important;
            padding: 20px;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div id="print-area" className="hidden">
        <div style={{ fontFamily: 'sans-serif', color: '#000', padding: '10px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 'bold', margin: '0 0 4px 0' }}>
            LISTE OFFICIELLE DES ENTRÉES GRATUITES — {eventName.toUpperCase()}
          </h1>
          <p style={{ fontSize: '12px', color: '#555', margin: '0 0 15px 0' }}>
            Date : {new Date(eventDate).toLocaleDateString('fr-FR')} • Total Inscrits : {totalCount} clubbers
          </p>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #000' }}>
                <th style={{ padding: '6px', width: '30px' }}>N°</th>
                <th style={{ padding: '6px', width: '40px' }}>Émargé</th>
                <th style={{ padding: '6px' }}>Nom & Prénom</th>
                <th style={{ padding: '6px' }}>Accompagnant (Duo)</th>
                <th style={{ padding: '6px' }}>RP Référent</th>
                <th style={{ padding: '6px' }}>Téléphone</th>
              </tr>
            </thead>
            <tbody>
              {[...guests]
                .sort((a, b) => a.last_name.localeCompare(b.last_name))
                .map((g, idx) => (
                  <tr key={g.id} style={{ borderBottom: '1px solid #ddd' }}>
                    <td style={{ padding: '6px' }}>{idx + 1}</td>
                    <td style={{ padding: '6px', textAlign: 'center' }}>
                      <span style={{ display: 'inline-block', width: '14px', height: '14px', border: '1px solid #000' }}>
                        {g.is_checked_in ? '✓' : ''}
                      </span>
                    </td>
                    <td style={{ padding: '6px', fontWeight: 'bold' }}>
                      {g.last_name.toUpperCase()} {g.first_name}
                    </td>
                    <td style={{ padding: '6px' }}>
                      {g.is_duo ? (g.companion_name || 'Accompagnant Duo') : '—'}
                    </td>
                    <td style={{ padding: '6px' }}>{g.promoter_name}</td>
                    <td style={{ padding: '6px' }}>{g.phone || '—'}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
