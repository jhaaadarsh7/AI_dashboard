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
  hasBotResponse?: boolean;
};

function formatAgo(ts?: string | null) {
  if (!ts) return '—';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return '—';
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds} seconds ago`;
  if (minutes < 60) return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
  if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  return `${days} ${days === 1 ? 'day' : 'days'} ago`;
}

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
    if ((supabase as any).postgres && typeof (supabase as any).postgres.query === 'function') {
      const sql = `WITH last_user_messages AS (\n        SELECT \n            conversation_id,\n            user_name,\n            user_message,\n            bot_response,\n            timestamp,\n            ROW_NUMBER() OVER (\n                PARTITION BY conversation_id \n                ORDER BY timestamp DESC\n            ) AS rn\n        FROM chat_turns\n        WHERE conversation_id IS NOT NULL\n          AND user_message IS NOT NULL\n          AND bot_response IS NOT NULL\n      )\n      SELECT conversation_id, user_name, user_message AS last_user_message, timestamp\n      FROM last_user_messages\n      WHERE rn = 1\n      ORDER BY timestamp DESC\n      LIMIT ${limit};`;
      try {
        const res = await (supabase as any).postgres.query({ query: sql });
        const rows = res?.data || [];
        return rows.map((r: any, i: number) => ({
          id: r.id ?? i,
          conversation_id: String(r.conversation_id),
          user_name: r.user_name ?? null,
          // user_message column aliased to last_user_message in the query
          message: r.last_user_message ?? null,
          timestamp: r.timestamp ?? null,
          hasBotResponse: r.bot_response != null,
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
    // If we didn't reach the requested limit, fetch additional recent conversations
    // without requiring bot_response and fill the list (deduping by conversation_id).
    if (out.length < limit) {
      try {
        const { data: moreData, error: moreErr } = await supabase
          .from('chat_turns')
          .select('id,conversation_id,user_name,user_message,bot_response,timestamp')
          .order('timestamp', { ascending: false })
          .limit(limit * 10);
        if (!moreErr && Array.isArray(moreData)) {
          for (const r of moreData) {
            const cid = r.conversation_id;
            if (!cid) continue;
            const key = String(cid);
            if (seen.has(key)) continue;
            seen.add(key);
            out.push({
                  id: r.id ?? out.length,
                  conversation_id: key,
                  user_name: r.user_name ?? null,
                  message: (r.user_message) ?? null,
                  timestamp: r.timestamp ?? null,
                  hasBotResponse: r.bot_response != null,
                });
            if (out.length >= limit) break;
          }
        }
      } catch (e) {
        // ignore fill errors
      }
    }
    return out;
  } catch (err) {
    console.error('Error processing recent conversations rows:', serializeError(err), err);
    return [];
  }
}

export default async function RecentConversations() {
  const rows = await fetchRecentConversations(5);

  return (
    <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm hover:shadow-xl transition-all duration-200">
      <CardHeader className="pb-3 sm:pb-4 p-4 sm:p-6 lg:p-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="p-2 sm:p-3 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl shadow-lg">
              <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg sm:text-xl font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Recent Conversations
              </CardTitle>
              <p className="text-sm sm:text-base text-gray-500 flex items-center gap-2 mt-1">
                <User className="h-4 w-4" />
                Latest user messages
              </p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6 lg:p-8 pt-0">{rows.length === 0 ? (
          <div className="text-sm sm:text-base text-gray-500 text-center py-8 px-4 bg-gray-50/50 rounded-xl">
            <MessageCircle className="h-8 w-8 text-gray-300 mx-auto mb-3" />
            <p>No recent conversations found.</p>
          </div>
        ) : (
          rows.map((row) => (
            <Link key={row.conversation_id} href={`/users/${encodeURIComponent(row.conversation_id)}`} className="block">
              <div className="flex items-start space-x-3 sm:space-x-4 p-3 sm:p-4 rounded-xl hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-all duration-200 cursor-pointer border border-gray-100 hover:border-blue-200 hover:shadow-md group">
                <Avatar className="h-10 w-10 sm:h-12 sm:w-12 ring-2 ring-white shadow-lg flex-shrink-0 group-hover:ring-4 group-hover:ring-blue-100 transition-all duration-200">
                  <AvatarFallback className={`text-white text-sm sm:text-base font-semibold bg-gradient-to-br from-blue-400 to-blue-600 group-hover:scale-110 transition-transform duration-200`}>
                    {String(row.user_name || row.conversation_id).slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-2 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col gap-1 min-w-0 flex-1">
                      <p className="text-sm sm:text-base font-semibold text-gray-800 truncate group-hover:text-blue-600 transition-colors duration-200">{row.user_name ?? 'Anonymous'}</p>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-800 border border-indigo-200 truncate max-w-[140px] sm:max-w-none hover:bg-gradient-to-r hover:from-indigo-200 hover:to-purple-200 transition-all duration-200">
                          <MessageCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1 flex-shrink-0" />
                          <span className="truncate">{row.conversation_id}</span>
                        </span>
                      </div>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-400 flex items-center gap-1 flex-shrink-0">
                      <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">{formatAgo(row.timestamp)}</span>
                      <span className="sm:hidden">{formatAgo(row.timestamp)?.split(' ')[0]}</span>
                    </p>
                  </div>
                  <p className="text-sm sm:text-base text-gray-600 line-clamp-2 leading-relaxed group-hover:text-gray-700 transition-colors duration-200">{row.message ?? 'No message content'}</p>
                </div>
              </div>
            </Link>
          ))
        )}

        <div className="pt-4">
          <Link href="/users">
            <Button variant="outline" className="w-full gap-2 border-dashed border-2 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 hover:border-solid hover:border-indigo-300 text-sm sm:text-base py-3 transition-all duration-200">
              <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="hidden sm:inline">View All Conversations</span>
              <span className="sm:hidden">View All</span>
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

