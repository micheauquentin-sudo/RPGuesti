'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Shield, Sparkles, KeyRound, Mail, AlertCircle, ArrowRight } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/admin';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      if (data.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single();

        if (profile?.role === 'staff') {
          router.push('/scan');
        } else if (profile?.role === 'promoter') {
          router.push('/promoter');
        } else {
          router.push(redirectTo && !redirectTo.includes('error') ? redirectTo : '/admin');
        }
        router.refresh();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Identifiants invalides';
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#0f1118] border border-[#1d212f] rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
      <div className="flex items-center gap-2 mb-6 text-sm font-medium text-[#e5b85c]">
        <Shield className="w-4 h-4" />
        <span>Accès sécurisé réservé au personnel</span>
      </div>

      {errorMsg && (
        <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
            Adresse Email
          </label>
          <div className="relative">
            <Mail className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="staff@astra-club.fr"
              className="w-full pl-11 pr-4 py-3 bg-[#151822] border border-[#232738] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#e5b85c] focus:ring-1 focus:ring-[#e5b85c] transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
            Mot de Passe
          </label>
          <div className="relative">
            <KeyRound className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full pl-11 pr-4 py-3 bg-[#151822] border border-[#232738] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#e5b85c] focus:ring-1 focus:ring-[#e5b85c] transition-colors"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-2 py-3.5 px-4 bg-gradient-to-r from-[#e5b85c] to-[#d4a037] hover:from-[#f0c773] hover:to-[#e5b85c] text-black font-bold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {loading ? (
            <span className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-black border-t-transparent" />
          ) : (
            <>
              <span>Connexion au Terminal</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#08090d] text-gray-100">
      <div className="w-full max-w-md">
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#1c1f2e] to-[#0f1118] border border-[#2a2f45] mb-4 shadow-xl">
            <Sparkles className="w-8 h-8 text-[#e5b85c]" />
          </div>
          <h1 className="text-3xl font-black tracking-widest text-white uppercase font-sans">
            ASTRA
          </h1>
          <p className="text-xs uppercase tracking-widest text-gray-400 mt-1">
            Club Privé — Orléans • Espace RP, Staff & Admin
          </p>
        </div>

        {/* Form Wrapped in Suspense */}
        <Suspense fallback={
          <div className="bg-[#0f1118] border border-[#1d212f] rounded-2xl p-8 text-center text-gray-500 text-xs">
            Chargement du terminal d&apos;accès...
          </div>
        }>
          <LoginForm />
        </Suspense>

        {/* Footer info */}
        <p className="text-center text-xs text-gray-400 mt-6">
          Les invités n&apos;ont pas besoin de compte.
        </p>
      </div>
    </div>
  );
}
