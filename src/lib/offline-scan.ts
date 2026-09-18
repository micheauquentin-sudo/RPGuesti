// =====================================================================
// ASTRA RP — GESTION DU SCAN HORS-LIGNE / RÉSEAU FAIBLE
// =====================================================================

export interface PendingOfflineScan {
  id: string;
  qr_data: string;
  scanned_at: string;
}

const STORAGE_KEY = 'astra_pending_offline_scans';

/**
 * Enregistre un scan en attente dans le localStorage
 */
export function enqueueOfflineScan(qrData: string): PendingOfflineScan {
  const pendingScan: PendingOfflineScan = {
    id: Math.random().toString(36).slice(2, 9),
    qr_data: qrData,
    scanned_at: new Date().toISOString(),
  };

  try {
    const current = getPendingOfflineScans();
    // Éviter les doublons stricts
    if (!current.some((item) => item.qr_data === qrData)) {
      current.push(pendingScan);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    }
  } catch (err) {
    console.warn('Erreur écriture offline scans:', err);
  }

  return pendingScan;
}

/**
 * Récupère tous les scans en attente de synchronisation
 */
export function getPendingOfflineScans(): PendingOfflineScan[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/**
 * Supprime un scan synchronisé avec succès
 */
export function removeOfflineScan(id: string) {
  try {
    const current = getPendingOfflineScans();
    const filtered = current.filter((item) => item.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (err) {
    console.warn('Erreur suppression offline scan:', err);
  }
}

/**
 * Tente de vider la file d'attente vers le serveur
 */
export async function flushOfflineScans(
  onSuccessItem?: (scan: PendingOfflineScan) => void
): Promise<{ syncedCount: number; errorsCount: number }> {
  const pending = getPendingOfflineScans();
  if (pending.length === 0) return { syncedCount: 0, errorsCount: 0 };

  let syncedCount = 0;
  let errorsCount = 0;

  for (const scan of pending) {
    try {
      const res = await fetch('/api/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qr_data: scan.qr_data }),
      });

      if (res.ok) {
        removeOfflineScan(scan.id);
        syncedCount++;
        if (onSuccessItem) onSuccessItem(scan);
      } else {
        errorsCount++;
      }
    } catch {
      errorsCount++;
      // Le réseau est toujours instable, arrêter la boucle pour l'instant
      break;
    }
  }

  return { syncedCount, errorsCount };
}
