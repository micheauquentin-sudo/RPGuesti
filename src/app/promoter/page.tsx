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
  Upload,
  Crown,
  Zap,
  Bell,
  Eye,
  ArrowRight,
  Search,
  LayoutDashboard,
  BookOpen
} from 'lucide-react';
import { InstagramIcon } from '@/components/ui/InstagramIcon';
import { formatFrenchDate, formatFrenchTime } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { getPromoterRank } from '@/lib/promoter-ranks';
import EventShareModal from '@/components/promoter/EventShareModal';
import PromoterGuideTab from '@/components/promoter/PromoterGuideTab';
import confetti from 'canvas-confetti';

export interface AvatarItem {
  name: string;
  category: 'club' | 'gaming' | 'cinema' | 'animals';
  url: string;
}

export const AVATAR_CATALOG: AvatarItem[] = [
  // PERSONNAGES 3D CARTOON
  {
    name: 'Le Boss VIP',
    category: 'club',
    url: '/avatars/avatar-boss.jpg',
  },
  {
    name: 'La Reine VIP',
    category: 'club',
    url: '/avatars/avatar-queen.jpg',
  },
  {
    name: 'Le DJ Club Star',
    category: 'club',
    url: '/avatars/avatar-dj.jpg',
  },
  {
    name: 'Le Bad Boy Stylé',
    category: 'club',
    url: '/avatars/avatar-badboy.jpg',
  },
  {
    name: 'La Gameuse Cyberpunk',
    category: 'club',
    url: '/avatars/avatar-gamer.jpg',
  },
  {
    name: 'L’Ambianceur Festif',
    category: 'club',
    url: '/avatars/avatar-party.jpg',
  },

  // ANIMAUX 3D CARTOON
  {
    name: 'Le Lion Roi VIP',
    category: 'animals',
    url: '/avatars/avatar-lion.jpg',
  },
  {
    name: 'Le Tigre Nightlife',
    category: 'animals',
    url: '/avatars/avatar-tiger.jpg',
  },
  {
    name: 'Le Bouledogue Swag',
    category: 'animals',
    url: '/avatars/avatar-bulldog.jpg',
  },
  {
    name: 'La Panthère Élégante',
    category: 'animals',
    url: '/avatars/avatar-panther.jpg',
  },
  {
    name: 'Le Chimpanzé Cool',
    category: 'animals',
    url: '/avatars/avatar-chimp.jpg',
  },

  // THÈMES CLUB & COSMIQUES 3D CARTOON
  {
    name: 'Boule à Facettes DJ',
    category: 'club',
    url: '/avatars/avatar-disco.jpg',
  },
  {
    name: 'Planète Saturne Cosmique',
    category: 'club',
    url: '/avatars/avatar-saturn.jpg',
  },
];

interface PromoterData {
  id: string;
  first_name: string;
  last_name: string;
  instagram_handle: string | null;
  slug: string;
  avatar_url: string | null;
  views_count?: number;
}

interface LeaderboardItem {
  id: string;
  first_name: string;
  last_name: string;
  instagram_handle: string | null;
  slug: string;
  avatar_url: string | null;
  views_count?: number;
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

export interface EventGuestItem {
  id: string;
  guest_name: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  registered_at: string;
  is_scanned: boolean;
  scanned_at: string | null;
}

export default function PromoterDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [promoter, setPromoter] = useState<PromoterData | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [upcomingEvent, setUpcomingEvent] = useState<UpcomingEvent | null>(null);
  const [eventGuests, setEventGuests] = useState<EventGuestItem[]>([]);
  const [guestFilter, setGuestFilter] = useState<'all' | 'scanned' | 'pending'>('all');
  const [guestSearch, setGuestSearch] = useState('');

  // Onglet Actif (Dashboard Opérationnel vs Guide & Découverte Produit)
  const [activeTab, setActiveTab] = useState<'dashboard' | 'guide'>('dashboard');

