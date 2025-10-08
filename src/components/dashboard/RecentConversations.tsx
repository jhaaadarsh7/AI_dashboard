import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageCircle, Clock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabaseClient';

type RecentRow = {
  id: number;
  conversation_id: string;
  user_name?: string | null;
  message?: string | null;
  timestamp?: string | null;
};

async function fetchRecentConversations(limit = 4): Promise<RecentRow[]> {
  const serializeError = (err: any) => {
    try {
      if (err == null) return String(err);
      if (typeof err === 'string') return err;
      if (err instanceof Error) return err.stack || err.message;
      return JSON.stringify(err);
    } catch (e) {
      return String(err);
    }
  };

  // First try: explicit SQL using the windowed query provided by the user
  try {
    // @ts-ignore
    if (supabase.postgres && typeof supabase.postgres.query === 'function') {
  const sql = `WITH last_user_messages AS (\n        SELECT \n            conversation_id,\n            user_name,\n            user_message,\n            bot_response,\n            timestamp,\n            ROW_NUMBER() OVER (\n                PARTITION BY conversation_id \n                ORDER BY timestamp DESC\n            ) AS rn\n        FROM chat_turns\n        WHERE conversation_id IS NOT NULL\n          AND user_message IS NOT NULL\n          AND bot_response IS NOT NULL\n      )\n      SELECT conversation_id, user_name, user_message AS last_user_message, timestamp\n      FROM last_user_messages\n      WHERE rn = 1\n      ORDER BY timestamp DESC\n      LIMIT ${limit};`;
      try {
        // @ts-ignore
        const res = await supabase.postgres.query({ query: sql });
        // @ts-ignore
        const rows = res?.data || [];
        return rows.map((r: any, i: number) => ({
          id: r.id ?? i,
          conversation_id: String(r.conversation_id),
          user_name: r.user_name ?? null,
          // user_message column aliased to last_user_message in the query
          message: r.last_user_message ?? null,
          timestamp: r.timestamp ?? null,
        }));
      } catch (sqlErr) {
        console.warn('SQL recent conversations failed, falling back to PostgREST:', serializeError(sqlErr));
        // fall through to PostgREST fallback
      }
    }
  } catch (err) {
    console.warn('Postgres check failed, proceeding to fallback:', serializeError(err));
  }

  // Fallback: use PostgREST to fetch recent rows, prefer ordering by timestamp but
  // gracefully retry without ordering if timestamp doesn't exist.
  let rows: any[] = [];
  try {
  const { data, error } = await supabase.from('chat_turns').select('id,conversation_id,user_name,user_message,bot_response,timestamp').not('bot_response', 'is', null).order('timestamp', { ascending: false }).limit(limit * 3);
    if (error) throw error;
    rows = (data || []) as any[];
  } catch (err) {
    // If timestamp column is missing or order failed, retry without ordering
    const errStr = serializeError(err);
    console.warn('PostgREST ordered fetch failed, retrying without order:', errStr);
    try {
  const { data, error } = await supabase.from('chat_turns').select('id,conversation_id,user_name,user_message,bot_response,timestamp').not('bot_response', 'is', null).limit(limit * 3);
      if (error) throw error;
      rows = (data || []) as any[];
    } catch (err2) {
      console.error('Error fetching recent conversations (PostgREST fallback):', serializeError(err2), err2);
      return [];
    }
  }

  // Deduplicate by conversation_id, keeping the first occurrence (which will be the most recent if ordered)
  try {
    const seen = new Set<string>();
    const out: RecentRow[] = [];
    for (const r of rows) {
      const cid = r.conversation_id;
      if (!cid) continue;
      // ensure we only include rows where bot_response exists
      if (r.bot_response == null) continue;
      const key = String(cid);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        id: r.id ?? out.length,
        conversation_id: key,
        user_name: r.user_name ?? null,
        // map DB column user_message to our message field
        message: (r.user_message ?? r.message) ?? null,
        timestamp: r.timestamp ?? null,
      });
      if (out.length >= limit) break;
    }
    return out;
  } catch (err) {
    console.error('Error processing recent conversations rows:', serializeError(err), err);
    return [];
  }
}

export default async function RecentConversations() {
  const rows = await fetchRecentConversations(10);

  return (
    <Card className="border-0 shadow-lg bg-white">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg">
              <MessageCircle className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Recent Conversations
              </CardTitle>
              <p className="text-sm text-gray-500 flex items-center gap-1">
                <User className="h-3 w-3" />
                Latest user messages
              </p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {rows.length === 0 ? (
          <div className="text-sm text-gray-500">No recent conversations found.</div>
        ) : (
          rows.map((row) => (
            <Link key={row.conversation_id} href={`/users/${encodeURIComponent(row.conversation_id)}`} className="block">
              <div className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-all duration-200 cursor-pointer border border-gray-100">
                <Avatar className="h-10 w-10 ring-2 ring-white shadow-md">
                  <AvatarFallback className={`text-white text-sm font-semibold bg-gradient-to-br from-blue-400 to-blue-600`}>
                    {String(row.user_name || row.conversation_id).slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex flex-col gap-1">
                      <p className="text-sm font-semibold text-gray-800">{row.user_name ?? 'Anonymous'}</p>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-800 border border-indigo-200">
                          <MessageCircle className="h-3 w-3 mr-1" />
                          {row.conversation_id}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                      <Clock className="h-3 w-3" />
                      {row.timestamp ? new Date(row.timestamp).toLocaleString() : '—'}
                    </p>
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">{row.message ?? 'No message content'}</p>
                </div>
              </div>
            </Link>
          ))
        )}

        <div className="pt-2">
          <Link href="/users">
            <Button variant="outline" className="w-full gap-2 border-dashed border-2 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50">
              <MessageCircle className="h-4 w-4" />
              View All Conversations
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

