import React from 'react';
import KPIs from '@/components/dashboard/KPIs';
import MessagesChart from '@/components/dashboard/MessagesChart';
import RecentConversations from '@/components/dashboard/RecentConversations';
import { Button } from '@/components/ui/button';
import { Users, Settings, Bell } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Dashboard
            </h1>
            <p className="text-gray-600">
              Overview of chats, users and recent conversations.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="gap-2">
              <Bell className="h-4 w-4" />
              Notifications
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </Button>
            <Link href="/users">
              <Button className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                <Users className="h-4 w-4" />
                View All Users
              </Button>
            </Link>
          </div>
        </header>

        <KPIs />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <MessagesChart />
          </div>
          <div>
            <RecentConversations />
          </div>
        </div>
      </div>
    </div>
  );
}
