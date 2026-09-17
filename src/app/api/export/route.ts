import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateCsvContent, calculateAttendanceRate } from '@/lib/utils';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'entries';
    const eventId = searchParams.get('event_id');
    const promoterId = searchParams.get('promoter_id');
    const year = searchParams.get('year') || new Date().getFullYear().toString();
    const month = searchParams.get('month') || 'all';

    const supabase = createAdminClient();

    // 1. Export du journal des entrées scannées
    if (type === 'entries') {
      let query = supabase
        .from('entries')
        .select(`
          scanned_at,
          status,
          guest:guests(first_name, last_name, phone, instagram_handle),
          promoter:promoters(first_name, last_name, slug),
          event:events(name, event_date),
          scanner:profiles(first_name, last_name, email)
        `)
        .order('scanned_at', { ascending: false });

      if (eventId && eventId !== 'all') query = query.eq('event_id', eventId);
      if (promoterId && promoterId !== 'all') query = query.eq('promoter_id', promoterId);

      const { data } = await query;

      const headers = [
        'Date & Heure du Scan',
        'Nom Invité',
        'Prénom Invité',
        'Téléphone',
        'Instagram',
        'RP Crédité',
        'Soirée ASTRA',
        'Date Soirée',
        'Statut Entrée',
        'Scanné par',
      ];

      const rows = (data || []).map((e) => {
        const g = Array.isArray(e.guest) ? e.guest[0] : e.guest;
        const p = Array.isArray(e.promoter) ? e.promoter[0] : e.promoter;
        const ev = Array.isArray(e.event) ? e.event[0] : e.event;
        const sc = Array.isArray(e.scanner) ? e.scanner[0] : e.scanner;

        const scanTime = new Date(e.scanned_at).toLocaleString('fr-FR', {
          timeZone: 'Europe/Paris',
        });

        return [
          scanTime,
          g?.last_name || '',
          g?.first_name || '',
          g?.phone || '',
          g?.instagram_handle ? `@${g.instagram_handle}` : '',
          p ? `${p.first_name} ${p.last_name}` : '',
          ev?.name || '',
          ev?.event_date || '',
          e.status === 'valid' ? 'Validée' : 'Annulée',
          sc ? `${sc.first_name || ''} ${sc.last_name || ''}`.trim() || sc.email : 'Staff',
        ];
      });

      const csv = generateCsvContent(headers, rows);
      const filename = `ASTRA-ENTREES-${new Date().toISOString().split('T')[0]}.csv`;

      return new Response(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    // 2. Export du classement annuel / mensuel
    if (type === 'leaderboard') {
      const { data: promoters } = await supabase.from('promoters').select('*');
      const startYear = `${year}-01-01T00:00:00Z`;
      const endYear = `${year}-12-31T23:59:59Z`;

      let entryQuery = supabase
        .from('entries')
        .select('promoter_id, scanned_at')
        .eq('status', 'valid')
        .gte('scanned_at', startYear)
        .lte('scanned_at', endYear);

      let regQuery = supabase
        .from('registrations')
        .select('promoter_id, registered_at')
        .eq('status', 'registered')
        .gte('registered_at', startYear)
        .lte('registered_at', endYear);

      if (month !== 'all') {
        const m = parseInt(month);
        const startMonth = new Date(Date.UTC(parseInt(year), m, 1)).toISOString();
        const endMonth = new Date(Date.UTC(parseInt(year), m + 1, 0, 23, 59, 59)).toISOString();
        entryQuery = entryQuery.gte('scanned_at', startMonth).lte('scanned_at', endMonth);
        regQuery = regQuery.gte('registered_at', startMonth).lte('registered_at', endMonth);
      }

      const { data: entries } = await entryQuery;
      const { data: regs } = await regQuery;

      const entryMap: Record<string, number> = {};
      const regMap: Record<string, number> = {};

      (entries || []).forEach((e) => {
        entryMap[e.promoter_id] = (entryMap[e.promoter_id] || 0) + 1;
      });
      (regs || []).forEach((r) => {
        regMap[r.promoter_id] = (regMap[r.promoter_id] || 0) + 1;
      });

      const list = (promoters || []).map((p) => {
        const eCount = entryMap[p.id] || 0;
        const rCount = regMap[p.id] || 0;
        return {
          name: `${p.first_name} ${p.last_name}`,
          slug: p.slug,
          instagram: p.instagram_handle ? `@${p.instagram_handle}` : '',
          entries: eCount,
          registrations: rCount,
          rate: calculateAttendanceRate(eCount, rCount),
        };
      });

      list.sort((a, b) => b.entries - a.entries);

      const headers = [
        'Rang',
        'Nom du Promoteur RP',
        'Slug URL',
        'Instagram',
        'Entrées Réelles (Points Concours)',
        'Inscriptions Demandées',
        'Taux de Présence (%)',
      ];

      const rows = list.map((item, idx) => [
        idx + 1,
        item.name,
        item.slug,
        item.instagram,
        item.entries,
        item.registrations,
        `${item.rate}%`,
      ]);

      const csv = generateCsvContent(headers, rows);
      const filename = `ASTRA-CLASSEMENT-${year}${month !== 'all' ? `-M${month}` : ''}.csv`;

      return new Response(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    return NextResponse.json({ error: 'Type d’export non supporté' }, { status: 400 });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error?.message || 'Erreur export' }, { status: 500 });
  }
}
