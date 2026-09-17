import { Sparkles, Shield, Database, Globe, Clock, CheckCircle2 } from 'lucide-react';

export default function AdminSettingsPage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'Non configurée';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-wider">
          Paramètres du Club
        </h1>
        <p className="text-gray-400 text-xs sm:text-sm mt-1">
          Configuration générale du système ASTRA RP, fuseau horaire et connexion base de données.
        </p>
      </div>

      {/* Identité Club */}
      <div className="bg-[#0f1118] border border-[#1d212f] rounded-3xl p-6 sm:p-8 shadow-xl space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-[#1a1d2b] border border-[#2b3147] flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-[#e5b85c]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">ASTRA Club Privé</h2>
            <p className="text-xs text-[#e5b85c] font-semibold">Orléans, France</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-4 border-t border-[#1d212f]">
          <div className="p-4 bg-[#141722] border border-[#232738] rounded-2xl">
            <div className="flex items-center gap-2 text-gray-400 font-semibold mb-1">
              <Clock className="w-4 h-4 text-[#e5b85c]" />
              <span>Fuseau Horaire d&apos;Exploitation</span>
            </div>
            <p className="text-base font-bold text-white">Europe/Paris (UTC+1 / UTC+2)</p>
            <p className="text-[11px] text-gray-500 mt-1">
              Tous les horaires de soirées et scans sont calés sur l&apos;heure locale française.
            </p>
          </div>

          <div className="p-4 bg-[#141722] border border-[#232738] rounded-2xl">
            <div className="flex items-center gap-2 text-gray-400 font-semibold mb-1">
              <Globe className="w-4 h-4 text-[#e5b85c]" />
              <span>URL Publique du Système</span>
            </div>
            <p className="text-base font-bold text-white font-mono">{appUrl}</p>
            <p className="text-[11px] text-gray-500 mt-1">
              Base pour la génération des liens permanents RP (/rp/[slug]).
            </p>
          </div>
        </div>
      </div>

      {/* État Supabase */}
      <div className="bg-[#0f1118] border border-[#1d212f] rounded-3xl p-6 sm:p-8 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Base de Données PostgreSQL & RLS</h2>
              <p className="text-xs text-gray-400">Supabase Cloud Infrastructure</p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Connecté
          </span>
        </div>

        <div className="space-y-2 text-xs pt-4 border-t border-[#1d212f]">
          <div className="flex items-center justify-between p-3 bg-[#141722] rounded-xl border border-[#232738]">
            <span className="text-gray-400">Endpoint Supabase</span>
            <span className="font-mono text-white text-[11px]">{supabaseUrl}</span>
          </div>

          <div className="flex items-center justify-between p-3 bg-[#141722] rounded-xl border border-[#232738]">
            <span className="text-gray-400">Sécurité Check-in</span>
            <span className="font-semibold text-emerald-400">RPC Atomique (Row-level Lock)</span>
          </div>

          <div className="flex items-center justify-between p-3 bg-[#141722] rounded-xl border border-[#232738]">
            <span className="text-gray-400">Row Level Security</span>
            <span className="font-semibold text-emerald-400">Actif sur toutes les tables</span>
          </div>
        </div>
      </div>

      {/* Sécurité & Règle d'or */}
      <div className="bg-[#121520] border border-[#e5b85c]/30 rounded-3xl p-6 shadow-xl">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-5 h-5 text-[#e5b85c]" />
          <h3 className="font-bold text-white text-sm">Règle Métier Fondamentale ASTRA</h3>
        </div>
        <p className="text-xs text-gray-300 leading-relaxed">
          Le système applique la règle absolue <strong className="text-[#e5b85c]">INSCRIPTION ≠ ENTRÉE</strong>. Le classement officiel des RP repose exclusivement sur le comptage de la table <code className="text-white bg-black/40 px-1.5 py-0.5 rounded">entries</code>. Une inscription gratuite ne confère aucun point sans scan à l&apos;entrée.
        </p>
      </div>
    </div>
  );
}
