'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { 
  Sparkles, 
  LayoutDashboard, 
  Calendar, 
  Users, 
  Trophy, 
  CheckSquare, 
  QrCode, 
  UserCheck, 
  FileText, 
  LogOut, 
  Menu, 
  X 
} from 'lucide-react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const navItems = [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    { href: '/admin/events', label: 'Soirées', icon: Calendar },
    { href: '/admin/promoters', label: 'RP & Promoteurs', icon: Users },
    { href: '/admin/leaderboard', label: 'Classement Concours', icon: Trophy },
    { href: '/admin/entries', label: 'Entrées Scannées', icon: CheckSquare },
    { href: '/admin/guests', label: 'Invités', icon: UserCheck },
    { href: '/admin/audit-logs', label: 'Journal d’Audit', icon: FileText },
    { href: '/promoter', label: 'Espace RP', icon: Sparkles },
    { href: '/scan', label: 'Scanner Caméra', icon: QrCode, highlight: true },
  ];

  return (
    <div className="min-h-screen bg-[#08090d] text-gray-100 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-[#0f1118] border-b border-[#1d212f] sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-black border border-[#2c3248] flex items-center justify-center p-0.5 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/astra-logo.png" alt="ASTRA" className="w-full h-full object-contain" />
          </div>
          <div>
            <span className="font-black tracking-widest text-sm uppercase text-white">ASTRA</span>
            <span className="text-[10px] text-[#e5b85c] block font-bold tracking-wider">ADMINISTRATION</span>
          </div>
        </div>

        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-xl bg-[#171a25] border border-[#262c3e] text-gray-300"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar Desktop & Mobile Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#0c0d14] border-r border-[#1a1d29] flex flex-col justify-between transition-transform duration-200 ease-in-out md:static md:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Brand Logo */}
          <div className="p-6 border-b border-[#1a1d29] hidden md:flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-black border border-[#2c3248] flex items-center justify-center shadow-lg p-0.5 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/astra-logo.png" alt="ASTRA" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="font-black tracking-widest text-lg uppercase text-white">ASTRA</h1>
              <p className="text-[10px] uppercase tracking-wider text-[#e5b85c] font-bold">
                Club Orléans • Admin
              </p>
            </div>
          </div>

          {/* Nav List */}
          <nav className="p-4 space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    item.highlight
                      ? 'bg-gradient-to-r from-[#e5b85c] to-[#c99a38] text-black font-bold shadow-md hover:brightness-110 mt-3'
                      : isActive
                      ? 'bg-[#181b27] text-white border border-[#2b3147] shadow-sm text-[#e5b85c]'
                      : 'text-gray-400 hover:text-white hover:bg-[#12141e]'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${item.highlight ? 'text-black' : isActive ? 'text-[#e5b85c]' : 'text-gray-500'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer Logout */}
        <div className="p-4 border-t border-[#1a1d29]">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-x-hidden p-4 sm:p-8 max-w-7xl mx-auto w-full">
        {children}
      </main>

      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden"
        />
      )}
    </div>
  );
}
