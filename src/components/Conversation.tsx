"use client";

import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { getTimeAgo } from '@/lib/utils';
import { User, Bot, Clock, MessageCircle } from 'lucide-react';

type ChatTurn = {
  id: string | number;
  timestamp: string | null;
  user_message?: string | null;
  bot_response?: string | null;
  user_name?: string | null;
};

export default function Conversation({ conversationId, initial }: { conversationId: string; initial: ChatTurn[] }) {
  const [messages, setMessages] = useState<ChatTurn[]>(initial ?? []);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Scroll to bottom on new messages
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages.length]);

  useEffect(() => {
    const channel = supabase
      .channel(`conversation-${conversationId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_turns', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const newRow = payload.new as ChatTurn;
          setMessages((prev) => [...prev, newRow]);
        }
      )
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch (e) {
        // ignore
      }
    };
  }, [conversationId]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      'from-blue-500 to-blue-600',
      'from-purple-500 to-purple-600', 
      'from-green-500 to-green-600',
      'from-orange-500 to-orange-600',
      'from-pink-500 to-pink-600',
      'from-indigo-500 to-indigo-600',
      'from-teal-500 to-teal-600',
      'from-red-500 to-red-500'
    ];
    const index = name.length % colors.length;
    return colors[index];
  };

  return (
    <div className="h-[75vh] flex flex-col bg-gradient-to-br from-slate-50 to-blue-50 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 shadow-sm">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="p-1.5 sm:p-2 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg text-white">
            <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 text-sm sm:text-base">Conversation</h3>
            <p className="text-xs sm:text-sm text-gray-500 truncate max-w-[200px] sm:max-w-none">ID: {conversationId}</p>
          </div>
        </div>
        <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200 text-xs sm:text-sm self-start sm:self-auto">
          {messages.length} messages
        </Badge>
      </div>

      {/* Messages Container */}
      <div ref={listRef} className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-3 sm:space-y-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <div className="p-3 sm:p-4 bg-white rounded-full shadow-lg mb-3 sm:mb-4">
              <MessageCircle className="h-6 w-6 sm:h-8 sm:w-8 text-gray-400" />
            </div>
            <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">No messages yet</h3>
            <p className="text-sm sm:text-base text-gray-500 max-w-sm px-2">This conversation is empty. Messages will appear here when the conversation starts.</p>
          </div>
        ) : (
          messages.map((turn, index) => (
            <div key={String(turn.id)} className="space-y-3 sm:space-y-4 animate-in fade-in duration-300">
              {/* User Message */}
              {turn.user_message && (
                <div className="flex items-start gap-2 sm:gap-3 pr-4 sm:pr-8">
                  <Avatar className="h-6 w-6 sm:h-8 sm:w-8 ring-1 sm:ring-2 ring-white shadow-md flex-shrink-0">
                    <AvatarFallback className={`text-white font-medium bg-gradient-to-br ${getAvatarColor(turn.user_name || 'User')}`}>
                      <User className="h-3 w-3 sm:h-4 sm:w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 max-w-full sm:max-w-[75%] lg:max-w-[70%]">
                    <div className="bg-white rounded-2xl rounded-tl-md p-3 sm:p-4 shadow-sm border border-gray-100 message-bubble">
                      <div className="text-xs sm:text-sm text-gray-800 leading-relaxed whitespace-pre-wrap break-words">
                        {turn.user_message}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2 mt-1 sm:mt-2 text-xs text-gray-500 flex-wrap">
                      <Clock className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{getTimeAgo(turn.timestamp)}</span>
                      {turn.user_name && (
                        <>
                          <span className="hidden sm:inline">•</span>
                          <span className="font-medium truncate max-w-[100px] sm:max-w-none">{turn.user_name}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Assistant Response */}
              {turn.bot_response && (
                <div className="flex items-start gap-2 sm:gap-3 justify-end pl-4 sm:pl-8">
                  <div className="flex-1 max-w-full sm:max-w-[75%] lg:max-w-[70%] flex justify-end">
                    <div className="w-full">
                      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl rounded-tr-md p-3 sm:p-4 shadow-lg text-white message-bubble">
                        <div className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words">
                          {turn.bot_response}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 sm:gap-2 mt-1 sm:mt-2 text-xs text-gray-500 justify-end flex-wrap">
                        <span className="font-medium">Assistant</span>
                        <span className="hidden sm:inline">•</span>
                        <Clock className="h-3 w-3 flex-shrink-0" />
                        <span>{getTimeAgo(turn.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                  <Avatar className="h-6 w-6 sm:h-8 sm:w-8 ring-1 sm:ring-2 ring-white shadow-md flex-shrink-0">
                    <AvatarFallback className="bg-gradient-to-br from-indigo-600 to-purple-600 text-white">
                      <Bot className="h-3 w-3 sm:h-4 sm:w-4" />
                    </AvatarFallback>
                  </Avatar>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
