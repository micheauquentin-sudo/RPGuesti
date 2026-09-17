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
  Sparkles,
  Camera
} from 'lucide-react';
import Link from 'next/link';

interface RecentScanItem {
  id: string;
  time: string;
  status: CheckInStatusCode;
  guestName?: string;
  promoterName?: string;
}

export default function MobileScannerPage() {
  const [scannerActive, setScannerActive] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [scanResult, setScanResult] = useState<CheckInResponse | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recentScans, setRecentScans] = useState<RecentScanItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [manualInputOpen, setManualInputOpen] = useState(false);
  const [manualToken, setManualToken] = useState('');
  const [cameraError, setCameraError] = useState<string | null>(null);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const autoResumeTimerRef = useRef<NodeJS.Timeout | null>(null);

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
      } else {
        osc.frequency.setValueAtTime(220, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
      }
    } catch {
      // Ignorer si audio non autorisé
    }
  };

  // Traiter un code scanné
  const processQrCode = useCallback(async (decodedText: string) => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      const res = await fetch('/api/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qr_data: decodedText }),
      });

      const data: CheckInResponse = await res.json();
      setScanResult(data);

      const nowTime = new Intl.DateTimeFormat('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone: 'Europe/Paris'
      }).format(new Date());

      // Haptique et son
      if (data.status === 'VALID') {
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
        playFeedbackTone('success');
      } else if (data.status === 'ALREADY_USED') {
        if (navigator.vibrate) navigator.vibrate([300]);
        playFeedbackTone('warning');
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

      // Réarmement automatique après 1.8s
      if (autoResumeTimerRef.current) clearTimeout(autoResumeTimerRef.current);
      autoResumeTimerRef.current = setTimeout(() => {
        setScanResult(null);
        setIsProcessing(false);
      }, 1800);

    } catch (err: unknown) {
      console.error(err);
      setScanResult({
        success: false,
        status: 'ERROR',
        message: 'Erreur de connexion réseau',
      });
      if (autoResumeTimerRef.current) clearTimeout(autoResumeTimerRef.current);
      autoResumeTimerRef.current = setTimeout(() => {
        setScanResult(null);
        setIsProcessing(false);
      }, 2000);
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
            // scan failure callback (ignore les frames sans QR)
          }
        );
        setScannerActive(true);
        setCameraError(null);

        // Vérifier si la torche est supportée
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

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualToken.trim()) return;
    setManualInputOpen(false);
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
      <div className="relative z-20 flex items-center justify-between p-4 bg-gradient-to-b from-black/90 to-transparent">
        <Link
          href="/admin"
          className="flex items-center gap-1.5 py-1.5 px-3 rounded-full bg-white/10 hover:bg-white/20 text-xs font-semibold backdrop-blur"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Admin</span>
        </Link>

        <div className="flex items-center gap-2 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/astra-logo.png" alt="ASTRA" className="w-5 h-5 object-contain" />
          <span className="font-black tracking-widest text-xs uppercase">ASTRA TERMINAL</span>
        </div>

        <div className="flex items-center gap-2">
          {hasTorch && (
            <button
              onClick={toggleTorch}
              className={`p-2 rounded-full border ${torchOn ? 'bg-[#e5b85c] text-black border-[#e5b85c]' : 'bg-white/10 text-white border-white/20'} backdrop-blur`}
            >
              <Flashlight className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => setManualInputOpen(true)}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white backdrop-blur"
          >
            <Keyboard className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Viewport: Scanner Caméra */}
      <div className="relative flex-1 flex items-center justify-center bg-black">
        {/* Container HTML5-QRCode */}
        <div id="qr-reader-container" className="w-full h-full object-cover" />

        {/* Cadre de visée stylisé ASTRA */}
        {scannerActive && !scanResult && (
          <div className="absolute pointer-events-none flex flex-col items-center">
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
              onClick={() => setManualInputOpen(true)}
              className="py-3 px-6 bg-[#e5b85c] text-black font-bold rounded-xl text-sm"
            >
              Saisie manuelle du code
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
      <div className="relative z-20 p-4 bg-gradient-to-t from-black/90 via-black/70 to-transparent">
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

      {/* Modal Saisie Manuelle */}
      {manualInputOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#12141d] border border-[#232738] rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-base font-bold text-white mb-2">Recherche de billet manuelle</h3>
            <p className="text-xs text-gray-400 mb-4">
              Si le QR code sur le téléphone de l&apos;invité est illisible, collez ou tapez son token.
            </p>
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <input
                type="text"
                required
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                placeholder="Token ou URL du billet"
                className="w-full px-4 py-3 bg-[#191c28] border border-[#2d3246] rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-[#e5b85c]"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setManualInputOpen(false)}
                  className="flex-1 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#e5b85c] text-black rounded-xl text-xs font-bold"
                >
                  Valider l&apos;entrée
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
