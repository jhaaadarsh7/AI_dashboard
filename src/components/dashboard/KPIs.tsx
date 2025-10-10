import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Users } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

type ChatRow = { conversation_id: string | number };


async function fetchTotalUsers() {
  // Prefer a server-side COUNT(DISTINCT) SQL query for accuracy and performance.
  try {
    // @ts-ignore
    if (supabase.postgres && typeof supabase.postgres.query === 'function') {
  // @ts-ignore
  const sqlRes = await supabase.postgres.query({ query: `SELECT COUNT(DISTINCT conversation_id) AS cnt FROM chat_turns WHERE bot_response IS NOT NULL` });
      // @ts-ignore
      const row = sqlRes?.data?.[0];
      const raw = row ? (row.cnt ?? Object.values(row)[0]) : undefined;
      const count = raw !== undefined ? Number(raw) : undefined;
      if (count !== undefined && !Number.isNaN(count)) return { count };
    }
  } catch (err) {
    console.warn('Postgres COUNT(DISTINCT) failed, falling back to client dedupe:', String(err));
  }

  // Fallback: fetch conversation_id rows and deduplicate in Node.
  const { data, error } = await supabase.from('chat_turns').select('conversation_id').not('bot_response', 'is', null);
  if (error) {
    console.error('Supabase error fetching chat_turns', error);
    return { count: 0, error };
  }
  const set = new Set<string>();
  for (const row of (data || []) as ChatRow[]) {
    if (row == null) continue;
    const raw = row.conversation_id;
    if (raw == null) continue;
    const s = String(raw).trim();
    if (s === '') continue;
    set.add(s);
  }
  return { count: set.size };
}


async function fetchTotalMessages() {
  // Prefer server-side SQL COUNT(*) for total messages where conversation_id IS NOT NULL
  try {
    // @ts-ignore
    if (supabase.postgres && typeof supabase.postgres.query === 'function') {
  // @ts-ignore
  const sqlRes = await supabase.postgres.query({ query: `SELECT COUNT(*) AS cnt FROM chat_turns WHERE conversation_id IS NOT NULL AND bot_response IS NOT NULL` });
      // @ts-ignore
      const row = sqlRes?.data?.[0];
      const raw = row ? (row.cnt ?? Object.values(row)[0]) : undefined;
      const count = raw !== undefined ? Number(raw) : undefined;
      if (count !== undefined && !Number.isNaN(count)) return { count };
    }
  } catch (err) {
    console.warn('Postgres COUNT(*) for total messages failed, falling back:', String(err));
  }

  // Fallback: query rows and count client-side
  try {
  const { data, error } = await supabase.from('chat_turns').select('conversation_id').not('conversation_id', 'is', null).not('bot_response', 'is', null);
    if (error) {
      console.error('Supabase error fetching chat_turns', error);
      return { count: 0, error };
    }
    return { count: data?.length || 0 };
  } catch (err) {
    console.error('Error fetching total messages', err);
    return { count: 0, error: err };
  }

}

