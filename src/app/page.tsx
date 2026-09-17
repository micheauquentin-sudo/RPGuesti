import Link from 'next/link';
import { Sparkles, QrCode, Shield, Users, ArrowRight } from 'lucide-react';

export default function HomePage() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
      {/* Glow background accent */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#e5b85c]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-lg w-full">
        {/* ASTRA Brand */}
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-[#1b1e2c] to-[#0e1017] border border-[#2b3046] mb-6 shadow-2xl">
          <Sparkles className="w-10 h-10 text-[#e5b85c]" />
        </div>

        <h1 className="text-4xl sm:text-5xl font-black tracking-widest text-white uppercase mb-3">
          ASTRA
        </h1>
        <p className="text-sm font-semibold tracking-widest text-[#e5b85c] uppercase mb-4">
          Club Privé — Orléans
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
            href="/rp/lucas"
            className="w-full p-4 bg-[#0f1118] hover:bg-[#161a26] border border-[#1d212f] hover:border-[#e5b85c]/50 rounded-2xl flex items-center justify-between transition-all group shadow-lg"
          >
            <div className="flex items-center gap-3.5 text-left">
              <div className="w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-white group-hover:text-[#e5b85c] transition-colors">
                  Aperçu Page RP (Ex: Lucas)
                </h2>
                <p className="text-xs text-gray-400">Page publique de réservation invité</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-500 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
          </Link>
        </div>

        {/* Footer */}
        <p className="text-xs text-gray-500 mt-10">
          ASTRA Club Orléans • Système interne de contrôle d&apos;accès
        </p>
      </div>
    </main>
  );
}
