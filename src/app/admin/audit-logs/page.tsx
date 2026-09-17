'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { type AuditLog } from '@/lib/types';
import { formatFrenchDate } from '@/lib/utils';
import { FileText, Shield, Search, Sparkles } from 'lucide-react';

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const supabase = createClient();

  useEffect(() => {
    async function loadLogs() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('audit_logs')
          .select(`
            id,
            user_id,
            action,
            entity_type,
            entity_id,
            metadata,
            created_at,
            user_profile:profiles(first_name, last_name, email)
          `)
          .order('created_at', { ascending: false })
          .limit(100);

        if (error) throw error;

        const formatted: AuditLog[] = (data || []).map((l) => ({
          id: l.id,
          user_id: l.user_id,
          action: l.action,
          entity_type: l.entity_type,
          entity_id: l.entity_id,
          metadata: l.metadata as Record<string, unknown>,
          created_at: l.created_at,
          user_profile: Array.isArray(l.user_profile) ? l.user_profile[0] : (l.user_profile as unknown as AuditLog['user_profile']),
        }));

        setLogs(formatted);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadLogs();
  }, []);

  const filtered = logs.filter((l) => {
    const q = searchQuery.toLowerCase();
    const action = l.action.toLowerCase();
    const type = l.entity_type.toLowerCase();
    const meta = JSON.stringify(l.metadata).toLowerCase();
    return action.includes(q) || type.includes(q) || meta.includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-wider">
            Journal d&apos;Audit & Sécurité
          </h1>
          <p className="text-gray-400 text-xs sm:text-sm mt-1">
            Traçabilité des scans, créations et modifications sur le système ASTRA.
          </p>
        </div>

        <div className="relative max-w-xs w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filtrer les actions..."
            className="w-full pl-9 pr-3 py-2 bg-[#0f1118] border border-[#1d212f] rounded-xl text-white text-xs placeholder-gray-500 focus:outline-none focus:border-[#e5b85c]"
          />
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-[#0f1118] border border-[#1d212f] rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#1d212f] bg-[#121520] text-gray-400 uppercase text-[10px] tracking-wider">
                <th className="py-3.5 px-5 font-semibold">Horodatage</th>
                <th className="py-3.5 px-4 font-semibold">Action</th>
                <th className="py-3.5 px-4 font-semibold">Entité</th>
                <th className="py-3.5 px-4 font-semibold">Détails & Contexte</th>
                <th className="py-3.5 px-5 font-semibold text-right">Opérateur</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#181b28]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-500">
                    Chargement des journaux de sécurité...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-500">
                    Aucun événement d&apos;audit enregistré.
                  </td>
                </tr>
              ) : (
                filtered.map((l) => {
                  const logDate = new Date(l.created_at);
                  const formattedTime = logDate.toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    timeZone: 'Europe/Paris',
                  });

                  return (
                    <tr key={l.id} className="hover:bg-[#141722]/80 transition-colors">
                      <td className="py-3.5 px-5 font-mono text-gray-300 text-[11px]">
                        {formattedTime}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-block px-2 py-0.5 rounded-md font-mono text-[10px] font-bold uppercase bg-[#1a1e2d] text-[#e5b85c] border border-[#2b3149]">
                          {l.action}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-gray-400 uppercase text-[10px] font-semibold">
                        {l.entity_type}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[11px] text-gray-300 max-w-xs truncate">
                        {JSON.stringify(l.metadata)}
                      </td>

                      <td className="py-3.5 px-5 text-right text-gray-400">
                        {l.user_profile
                          ? `${l.user_profile.first_name || ''} ${l.user_profile.last_name || ''}`.trim() || l.user_profile.email
                          : 'Système / Invité'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
