import Link from 'next/link';
import { Sparkles, QrCode, Shield, Users, ArrowRight } from 'lucide-react';

export default function HomePage() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
      {/* Glow background accent */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#e5b85c]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-lg w-full">
        {/* ASTRA Official Brand */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/astra-logo.png"
          alt="ASTRA Logo Officiel"
          className="w-28 h-28 sm:w-36 sm:h-36 mx-auto mb-4 object-contain drop-shadow-[0_12px_30px_rgba(229,184,92,0.3)]"
        />

        <p className="text-sm font-extrabold tracking-[0.25em] text-[#e5b85c] uppercase mb-4 mt-2">
          CLUB PRIVÉ • ORLÉANS
        </p>
        <p className="text-gray-400 text-sm leading-relaxed mb-8 max-w-sm mx-auto">
          Portail officiel de gestion des relations publiques, inscriptions invités et contrôle d&apos;accès à l&apos;entrée.
        </p>

        {/* Action cards */}
        <div className="space-y-3">
          <Link
            href="/scan"
            className="w-full p-4 bg-[#0f1118] hover:bg-[#161a26] border border-[#1d212f] hover:border-[#e5b85c]/50 rounded-2xl flex items-center justify-between transition-all group shadow-lg"
          >
            <div className="flex items-center gap-3.5 text-left">
              <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-white group-hover:text-[#e5b85c] transition-colors">
                  Scanner d&apos;Entrée
                </h2>
                <p className="text-xs text-gray-400">Contrôle rapide des QR codes à la porte</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-500 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
          </Link>

          <Link
            href="/admin"
            className="w-full p-4 bg-[#0f1118] hover:bg-[#161a26] border border-[#1d212f] hover:border-[#e5b85c]/50 rounded-2xl flex items-center justify-between transition-all group shadow-lg"
          >
            <div className="flex items-center gap-3.5 text-left">
              <div className="w-11 h-11 rounded-xl bg-[#e5b85c]/10 border border-[#e5b85c]/20 flex items-center justify-center text-[#e5b85c]">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-white group-hover:text-[#e5b85c] transition-colors">
                  Dashboard Admin
                </h2>
                <p className="text-xs text-gray-400">Soirées, RP, entrées et concours annuel</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-500 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
          </Link>

          <Link
            href="/promoter"
            className="w-full p-4 bg-[#0f1118] hover:bg-[#161a26] border border-[#1d212f] hover:border-[#e5b85c]/50 rounded-2xl flex items-center justify-between transition-all group shadow-lg"
          >
            <div className="flex items-center gap-3.5 text-left">
              <div className="w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-white group-hover:text-[#e5b85c] transition-colors">
                  Espace RP &amp; Promoteurs
                </h2>
                <p className="text-xs text-gray-400">Portail RP : lien de partage, stats et classement</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-500 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
          </Link>
        </div>

        <p className="text-xs text-gray-500 mt-10">
          ASTRA Orléans • Système officiel de contrôle d&apos;accès
        </p>
      </div>
    </main>
  );
}