async function fetchMessagesLast30Days() {
  // Primary: run the exact SQL the user provided, using `timestamp` column.
  try {
    // Prefer explicit SQL using supabase.postgres.query
    // @ts-ignore
    if (supabase.postgres && typeof supabase.postgres.query === 'function') {
  // @ts-ignore
  const sql = `SELECT COUNT(conversation_id) AS total_conversations_last_30_days FROM chat_turns WHERE conversation_id IS NOT NULL AND bot_response IS NOT NULL AND timestamp >= NOW() - INTERVAL '30 days'`;
      // @ts-ignore
      const sqlRes = await supabase.postgres.query({ query: sql });
      // @ts-ignore
      const row = sqlRes?.data?.[0];
      const raw = row ? (row.total_conversations_last_30_days ?? Object.values(row)[0]) : undefined;
      const count = raw !== undefined ? Number(raw) : undefined;
      if (count !== undefined && !Number.isNaN(count)) return { count };
      // If SQL returned but couldn't parse, continue to fallbacks
    }
  } catch (err) {
    // SQL attempt failed (maybe column doesn't exist or API missing) — fall through to fallbacks
    // eslint-disable-next-line no-console
    console.warn('SQL 30d query failed:', String(err));
  }

  // Fallback 1: try PostgREST exact count with a gte filter on timestamp
  try {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  // @ts-ignore
  const res = await supabase.from('chat_turns').select('conversation_id', { count: 'exact' }).not('conversation_id', 'is', null).not('bot_response', 'is', null).gte('timestamp', cutoff);
    // @ts-ignore
    if (res?.count !== undefined) return { count: res.count };
  } catch (err) {
    // ignore and continue to client-side fallback
    // eslint-disable-next-line no-console
    console.warn('PostgREST 30d attempt failed:', String(err));
  }

  // Fallback 2: fetch rows and detect timestamp-like column, then filter client-side
  try {
    const { data, error } = await supabase.from('chat_turns').select('*').limit(20000);
    if (error) {
      console.error('Supabase error fetching chat_turns for 30d count', error);
      return { count: 0, error };
    }
    const rows = data || [];
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Attempt to detect a timestamp column in the first row
    let tsCol: string | null = null;
    if (rows.length > 0) {
      const sample = rows[0] as Record<string, any>;
      const candidates = ['timestamp', 'created_at', 'inserted_at', 'ts'];
      for (const c of candidates) if (c in sample) { tsCol = c; break; }
      if (!tsCol) {
        for (const k of Object.keys(sample)) {
          const v = sample[k];
          if (typeof v === 'string' && v.length >= 10 && !Number.isNaN(Date.parse(v))) { tsCol = k; break; }
        }
      }
    }

    if (!tsCol) return { count: 0, error: new Error('No timestamp column found') };

    let cnt = 0;
    for (const r of rows) {
      const raw = (r as any)[tsCol];
      if (!raw) continue;
      // Exclude rows where bot_response is null
      if ((r as any).bot_response == null) continue;
      const d = new Date(raw);
      if (isNaN(d.getTime())) continue;
      if (d >= cutoff && (r as any).conversation_id != null) cnt += 1;
    }
    return { count: cnt };
  } catch (err) {
    console.error('Error in fallback 30d messages fetch', err);
    return { count: 0, error: err };
  }
}


// growth calculation removed per user request

export default async function KPIs() {
  // total distinct users (all time)
  const totalRes = await fetchTotalUsers();
  const totalUsers = totalRes.error ? null : totalRes.count;

  // total messages
  const totalMsgRes = await fetchTotalMessages();
  const totalMessages = totalMsgRes.error ? null : totalMsgRes.count;

  // messages in last 30 days
  const last30Res = await fetchMessagesLast30Days();
  const messages30d = last30Res.error ? null : last30Res.count;

  return (
    <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white hover:shadow-xl transition-all duration-200 transform hover:scale-105">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 sm:px-6 pt-4 sm:pt-6">
          <CardTitle className="text-sm font-medium text-blue-100">Total Chats</CardTitle>
          <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
            <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
          </div>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
          <div className="text-2xl sm:text-3xl font-bold">{totalMessages ?? '—'}</div>
          <p className="text-xs sm:text-sm text-blue-100 mt-1">All conversations</p>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-500 to-emerald-600 text-white hover:shadow-xl transition-all duration-200 transform hover:scale-105">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 sm:px-6 pt-4 sm:pt-6">
          <CardTitle className="text-sm font-medium text-emerald-100">Total Users</CardTitle>
          <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
            <Users className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
          </div>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
          <div className="text-2xl sm:text-3xl font-bold">{totalUsers ?? '—'}</div>
          <p className="text-xs sm:text-sm text-emerald-100 mt-1">Unique conversations</p>
          {/* growth removed per user request */}
        </CardContent>
      </Card>

      <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white hover:shadow-xl transition-all duration-200 transform hover:scale-105 sm:col-span-2 lg:col-span-1">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 sm:px-6 pt-4 sm:pt-6">
          <CardTitle className="text-sm font-medium text-purple-100">Messages (30d)</CardTitle>
          <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
            <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
          </div>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
          <div className="text-2xl sm:text-3xl font-bold">{messages30d ?? '—'}</div>
          <p className="text-xs sm:text-sm text-purple-100 mt-1">Recent activity</p>
        </CardContent>
      </Card>
    </div>
  );
}
