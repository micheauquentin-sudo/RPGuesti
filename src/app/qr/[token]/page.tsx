'use client';

import { useEffect, useState, useRef, use } from 'react';
import QRCode from 'qrcode';
import { createClient } from '@/lib/supabase/client';
import { formatFrenchDate, formatFrenchTime } from '@/lib/utils';
import { Sparkles, Calendar, Clock, Download, AlertCircle, CheckCircle2, ShieldCheck, SunMedium, XCircle, Share2, Check } from 'lucide-react';
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

// Helper pour charger une image dans le Canvas
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

// Helper pour dessiner un rectangle avec coins arrondis
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

// Générateur du billet VIP complet haute définition
async function generateFullTicketImage(
  registration: RegistrationDetail,
  qrCanvas: HTMLCanvasElement
): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = 900;
  canvas.height = 1460;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Impossible d’initialiser le moteur graphique.');

  // 1. Fond Club Sombre et Luxueux
  ctx.fillStyle = '#08090d';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Lueur dorée douce au centre
  const glowGrad = ctx.createRadialGradient(450, 380, 80, 450, 380, 600);
  glowGrad.addColorStop(0, 'rgba(229, 184, 92, 0.09)');
  glowGrad.addColorStop(1, 'rgba(8, 9, 13, 0)');
  ctx.fillStyle = glowGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 2. Double Cadre Doré et Graphite
  ctx.strokeStyle = '#e5b85c';
  ctx.lineWidth = 3;
  ctx.strokeRect(20, 20, 860, 1420);

  ctx.strokeStyle = '#232738';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(28, 28, 844, 1404);

  // Coins stylisés VIP
  const cornerSize = 28;
  ctx.strokeStyle = '#e5b85c';
  ctx.lineWidth = 4;
  // Haut gauche
  ctx.beginPath();
  ctx.moveTo(14, 14 + cornerSize);
  ctx.lineTo(14, 14);
  ctx.lineTo(14 + cornerSize, 14);
  ctx.stroke();
  // Haut droite
  ctx.beginPath();
  ctx.moveTo(886 - cornerSize, 14);
  ctx.lineTo(886, 14);
  ctx.lineTo(886, 14 + cornerSize);
  ctx.stroke();
  // Bas gauche
  ctx.beginPath();
  ctx.moveTo(14, 1446 - cornerSize);
  ctx.lineTo(14, 1446);
  ctx.lineTo(14 + cornerSize, 1446);
  ctx.stroke();
  // Bas droite
  ctx.beginPath();
  ctx.moveTo(886 - cornerSize, 1446);
  ctx.lineTo(886, 1446);
  ctx.lineTo(886, 1446 - cornerSize);
  ctx.stroke();

  // 3. Dessin du Logo Officiel 3D ASTRA Transparent
  try {
    const logoImg = await loadImage('/astra-logo.png');
    // Dessin centré du logo haute définition
    ctx.drawImage(logoImg, 360, 42, 180, 154);
  } catch (err) {
    console.warn('Logo ASTRA local non chargé, fallback texte', err);
  }

  // Sous-titre officiel
  ctx.textAlign = 'center';
  ctx.fillStyle = '#e5b85c';
  ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
  ctx.fillText('ORLÉANS', 450, 222);

  // 4. BANDEAU ENTRÉE 100% GRATUITE HAUTE VISIBILITÉ
  const bannerY = 246;
  const emeraldGrad = ctx.createLinearGradient(45, bannerY, 855, bannerY);
  emeraldGrad.addColorStop(0, '#059669');
  emeraldGrad.addColorStop(0.5, '#10b981');
  emeraldGrad.addColorStop(1, '#059669');
  ctx.fillStyle = emeraldGrad;
  drawRoundedRect(ctx, 45, bannerY, 810, 68, 16);
  ctx.fill();

  ctx.fillStyle = '#000000';
  ctx.font = '900 23px system-ui, -apple-system, sans-serif';
  ctx.fillText('★ ENTRÉE 100% GRATUITE • BILLET INVITÉ ★', 450, bannerY + 43);

  // 5. Affiche ou Bloc Soirée
  let currentY = 330;
  if (registration.event.cover_image_url) {
    try {
      const posterImg = await loadImage(registration.event.cover_image_url);
      ctx.save();
      drawRoundedRect(ctx, 45, currentY, 810, 220, 16);
      ctx.clip();

      // Fond ambiant pour combler les côtés harmonieusement
      ctx.drawImage(posterImg, 45, currentY, 810, 220);
      ctx.fillStyle = 'rgba(10, 12, 18, 0.72)';
      ctx.fillRect(45, currentY, 810, 220);

      // Affiche nette centrée avec respect strict du ratio (sans déformation)
      const pRatio = posterImg.width / (posterImg.height || 1);
      let fitW = 810;
      let fitH = 810 / pRatio;
      if (fitH > 220) {
        fitH = 220;
        fitW = 220 * pRatio;
      }
      const fitX = 45 + (810 - fitW) / 2;
      const fitY = currentY + (220 - fitH) / 2;
      ctx.drawImage(posterImg, fitX, fitY, fitW, fitH);

      // Dégradé sombre par-dessus l'affiche pour contraste du texte
      const posterGrad = ctx.createLinearGradient(45, currentY + 100, 45, currentY + 220);
      posterGrad.addColorStop(0, 'rgba(15, 17, 24, 0.1)');
      posterGrad.addColorStop(1, 'rgba(15, 17, 24, 0.96)');
      ctx.fillStyle = posterGrad;
      ctx.fillRect(45, currentY, 810, 220);
      ctx.restore();

      // Cadre affiche
      ctx.strokeStyle = '#232738';
      ctx.lineWidth = 2;
      drawRoundedRect(ctx, 45, currentY, 810, 220, 16);
      ctx.stroke();

      // Titre soirée
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 24px system-ui, -apple-system, sans-serif';
      ctx.fillText(registration.event.name, 450, currentY + 175);

      // Date & Horaires
      ctx.fillStyle = '#e5b85c';
      ctx.font = 'bold 15px system-ui, -apple-system, sans-serif';
      const eventDateStr = formatFrenchDate(registration.event.event_date).toUpperCase();
      const eventTimeStr = `${formatFrenchTime(registration.event.start_time)} → ${formatFrenchTime(registration.event.end_time)}`;
      ctx.fillText(`📅 ${eventDateStr}  •  ⏰ ${eventTimeStr}`, 450, currentY + 202);

      currentY += 236;
    } catch {
      // Fallback
      currentY = drawFallbackPoster(ctx, registration, currentY);
    }
  } else {
    currentY = drawFallbackPoster(ctx, registration, currentY);
  }

  // 6. Bloc Invité & RP
  const infoY = currentY;
  ctx.fillStyle = '#121522';
  drawRoundedRect(ctx, 45, infoY, 810, 80, 14);
  ctx.fill();
  ctx.strokeStyle = '#232738';
  ctx.lineWidth = 1.5;
  drawRoundedRect(ctx, 45, infoY, 810, 80, 14);
  ctx.stroke();

  // Séparateur vertical
  ctx.strokeStyle = '#232738';
  ctx.beginPath();
  ctx.moveTo(450, infoY + 12);
  ctx.lineTo(450, infoY + 68);
  ctx.stroke();

  // Invité
  ctx.textAlign = 'left';
  ctx.fillStyle = '#9ca3af';
  ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
  ctx.fillText('INVITÉ(E) NOMINATIF', 68, infoY + 30);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 20px system-ui, -apple-system, sans-serif';
  ctx.fillText(`${registration.guest.first_name} ${registration.guest.last_name}`, 68, infoY + 58);

  // RP
  ctx.textAlign = 'left';
  ctx.fillStyle = '#9ca3af';
  ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
  ctx.fillText('INVITATION PAR LE RP', 475, infoY + 30);

  ctx.fillStyle = '#e5b85c';
  ctx.font = '900 20px system-ui, -apple-system, sans-serif';
  ctx.fillText(`${registration.promoter.first_name} ${registration.promoter.last_name}`, 475, infoY + 58);

  currentY += 96;

  // 7. Carte Blanche QR Code Haute Définition
  const qrBoxY = currentY;
  const qrBoxWidth = 310;
  const qrBoxHeight = 310;
  const qrBoxX = (canvas.width - qrBoxWidth) / 2;

  ctx.fillStyle = '#ffffff';
  drawRoundedRect(ctx, qrBoxX, qrBoxY, qrBoxWidth, qrBoxHeight, 22);
  ctx.fill();

  ctx.strokeStyle = '#e5b85c';
  ctx.lineWidth = 4;
  drawRoundedRect(ctx, qrBoxX, qrBoxY, qrBoxWidth, qrBoxHeight, 22);
  ctx.stroke();

  // Dessin du QR Code
  ctx.drawImage(qrCanvas, qrBoxX + 15, qrBoxY + 15, 280, 280);

  currentY += qrBoxHeight + 20;

  // 8. GROSSE CONSIGNE OBLIGATOIRE D'ARRIVÉE AU CLUB
  const instrY = currentY;
  const instrBoxHeight = 145;
  ctx.fillStyle = '#141724';
  drawRoundedRect(ctx, 45, instrY, 810, instrBoxHeight, 16);
  ctx.fill();

  ctx.strokeStyle = '#e5b85c';
  ctx.lineWidth = 2.5;
  drawRoundedRect(ctx, 45, instrY, 810, instrBoxHeight, 16);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#e5b85c';
  ctx.font = '900 13px system-ui, -apple-system, sans-serif';
  ctx.fillText('⚠️  CONSIGNE OBLIGATOIRE À VOTRE ARRIVÉE  ⚠️', 450, instrY + 30);

  // Gros texte impératif
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 21px system-ui, -apple-system, sans-serif';
  ctx.fillText("DEMANDEZ UNE ENTRÉE ASTRA À L'ARRIVÉE AU CLUB", 450, instrY + 68);

  // Sous-texte
  ctx.fillStyle = '#cbd5e1';
  ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
  ctx.fillText("Faites scanner ce pass par un de vos RP ou directement dans l'ASTRA", 450, instrY + 102);
  ctx.fillText("après avoir pris votre entrée gratuite.", 450, instrY + 124);

  // 9. Pied de Page Billet Officiel
  ctx.fillStyle = '#64748b';
  ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
  ctx.fillText('ASTRA ORLÉANS • BILLET OFFICIEL NOMINATIF NUMÉRISÉ', 450, 1416);

  return canvas.toDataURL('image/png');
}

