'use client';

import { useState } from 'react';
import {
  X,
  MessageSquare,
  Send,
  Copy,
  Check,
  Share2,
  Calendar,
  Clock,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { InstagramIcon } from '@/components/ui/InstagramIcon';
import { formatFrenchDate, formatFrenchTime } from '@/lib/utils';

interface UpcomingEvent {
  id: string;
  name: string;
  event_date: string;
  start_time: string;
  end_time: string;
  cover_image_url: string | null;
}

interface EventShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  promoter: {
    first_name: string;
    last_name: string;
    slug: string;
  };
  upcomingEvent: UpcomingEvent | null;
  promoterPublicUrl: string;
}

export default function EventShareModal({
  isOpen,
  onClose,
  promoter,
  upcomingEvent,
  promoterPublicUrl,
}: EventShareModalProps) {
  const [copiedType, setCopiedType] = useState<string | null>(null);

  if (!isOpen) return null;

  const eventName = upcomingEvent ? upcomingEvent.name : 'Soirée Club';
  const eventDateStr = upcomingEvent ? formatFrenchDate(upcomingEvent.event_date) : '';
  const eventTimeStr = upcomingEvent
    ? `${formatFrenchTime(upcomingEvent.start_time)} → ${formatFrenchTime(upcomingEvent.end_time)}`
    : '';

  // Message 1 : WhatsApp complet
  const fullWhatsAppMessage = `Salut ! Je t'invite au club ASTRA à Orléans pour la soirée "${eventName}"${
    eventDateStr ? ` le ${eventDateStr}` : ''
  } ! 🎟️\n\nTon entrée est 100% GRATUITE avec mon pass invité RP. Récupère ton billet officiel ici :\n👉 ${promoterPublicUrl}\n\n⚠️ IMPORTANT : À ton arrivée, demande bien UNE ENTRÉE ASTRA, puis fais scanner ce pass par ton RP ou directement dans l'ASTRA après avoir pris ton entrée gratuite. Places limitées !`;

  // Message 2 : SMS rapide
  const smsMessage = `Salut ! Ton entrée pour l'ASTRA (${eventName}) est 100% GRATUITE avec mon pass RP. Télécharge ton billet ici : ${promoterPublicUrl} (Demande UNE ENTRÉE ASTRA à ton arrivée !)`;

  // Message 3 : Instagram DM / Story
  const instagramMessage = `🎟️ Mon Pass Invité officiel ASTRA pour la soirée "${eventName}" est disponible ! Entrée 100% GRATUITE avec mon lien personnel : ${promoterPublicUrl}\n\n⚠️ À l'arrivée, demande bien UNE ENTRÉE ASTRA puis fais scanner ce pass !`;

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2200);
  };

  const handleShareWhatsApp = () => {
    const encoded = encodeURIComponent(fullWhatsAppMessage);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  const handleShareSms = () => {
    const encoded = encodeURIComponent(smsMessage);
    window.open(`sms:?body=${encoded}`, '_blank');
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Invitation ASTRA — ${eventName}`,
          text: `Entrée 100% gratuite pour la soirée "${eventName}" à l'ASTRA Club avec le pass de ${promoter.first_name} !`,
          url: promoterPublicUrl,
        });
      } catch {
        // Ignorer si l'utilisateur annule le partage
      }
    }
  };

  const hasNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in-50 duration-200">
      <div className="bg-[#0f1118] border border-[#262c3e] rounded-3xl max-w-lg w-full max-h-[92vh] overflow-y-auto shadow-2xl relative">
        {/* Header Modal */}
        <div className="sticky top-0 z-10 bg-[#0f1118]/95 backdrop-blur-md px-6 py-4 border-b border-[#232738] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#e5b85c]/15 border border-[#e5b85c]/30 flex items-center justify-center text-[#e5b85c]">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">
                Choisir comment inviter
              </h3>
              <p className="text-[11px] text-gray-400">
                Sélectionnez l&apos;application ou le canal de votre choix
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-[#181b26] text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Aperçu de la soirée */}
          {upcomingEvent && (
            <div className="p-4 rounded-2xl bg-[#141724] border border-[#232738] flex items-center gap-3.5">
              {upcomingEvent.cover_image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={upcomingEvent.cover_image_url}
                  alt={upcomingEvent.name}
                  className="w-16 h-16 rounded-xl object-cover border border-[#2b3145] shrink-0"
                />
              )}
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#e5b85c] block">
                  Soirée sélectionnée
                </span>
                <h4 className="text-sm font-black text-white truncate">
                  {upcomingEvent.name}
                </h4>
                <div className="flex flex-wrap items-center gap-3 mt-1 text-[11px] text-gray-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-[#e5b85c]" />
                    {eventDateStr}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-[#e5b85c]" />
                    {eventTimeStr}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Grille des Options de Partage */}
          <div className="space-y-2.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">
              Où souhaitez-vous envoyer l&apos;invitation ?
            </label>

            {/* Option 1 : WhatsApp */}
            <button
              onClick={handleShareWhatsApp}
              className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-emerald-600/20 via-emerald-600/10 to-[#141724] hover:from-emerald-600/30 border border-emerald-500/40 flex items-center justify-between gap-3 text-left transition-all cursor-pointer group shadow-sm active:scale-99"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-black shrink-0 shadow-md">
                  <MessageSquare className="w-5 h-5 fill-current" />
                </div>
                <div>
                  <h5 className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors flex items-center gap-1.5">
                    <span>WhatsApp</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Recommandé
                    </span>
                  </h5>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Ouvre WhatsApp avec le message d&apos;invitation officiel pré-rempli
                  </p>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-emerald-400 shrink-0 opacity-70 group-hover:opacity-100" />
            </button>

            {/* Option 2 : Partage Téléphone Natif (AirDrop, Réseaux, etc.) */}
            {hasNativeShare && (
              <button
                onClick={handleNativeShare}
                className="w-full p-3.5 rounded-2xl bg-[#141724] hover:bg-[#1a1e2e] border border-[#2a3046] flex items-center justify-between gap-3 text-left transition-all cursor-pointer group active:scale-99"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-[#e5b85c] flex items-center justify-center text-black shrink-0 shadow-md">
                    <Share2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-white group-hover:text-[#e5b85c] transition-colors">
                      Partage Natif Téléphone
                    </h5>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      AirDrop, Snapchat, Messenger, Telegram ou contacts récents
                    </p>
                  </div>
                </div>
                <Sparkles className="w-4 h-4 text-[#e5b85c] shrink-0 opacity-70 group-hover:opacity-100" />
              </button>
            )}

            {/* Option 3 : SMS */}
            <button
              onClick={handleShareSms}
              className="w-full p-3.5 rounded-2xl bg-[#141724] hover:bg-[#1a1e2e] border border-[#2a3046] flex items-center justify-between gap-3 text-left transition-all cursor-pointer group active:scale-99"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center text-white shrink-0 shadow-md">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h5 className="text-xs font-bold text-white group-hover:text-blue-300 transition-colors">
                    Message SMS
                  </h5>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Ouvre l&apos;application Messages de votre téléphone avec le lien
                  </p>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-blue-400 shrink-0 opacity-70 group-hover:opacity-100" />
            </button>

            {/* Option 4 : Instagram (Texte Story / DM) */}
            <button
              onClick={() => handleCopy(instagramMessage, 'insta')}
              className="w-full p-3.5 rounded-2xl bg-[#141724] hover:bg-[#1a1e2e] border border-[#2a3046] flex items-center justify-between gap-3 text-left transition-all cursor-pointer group active:scale-99"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#833ab4] via-[#fd1d1d] to-[#fcb045] flex items-center justify-center text-white shrink-0 shadow-md">
                  <InstagramIcon className="w-5 h-5" />
                </div>
                <div>
                  <h5 className="text-xs font-bold text-white group-hover:text-rose-300 transition-colors">
                    Copier le texte Instagram (Story / DM)
                  </h5>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Format court idéal pour DM ou à coller sous un sticker de lien
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-rose-400 shrink-0">
                {copiedType === 'insta' ? '✓ Copié !' : 'Copier'}
              </span>
            </button>

            {/* Option 5 : Copier le Message Complet */}
            <button
              onClick={() => handleCopy(fullWhatsAppMessage, 'full_msg')}
              className="w-full p-3.5 rounded-2xl bg-[#141724] hover:bg-[#1a1e2e] border border-[#2a3046] flex items-center justify-between gap-3 text-left transition-all cursor-pointer group active:scale-99"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#23283a] border border-[#353d58] flex items-center justify-center text-[#e5b85c] shrink-0 shadow-md">
                  <Copy className="w-5 h-5" />
                </div>
                <div>
                  <h5 className="text-xs font-bold text-white group-hover:text-[#e5b85c] transition-colors">
                    Copier le message complet
                  </h5>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Texte détaillé avec consignes de porte, date et lien officiel
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-[#e5b85c] shrink-0">
                {copiedType === 'full_msg' ? '✓ Copié !' : 'Copier'}
              </span>
            </button>
          </div>

          {/* Lien Direct */}
          <div className="p-3 bg-[#0a0c12] border border-[#232738] rounded-2xl flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={promoterPublicUrl}
              className="flex-1 bg-transparent px-2 text-xs text-gray-300 font-mono focus:outline-none select-all truncate"
            />
            <button
              onClick={() => handleCopy(promoterPublicUrl, 'link')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                copiedType === 'link'
                  ? 'bg-emerald-500 text-black'
                  : 'bg-[#1c202d] hover:bg-[#252b3d] text-white border border-[#2d3246]'
              }`}
            >
              {copiedType === 'link' ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Copié !</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-[#e5b85c]" />
                  <span>Copier lien</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
