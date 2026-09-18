'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { type CheckInResponse, type CheckInStatusCode } from '@/lib/types';
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Flashlight, 
  Keyboard, 
  History, 
  ArrowLeft,
  Camera,
  Search,
  Wifi,
  WifiOff,
  UserCheck, 
  RefreshCw,
  Clock,
  User,
  Phone,
  Sparkles,
  X,
  Zap,
  ShieldAlert
} from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { enqueueOfflineScan, flushOfflineScans, getPendingOfflineScans } from '@/lib/offline-scan';

interface RecentScanItem {
  id: string;
  time: string;
  status: CheckInStatusCode;
  guestName?: string;
  promoterName?: string;
}

export interface SearchCandidate {
  registration_id: string;
  qr_token: string;
  guest_name: string;
  phone: string | null;
  promoter_name: string;
  event_name: string;
  event_date: string;
  status: 'VALID' | 'ALREADY_USED' | 'CANCELLED';
  scanned_at: string | null;
}

export default function MobileScannerPage() {
  const [scannerActive, setScannerActive] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [scanResult, setScanResult] = useState<CheckInResponse | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recentScans, setRecentScans] = useState<RecentScanItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Network & Sync Realtime
  const [isOnline, setIsOnline] = useState(true);
  const [pendingOfflineCount, setPendingOfflineCount] = useState(0);
  const [totalDoorEntries, setTotalDoorEntries] = useState<number | null>(null);
  const [isFlushingQueue, setIsFlushingQueue] = useState(false);

  // Rescue Search / Manual Modal
  const [rescueModalOpen, setRescueModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'search' | 'token'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchCandidate[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [manualToken, setManualToken] = useState('');
  const [rushMode, setRushMode] = useState(false);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const autoResumeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Jouer un son synthétique simple
  const playFeedbackTone = (type: 'success' | 'warning' | 'error') => {
    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === 'success') {
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
        osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.08); // A5
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.25);
      } else if (type === 'warning') {
        osc.frequency.setValueAtTime(350, audioCtx.currentTime);
        osc.frequency.setValueAtTime(280, audioCtx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.35);
      } else if (type === 'error') {
        osc.frequency.setValueAtTime(220, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
      } else {
        // Alarme sirène pour individu blacklisté
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(700, audioCtx.currentTime);
        osc.frequency.linearRampToValueAtTime(400, audioCtx.currentTime + 0.18);
        osc.frequency.linearRampToValueAtTime(700, audioCtx.currentTime + 0.36);
        osc.frequency.linearRampToValueAtTime(400, audioCtx.currentTime + 0.54);
        gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.6);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.6);
      }
    } catch {
      // Audio ignoré si bloqué
    }
  };

  // Traiter un code scanné ou un token validé
  const processQrCode = useCallback(async (decodedText: string, candidateGuestName?: string) => {
    if (isProcessing) return;
    setIsProcessing(true);

    const nowTime = new Intl.DateTimeFormat('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'Europe/Paris'
    }).format(new Date());

    // Si nous sommes déconnectés, enregistrer directement en file d'attente hors-ligne
    if (!navigator.onLine) {
      enqueueOfflineScan(decodedText);
      setPendingOfflineCount(getPendingOfflineScans().length);

      setScanResult({
        success: true,
        status: 'VALID',
        message: 'Enregistré hors-ligne (mise en attente du réseau)',
        guest_name: candidateGuestName || 'Invité (Mode Hors-Ligne)',
        promoter_name: 'Sync différée',
        event_name: 'ASTRA',
      });
      playFeedbackTone('success');

      if (autoResumeTimerRef.current) clearTimeout(autoResumeTimerRef.current);
      autoResumeTimerRef.current = setTimeout(() => {
        setScanResult(null);
        setIsProcessing(false);
      }, 2000);
      return;
    }

    try {
      const res = await fetch('/api/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qr_data: decodedText }),
      });

      const data: CheckInResponse = await res.json();
      setScanResult(data);

      // Haptique et son
      if (data.status === 'VALID') {
        if (navigator.vibrate) navigator.vibrate(rushMode ? [50] : [100, 50, 100]);
        playFeedbackTone('success');
      } else if (data.status === 'ALREADY_USED') {
        if (navigator.vibrate) navigator.vibrate([300]);
        playFeedbackTone('warning');
      } else if (data.status === 'BLACKLISTED') {
        if (navigator.vibrate) navigator.vibrate([400, 100, 400, 100, 600]);
        playFeedbackTone('error');
      } else {
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
        playFeedbackTone('error');
      }

      // Ajouter à l'historique local
      setRecentScans(prev => [
        {
          id: Math.random().toString(),
          time: nowTime,
          status: data.status,
          guestName: data.guest_name,
          promoterName: data.promoter_name,
        },
        ...prev.slice(0, 19),
      ]);

      // Réarmement automatique adapté (Mode Rush = 650ms, sinon 1.8s)
      const resumeDelay = rushMode 
        ? (data.status === 'VALID' ? 650 : 1100) 
        : (data.status === 'BLACKLISTED' ? 3500 : 1800);

      if (autoResumeTimerRef.current) clearTimeout(autoResumeTimerRef.current);
      autoResumeTimerRef.current = setTimeout(() => {
        setScanResult(null);
        setIsProcessing(false);
      }, resumeDelay);

    } catch (err: unknown) {
      console.error('Scan error, saving offline:', err);
      // Fallback réseau défaillant
      enqueueOfflineScan(decodedText);
      setPendingOfflineCount(getPendingOfflineScans().length);

      setScanResult({
        success: true,
        status: 'VALID',
        message: 'Réseau instable : scan sauvegardé hors-ligne',
        guest_name: candidateGuestName || 'Invité (Secours Hors-Ligne)',
        promoter_name: 'Auto-sync active',
      });
      playFeedbackTone('warning');

      if (autoResumeTimerRef.current) clearTimeout(autoResumeTimerRef.current);
      autoResumeTimerRef.current = setTimeout(() => {
        setScanResult(null);
        setIsProcessing(false);
      }, 2200);
    }
  }, [isProcessing]);

  // Initialisation de la caméra
  useEffect(() => {
    const html5QrCode = new Html5Qrcode('qr-reader-container', {
      formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
      verbose: false,
    });
    html5QrCodeRef.current = html5QrCode;

    const startCamera = async () => {
      try {
        await html5QrCode.start(
          { facingMode: 'environment' },
          {
            fps: 15,
            qrbox: { width: 260, height: 260 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            processQrCode(decodedText);
          },
          () => {
            // ignore scan frame misses
          }
        );
        setScannerActive(true);
        setCameraError(null);

        // Torche
        try {
          const capabilities = html5QrCode.getRunningTrackCameraCapabilities();
          if (capabilities.torchFeature && capabilities.torchFeature().isSupported()) {
            setHasTorch(true);
          }
        } catch {
          // pas de torche
        }
      } catch (err: unknown) {
        console.error('Camera init error:', err);
        setCameraError('Accès caméra refusé ou non supporté. Veuillez autoriser la caméra.');
      }
    };

    startCamera();

    return () => {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().catch(() => {});
      }
      if (autoResumeTimerRef.current) clearTimeout(autoResumeTimerRef.current);
    };
  }, [processQrCode]);

  // Synchronisation Réseau & Realtime Portiers
  useEffect(() => {
    setIsOnline(navigator.onLine);
    setPendingOfflineCount(getPendingOfflineScans().length);

    // Vider la file d'attente hors-ligne
    const handleSyncQueue = async () => {
      if (isFlushingQueue) return;
      setIsFlushingQueue(true);
      try {
        await flushOfflineScans(() => {
          playFeedbackTone('success');
        });
        setPendingOfflineCount(getPendingOfflineScans().length);
      } catch (e) {
        console.error('Erreur sync offline scans:', e);
      } finally {
        setIsFlushingQueue(false);
      }
    };

    const handleOnline = () => {
      setIsOnline(true);
      handleSyncQueue();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Charger le total actuel des entrées du soir
    const fetchDoorCount = async () => {
      try {
        const supabase = createClient();
        const today = new Date().toISOString().split('T')[0];
        const { count, error } = await supabase
          .from('entries')
          .select('*', { count: 'exact', head: true })
          .gte('scanned_at', `${today}T00:00:00Z`)
          .eq('status', 'VALID');

        if (!error && typeof count === 'number') {
          setTotalDoorEntries(count);
        }
      } catch (e) {
        console.error('Error fetching door count:', e);
      }
    };

    fetchDoorCount();

    // Supabase Realtime : multi-portiers
    const supabase = createClient();
    const channel = supabase
      .channel('door-multi-bouncer')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'entries' },
        (payload) => {
          if (payload.new && (payload.new as { status: string }).status === 'VALID') {
            setTotalDoorEntries((prev) => (prev !== null ? prev + 1 : 1));
          }
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      supabase.removeChannel(channel);
    };
  }, [isFlushingQueue]);

  // Basculer la torche
  const toggleTorch = async () => {
    if (!html5QrCodeRef.current || !hasTorch) return;
    try {
      const newStatus = !torchOn;
      await html5QrCodeRef.current.applyVideoConstraints({
        advanced: [{ torch: newStatus } as unknown as MediaTrackConstraintSet]
      });
      setTorchOn(newStatus);
    } catch (e) {
      console.error(e);
    }
  };

  // Recherche d'invité de secours (batterie vide)
  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (val.trim().length < 2) {
      setSearchResults([]);
      setSearchError(null);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setSearchError(null);

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/check-in/search?q=${encodeURIComponent(val.trim())}`);
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Erreur lors de la recherche');
        }
        setSearchResults(data.candidates || []);
      } catch (err: unknown) {
        const error = err as Error;
        setSearchError(error.message || 'Impossible de rechercher les invités.');
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 280);
  };

  // Validation 1-clic pour un invité trouvé dans la recherche de secours
  const handleValidateCandidate = (candidate: SearchCandidate) => {
    setRescueModalOpen(false);
    processQrCode(candidate.qr_token, candidate.guest_name);
  };

  const handleManualTokenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualToken.trim()) return;
    setRescueModalOpen(false);
    processQrCode(manualToken.trim());
    setManualToken('');
  };

  const dismissResult = () => {
    if (autoResumeTimerRef.current) clearTimeout(autoResumeTimerRef.current);
    setScanResult(null);
    setIsProcessing(false);
  };

  return (
    <div className="fixed inset-0 bg-black text-white flex flex-col justify-between overflow-hidden select-none">
      {/* Top Bar Navigation */}
      <div className="relative z-20 flex items-center justify-between p-4 bg-gradient-to-b from-black/95 to-transparent">
        <Link
          href="/admin"
          className="flex items-center gap-1.5 py-1.5 px-3 rounded-full bg-white/10 hover:bg-white/20 text-xs font-semibold backdrop-blur"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Admin</span>
        </Link>

        {/* Logo & Indicateur Multi-Portiers */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/astra-logo.png" alt="ASTRA" className="w-5 h-5 object-contain" />
            <span className="font-black tracking-widest text-xs uppercase">ASTRA TERMINAL</span>
          </div>
          {totalDoorEntries !== null && (
            <div className="flex items-center gap-1 mt-0.5 text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30">
              <Sparkles className="w-3 h-3 text-[#e5b85c]" />
              <span>{totalDoorEntries} entrées ce soir</span>
            </div>
          )}
        </div>

        {/* Boutons d'action : Torche + Secours/Recherche + Status Réseau */}
        <div className="flex items-center gap-1.5">
          {/* Status Réseau */}
          <div
            title={isOnline ? 'Réseau connecté' : 'Mode hors-ligne actif'}
            className={`p-1.5 rounded-full border backdrop-blur text-xs flex items-center justify-center ${
              isOnline
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/30 text-amber-400 border-amber-500/50 animate-pulse'
            }`}
          >
            {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
          </div>

          {hasTorch && (
            <button
              onClick={toggleTorch}
              className={`p-2 rounded-full border ${torchOn ? 'bg-[#e5b85c] text-black border-[#e5b85c]' : 'bg-white/10 text-white border-white/20'} backdrop-blur`}
            >
              <Flashlight className="w-4 h-4" />
            </button>
          )}

          {/* Bouton Mode Rush */}
          <button
            onClick={() => setRushMode(!rushMode)}
            className={`p-2 rounded-full border backdrop-blur transition-all flex items-center justify-center ${
              rushMode
                ? 'bg-amber-400 text-black border-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.6)]'
                : 'bg-white/10 text-white/70 border-white/20 hover:text-white'
            }`}
            title={rushMode ? 'Mode Rush Actif (Cadence 0.6s)' : 'Activer Mode Rush (Cadence 0.6s)'}
          >
            <Zap className={`w-4 h-4 ${rushMode ? 'fill-current' : ''}`} />
          </button>

          {/* Bouton Recherche Secours (Nom / Téléphone / Code) */}
          <button
            onClick={() => setRescueModalOpen(true)}
            className="p-2 rounded-full bg-[#e5b85c]/20 hover:bg-[#e5b85c]/30 border border-[#e5b85c]/40 text-[#e5b85c] backdrop-blur flex items-center justify-center"
            title="Recherche invité (batterie à plat) ou token manuel"
          >
            <Search className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Alerte file d'attente hors-ligne si présence de scans en attente */}
      {pendingOfflineCount > 0 && (
        <div className="relative z-20 mx-4 px-3 py-1.5 bg-amber-950/90 border border-amber-500/40 rounded-xl flex items-center justify-between text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isFlushingQueue ? 'animate-spin' : ''}`} />
            <span>{pendingOfflineCount} scan(s) en attente de synchronisation</span>
          </div>
          {isOnline && (
            <button
              disabled={isFlushingQueue}
              onClick={() => {
                setIsFlushingQueue(true);
                flushOfflineScans().finally(() => {
                  setPendingOfflineCount(getPendingOfflineScans().length);
                  setIsFlushingQueue(false);
                });
              }}
              className="px-2 py-0.5 bg-amber-500 text-black font-bold rounded text-[10px]"
            >
              Sync
            </button>
          )}
        </div>
      )}

      {/* Main Viewport: Scanner Caméra */}
      <div className="relative flex-1 flex items-center justify-center bg-black">
        {/* Container HTML5-QRCode */}
        <div id="qr-reader-container" className="w-full h-full object-cover" />

        {/* Cadre de visée stylisé ASTRA */}
        {scannerActive && !scanResult && (
          <div className="absolute pointer-events-none flex flex-col items-center">
            {rushMode && (
              <span className="mb-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/50 text-amber-400 text-[10px] font-black uppercase tracking-wider animate-pulse backdrop-blur">
                ⚡ MODE RUSH ACTIF (0.6s)
              </span>
            )}
            <div className="w-64 h-64 border-2 border-white/30 rounded-3xl relative overflow-hidden">
              {/* Coins dorés */}
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-[#e5b85c] rounded-tl-2xl" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-[#e5b85c] rounded-tr-2xl" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-[#e5b85c] rounded-bl-2xl" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-[#e5b85c] rounded-br-2xl" />

              {/* Ligne laser animée */}
              <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-[#e5b85c] to-transparent animate-pulse absolute top-1/2 -translate-y-1/2 shadow-[0_0_12px_#e5b85c]" />
            </div>
            <p className="mt-4 text-xs font-semibold tracking-wider uppercase text-white/70 bg-black/60 px-4 py-1.5 rounded-full backdrop-blur">
              Pointez le QR code invité
            </p>
          </div>
        )}

        {/* Message d'erreur caméra */}
        {cameraError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-[#0f1118] text-center z-10">
            <Camera className="w-12 h-12 text-rose-500 mb-4" />
            <h2 className="text-lg font-bold text-white mb-2">Caméra non disponible</h2>
            <p className="text-gray-400 text-sm max-w-xs mb-6">{cameraError}</p>
            <button
              onClick={() => setRescueModalOpen(true)}
              className="py-3 px-6 bg-[#e5b85c] text-black font-bold rounded-xl text-sm"
            >
              Recherche de secours (Nom / Téléphone)
            </button>
          </div>
        )}

        {/* OVERLAY RÉSULTAT DU SCAN (Flash plein écran) */}
        {scanResult && (
          <div 
            onClick={dismissResult}
            className={`absolute inset-0 z-30 flex flex-col items-center justify-center p-6 transition-all duration-200 cursor-pointer backdrop-blur-md ${
              scanResult.status === 'VALID' 
                ? 'bg-emerald-950/95 border-8 border-emerald-500' 
                : scanResult.status === 'ALREADY_USED'
                ? 'bg-amber-950/95 border-8 border-amber-500'
                : scanResult.status === 'BLACKLISTED'
                ? 'bg-red-950/98 border-8 border-red-600 animate-pulse shadow-[inset_0_0_80px_rgba(239,68,68,0.7)]'
                : 'bg-rose-950/95 border-8 border-rose-500'
            }`}
          >
            {scanResult.status === 'VALID' && (
              <div className="text-center animate-in zoom-in-95 duration-150">
                <div className="w-24 h-24 rounded-full bg-emerald-500 text-black flex items-center justify-center mx-auto mb-6 shadow-[0_0_50px_rgba(16,185,129,0.8)]">
                  <CheckCircle2 className="w-16 h-16 stroke-[2.5]" />
                </div>
                <span className="inline-block px-4 py-1.5 rounded-full bg-emerald-500 text-black font-black text-sm uppercase tracking-widest mb-3">
                  ENTRÉE VALIDÉE
                </span>
                <h1 className="text-3xl font-black text-white mb-2">
                  {scanResult.guest_name}
                </h1>
                <div className="space-y-1 text-emerald-200 font-medium text-base mb-6">
                  <p>RP : <strong className="text-white font-bold">{scanResult.promoter_name}</strong></p>
                  <p className="text-sm opacity-80">{scanResult.event_name}</p>
                  {scanResult.message && (
                    <p className="text-xs text-emerald-300 font-mono italic">{scanResult.message}</p>
                  )}
                </div>
                <p className="text-xs text-emerald-300/80 uppercase tracking-wider">
                  Prêt pour le suivant (cliquez pour passer)
                </p>
              </div>
            )}

            {scanResult.status === 'ALREADY_USED' && (
              <div className="text-center animate-in zoom-in-95 duration-150">
                <div className="w-24 h-24 rounded-full bg-amber-500 text-black flex items-center justify-center mx-auto mb-6 shadow-[0_0_50px_rgba(245,158,11,0.8)]">
                  <AlertTriangle className="w-16 h-16 stroke-[2.5]" />
                </div>
                <span className="inline-block px-4 py-1.5 rounded-full bg-amber-500 text-black font-black text-sm uppercase tracking-widest mb-3">
                  QR DÉJÀ UTILISÉ
                </span>
                <h1 className="text-2xl font-black text-white mb-2">
                  {scanResult.guest_name}
                </h1>
                <p className="text-amber-200 font-medium text-sm mb-4">
                  Déjà enregistré • RP : {scanResult.promoter_name}
                </p>
                {scanResult.scanned_at && (
                  <div className="p-3 bg-black/40 rounded-xl text-xs text-amber-300 max-w-xs mx-auto mb-6">
                    Scanné le {new Date(scanResult.scanned_at).toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris' })}
                    {scanResult.scanned_by && ` par ${scanResult.scanned_by}`}
                  </div>
                )}
                <p className="text-xs text-amber-300/80 uppercase tracking-wider">
                  Entrée refusée • Cliquez pour continuer
                </p>
              </div>
            )}

            {scanResult.status === 'BLACKLISTED' && (
              <div className="text-center animate-in zoom-in-95 duration-150">
                <div className="w-24 h-24 rounded-full bg-red-600 text-white flex items-center justify-center mx-auto mb-6 shadow-[0_0_60px_rgba(239,68,68,0.9)] animate-bounce">
                  <ShieldAlert className="w-16 h-16 stroke-[2.5]" />
                </div>
                <span className="inline-block px-4 py-1.5 rounded-full bg-red-600 text-white font-black text-sm uppercase tracking-widest mb-3 shadow-lg">
                  ⛔ ACCÈS STRICTEMENT REFUSÉ
                </span>
                <h1 className="text-3xl font-black text-white mb-2">
                  {scanResult.guest_name}
                </h1>
                <div className="p-3.5 bg-black/60 rounded-2xl border border-red-500/50 max-w-xs mx-auto mb-6 text-red-200 text-xs">
                  <p className="font-extrabold uppercase text-red-400 mb-1">INDIVIDU SIGNALÉ SUR BLACKLIST</p>
                  <p>{scanResult.message}</p>
                </div>
                <p className="text-xs text-red-300 font-bold uppercase tracking-wider">
                  Avertir le chef de sécurité • Cliquez pour continuer
                </p>
              </div>
            )}

            {['NOT_FOUND', 'CANCELLED', 'EVENT_NOT_ACTIVE', 'ERROR', 'EXPIRED'].includes(scanResult.status) && (
              <div className="text-center animate-in zoom-in-95 duration-150">
                <div className="w-24 h-24 rounded-full bg-rose-500 text-black flex items-center justify-center mx-auto mb-6 shadow-[0_0_50px_rgba(244,63,94,0.8)]">
                  <XCircle className="w-16 h-16 stroke-[2.5]" />
                </div>
                <span className="inline-block px-4 py-1.5 rounded-full bg-rose-500 text-black font-black text-sm uppercase tracking-widest mb-3">
                  {scanResult.status === 'EXPIRED'
                    ? 'SOIRÉE TERMINÉE / EXPIRÉ'
                    : scanResult.status === 'CANCELLED'
                    ? 'ENTRÉE ANNULÉE'
                    : 'QR INVALIDE'}
                </span>
                <h1 className="text-xl font-bold text-white mb-4">
                  {scanResult.message || 'Billet non reconnu'}
                </h1>
                <p className="text-xs text-rose-300/80 uppercase tracking-wider">
                  Cliquez pour continuer
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Bar: Historique des derniers scans */}
      <div className="relative z-20 p-4 bg-gradient-to-t from-black/95 via-black/70 to-transparent">
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="w-full py-3 px-4 bg-[#141722]/80 hover:bg-[#1c2030] border border-white/10 rounded-2xl flex items-center justify-between text-xs font-semibold backdrop-blur"
        >
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-[#e5b85c]" />
            <span>Derniers passages ({recentScans.length})</span>
          </div>
          <span className="text-gray-400 font-normal">
            {recentScans[0] ? `${recentScans[0].guestName || 'Scan'} — ${recentScans[0].time}` : 'Aucun scan récent'}
          </span>
        </button>

        {/* Tiroir d'historique */}
        {showHistory && (
          <div className="mt-2 p-3 bg-[#0d0f16] border border-[#232738] rounded-2xl max-h-48 overflow-y-auto space-y-1.5 text-xs">
            {recentScans.length === 0 ? (
              <p className="text-gray-500 text-center py-2">Aucun scan dans cette session</p>
            ) : (
              recentScans.map((item) => (
                <div key={item.id} className="flex items-center justify-between py-1 border-b border-white/5 last:border-none">
                  <span className={`font-bold ${item.status === 'VALID' ? 'text-emerald-400' : item.status === 'ALREADY_USED' ? 'text-amber-400' : 'text-rose-400'}`}>
                    {item.status === 'VALID' ? '✓ VALIDÉ' : item.status === 'ALREADY_USED' ? '⚠ DÉJÀ VU' : '✗ REFUSÉ'}
                  </span>
                  <span className="text-white font-medium">{item.guestName || 'Inconnu'}</span>
                  <span className="text-gray-400 text-[11px]">{item.promoterName ? `RP: ${item.promoterName}` : ''}</span>
                  <span className="text-gray-500 font-mono text-[10px]">{item.time}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* MODAL RECHERCHE DE SECOURS (Batterie vide / Nom / Tél & Token) */}
      {rescueModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-3 sm:p-4">
          <div className="bg-[#12141d] border border-[#232738] rounded-3xl p-5 w-full max-w-md max-h-[85vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom-6 duration-200">
            
            {/* Header Modal */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#e5b85c]/10 text-[#e5b85c] flex items-center justify-center">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Recherche de Secours</h3>
                  <p className="text-[11px] text-gray-400">Pour invité avec batterie vide ou QR illisible</p>
                </div>
              </div>
              <button
                onClick={() => setRescueModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-white rounded-full bg-white/5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Onglets : Recherche Secours vs Token Direct */}
            <div className="grid grid-cols-2 gap-2 my-3 p-1 bg-[#181b26] rounded-xl">
              <button
                type="button"
                onClick={() => setActiveTab('search')}
                className={`py-2 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                  activeTab === 'search'
                    ? 'bg-[#e5b85c] text-black shadow'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Search className="w-3.5 h-3.5" />
                <span>Nom / Téléphone</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('token')}
                className={`py-2 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                  activeTab === 'token'
                    ? 'bg-[#e5b85c] text-black shadow'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Keyboard className="w-3.5 h-3.5" />
                <span>Token Manuel</span>
              </button>
            </div>

            {/* CONTENU ONGLET 1 : RECHERCHE NOM / TÉLÉPHONE */}
            {activeTab === 'search' && (
              <div className="flex-1 overflow-hidden flex flex-col space-y-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    autoFocus
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    placeholder="Tapez le nom ou les 4 derniers chiffres..."
                    className="w-full pl-10 pr-4 py-2.5 bg-[#191c28] border border-[#2d3246] rounded-xl text-white text-xs placeholder-gray-500 focus:outline-none focus:border-[#e5b85c]"
                  />
                  {isSearching && (
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                      <RefreshCw className="w-3.5 h-3.5 text-[#e5b85c] animate-spin" />
                    </div>
                  )}
                </div>

                {searchError && (
                  <p className="text-rose-400 text-xs text-center">{searchError}</p>
                )}

                {/* Liste des résultats */}
                <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[160px] max-h-[300px]">
                  {searchQuery.trim().length >= 2 && !isSearching && searchResults.length === 0 && (
                    <div className="text-center py-6 text-gray-500 text-xs">
                      Aucun invité trouvé pour « {searchQuery} »
                    </div>
                  )}

                  {searchQuery.trim().length < 2 && (
                    <div className="text-center py-6 text-gray-500 text-xs">
                      Saisissez au moins 2 caractères pour rechercher sur la guestlist de ce soir.
                    </div>
                  )}

                  {searchResults.map((cand) => (
                    <div
                      key={cand.registration_id}
                      className="p-3 bg-[#171a25] border border-white/5 rounded-xl flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-xs truncate">
                            {cand.guest_name}
                          </span>
                          {cand.status === 'VALID' ? (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                              VALIDE
                            </span>
                          ) : cand.status === 'ALREADY_USED' ? (
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[10px] font-bold">
                              DÉJÀ ENTRÉ
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 text-[10px] font-bold">
                              ANNULÉ
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-gray-400 mt-1">
                          <span>RP: <strong className="text-gray-300">{cand.promoter_name}</strong></span>
                          {cand.phone && (
                            <span className="font-mono text-[10px] text-gray-500">{cand.phone}</span>
                          )}
                        </div>

                        {cand.scanned_at && (
                          <div className="text-[10px] text-amber-300/80 mt-0.5 flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            <span>Entré à {new Date(cand.scanned_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' })}</span>
                          </div>
                        )}
                      </div>

                      {/* Bouton 1-Clic de validation */}
                      {cand.status === 'VALID' ? (
                        <button
                          onClick={() => handleValidateCandidate(cand)}
                          className="px-3 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs rounded-xl flex items-center gap-1 shadow-lg shadow-emerald-500/20 shrink-0"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>Valider</span>
                        </button>
                      ) : (
                        <div className="px-2 py-1 bg-white/5 text-gray-500 text-[10px] rounded-lg shrink-0">
                          Bloqué
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CONTENU ONGLET 2 : TOKEN MANUEL */}
            {activeTab === 'token' && (
              <form onSubmit={handleManualTokenSubmit} className="space-y-4 py-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Token ou lien complet du pass :
                  </label>
                  <input
                    type="text"
                    required
                    value={manualToken}
                    onChange={(e) => setManualToken(e.target.value)}
                    placeholder="ex: ast_01j8f9... ou https://rp-guesti.vercel.app/qr/..."
                    className="w-full px-4 py-3 bg-[#191c28] border border-[#2d3246] rounded-xl text-white text-xs placeholder-gray-500 focus:outline-none focus:border-[#e5b85c]"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setRescueModalOpen(false)}
                    className="flex-1 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold"
                  >
                    Fermer
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-[#e5b85c] text-black font-bold rounded-xl text-xs"
                  >
                    Vérifier le token
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
