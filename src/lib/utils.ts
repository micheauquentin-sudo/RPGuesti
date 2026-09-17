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
  const csvLines = [
    headers.map(h => `"${String(h).replace(/"/g, '""')}"`).join(';'),
    ...rows.map(row => 
      row.map(val => `"${String(val ?? '').replace(/"/g, '""')}"`).join(';')
    )
  ];
  return bom + csvLines.join('\r\n');
}
