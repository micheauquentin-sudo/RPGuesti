'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { 
  X, 
  Download, 
  Share2, 
  Copy, 
  Check, 
  Sparkles, 
  Flame, 
  Zap, 
  Layers, 
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { type ClubEvent, type Promoter } from '@/lib/types';
import { getPromoterRank } from '@/lib/promoter-ranks';
import { formatFrenchDate, formatFrenchTime } from '@/lib/utils';

export type StoryTheme = 'gold' | 'neon' | 'dark';
export type StoryFormat = '9:16' | '1:1';

export interface StoryPromoter {
  id: string;
  first_name: string;
  last_name: string;
  instagram_handle?: string | null;
  slug: string;
  avatar_url?: string | null;
}

export interface StoryEvent {
  name: string;
  event_date: string;
  start_time: string;
  end_time: string;
  cover_image_url?: string | null;
}

interface InstagramStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  promoter: StoryPromoter;
  upcomingEvent: StoryEvent | null;
  entriesCount: number;
}

const PRESET_HOOKS = [
  "🔥 C'EST OFFERT AVEC MON PASS !",
  "🚀 ON SE RETROUVE LÀ-BAS CE SOIR !",
  "🥂 QUI VIENT AVEC MOI CE SOIR ?",
  "⚠️ PLACES TRÈS LIMITÉES • RÉSERVE VITE !",
  "★ ENTRÉE 100% GRATUITE • LIEN EN STORY ★",
];

