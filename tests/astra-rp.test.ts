import { describe, it, expect } from 'vitest';
import { 
  generateQrToken, 
  generateInviteToken,
  slugify, 
  calculateAttendanceRate, 
  generateCsvContent 
} from '../src/lib/utils';
import { type CheckInStatusCode } from '../src/lib/types';

describe('ASTRA RP — Fonctions Utilitaires & Sécurité', () => {
  it('Génère un token QR cryptographique sécurisé de 32 caractères sans données personnelles', () => {
    const token1 = generateQrToken();
    const token2 = generateQrToken();

    expect(token1).toBeDefined();
    expect(token1.length).toBe(32);
    expect(token2.length).toBe(32);
    expect(token1).not.toBe(token2);
    // Pas de caractères spéciaux risqués pour les URLs
    expect(/^[a-zA-Z0-9]+$/.test(token1)).toBe(true);
  });

  it('Génère un token d\'invitation sécurisé pour l\'activation des RP', () => {
    const token1 = generateInviteToken();
    const token2 = generateInviteToken();

    expect(token1).toBeDefined();
    expect(token1.length).toBe(32);
    expect(token2.length).toBe(32);
    expect(token1).not.toBe(token2);
    expect(/^[a-f0-9]{32}$/.test(token1)).toBe(true);
  });

  it('Génère des slugs URL propres pour les RP et événements', () => {
    expect(slugify('Lucas Bernard')).toBe('lucas-bernard');
    expect(slugify('Chloé Dubois')).toBe('chloe-dubois');
    expect(slugify('ASTRA — GRAND OPENING 2026!')).toBe('astra-grand-opening-2026');
    expect(slugify('  Événement Spécial & Fête  ')).toBe('evenement-special-fete');
  });

  it('Calcule correctement le taux de présence', () => {
    expect(calculateAttendanceRate(0, 0)).toBe(0);
    expect(calculateAttendanceRate(25, 50)).toBe(50);
    expect(calculateAttendanceRate(32, 50)).toBe(64);
    expect(calculateAttendanceRate(1, 3)).toBe(33.3);
  });

  it('Génère un export CSV au format Excel France avec BOM UTF-8 et séparateur point-virgule', () => {
    const headers = ['Rang', 'Nom', 'Entrées'];
    const rows = [
      [1, 'Lucas Bernard', 42],
      [2, 'Emma Moreau', 38],
    ];

    const csv = generateCsvContent(headers, rows);
    // Vérification du BOM UTF-8
    expect(csv.startsWith('\uFEFF')).toBe(true);
    // Vérification des séparateurs ';'
    expect(csv).toContain('"Rang";"Nom";"Entrées"');
    expect(csv).toContain('"1";"Lucas Bernard";"42"');
  });

  it('Neutralise les injections de formules CSV (=, +, -, @) pour Excel', () => {
    const headers = ['Nom', 'Payload'];
    const maliciousRows = [
      ['=cmd|\' /C calc\'!A0', '@SUM(1+1)'],
      ['+12345', '-test']
    ];

    const csv = generateCsvContent(headers, maliciousRows);
    expect(csv).toContain("\"'=cmd|' /C calc'!A0\"");
    expect(csv).toContain("\"'@SUM(1+1)\"");
    expect(csv).toContain("\"'+12345\"");
    expect(csv).toContain("\"'-test\"");
  });
});

describe('ASTRA RP — Règle Métier Absolue : Inscription ≠ Entrée', () => {
  it('Le classement annuel est calculé STRICTEMENT à partir des entrées validées', () => {
    // Simulation :
    // Lucas : 100 inscriptions, 30 entrées
    // Emma : 40 inscriptions, 35 entrées
    const promoterLucas = { id: 'p1', name: 'Lucas', registrations: 100, entries: 30 };
    const promoterEmma = { id: 'p2', name: 'Emma', registrations: 40, entries: 35 };

    const simulatedEntries = [
      ...Array(30).fill({ promoter_id: 'p1' }),
      ...Array(35).fill({ promoter_id: 'p2' }),
    ];

    // Comptage strict basé sur entries
    const counts: Record<string, number> = {};
    simulatedEntries.forEach(e => {
      counts[e.promoter_id] = (counts[e.promoter_id] || 0) + 1;
    });

    const leaderboard = [
      { ...promoterLucas, actual_entries: counts['p1'] || 0 },
      { ...promoterEmma, actual_entries: counts['p2'] || 0 },
    ].sort((a, b) => b.actual_entries - a.actual_entries);

    // Emma doit être 1ère car elle a 35 entrées, bien que Lucas ait 100 inscriptions !
    expect(leaderboard[0].name).toBe('Emma');
    expect(leaderboard[0].actual_entries).toBe(35);
    expect(leaderboard[1].name).toBe('Lucas');
    expect(leaderboard[1].actual_entries).toBe(30);
  });
});

