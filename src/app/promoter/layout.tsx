'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Sparkles, LogOut, ExternalLink, Trophy, Share2, User } from 'lucide-react';

export default function PromoterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-[#08090d] text-gray-100 flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-[#0c0d14]/90 backdrop-blur-md border-b border-[#1c202d] px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#1a1d2b] to-[#0c0d14] border border-[#2c3248] flex items-center justify-center shadow-lg">
            <Sparkles className="w-4 h-4 text-[#e5b85c]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black tracking-widest text-base uppercase text-white">ASTRA</span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-[#e5b85c]/10 text-[#e5b85c] border border-[#e5b85c]/30">
                PORTAIL RP
              </span>
            </div>
            <p className="text-[10px] text-gray-400 font-medium hidden sm:block">
              Club Privé — Orléans • Concours RP & Entrées
            </p>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Déconnexion</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 p-4 sm:p-8 max-w-5xl mx-auto w-full">
        {children}
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-gray-500 border-t border-[#141724]">
        <p>ASTRA Club Orléans • Portail RP & Concours Annuel</p>
        <p className="text-[10px] text-gray-600 mt-1">Seules les entrées physiques validées au scan comptent pour le classement.</p>
      </footer>
    </div>
  );
}
