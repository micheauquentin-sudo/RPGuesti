// =====================================================================
// ASTRA RP — RATE LIMITER IN-MEMORY (SERVERLESS-COMPATIBLE)
// Pour un rate-limiting production-grade, utiliser @upstash/ratelimit
// =====================================================================

const store = new Map<string, { count: number; resetTime: number }>();
let lastCleanup = Date.now();
const CLEANUP_INTERVAL = 5 * 60_000; // Nettoyage toutes les 5 minutes

/**
 * Nettoie les entrées expirées du store pour éviter les fuites mémoire
 */
function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, record] of store.entries()) {
    if (now > record.resetTime) {
      store.delete(key);
    }
  }
}

/**
 * Vérifie si une requête est autorisée selon le rate limit
 * @param identifier - Clé unique (ex: IP + route)
 * @param limit - Nombre max de requêtes par fenêtre (défaut: 10)
 * @param windowMs - Durée de la fenêtre en ms (défaut: 60s)
 */
export function checkRateLimit(
  identifier: string,
  { limit = 10, windowMs = 60_000 }: { limit?: number; windowMs?: number } = {}
): { success: boolean; remaining: number; resetMs: number } {
  cleanup();

  const now = Date.now();
  const record = store.get(identifier);

  // Entrée expirée ou inexistante → nouvelle fenêtre
  if (!record || now > record.resetTime) {
    store.set(identifier, { count: 1, resetTime: now + windowMs });
    return { success: true, remaining: limit - 1, resetMs: now + windowMs };
  }

  // Limite atteinte
  if (record.count >= limit) {
    return { success: false, remaining: 0, resetMs: record.resetTime };
  }

  // Incrémenter
  record.count++;
  return { success: true, remaining: limit - record.count, resetMs: record.resetTime };
}

/**
 * Extrait l'IP client depuis les headers de la requête (compatible Vercel)
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  return forwarded?.split(',')[0]?.trim() || realIp || 'unknown';
}
