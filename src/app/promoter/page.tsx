'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Trophy, 
  Sparkles, 
  Share2, 
  Copy, 
  Check, 
  ExternalLink, 
  MessageSquare, 
  Send, 
  Calendar, 
  Clock, 
  Edit3, 
  X, 
  AlertCircle, 
  CheckCircle2, 
  Users, 
  TrendingUp, 
  Flame,
  Award,
  Upload
} from 'lucide-react';
import { InstagramIcon } from '@/components/ui/InstagramIcon';
import { formatFrenchDate, formatFrenchTime } from '@/lib/utils';
import confetti from 'canvas-confetti';

export interface AvatarItem {
  name: string;
  category: 'club' | 'gaming' | 'cinema' | 'animals';
  url: string;
}

export const AVATAR_CATALOG: AvatarItem[] = [
  // CLUB & COSMIQUE (Boule à facette 3D & Planète Saturne)
  {
    name: 'Boule à facette 3D',
    category: 'club',
    url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=400&auto=format&fit=crop',
  },
  {
    name: 'Planète Saturne 3D',
    category: 'club',
    url: 'https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?q=80&w=400&auto=format&fit=crop',
  },
  {
    name: 'Gold VIP ASTRA',
    category: 'club',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop',
  },
  {
    name: 'Nightlife DJ Club',
    category: 'club',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=400&auto=format&fit=crop',
  },
  {
    name: 'Laser Show Club',
    category: 'club',
    url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=400&auto=format&fit=crop',
  },

  // JEUX VIDÉO SUPER CONNUS
  {
    name: 'Cyberpunk Neon V',
    category: 'gaming',
    url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=400&auto=format&fit=crop',
  },
  {
    name: 'Master Chief Spartan',
    category: 'gaming',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=400&auto=format&fit=crop',
  },
  {
    name: 'Guerrier Divin (Kratos)',
    category: 'gaming',
    url: 'https://images.unsplash.com/photo-1563089145-599997674d42?q=80&w=400&auto=format&fit=crop',
  },
  {
    name: 'Pixel Star (Mario)',
    category: 'gaming',
    url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=400&auto=format&fit=crop',
  },
  {
    name: 'Ultra Speed (Sonic)',
    category: 'gaming',
    url: 'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?q=80&w=400&auto=format&fit=crop',
  },
  {
    name: 'Electric Star (Pikachu)',
    category: 'gaming',
    url: 'https://images.unsplash.com/photo-1613771404784-3a5686aa2be3?q=80&w=400&auto=format&fit=crop',
  },

  // PERSONNAGES DE FILMS LÉGENDAIRES
  {
    name: 'Neo (Matrix Cyber)',
    category: 'cinema',
    url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=400&auto=format&fit=crop',
  },
  {
    name: 'Batman (Dark Knight)',
    category: 'cinema',
    url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=400&auto=format&fit=crop',
  },
  {
    name: 'Le Parrain (Corleone)',
    category: 'cinema',
    url: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?q=80&w=400&auto=format&fit=crop',
  },
  {
    name: 'Thomas Shelby (Peaky)',
    category: 'cinema',
    url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=400&auto=format&fit=crop',
  },
  {
    name: 'Tony Montana (Scarface)',
    category: 'cinema',
    url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=400&auto=format&fit=crop',
  },
  {
    name: 'Joker (Wild Card)',
    category: 'cinema',
    url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=400&auto=format&fit=crop',
  },

  // ANIMAUX EN 3D CARTOON
  {
    name: 'Lion Roi 3D',
    category: 'animals',
    url: 'https://images.unsplash.com/photo-1534188753412-3e26d0d618d6?q=80&w=400&auto=format&fit=crop',
  },
  {
    name: 'Singe Cyber 3D',
    category: 'animals',
    url: 'https://images.unsplash.com/photo-1540573133985-87b6da6d54a9?q=80&w=400&auto=format&fit=crop',
  },
  {
    name: 'Panda DJ 3D',
    category: 'animals',
    url: 'https://images.unsplash.com/photo-1564349683136-77e08dba1ef7?q=80&w=400&auto=format&fit=crop',
  },
  {
    name: 'Loup Alpha 3D',
    category: 'animals',
    url: 'https://images.unsplash.com/photo-1564419320461-6870880221ad?q=80&w=400&auto=format&fit=crop',
  },
  {
    name: 'Tigre Gold 3D',
    category: 'animals',
    url: 'https://images.unsplash.com/photo-1534177616072-ef7dc120449d?q=80&w=400&auto=format&fit=crop',
  },
];

