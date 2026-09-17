'use client';

import { useEffect, useState, useRef, use } from 'react';
import QRCode from 'qrcode';
import { createClient } from '@/lib/supabase/client';
import { formatFrenchDate, formatFrenchTime } from '@/lib/utils';
import { Sparkles, Calendar, Clock, Download, AlertCircle, CheckCircle2, ShieldCheck, SunMedium } from 'lucide-react';
import confetti from 'canvas-confetti';

interface RegistrationDetail {
  id: string;
  qr_token: string;
  status: string;
  guest: {
    first_name: string;
    last_name: string;
  };
  event: {
    name: string;
    event_date: string;
    start_time: string;
    end_time: string;
  };
  promoter: {
    first_name: string;
    last_name: string;
  };
}

export default function GuestQrPassPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [registration, setRegistration] = useState<RegistrationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [qrGenerated, setQrGenerated] = useState(false);

  useEffect(() => {
    async function loadRegistration() {
      setLoading(true);
      setErrorMsg(null);
      const supabase = createClient();

      try {
        const { data, error } = await supabase
          .from('registrations')
          .select(`
            id,
            qr_token,
            status,
            guest:guests(first_name, last_name),
            event:events(name, event_date, start_time, end_time),
            promoter:promoters(first_name, last_name)
          `)
          .eq('qr_token', token)
          .maybeSingle();

        if (error || !data) {
          setErrorMsg('QR code introuvable ou expiré.');
          setLoading(false);
          return;
        }

        // Supabase typage join
        const regDetail: RegistrationDetail = {
          id: data.id,
          qr_token: data.qr_token,
          status: data.status,
          guest: Array.isArray(data.guest) ? data.guest[0] : (data.guest as unknown as { first_name: string; last_name: string }),
          event: Array.isArray(data.event) ? data.event[0] : (data.event as unknown as { name: string; event_date: string; start_time: string; end_time: string }),
          promoter: Array.isArray(data.promoter) ? data.promoter[0] : (data.promoter as unknown as { first_name: string; last_name: string }),
        };

        setRegistration(regDetail);

        // Confetti d'obtention de pass
        try {
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.6 },
            colors: ['#e5b85c', '#ffffff', '#10b981'],
          });
        } catch {
          // Non bloquant
        }
      } catch (err: unknown) {
        const error = err as Error;
        setErrorMsg(error?.message || 'Erreur de chargement.');
      } finally {
        setLoading(false);
      }
    }

    loadRegistration();
  }, [token]);

  // Génération du QR code haute résolution
  useEffect(() => {
    if (!registration || !canvasRef.current) return;

    // Le QR code contient le token (ou une URL de check-in sécurisée)
    const qrData = `${typeof window !== 'undefined' ? window.location.origin : ''}/check-in/${registration.qr_token}`;

    QRCode.toCanvas(
      canvasRef.current,
      qrData,
      {
        width: 280,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
        errorCorrectionLevel: 'H',
      },
      (error) => {
        if (error) {
          console.error(error);
        } else {
          setQrGenerated(true);
        }
      }
    );
  }, [registration]);

  const handleDownload = () => {
    if (!canvasRef.current || !registration) return;
    const link = document.createElement('a');
    link.download = `ASTRA-PASS-${registration.guest.last_name.toUpperCase()}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#08090d]">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-12 h-12 rounded-full border-2 border-[#e5b85c] border-t-transparent animate-spin" />
          <p className="text-gray-400 text-sm font-medium">Génération de votre Pass ASTRA...</p>
        </div>
      </div>
    );
  }

  if (!registration || errorMsg) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#08090d] text-center">
        <div className="max-w-md p-8 bg-[#0f1118] border border-[#1d212f] rounded-2xl">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Billet introuvable</h1>
          <p className="text-gray-400 text-sm">
            {errorMsg || 'Ce QR code est introuvable ou a été annulé.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 bg-[#08090d] text-gray-100">
      <div className="w-full max-w-sm">
        {/* Pass Card */}
        <div className="bg-[#0f1118] border border-[#232738] rounded-3xl overflow-hidden shadow-2xl relative">
          {/* Header Billet */}
          <div className="p-6 bg-gradient-to-b from-[#181b26] to-[#0f1118] border-b border-[#232738] text-center relative">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-[#0b0c10] border border-[#282d3f] mb-2 shadow-inner">
              <Sparkles className="w-5 h-5 text-[#e5b85c]" />
            </div>
            <h1 className="text-2xl font-black tracking-widest text-white uppercase">
              ASTRA
            </h1>
            <p className="text-[10px] tracking-widest text-[#e5b85c] uppercase font-bold">
              Pass Invité • Entrée Gratuite
            </p>

            <div className="mt-4 pt-3 border-t border-[#232738]/60 flex items-center justify-between text-left">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-400">Invité</p>
                <p className="font-bold text-white text-base">
                  {registration.guest.first_name} {registration.guest.last_name}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wider text-gray-400">RP ASTRA</p>
                <p className="font-semibold text-[#e5b85c] text-sm">
                  {registration.promoter.first_name} {registration.promoter.last_name}
                </p>
              </div>
            </div>
          </div>

          {/* QR Code Container */}
          <div className="p-6 flex flex-col items-center justify-center bg-[#0d0e14]">
            <div className="p-3.5 bg-white rounded-2xl shadow-xl flex items-center justify-center">
              <canvas ref={canvasRef} className="rounded-lg max-w-full h-auto block" />
            </div>

            <p className="text-xs font-semibold text-white mt-4 tracking-wide text-center">
              Présente ce QR code à l&apos;entrée du club
            </p>
            <p className="text-[11px] text-gray-400 mt-1 text-center">
              1 entrée valide par personne • Scan unique
            </p>
          </div>

          {/* Détails Soirée */}
          <div className="p-5 bg-[#0f1118] border-t border-[#232738] space-y-2">
            <h2 className="text-sm font-bold text-white text-center">
              {registration.event.name}
            </h2>
            <div className="flex items-center justify-center gap-4 text-xs text-gray-300">
              <span className="flex items-center gap-1.5 capitalize">
                <Calendar className="w-3.5 h-3.5 text-[#e5b85c]" />
                {formatFrenchDate(registration.event.event_date)}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#e5b85c]" />
                {formatFrenchTime(registration.event.start_time)}
              </span>
            </div>
          </div>
        </div>

        {/* Conseil luminosité */}
        <div className="mt-4 p-3 rounded-xl bg-[#13151f] border border-[#202434] flex items-center gap-3 text-xs text-gray-400">
          <SunMedium className="w-4 h-4 text-[#e5b85c] shrink-0" />
          <span>Augmente la luminosité de ton écran à l&apos;entrée pour faciliter le scan.</span>
        </div>

        {/* Bouton Sauvegarder dans la galerie */}
        <button
          onClick={handleDownload}
          disabled={!qrGenerated}
          className="w-full mt-3 py-3 px-4 bg-[#181b26] hover:bg-[#202534] border border-[#2d3246] rounded-xl text-white font-medium text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow"
        >
          <Download className="w-4 h-4 text-[#e5b85c]" />
          <span>Enregistrer le Pass (Image / Capture)</span>
        </button>

        <p className="text-center text-[10px] text-gray-500 mt-4">
          ASTRA Club Orléans • Billet officiel nominatif
        </p>
      </div>
    </div>
  );
}
