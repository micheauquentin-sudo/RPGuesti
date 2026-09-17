'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import confetti from 'canvas-confetti';
import { 
  Sparkles, 
  KeyRound, 
  Mail, 
  Lock, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

interface PromoterInfo {
  first_name: string;
  last_name: string;
  slug: string;
  email?: string | null;
}

export default function JoinPromoterPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const router = useRouter();

  const [loadingToken, setLoadingToken] = useState(true);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [alreadyActivated, setAlreadyActivated] = useState(false);
  const [promoter, setPromoter] = useState<PromoterInfo | null>(null);

  // Formulaire
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const supabase = createClient();

  // 1. Vérification du token d'invitation au chargement
  useEffect(() => {
    async function verifyToken() {
      try {
        setLoadingToken(true);
        setTokenError(null);

        const res = await fetch(`/api/promoters/invite?token=${encodeURIComponent(token)}`);
        const data = await res.json();

        if (!res.ok || !data.valid) {
          if (data.already_activated) {
            setAlreadyActivated(true);
          }
          setTokenError(data.error || 'Lien d\'invitation invalide ou expiré.');
          return;
        }

        setPromoter(data.promoter);
        if (data.promoter.email) {
          setEmail(data.promoter.email);
        }
      } catch (err: unknown) {
        const error = err as Error;
        setTokenError(error.message || 'Impossible de vérifier le lien d\'invitation.');
      } finally {
        setLoadingToken(false);
      }
    }

    if (token) {
      verifyToken();
    }
  }, [token]);

  // 2. Soumission du formulaire de création
  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!email.trim()) {
      setFormError('Veuillez renseigner votre adresse email.');
      return;
    }

    if (password.length < 6) {
      setFormError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('Les deux mots de passe ne correspondent pas.');
      return;
    }

    setSubmitting(true);

    try {
      // Appel API pour créer le compte Auth et lier le RP
      const res = await fetch('/api/promoters/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          email: email.trim(),
          password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors de l\'activation.');
      }

      setSuccess(true);

      // Déclencher confettis de bienvenue
      try {
        confetti({
          particleCount: 70,
          spread: 80,
          origin: { y: 0.6 },
        });
      } catch {}

      // Connexion automatique avec la session Supabase
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        // Si la connexion auto échoue, rediriger vers login
        setTimeout(() => {
          router.push('/login?redirectTo=/promoter');
        }, 1200);
      } else {
        // Redirection directe vers l'espace RP
        setTimeout(() => {
          router.push('/promoter');
        }, 1000);
      }
    } catch (err: unknown) {
      const error = err as Error;
      setFormError(error.message || 'Une erreur est survenue lors de l\'activation.');
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#08090d] text-gray-100 flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Background glow cosmique */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#e5b85c]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        {/* Header Branding */}
        <div className="text-center mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/astra-logo.png"
            alt="ASTRA Logo"
            className="w-24 h-24 sm:w-28 sm:h-28 mx-auto mb-3 object-contain drop-shadow-[0_10px_25px_rgba(229,184,92,0.3)]"
          />
          <h1 className="text-2xl sm:text-3xl font-black tracking-widest text-white uppercase font-sans">
            CLUB ASTRA
          </h1>
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#e5b85c] font-bold mt-1">
            PORTAIL OFFICIEL PROMOTEURS & RP
          </p>
        </div>

        {/* ÉTAT 1 : CHARGEMENT DU LIEN */}
        {loadingToken && (
          <div className="bg-[#0f1118] border border-[#1d212f] rounded-2xl p-8 text-center shadow-2xl backdrop-blur-xl">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-[#e5b85c] border-t-transparent mb-4" />
            <p className="text-xs text-gray-400">Vérification de votre invitation ASTRA...</p>
          </div>
        )}

        {/* ÉTAT 2 : ERREUR / LIEN EXPIRÉ */}
        {!loadingToken && tokenError && (
          <div className="bg-[#0f1118] border border-rose-500/20 rounded-2xl p-6 sm:p-8 text-center shadow-2xl backdrop-blur-xl">
            <AlertCircle className="w-12 h-12 text-rose-400 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-white mb-2">
              {alreadyActivated ? 'Compte déjà activé' : 'Lien d\'invitation invalide'}
            </h2>
            <p className="text-gray-400 text-xs leading-relaxed mb-6">
              {tokenError}
            </p>
            <Link
              href="/login?redirectTo=/promoter"
              className="w-full py-3 px-4 bg-gradient-to-r from-[#e5b85c] to-[#d4a037] text-black font-bold rounded-xl text-xs flex items-center justify-center gap-2 hover:opacity-95 transition-opacity"
            >
              <span>Se connecter à mon espace</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {/* ÉTAT 3 : SUCCÈS CONFIRMÉ */}
        {!loadingToken && success && (
          <div className="bg-[#0f1118] border border-emerald-500/30 rounded-2xl p-8 text-center shadow-2xl backdrop-blur-xl">
            <CheckCircle2 className="w-14 h-14 text-emerald-400 mx-auto mb-4 animate-bounce" />
            <h2 className="text-xl font-black text-white mb-2">Espace RP Activé !</h2>
            <p className="text-gray-400 text-xs leading-relaxed mb-4">
              Bienvenue dans l&apos;équipe ASTRA. Connexion en cours vers votre tableau de bord...
            </p>
            <div className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-[#e5b85c] border-t-transparent" />
          </div>
        )}

        {/* ÉTAT 4 : FORMULAIRE D'ACTIVATION */}
        {!loadingToken && !tokenError && !success && promoter && (
          <div className="bg-[#0f1118] border border-[#1d212f] rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative">
            <div className="flex items-center gap-2 mb-5 text-xs font-semibold text-[#e5b85c]">
              <Sparkles className="w-4 h-4" />
              <span>Activation de ton pass RP officiel</span>
            </div>

            <div className="mb-6 p-4 rounded-2xl bg-[#151822] border border-[#232738]">
              <p className="text-xs text-gray-400">Promoteur identifié :</p>
              <h2 className="text-lg font-black text-white mt-0.5">
                {promoter.first_name} {promoter.last_name}
              </h2>
              <p className="text-[11px] text-[#e5b85c] font-medium mt-1">
                Lien invité associé : /rp/{promoter.slug}
              </p>
            </div>

            {formError && (
              <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleActivate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                  Ton Adresse Email
                </label>
                <div className="relative">
                  <Mail className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ton.email@exemple.com"
                    className="w-full pl-11 pr-4 py-3 bg-[#151822] border border-[#232738] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#e5b85c] focus:ring-1 focus:ring-[#e5b85c] text-sm transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                  Choisis ton Mot de Passe
                </label>
                <div className="relative">
                  <Lock className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 6 caractères"
                    className="w-full pl-11 pr-11 py-3 bg-[#151822] border border-[#232738] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#e5b85c] focus:ring-1 focus:ring-[#e5b85c] text-sm transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                  Confirme ton Mot de Passe
                </label>
                <div className="relative">
                  <KeyRound className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirme ton mot de passe"
                    className="w-full pl-11 pr-4 py-3 bg-[#151822] border border-[#232738] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#e5b85c] focus:ring-1 focus:ring-[#e5b85c] text-sm transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-3 py-3.5 px-4 bg-gradient-to-r from-[#e5b85c] to-[#d4a037] hover:from-[#f0c773] hover:to-[#e5b85c] text-black font-extrabold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-sm"
              >
                {submitting ? (
                  <span className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-black border-t-transparent" />
                ) : (
                  <>
                    <span>Activer Mon Espace RP</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <p className="text-[11px] text-gray-500 text-center mt-5">
              Accès officiel sécurisé Club ASTRA Orléans. Vos identifiants vous permettront de suivre vos statistiques et votre classement en direct.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
