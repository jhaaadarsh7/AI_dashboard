import React from 'react';
import KPIs from '@/components/dashboard/KPIs';
import MessagesChart from '@/components/dashboard/MessagesChart';
import RecentConversations from '@/components/dashboard/RecentConversations';
import { Button } from '@/components/ui/button';
import { Users, Settings, Bell } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-400/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-400/5 rounded-full blur-3xl"></div>
      </div>
      
      <div className="relative max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 lg:space-y-8">
        {/* Enhanced Responsive Header */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-lg">
                <Users className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                  AI Chat Dashboard
                </h1>
                <p className="text-sm sm:text-base text-gray-600 mt-1">
                  Monitor conversations, analyze user engagement, and track performance metrics
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2 bg-white/70 backdrop-blur-sm border-gray-200 hover:bg-white hover:shadow-md transition-all duration-200"
            >
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Notifications</span>
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2 bg-white/70 backdrop-blur-sm border-gray-200 hover:bg-white hover:shadow-md transition-all duration-200"
            >
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
            </Button>
            <Link href="/users">
              <Button className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105">
                <Users className="h-4 w-4" />
                <span className="hidden xs:inline">View All Users</span>
                <span className="xs:hidden">Users</span>
              </Button>
            </Link>
          </div>
        </header>

        {/* Enhanced KPIs */}
        <div className="relative">
          <KPIs />
        </div>

        {/* Enhanced Responsive Grid Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8">
          <div className="xl:col-span-2 space-y-6">
            <div className="relative">
              <MessagesChart />
            </div>
          </div>
          <div className="space-y-6">
            <div className="relative">
              <RecentConversations />
            </div>
          </div>
        </div>
       
      </div>
    </div>
  );
}
