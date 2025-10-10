"use client";

import React, { useMemo, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Conversation from '@/components/Conversation';
import { supabase } from '@/lib/supabaseClient';
import { ArrowLeft, MessageSquare, Users, Clock } from 'lucide-react';
import Link from 'next/link';

type ChatTurn = {
  id: string | number;
  timestamp: string | null;
  user_message?: string | null;
  bot_response?: string | null;
  user_name?: string | null;
};

export default function UserDetailPage() {
  const params = useParams();
  const rawId = params?.id ?? '';
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  
  const [initialMessages, setInitialMessages] = useState<ChatTurn[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('Unknown User');

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        console.log('Fetching messages for:', id);
        
        const { data, error } = await supabase
          .from('chat_turns')
          .select('id,timestamp,user_message,bot_response,user_name')
          .eq('conversation_id', id)
          .order('timestamp', { ascending: true })
          .limit(1000);

        if (error) {
          console.error('Failed to fetch messages from Supabase:', error);
          
          // Fallback to mock data
          const mockMessages: ChatTurn[] = [
            {
              id: 1,
              timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
              user_message: 'Hello, I need help with my order',
              bot_response: 'Hi! I\'d be happy to help you with your order. Can you provide your order number?',
              user_name: 'User'
            },
            {
              id: 2,
              timestamp: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
              user_message: 'My order number is #12345',
              bot_response: 'Let me look that up for you. I can see your order for 2 pizzas placed 30 minutes ago.',
              user_name: 'User'
            }
          ];
          
          setInitialMessages(mockMessages);
          setUserName('Demo User');
        } else {
          console.log('Found real messages:', data?.length || 0);
          const messages = (data ?? []) as ChatTurn[];
          setInitialMessages(messages);
          
          // Get user name from first message
          const firstMessage = messages.find(m => m.user_name);
          setUserName(firstMessage?.user_name || `User_${id.slice(-4)}`);
        }
      } catch (error) {
        console.error('Database error:', error);
        setInitialMessages([]);
        setUserName('Error User');
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [id]);

  // Get basic stats for header
  const messageCount = initialMessages.length;
  const lastMessageTime = initialMessages.length > 0 
    ? initialMessages[initialMessages.length - 1]?.timestamp 
    : null;

  if (loading) {
    return (
      <div className="min-h-screen p-6 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading conversation...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Mobile & Tablet Layout */}
        <div className="lg:hidden space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link href="/users" className="p-2 hover:bg-white rounded-lg transition-colors">
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </Link>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl text-white shadow-lg">
                  <MessageSquare className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{userName}</h1>
                  <p className="text-sm text-gray-600">Chat Session</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="px-3 py-1 bg-blue-100 text-blue-800 border-blue-200">
                {messageCount} messages
              </Badge>
              {lastMessageTime && (
                <Badge variant="outline" className="px-3 py-1 hidden sm:inline-flex">
                  Last: {new Date(lastMessageTime).toLocaleDateString()}
                </Badge>
              )}
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="border-0 shadow-sm bg-white/70 backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <MessageSquare className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{messageCount}</div>
                    <div className="text-sm text-gray-500">Total Messages</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-white/70 backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Users className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{userName}</div>
                    <div className="text-sm text-gray-500">User Name</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Conversation */}
          <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm">
            <Conversation conversationId={id} initial={initialMessages} />
          </Card>
        </div>

        {/* Desktop Layout */}
        <div className="hidden lg:flex gap-6 h-[calc(100vh-3rem)]">
          {/* Left Sidebar - User Info */}
          <div className="w-80 flex flex-col space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
              <Link href="/users" className="p-2 hover:bg-white rounded-lg transition-colors">
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </Link>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl text-white shadow-lg">
                  <MessageSquare className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{userName}</h1>
                  <p className="text-sm text-gray-600">Chat Session</p>
                </div>
              </div>
            </div>

            {/* User Stats Card */}
            <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm flex-1">
              <CardContent className="p-6 space-y-6">
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-2xl font-bold text-white">
                      {userName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">{userName}</h2>
                  <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
                    Active User
                  </Badge>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <MessageSquare className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Total Messages</div>
                        <div className="text-xl font-bold text-gray-900">{messageCount}</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Clock className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Last Active</div>
                        <div className="text-lg font-semibold text-gray-900">
                          {lastMessageTime ? new Date(lastMessageTime).toLocaleDateString() : 'N/A'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <div className="text-sm text-gray-500 mb-2">Session Details</div>
                  <div className="text-xs font-mono bg-gray-100 p-2 rounded border break-all">
                    ID: {id}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Side - Conversation */}
          <div className="flex-1 flex flex-col">
            <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm flex-1 overflow-hidden">
              <Conversation conversationId={id} initial={initialMessages} />
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
