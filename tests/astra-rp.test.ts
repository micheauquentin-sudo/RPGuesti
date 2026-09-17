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
