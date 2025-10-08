"use client";

import React, { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { STATIC_USERS } from '@/lib/mockData';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function UserDetailPage() {
  const params = useParams();
  const rawId = params?.id ?? '';
  const id = Array.isArray(rawId) ? rawId[0] : rawId;

  const user = useMemo(() => {
  return STATIC_USERS.find(u => (u.conversationIds || []).includes(id));
  }, [id]);

  if (!user) {
    return (
      <div className="p-6">
        <h2 className="text-xl font-semibold">User not found</h2>
        <p className="text-gray-600">No conversation with id {id} was found in mock data.</p>
      </div>
    );
  }

  // Mock messages per day for the small chart
  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const data = {
    labels,
    datasets: [
      {
        label: 'Messages',
        data: labels.map((_, i) => Math.max(0, Math.floor(user.messageCount / (i + 1)) % 10 + 1)),
        backgroundColor: 'rgba(34,197,94,0.8)'
      }
    ]
  };

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{user.user_name}</h1>
            <p className="text-sm text-gray-500">Conversation id: {id}</p>
          </div>
        </div>

        <Card className="border-0 shadow-sm">
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <div className="text-xs text-gray-500">Total messages</div>
                <div className="text-xl font-semibold">{user.messageCount}</div>
              </div>

              <div className="space-y-1">
                <div className="text-xs text-gray-500">Last message</div>
                <div className="text-sm text-gray-700">{user.lastMessage ?? '—'}</div>
              </div>

              <div className="space-y-1">
                <div className="text-xs text-gray-500">Last seen</div>
                <div className="text-sm text-gray-700">{user.lastSeen ? new Date(user.lastSeen).toLocaleString() : '—'}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent>
            <h3 className="font-semibold mb-4">Messages per day</h3>
            <div>
              <Bar data={data} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