  // Modal Partage Soirée Multi-Canaux (WhatsApp, SMS, Insta, Natif, Copie)
  const [eventShareModalOpen, setEventShareModalOpen] = useState(false);

  // Ping Entrée en Direct (Temps Réel)
  const [realtimeToast, setRealtimeToast] = useState<{ id: string; message: string; time: string } | null>(null);
  const [liveEntriesDelta, setLiveEntriesDelta] = useState(0);

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
      setEventGuests(data.eventGuests || []);

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

  // Synchronisation en direct des entrées (Ping Entrée RP)
  useEffect(() => {
    if (!promoter?.id) return;
    const supabase = createClient();

    const channel = supabase
      .channel(`promoter-entries-channel-${promoter.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'entries',
          filter: `promoter_id=eq.${promoter.id}`,
        },
        () => {
          if (navigator.vibrate) navigator.vibrate([120, 80, 120]);

          try {
            const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.frequency.setValueAtTime(523.25, audioCtx.currentTime);
            osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.1);
            osc.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.2);
            gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.5);
          } catch {
            // Ignorer si audio non autorisé
          }

          try {
            confetti({
              particleCount: 50,
              spread: 60,
              origin: { y: 0.3 },
              colors: ['#e5b85c', '#ffffff', '#10b981'],
            });
          } catch {
            // Non bloquant
          }

          const nowTime = new Intl.DateTimeFormat('fr-FR', {
            hour: '2-digit',
            minute: '2-digit',
          }).format(new Date());

          setRealtimeToast({
            id: Math.random().toString(),
            message: "🎉 Un de vos invités vient d'entrer à l'ASTRA ! +1 point au classement",
            time: nowTime,
          });

          setLiveEntriesDelta((prev) => prev + 1);
          loadData();

          setTimeout(() => {
            setRealtimeToast(null);
          }, 6000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [promoter?.id]);

  const currentPromoterRank = leaderboard.find((item) => item.id === promoter?.id);
  const personalEntries = (currentPromoterRank?.entries_count || 0) + liveEntriesDelta;
  const personalRegs = currentPromoterRank?.registrations_count || 0;
  const personalRate = personalRegs > 0 ? Math.min(100, Math.round((personalEntries / personalRegs) * 100)) : 0;
  const personalRank = currentPromoterRank?.rank || 1;
  const rankInfo = getPromoterRank(personalEntries);

  const promoterViews = promoter?.views_count || 0;
  const clickToRegRate = promoterViews > 0
    ? Math.min(100, Math.round((personalRegs / promoterViews) * 100))
    : (personalRegs > 0 ? 100 : 0);
  const clickToEntryRate = promoterViews > 0
    ? Math.min(100, Math.round((personalEntries / promoterViews) * 100))
    : (personalEntries > 0 ? 100 : 0);

  const filteredGuests = eventGuests.filter((g) => {
    if (guestFilter === 'scanned' && !g.is_scanned) return false;
    if (guestFilter === 'pending' && g.is_scanned) return false;
    if (guestSearch) {
      const q = guestSearch.toLowerCase();
      return g.guest_name.toLowerCase().includes(q) || (g.phone && g.phone.includes(q));
    }
    return true;
  });

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
      {/* ALERTE TEMPS RÉEL "PING ENTRÉE" */}
      {realtimeToast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 max-w-md w-[92%] p-4 rounded-2xl bg-gradient-to-r from-[#e5b85c] via-[#d4a037] to-[#e5b85c] text-black font-black text-sm shadow-[0_10px_30px_rgba(229,184,92,0.5)] border-2 border-white flex items-center justify-between gap-3 animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">🎉</span>
            <div>
              <p className="leading-tight">{realtimeToast.message}</p>
              <span className="text-[10px] uppercase font-bold text-black/70">Validé à la porte à {realtimeToast.time}</span>
            </div>
          </div>
          <button onClick={() => setRealtimeToast(null)} className="p-1 hover:bg-black/10 rounded-lg cursor-pointer">
            <X className="w-4 h-4 text-black" />
          </button>
        </div>
      )}

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
                <span
                  className="absolute -bottom-1 -right-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase shadow tracking-wider"
                  style={{ backgroundColor: rankInfo.currentRank.color, color: '#000000' }}
                >
                  {rankInfo.currentRank.badge}
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

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setActiveTab(activeTab === 'guide' ? 'dashboard' : 'guide')}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow ${
                activeTab === 'guide'
                  ? 'bg-gradient-to-r from-[#e5b85c] to-[#d4a037] text-black border-[#e5b85c]'
                  : 'bg-[#181b26] hover:bg-[#222636] border-[#2d3246] text-[#e5b85c]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{activeTab === 'guide' ? 'Tableau de bord' : 'Guide & Astuces RP'}</span>
            </button>

            <button
              onClick={() => setEditModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#181b26] hover:bg-[#222636] border border-[#2d3246] text-white text-xs font-semibold transition-all cursor-pointer shadow"
            >
              <Edit3 className="w-3.5 h-3.5 text-[#e5b85c]" />
              <span>Personnaliser ma page</span>
            </button>
          </div>
        </div>
      </div>

      {/* NAVIGATION ONGLETS RP (Tableau de bord vs Guide & Fonctionnalités) */}
      <div className="flex items-center p-1.5 bg-[#0f1118] border border-[#232738] rounded-2xl gap-2 shadow-xl">
        <button
          type="button"
          onClick={() => setActiveTab('dashboard')}
          className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer ${
            activeTab === 'dashboard'
              ? 'bg-gradient-to-r from-[#e5b85c] to-[#d4a037] text-black shadow-lg shadow-[#e5b85c]/20'
              : 'text-gray-400 hover:text-white hover:bg-[#151824]'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Mon Tableau de Bord</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
              activeTab === 'dashboard' ? 'bg-black text-[#e5b85c]' : 'bg-[#1e2333] text-gray-400'
            }`}
          >
            Live
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('guide')}
          className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer ${
            activeTab === 'guide'
              ? 'bg-gradient-to-r from-[#e5b85c] to-[#d4a037] text-black shadow-lg shadow-[#e5b85c]/20'
              : 'text-gray-400 hover:text-white hover:bg-[#151824]'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Guide &amp; Fonctionnalités</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
              activeTab === 'guide'
                ? 'bg-black text-[#e5b85c]'
                : 'bg-[#e5b85c]/20 text-[#e5b85c] border border-[#e5b85c]/40'
            }`}
          >
            Découvrir
          </span>
        </button>
      </div>

      {activeTab === 'guide' ? (
        <PromoterGuideTab
          promoter={promoter}
          promoterPublicUrl={promoterPublicUrl}
          onOpenEventShare={() => setEventShareModalOpen(true)}
          onOpenEditProfile={() => setEditModalOpen(true)}
          onShareWhatsApp={shareViaWhatsApp}
          onSwitchToDashboard={() => setActiveTab('dashboard')}
        />
      ) : (
        <div className="space-y-6">
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

      {/* ENTONNOIR DE PERFORMANCE RP (FUNNEL DE CONVERSION) */}
      <div className="bg-[#0f1118] border border-[#232738] rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#e5b85c]/10 border border-[#e5b85c]/30 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-[#e5b85c]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Entonnoir de Conversion RP</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Live Analytics
                </span>
              </h2>
              <p className="text-xs text-gray-400">
                Suivez l&apos;efficacité réelle de votre lien personnel, du premier clic jusqu&apos;à l&apos;entrée en boîte
              </p>
            </div>
          </div>

          <div className="text-left sm:text-right bg-[#141724] px-3.5 py-1.5 rounded-xl border border-[#232738]">
            <span className="text-[10px] uppercase font-bold text-gray-400 block">Efficacité Globale</span>
            <p className="text-xs font-black text-[#e5b85c]">
              {clickToEntryRate}% des clics deviennent des entrées
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          {/* Étape 1 : Visites / Clics */}
          <div className="p-4 rounded-2xl bg-[#141724] border border-[#232738] flex flex-col justify-between relative overflow-hidden group">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-blue-400" />
                  1. Clics &amp; Visites
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-bold">Étape 1</span>
              </div>
              <p className="text-3xl font-black text-white">{promoterViews}</p>
              <p className="text-[10px] text-gray-400 mt-1">Personnes ayant ouvert votre lien</p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#232738]/60 flex items-center justify-between text-xs">
              <span className="text-gray-400">Taux de génération</span>
              <span className="font-bold text-blue-400">{clickToRegRate}% convertis</span>
            </div>
          </div>

          {/* Étape 2 : Inscriptions / Pass */}
          <div className="p-4 rounded-2xl bg-[#141724] border border-[#232738] flex flex-col justify-between relative overflow-hidden group">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-purple-400" />
                  2. Pass Inscrits
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 font-bold">Étape 2</span>
              </div>
              <p className="text-3xl font-black text-white">{personalRegs}</p>
              <p className="text-[10px] text-gray-400 mt-1">Pass QR nominatifs téléchargés</p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#232738]/60 flex items-center justify-between text-xs">
              <span className="text-gray-400">Taux de venue</span>
              <span className="font-bold text-purple-400">{personalRate}% présents</span>
            </div>
          </div>

          {/* Étape 3 : Entrées Réelles */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-[#1c1912] via-[#141724] to-[#141724] border border-[#e5b85c]/30 flex flex-col justify-between relative overflow-hidden group">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-[#e5b85c] uppercase tracking-wider flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5 text-[#e5b85c]" />
                  3. Entrées Réelles
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#e5b85c]/20 text-[#e5b85c] font-black">Validé</span>
              </div>
              <p className="text-3xl font-black text-[#e5b85c]">{personalEntries}</p>
              <p className="text-[10px] text-gray-300 mt-1">Pass scannés à l&apos;entrée du club</p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#e5b85c]/20 flex items-center justify-between text-xs">
              <span className="text-gray-400">Points Concours</span>
              <span className="font-extrabold text-[#e5b85c]">+{personalEntries} pts</span>
            </div>
          </div>
        </div>
      </div>

      {/* JAUGE DE PROGRESSION DU RANG RP */}
      <div className="bg-[#0f1118] border border-[#232738] rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3.5">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl shadow-lg shrink-0"
              style={{
                backgroundColor: `${rankInfo.currentRank.color}20`,
                border: `1.5px solid ${rankInfo.currentRank.color}60`,
              }}
            >
              {rankInfo.currentRank.iconName === 'Crown'
                ? '👑'
                : rankInfo.currentRank.iconName === 'Trophy'
                ? '💎'
                : rankInfo.currentRank.iconName === 'Flame'
                ? '🥇'
                : rankInfo.currentRank.iconName === 'Sparkles'
                ? '🥈'
                : '🥉'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] uppercase font-extrabold tracking-wider text-gray-400">Palier de Prestige</span>
                <span
                  className="px-2.5 py-0.5 rounded-full text-xs font-black tracking-wider"
                  style={{
                    backgroundColor: `${rankInfo.currentRank.color}25`,
                    color: rankInfo.currentRank.color,
                    border: `1px solid ${rankInfo.currentRank.color}60`,
                  }}
                >
                  {rankInfo.currentRank.name}
                </span>
              </div>
              <p className="text-xs text-gray-300 font-medium mt-0.5">
                ★ Avantage débloqué : {rankInfo.currentRank.perk}
              </p>
            </div>
          </div>

          {rankInfo.nextRank && (
            <div className="text-left sm:text-right w-full sm:w-auto">
              <span className="text-[11px] font-bold text-gray-400">
                Prochain échelon : <strong className="text-white">{rankInfo.nextRank.name}</strong>
              </span>
              <p className="text-xs font-black text-[#e5b85c]">
                Plus que {rankInfo.entriesToNext} {rankInfo.entriesToNext > 1 ? 'entrées' : 'entrée'} !
              </p>
            </div>
          )}
        </div>

        {/* Barre de progression */}
        <div className="w-full bg-[#161924] rounded-full h-3.5 p-0.5 border border-[#232738] overflow-hidden relative">
          <div
            className="h-full rounded-full transition-all duration-700 bg-gradient-to-r from-[#e5b85c] via-[#f59e0b] to-[#10b981]"
            style={{ width: `${rankInfo.progressPercent}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-2 text-[10px] text-gray-500 font-semibold">
          <span>{rankInfo.currentRank.minEntries} entrées ({rankInfo.currentRank.name})</span>
          <span>{rankInfo.progressPercent}% vers l&apos;échelon suivant</span>
          {rankInfo.nextRank ? (
            <span>{rankInfo.nextRank.minEntries} entrées ({rankInfo.nextRank.name})</span>
          ) : (
            <span className="text-emerald-400 font-bold">Rang Légende Atteint ★</span>
          )}
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

        {/* BANNIÈRE PHARE : INVITATION MULTI-CANAUX (WhatsApp, SMS, Réseaux, Copier) */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#e5b85c]/25 via-[#1e1910] to-[#e5b85c]/10 border-2 border-[#e5b85c] flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3.5 text-center sm:text-left">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#e5b85c] to-[#c59837] flex items-center justify-center text-black shadow-lg shrink-0">
              <Share2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <h3 className="text-base font-black text-white">
                  Inviter mes Amis (Multi-Canaux)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-black text-[#e5b85c] border border-[#e5b85c]/50">
                  WhatsApp • SMS • Insta
                </span>
              </div>
              <p className="text-xs text-gray-300 mt-0.5">
                Choisissez précisément où envoyer votre invitation avec le message officiel pré-rempli et votre lien RP.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setEventShareModalOpen(true)}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#e5b85c] to-[#d4a037] hover:from-[#f0c773] hover:to-[#e5b85c] text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl active:scale-98 transition-all cursor-pointer shrink-0"
          >
            <Share2 className="w-4 h-4 text-black" />
            <span>Choisir où inviter</span>
          </button>
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

        {/* Boutons Réseaux Sociaux & Partage Direct */}
        <div className="space-y-3">
          {/* Bouton WhatsApp Grand Format (Recommandé & Prioritaire) */}
          <button
            onClick={shareViaWhatsApp}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-black font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all shadow-lg shadow-emerald-950/40 cursor-pointer active:scale-98"
          >
            <MessageSquare className="w-5 h-5 text-black fill-current" />
            <span>Envoyer sur WhatsApp (Message d&apos;invitation pré-rempli)</span>
          </button>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  onClick={() => setEventShareModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#e5b85c] to-[#d4a037] hover:brightness-110 text-black text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Inviter pour cette soirée</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 👥 SUIVI DES INVITÉS EN DIRECT (QUI EST DÉJÀ ENTRÉ ?) */}
      {upcomingEvent && (
        <div className="bg-[#0f1118] border border-[#232738] rounded-3xl p-5 sm:p-7 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#e5b85c]/10 border border-[#e5b85c]/30 flex items-center justify-center">
                <Users className="w-5 h-5 text-[#e5b85c]" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Mes Invités de la Soirée</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Live Entrées
                  </span>
                </h2>
                <p className="text-xs text-gray-400">
                  Suivez en temps réel qui est déjà entré à l&apos;ASTRA et relancez vos retardataires
                </p>
              </div>
            </div>

            {/* Compteur Entrées / Inscrits */}
            <div className="flex items-center gap-2">
              <div className="px-3 py-1.5 bg-[#141724] rounded-xl border border-[#232738] text-xs">
                <span className="text-gray-400">Entrées validées : </span>
                <strong className="text-emerald-400 font-bold">
                  {eventGuests.filter((g) => g.is_scanned).length}
                </strong>
                <span className="text-gray-500"> / {eventGuests.length}</span>
              </div>
            </div>
          </div>

          {/* Filtres & Recherche */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
            <div className="flex items-center gap-1.5 p-1 bg-[#121522] rounded-xl border border-[#232738] text-xs">
              <button
                type="button"
                onClick={() => setGuestFilter('all')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  guestFilter === 'all'
                    ? 'bg-[#e5b85c] text-black shadow'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Tous ({eventGuests.length})
              </button>
              <button
                type="button"
                onClick={() => setGuestFilter('scanned')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                  guestFilter === 'scanned'
                    ? 'bg-emerald-500 text-black shadow'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                <span>Entrés ({eventGuests.filter((g) => g.is_scanned).length})</span>
              </button>
              <button
                type="button"
                onClick={() => setGuestFilter('pending')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                  guestFilter === 'pending'
                    ? 'bg-gray-700 text-white shadow'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-gray-400 inline-block" />
                <span>En attente ({eventGuests.filter((g) => !g.is_scanned).length})</span>
              </button>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={guestSearch}
                onChange={(e) => setGuestSearch(e.target.value)}
                placeholder="Rechercher un invité..."
                className="w-full sm:w-56 pl-8 pr-3 py-1.5 bg-[#121522] border border-[#232738] rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#e5b85c]"
              />
            </div>
          </div>

          {/* Liste des Invités */}
          {filteredGuests.length === 0 ? (
            <div className="p-8 text-center bg-[#121522]/50 border border-[#202538] rounded-2xl">
              <Users className="w-8 h-8 text-gray-600 mx-auto mb-2" />
              <p className="text-xs font-semibold text-gray-300">
                {eventGuests.length === 0
                  ? 'Aucun invité inscrit pour le moment'
                  : 'Aucun invité ne correspond à ce filtre'}
              </p>
              {eventGuests.length === 0 && (
                <p className="text-[11px] text-gray-500 mt-1">
                  Partagez votre lien pour commencer à remplir votre guestlist et marquer des points !
                </p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-96 overflow-y-auto pr-1">
              {filteredGuests.map((g) => {
                const scanTime = g.scanned_at
                  ? new Intl.DateTimeFormat('fr-FR', {
                      hour: '2-digit',
                      minute: '2-digit',
                      timeZone: 'Europe/Paris',
                    }).format(new Date(g.scanned_at))
                  : null;

                const whatsappPingText = encodeURIComponent(
                  `Salut ${g.first_name} ! Tu viens à l'ASTRA ce soir ? Ton entrée gratuite avec mon lien RP est prête, dis-moi quand tu arrives ! 🔥`
                );

                return (
                  <div
                    key={g.id}
                    className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-2 ${
                      g.is_scanned
                        ? 'bg-gradient-to-r from-emerald-950/20 to-[#121824] border-emerald-500/30'
                        : 'bg-[#121522] border-[#22273a]'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white truncate block">
                          {g.guest_name}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 mt-1">
                        {g.is_scanned ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Entré{scanTime ? ` à ${scanTime}` : ''}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-gray-400 bg-gray-500/10 px-2 py-0.5 rounded-md">
                            <Clock className="w-3 h-3" />
                            <span>En attente</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {!g.is_scanned && (
                      <a
                        href={`https://wa.me/?text=${whatsappPingText}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1.5 rounded-xl bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/30 text-emerald-400 text-[11px] font-semibold flex items-center gap-1 transition-colors shrink-0"
                        title="Relancer sur WhatsApp"
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span className="hidden sm:inline">Relancer</span>
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}
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
    </div>
  )}

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
                    🎭 Personnages Cartoons
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
                    🦁 Animaux Cartoons
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
                    ✨ Club & Saturne 3D
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

      {/* MODAL DE PARTAGE MULTI-CANAUX */}
      {eventShareModalOpen && promoter && (
        <EventShareModal
          isOpen={eventShareModalOpen}
          onClose={() => setEventShareModalOpen(false)}
          promoter={promoter}
          upcomingEvent={upcomingEvent}
          promoterPublicUrl={promoterPublicUrl}
        />
      )}
    </div>
  );
}