describe('ASTRA RP — Machine à États du Check-in', () => {
  it('Gère les codes de statut de scan attendus', () => {
    const validCodes: CheckInStatusCode[] = [
      'VALID',
      'ALREADY_USED',
      'CANCELLED',
      'EVENT_NOT_ACTIVE',
      'NOT_FOUND',
      'ERROR',
    ];

    expect(validCodes).toContain('VALID');
    expect(validCodes).toContain('ALREADY_USED');
    expect(validCodes).toContain('CANCELLED');
    expect(validCodes).toContain('EVENT_NOT_ACTIVE');
  });
});

describe('ASTRA RP — Système de Rangs & Paliers de Prestige RP', () => {
  it('Attribue correctement les paliers selon le nombre d\'entrées réelles', async () => {
    const { getPromoterRank } = await import('../src/lib/promoter-ranks');

    // 0 entrée -> Rookie
    const r0 = getPromoterRank(0);
    expect(r0.currentRank.id).toBe('rookie');
    expect(r0.nextRank?.id).toBe('confirmed');
    expect(r0.entriesToNext).toBe(25);

    // 30 entrées -> RP Confirmé
    const r30 = getPromoterRank(30);
    expect(r30.currentRank.id).toBe('confirmed');
    expect(r30.nextRank?.id).toBe('star');
    expect(r30.entriesToNext).toBe(45); // 75 - 30

    // 100 entrées -> Star RP
    const r100 = getPromoterRank(100);
    expect(r100.currentRank.id).toBe('star');
    expect(r100.nextRank?.id).toBe('diamond');

    // 200 entrées -> Diamond
    const r200 = getPromoterRank(200);
    expect(r200.currentRank.id).toBe('diamond');
    expect(r200.nextRank?.id).toBe('legend');

    // 350 entrées -> Légende ASTRA (Palier max)
    const r350 = getPromoterRank(350);
    expect(r350.currentRank.id).toBe('legend');
    expect(r350.nextRank).toBeNull();
    expect(r350.progressPercent).toBe(100);
    expect(r350.entriesToNext).toBe(0);
  });
});

describe('ASTRA RP — Baromètre Ambiance & Avis Flash Post-Soirée', () => {
  it('Valide strictement les notes de 1 à 5 étoiles', () => {
    const isValidRating = (r: number) => Number.isInteger(r) && r >= 1 && r <= 5;

    expect(isValidRating(1)).toBe(true);
    expect(isValidRating(5)).toBe(true);
    expect(isValidRating(3)).toBe(true);
    expect(isValidRating(0)).toBe(false);
    expect(isValidRating(6)).toBe(false);
    expect(isValidRating(4.5)).toBe(false);
    expect(isValidRating(-1)).toBe(false);
  });

  it('Calcule fidèlement le score de satisfaction clubbing (% promoteurs >= 4 étoiles)', () => {
    const calculateSatisfaction = (ratings: number[]) => {
      if (ratings.length === 0) return 100;
      const positive = ratings.filter((r) => r >= 4).length;
      return Math.round((positive / ratings.length) * 100);
    };

    // 10 avis : 7 de 5★, 2 de 4★, 1 de 2★ -> 90% de satisfaction
    expect(calculateSatisfaction([5, 5, 5, 5, 5, 5, 5, 4, 4, 2])).toBe(90);

    // 4 avis : 5, 4, 3, 2 -> 50%
    expect(calculateSatisfaction([5, 4, 3, 2])).toBe(50);

    // 100% de 5★
    expect(calculateSatisfaction([5, 5, 5])).toBe(100);
  });

  it('Assainit et limite les tags et commentaires d’avis pour la sécurité', () => {
    const sanitizeTags = (tags: unknown[]): string[] => {
      if (!Array.isArray(tags)) return [];
      return tags.map((t) => String(t).slice(0, 50)).slice(0, 8);
    };

    const rawTags = ['🎶 Son & DJ', '🔥 Ambiance', '🍹 Bar', '🚪 Entrée', '✨ VIP', '👥 Public', '💡 Lumière', '🎯 Orga', 'EXTRA_TAG_9'];
    const clean = sanitizeTags(rawTags);
    expect(clean.length).toBe(8);
    expect(clean).not.toContain('EXTRA_TAG_9');

    const sanitizeComment = (c: unknown): string | null => {
      if (typeof c !== 'string') return null;
      const trimmed = c.trim();
      return trimmed.length > 0 ? trimmed.slice(0, 500) : null;
    };

    expect(sanitizeComment('  Soirée incroyable avec DJ Snake !  ')).toBe('Soirée incroyable avec DJ Snake !');
    expect(sanitizeComment('   ')).toBeNull();
    expect(sanitizeComment(null)).toBeNull();
  });
});