// Helper pour charger une image en promesse
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Échec chargement: ${src}`));
    img.src = src;
  });
}

// Helper rectangle arrondi
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

export default function InstagramStoryModal({
  isOpen,
  onClose,
  promoter,
  upcomingEvent,
  entriesCount,
}: InstagramStoryModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [theme, setTheme] = useState<StoryTheme>('gold');
  const [format, setFormat] = useState<StoryFormat>('9:16');
  const [hookText, setHookText] = useState<string>(PRESET_HOOKS[0]);
  const [generating, setGenerating] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const promoterRankInfo = getPromoterRank(entriesCount);
  const publicUrl = typeof window !== 'undefined' ? `${window.location.origin}/rp/${promoter.slug}` : '';

  // Rendu Canvas 1080x1920 (Format 9:16) ou 1080x1080 (Format 1:1 Carré)
  const renderStoryCanvas = useCallback(async (): Promise<string> => {
    const canvas = canvasRef.current || document.createElement('canvas');

    if (format === '1:1') {
      return await renderSquareCanvas(canvas, theme, hookText, promoter, upcomingEvent, promoterRankInfo);
    }

    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Impossible d’initialiser le moteur 2D.');

    // 1. FOND DE BASE SELON LE THÈME
    if (theme === 'gold') {
      // Fond Club Sombre Luxueux avec dégradé radial
      ctx.fillStyle = '#07080c';
      ctx.fillRect(0, 0, 1080, 1920);

      const radial = ctx.createRadialGradient(540, 600, 100, 540, 700, 900);
      radial.addColorStop(0, 'rgba(229, 184, 92, 0.16)');
      radial.addColorStop(0.6, 'rgba(18, 20, 32, 0.9)');
      radial.addColorStop(1, '#07080c');
      ctx.fillStyle = radial;
      ctx.fillRect(0, 0, 1080, 1920);

      // Cadre doré double VIP
      ctx.strokeStyle = '#e5b85c';
      ctx.lineWidth = 4;
      ctx.strokeRect(32, 32, 1016, 1856);

      ctx.strokeStyle = 'rgba(229, 184, 92, 0.35)';
      ctx.lineWidth = 2;
      ctx.strokeRect(44, 44, 992, 1832);

      // Coins décoratifs Art-Déco
      const cSize = 40;
      ctx.strokeStyle = '#e5b85c';
      ctx.lineWidth = 6;
      // Haut gauche
      ctx.beginPath();
      ctx.moveTo(24, 24 + cSize);
      ctx.lineTo(24, 24);
      ctx.lineTo(24 + cSize, 24);
      ctx.stroke();
      // Haut droite
      ctx.beginPath();
      ctx.moveTo(1056 - cSize, 24);
      ctx.lineTo(1056, 24);
      ctx.lineTo(1056, 24 + cSize);
      ctx.stroke();
      // Bas gauche
      ctx.beginPath();
      ctx.moveTo(24, 1896 - cSize);
      ctx.lineTo(24, 1896);
      ctx.lineTo(24 + cSize, 1896);
      ctx.stroke();
      // Bas droite
      ctx.beginPath();
      ctx.moveTo(1056 - cSize, 1896);
      ctx.lineTo(1056, 1896);
      ctx.lineTo(1056, 1896 - cSize);
      ctx.stroke();

    } else if (theme === 'neon') {
      // Fond Cyberpunk Néon Cyan & Magenta
      ctx.fillStyle = '#06040d';
      ctx.fillRect(0, 0, 1080, 1920);

      // Lueur Cyan haut
      const cyanGlow = ctx.createRadialGradient(250, 350, 50, 250, 350, 600);
      cyanGlow.addColorStop(0, 'rgba(6, 182, 212, 0.25)');
      cyanGlow.addColorStop(1, 'rgba(6, 4, 13, 0)');
      ctx.fillStyle = cyanGlow;
      ctx.fillRect(0, 0, 1080, 1920);

      // Lueur Magenta bas
      const magGlow = ctx.createRadialGradient(830, 1200, 50, 830, 1200, 700);
      magGlow.addColorStop(0, 'rgba(236, 72, 153, 0.22)');
      magGlow.addColorStop(1, 'rgba(6, 4, 13, 0)');
      ctx.fillStyle = magGlow;
      ctx.fillRect(0, 0, 1080, 1920);

      // Cadre néon électrique
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 4;
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 16;
      ctx.strokeRect(32, 32, 1016, 1856);
      ctx.shadowBlur = 0;

      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 2;
      ctx.strokeRect(44, 44, 992, 1832);

    } else {
      // Thème Dark Techno Minimaliste (Berlin / Ibiza)
      ctx.fillStyle = '#050507';
      ctx.fillRect(0, 0, 1080, 1920);

      // Texture de grille subtile
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1;
      for (let x = 60; x < 1080; x += 120) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 1920);
        ctx.stroke();
      }

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.strokeRect(36, 36, 1008, 1848);
    }

    // 2. EN-TÊTE : LOGO OFFICIEL ASTRA 3D + VILLE
    try {
      const logoImg = await loadImage('/astra-logo.png');
      ctx.drawImage(logoImg, 440, 68, 200, 172);
    } catch {
      // Fallback text
      ctx.textAlign = 'center';
      ctx.fillStyle = theme === 'neon' ? '#06b6d4' : '#e5b85c';
      ctx.font = '900 48px system-ui, sans-serif';
      ctx.fillText('ASTRA', 540, 150);
    }

    ctx.textAlign = 'center';
    ctx.fillStyle = theme === 'neon' ? '#06b6d4' : '#e5b85c';
    ctx.font = '900 16px system-ui, sans-serif';
    ctx.letterSpacing = '6px';
    ctx.fillText('ORLÉANS • CLUB & VIP', 540, 260);

    // 3. BADGE RP & STATUT DE PRESTIGE
    const rpCardY = 295;
    ctx.fillStyle = theme === 'neon' ? 'rgba(20, 15, 36, 0.92)' : 'rgba(18, 21, 34, 0.95)';
    drawRoundedRect(ctx, 80, rpCardY, 920, 110, 24);
    ctx.fill();

    ctx.strokeStyle = theme === 'neon' ? '#ec4899' : '#e5b85c';
    ctx.lineWidth = 2;
    drawRoundedRect(ctx, 80, rpCardY, 920, 110, 24);
    ctx.stroke();

    // Avatar RP rond
    const avatarX = 145;
    const avatarY = rpCardY + 55;
    const avatarRadius = 38;

    if (promoter.avatar_url) {
      try {
        const avImg = await loadImage(promoter.avatar_url);
        ctx.save();
        ctx.beginPath();
        ctx.arc(avatarX, avatarY, avatarRadius, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(avImg, avatarX - avatarRadius, avatarY - avatarRadius, avatarRadius * 2, avatarRadius * 2);
        ctx.restore();

        ctx.strokeStyle = theme === 'neon' ? '#06b6d4' : '#e5b85c';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(avatarX, avatarY, avatarRadius, 0, Math.PI * 2);
        ctx.stroke();
      } catch {
        drawFallbackAvatar(ctx, promoter, avatarX, avatarY, avatarRadius, theme);
      }
    } else {
      drawFallbackAvatar(ctx, promoter, avatarX, avatarY, avatarRadius, theme);
    }

    // Textes RP
    ctx.textAlign = 'left';
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillText('PASS INVITATION OFFICIELLE RP', 210, rpCardY + 44);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 28px system-ui, sans-serif';
    ctx.fillText(`${promoter.first_name} ${promoter.last_name}`, 210, rpCardY + 78);

    // Badge Rank RP à droite
    ctx.textAlign = 'right';
    ctx.fillStyle = promoterRankInfo.currentRank.color;
    ctx.font = '900 18px system-ui, sans-serif';
    ctx.fillText(promoterRankInfo.currentRank.badge.toUpperCase(), 960, rpCardY + 54);

    if (promoter.instagram_handle) {
      ctx.fillStyle = '#cbd5e1';
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.fillText(`@${promoter.instagram_handle.replace(/^@/, '')}`, 960, rpCardY + 80);
    }

    // 4. BANDEAU ENTRÉE 100% GRATUITE HAUTE VISIBILITÉ
    const bannerY = 430;
    const emeraldGrad = ctx.createLinearGradient(80, bannerY, 1000, bannerY);
    if (theme === 'neon') {
      emeraldGrad.addColorStop(0, '#06b6d4');
      emeraldGrad.addColorStop(0.5, '#ec4899');
      emeraldGrad.addColorStop(1, '#06b6d4');
    } else {
      emeraldGrad.addColorStop(0, '#059669');
      emeraldGrad.addColorStop(0.5, '#10b981');
      emeraldGrad.addColorStop(1, '#059669');
    }
    ctx.fillStyle = emeraldGrad;
    drawRoundedRect(ctx, 80, bannerY, 920, 84, 20);
    ctx.fill();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#000000';
    ctx.font = '900 32px system-ui, sans-serif';
    ctx.fillText('★ ENTRÉE 100% GRATUITE • COUPE-FILE ★', 540, bannerY + 54);

    // 5. BLOC AFFICHE DE LA SOIRÉE
    let currentY = 540;
    if (upcomingEvent) {
      if (upcomingEvent.cover_image_url) {
        try {
          const posterImg = await loadImage(upcomingEvent.cover_image_url);
          const posterH = 460;

          ctx.save();
          drawRoundedRect(ctx, 80, currentY, 920, posterH, 24);
          ctx.clip();

          // Fond blur ambiant
          ctx.drawImage(posterImg, 80, currentY, 920, posterH);
          ctx.fillStyle = 'rgba(7, 8, 12, 0.76)';
          ctx.fillRect(80, currentY, 920, posterH);

          // Affiche centrée à ratio préservé
          const pRatio = posterImg.width / (posterImg.height || 1);
          let fitW = 920;
          let fitH = 920 / pRatio;
          if (fitH > posterH) {
            fitH = posterH;
            fitW = posterH * pRatio;
          }
          const fitX = 80 + (920 - fitW) / 2;
          const fitY = currentY + (posterH - fitH) / 2;
          ctx.drawImage(posterImg, fitX, fitY, fitW, fitH);

          // Dégradé sombre bas d'affiche
          const grad = ctx.createLinearGradient(80, currentY + 220, 80, currentY + posterH);
          grad.addColorStop(0, 'rgba(10, 12, 18, 0)');
          grad.addColorStop(1, 'rgba(10, 12, 18, 0.96)');
          ctx.fillStyle = grad;
          ctx.fillRect(80, currentY, 920, posterH);
          ctx.restore();

          // Cadre affiche
          ctx.strokeStyle = theme === 'neon' ? '#06b6d4' : '#232738';
          ctx.lineWidth = 2;
          drawRoundedRect(ctx, 80, currentY, 920, posterH, 24);
          ctx.stroke();

          // Textes soirée sur l'affiche
          ctx.textAlign = 'center';
          ctx.fillStyle = '#ffffff';
          ctx.font = '900 36px system-ui, sans-serif';
          ctx.fillText(upcomingEvent.name, 540, currentY + posterH - 72);

          ctx.fillStyle = theme === 'neon' ? '#06b6d4' : '#e5b85c';
          ctx.font = 'bold 22px system-ui, sans-serif';
          const dateStr = formatFrenchDate(upcomingEvent.event_date).toUpperCase();
          const timeStr = `${formatFrenchTime(upcomingEvent.start_time)} → ${formatFrenchTime(upcomingEvent.end_time)}`;
          ctx.fillText(`📅 ${dateStr}  •  ⏰ ${timeStr}`, 540, currentY + posterH - 26);

          currentY += posterH + 30;
        } catch {
          currentY = renderFallbackEventCard(ctx, upcomingEvent, currentY, theme);
        }
      } else {
        currentY = renderFallbackEventCard(ctx, upcomingEvent, currentY, theme);
      }
    } else {
      // Pas de soirée particulière
      ctx.fillStyle = '#10131e';
      drawRoundedRect(ctx, 80, currentY, 920, 200, 24);
      ctx.fill();
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 34px system-ui, sans-serif';
      ctx.fillText('SOIRÉES OFFICIELLES DU CLUB', 540, currentY + 95);
      ctx.fillStyle = '#e5b85c';
      ctx.font = 'bold 22px system-ui, sans-serif';
      ctx.fillText('PASS INVITÉ VALABLE TOUS LES WEEK-ENDS', 540, currentY + 145);
      currentY += 230;
    }

    // 6. ACCROCHE DU RP (HOOK TEXT)
    ctx.textAlign = 'center';
    ctx.fillStyle = theme === 'neon' ? '#ec4899' : '#ffffff';
    ctx.font = '900 30px system-ui, sans-serif';
    ctx.fillText(hookText, 540, currentY + 36);
    currentY += 64;

    // 7. ZONE SPÉCIALE DÉDIÉE AU STICKER DE LIEN INSTAGRAM
    const stickerBoxY = currentY;
    const stickerBoxH = 260;

    // Lueur pulsée sous la boîte de sticker
    const glowCenterY = stickerBoxY + stickerBoxH / 2;
    const stickerGlow = ctx.createRadialGradient(540, glowCenterY, 40, 540, glowCenterY, 450);
    if (theme === 'neon') {
      stickerGlow.addColorStop(0, 'rgba(236, 72, 153, 0.35)');
      stickerGlow.addColorStop(1, 'rgba(6, 4, 13, 0)');
    } else {
      stickerGlow.addColorStop(0, 'rgba(229, 184, 92, 0.30)');
      stickerGlow.addColorStop(1, 'rgba(7, 8, 12, 0)');
    }
    ctx.fillStyle = stickerGlow;
    ctx.fillRect(80, stickerBoxY - 20, 920, stickerBoxH + 40);

    // Fond boîte sticker
    ctx.fillStyle = theme === 'neon' ? 'rgba(15, 10, 30, 0.94)' : 'rgba(18, 20, 30, 0.95)';
    drawRoundedRect(ctx, 110, stickerBoxY, 860, stickerBoxH, 28);
    ctx.fill();

    // Bordure pointillée stylisée pour indiquer où coller le sticker
    ctx.save();
    ctx.setLineDash([14, 10]);
    ctx.strokeStyle = theme === 'neon' ? '#ec4899' : '#e5b85c';
    ctx.lineWidth = 4;
    drawRoundedRect(ctx, 110, stickerBoxY, 860, stickerBoxH, 28);
    ctx.stroke();
    ctx.restore();

    // Flèches pointant vers le sticker
    ctx.textAlign = 'center';
    ctx.fillStyle = theme === 'neon' ? '#ec4899' : '#e5b85c';
    ctx.font = '900 24px system-ui, sans-serif';
    ctx.fillText('👇  POSE TON STICKER DE LIEN ICI  👇', 540, stickerBoxY + 54);

    // Emplacement visuel du sticker Instagram
    ctx.fillStyle = '#ffffff';
    drawRoundedRect(ctx, 240, stickerBoxY + 84, 600, 88, 20);
    ctx.fill();

    ctx.fillStyle = '#000000';
    ctx.font = '900 24px system-ui, sans-serif';
    ctx.fillText('🔗 CLIQUE ICI POUR TON PASS 🎟️', 540, stickerBoxY + 138);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 17px system-ui, sans-serif';
    ctx.fillText('Inscription en 5 sec • Billet gratuit téléchargé immédiatement', 540, stickerBoxY + 220);

    currentY += stickerBoxH + 40;

    // 8. GROSSE CONSIGNE D'ARRIVÉE AU CLUB
    const instrBoxY = currentY;
    const instrH = 140;
    ctx.fillStyle = '#10131e';
    drawRoundedRect(ctx, 80, instrBoxY, 920, instrH, 20);
    ctx.fill();

    ctx.strokeStyle = '#e5b85c';
    ctx.lineWidth = 2;
    drawRoundedRect(ctx, 80, instrBoxY, 920, instrH, 20);
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#e5b85c';
    ctx.font = '900 16px system-ui, sans-serif';
    ctx.fillText('⚠️  CONSIGNE OBLIGATOIRE À VOTRE ARRIVÉE  ⚠️', 540, instrBoxY + 40);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 25px system-ui, sans-serif';
    ctx.fillText("DEMANDEZ UNE ENTRÉE ASTRA À L'ARRIVÉE AU CLUB", 540, instrBoxY + 80);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.fillText("Faites scanner ce pass par un de vos RP ou directement dans l'ASTRA.", 540, instrBoxY + 114);

    // 9. PIED DE PAGE DISCRET
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillText('ASTRA ORLÉANS • INVITATIONS OFFICIELLES NUMÉRISÉES', 540, 1876);

    return canvas.toDataURL('image/png');
  }, [theme, format, hookText, promoter, upcomingEvent, entriesCount, promoterRankInfo]);

  // Met à jour la prévisualisation quand les options changent
  useEffect(() => {
    if (!isOpen) return;
    let isCancelled = false;

    async function updatePreview() {
      try {
        setGenerating(true);
        const dataUrl = await renderStoryCanvas();
        if (!isCancelled) {
          setPreviewUrl(dataUrl);
        }
      } catch (err) {
        console.error('Erreur génération preview story:', err);
      } finally {
        if (!isCancelled) setGenerating(false);
      }
    }

    updatePreview();
    return () => {
      isCancelled = true;
    };
  }, [isOpen, renderStoryCanvas]);

  // Action Télécharger Image HD
  const handleDownloadImage = async () => {
    try {
      setGenerating(true);
      const dataUrl = await renderStoryCanvas();
      const link = document.createElement('a');
      const safePromoter = `${promoter.first_name}-${promoter.last_name}`.replace(/[^a-zA-Z0-9]/g, '_');
      const prefix = format === '1:1' ? 'BANNIERE-BIO-ASTRA' : 'STORY-ASTRA';
      link.download = `${prefix}-${safePromoter}-${theme.toUpperCase()}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la création de la story.');
    } finally {
      setGenerating(false);
    }
  };

  // Action Partager Mobile via Web Share API
  const handleShareMobile = async () => {
    try {
      setGenerating(true);
      const dataUrl = await renderStoryCanvas();
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], `story-astra-${promoter.slug}.png`, { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Mon Pass Invité ASTRA',
          text: `Mon lien pour le pass 100% gratuit : ${publicUrl}`,
        });
      } else {
        // Fallback téléchargement direct
        handleDownloadImage();
      }
    } catch (err) {
      // Ignorer l'annulation par l'utilisateur
      console.log(err);
    } finally {
      setGenerating(false);
    }
  };

  // Action Copier Lien Sticker
  const handleCopyLink = () => {
    if (!publicUrl) return;
    navigator.clipboard.writeText(publicUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-[#0f111a] border border-[#232738] rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-[#232738] flex items-center justify-between bg-[#121522]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#e5b85c] to-[#b38938] flex items-center justify-center text-black shadow-lg">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                Studio Visuels ASTRA (Story &amp; Bio)
              </h2>
              <p className="text-[11px] text-gray-400">
                Générez votre affiche officielle en Story (9:16) ou votre bannière carrée (1:1) en 1 clic
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: 2 colonnes (Prévisualisation à gauche, Contrôles à droite) */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          
          {/* Colonne Gauche : Aperçu Dynamique (9:16 ou 1:1) */}
          <div className="md:col-span-5 flex flex-col items-center justify-center">
            <div className={`relative w-full ${format === '1:1' ? 'max-w-[280px] sm:max-w-[310px] aspect-square' : 'max-w-[260px] sm:max-w-[290px] aspect-[9/16]'} rounded-2xl overflow-hidden shadow-2xl border-2 border-[#e5b85c]/40 bg-black flex items-center justify-center group`}>
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt="Aperçu Visuel"
                  className="w-full h-full object-cover select-none"
                />
              ) : (
                <div className="flex flex-col items-center gap-3 text-center p-4">
                  <div className="w-8 h-8 rounded-full border-2 border-[#e5b85c] border-t-transparent animate-spin" />
                  <span className="text-xs text-gray-400 font-medium">Génération du visuel...</span>
                </div>
              )}

              {generating && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full border-2 border-[#e5b85c] border-t-transparent animate-spin" />
                </div>
              )}
            </div>

            <p className="text-[11px] text-gray-500 mt-2.5 text-center font-medium">
              {format === '1:1'
                ? 'Format Carré 1080 × 1080 px (1:1) • Bio, Linktree & Post Feed'
                : 'Format Story 1080 × 1920 px (9:16) • Haute Définition'}
            </p>
          </div>

          {/* Colonne Droite : Options & Actions */}
          <div className="md:col-span-7 space-y-5">
            
            {/* 1. Choix du Format (9:16 vs 1:1) */}
            <div>
              <label className="text-xs uppercase font-extrabold tracking-wider text-[#e5b85c] mb-2 block flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                1. Format du Visuel
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setFormat('9:16')}
                  className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                    format === '9:16'
                      ? 'border-[#e5b85c] bg-[#e5b85c]/15 text-[#e5b85c] font-bold shadow-[0_0_15px_rgba(229,184,92,0.2)]'
                      : 'border-[#232738] bg-[#121522] text-gray-400 hover:text-white'
                  }`}
                >
                  <span className="text-xs block font-bold">Story Instagram (9:16)</span>
                  <span className="text-[10px] text-gray-400">Story, Snap, TikTok</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormat('1:1')}
                  className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                    format === '1:1'
                      ? 'border-[#e5b85c] bg-[#e5b85c]/15 text-[#e5b85c] font-bold shadow-[0_0_15px_rgba(229,184,92,0.2)]'
                      : 'border-[#232738] bg-[#121522] text-gray-400 hover:text-white'
                  }`}
                >
                  <span className="text-xs block font-bold">Bannière Carrée (1:1)</span>
                  <span className="text-[10px] text-gray-400">Bio, Linktree &amp; Feed</span>
                </button>
              </div>
            </div>

            {/* 2. Choix du Thème Visuel */}
            <div>
              <label className="text-xs uppercase font-extrabold tracking-wider text-[#e5b85c] mb-2 block flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                2. Style Visuel
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => setTheme('gold')}
                  className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                    theme === 'gold'
                      ? 'border-[#e5b85c] bg-[#e5b85c]/15 text-[#e5b85c] shadow-[0_0_15px_rgba(229,184,92,0.2)] font-bold'
                      : 'border-[#232738] bg-[#121522] text-gray-400 hover:text-white'
                  }`}
                >
                  <Sparkles className="w-5 h-5 mx-auto mb-1 text-[#e5b85c]" />
                  <span className="text-xs block font-bold">Gold Luxury</span>
                  <span className="text-[9px] text-gray-400">Club VIP</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTheme('neon')}
                  className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                    theme === 'neon'
                      ? 'border-[#06b6d4] bg-[#06b6d4]/15 text-[#06b6d4] shadow-[0_0_15px_rgba(6,182,212,0.25)] font-bold'
                      : 'border-[#232738] bg-[#121522] text-gray-400 hover:text-white'
                  }`}
                >
                  <Zap className="w-5 h-5 mx-auto mb-1 text-[#06b6d4]" />
                  <span className="text-xs block font-bold">Neon Cyber</span>
                  <span className="text-[9px] text-gray-400">Rave Festival</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTheme('dark')}
                  className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                    theme === 'dark'
                      ? 'border-white bg-white/10 text-white shadow-[0_0_15px_rgba(255,255,255,0.15)] font-bold'
                      : 'border-[#232738] bg-[#121522] text-gray-400 hover:text-white'
                  }`}
                >
                  <Flame className="w-5 h-5 mx-auto mb-1 text-white" />
                  <span className="text-xs block font-bold">Dark Minimal</span>
                  <span className="text-[9px] text-gray-400">Techno Club</span>
                </button>
              </div>
            </div>

            {/* 2. Choix de l'Accroche RP */}
            <div>
              <label className="text-xs uppercase font-extrabold tracking-wider text-[#e5b85c] mb-2 block flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5" />
                2. Texte d&apos;Accroche
              </label>
              <div className="space-y-1.5">
                {PRESET_HOOKS.map((hook, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setHookText(hook)}
                    className={`w-full p-2.5 text-left rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center justify-between ${
                      hookText === hook
                        ? 'border-[#e5b85c] bg-[#e5b85c]/10 text-white'
                        : 'border-[#232738] bg-[#121522] text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    <span>{hook}</span>
                    {hookText === hook && <Check className="w-3.5 h-3.5 text-[#e5b85c] shrink-0" />}
                  </button>
                ))}
                <div className="pt-1">
                  <input
                    type="text"
                    maxLength={45}
                    value={hookText}
                    onChange={(e) => setHookText(e.target.value)}
                    placeholder="Ou écrivez votre propre texte d'accroche..."
                    className="w-full px-3 py-2.5 bg-[#121522] border border-[#232738] rounded-xl text-white text-xs placeholder-gray-500 focus:outline-none focus:border-[#e5b85c]"
                  />
                  <p className="text-[10px] text-gray-500 mt-1 flex justify-between items-center">
                    <span>💡 Astuce : court et percutant pour un max de clics</span>
                    <span>{hookText.length}/45</span>
                  </p>
                </div>
              </div>
            </div>

            {/* 3. Zone Spéciale Sticker de Lien */}
            <div className="p-3.5 rounded-2xl bg-[#141724] border border-[#e5b85c]/30 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">🔗</span>
                  <div>
                    <p className="text-xs font-bold text-white">Votre lien personnel de Pass</p>
                    <p className="text-[10px] text-gray-400">À coller dans le sticker de lien Instagram</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCopyLink}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                    copiedLink
                      ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
                      : 'bg-[#e5b85c] text-black hover:bg-[#f0c773]'
                  }`}
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copié !</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copier le lien</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-[11px] font-mono text-gray-400 bg-black/40 px-2.5 py-1.5 rounded-lg truncate border border-white/5">
                {publicUrl}
              </p>
            </div>

            {/* 4. Boutons d'Action Principaux */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleDownloadImage}
                disabled={generating}
                className="w-full py-4 px-5 rounded-2xl bg-gradient-to-r from-[#e5b85c] to-[#d4a037] hover:from-[#f0c773] hover:to-[#e5b85c] text-black font-extrabold text-sm flex items-center justify-center gap-2 shadow-xl shadow-[#e5b85c]/10 active:scale-98 transition-all cursor-pointer disabled:opacity-50"
              >
                {downloadSuccess ? (
                  <>
                    <Check className="w-4 h-4 text-black" />
                    <span>Story enregistrée dans vos photos !</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 text-black" />
                    <span>Télécharger la Story HD (Image 9:16)</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleShareMobile}
                disabled={generating}
                className="w-full py-3 px-5 rounded-2xl bg-[#1c202d] hover:bg-[#252b3d] text-white font-bold text-xs flex items-center justify-center gap-2 border border-[#2e354a] transition-all cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5 text-[#e5b85c]" />
                <span>Partager directement en Story Instagram</span>
              </button>
            </div>

          </div>

        </div>

      </div>

      {/* Hidden Canvas used for HD 1080x1920 export */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

// Rendu Canvas 1080x1080 (Format Carré 1:1 pour Bio, Linktree et Feed)
async function renderSquareCanvas(
  canvas: HTMLCanvasElement,
  theme: StoryTheme,
  hookText: string,
  promoter: StoryPromoter,
  upcomingEvent: StoryEvent | null,
  promoterRankInfo: ReturnType<typeof getPromoterRank>
): Promise<string> {
  canvas.width = 1080;
  canvas.height = 1080;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Impossible d’initialiser le moteur 2D.');

  // 1. FOND DE BASE
  if (theme === 'gold') {
    ctx.fillStyle = '#07080c';
    ctx.fillRect(0, 0, 1080, 1080);

    const radial = ctx.createRadialGradient(540, 500, 80, 540, 500, 600);
    radial.addColorStop(0, 'rgba(229, 184, 92, 0.18)');
    radial.addColorStop(0.7, 'rgba(18, 20, 32, 0.95)');
    radial.addColorStop(1, '#07080c');
    ctx.fillStyle = radial;
    ctx.fillRect(0, 0, 1080, 1080);

    ctx.strokeStyle = '#e5b85c';
    ctx.lineWidth = 4;
    ctx.strokeRect(32, 32, 1016, 1016);

    ctx.strokeStyle = 'rgba(229, 184, 92, 0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(44, 44, 992, 992);
  } else if (theme === 'neon') {
    ctx.fillStyle = '#06040d';
    ctx.fillRect(0, 0, 1080, 1080);

    const cyanGlow = ctx.createRadialGradient(300, 300, 40, 300, 300, 500);
    cyanGlow.addColorStop(0, 'rgba(6, 182, 212, 0.28)');
    cyanGlow.addColorStop(1, 'rgba(6, 4, 13, 0)');
    ctx.fillStyle = cyanGlow;
    ctx.fillRect(0, 0, 1080, 1080);

    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 4;
    ctx.shadowColor = '#06b6d4';
    ctx.shadowBlur = 14;
    ctx.strokeRect(32, 32, 1016, 1016);
    ctx.shadowBlur = 0;

    ctx.strokeStyle = '#ec4899';
    ctx.lineWidth = 2;
    ctx.strokeRect(44, 44, 992, 992);
  } else {
    ctx.fillStyle = '#050507';
    ctx.fillRect(0, 0, 1080, 1080);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.strokeRect(36, 36, 1008, 1008);
  }

  // 2. LOGO ASTRA 3D
  try {
    const logoImg = await loadImage('/astra-logo.png');
    ctx.drawImage(logoImg, 465, 50, 150, 130);
  } catch {
    ctx.textAlign = 'center';
    ctx.fillStyle = theme === 'neon' ? '#06b6d4' : '#e5b85c';
    ctx.font = '900 42px system-ui, sans-serif';
    ctx.fillText('ASTRA', 540, 125);
  }

  ctx.textAlign = 'center';
  ctx.fillStyle = theme === 'neon' ? '#06b6d4' : '#e5b85c';
  ctx.font = '900 15px system-ui, sans-serif';
  ctx.fillText('ORLÉANS • CLUB & NIGHTLIFE', 540, 195);

  // 3. BADGE RP EN LIGNE
  const rpY = 220;
  ctx.fillStyle = theme === 'neon' ? 'rgba(20, 15, 36, 0.92)' : 'rgba(18, 21, 34, 0.95)';
  drawRoundedRect(ctx, 80, rpY, 920, 95, 20);
  ctx.fill();

  ctx.strokeStyle = theme === 'neon' ? '#ec4899' : '#e5b85c';
  ctx.lineWidth = 2;
  drawRoundedRect(ctx, 80, rpY, 920, 95, 20);
  ctx.stroke();

  const avatarX = 135;
  const avatarY = rpY + 47;
  const avatarRadius = 32;
  if (promoter.avatar_url) {
    try {
      const avImg = await loadImage(promoter.avatar_url);
      ctx.save();
      ctx.beginPath();
      ctx.arc(avatarX, avatarY, avatarRadius, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(avImg, avatarX - avatarRadius, avatarY - avatarRadius, avatarRadius * 2, avatarRadius * 2);
      ctx.restore();

      ctx.strokeStyle = theme === 'neon' ? '#06b6d4' : '#e5b85c';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(avatarX, avatarY, avatarRadius, 0, Math.PI * 2);
      ctx.stroke();
    } catch {
      drawFallbackAvatar(ctx, promoter, avatarX, avatarY, avatarRadius, theme);
    }
  } else {
    drawFallbackAvatar(ctx, promoter, avatarX, avatarY, avatarRadius, theme);
  }

  ctx.textAlign = 'left';
  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillText('PASS INVITÉ OFFICIEL', 190, rpY + 38);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 24px system-ui, sans-serif';
  ctx.fillText(`${promoter.first_name} ${promoter.last_name}`, 190, rpY + 68);

  ctx.textAlign = 'right';
  ctx.fillStyle = promoterRankInfo.currentRank.color;
  ctx.font = '900 16px system-ui, sans-serif';
  ctx.fillText(promoterRankInfo.currentRank.badge.toUpperCase(), 960, rpY + 46);

  if (promoter.instagram_handle) {
    ctx.fillStyle = '#cbd5e1';
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.fillText(`@${promoter.instagram_handle.replace(/^@/, '')}`, 960, rpY + 70);
  }

  // 4. BANDEAU HÉROS "ENTRÉE 100% GRATUITE"
  const heroY = 335;
  const grad = ctx.createLinearGradient(80, heroY, 1000, heroY);
  if (theme === 'neon') {
    grad.addColorStop(0, '#06b6d4');
    grad.addColorStop(0.5, '#ec4899');
    grad.addColorStop(1, '#06b6d4');
  } else {
    grad.addColorStop(0, '#059669');
    grad.addColorStop(0.5, '#10b981');
    grad.addColorStop(1, '#059669');
  }
  ctx.fillStyle = grad;
  drawRoundedRect(ctx, 80, heroY, 920, 80, 20);
  ctx.fill();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#000000';
  ctx.font = '900 30px system-ui, sans-serif';
  ctx.fillText('★ ENTRÉE 100% GRATUITE AVEC MON PASS ★', 540, heroY + 52);

  // 5. SOIRÉE OU ACCROCHE
  const eventY = 435;
  if (upcomingEvent) {
    ctx.fillStyle = '#10131e';
    drawRoundedRect(ctx, 80, eventY, 920, 80, 18);
    ctx.fill();
    ctx.strokeStyle = '#232738';
    ctx.lineWidth = 1.5;
    drawRoundedRect(ctx, 80, eventY, 920, 80, 18);
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 24px system-ui, sans-serif';
    ctx.fillText(upcomingEvent.name, 540, eventY + 36);

    ctx.fillStyle = theme === 'neon' ? '#06b6d4' : '#e5b85c';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.fillText(`📅 ${formatFrenchDate(upcomingEvent.event_date).toUpperCase()} • ASTRA CLUB`, 540, eventY + 64);
  } else {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 24px system-ui, sans-serif';
    ctx.fillText(hookText, 540, eventY + 48);
  }

  // 6. ZONE "LIEN EN BIO / LINKTREE"
  const bioBoxY = 535;
  const bioBoxH = 345;

  ctx.fillStyle = theme === 'neon' ? 'rgba(15, 10, 30, 0.94)' : 'rgba(18, 20, 30, 0.95)';
  drawRoundedRect(ctx, 80, bioBoxY, 920, bioBoxH, 24);
  ctx.fill();

  ctx.save();
  ctx.setLineDash([12, 8]);
  ctx.strokeStyle = theme === 'neon' ? '#ec4899' : '#e5b85c';
  ctx.lineWidth = 3.5;
  drawRoundedRect(ctx, 80, bioBoxY, 920, bioBoxH, 24);
  ctx.stroke();
  ctx.restore();

  ctx.textAlign = 'center';
  ctx.fillStyle = theme === 'neon' ? '#ec4899' : '#e5b85c';
  ctx.font = '900 26px system-ui, sans-serif';
  ctx.fillText('👇  RÉCUPÈRE TON PASS ICI  👇', 540, bioBoxY + 54);

  // Bouton Linktree / Bio
  ctx.fillStyle = '#ffffff';
  drawRoundedRect(ctx, 160, bioBoxY + 84, 760, 95, 24);
  ctx.fill();

  ctx.fillStyle = '#000000';
  ctx.font = '900 28px system-ui, sans-serif';
  ctx.fillText('🔗 CLIQUE SUR LE LIEN EN BIO 🎟️', 540, bioBoxY + 144);

  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 18px system-ui, sans-serif';
  ctx.fillText('QR Code nominatif généré en 5 secondes', 540, bioBoxY + 225);

  ctx.fillStyle = '#e5b85c';
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.fillText(`astra-club.fr/rp/${promoter.slug}`, 540, bioBoxY + 265);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 16px system-ui, sans-serif';
  ctx.fillText("À l'arrivée : Demande UNE ENTRÉE ASTRA puis fais scanner ton pass", 540, bioBoxY + 305);

  // 7. Footer
  ctx.fillStyle = '#64748b';
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.fillText('ASTRA ORLÉANS • INVITATIONS OFFICIELLES NUMÉRISÉES', 540, 1035);

  return canvas.toDataURL('image/png');
}

// Fallback pour afficher un avatar élégant si pas d'image
function drawFallbackAvatar(
  ctx: CanvasRenderingContext2D,
  promoter: StoryPromoter,
  x: number,
  y: number,
  radius: number,
  theme: StoryTheme
) {
  ctx.fillStyle = theme === 'neon' ? '#18122c' : '#1a1e2d';
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = theme === 'neon' ? '#06b6d4' : '#e5b85c';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = theme === 'neon' ? '#06b6d4' : '#e5b85c';
  ctx.font = '900 24px system-ui, sans-serif';
  const initials = `${promoter.first_name.charAt(0)}${promoter.last_name.charAt(0)}`.toUpperCase();
  ctx.fillText(initials, x, y + 8);
}

// Fallback pour afficher une carte de soirée si pas d'affiche
function renderFallbackEventCard(
  ctx: CanvasRenderingContext2D,
  event: StoryEvent,
  y: number,
  theme: StoryTheme
): number {
  const cardH = 220;
  ctx.fillStyle = '#10131e';
  drawRoundedRect(ctx, 80, y, 920, cardH, 24);
  ctx.fill();

  ctx.strokeStyle = theme === 'neon' ? '#06b6d4' : '#232738';
  ctx.lineWidth = 2;
  drawRoundedRect(ctx, 80, y, 920, cardH, 24);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 36px system-ui, sans-serif';
  ctx.fillText(event.name, 540, y + 85);

  ctx.fillStyle = theme === 'neon' ? '#06b6d4' : '#e5b85c';
  ctx.font = 'bold 24px system-ui, sans-serif';
  const dateStr = formatFrenchDate(event.event_date).toUpperCase();
  const timeStr = `${formatFrenchTime(event.start_time)} → ${formatFrenchTime(event.end_time)}`;
  ctx.fillText(`📅 ${dateStr}  •  ⏰ ${timeStr}`, 540, y + 145);

  return y + cardH + 30;
}
