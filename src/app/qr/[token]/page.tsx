'use client';

import { useEffect, useState, useRef, use } from 'react';
import QRCode from 'qrcode';
import { createClient } from '@/lib/supabase/client';
import { formatFrenchDate, formatFrenchTime } from '@/lib/utils';
import { Sparkles, Calendar, Clock, Download, AlertCircle, CheckCircle2, ShieldCheck, SunMedium, XCircle } from 'lucide-react';
import confetti from 'canvas-confetti';

interface RegistrationDetail {
  id: string;
  qr_token: string;
  status: string;
  guest: {
    first_name: string;
    last_name: string;
  };
  event: {
    name: string;
    event_date: string;
    start_time: string;
    end_time: string;
    cover_image_url?: string | null;
  };
  promoter: {
    first_name: string;
    last_name: string;
    avatar_url?: string | null;
  };
}

export default function GuestQrPassPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [registration, setRegistration] = useState<RegistrationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [qrGenerated, setQrGenerated] = useState(false);

  useEffect(() => {
    async function loadRegistration() {
      setLoading(true);
      setErrorMsg(null);
      const supabase = createClient();

      try {
        const { data, error } = await supabase
          .from('registrations')
          .select(`
            id,
            qr_token,
            status,
            guest:guests(first_name, last_name),
            event:events(name, event_date, start_time, end_time, cover_image_url),
            promoter:promoters(first_name, last_name, avatar_url)
          `)
          .eq('qr_token', token)
          .maybeSingle();

        if (error || !data) {
          setErrorMsg('QR code introuvable ou expiré.');
          setLoading(false);
          return;
        }

        // Supabase typage join
        const regDetail: RegistrationDetail = {
          id: data.id,
          qr_token: data.qr_token,
          status: data.status,
          guest: Array.isArray(data.guest) ? data.guest[0] : (data.guest as unknown as { first_name: string; last_name: string }),
          event: Array.isArray(data.event) ? data.event[0] : (data.event as unknown as { name: string; event_date: string; start_time: string; end_time: string; cover_image_url?: string | null }),
          promoter: Array.isArray(data.promoter) ? data.promoter[0] : (data.promoter as unknown as { first_name: string; last_name: string; avatar_url?: string | null }),
        };

        setRegistration(regDetail);

        // Confetti d'obtention de pass
        try {
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.6 },
            colors: ['#e5b85c', '#ffffff', '#10b981'],
          });
        } catch {
          // Non bloquant
        }
      } catch (err: unknown) {
        const error = err as Error;
        setErrorMsg(error?.message || 'Erreur de chargement.');
      } finally {
        setLoading(false);
      }
    }

    loadRegistration();
  }, [token]);

  // Génération du QR code haute résolution
  useEffect(() => {
    if (!registration || !canvasRef.current) return;

    // Le QR code contient le token (ou une URL de check-in sécurisée)
    const qrData = `${typeof window !== 'undefined' ? window.location.origin : ''}/check-in/${registration.qr_token}`;

    QRCode.toCanvas(
      canvasRef.current,
      qrData,
      {
        width: 280,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
        errorCorrectionLevel: 'H',
      },
      (error) => {
        if (error) {
          console.error(error);
        } else {
          setQrGenerated(true);
        }
      }
    );
  }, [registration]);

  const isEventExpired = (() => {
    if (!registration?.event?.event_date) return false;
    const [year, month, day] = registration.event.event_date.split('-').map(Number);
    // La soirée club du jour D se termine au plus tard le lendemain matin à 12h00
    const expiryTime = new Date(year, month - 1, day + 1, 12, 0, 0);
    return new Date() > expiryTime;
  })();

  const handleDownload = () => {
    if (!canvasRef.current || !registration || isEventExpired) return;
    const link = document.createElement('a');
    link.download = `ASTRA-PASS-${registration.guest.last_name.toUpperCase()}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#08090d]">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-12 h-12 rounded-full border-2 border-[#e5b85c] border-t-transparent animate-spin" />
          <p className="text-gray-400 text-sm font-medium">Génération de votre Pass ASTRA...</p>
        </div>
      </div>
    );
  }

  if (!registration || errorMsg) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#08090d] text-center">
        <div className="max-w-md p-8 bg-[#0f1118] border border-[#1d212f] rounded-2xl">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Billet introuvable</h1>
          <p className="text-gray-400 text-sm">
            {errorMsg || 'Ce QR code est introuvable ou a été annulé.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 bg-[#08090d] text-gray-100">
      {/* Background glow */}
      <div className="fixed top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#e5b85c]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm relative z-10">
        {/* Pass Card */}
        <div className="bg-[#0f1118] border border-[#232738] rounded-3xl overflow-hidden shadow-2xl relative">
          {/* BANDEAU ENTRÉE 100% GRATUITE HAUTE VISIBILITÉ */}
          {!isEventExpired ? (
            <div className="bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-500 text-black py-2.5 px-4 text-center font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg">
              <Sparkles className="w-4 h-4 text-black shrink-0" />
              <span>BILLET COUPE-FILE • ENTRÉE 100% GRATUITE</span>
            </div>
          ) : (
            <div className="bg-rose-600/90 text-white py-2.5 px-4 text-center font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg">
              <AlertCircle className="w-4 h-4 text-white shrink-0" />
              <span>SOIRÉE PASSÉE • BILLET EXPIRÉ</span>
            </div>
          )}

          {/* Event Poster Banner */}
          {registration.event.cover_image_url ? (
            <div className="relative h-48 w-full overflow-hidden border-b border-[#232738]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={registration.event.cover_image_url}
                alt={registration.event.name}
                className={`w-full h-full object-cover object-center ${isEventExpired ? 'grayscale contrast-125 opacity-60' : ''}`}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0f1118] via-[#0f1118]/40 to-black/60" />
              <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-black/70 backdrop-blur-md text-[#e5b85c] border border-[#e5b85c]/40 shadow">
                  ASTRA CLUB
                </span>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider shadow ${
                  isEventExpired ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-black'
                }`}>
                  {isEventExpired ? 'Expiré' : 'Entrée Gratuite'}
                </span>
              </div>
              <div className="absolute bottom-3 left-4 right-4">
                <p className="text-[11px] font-bold text-[#e5b85c] uppercase tracking-wider">Soirée Officielle</p>
                <h2 className="text-lg font-black text-white leading-tight drop-shadow truncate">
                  {registration.event.name}
                </h2>
              </div>
            </div>
          ) : (
            <div className="p-6 bg-gradient-to-b from-[#181b26] to-[#0f1118] border-b border-[#232738] text-center relative">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-[#0b0c10] border border-[#282d3f] mb-2 shadow-inner">
                <Sparkles className="w-5 h-5 text-[#e5b85c]" />
              </div>
              <h1 className="text-2xl font-black tracking-widest text-white uppercase">
                ASTRA
              </h1>
              <p className="text-[10px] tracking-widest text-[#e5b85c] uppercase font-bold">
                Pass Invité • Entrée 100% Gratuite
              </p>
            </div>
          )}

          {/* Invité & RP */}
          <div className="px-5 py-3.5 bg-[#12141c] border-b border-[#232738]/80 flex items-center justify-between text-left">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Invité Nominatif</p>
              <p className="font-extrabold text-white text-base">
                {registration.guest.first_name} {registration.guest.last_name}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Invité par le RP</p>
              <p className="font-bold text-[#e5b85c] text-sm">
                {registration.promoter.first_name} {registration.promoter.last_name}
              </p>
            </div>
          </div>

          {/* QR Code Container ou Message Expiré */}
          {isEventExpired ? (
            <div className="p-8 flex flex-col items-center justify-center bg-[#0d0e14] text-center">
              <div className="w-20 h-20 rounded-full bg-rose-500/15 border-2 border-rose-500/40 flex items-center justify-center mb-4 text-rose-500 shadow-inner">
                <XCircle className="w-10 h-10" />
              </div>
              <p className="text-base font-black text-white mb-1.5 uppercase tracking-wide">
                QR Code Expiré
              </p>
              <p className="text-xs text-gray-400 max-w-xs leading-relaxed">
                La soirée du {formatFrenchDate(registration.event.event_date)} est terminée. Ce QR code n&apos;est plus actif et ne peut plus être scanné à l&apos;entrée.
              </p>
            </div>
          ) : (
            <div className="p-6 flex flex-col items-center justify-center bg-[#0d0e14]">
              <div className="p-3.5 bg-white rounded-2xl shadow-2xl flex items-center justify-center border-4 border-[#e5b85c]/30">
                <canvas ref={canvasRef} className="rounded-lg max-w-full h-auto block" />
              </div>

              <p className="text-xs font-bold text-white mt-4 tracking-wide text-center">
                Fais scanner ce QR code à l&apos;entrée
              </p>
              <p className="text-[11px] text-gray-400 mt-1 text-center">
                1 entrée gratuite par pass • Scan unique aux videurs
              </p>
            </div>
          )}

          {/* Détails Date & Horaires */}
          <div className="p-4 bg-[#0f1118] border-t border-[#232738] space-y-2">
            {!registration.event.cover_image_url && (
              <h2 className="text-sm font-bold text-white text-center">
                {registration.event.name}
              </h2>
            )}
            <div className="flex items-center justify-center gap-4 text-xs text-gray-200">
              <span className="flex items-center gap-1.5 capitalize font-medium">
                <Calendar className="w-3.5 h-3.5 text-[#e5b85c]" />
                {formatFrenchDate(registration.event.event_date)}
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <Clock className="w-3.5 h-3.5 text-[#e5b85c]" />
                {formatFrenchTime(registration.event.start_time)} → {formatFrenchTime(registration.event.end_time)}
              </span>
            </div>
          </div>

          {/* Consignes d'accès — Indispensable */}
          {!isEventExpired && (
            <div className="p-4 bg-[#141622] border-t border-[#232738] space-y-2.5 text-left">
              <div className="flex items-center gap-1.5 text-[#e5b85c] font-bold text-[11px] uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4 text-[#e5b85c] shrink-0" />
                <span>Comment utiliser ce billet ?</span>
              </div>
              <div className="space-y-2 text-xs text-gray-300">
                <div className="p-2.5 rounded-xl bg-[#0b0c12] border border-[#232738] flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <p className="leading-snug">
                    <strong className="text-white">Faites scanner ce pass quoi qu&apos;il arrive</strong> par les videurs ou le staff à la porte pour valider votre entrée gratuite.
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-[#0b0c12] border border-[#232738] flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-[#e5b85c] shrink-0 mt-0.5" />
                  <p className="leading-snug text-gray-400">
                    Votre entrée est <strong>100% gratuite</strong> grâce à l&apos;invitation de <strong>{registration.promoter.first_name}</strong>.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Conseil luminosité (si non expiré) */}
        {!isEventExpired && (
          <div className="mt-3 p-3 rounded-xl bg-[#13151f] border border-[#202434] flex items-center gap-2.5 text-xs text-gray-400">
            <SunMedium className="w-4 h-4 text-[#e5b85c] shrink-0" />
            <span>Augmente la luminosité de ton écran à l&apos;entrée pour faciliter le scan.</span>
          </div>
        )}

        {/* Bouton Sauvegarder dans la galerie */}
        {!isEventExpired ? (
          <button
            onClick={handleDownload}
            disabled={!qrGenerated}
            className="w-full mt-3 py-3.5 px-4 bg-[#181b26] hover:bg-[#202534] border border-[#2d3246] rounded-xl text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg active:scale-98"
          >
            <Download className="w-4 h-4 text-[#e5b85c]" />
            <span>Enregistrer le Pass (Image / Capture)</span>
          </button>
        ) : (
          <button
            disabled
            className="w-full mt-3 py-3.5 px-4 bg-[#141620] border border-[#252838] rounded-xl text-gray-500 font-semibold text-xs flex items-center justify-center gap-2 cursor-not-allowed opacity-70"
          >
            <AlertCircle className="w-4 h-4 text-rose-500" />
            <span>Billet expiré (Soirée passée)</span>
          </button>
        )}

        <p className="text-center text-[10px] text-gray-500 mt-4">
          ASTRA Club Orléans • Billet officiel nominatif vérifié
        </p>
      </div>
    </div>
  );
}