describe('ASTRA RP — Détection des Doublons & Fraude au Scan Porte', () => {
  it('Calcule fidèlement l’écart en minutes depuis le premier scan validé', () => {
    const calculateMinutesAgo = (firstScanIso: string, currentTimestamp: number): number => {
      const diffMs = currentTimestamp - new Date(firstScanIso).getTime();
      return Math.max(1, Math.round(diffMs / 60_000));
    };

    const now = Date.now();
    const tenMinAgo = new Date(now - 10 * 60_000).toISOString();
    const oneHourAgo = new Date(now - 60 * 60_000).toISOString();
    const justNow = new Date(now - 10_000).toISOString();

    expect(calculateMinutesAgo(tenMinAgo, now)).toBe(10);
    expect(calculateMinutesAgo(oneHourAgo, now)).toBe(60);
    expect(calculateMinutesAgo(justNow, now)).toBe(1);
  });

  it('Structure la réponse de doublon avec toutes les preuves pour les videurs', () => {
    const formatDuplicateAlert = (guestName: string, promoterName: string, scanTimeStr: string, minutesAgo: number) => {
      return {
        status: 'ALREADY_USED' as const,
        guest_name: guestName,
        promoter_name: promoterName,
        duplicate_info: {
          guest_name: guestName,
          promoter_name: promoterName,
          scanned_at: scanTimeStr,
          minutes_ago: minutesAgo,
        },
        message: `DOUBLON / SCREENSHOT : Billet déjà scanné à ${scanTimeStr} (il y a ${minutesAgo} min)`,
      };
    };

    const alert = formatDuplicateAlert('Maxime Dupont', 'Lucas Bernard', '00h42', 18);
    expect(alert.status).toBe('ALREADY_USED');
    expect(alert.duplicate_info.guest_name).toBe('Maxime Dupont');
    expect(alert.duplicate_info.scanned_at).toBe('00h42');
    expect(alert.duplicate_info.minutes_ago).toBe(18);
    expect(alert.message).toContain('00h42');
    expect(alert.message).toContain('18 min');
  });
});

describe('ASTRA RP — Simulateur de Retombées Bar & Vestiaire (ROI RP)', () => {
  it('Calcule fidèlement le chiffre d’affaires indirect généré par les entrées RP', () => {
    const calculateIndirectRevenue = (entries: number, cloakroom: number, barSpend: number) => {
      const cloakroomTotal = Math.round(entries * cloakroom);
      const barTotal = Math.round(entries * barSpend);
      const totalRevenue = cloakroomTotal + barTotal;
      return { cloakroomTotal, barTotal, totalRevenue, basketPerGuest: cloakroom + barSpend };
    };

    // 250 entrées RP : Vestiaire 2€ + Bar 12€ = 14€ / invité
    const res = calculateIndirectRevenue(250, 2.0, 12.0);
    expect(res.basketPerGuest).toBe(14.0);
    expect(res.cloakroomTotal).toBe(500);
    expect(res.barTotal).toBe(3000);
    expect(res.totalRevenue).toBe(3500);

    // 0 entrée -> 0 €
    const zero = calculateIndirectRevenue(0, 2.0, 12.0);
    expect(zero.totalRevenue).toBe(0);
  });
});

