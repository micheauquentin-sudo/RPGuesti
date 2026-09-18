'use client';

import { useEffect, useState } from 'react';
import {
  Download,
  Share,
  PlusSquare,
  X,
  Sparkles,
  Smartphone,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export default function PWAInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSSteps, setShowIOSSteps] = useState(false);

  useEffect(() => {
    // Vérifier si déjà en mode autonome (PWA déjà installée et ouverte depuis l'écran d'accueil)
    if (typeof window === 'undefined') return;

    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
      document.referrer.includes('android-app://');

    if (isStandalone) {
      return;
    }

    // Vérifier si l'utilisateur a fermé la pop-up récemment dans cette session
    const isDismissed = sessionStorage.getItem('astra_pwa_prompt_dismissed');
    if (isDismissed) {
      return;
    }

    // Détection iOS Safari
    const ua = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(ua);
    setIsIOS(isIosDevice);

    // Écoute de l'événement natif Chrome/Android/Desktop
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Si sur iOS ou navigateur où l'événement n'est pas envoyé, afficher la popup après 1.5s
    const timer = setTimeout(() => {
      setShowPrompt(true);
    }, 1500);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      clearTimeout(timer);
    };
  }, []);

  const handleDismiss = () => {
    setShowPrompt(false);
    sessionStorage.setItem('astra_pwa_prompt_dismissed', 'true');
  };

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          setShowPrompt(false);
        }
      } catch {
        // En cas d'erreur ou d'annulation
      }
    } else if (isIOS) {
      setShowIOSSteps(true);
    } else {
      setShowIOSSteps(true);
    }
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 sm:bottom-5 sm:right-5 sm:left-auto sm:max-w-md z-50 p-4 animate-in slide-in-from-bottom-5 duration-300">
      <div className="relative overflow-hidden rounded-3xl bg-[#0c0e17]/95 border-2 border-[#e5b85c]/60 shadow-[0_15px_40px_rgba(0,0,0,0.8),0_0_25px_rgba(229,184,92,0.25)] backdrop-blur-xl p-5 text-white">
        {/* Glow d'arrière plan */}
        <div className="absolute -top-10 -right-10 w-36 h-36 bg-[#e5b85c]/20 rounded-full blur-2xl pointer-events-none" />

        {/* Bouton Fermer */}
        <button
          onClick={handleDismiss}
          className="absolute top-3.5 right-3.5 p-1.5 rounded-xl bg-[#1a1e2c] hover:bg-[#252b3e] text-gray-400 hover:text-white transition-colors cursor-pointer"
          aria-label="Fermer"
        >
          <X className="w-4 h-4" />
        </button>

        {!showIOSSteps ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3.5 pr-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/astra-logo.png"
                alt="ASTRA Logo"
                className="w-13 h-13 rounded-2xl object-contain bg-[#141724] border border-[#e5b85c]/50 p-1 shrink-0 shadow-lg shadow-[#e5b85c]/10"
              />
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-[#e5b85c] text-black">
                    Application ASTRA
                  </span>
                  <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Accès 1-Clic
                  </span>
                </div>
                <h3 className="text-sm sm:text-base font-black text-white mt-1 leading-snug">
                  Installer sur votre écran d&apos;accueil
                </h3>
                <p className="text-xs text-gray-300 mt-1 leading-relaxed">
                  Ajoutez l&apos;application sur votre smartphone pour accéder à vos pass et votre espace en 1 seconde, sans ouvrir le navigateur.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={handleInstallClick}
                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#e5b85c] via-[#f0c773] to-[#d4a037] hover:brightness-110 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-[#e5b85c]/25 cursor-pointer active:scale-98 transition-all"
              >
                <Download className="w-4 h-4 text-black" />
                <span>Installer maintenant</span>
              </button>

              <button
                type="button"
                onClick={handleDismiss}
                className="py-2.5 px-3 rounded-xl bg-[#171a26] hover:bg-[#202434] text-gray-400 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Plus tard
              </button>
            </div>
          </div>
        ) : (
          /* Étapes illustrées pour iOS / navigateur sans API directe */
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-[#e5b85c]" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  {isIOS ? 'Installation sur iPhone / iPad' : 'Ajouter à l\'écran d\'accueil'}
                </h4>
              </div>
              <button
                onClick={() => setShowIOSSteps(false)}
                className="text-[11px] text-[#e5b85c] hover:underline font-semibold"
              >
                Retour
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-xl bg-[#141724] border border-[#232738] flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center shrink-0">
                  {isIOS ? <Share className="w-4 h-4" /> : '1'}
                </div>
                <div className="leading-tight">
                  <span className="font-bold text-white">Étape 1 : </span>
                  <span className="text-gray-300">
                    {isIOS
                      ? 'Appuyez sur l\'icône Partager en bas de Safari.'
                      : 'Ouvrez le menu du navigateur (3 points ⋮ en haut à droite).'}
                  </span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-[#141724] border border-[#232738] flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-[#e5b85c]/20 text-[#e5b85c] font-bold flex items-center justify-center shrink-0">
                  {isIOS ? <PlusSquare className="w-4 h-4" /> : '2'}
                </div>
                <div className="leading-tight">
                  <span className="font-bold text-white">Étape 2 : </span>
                  <span className="text-gray-300">
                    Faites défiler et sélectionnez <strong className="text-white">« Sur l&apos;écran d&apos;accueil »</strong>.
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDismiss}
              className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-[#e5b85c] to-[#d4a037] text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer active:scale-98 transition-all"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>C&apos;est fait !</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
