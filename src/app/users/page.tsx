"use client";

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Search, MessageSquare, Clock, User, ExternalLink } from 'lucide-react';
import { STATIC_USERS, UserEntry } from '@/lib/mockData';

export default function UsersPage() {
  const [users] = useState<UserEntry[]>(STATIC_USERS);
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'recent' | 'messages'>('recent');

  const filteredAndSortedUsers = useMemo(() => {
    let filtered = users.filter(u => 
      u.user_name.toLowerCase().includes(query.toLowerCase())
    );

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.user_name.localeCompare(b.user_name);
        case 'recent':
          return new Date(b.lastSeen || 0).getTime() - new Date(a.lastSeen || 0).getTime();
        case 'messages':
          return b.messageCount - a.messageCount;
        default:
          return 0;
      }
    });
  }, [users, query, sortBy]);

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
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

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl text-white shadow-lg">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Users</h1>
              <p className="text-gray-600">Manage customer conversations and interactions</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="px-3 py-1">
              {filteredAndSortedUsers.length} users
            </Badge>
          </div>
        </div>

        {/* Search and Filter */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input 
                  placeholder="Search users by name..." 
                  className="pl-10 h-11" 
                  value={query} 
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant={sortBy === 'recent' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSortBy('recent')}
                  className="min-w-[100px]"
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Recent
                </Button>
                <Button
                  variant={sortBy === 'name' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSortBy('name')}
                  className="min-w-[100px]"
                >
                  <User className="h-4 w-4 mr-2" />
                  Name
                </Button>
                <Button
                  variant={sortBy === 'messages' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSortBy('messages')}
                  className="min-w-[100px]"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Activity
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users List */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100">
              {filteredAndSortedUsers.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
                  <p className="text-gray-500">Try adjusting your search criteria</p>
                </div>
              ) : (
                filteredAndSortedUsers.map((user) => {
                  const conversationId = user.conversationIds?.[0] ?? user.user_name;
                  return (
                  <div key={conversationId} className="p-6 hover:bg-gray-50 transition-colors duration-150">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <Avatar className="h-12 w-12 ring-2 ring-white shadow-md">
                          <AvatarFallback className={`text-white font-semibold bg-gradient-to-br ${getAvatarColor(user.user_name)}`}>
                            {getInitials(user.user_name)}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="font-semibold text-gray-900 text-lg">
                              {user.user_name}
                            </h3>
                            <div className="text-sm text-gray-500">{conversationId}</div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                <MessageSquare className="h-3 w-3 mr-1" />
                                {user.messageCount} messages
                              </Badge>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <p className="text-gray-600 text-sm truncate pr-4 max-w-md">
                              {user.lastMessage || 'No recent messages'}
                            </p>
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                {user.lastSeen ? getTimeAgo(user.lastSeen) : 'Never'}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        <Link href={`/users/${encodeURIComponent(conversationId)}`}>
                          <Button size="sm" className="shadow-sm">
                            <ExternalLink className="h-4 w-4 mr-2" />
                            View Details
                          </Button>
                        </Link>
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