function drawFallbackPoster(
  ctx: CanvasRenderingContext2D,
  registration: RegistrationDetail,
  currentY: number
): number {
  ctx.fillStyle = '#10131c';
  drawRoundedRect(ctx, 45, currentY, 810, 110, 16);
  ctx.fill();
  ctx.strokeStyle = '#232738';
  ctx.lineWidth = 1.5;
  drawRoundedRect(ctx, 45, currentY, 810, 110, 16);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 22px system-ui, -apple-system, sans-serif';
  ctx.fillText(registration.event.name, 450, currentY + 45);

  ctx.fillStyle = '#e5b85c';
  ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
  const eventDateStr = formatFrenchDate(registration.event.event_date).toUpperCase();
  const eventTimeStr = `${formatFrenchTime(registration.event.start_time)} → ${formatFrenchTime(registration.event.end_time)}`;
  ctx.fillText(`📅 ${eventDateStr}  •  ⏰ ${eventTimeStr}`, 450, currentY + 78);

  return currentY + 126;
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
  const [downloading, setDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

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
    const expiryTime = new Date(year, month - 1, day + 1, 12, 0, 0);
    return new Date() > expiryTime;
  })();

  // Téléchargement du Billet VIP Complet (Pas seulement le QR Code !)
  const handleDownloadFullTicket = async () => {
    if (!canvasRef.current || !registration || isEventExpired || downloading) return;

    try {
      setDownloading(true);
      const ticketImageDataUrl = await generateFullTicketImage(registration, canvasRef.current);

      const link = document.createElement('a');
      const sanitizedName = `${registration.guest.first_name}-${registration.guest.last_name}`
        .toUpperCase()
        .replace(/[^A-Z0-9-]/g, '_');
      link.download = `BILLET-OFFICIEL-ASTRA-${sanitizedName}.png`;
      link.href = ticketImageDataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err) {
      console.error('Erreur lors de la génération du billet complet :', err);
      // Fallback au QR code si échec
      if (canvasRef.current) {
        const link = document.createElement('a');
        link.download = `ASTRA-PASS-${registration.guest.last_name.toUpperCase()}.png`;
        link.href = canvasRef.current.toDataURL('image/png');
        link.click();
      }
    } finally {
      setDownloading(false);
    }
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
            <div className="bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-500 text-black py-3.5 px-4 text-center font-black shadow-[0_0_20px_rgba(16,185,129,0.35)] flex flex-col items-center justify-center gap-1 border-b-2 border-emerald-300">
              <div className="flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4 text-black shrink-0 animate-pulse" />
                <span className="text-xs sm:text-sm font-black tracking-widest uppercase">
                  ENTRÉE 100% GRATUITE
                </span>
                <Sparkles className="w-4 h-4 text-black shrink-0 animate-pulse" />
              </div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider bg-black text-emerald-300 px-3 py-0.5 rounded-full">
                BILLET OFFICIEL • COUPE-FILE
              </span>
            </div>
          ) : (
            <div className="bg-rose-600/90 text-white py-3 px-4 text-center font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg">
              <AlertCircle className="w-4 h-4 text-white shrink-0" />
              <span>SOIRÉE PASSÉE • BILLET EXPIRÉ</span>
            </div>
          )}

          {/* Event Poster Banner & Official Logo Adapté */}
          {registration.event.cover_image_url ? (
            <div className="relative w-full overflow-hidden border-b border-[#232738] bg-[#07080c] flex items-center justify-center min-h-[220px]">
              {/* Lueur d'ambiance floue dérivée de l'affiche */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={registration.event.cover_image_url}
                alt=""
                className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-40 scale-110 pointer-events-none"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0f1118] via-transparent to-black/70 z-0" />

              {/* Affiche nette centrée à ratio préservé */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={registration.event.cover_image_url}
                alt={registration.event.name}
                className={`relative z-10 w-full max-h-[380px] sm:max-h-[440px] object-contain mx-auto drop-shadow-2xl ${isEventExpired ? 'grayscale contrast-125 opacity-60' : ''}`}
              />

              {/* Top badges with Logo */}
              <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-20">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/80 backdrop-blur-md border border-[#e5b85c]/40 shadow">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/astra-logo.png" alt="ASTRA" className="w-3.5 h-3.5 object-contain" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#e5b85c]">
                    ORLÉANS
                  </span>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider shadow ${
                  isEventExpired ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-black'
                }`}>
                  {isEventExpired ? 'Expiré' : '100% Gratuit'}
                </span>
              </div>

              <div className="absolute bottom-3 left-4 right-4 z-20">
                <p className="text-[11px] font-bold text-[#e5b85c] uppercase tracking-wider">Soirée Officielle</p>
                <h2 className="text-lg font-black text-white leading-tight drop-shadow truncate">
                  {registration.event.name}
                </h2>
              </div>
            </div>
          ) : (
            <div className="p-6 bg-gradient-to-b from-[#181b26] to-[#0f1118] border-b border-[#232738] text-center relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/astra-logo.png"
                alt="ASTRA Logo"
                className="w-24 h-auto mx-auto mb-2 object-contain drop-shadow-[0_4px_16px_rgba(229,184,92,0.25)]"
              />
              <p className="text-[10px] tracking-widest text-[#e5b85c] uppercase font-bold">
                Pass Invité • Entrée 100% Gratuite — Orléans
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

          {/* GROSSE CONSIGNE OBLIGATOIRE D'ARRIVÉE AU CLUB */}
          {!isEventExpired && (
            <div className="mx-4 my-3 p-3.5 bg-gradient-to-r from-[#e5b85c]/25 via-[#e5b85c]/10 to-[#e5b85c]/25 border-2 border-[#e5b85c] rounded-2xl text-center shadow-lg">
              <p className="text-[10px] font-black uppercase tracking-widest text-[#e5b85c] mb-1">
                ⚠️ CONSIGNE OBLIGATOIRE À L&apos;ARRIVÉE
              </p>
              <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-tight leading-snug">
                DEMANDEZ UNE ENTRÉE ASTRA<br />À L&apos;ARRIVÉE AU CLUB
              </h3>
            </div>
          )}

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
                La soirée du {formatFrenchDate(registration.event.event_date)} est terminée. Ce QR code n&apos;est plus actif et ne peut plus être scanné.
              </p>
            </div>
          ) : (
            <div className="p-6 flex flex-col items-center justify-center bg-[#0d0e14]">
              <div className="p-3.5 bg-white rounded-2xl shadow-2xl flex items-center justify-center border-4 border-[#e5b85c]/30">
                <canvas ref={canvasRef} className="rounded-lg max-w-full h-auto block" />
              </div>

              <p className="text-xs font-bold text-white mt-4 tracking-wide text-center">
                Faites scanner ce QR code à un RP ou dans l&apos;ASTRA
              </p>
              <p className="text-[11px] text-gray-400 mt-1 text-center">
                1 entrée gratuite par pass • Scan nominatif
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

          {/* Consignes d'accès — Mises à jour sans mention des videurs */}
          {!isEventExpired && (
            <div className="p-4 bg-[#141622] border-t border-[#232738] space-y-2.5 text-left">
              <div className="flex items-center gap-1.5 text-[#e5b85c] font-bold text-[11px] uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4 text-[#e5b85c] shrink-0" />
                <span>Comment utiliser votre pass ?</span>
              </div>
              <div className="space-y-2 text-xs text-gray-300">
                <div className="p-2.5 rounded-xl bg-[#0b0c12] border border-[#232738] flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <p className="leading-snug">
                    Faites scanner ce pass par <strong className="text-white">un de vos RP</strong> ou directement <strong className="text-[#e5b85c]">dans l&apos;ASTRA</strong> après avoir pris votre entrée gratuite.
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-[#0b0c12] border border-[#232738] flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-[#e5b85c] shrink-0 mt-0.5" />
                  <p className="leading-snug text-gray-400">
                    Votre entrée est <strong className="text-white">100% gratuite</strong> grâce à l&apos;invitation de <strong className="text-[#e5b85c]">{registration.promoter.first_name} {registration.promoter.last_name}</strong>.
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
            <span>Augmente la luminosité de ton écran pour faciliter la lecture du QR code.</span>
          </div>
        )}

        {/* Bouton Sauvegarder le Billet Complet */}
        {!isEventExpired ? (
          <button
            onClick={handleDownloadFullTicket}
            disabled={!qrGenerated || downloading}
            className="w-full mt-3 py-4 px-4 bg-gradient-to-r from-[#e5b85c] to-[#d4a037] hover:from-[#f0c773] hover:to-[#e5b85c] text-black font-extrabold text-sm rounded-2xl flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-xl active:scale-98 disabled:opacity-50"
          >
            {downloading ? (
              <>
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                <span>Génération du Billet VIP...</span>
              </>
            ) : downloadSuccess ? (
              <>
                <Check className="w-4 h-4 text-black" />
                <span>Billet Enregistré dans vos Photos !</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4 text-black" />
                <span>Enregistrer le Billet Complet (Image HD)</span>
              </>
            )}
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

        <div className="flex items-center justify-center gap-2 mt-4 text-[10px] text-gray-500">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/astra-logo.png" alt="ASTRA" className="w-3.5 h-3.5 object-contain" />
          <span>Billet officiel nominatif vérifié — Orléans</span>
        </div>
      </div>
    </div>
  );
}

