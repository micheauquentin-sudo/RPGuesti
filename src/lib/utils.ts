// =====================================================================
// ASTRA RP — FONCTIONS UTILITAIRES
// =====================================================================

import crypto from 'crypto';

/**
 * Génère un token cryptographique sécurisé pour le QR code
 * 32 caractères alphanumériques (sécurisé, unique, sans données personnelles)
 */
export function generateQrToken(): string {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Génère un token cryptographique sécurisé pour l'invitation / activation d'un RP
 * 32 caractères hexadécimaux uniques
 */
export function generateInviteToken(): string {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Nettoie et formate une chaîne pour en faire un slug URL valide
 * Ex: "Lucas Bernard" -> "lucas-bernard"
 */
export function slugify(text: string): string {
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
}

/**
 * Formate une date en heure française (Europe/Paris)
 * Ex: "Samedi 26 septembre 2026"
 */
export function formatFrenchDate(dateInput: string | Date): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

/**
 * Formate une heure en heure française
 * Ex: "23:30"
 */
export function formatFrenchTime(timeString: string): string {
  if (!timeString) return '';
  const parts = timeString.split(':');
  if (parts.length >= 2) {
    return `${parts[0]}h${parts[1]}`;
  }
  return timeString;
}

/**
 * Calcule le taux de présence avec arrondi à 1 décimale
 */
export function calculateAttendanceRate(entries: number, registrations: number): number {
  if (!registrations || registrations === 0) return 0;
  const rate = (entries / registrations) * 100;
  return Math.round(rate * 10) / 10;
}

/**
 * Formate et télécharge un fichier CSV encodé pour Excel FR
 * Utilise le séparateur point-virgule et le BOM UTF-8
 */
export function generateCsvContent(headers: string[], rows: (string | number)[][]): string {
  const bom = '\uFEFF';
  const sanitizeCell = (val: string | number | null | undefined): string => {
    let str = String(val ?? '');
    // Neutralisation de l'injection de formules CSV (Excel, LibreOffice, Google Sheets)
    if (/^[=+\-@\t\r]/.test(str)) {
      str = `'${str}`;
    }
    return `"${str.replace(/"/g, '""')}"`;
  };

  const csvLines = [
    headers.map(sanitizeCell).join(';'),
    ...rows.map(row => row.map(sanitizeCell).join(';'))
  ];
  return bom + csvLines.join('\r\n');
}

/**
 * Génère le code de sécurité unique affiché sur le billet physique ou digital
 * Format: SEC-XXXXXXXXXX (les 10 premiers caractères du token en majuscules)
 */
export function generateSecurityCode(qrToken: string): string {
  if (!qrToken) return 'SEC-0000000000';
  const clean = qrToken.replace(/[^a-zA-Z0-9]/g, '');
  return `SEC-${clean.slice(0, 10).toUpperCase()}`;
}

/**
 * Formate un horodatage d'émission certifié pour le sceau de sécurité anti-contrefaçon
 */
export function formatSecurityEmissionStamp(date: Date = new Date()): {
  dateStr: string;
  timeStr: string;
  fullStamp: string;
} {
  const dateStr = date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const timeStr = date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'Europe/Paris',
  });
  return {
    dateStr,
    timeStr,
    fullStamp: `CERTIFIÉ SÉCURISÉ • ÉMIS LE ${dateStr} À ${timeStr} (PARIS)`,
  };
}
