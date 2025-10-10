"use client";

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Search, MessageSquare, Clock, User, ExternalLink, RefreshCw, AlertCircle, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

type UserData = {
  conversation_id: string;
  user_name: string | null;
  message_count: number;
  last_seen: string | null;
  last_message: string | null;
};

export default function UsersPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'recent' | 'messages'>('recent');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 Fetching dynamic user list...');

      // Dynamic query to get aggregated user data
      const { data, error } = await supabase
        .from('chat_turns')
        .select(`
          conversation_id,
          user_name,
          timestamp,
          user_message,
          bot_response
        `)
        .order('timestamp', { ascending: false });

      if (error) {
        console.error('❌ Supabase error:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        console.log('📝 No real data found, using mock data...');
        
        // Generate dynamic mock data with varied timestamps
        const mockUsers: UserData[] = Array.from({ length: 8 }, (_, i) => ({
          conversation_id: `conv_${Date.now()}_${i}`,
          user_name: [
            'Alex Johnson', 'Sarah Chen', 'Mike Rodriguez', 'Emma Thompson',
            'David Kim', 'Lisa Wang', 'James Wilson', 'Maria Garcia'
          ][i],
          message_count: Math.floor(Math.random() * 20) + 1,
          last_seen: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
          last_message: [
            'Thanks for the help!', 'When will my order arrive?', 'I need to update my address',
            'Can you help me with billing?', 'How do I reset my password?', 'Is my package shipped?',
            'I want to return an item', 'What are your business hours?'
          ][i]
        }));
        
        setUsers(mockUsers);
        setError('Using demo data (no database records found)');
        return;
      }

      console.log(`📊 Processing ${data.length} chat records...`);

      // Dynamic aggregation of conversation data
      const conversationMap = new Map<string, {
        conversation_id: string;
        user_name: string;
        messages: Array<{ timestamp: string; user_message: string; bot_response: string }>;
      }>();

      // Group messages by conversation
      data.forEach((record: any) => {
        if (!record.conversation_id) return;
        
        const convId = String(record.conversation_id);
        const userName = record.user_name || `User_${convId.slice(-4)}`;
        
        if (!conversationMap.has(convId)) {
          conversationMap.set(convId, {
            conversation_id: convId,
            user_name: userName,
            messages: []
          });
        }
        
        const conv = conversationMap.get(convId)!;
        conv.messages.push({
          timestamp: record.timestamp,
          user_message: record.user_message || '',
          bot_response: record.bot_response || ''
        });
      });

      // Convert to UserData format with dynamic calculations
      const dynamicUsers: UserData[] = Array.from(conversationMap.values()).map(conv => {
        // Sort messages by timestamp to get the latest
        const sortedMessages = conv.messages.sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        
        const latestMessage = sortedMessages[0];
        const lastMessage = latestMessage?.user_message || 'No recent message';
        
        return {
          conversation_id: conv.conversation_id,
          user_name: conv.user_name,
          message_count: conv.messages.length,
          last_seen: latestMessage?.timestamp || new Date().toISOString(),
          last_message: lastMessage.length > 50 ? lastMessage.substring(0, 50) + '...' : lastMessage
        };
      });

      // Sort by most recent activity
      dynamicUsers.sort((a, b) => 
        new Date(b.last_seen || 0).getTime() - new Date(a.last_seen || 0).getTime()
      );

      console.log(`✅ Found ${dynamicUsers.length} unique conversations`);
      setUsers(dynamicUsers);
      
      if (dynamicUsers.length === 0) {
        setError('No conversations found in database');
      }

      setLastUpdated(new Date());

    } catch (err) {
      console.error('💥 Error fetching users:', err);
      
      // Generate dynamic fallback data
      const fallbackUsers: UserData[] = Array.from({ length: 6 }, (_, i) => ({
        conversation_id: `fallback_${Date.now()}_${i}`,
        user_name: [
          'Demo User A', 'Demo User B', 'Demo User C', 
          'Demo User D', 'Demo User E', 'Demo User F'
        ][i],
        message_count: Math.floor(Math.random() * 15) + 1,
        last_seen: new Date(Date.now() - Math.random() * 2 * 24 * 60 * 60 * 1000).toISOString(),
        last_message: [
          'Hello, I need assistance', 'Can you help me?', 'I have a question',
          'Thank you for your help', 'Is there an update?', 'When can I expect delivery?'
        ][i]
      }));
      
      setUsers(fallbackUsers);
      setError(`Database connection failed - showing demo data`);
      setLastUpdated(new Date());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();

    if (!autoRefresh) {
      console.log('🔕 Auto-refresh disabled');
      return;
    }

    // Set up real-time subscription for dynamic updates
    console.log('🔔 Setting up real-time subscription...');
    
    const subscription = supabase
      .channel('user-list-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT', // Only listen to new messages
          schema: 'public',
          table: 'chat_turns'
        },
        (payload) => {
          console.log('🔄 New message received, updating list...');
          
          // Only refresh for new messages
          setTimeout(() => {
            fetchUsers();
          }, 1000); // Longer delay to batch updates
        }
      )
      .subscribe((status) => {
        console.log('📡 Subscription status:', status);
      });

    // Cleanup on unmount
    return () => {
      console.log('🧹 Cleaning up subscriptions...');
      subscription.unsubscribe();
    };
  }, [autoRefresh]);

  const filteredAndSortedUsers = useMemo(() => {
    let filtered = users.filter(u => {
      const name = u.user_name ?? u.conversation_id;
      return name.toLowerCase().includes(query.toLowerCase()) ||
             u.conversation_id.toLowerCase().includes(query.toLowerCase());
    });

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          const nameA = a.user_name ?? a.conversation_id;
          const nameB = b.user_name ?? b.conversation_id;
          return nameA.localeCompare(nameB);
        case 'recent':
          const timeA = a.last_seen ? new Date(a.last_seen).getTime() : 0;
          const timeB = b.last_seen ? new Date(b.last_seen).getTime() : 0;
          return timeB - timeA;
        case 'messages':
          return b.message_count - a.message_count;
        default:
          return 0;
      }
    });
  }, [users, query, sortBy]);

  const getTimeAgo = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const getActivityStatus = (dateString: string | null) => {
    if (!dateString) return { status: 'offline', color: 'bg-gray-400', label: 'Offline' };
    
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 5) return { status: 'online', color: 'bg-green-500', label: 'Online' };
    if (diffInMinutes < 30) return { status: 'recent', color: 'bg-blue-500', label: 'Recently Active' };
    if (diffInMinutes < 1440) return { status: 'today', color: 'bg-blue-500', label: 'Active Today' };
    return { status: 'offline', color: 'bg-gray-400', label: 'Offline' };
  };

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
      'from-red-500 to-red-600'
    ];
    const index = name.length % colors.length;
    return colors[index];
  };

  if (loading) {
    return (
      <div className="min-h-screen p-3 sm:p-4 lg:p-6 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6">
          <div className="flex items-center justify-center py-12 sm:py-20">
            <div className="text-center">
              <RefreshCw className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-blue-600 mx-auto mb-3 sm:mb-4" />
              <p className="text-sm sm:text-base text-gray-600">Loading users...</p>
              <p className="text-xs text-gray-500 mt-2">Check browser console for debug info</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Debug info when not loading
  if (!loading && users.length === 0 && !error) {
    return (
      <div className="min-h-screen p-3 sm:p-4 lg:p-6 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6">
          <div className="flex items-center justify-center py-12 sm:py-20">
            <div className="text-center max-w-md">
              <AlertCircle className="h-6 w-6 sm:h-8 sm:w-8 text-gray-600 mx-auto mb-3 sm:mb-4" />
              <p className="text-sm sm:text-base text-gray-600 mb-2">No users found</p>
              <p className="text-xs text-gray-500 mb-4">This could mean:</p>
              <ul className="text-xs text-gray-500 text-left space-y-1 mb-4">
                <li>• No data in the chat_turns table</li>
                <li>• Database connection issues</li>
                <li>• All users filtered out</li>
              </ul>
              <Button onClick={fetchUsers} className="mt-4">
                Retry
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-400/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/4 left-1/3 w-64 h-64 bg-indigo-400/5 rounded-full blur-3xl"></div>
      </div>
      
      <div className="relative max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 lg:space-y-8">
        {/* Enhanced Responsive Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              {/* Back Arrow Button */}
              <Link href="/" className="group">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="bg-white/70 backdrop-blur-sm border-gray-200 hover:bg-white hover:shadow-md transition-all duration-200 group-hover:scale-105"
                >
                  <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-0.5 transition-transform duration-200" />
                  <span className="hidden sm:inline">Back to Dashboard</span>
                  <span className="sm:hidden">Back</span>
                </Button>
              </Link>
              
              <div className="p-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-lg relative">
                <Users className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
                {autoRefresh && (
                  <div className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full animate-pulse border-2 border-white"></div>
                )}
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-3">
                  Active Users
                  {autoRefresh && (
                    <Badge variant="outline" className="px-2 py-1 text-xs bg-green-50/70 text-green-700 border-green-200 backdrop-blur-sm">
                      LIVE
                    </Badge>
                  )}
                </h1>
                <p className="text-sm sm:text-base text-gray-600 mt-1">
                  Monitor conversations and user engagement • {autoRefresh ? 'Live updates enabled' : 'Manual refresh mode'}
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Badge variant="secondary" className="px-3 py-1.5 text-sm bg-white/70 backdrop-blur-sm border border-gray-200 shadow-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
              {filteredAndSortedUsers.length} active
            </Badge>
            {!error && autoRefresh && (
              <Badge variant="outline" className="px-3 py-1.5 text-sm bg-blue-50/70 text-blue-700 border-blue-200 backdrop-blur-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                Live Updates
              </Badge>
            )}
            {lastUpdated && (
              <Badge variant="outline" className="px-3 py-1.5 text-sm text-gray-600 bg-white/50 backdrop-blur-sm border-gray-200">
                Updated {getTimeAgo(lastUpdated.toISOString())}
              </Badge>
            )}
            <Button 
              onClick={() => setAutoRefresh(!autoRefresh)} 
              size="sm" 
              variant={autoRefresh ? "default" : "outline"}
              className={`gap-2 transition-all duration-200 ${
                autoRefresh 
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg' 
                  : 'bg-white/70 backdrop-blur-sm border-gray-200 hover:bg-white hover:shadow-md'
              }`}
              title={`${autoRefresh ? 'Disable' : 'Enable'} auto-refresh`}
            >
              <div className={`h-2 w-2 rounded-full ${autoRefresh ? 'bg-white animate-pulse' : 'bg-gray-400'}`}></div>
              <span className="hidden sm:inline">{autoRefresh ? 'Live' : 'Static'}</span>
            </Button>
            <Button 
              onClick={fetchUsers} 
              size="sm" 
              variant="outline"
              className="gap-2 bg-white/70 backdrop-blur-sm border-gray-200 hover:bg-white hover:shadow-md transition-all duration-200"
              disabled={loading}
              title="Manually refresh user list"
            >
              <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
              <span className="sm:hidden">↻</span>
            </Button>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 text-red-800">
                <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                <span className="text-sm sm:text-base flex-1">{error}</span>
                <Button onClick={fetchUsers} size="sm" variant="outline" className="self-start sm:self-auto">
                  Try Again
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search and Filter */}
        <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
          <CardContent className="p-4 sm:p-6 lg:p-8">
            <div className="flex flex-col gap-4 sm:gap-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 sm:h-5 sm:w-5" />
                <Input 
                  placeholder="Search users by name or conversation ID..." 
                  className="pl-10 sm:pl-12 h-11 sm:h-12 text-sm sm:text-base bg-white/70 backdrop-blur-sm border-gray-200 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200" 
                  value={query} 
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              
              <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-1">
                <Button
                  variant={sortBy === 'recent' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSortBy('recent')}
                  className={`min-w-[90px] sm:min-w-[110px] text-xs sm:text-sm flex-shrink-0 transition-all duration-200 ${
                    sortBy === 'recent' 
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg' 
                      : 'bg-white/70 backdrop-blur-sm border-gray-200 hover:bg-white hover:shadow-md'
                  }`}
                >
                  <Clock className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  Recent
                </Button>
                <Button
                  variant={sortBy === 'name' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSortBy('name')}
                  className={`min-w-[90px] sm:min-w-[110px] text-xs sm:text-sm flex-shrink-0 transition-all duration-200 ${
                    sortBy === 'name' 
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg' 
                      : 'bg-white/70 backdrop-blur-sm border-gray-200 hover:bg-white hover:shadow-md'
                  }`}
                >
                  <User className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  Name
                </Button>
                <Button
                  variant={sortBy === 'messages' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSortBy('messages')}
                  className={`min-w-[90px] sm:min-w-[110px] text-xs sm:text-sm flex-shrink-0 transition-all duration-200 ${
                    sortBy === 'messages' 
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg' 
                      : 'bg-white/70 backdrop-blur-sm border-gray-200 hover:bg-white hover:shadow-md'
                  }`}
                >
                  <MessageSquare className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  Activity
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users List */}
        <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100/60">
              {filteredAndSortedUsers.length === 0 ? (
                <div className="text-center py-12 sm:py-16 px-4">
                  <div className="relative mx-auto mb-6">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-xl"></div>
                    <Users className="relative h-16 w-16 sm:h-20 sm:w-20 text-gray-300 mx-auto" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">No users found</h3>
                  <p className="text-sm sm:text-base text-gray-500">Try adjusting your search criteria or refresh the list</p>
                </div>
              ) : (
                filteredAndSortedUsers.map((user) => {
                  const conversationId = user.conversation_id;
                  const displayName = user.user_name ?? conversationId;
                  const activityStatus = getActivityStatus(user.last_seen);
                  
                  return (
                    <div 
                      key={conversationId} 
                      className="p-4 sm:p-6 lg:p-8 hover:bg-gradient-to-r hover:from-blue-50/30 hover:to-purple-50/30 transition-all duration-300 group cursor-pointer"
                    >
                      {/* Mobile Layout */}
                      <div className="block sm:hidden">
                        <div className="flex items-start gap-3">
                          <div className="relative">
                            <Avatar className="h-10 w-10 ring-2 ring-white shadow-md flex-shrink-0">
                              <AvatarFallback className={`text-white font-semibold bg-gradient-to-br ${getAvatarColor(displayName)}`}>
                                {getInitials(displayName)}
                              </AvatarFallback>
                            </Avatar>
                            {/* Activity indicator */}
                            <div className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 ${activityStatus.color} rounded-full border-2 border-white ${activityStatus.status === 'online' ? 'animate-pulse' : ''}`}></div>
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="min-w-0 flex-1">
                                <h3 className="font-semibold text-gray-900 text-base truncate flex items-center gap-2">
                                  {displayName}
                                  <Badge variant="outline" className={`text-xs px-1.5 py-0.5 ${
                                    activityStatus.status === 'online' ? 'bg-green-50 text-green-700 border-green-200' :
                                    activityStatus.status === 'recent' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                    activityStatus.status === 'today' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                    'bg-gray-50 text-gray-600 border-gray-200'
                                  }`}>
                                    {activityStatus.status === 'online' ? '🟢' : 
                                     activityStatus.status === 'recent' ? '�' :
                                     activityStatus.status === 'today' ? '🔵' : '⚪'}
                                  </Badge>
                                </h3>
                                <div className="text-xs text-gray-500 font-mono truncate">{conversationId}</div>
                              </div>
                              <div className="text-xs text-gray-500 flex items-center gap-1 flex-shrink-0">
                                <Clock className="h-3 w-3" />
                                {getTimeAgo(user.last_seen)}
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  <MessageSquare className="h-3 w-3 mr-1" />
                                  {user.message_count} messages
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {activityStatus.label}
                                </Badge>
                              </div>
                              
                              <p className="text-gray-600 text-sm line-clamp-2">
                                {user.last_message || 'No recent messages'}
                              </p>
                              
                              <Link href={`/users/${encodeURIComponent(conversationId)}`} className="block">
                                <Button size="sm" className="w-full shadow-sm">
                                  <ExternalLink className="h-3 w-3 mr-2" />
                                  View Details
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Desktop/Tablet Layout */}
                      <div className="hidden sm:block">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 lg:gap-4 flex-1 min-w-0">
                            <div className="relative">
                              <Avatar className="h-10 w-10 lg:h-12 lg:w-12 ring-2 ring-white shadow-md flex-shrink-0">
                                <AvatarFallback className={`text-white font-semibold bg-gradient-to-br ${getAvatarColor(displayName)}`}>
                                  {getInitials(displayName)}
                                </AvatarFallback>
                              </Avatar>
                              {/* Activity indicator */}
                              <div className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 lg:h-4 lg:w-4 ${activityStatus.color} rounded-full border-2 border-white ${activityStatus.status === 'online' ? 'animate-pulse' : ''}`}></div>
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 lg:gap-3 mb-1">
                                <h3 className="font-semibold text-gray-900 text-base lg:text-lg truncate">
                                  {displayName}
                                </h3>
                                <div className="text-sm text-gray-500 font-mono truncate max-w-[150px] lg:max-w-none">{conversationId}</div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs flex-shrink-0">
                                    <MessageSquare className="h-3 w-3 mr-1" />
                                    {user.message_count} messages
                                  </Badge>
                                  <Badge variant="outline" className={`text-xs px-2 py-0.5 ${
                                    activityStatus.status === 'online' ? 'bg-green-50 text-green-700 border-green-200' :
                                    activityStatus.status === 'recent' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                    activityStatus.status === 'today' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                    'bg-gray-50 text-gray-600 border-gray-200'
                                  } ${activityStatus.status === 'online' ? 'animate-pulse' : ''}`}>
                                    <div className={`w-2 h-2 ${activityStatus.color} rounded-full mr-1.5`}></div>
                                    {activityStatus.label}
                                  </Badge>
                                </div>
                              </div>
                              
                              <div className="flex items-center justify-between">
                                <p className="text-gray-600 text-sm truncate pr-4 max-w-xs lg:max-w-md">
                                  {user.last_message || 'No recent messages'}
                                </p>
                                <div className="flex items-center gap-3 lg:gap-4 text-sm text-gray-500 flex-shrink-0">
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-4 w-4" />
                                    {getTimeAgo(user.last_seen)}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 ml-3 lg:ml-4">
                            <Link href={`/users/${encodeURIComponent(conversationId)}`}>
                              <Button size="sm" className="shadow-sm">
                                <ExternalLink className="h-4 w-4 mr-2" />
                                <span className="hidden lg:inline">View Details</span>
                                <span className="lg:hidden">View</span>
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}