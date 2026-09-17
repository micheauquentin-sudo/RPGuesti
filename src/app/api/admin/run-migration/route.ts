import { NextResponse } from 'next/server';
import pg from 'pg';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const EXPECTED_SECRET = 'astra-db-migration-secret-2026-secure';

export async function POST(request: Request) {
  const secret = request.headers.get('x-migration-secret');
  if (secret !== EXPECTED_SECRET) {
    return NextResponse.json({ error: 'Accès non autorisé' }, { status: 401 });
  }

  const connectionString = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;
  if (!connectionString) {
    return NextResponse.json(
      { error: 'POSTGRES_URL ou POSTGRES_URL_NON_POOLING non configuré' },
      { status: 500 }
    );
  }

  // Supabase cert chain fix
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

  const cleanUrl = connectionString.split('?')[0];
  const client = new pg.Client({
    connectionString: cleanUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();

    // 1. Appliquer les index
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_guests_phone
        ON public.guests(phone)
        WHERE phone IS NOT NULL;
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_guests_names
        ON public.guests(lower(first_name), lower(last_name));
    `);

    // 2. Vérifier les tables
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    // 3. Vérifier RLS
    const rlsRes = await client.query(`
      SELECT tablename, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `);

    // 4. Vérifier les index sur guests
    const indexesRes = await client.query(`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE schemaname = 'public' AND tablename = 'guests'
      ORDER BY indexname;
    `);

    // 5. Compter les lignes par table
    const tableNames = ['profiles', 'events', 'promoters', 'event_promoters', 'guests', 'registrations', 'entries', 'audit_logs'];
    const counts: Record<string, number> = {};
    for (const tbl of tableNames) {
      try {
        const countRes = await client.query(`SELECT COUNT(*) as cnt FROM public.${tbl};`);
        counts[tbl] = parseInt(countRes.rows[0].cnt, 10);
      } catch {
        counts[tbl] = -1;
      }
    }

    // 6. Vérifier les buckets de stockage
    let buckets: { id: string; name: string; public: boolean }[] = [];
    try {
      const bucketsRes = await client.query(`SELECT id, name, public FROM storage.buckets;`);
      buckets = bucketsRes.rows;
    } catch {}

    // 7. Vérifier les fonctions RPC
    const rpcRes = await client.query(`
      SELECT routine_name 
      FROM information_schema.routines 
      WHERE routine_schema = 'public' 
      ORDER BY routine_name;
    `);

    await client.end();

    return NextResponse.json({
      success: true,
      applied_migration: '20260918000001_add_performance_indexes.sql',
      tables: tablesRes.rows.map(r => r.table_name),
      rls: rlsRes.rows.map(r => ({ table: r.tablename, enabled: r.rowsecurity })),
      indexes_guests: indexesRes.rows.map(r => ({ name: r.indexname, def: r.indexdef })),
      row_counts: counts,
      buckets,
      rpc_functions: rpcRes.rows.map(r => r.routine_name),
    });
  } catch (err: unknown) {
    const error = err as Error;
    await client.end().catch(() => {});
    return NextResponse.json(
      { error: error.message || 'Erreur lors de la migration' },
      { status: 500 }
    );
  }
}
