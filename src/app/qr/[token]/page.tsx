'use client';

import { useEffect, useState, useRef, use } from 'react';
import QRCode from 'qrcode';
import { 
  formatFrenchDate, 
  formatFrenchTime,
  generateSecurityCode,
  formatSecurityEmissionStamp
} from '@/lib/utils';
import { 
  Sparkles, 
  Calendar, 
  Clock, 
  Download, 
  AlertCircle, 
  CheckCircle2, 
  ShieldCheck, 
  SunMedium, 
  XCircle, 
  Share2, 
  Check,
  Users,
  MessageCircle,
  Copy,
  CalendarPlus,
  Navigation,
  Car,
  Star,
  Send,
  Shield,
  Lock,
  Shirt,
  IdCard
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface RegistrationDetail {
  id: string;
  qr_token: string;
  status: string;
  is_scanned?: boolean;
  has_feedback?: boolean;
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
    slug?: string;
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
  canvas.height = 1620;
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
  ctx.strokeRect(20, 20, 860, 1580);

  ctx.strokeStyle = '#232738';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(28, 28, 844, 1564);

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
  ctx.moveTo(14, 1606 - cornerSize);
  ctx.lineTo(14, 1606);
  ctx.lineTo(14 + cornerSize, 1606);
  ctx.stroke();
  // Bas droite
  ctx.beginPath();
  ctx.moveTo(886 - cornerSize, 1606);
  ctx.lineTo(886, 1606);
  ctx.lineTo(886, 1606 - cornerSize);
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

  currentY += qrBoxHeight + 14;

  // 7b. Sceau d'Authenticité & Horodatage d'Émission Inviolable
  const { dateStr: emissionDateStr, timeStr: emissionTimeStr } = formatSecurityEmissionStamp(new Date());
  const secHash = generateSecurityCode(registration.qr_token);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#10b981';
  ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
  ctx.fillText(`🛡️ BILLET SÉCURISÉ CERTIFIÉ • ÉMIS LE ${emissionDateStr} À ${emissionTimeStr} (PARIS)`, 450, currentY + 12);

  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 10px monospace';
  ctx.fillText(`CODE AUTHENTIFICATION UNIQUE : #${secHash} • SCAN UNIQUE ENTRÉE ACTIVE`, 450, currentY + 28);

  currentY += 40;

  // 8. GROSSE CONSIGNE OBLIGATOIRE D'ARRIVÉE AU CLUB
  const instrY = currentY;
  const instrBoxHeight = 112;
  ctx.fillStyle = '#141724';
  drawRoundedRect(ctx, 45, instrY, 810, instrBoxHeight, 16);
  ctx.fill();

  ctx.strokeStyle = '#e5b85c';
  ctx.lineWidth = 2;
  drawRoundedRect(ctx, 45, instrY, 810, instrBoxHeight, 16);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#e5b85c';
  ctx.font = '900 12px system-ui, -apple-system, sans-serif';
  ctx.fillText('⚠️  CONSIGNE OBLIGATOIRE À VOTRE ARRIVÉE  ⚠️', 450, instrY + 24);

  // Gros texte impératif
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 19px system-ui, -apple-system, sans-serif';
  ctx.fillText("DEMANDEZ UNE ENTRÉE ASTRA À L'ARRIVÉE AU CLUB", 450, instrY + 54);

  // Sous-texte
  ctx.fillStyle = '#cbd5e1';
  ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
  ctx.fillText("Faites scanner ce pass par un de vos RP ou directement dans l'ASTRA après votre entrée.", 450, instrY + 84);

  currentY += instrBoxHeight + 14;

  // 8b. CHARTE DRESS CODE & SÉCURITÉ CONTRÔLÉS À LA PORTE
  const rulesY = currentY;
  const rulesBoxHeight = 115;
  ctx.fillStyle = '#0f121d';
  drawRoundedRect(ctx, 45, rulesY, 810, rulesBoxHeight, 14);
  ctx.fill();
  ctx.strokeStyle = '#282e44';
  ctx.lineWidth = 1.5;
  drawRoundedRect(ctx, 45, rulesY, 810, rulesBoxHeight, 14);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#e5b85c';
  ctx.font = '900 11px system-ui, -apple-system, sans-serif';
  ctx.fillText('👔  CHARTE DRESS CODE & SÉCURITÉ OBLIGATOIRES À LA PORTE  🪪', 450, rulesY + 22);

  ctx.fillStyle = '#e2e8f0';
  ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
  ctx.fillText('• 🪪 PIÈCE D\'IDENTITÉ PHYSIQUE ORIGINALE (+18 ANS STRICTEMENT, PHOTOS SUR ÉCRAN REFUSÉES)', 450, rulesY + 46);
  ctx.fillText('• 👔 TENUE SOIGNÉE EXIGÉE (SURVÊTEMENTS, CASQUETTES, CLAQUETTES & SACOCHES INTERDITS)', 450, rulesY + 68);

  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 10px system-ui, -apple-system, sans-serif';
  ctx.fillText('⚖️ Le pass facilite le contrôle. La direction et la sécurité se réservent strictement le droit d\'entrée.', 450, rulesY + 92);

  currentY += rulesBoxHeight + 16;

  // 9. Pied de Page Billet Officiel
  ctx.fillStyle = '#64748b';
  ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
  ctx.fillText('ASTRA ORLÉANS • BILLET OFFICIEL NOMINATIF NUMÉRISÉ & CERTIFIÉ', 450, 1580);

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
  const [activeToken, setActiveToken] = useState(token);
  const [companionToken, setCompanionToken] = useState<string | null>(null);
  const [companionName, setCompanionName] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [qrGenerated, setQrGenerated] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [copiedShareLink, setCopiedShareLink] = useState(false);

  // Baromètre Ambiance / Avis Flash Post-Soirée
  const [feedbackRating, setFeedbackRating] = useState<number>(5);
  const [feedbackHover, setFeedbackHover] = useState<number | null>(null);
  const [feedbackTags, setFeedbackTags] = useState<string[]>([]);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  // Filigrane Dynamique Anti-Photoshop : Horloge Temps Réel (Paris)
  const [liveServerTime, setLiveServerTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setLiveServerTime(
        now.toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          timeZone: 'Europe/Paris',
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      const cToken = sp.get('companion');
      const cName = sp.get('compName');
      if (cToken) setCompanionToken(cToken);
      if (cName) setCompanionName(decodeURIComponent(cName));
    }
  }, []);

  const getInviteUrl = () => {
    if (typeof window === 'undefined') return '';
    const slug = registration?.promoter?.slug;
    if (slug) {
      return `${window.location.origin}/rp/${slug}`;
    }
    return window.location.origin;
  };

  const getShareText = () => {
    const evName = registration?.event?.name || 'la soirée';
    return `Je vais à l'ASTRA Club pour "${evName}" ! Prends ton entrée 100% GRATUITE sur la guestlist officielle ici avant que ce soit complet : ${getInviteUrl()}`;
  };

  const handleShareWhatsApp = () => {
    const text = getShareText();
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleNativeShare = async () => {
    const inviteUrl = getInviteUrl();
    const text = getShareText();
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Entrée 100% Gratuite ASTRA Club',
          text: text,
          url: inviteUrl,
        });
      } catch {
        // Ignorer l'annulation
      }
    } else {
      handleCopyShareLink();
    }
  };

  const handleCopyShareLink = () => {
    const inviteUrl = getInviteUrl();
    if (!inviteUrl) return;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedShareLink(true);
    setTimeout(() => setCopiedShareLink(false), 2500);
  };

  const handleDownloadIcs = () => {
    if (!registration) return;
    const { event, promoter, guest } = registration;
    const [year, month, day] = event.event_date.split('-').map(Number);
    const [startH, startM] = (event.start_time || '23:00').split(':').map(Number);
    const [endH, endM] = (event.end_time || '05:00').split(':').map(Number);

    const pad = (n: number) => n.toString().padStart(2, '0');
    const startStr = `${year}${pad(month)}${pad(day)}T${pad(startH)}${pad(startM)}00Z`;
    const endDay = endH < startH ? day + 1 : day;
    const endStr = `${year}${pad(month)}${pad(endDay)}T${pad(endH)}${pad(endM)}00Z`;

    const icsLines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//ASTRA Nightclub//Pass Invité//FR',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:astra-pass-${registration.qr_token}@clubastra.fr`,
      `DTSTAMP:${startStr}`,
      `DTSTART:${startStr}`,
      `DTEND:${endStr}`,
      `SUMMARY:★ SOIRÉE ASTRA : ${event.name} (Pass Gratuit)`,
      `DESCRIPTION:Billet Invité 100% Gratuit pour ${guest.first_name} via ${promoter.first_name}. Consigne obligatoire : demandez une entrée ASTRA à votre arrivée ! Lien du pass : ${window.location.href}`,
      'LOCATION:Club ASTRA, Orléans',
      'STATUS:CONFIRMED',
      'BEGIN:VALARM',
      'TRIGGER:-PT2H',
      'ACTION:DISPLAY',
      'DESCRIPTION:Rappel : Ta soirée ASTRA commence dans 2h ! N oublie pas ton QR pass.',
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([icsLines], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `ASTRA-${event.name.replace(/[^a-zA-Z0-9]/g, '_')}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenGoogleCalendar = () => {
    if (!registration) return;
    const { event, promoter, guest } = registration;
    const [year, month, day] = event.event_date.split('-').map(Number);
    const [startH, startM] = (event.start_time || '23:00').split(':').map(Number);
    const [endH, endM] = (event.end_time || '05:00').split(':').map(Number);
    const pad = (n: number) => n.toString().padStart(2, '0');
    const startStr = `${year}${pad(month)}${pad(day)}T${pad(startH)}${pad(startM)}00Z`;
    const endDay = endH < startH ? day + 1 : day;
    const endStr = `${year}${pad(month)}${pad(endDay)}T${pad(endH)}${pad(endM)}00Z`;
    const title = encodeURIComponent(`★ SOIRÉE ASTRA : ${event.name} (Pass Gratuit)`);
    const details = encodeURIComponent(`Billet Invité 100% Gratuit pour ${guest.first_name} via ${promoter.first_name}. Demandez une entrée ASTRA à l'arrivée ! Lien : ${window.location.href}`);
    const loc = encodeURIComponent('Club ASTRA, Orléans');
    window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startStr}/${endStr}&details=${details}&location=${loc}`, '_blank');
  };

  const AVAILABLE_FEEDBACK_TAGS = [
    '🎶 Son & DJ set',
    '⚡ Ambiance survoltée',
    '🍹 Service Bar au top',
    '🚪 Entrée fluide',
    '✨ Carré VIP stylé',
    '👥 Super public',
    '💡 Jeux de lumières',
  ];

  const ratingLabels: Record<number, string> = {
    1: '👎 Décevant / Pas top',
    2: '😐 Moyen / Peut mieux faire',
    3: '🙂 Sympa / Bonne ambiance',
    4: '🎉 Très bonne soirée !',
    5: '🔥 Soirée de folie totale !',
  };

  const handleToggleFeedbackTag = (tag: string) => {
    setFeedbackTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registration) return;
    setSubmittingFeedback(true);
    setFeedbackError(null);

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: activeToken,
          rating: feedbackRating,
          tags: feedbackTags,
          comment: feedbackComment.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Impossible d'enregistrer votre avis.");
      }

      setFeedbackSubmitted(true);
      try {
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.8 },
          colors: ['#e5b85c', '#38bdf8', '#a855f7', '#22c55e'],
        });
      } catch {
        // Non bloquant
      }
    } catch (err: unknown) {
      const error = err as Error;
      setFeedbackError(error.message || 'Une erreur est survenue lors de l’envoi.');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  useEffect(() => {
    async function loadRegistration() {
      setLoading(true);
      setErrorMsg(null);

      try {
        const res = await fetch(`/api/pass?token=${encodeURIComponent(activeToken)}`);
        const json = await res.json();

        if (!res.ok || !json.success || !json.data) {
          setErrorMsg(json.error || 'QR code introuvable ou expiré.');
          setLoading(false);
          return;
        }

        const regData = json.data as RegistrationDetail;
        setRegistration(regData);
        if (regData.has_feedback) {
          setFeedbackSubmitted(true);
        }

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
  }, [activeToken]);

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

      <div className="relative z-10 w-full max-w-md text-center">
        {/* Switcher Duo (+1) si inscription double */}
        {companionToken && (
          <div className="mb-3 p-1 bg-[#131622] border border-[#e5b85c]/40 rounded-2xl flex gap-1 shadow-lg">
            <button
              onClick={() => setActiveToken(token)}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                activeToken === token ? 'bg-[#e5b85c] text-black shadow' : 'text-gray-400 hover:text-white'
              }`}
            >
              Mon Pass
            </button>
            <button
              onClick={() => setActiveToken(companionToken)}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                activeToken === companionToken ? 'bg-[#e5b85c] text-black shadow' : 'text-gray-400 hover:text-white'
              }`}
            >
              Pass +1 {companionName ? `(${companionName})` : ''}
            </button>
          </div>
        )}

        {/* CARTE TICKET OFFICIEL */}
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
              {/* 🛡️ FILIGRANE DYNAMIQUE ANTI-PHOTOSHOP (LIVE PARIS) */}
              <div className="w-full mb-3.5 p-2.5 rounded-xl bg-gradient-to-r from-emerald-950/60 via-[#161a28] to-emerald-950/60 border border-[#e5b85c]/40 flex items-center justify-between text-left shadow-lg">
                <div className="flex items-center gap-2">
                  <div className="relative w-3 h-3 flex items-center justify-center">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 block leading-tight">
                      BILLET WEB AUTHENTIFIÉ EN DIRECT
                    </span>
                    <span className="text-[10px] font-mono font-bold text-gray-300">
                      RÉF : #{generateSecurityCode(registration.qr_token)}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[9px] text-gray-400 uppercase font-bold block">Horloge Paris</span>
                  <span className="text-xs font-mono font-black text-[#e5b85c] tracking-widest bg-black/70 px-2 py-0.5 rounded border border-[#e5b85c]/40">
                    {liveServerTime || '23:00:00'}
                  </span>
                </div>
              </div>

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

        {/* 🛡️ SOLUTION POUR LES BILLETS ENREGISTRÉS DANS LES PHOTOS (ANTI-FRAUDE & SANS 4G) */}
        {!isEventExpired && (
          <div className="mt-3 p-3.5 bg-gradient-to-br from-[#111420] via-[#131828] to-[#0c0e18] border border-[#e5b85c]/35 rounded-2xl text-left shadow-xl">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-white">
                    Sécurité & Billet Enregistré
                  </h4>
                  <p className="text-[11px] text-emerald-400 font-semibold">
                    Certifié et scannable même sans 4G à la porte
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                OFFLINE OK
              </span>
            </div>

            <div className="space-y-2 text-xs text-gray-300">
              <div className="flex items-start gap-2.5 bg-[#090b12]/70 p-2.5 rounded-xl border border-white/5">
                <span className="text-base leading-none select-none">📸</span>
                <p className="text-[11px] leading-relaxed">
                  <strong className="text-white">Image dans vos Photos :</strong> Le billet téléchargé intègre un <span className="text-emerald-400 font-semibold">sceau d&apos;émission certifié à la seconde</span> et votre référence unique (<span className="font-mono text-[#e5b85c]">#{generateSecurityCode(registration?.qr_token || '')}</span>). Les scanners de l&apos;ASTRA le lisent directement sur votre écran, même sans aucun réseau.
                </p>
              </div>

              <div className="flex items-start gap-2.5 bg-[#090b12]/70 p-2.5 rounded-xl border border-white/5">
                <span className="text-base leading-none select-none">🛡️</span>
                <p className="text-[11px] leading-relaxed">
                  <strong className="text-white">Protection Anti-Doublon & Faux Billets :</strong> Votre QR code est à usage strictement unique. Le premier scan à la porte valide définitivement l&apos;entrée ; toute tentative de réutilisation ou capture pirate sera immédiatement bloquée.
                </p>
              </div>

              <div className="flex items-start gap-2.5 bg-[#090b12]/70 p-2.5 rounded-xl border border-white/5">
                <span className="text-base leading-none select-none">⚡</span>
                <p className="text-[11px] leading-relaxed">
                  <strong className="text-white">Conseil Entrée Express :</strong> Si vous avez de la 4G devant le club, présentez cette page web en direct : le filigrane animé avec horloge live ({liveServerTime || 'Paris'}) offre une authentification visuelle instantanée aux physionomistes.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 👔 CHARTE VISUELLE DRESS CODE & SÉCURITÉ PORTE (ZÉRO CONFLIT) */}
        {!isEventExpired && (
          <div className="mt-3 p-4 bg-gradient-to-b from-[#141724] to-[#0c0e16] border border-[#272d42] rounded-2xl text-left shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-[#e5b85c]/20 text-[#e5b85c] flex items-center justify-center">
                  <Shirt className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-white">
                    Consignes d&apos;Accès & Dress Code
                  </h4>
                  <p className="text-[11px] text-[#e5b85c] font-semibold">
                    À respecter impérativement à l&apos;entrée
                  </p>
                </div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 font-bold border border-amber-500/30">
                Contrôle Porte
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Règle 1 : ID Physique */}
              <div className="p-2.5 bg-[#0a0c13] rounded-xl border border-rose-500/20 flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-rose-500/15 text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
                  <IdCard className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-white block leading-tight">
                    ID Physique Originale (+18)
                  </span>
                  <p className="text-[10px] text-gray-400 mt-0.5 leading-snug">
                    CNI, passeport ou permis physique. <span className="text-rose-400 font-semibold">Photos sur téléphone refusées.</span>
                  </p>
                </div>
              </div>

              {/* Règle 2 : Tenue Soignée */}
              <div className="p-2.5 bg-[#0a0c13] rounded-xl border border-[#e5b85c]/20 flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#e5b85c]/15 text-[#e5b85c] flex items-center justify-center shrink-0 mt-0.5">
                  <Shirt className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-white block leading-tight">
                    Tenue Soignée Exigée
                  </span>
                  <p className="text-[10px] text-gray-400 mt-0.5 leading-snug">
                    Survêtements, casquettes, claquettes et sacoches banane strictement interdits.
                  </p>
                </div>
              </div>

              {/* Règle 3 : Fouille & Alcool */}
              <div className="p-2.5 bg-[#0a0c13] rounded-xl border border-sky-500/20 flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-sky-500/15 text-sky-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-white block leading-tight">
                    Fouille & Zéro Alcool Extérieur
                  </span>
                  <p className="text-[10px] text-gray-400 mt-0.5 leading-snug">
                    Fouille de sécurité à l&apos;entrée. Aucune boisson ni objet dangereux autorisés.
                  </p>
                </div>
              </div>

              {/* Règle 4 : Droit d'Accès */}
              <div className="p-2.5 bg-[#0a0c13] rounded-xl border border-emerald-500/20 flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-white block leading-tight">
                    Entrée Gratuite & Réserve
                  </span>
                  <p className="text-[10px] text-gray-400 mt-0.5 leading-snug">
                    Pass 100% gratuit. La direction et la sécurité se réservent le droit d&apos;entrée.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SECTION VIRALE : PARTAGER À MES POTES */}
        {!isEventExpired && (
          <div className="mt-4 p-4 bg-gradient-to-b from-[#141724] to-[#0f111a] border border-[#e5b85c]/30 rounded-2xl text-left shadow-lg">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-full bg-[#e5b85c]/20 text-[#e5b85c] flex items-center justify-center">
                <Users className="w-3.5 h-3.5" />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-white">
                  Tu viens en équipe ?
                </h4>
                <p className="text-[11px] text-[#e5b85c] font-semibold">
                  Fais passer le bon plan à tes potes avant fermeture
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-300 mb-3 leading-relaxed">
              Partage ce lien pour qu&apos;ils réservent leur <strong className="text-white">entrée 100% GRATUITE</strong> sur la guestlist officielle de <strong className="text-[#e5b85c]">{registration?.promoter?.first_name || 'notre RP'}</strong>.
            </p>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="py-2.5 px-3 bg-[#25D366]/20 hover:bg-[#25D366]/30 border border-[#25D366]/40 text-[#25D366] font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={handleNativeShare}
                className="py-2.5 px-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all"
              >
                <Share2 className="w-3.5 h-3.5 text-[#e5b85c]" />
                <span>Partager</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleCopyShareLink}
              className="w-full mt-2 py-2 px-3 bg-[#191c28] hover:bg-[#202534] border border-[#2e3348] text-gray-300 font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all"
            >
              {copiedShareLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Lien d&apos;invitation copié !</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-gray-400" />
                  <span>Copier le lien d&apos;inscription pour mes potes</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* CALENDRIER & RAPPEL AUTOMATIQUE */}
        {!isEventExpired && (
          <div className="mt-3 p-3.5 bg-[#12141e] border border-[#232738] rounded-2xl text-left">
            <div className="flex items-center gap-2 mb-2">
              <CalendarPlus className="w-4 h-4 text-[#e5b85c]" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Ne rate pas ta soirée (Rappel 2h avant)
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleDownloadIcs}
                className="py-2 px-3 bg-[#191c28] hover:bg-[#222636] border border-[#2d3246] rounded-xl text-xs font-semibold text-gray-200 flex items-center justify-center gap-1.5 transition-all"
              >
                <span>Apple / Outlook (.ics)</span>
              </button>
              <button
                type="button"
                onClick={handleOpenGoogleCalendar}
                className="py-2 px-3 bg-[#191c28] hover:bg-[#222636] border border-[#2d3246] rounded-xl text-xs font-semibold text-gray-200 flex items-center justify-center gap-1.5 transition-all"
              >
                <span>Google Agenda</span>
              </button>
            </div>
          </div>
        )}

        {/* VENIR AU CLUB : VTC & GPS */}
        {!isEventExpired && (
          <div className="mt-3 p-3.5 bg-[#12141e] border border-[#232738] rounded-2xl text-left">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Car className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Venir au Club (Orléans)
                </span>
              </div>
              <span className="text-[10px] text-gray-400">VTC &amp; Itinéraire</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <a
                href="https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[formatted_address]=Club%20ASTRA%20Orl%C3%A9ans"
                target="_blank"
                rel="noreferrer"
                className="py-2 px-2 bg-black hover:bg-neutral-900 border border-neutral-700 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1 transition-all"
              >
                <span>Uber</span>
              </a>
              <a
                href="https://www.google.com/maps/dir/?api=1&destination=Club+ASTRA+Orleans"
                target="_blank"
                rel="noreferrer"
                className="py-2 px-2 bg-[#191c28] hover:bg-[#222636] border border-[#2d3246] rounded-xl text-xs font-bold text-gray-200 flex items-center justify-center gap-1 transition-all"
              >
                <Navigation className="w-3 h-3 text-blue-400" />
                <span>Maps</span>
              </a>
              <a
                href="https://waze.com/ul?q=Club+ASTRA+Orleans&navigate=yes"
                target="_blank"
                rel="noreferrer"
                className="py-2 px-2 bg-[#191c28] hover:bg-[#222636] border border-[#2d3246] rounded-xl text-xs font-bold text-gray-200 flex items-center justify-center gap-1 transition-all"
              >
                <span>Waze</span>
              </a>
            </div>
          </div>
        )}

        {/* ⭐ BAROMÈTRE AMBIANCE / AVIS FLASH POST-SOIRÉE */}
        <div className="mt-4 p-4 bg-gradient-to-b from-[#151827] to-[#0d0f17] border border-[#e5b85c]/35 rounded-2xl text-left shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#e5b85c]/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-[#e5b85c]/20 text-[#e5b85c] flex items-center justify-center">
                <Star className="w-3.5 h-3.5 fill-[#e5b85c]" />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                  <span>Baromètre Ambiance</span>
                  {registration?.is_scanned && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold normal-case">
                      Billet validé
                    </span>
                  )}
                </h4>
                <p className="text-[11px] text-[#e5b85c] font-semibold">
                  Note ta soirée à l&apos;ASTRA en 10 secondes
                </p>
              </div>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-gray-300 font-medium">
              100% Anonyme
            </span>
          </div>

          {feedbackSubmitted ? (
            <div className="mt-3 p-3.5 bg-[#1a1e2f] border border-emerald-500/30 rounded-xl text-center">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center mb-2">
                <Check className="w-4 h-4" />
              </div>
              <p className="text-xs font-bold text-white mb-0.5">
                Avis bien enregistré !
              </p>
              <p className="text-[11px] text-gray-300">
                Merci beaucoup ! Ton retour a été transmis à la direction de l&apos;ASTRA et à {registration?.promoter?.first_name || 'ton RP'}.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmitFeedback} className="mt-3 space-y-3">
              {/* Étoiles 1 à 5 */}
              <div className="flex flex-col items-center justify-center py-2.5 bg-[#0d0f17]/70 rounded-xl border border-white/5">
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const isFilled = (feedbackHover ?? feedbackRating) >= star;
                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setFeedbackRating(star)}
                        onMouseEnter={() => setFeedbackHover(star)}
                        onMouseLeave={() => setFeedbackHover(null)}
                        className="p-1 transition-transform hover:scale-125 focus:outline-none"
                        aria-label={`${star} étoiles sur 5`}
                      >
                        <Star
                          className={`w-6 h-6 transition-colors ${
                            isFilled
                              ? 'text-[#e5b85c] fill-[#e5b85c]'
                              : 'text-gray-600'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
                <span className="text-[11px] font-bold text-[#e5b85c] mt-1.5">
                  {ratingLabels[feedbackHover ?? feedbackRating]}
                </span>
              </div>

              {/* Tags rapides */}
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
                  Ce qui t&apos;a le plus marqué :
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {AVAILABLE_FEEDBACK_TAGS.map((tag) => {
                    const isSelected = feedbackTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleToggleFeedbackTag(tag)}
                        className={`text-[11px] px-2.5 py-1 rounded-lg font-medium transition-all ${
                          isSelected
                            ? 'bg-[#e5b85c] text-black font-bold shadow-md shadow-[#e5b85c]/20'
                            : 'bg-[#191c2b] text-gray-300 hover:bg-[#202538] border border-white/5'
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Commentaire optionnel */}
              <div>
                <input
                  type="text"
                  value={feedbackComment}
                  onChange={(e) => setFeedbackComment(e.target.value)}
                  placeholder="Un mot pour le DJ, le bar ou ton RP ? (optionnel)"
                  maxLength={250}
                  className="w-full px-3 py-2 bg-[#121420] border border-[#262b3f] rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#e5b85c]/60 transition-colors"
                />
              </div>

              {feedbackError && (
                <p className="text-[11px] text-rose-400 font-semibold text-center">
                  {feedbackError}
                </p>
              )}

              <button
                type="submit"
                disabled={submittingFeedback}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-[#e5b85c] to-[#d4a043] hover:brightness-110 active:scale-[0.99] text-black font-black text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-[#e5b85c]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submittingFeedback ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    <span>Envoi en cours...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Envoyer mon avis sur la soirée</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        <div className="flex items-center justify-center gap-2 mt-4 text-[10px] text-gray-500">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/astra-logo.png" alt="ASTRA" className="w-3.5 h-3.5 object-contain" />
          <span>Billet officiel nominatif vérifié — Orléans</span>
        </div>
      </div>
    </div>
  );
}