interface PromoterData {
  id: string;
  first_name: string;
  last_name: string;
  instagram_handle: string | null;
  slug: string;
  avatar_url: string | null;
}

interface LeaderboardItem {
  id: string;
  first_name: string;
  last_name: string;
  instagram_handle: string | null;
  slug: string;
  avatar_url: string | null;
  entries_count: number;
  registrations_count: number;
  attendance_rate: number;
  rank: number;
}

interface UpcomingEvent {
  id: string;
  name: string;
  event_date: string;
  start_time: string;
  end_time: string;
  cover_image_url: string | null;
}

export default function PromoterDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [promoter, setPromoter] = useState<PromoterData | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [upcomingEvent, setUpcomingEvent] = useState<UpcomingEvent | null>(null);

  // Actions
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  // Modal profil
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editInstagram, setEditInstagram] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');
  const [avatarCategory, setAvatarCategory] = useState<'all' | 'club' | 'gaming' | 'cinema' | 'animals'>('all');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleAvatarFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        const canvas = document.createElement('canvas');
        const maxDim = 400; // Format avatar idéal
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
          setEditAvatarUrl(dataUrl);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/promoters/profile');
      if (!res.ok) throw new Error('Impossible de charger le profil.');
      const data = await res.json();

      setPromoter(data.promoter);
      setLeaderboard(data.leaderboard || []);
      setUpcomingEvent(data.upcomingEvent);

      if (data.promoter) {
        setEditFirstName(data.promoter.first_name);
        setEditLastName(data.promoter.last_name);
        setEditInstagram(data.promoter.instagram_handle || '');
        setEditAvatarUrl(data.promoter.avatar_url || '');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const currentPromoterRank = leaderboard.find((item) => item.id === promoter?.id);
  const personalEntries = currentPromoterRank?.entries_count || 0;
  const personalRegs = currentPromoterRank?.registrations_count || 0;
  const personalRate = currentPromoterRank?.attendance_rate || 0;
  const personalRank = currentPromoterRank?.rank || 1;

  const appOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const promoterPublicUrl = promoter ? `${appOrigin}/rp/${promoter.slug}` : '';

  const handleCopyLink = () => {
    if (!promoterPublicUrl) return;
    navigator.clipboard.writeText(promoterPublicUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyInstaText = () => {
    const eventText = upcomingEvent ? ` pour la soirée ${upcomingEvent.name}` : '';
    const textToCopy = `🎟️ Mon Pass Invité officiel ASTRA${eventText} est disponible ! Entrée 100% GRATUITE avec mon lien personnel : ${promoterPublicUrl}\n\n⚠️ IMPORTANT : À ton arrivée, demande bien UNE ENTRÉE ASTRA, puis fais scanner ce pass par ton RP ou directement dans le club après avoir pris ton entrée gratuite. Places limitées !`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const shareViaWhatsApp = () => {
    if (!promoter) return;
    const eventName = upcomingEvent ? ` pour la soirée "${upcomingEvent.name}"` : '';
    const msg = encodeURIComponent(
      `Salut ! Je t'invite au club ASTRA à Orléans${eventName} ! Ton entrée est 100% GRATUITE avec mon pass invité RP. Récupère ton billet officiel ici : ${promoterPublicUrl}\n\n⚠️ IMPORTANT : À ton arrivée au club, demande bien UNE ENTRÉE ASTRA, puis fais scanner ce pass par un de tes RP ou directement dans l'ASTRA après avoir pris ton entrée gratuite !`
    );
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  const shareViaSms = () => {
    if (!promoter) return;
    const msg = encodeURIComponent(
      `Salut ! Ton entrée pour le club ASTRA est 100% GRATUITE avec mon pass RP. Télécharge ton billet ici : ${promoterPublicUrl} (Demande UNE ENTRÉE ASTRA à ton arrivée puis fais scanner ton pass par ton RP ou dans l'ASTRA !)`
    );
    window.open(`sms:?body=${msg}`, '_blank');
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoter) return;
    setSavingProfile(true);
    setProfileMsg(null);

    try {
      const res = await fetch('/api/promoters/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promoter_id: promoter.id,
          first_name: editFirstName,
          last_name: editLastName,
          instagram_handle: editInstagram,
          avatar_url: editAvatarUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur lors de la mise à jour.');

      setPromoter(data.promoter);
      setProfileMsg({ type: 'success', text: 'Profil mis à jour avec succès !' });

      try {
        confetti({ particleCount: 40, spread: 50, origin: { y: 0.6 } });
      } catch {
        // Confetti optionnel
      }

      setTimeout(() => {
        setEditModalOpen(false);
        setProfileMsg(null);
        loadData();
      }, 1000);
    } catch (err: unknown) {
      const error = err as Error;
      setProfileMsg({ type: 'error', text: error?.message || 'Erreur de mise à jour' });
    } finally {
      setSavingProfile(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-12 h-12 rounded-full border-2 border-[#e5b85c] border-t-transparent animate-spin mb-4" />
        <p className="text-gray-400 text-sm font-medium">Chargement de votre espace RP...</p>
      </div>
    );
  }

  if (!promoter) {
    return (
      <div className="p-8 bg-[#0f1118] border border-[#232738] rounded-2xl text-center max-w-md mx-auto my-12">
        <AlertCircle className="w-12 h-12 text-[#e5b85c] mx-auto mb-4" />
        <h1 className="text-lg font-bold text-white mb-2">Profil RP non associé</h1>
        <p className="text-gray-400 text-xs leading-relaxed mb-6">
          Votre compte utilisateur est bien connecté mais n&apos;a pas encore été rattaché à une fiche RP du club ASTRA par l&apos;administrateur.
        </p>
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1c202d] text-white text-xs font-semibold hover:bg-[#252b3d]"
        >
          Retourner au Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profil Header Card */}
      <div className="bg-[#0f1118] border border-[#232738] rounded-3xl p-6 sm:p-7 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#e5b85c]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row items-center gap-5">
            {/* Logo Officiel ASTRA & Avatar RP */}
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/astra-logo.png"
                alt="ASTRA Logo Officiel"
                className="w-16 h-16 sm:w-20 sm:h-20 object-contain drop-shadow-[0_8px_16px_rgba(229,184,92,0.2)] shrink-0"
              />
              <div className="relative">
                {promoter.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={promoter.avatar_url}
                    alt={`${promoter.first_name} ${promoter.last_name}`}
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-[#e5b85c] shadow-lg"
                  />
                ) : (
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#171a25] border-2 border-[#2b3145] flex items-center justify-center shadow-lg text-white font-black text-2xl">
                    {promoter.first_name.charAt(0)}{promoter.last_name.charAt(0)}
                  </div>
                )}
                <span className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-[#e5b85c] text-black shadow">
                  RP VIP
                </span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-center sm:justify-start gap-2.5">
                <h1 className="text-2xl font-black text-white">
                  {promoter.first_name} {promoter.last_name}
                </h1>
              </div>

              <div className="flex items-center justify-center sm:justify-start gap-3 mt-1.5 text-xs text-gray-400">
                {promoter.instagram_handle && (
                  <span className="flex items-center gap-1.5 text-gray-300">
                    <InstagramIcon className="w-3.5 h-3.5 text-[#e5b85c]" />
                    @{promoter.instagram_handle}
                  </span>
                )}
                <span className="text-gray-600">•</span>
                <span className="text-[#e5b85c] font-semibold">
                  /rp/{promoter.slug}
                </span>
              </div>
            </div>
          </div>

          {/* Edit Profile Button */}
          <button
            onClick={() => setEditModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#181b26] hover:bg-[#222636] border border-[#2d3246] text-white text-xs font-semibold transition-all cursor-pointer shadow"
          >
            <Edit3 className="w-3.5 h-3.5 text-[#e5b85c]" />
            <span>Personnaliser ma page</span>
          </button>
        </div>
      </div>

      {/* RÈGLE D'OR BANNER : SEULES LES ENTRÉES SCANNÉES RAPPORTENT DES POINTS */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-[#171a26] via-[#1b1f2e] to-[#171a26] border border-[#e5b85c]/30 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#e5b85c]/10 border border-[#e5b85c]/30 flex items-center justify-center shrink-0">
            <Flame className="w-5 h-5 text-[#e5b85c]" />
          </div>
          <div className="text-xs">
            <p className="font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <span>Règle d&apos;or du concours</span>
              <span className="text-[#e5b85c]">• Inscription ≠ Entrée</span>
            </p>
            <p className="text-gray-400 text-[11px] mt-0.5">
              Seules les personnes qui sont <strong className="text-white">réellement entrées dans le club</strong> et dont le pass a été scanné par un RP ou dans l&apos;ASTRA rapportent des points.
            </p>
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-[#e5b85c] text-black">
            {personalEntries} {personalEntries > 1 ? 'Points' : 'Point'}
          </span>
        </div>
      </div>

      {/* Mes Statistiques Personnelles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-[#0f1118] border border-[#232738] rounded-2xl p-4 sm:p-5 relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
              Points Concours
            </span>
            <Trophy className="w-4 h-4 text-[#e5b85c]" />
          </div>
          <p className="text-3xl font-black text-[#e5b85c]">
            {personalEntries}
          </p>
          <p className="text-[10px] text-gray-500 mt-1 font-medium">
            Entrées réelles scannées
          </p>
        </div>

        <div className="bg-[#0f1118] border border-[#232738] rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
              Mon Classement
            </span>
            <Award className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-3xl font-black text-white">
            #{personalRank}
          </p>
          <p className="text-[10px] text-gray-500 mt-1 font-medium">
            Sur {leaderboard.length} RP actifs
          </p>
        </div>

        <div className="bg-[#0f1118] border border-[#232738] rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
              Inscriptions
            </span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-3xl font-black text-white">
            {personalRegs}
          </p>
          <p className="text-[10px] text-gray-500 mt-1 font-medium">
            Pass générés via mon lien
          </p>
        </div>

        <div className="bg-[#0f1118] border border-[#232738] rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
              Taux Présence
            </span>
            <TrendingUp className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-3xl font-black text-white">
            {personalRate}%
          </p>
          <p className="text-[10px] text-gray-500 mt-1 font-medium">
            Taux de conversion réel
          </p>
        </div>
      </div>

      {/* KIT DE PARTAGE 1-CLIC */}
      <div className="bg-[#0f1118] border border-[#232738] rounded-3xl p-6 sm:p-7 shadow-xl space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#1c202d] border border-[#2d3348] flex items-center justify-center">
              <Share2 className="w-4 h-4 text-[#e5b85c]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Kit de Partage Rapide (1-Clic)
              </h2>
              <p className="text-xs text-gray-400">
                Envoie ton lien à tes invités pour qu&apos;ils reçoivent leur QR code nominatif
              </p>
            </div>
          </div>

          <Link
            href={`/rp/${promoter.slug}`}
            target="_blank"
            className="hidden sm:inline-flex items-center gap-1.5 text-xs text-[#e5b85c] hover:underline font-semibold"
          >
            <span>Tester ma page</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Barre du lien permanent */}
        <div className="flex items-center gap-2 p-2 bg-[#0b0c12] border border-[#232738] rounded-2xl">
          <input
            type="text"
            readOnly
            value={promoterPublicUrl}
            className="flex-1 bg-transparent px-3 py-2 text-xs text-gray-300 font-mono focus:outline-none select-all"
          />
          <button
            onClick={handleCopyLink}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              copiedLink
                ? 'bg-emerald-500 text-black'
                : 'bg-[#1e2230] hover:bg-[#272c3d] text-white border border-[#2d3246]'
            }`}
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Copié !</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-[#e5b85c]" />
                <span>Copier le lien</span>
              </>
            )}
          </button>
        </div>

        {/* Boutons Réseaux Sociaux */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* WhatsApp */}
          <button
            onClick={shareViaWhatsApp}
            className="py-3 px-4 rounded-xl bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/30 text-emerald-400 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Partager sur WhatsApp</span>
          </button>

          {/* SMS */}
          <button
            onClick={shareViaSms}
            className="py-3 px-4 rounded-xl bg-blue-600/15 hover:bg-blue-600/25 border border-blue-500/30 text-blue-400 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow"
          >
            <Send className="w-4 h-4" />
            <span>Inviter par SMS</span>
          </button>

          {/* Instagram Story / DM Copy */}
          <button
            onClick={handleCopyInstaText}
            className="py-3 px-4 rounded-xl bg-gradient-to-r from-[#833ab4]/20 via-[#fd1d1d]/20 to-[#fcb045]/20 hover:brightness-125 border border-rose-500/30 text-rose-300 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow"
          >
            <InstagramIcon className="w-4 h-4 text-rose-400" />
            <span>{copiedText ? 'Texte Story Copié !' : 'Copier texte Story / DM'}</span>
          </button>
        </div>
      </div>

      {/* PROCHAINE SOIRÉE AVEC AFFICHE */}
      {upcomingEvent && (
        <div className="bg-[#0f1118] border border-[#232738] rounded-3xl overflow-hidden shadow-xl">
          <div className="flex flex-col md:flex-row">
            {upcomingEvent.cover_image_url && (
              <div className="md:w-64 h-48 md:h-auto relative overflow-hidden shrink-0 border-b md:border-b-0 md:border-r border-[#232738]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={upcomingEvent.cover_image_url}
                  alt={upcomingEvent.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-black/60 to-transparent" />
                <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-black/80 text-[#e5b85c] border border-[#e5b85c]/40">
                  AFFICHE SOIRÉE
                </span>
              </div>
            )}

            <div className="p-6 flex-1 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#e5b85c] block mb-1">
                  Prochaine Soirée Club
                </span>
                <h3 className="text-xl font-black text-white mb-2">
                  {upcomingEvent.name}
                </h3>
                <div className="flex items-center gap-4 text-xs text-gray-300 mb-4">
                  <span className="flex items-center gap-1.5 capitalize">
                    <Calendar className="w-3.5 h-3.5 text-[#e5b85c]" />
                    {formatFrenchDate(upcomingEvent.event_date)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#e5b85c]" />
                    {formatFrenchTime(upcomingEvent.start_time)} → {formatFrenchTime(upcomingEvent.end_time)}
                  </span>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Cette affiche est automatiquement intégrée sur votre lien d&apos;inscription et sur le pass QR de vos invités avec la mention &quot;Entrée 100% Gratuite&quot;.
                </p>
              </div>

              <div className="mt-4 pt-4 border-t border-[#232738]/60 flex items-center justify-between">
                <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Inscriptions ouvertes
                </span>
                <button
                  onClick={shareViaWhatsApp}
                  className="px-3.5 py-1.5 rounded-xl bg-[#1c202d] hover:bg-[#252b3d] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>Inviter pour cette soirée</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CLASSEMENT EN DIRECT ENTRE RP (LEADERBOARD) */}
      <div className="bg-[#0f1118] border border-[#232738] rounded-3xl p-6 sm:p-7 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#1c202d] border border-[#2d3348] flex items-center justify-center">
              <Trophy className="w-4 h-4 text-[#e5b85c]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Classement Général des RP
              </h2>
              <p className="text-xs text-gray-400">
                Classé uniquement par entrées réelles validées au scan
              </p>
            </div>
          </div>

          <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            En direct
          </span>
        </div>

        <div className="space-y-2 pt-2">
          {leaderboard.map((item) => {
            const isMe = item.id === promoter.id;

            return (
              <div
                key={item.id}
                className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                  isMe
                    ? 'bg-gradient-to-r from-[#1c1f2e] via-[#23273a] to-[#1c1f2e] border-[#e5b85c] shadow-lg ring-1 ring-[#e5b85c]/50'
                    : 'bg-[#12141c] border-[#202434] hover:border-[#2d3246]'
                }`}
              >
                {/* Rang + Profil */}
                <div className="flex items-center gap-3.5">
                  <span
                    className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs ${
                      item.rank === 1
                        ? 'bg-[#e5b85c] text-black shadow-md'
                        : item.rank === 2
                        ? 'bg-gray-300 text-black shadow-md'
                        : item.rank === 3
                        ? 'bg-amber-700 text-white shadow-md'
                        : 'bg-[#1b1e2a] text-gray-400'
                    }`}
                  >
                    #{item.rank}
                  </span>

                  {/* Avatar */}
                  {item.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.avatar_url}
                      alt={`${item.first_name} ${item.last_name}`}
                      className="w-9 h-9 rounded-xl object-cover border border-[#2b3145]"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-xl bg-[#1b1e2a] border border-[#2b3145] flex items-center justify-center text-xs font-bold text-gray-300">
                      {item.first_name.charAt(0)}{item.last_name.charAt(0)}
                    </div>
                  )}

                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`font-bold text-sm ${isMe ? 'text-[#e5b85c]' : 'text-white'}`}>
                        {item.first_name} {item.last_name}
                      </span>
                      {isMe && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-[#e5b85c] text-black">
                          VOUS
                        </span>
                      )}
                    </div>
                    {item.instagram_handle && (
                      <span className="text-[11px] text-gray-500">
                        @{item.instagram_handle}
                      </span>
                    )}
                  </div>
                </div>

                {/* Score & Points */}
                <div className="text-right">
                  <div className="flex items-baseline justify-end gap-1.5">
                    <span className={`text-lg font-black ${isMe ? 'text-[#e5b85c]' : 'text-white'}`}>
                      {item.entries_count}
                    </span>
                    <span className="text-[10px] uppercase font-bold text-gray-400">
                      {item.entries_count > 1 ? 'entrées' : 'entrée'}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-500">
                    {item.registrations_count} pass ({item.attendance_rate}%)
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL PERSONNALISER MON PROFIL RP */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0f1118] border border-[#262c3e] rounded-3xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-[#232738] mb-5">
              <div>
                <h3 className="text-lg font-black text-white">
                  Personnaliser mon profil RP
                </h3>
                <p className="text-xs text-gray-400">
                  Ces informations s&apos;affichent sur votre lien public d&apos;invitation
                </p>
              </div>
              <button
                onClick={() => setEditModalOpen(false)}
                className="p-1.5 rounded-xl bg-[#181b26] text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {profileMsg && (
              <div
                className={`mb-4 p-3 rounded-xl text-xs flex items-center gap-2 ${
                  profileMsg.type === 'success'
                    ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                    : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
                }`}
              >
                {profileMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{profileMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4">
              {/* Preview Avatar Actuel */}
              <div className="flex items-center gap-4 p-3.5 rounded-2xl bg-[#141724] border border-[#232738]">
                {editAvatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={editAvatarUrl}
                    alt="Aperçu avatar"
                    className="w-14 h-14 rounded-2xl object-cover border-2 border-[#e5b85c] shadow"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-[#1c202d] border border-[#2b3145] flex items-center justify-center font-bold text-white text-lg">
                    {editFirstName.charAt(0)}{editLastName.charAt(0)}
                  </div>
                )}
                <div>
                  <p className="text-xs font-bold text-white">Aperçu en direct</p>
                  <p className="text-[11px] text-gray-400">Sélectionne un style ci-dessous ou colle un lien URL direct</p>
                </div>
              </div>

              {/* Sélecteur d'Avatar Enrichi */}
              <div>
                <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-2">
                  Choisir mon Avatar (Jeux Vidéo, Films, Animaux 3D, Club & Espace)
                </label>

                {/* Bouton d'import direct de photo perso */}
                <div className="mb-3">
                  <label className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-[#1b1e2c] hover:bg-[#252b3d] border border-dashed border-[#e5b85c]/60 rounded-xl text-xs text-[#e5b85c] font-bold cursor-pointer transition-all shadow group">
                    <Upload className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    <span>📁 Importer ma propre photo (PNG, JPG, WebP)</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarFileUpload}
                    />
                  </label>
                </div>

                {/* Filtres par Catégorie */}
                <div className="flex flex-wrap gap-1.5 mb-2.5">
                  <button
                    type="button"
                    onClick={() => setAvatarCategory('all')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      avatarCategory === 'all'
                        ? 'bg-[#e5b85c] text-black shadow'
                        : 'bg-[#181b26] text-gray-400 hover:text-white'
                    }`}
                  >
                    Tous ({AVATAR_CATALOG.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setAvatarCategory('club')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      avatarCategory === 'club'
                        ? 'bg-[#e5b85c] text-black shadow'
                        : 'bg-[#181b26] text-gray-400 hover:text-white'
                    }`}
                  >
                    ✨ Club & Espace
                  </button>
                  <button
                    type="button"
                    onClick={() => setAvatarCategory('gaming')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      avatarCategory === 'gaming'
                        ? 'bg-[#e5b85c] text-black shadow'
                        : 'bg-[#181b26] text-gray-400 hover:text-white'
                    }`}
                  >
                    🎮 Jeux Vidéo
                  </button>
                  <button
                    type="button"
                    onClick={() => setAvatarCategory('cinema')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      avatarCategory === 'cinema'
                        ? 'bg-[#e5b85c] text-black shadow'
                        : 'bg-[#181b26] text-gray-400 hover:text-white'
                    }`}
                  >
                    🎬 Films Légendaires
                  </button>
                  <button
                    type="button"
                    onClick={() => setAvatarCategory('animals')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      avatarCategory === 'animals'
                        ? 'bg-[#e5b85c] text-black shadow'
                        : 'bg-[#181b26] text-gray-400 hover:text-white'
                    }`}
                  >
                    🦁 Animaux 3D
                  </button>
                </div>

                {/* Grille d'Avatars */}
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-48 overflow-y-auto p-1.5 bg-[#0b0c12] rounded-xl border border-[#232738]">
                  {AVATAR_CATALOG.filter(
                    (item) => avatarCategory === 'all' || item.category === avatarCategory
                  ).map((item) => (
                    <button
                      key={item.name}
                      type="button"
                      title={item.name}
                      onClick={() => setEditAvatarUrl(item.url)}
                      className={`relative rounded-xl overflow-hidden border-2 transition-all p-0.5 cursor-pointer aspect-square group ${
                        editAvatarUrl === item.url
                          ? 'border-[#e5b85c] ring-2 ring-[#e5b85c]/50 scale-105 shadow-lg'
                          : 'border-transparent hover:border-gray-500 opacity-75 hover:opacity-100'
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.url}
                        alt={item.name}
                        className="w-full h-full object-cover rounded-lg"
                      />
                      <span className="absolute inset-x-0 bottom-0 bg-black/80 text-[8px] font-bold text-white text-center py-0.5 px-0.5 truncate group-hover:block hidden">
                        {item.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* URL Avatar Personnalisée */}
              <div>
                <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                  Ou lien photo URL direct (Optionnel)
                </label>
                <input
                  type="text"
                  value={editAvatarUrl}
                  onChange={(e) => setEditAvatarUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3.5 py-2.5 bg-[#141722] border border-[#232738] rounded-xl text-white text-xs placeholder-gray-500 focus:outline-none focus:border-[#e5b85c]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                    Prénom *
                  </label>
                  <input
                    type="text"
                    required
                    value={editFirstName}
                    onChange={(e) => setEditFirstName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#141722] border border-[#232738] rounded-xl text-white text-sm focus:outline-none focus:border-[#e5b85c]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                    Nom *
                  </label>
                  <input
                    type="text"
                    required
                    value={editLastName}
                    onChange={(e) => setEditLastName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#141722] border border-[#232738] rounded-xl text-white text-sm focus:outline-none focus:border-[#e5b85c]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                  Pseudo Instagram
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-xs">@</span>
                  <input
                    type="text"
                    value={editInstagram}
                    onChange={(e) => setEditInstagram(e.target.value)}
                    placeholder="mon_pseudo"
                    className="w-full pl-8 pr-3.5 py-2.5 bg-[#141722] border border-[#232738] rounded-xl text-white text-sm focus:outline-none focus:border-[#e5b85c]"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-400 hover:text-white"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#e5b85c] to-[#d4a037] text-black font-extrabold text-xs uppercase tracking-wider hover:brightness-110 cursor-pointer disabled:opacity-50"
                >
                  {savingProfile ? 'Enregistrement...' : 'Enregistrer mon profil'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
