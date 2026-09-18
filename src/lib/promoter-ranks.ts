// =====================================================================
// ASTRA RP — SYSTÈME DE PALIERS & RANGS DE PRESTIGE RP
// =====================================================================

export interface PromoterRank {
  id: string;
  name: string;
  badge: string;
  minEntries: number;
  maxEntries: number | null;
  color: string;
  gradient: string;
  perk: string;
  iconName: 'Award' | 'Sparkles' | 'Flame' | 'Trophy' | 'Crown';
}

export const PROMOTER_RANKS: PromoterRank[] = [
  {
    id: 'rookie',
    name: 'Rookie RP',
    badge: '🥉 Bronze',
    minEntries: 0,
    maxEntries: 24,
    color: '#cd7f32',
    gradient: 'from-[#cd7f32]/20 to-[#cd7f32]/5',
    perk: 'Accès espace RP, lien personnalisé & pass illimités',
    iconName: 'Award',
  },
  {
    id: 'confirmed',
    name: 'RP Confirmé',
    badge: '🥈 Argent',
    minEntries: 25,
    maxEntries: 74,
    color: '#94a3b8',
    gradient: 'from-[#94a3b8]/20 to-[#94a3b8]/5',
    perk: 'Mise en avant sur le leaderboard & badge Argent officiel',
    iconName: 'Sparkles',
  },
  {
    id: 'star',
    name: 'Star RP',
    badge: '🥇 Or',
    minEntries: 75,
    maxEntries: 149,
    color: '#e5b85c',
    gradient: 'from-[#e5b85c]/25 to-[#e5b85c]/5',
    perk: 'Accès carré VIP pour le RP & badge Or étincelant',
    iconName: 'Flame',
  },
  {
    id: 'diamond',
    name: 'VIP Diamond RP',
    badge: '💎 Diamant',
    minEntries: 150,
    maxEntries: 299,
    color: '#38bdf8',
    gradient: 'from-[#38bdf8]/25 to-[#38bdf8]/5',
    perk: 'Bouteille offerte aux soirées spéciales & statut VIP permanent',
    iconName: 'Trophy',
  },
  {
    id: 'legend',
    name: 'Légende ASTRA',
    badge: '👑 Légende',
    minEntries: 300,
    maxEntries: null,
    color: '#f59e0b',
    gradient: 'from-[#f59e0b]/30 via-[#e5b85c]/20 to-[#f59e0b]/5',
    perk: 'Statut ambassadeur officiel ASTRA & accès illimité carré VIP',
    iconName: 'Crown',
  },
];

/**
 * Calcule le rang d'un promoteur selon son nombre cumulé d'entrées réelles
 */
export function getPromoterRank(entriesCount: number): {
  currentRank: PromoterRank;
  nextRank: PromoterRank | null;
  progressPercent: number;
  entriesToNext: number;
} {
  const count = Math.max(0, entriesCount || 0);

  let currentRankIndex = 0;
  for (let i = 0; i < PROMOTER_RANKS.length; i++) {
    const rank = PROMOTER_RANKS[i];
    if (count >= rank.minEntries && (rank.maxEntries === null || count <= rank.maxEntries)) {
      currentRankIndex = i;
      break;
    }
  }

  const currentRank = PROMOTER_RANKS[currentRankIndex];
  const nextRank = currentRankIndex < PROMOTER_RANKS.length - 1 ? PROMOTER_RANKS[currentRankIndex + 1] : null;

  if (!nextRank) {
    return {
      currentRank,
      nextRank: null,
      progressPercent: 100,
      entriesToNext: 0,
    };
  }

  const range = nextRank.minEntries - currentRank.minEntries;
  const currentInRange = count - currentRank.minEntries;
  const progressPercent = Math.min(100, Math.max(0, Math.round((currentInRange / range) * 100)));
  const entriesToNext = Math.max(0, nextRank.minEntries - count);

  return {
    currentRank,
    nextRank,
    progressPercent,
    entriesToNext,
  };
}
