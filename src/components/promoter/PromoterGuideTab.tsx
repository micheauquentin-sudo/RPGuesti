'use client';

import { useState } from 'react';
import {
  Sparkles,
  Share2,
  Smartphone,
  ShieldCheck,
  Trophy,
  Users,
  QrCode,
  Flame,
  Award,
  Crown,
  MessageSquare,
  CheckCircle2,
  ArrowRight,
  Clock,
  HelpCircle,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Star,
  Copy,
  Check,
  Zap,
  LayoutDashboard,
  Eye,
  TrendingUp,
  ExternalLink
} from 'lucide-react';
import { InstagramIcon } from '@/components/ui/InstagramIcon';
import { PROMOTER_RANKS } from '@/lib/promoter-ranks';

interface PromoterGuideTabProps {
  promoter: {
    first_name: string;
    last_name: string;
    slug: string;
    avatar_url: string | null;
  };
  promoterPublicUrl: string;
  onOpenStoryModal: () => void;
  onOpenEditProfile: () => void;
  onShareWhatsApp: () => void;
  onSwitchToDashboard: () => void;
}

export default function PromoterGuideTab({
  promoter,
  promoterPublicUrl,
  onOpenStoryModal,
  onOpenEditProfile,
  onShareWhatsApp,
  onSwitchToDashboard,
}: PromoterGuideTabProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const handleCopy = () => {
    if (!promoterPublicUrl) return;
    navigator.clipboard.writeText(promoterPublicUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const toggleFaq = (idx: number) => {
    setOpenFaq(openFaq === idx ? null : idx);
  };

  const faqs = [
    {
      q: "Pourquoi mes points n'augmentent pas dès qu'un ami s'inscrit ?",
      a: "C'est la règle d'or du club ! Une inscription seule ne rapporte pas de point. Vos points de concours augmentent uniquement quand votre invité se présente physiquement à l'ASTRA et que son QR code est scanné à l'entrée. Cela garantit un concours 100% transparent et équitable.",
    },
    {
      q: "Comment fonctionne le Pass Duo VIP (+1 garanti) ?",
      a: "Le système permet d'attribuer des Pass Duo VIP. Lorsque votre invité dispose d'un Pass Duo, son billet affiche un badge émeraude et le nom de son accompagnant. Lors du scan à l'entrée, la borne des videurs autorise automatiquement 2 personnes gratuites d'un coup.",
    },
    {
      q: "Que faire si mon invité n'a plus de 4G devant le club ?",
      a: "Aucun problème ! Sur sa page de billet, votre invité peut cliquer sur « Enregistrer le Billet Complet (Image HD) ». L'image sauvegardée dans sa galerie photo contient son QR code en ultra-haute résolution ainsi que la charte d'entrée. Elle reste 100% scannable sans aucune connexion internet.",
    },
    {
      q: "C'est quoi le Mode « Passage Porte Flash » ?",
      a: "C'est une technologie intégrée directement sur le billet de vos invités. En cliquant sur le bouton « Mode Passage Porte », l'écran passe en contraste maximal noir/blanc 300px avec une horloge live, et surtout, il empêche le smartphone de s'éteindre dans la file d'attente (technologie Web Screen Wake Lock). Idéal pour passer la porte en 2 secondes !",
    },
    {
      q: "Comment mes invités peuvent-ils garder leur pass sous la main ?",
      a: "Ils peuvent cliquer sur « Épingler à mon Écran d'Accueil ». Une modale leur explique comment ajouter l'icône du billet directement sur leur écran d'accueil d'iPhone (Safari) ou d'Android (Chrome), comme une véritable application !",
    },
    {
      q: "Comment personnaliser mon avatar et mon lien public ?",
      a: "Rendez-vous dans l'onglet « Tableau de Bord » et cliquez sur « Personnaliser ma page ». Vous pouvez choisir parmi nos avatars 3D exclusifs (Le Boss VIP, Le DJ Star, La Panthère, etc.) ou importer directement votre propre photo.",
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-300">
      {/* HERO BANNER : BIENVENUE DANS L'ÉCOSYSTÈME RP ASTRA */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1c1a14] via-[#12141f] to-[#0c0d14] border-2 border-[#e5b85c]/40 p-6 sm:p-9 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#e5b85c]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#e5b85c]/20 border border-[#e5b85c]/50 text-[#e5b85c] text-xs font-black uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Guide Officiel &amp; Découverte Produit</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black text-white leading-tight">
            Maîtrisez tous les super-pouvoirs de votre{' '}
            <span className="bg-gradient-to-r from-[#e5b85c] via-[#f3d489] to-[#d4a037] bg-clip-text text-transparent">
              Espace RP ASTRA
            </span>
          </h1>

          <p className="text-xs sm:text-sm text-gray-300 leading-relaxed font-normal">
            Bienvenue dans votre quartier général. Cette plateforme a été conçue sur-mesure pour vous permettre d&apos;inviter vos amis en un éclair, de suivre vos entrées en temps réel, de convertir un maximum de pass et de grimper jusqu&apos;au rang de <strong>Légende ASTRA</strong>.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={onOpenStoryModal}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#e5b85c] to-[#d4a037] hover:brightness-110 text-black font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-[#e5b85c]/20 cursor-pointer active:scale-98 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Créer ma Story Instagram 9:16</span>
            </button>

            <button
              onClick={onSwitchToDashboard}
              className="px-4 py-2.5 rounded-xl bg-[#1c202d] hover:bg-[#252b3d] border border-[#2d3246] text-white font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer"
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-[#e5b85c]" />
              <span>Voir mon Tableau de Bord</span>
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 1 : LE PARCOURS GAGNANT EN 4 ÉTAPES */}
      <div className="bg-[#0f1118] border border-[#232738] rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-4 h-4 text-[#e5b85c]" />
            <span className="text-[11px] font-black uppercase tracking-widest text-[#e5b85c]">
              Circuit Gagnant
            </span>
          </div>
          <h2 className="text-xl font-black text-white">Comment ça marche de A à Z ?</h2>
          <p className="text-xs text-gray-400">
            Un parcours ultra-fluide pour vous et vos invités, du premier clic jusqu&apos;à l&apos;entrée au club.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Étape 1 */}
          <div className="p-5 rounded-2xl bg-[#141724] border border-[#232738] relative flex flex-col justify-between group hover:border-[#e5b85c]/50 transition-all">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="w-8 h-8 rounded-xl bg-[#e5b85c]/20 border border-[#e5b85c]/40 text-[#e5b85c] font-black text-sm flex items-center justify-center">
                  1
                </span>
                <Share2 className="w-4 h-4 text-gray-500 group-hover:text-[#e5b85c] transition-colors" />
              </div>
              <h3 className="text-sm font-bold text-white">Tu partages ton lien RP</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Poste ton affiche officielle en <strong>Story Instagram</strong> avec le sticker de lien, ou envoie ton invitation directe en 1-clic sur <strong>WhatsApp</strong>.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#232738]/60 text-[10px] text-[#e5b85c] font-bold">
              ★ Format 9:16 prêt à l&apos;emploi
            </div>
          </div>

          {/* Étape 2 */}
          <div className="p-5 rounded-2xl bg-[#141724] border border-[#232738] relative flex flex-col justify-between group hover:border-purple-500/50 transition-all">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-400 font-black text-sm flex items-center justify-center">
                  2
                </span>
                <Smartphone className="w-4 h-4 text-gray-500 group-hover:text-purple-400 transition-colors" />
              </div>
              <h3 className="text-sm font-bold text-white">Tes invités réservent en 3s</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Formulaire éclair sans mot de passe. Ils découvrent l&apos;affiche de la soirée, les consignes dress code et obtiennent leur <strong>pass 100% gratuit</strong>.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#232738]/60 text-[10px] text-purple-400 font-bold">
              ★ Aucun compte à créer
            </div>
          </div>

          {/* Étape 3 */}
          <div className="p-5 rounded-2xl bg-[#141724] border border-[#232738] relative flex flex-col justify-between group hover:border-blue-500/50 transition-all">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-500/40 text-blue-400 font-black text-sm flex items-center justify-center">
                  3
                </span>
                <QrCode className="w-4 h-4 text-gray-500 group-hover:text-blue-400 transition-colors" />
              </div>
              <h3 className="text-sm font-bold text-white">Leur Billet Intelligent</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Billet avec <strong>Mode Porte Flash</strong> (anti-veille d&apos;écran), <strong>Raccourci Écran d&apos;accueil</strong> et <strong>Ticket HD scannable hors-ligne</strong> sans 4G.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#232738]/60 text-[10px] text-blue-400 font-bold">
              ★ Zéro galère dans la file
            </div>
          </div>

          {/* Étape 4 */}
          <div className="p-5 rounded-2xl bg-gradient-to-b from-[#141724] to-[#1c1912] border border-[#e5b85c]/40 relative flex flex-col justify-between group hover:border-[#e5b85c] transition-all">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="w-8 h-8 rounded-xl bg-[#e5b85c] text-black font-black text-sm flex items-center justify-center shadow">
                  4
                </span>
                <Trophy className="w-4 h-4 text-[#e5b85c]" />
              </div>
              <h3 className="text-sm font-bold text-[#e5b85c]">Scan Porte = +1 Point !</h3>
              <p className="text-xs text-gray-300 leading-relaxed">
                Dès que l&apos;invité entre dans le club, son pass est scanné : tu reçois une notification sonore &amp; confettis en direct, et <strong>+1 point</strong> au classement !
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#e5b85c]/30 text-[10px] text-[#e5b85c] font-black uppercase">
              ★ Notification Live &amp; Ping Entrée
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2 : LA BOÎTE À OUTILS COMPLÈTE DU RP */}
      <div className="space-y-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Star className="w-4 h-4 text-[#e5b85c]" />
            <span className="text-[11px] font-black uppercase tracking-widest text-[#e5b85c]">
              Super-Pouvoirs RP
            </span>
          </div>
          <h2 className="text-xl font-black text-white">Toutes vos fonctionnalités détaillées</h2>
          <p className="text-xs text-gray-400">
            Découvrez comment chaque outil a été taillé pour booster vos performances.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Outil 1 : Studio Story Instagram HD */}
          <div className="bg-[#0f1118] border border-[#232738] rounded-2xl p-5 space-y-3 flex flex-col justify-between hover:border-[#e5b85c]/40 transition-all">
            <div className="space-y-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-500/20 to-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <InstagramIcon className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white">Studio Story Instagram HD (9:16)</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Générez en 1-clic une affiche grand format 1080x1920 prête pour vos Stories, personnalisée avec votre nom, votre avatar, l&apos;affiche de la soirée et l&apos;emplacement parfait pour coller votre sticker de lien.
              </p>
            </div>
            <button
              onClick={onOpenStoryModal}
              className="w-full py-2 px-3 rounded-xl bg-[#1a1d2b] hover:bg-[#23273a] text-xs font-bold text-[#e5b85c] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Ouvrir le Studio Story</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Outil 2 : Mode Passage Porte Flash & Wake Lock */}
          <div className="bg-[#0f1118] border border-[#232738] rounded-2xl p-5 space-y-3 flex flex-col justify-between hover:border-[#e5b85c]/40 transition-all">
            <div className="space-y-2.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-[#e5b85c]">
                <QrCode className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white">Mode Passage Porte Flash</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Vos invités disposent d&apos;un bouton plein écran anti-veille (Web Screen Wake Lock). Leur téléphone reste allumé dans la file avec un QR code de 300px au contraste noir/blanc absolu et une trotteuse en direct certifiée.
              </p>
            </div>
            <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Intégré sur chaque billet public
            </span>
          </div>

          {/* Outil 3 : Suivi Invités en Direct & Relance WhatsApp */}
          <div className="bg-[#0f1118] border border-[#232738] rounded-2xl p-5 space-y-3 flex flex-col justify-between hover:border-[#e5b85c]/40 transition-all">
            <div className="space-y-2.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white">Suivi Direct &amp; Relance WhatsApp</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Consultez en direct qui parmi vos inscrits est déjà entré au club ou encore en attente. Un bouton 1-clic WhatsApp vous permet de relancer les retardataires avec un message pré-rempli pour convertir vos pass !
              </p>
            </div>
            <button
              onClick={onSwitchToDashboard}
              className="w-full py-2 px-3 rounded-xl bg-[#1a1d2b] hover:bg-[#23273a] text-xs font-bold text-emerald-400 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Accéder à mes invités</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Outil 4 : Système Pass Duo VIP (+1 Garanti) */}
          <div className="bg-[#0f1118] border border-[#232738] rounded-2xl p-5 space-y-3 flex flex-col justify-between hover:border-[#e5b85c]/40 transition-all">
            <div className="space-y-2.5">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white">Pass Duo VIP (+1 Garanti)</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Possibilité d&apos;offrir un pass duo avec accompagnant nominatif. Le billet affiche un sceau VIP vert émeraude et les agents à l&apos;entrée voient une notification animée autorisant 2 personnes d&apos;un coup.
              </p>
            </div>
            <span className="text-[11px] text-blue-400 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Détection automatique au scan
            </span>
          </div>

          {/* Outil 5 : Épinglage Écran d'Accueil 1-Clic */}
          <div className="bg-[#0f1118] border border-[#232738] rounded-2xl p-5 space-y-3 flex flex-col justify-between hover:border-[#e5b85c]/40 transition-all">
            <div className="space-y-2.5">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <Smartphone className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white">Raccourci Écran d&apos;Accueil</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Vos invités peuvent épingler leur billet sur l&apos;écran d&apos;accueil de leur smartphone en 2 clics avec guide illustré iPhone &amp; Android. Plus aucun risque d&apos;égarer le lien dans leurs messages !
              </p>
            </div>
            <span className="text-[11px] text-purple-400 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Sans installation d&apos;application
            </span>
          </div>

          {/* Outil 6 : Personnalisation Profil & Avatars 3D */}
          <div className="bg-[#0f1118] border border-[#232738] rounded-2xl p-5 space-y-3 flex flex-col justify-between hover:border-[#e5b85c]/40 transition-all">
            <div className="space-y-2.5">
              <div className="w-10 h-10 rounded-xl bg-[#e5b85c]/10 border border-[#e5b85c]/30 flex items-center justify-center text-[#e5b85c]">
                <Crown className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white">Personnalisation &amp; Avatars 3D</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Customisez votre page publique avec des avatars 3D exclusifs (Le Boss, Le DJ, La Panthère...) ou votre propre photo, votre pseudo Instagram et vos informations de contact.
              </p>
            </div>
            <button
              onClick={onOpenEditProfile}
              className="w-full py-2 px-3 rounded-xl bg-[#1a1d2b] hover:bg-[#23273a] text-xs font-bold text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Personnaliser ma page</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 3 : LES RANGS DE PRESTIGE & RÉCOMPENSES */}
      <div className="bg-[#0f1118] border border-[#232738] rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="w-4 h-4 text-[#e5b85c]" />
            <span className="text-[11px] font-black uppercase tracking-widest text-[#e5b85c]">
              Progression &amp; Récompenses
            </span>
          </div>
          <h2 className="text-xl font-black text-white">Les 5 Rangs de Prestige RP</h2>
          <p className="text-xs text-gray-400">
            Plus vous amenez de monde à l&apos;ASTRA, plus vous débloquez des avantages VIP exclusifs.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {PROMOTER_RANKS.map((rank) => (
            <div
              key={rank.id}
              className="p-4 rounded-2xl border flex flex-col justify-between space-y-3 transition-all"
              style={{
                backgroundColor: '#121522',
                borderColor: `${rank.color}40`,
              }}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider"
                    style={{
                      backgroundColor: `${rank.color}20`,
                      color: rank.color,
                      border: `1px solid ${rank.color}50`,
                    }}
                  >
                    {rank.badge}
                  </span>
                  <span className="text-xs font-black text-gray-400">
                    {rank.maxEntries ? `${rank.minEntries}-${rank.maxEntries}` : `${rank.minEntries}+`}
                  </span>
                </div>

                <h3 className="text-sm font-black text-white">{rank.name}</h3>

                <p className="text-[11px] text-gray-400 leading-relaxed">
                  {rank.perk}
                </p>
              </div>

              <div className="pt-2 border-t border-[#232738] text-[10px] text-gray-500 font-semibold">
                Entrées cumulées réelles
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 4 : LES 5 CONSEILS D'OR POUR FINIR TOP 1 */}
      <div className="bg-[#0f1118] border border-[#232738] rounded-3xl p-6 sm:p-8 shadow-xl space-y-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Lightbulb className="w-4 h-4 text-[#e5b85c]" />
            <span className="text-[11px] font-black uppercase tracking-widest text-[#e5b85c]">
              Stratégie d&apos;Élite
            </span>
          </div>
          <h2 className="text-xl font-black text-white">Les 5 Conseils d&apos;Or pour dominer le classement</h2>
          <p className="text-xs text-gray-400">
            Ce que font les meilleurs RP d&apos;Orléans pour générer plus de 50 entrées à chaque soirée.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-[#141724] border border-[#232738] flex items-start gap-3.5">
            <div className="w-8 h-8 rounded-xl bg-[#e5b85c]/15 text-[#e5b85c] font-black text-xs flex items-center justify-center shrink-0">
              01
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-white">Le Timing Story Idéal (18h-20h30)</h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                Postez votre affiche 9:16 entre 18h et 20h30 le vendredi et samedi soir. C&apos;est le pic où vos abonnés décident de leur soirée et cherchent où aller.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#141724] border border-[#232738] flex items-start gap-3.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 font-black text-xs flex items-center justify-center shrink-0">
              02
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-white">WhatsApp Ciblé plutôt que spam général</h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                Envoyez un message direct à vos 15 amis les plus fêtards en leur disant : <em>« J&apos;ai des entrées 100% gratuites pour l&apos;ASTRA ce soir, réserve ton pass ici »</em>. Le taux de venue est 5x supérieur aux stories !
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#141724] border border-[#232738] flex items-start gap-3.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/15 text-purple-400 font-black text-xs flex items-center justify-center shrink-0">
              03
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-white">Rappelez la consigne de porte</h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                Dites à vos invités d&apos;avoir leur pièce d&apos;identité physique originale (+18 ans) et de bien demander <strong>« UNE ENTRÉE ASTRA »</strong> à la caisse pour faire scanner leur QR code.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#141724] border border-[#232738] flex items-start gap-3.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-400 font-black text-xs flex items-center justify-center shrink-0">
              04
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-white">La relance à 00h30 (Le coup fatal)</h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                Ouvrez votre volet <strong>« Mes Invités de la Soirée »</strong> vers minuit et demi. Utilisez le bouton WhatsApp pour envoyer un message rapide aux retardataires avant la fin de l&apos;accès gratuit !
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 5 : FAQ INTERACTIVE */}
      <div className="bg-[#0f1118] border border-[#232738] rounded-3xl p-6 sm:p-8 shadow-xl space-y-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <HelpCircle className="w-4 h-4 text-[#e5b85c]" />
            <span className="text-[11px] font-black uppercase tracking-widest text-[#e5b85c]">
              Questions Fréquentes
            </span>
          </div>
          <h2 className="text-xl font-black text-white">F.A.Q &amp; Astuces RP</h2>
          <p className="text-xs text-gray-400">
            Toutes les réponses à vos questions pour exploiter la plateforme à 100%.
          </p>
        </div>

        <div className="space-y-2 pt-2">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-[#202538] bg-[#121522] overflow-hidden transition-all"
            >
              <button
                type="button"
                onClick={() => toggleFaq(idx)}
                className="w-full p-4 text-left flex items-center justify-between gap-3 text-xs sm:text-sm font-bold text-white hover:text-[#e5b85c] transition-colors cursor-pointer"
              >
                <span>{faq.q}</span>
                {openFaq === idx ? (
                  <ChevronUp className="w-4 h-4 text-[#e5b85c] shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-500 shrink-0" />
                )}
              </button>

              {openFaq === idx && (
                <div className="px-4 pb-4 text-xs text-gray-300 leading-relaxed border-t border-[#1c2132] pt-3 bg-[#0d101a]">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 6 : PRÊT À INVITER (CTA FINAL) */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#1b1e2c] via-[#141724] to-[#1b1e2c] border border-[#e5b85c]/40 flex flex-col sm:flex-row items-center justify-between gap-5 shadow-xl text-center sm:text-left">
        <div>
          <h3 className="text-lg sm:text-xl font-black text-white">
            Prêt à faire exploser votre compteur d&apos;entrées ?
          </h3>
          <p className="text-xs text-gray-400 mt-1 max-w-xl">
            Copiez votre lien ou partagez-le directement avec votre message pré-rempli pour commencer à inviter vos amis dès maintenant !
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto shrink-0">
          <button
            onClick={handleCopy}
            className={`w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              copiedLink
                ? 'bg-emerald-500 text-black'
                : 'bg-[#202538] hover:bg-[#2a3048] text-white border border-[#2d3246]'
            }`}
          >
            {copiedLink ? (
              <>
                <Check className="w-4 h-4" />
                <span>Lien copié !</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-[#e5b85c]" />
                <span>Copier mon lien</span>
              </>
            )}
          </button>

          <button
            onClick={onShareWhatsApp}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-950/40 cursor-pointer"
          >
            <MessageSquare className="w-4 h-4 text-black fill-current" />
            <span>Partager sur WhatsApp</span>
          </button>
        </div>
      </div>
    </div>
  );
}
