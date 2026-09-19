'use client';

import { useState } from 'react';
import { 
  Coins, 
  Wine, 
  Shirt, 
  SlidersHorizontal, 
  Receipt, 
  Sparkles,
  TrendingUp,
  ArrowUpRight
} from 'lucide-react';
import { formatFrenchDate } from '@/lib/utils';
import Link from 'next/link';

interface PastEventItem {
  id: string;
  name: string;
  event_date: string;
  entriesCount: number;
}

interface BarRevenueSimulatorProps {
  entriesToday: number;
  entriesThisYear: number;
  predictedEntriesTonight: number;
  pastEvents: PastEventItem[];
  registrationsTonight?: number;
}

export default function BarRevenueSimulator({
  entriesToday,
  entriesThisYear,
  predictedEntriesTonight,
  pastEvents,
  registrationsTonight = 0,
}: BarRevenueSimulatorProps) {
  // Paramètres personnalisables du panier moyen clubbing
  const [cloakroomPrice, setCloakroomPrice] = useState<number>(2.0); // 2,00 € vestiaire
  const [drinkSpendPerGuest, setDrinkSpendPerGuest] = useState<number>(12.0); // 12,00 € bar moyen

  const totalBasket = cloakroomPrice + drinkSpendPerGuest;

  // Presets réalistes boîte de nuit
  const presets = [
    { label: 'Standard Clubbing', cloakroom: 2.0, drink: 10.0, icon: '🍸' },
    { label: 'Rush Festif (2 verres)', cloakroom: 2.0, drink: 14.0, icon: '🔥' },
    { label: 'Grosse Soirée / VIP', cloakroom: 3.0, drink: 20.0, icon: '👑' },
  ];

  const applyPreset = (cloak: number, drink: number) => {
    setCloakroomPrice(cloak);
    setDrinkSpendPerGuest(drink);
  };

  // Calculs financiers en direct : basés sur ce qui arrive (entrées réelles)
  const tonightRevenue = Math.round(entriesToday * totalBasket);
  const potentialTonightRevenue = Math.round(registrationsTonight * totalBasket);
  const predictedTonightRevenue = Math.round(predictedEntriesTonight * totalBasket);
  const yearlyRevenue = Math.round(entriesThisYear * totalBasket);

  const formatEuro = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="bg-[#0f1118] border border-[#1d212f] rounded-3xl p-6 shadow-xl space-y-6">
      {/* Header avec badge rentabilité */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/10">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-white tracking-wide">
                Retombées Bar &amp; Vestiaire (ROI des RP)
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                100% Recettes Directes
              </span>
            </div>
            <p className="text-xs text-gray-400">
              Estimation du chiffre d&apos;affaires généré en caisse par les entrées gratuites RP
            </p>
          </div>
        </div>

        {/* Boutons presets rapides */}
        <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-auto">
          {presets.map((p) => {
            const isSelected = p.cloakroom === cloakroomPrice && p.drink === drinkSpendPerGuest;
            return (
              <button
                key={p.label}
                type="button"
                onClick={() => applyPreset(p.cloakroom, p.drink)}
                className={`text-[11px] px-2.5 py-1.5 rounded-xl font-semibold transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-[#e5b85c] text-black shadow-md shadow-[#e5b85c]/20'
                    : 'bg-[#151824] hover:bg-[#1e2233] text-gray-300 border border-white/5'
                }`}
              >
                <span>{p.icon}</span>
                <span>{p.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Barre de réglage fin du panier moyen */}
      <div className="p-4 rounded-2xl bg-[#131622] border border-[#222638] grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
        {/* Curseur Vestiaire */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-300 font-bold flex items-center gap-1.5">
              <Shirt className="w-3.5 h-3.5 text-blue-400" />
              <span>Vestiaire moyen :</span>
            </span>
            <span className="font-mono font-black text-blue-400">{cloakroomPrice.toFixed(2)} €</span>
          </div>
          <input
            type="range"
            min="0"
            max="5"
            step="0.5"
            value={cloakroomPrice}
            onChange={(e) => setCloakroomPrice(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-[#202538] rounded-lg appearance-none cursor-pointer accent-[#e5b85c]"
          />
        </div>

        {/* Curseur Bar / Conso */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-300 font-bold flex items-center gap-1.5">
              <Wine className="w-3.5 h-3.5 text-rose-400" />
              <span>Conso Bar moyenne :</span>
            </span>
            <span className="font-mono font-black text-rose-400">{drinkSpendPerGuest.toFixed(2)} €</span>
          </div>
          <input
            type="range"
            min="5"
            max="30"
            step="1"
            value={drinkSpendPerGuest}
            onChange={(e) => setDrinkSpendPerGuest(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-[#202538] rounded-lg appearance-none cursor-pointer accent-[#e5b85c]"
          />
        </div>

        {/* Résumé Panier Moyen Par Invité */}
        <div className="p-3 bg-[#0d0f17] border border-white/5 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] text-gray-400 uppercase font-black tracking-wider block">
              Panier Total / Clubber
            </span>
            <span className="text-base font-black text-emerald-400">
              {totalBasket.toFixed(2)} € <span className="text-xs text-gray-400 font-normal">/ invité</span>
            </span>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-gray-500 block">Coût RP</span>
            <span className="text-xs font-black text-white">0,00 € (100% net)</span>
          </div>
        </div>
      </div>

      {/* 3 Cartouches Chiffre d'Affaires Estimé */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Ce soir (en direct - basé sur ce qui arrive) */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-[#141724] to-[#0f111a] border border-[#24283b] relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Encaissé Ce Soir (Arrivées Réelles)
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {entriesToday} entré{entriesToday > 1 ? 's' : ''}
            </span>
          </div>
          <div className="text-3xl font-black text-white tracking-tight">
            {formatEuro(tonightRevenue)}
          </div>
          <div className="text-[11px] text-gray-400 mt-2 flex flex-col gap-0.5">
            <span className="flex items-center gap-1">
              <Shirt className="w-3 h-3 text-blue-400" />
              <span>Vestiaire ({cloakroomPrice.toFixed(2)}€) : <strong className="text-white">{formatEuro(entriesToday * cloakroomPrice)}</strong></span>
            </span>
            <span className="flex items-center gap-1">
              <Wine className="w-3 h-3 text-rose-400" />
              <span>Bar ({drinkSpendPerGuest.toFixed(2)}€) : <strong className="text-white">{formatEuro(entriesToday * drinkSpendPerGuest)}</strong></span>
            </span>
          </div>
        </div>

        {/* Potentiel Global Soirée (sur tous les inscrits) */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-[#181c2b] to-[#10131f] border border-[#e5b85c]/30 relative overflow-hidden shadow-lg shadow-[#e5b85c]/5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#e5b85c] uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Potentiel Inscrits Soirée</span>
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#e5b85c]/15 text-[#e5b85c] border border-[#e5b85c]/30">
              {registrationsTonight} pass réservé{registrationsTonight > 1 ? 's' : ''}
            </span>
          </div>
          <div className="text-3xl font-black text-[#e5b85c] tracking-tight">
            {formatEuro(potentialTonightRevenue)}
          </div>
          <div className="text-[11px] text-gray-300 mt-2 flex flex-col gap-0.5">
            <span className="flex items-center gap-1">
              <Shirt className="w-3 h-3 text-blue-400" />
              <span>Potentiel Vestiaire : <strong className="text-white">{formatEuro(registrationsTonight * cloakroomPrice)}</strong></span>
            </span>
            <span className="flex items-center gap-1">
              <Wine className="w-3 h-3 text-rose-400" />
              <span>Potentiel Bar : <strong className="text-white">{formatEuro(registrationsTonight * drinkSpendPerGuest)}</strong></span>
            </span>
          </div>
        </div>

        {/* Saison / Année Cumulée */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-[#141724] to-[#0f111a] border border-[#24283b] relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Recettes Saison ({new Date().getFullYear()})
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20">
              {entriesThisYear} entrées
            </span>
          </div>
          <div className="text-3xl font-black text-emerald-400 tracking-tight">
            {formatEuro(yearlyRevenue)}
          </div>
          <p className="text-[11px] text-gray-400 mt-2 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
            <span>Chiffre d&apos;affaires généré grâce au réseau des RP ASTRA</span>
          </p>
        </div>
      </div>

      {/* Mini-tableau de ventilation par soirée passée */}
      {pastEvents.length > 0 && (
        <div className="pt-2 border-t border-[#1d212f]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider">
              Recettes Indirectes sur les Dernières Soirées
            </h3>
            <span className="text-[11px] text-gray-400 font-medium">
              Calculé à {totalBasket.toFixed(2)} € / invité
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#232738] text-gray-400 uppercase text-[10px] tracking-wider">
                  <th className="pb-2.5 font-semibold">Soirée</th>
                  <th className="pb-2.5 font-semibold">Date</th>
                  <th className="pb-2.5 font-semibold text-center">Entrées RP</th>
                  <th className="pb-2.5 font-semibold text-right">Vestiaire Estimé</th>
                  <th className="pb-2.5 font-semibold text-right">Bar Estimé</th>
                  <th className="pb-2.5 font-semibold text-right">Total Recettes Indirectes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1b1f2e]">
                {pastEvents.slice(0, 5).map((ev) => {
                  const evVestiaire = Math.round(ev.entriesCount * cloakroomPrice);
                  const evBar = Math.round(ev.entriesCount * drinkSpendPerGuest);
                  const evTotal = evVestiaire + evBar;

                  return (
                    <tr key={ev.id} className="hover:bg-[#141722]/60 transition-colors">
                      <td className="py-2.5 font-bold text-white">
                        <Link href={`/admin/events/${ev.id}`} className="hover:text-[#e5b85c] transition-colors">
                          {ev.name}
                        </Link>
                      </td>
                      <td className="py-2.5 text-gray-400 capitalize whitespace-nowrap">
                        {formatFrenchDate(ev.event_date)}
                      </td>
                      <td className="py-2.5 text-center font-black text-[#e5b85c]">
                        {ev.entriesCount}
                      </td>
                      <td className="py-2.5 text-right font-mono text-blue-400">
                        {formatEuro(evVestiaire)}
                      </td>
                      <td className="py-2.5 text-right font-mono text-rose-400">
                        {formatEuro(evBar)}
                      </td>
                      <td className="py-2.5 text-right font-mono font-black text-emerald-400 whitespace-nowrap">
                        {formatEuro(evTotal)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
