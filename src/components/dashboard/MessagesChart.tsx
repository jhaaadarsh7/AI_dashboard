
"use client";
import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Calendar, Filter } from 'lucide-react';
import * as Chart from 'chart.js';

export default function MessagesChart() {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<Chart.Chart | null>(null);
  const [isClient, setIsClient] = useState(false);

  // Dynamic data: keep last 30 days of counts in state
  type DayPoint = { dateLabel: string; day: string; chats: number; dateObj: Date };
  const [chartDataState, setChartDataState] = useState<DayPoint[]>([]);

  const avgChats = chartDataState.length
    ? Math.round(chartDataState.reduce((sum, d) => sum + d.chats, 0) / chartDataState.length)
    : 0;

  // Ensure component only renders chart on client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Build last-N days skeleton
  const buildLastNDays = (n: number) => {
    const out: DayPoint[] = [];
    const now = new Date();
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setHours(0, 0, 0, 0);
      d.setDate(now.getDate() - i);
      out.push({
        dateLabel: d.toLocaleString(undefined, { month: 'short', day: 'numeric' }),
        day: d.toLocaleString(undefined, { weekday: 'short' }),
        chats: 0,
        dateObj: d
      });
    }
    return out;
  };

  // Fetch initial data and aggregate locally
  useEffect(() => {
    if (!isClient) return;

    let mounted = true;

    const fetchData = async () => {
      const days = buildLastNDays(30);
      const since = new Date();
      since.setDate(since.getDate() - 29);
      // Fetch recent messages from Supabase for the last 30 days
      try {
        const { data, error } = await supabase
          .from('chat_turns')
          .select('id,timestamp,bot_response')
          .not('bot_response', 'is', null)
          .gte('timestamp', since.toISOString())
          .limit(10000);
        if (error) throw error;
        const rows = (data || []) as any[];
        for (const r of rows) {
          if (!r.timestamp) continue;
          const d = new Date(r.timestamp);
          d.setHours(0, 0, 0, 0);
          const idx = days.findIndex(day => day.dateObj.getTime() === d.getTime());
          if (idx >= 0) days[idx].chats += 1;
        }
        if (mounted) setChartDataState(days);
      } catch (err) {
        console.error('Failed to fetch chart data:', err);
        if (mounted) setChartDataState(buildLastNDays(30));
      }
    };

    fetchData();

    return () => {
      mounted = false;
    };
  }, [isClient]);

  // Chart rendering / update effect
  useEffect(() => {
    if (!isClient || !chartRef.current) return;

    // Register Chart.js components
    Chart.Chart.register(
      Chart.CategoryScale,
      Chart.LinearScale,
      Chart.LineController,
      Chart.LineElement,
      Chart.PointElement,
      Chart.Title,
      Chart.Tooltip,
      Chart.Legend,
      Chart.Filler
    );

    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;

    // Create gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(59, 130, 246, 0.1)');
    gradient.addColorStop(1, 'rgba(59, 130, 246, 0.01)');

    const labels = chartDataState.map(d => d.dateLabel);
    const dataValues = chartDataState.map(d => d.chats);

    if (chartInstanceRef.current) {
      // update existing chart
      chartInstanceRef.current.data.labels = labels as any;
      chartInstanceRef.current.data.datasets[0].data = dataValues as any;
      chartInstanceRef.current.update();
    } else {
      chartInstanceRef.current = new Chart.Chart(ctx, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Daily Chats',
              data: dataValues,
              borderColor: '#3b82f6',
              backgroundColor: gradient,
              borderWidth: 2,
              fill: true,
              tension: 0.4,
              pointRadius: 4,
              pointHoverRadius: 6,
              pointBackgroundColor: '#ffffff',
              pointBorderColor: '#3b82f6',
              pointBorderWidth: 2,
              pointHoverBackgroundColor: '#3b82f6',
              pointHoverBorderColor: '#ffffff',
              pointHoverBorderWidth: 2
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: {
            intersect: false,
            mode: 'index'
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: 'rgba(17, 24, 39, 0.95)',
              titleColor: '#ffffff',
              bodyColor: '#ffffff',
              borderColor: 'rgba(59, 130, 246, 0.3)',
              borderWidth: 1,
              cornerRadius: 8,
              displayColors: false,
              callbacks: {
                title: function(context: any) {
                  const index = context[0].dataIndex;
                  return `${chartDataState[index]?.day ?? ''}, ${chartDataState[index]?.dateLabel ?? ''}`;
                },
                label: function(context: any) {
                  return `${context.parsed.y} messages`;
                }
              }
            }
          },
          scales: {
            x: {
              grid: { display: false },
              border: { display: false },
              ticks: {
                maxTicksLimit: 7,
                color: '#6b7280',
                font: { size: 12 },
                callback: function(value: any, index: number) {
                  if (index % 4 === 0 || index === (labels.length - 1)) return labels[value];
                  return '';
                }
              }
            },
            y: {
              beginAtZero: true,
              grid: { color: 'rgba(156, 163, 175, 0.1)' },
              border: { display: false },
              ticks: { color: '#6b7280', font: { size: 12 }, padding: 10 }
            }
          },
          elements: { point: { hoverRadius: 8 } }
        }
      });
    }

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [isClient, chartDataState]);

  // Subscribe to realtime inserts and update chartDataState
  useEffect(() => {
    if (!isClient) return;
    // @ts-ignore
    const channel = supabase
      .channel('public:chat_turns')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_turns' }, (payload: any) => {
        try {
          const newRow = payload?.new;
          if (!newRow || !newRow.timestamp || newRow.bot_response == null) return;
          const d = new Date(newRow.timestamp);
          d.setHours(0, 0, 0, 0);
          setChartDataState(prev => {
            const idx = prev.findIndex(p => p.dateObj.getTime() === d.getTime());
            if (idx === -1) return prev; // outside 30d window
            const copy = prev.slice();
            copy[idx] = { ...copy[idx], chats: copy[idx].chats + 1 };
            return copy;
          });
        } catch (e) {
          console.error('Realtime payload processing failed', e);
        }
      })
      .subscribe();

    return () => {
      try {
        // @ts-ignore
        channel.unsubscribe();
      } catch (e) {
        // best-effort
      }
    };
  }, [isClient]);

  return (
    <Card className="border border-gray-200 shadow-sm bg-white">
      <CardHeader className="pb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <BarChart3 className="h-5 w-5 text-gray-700" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold text-gray-900">
                Daily Message Volume
              </CardTitle>
              <p className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                <Calendar className="h-4 w-4" />
                Last 30 days
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm text-gray-500">Daily Average</div>
              <div className="text-xl font-semibold text-gray-900">{avgChats}</div>
            </div>
            <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
              <Filter className="h-4 w-4" />
            </button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="relative h-80 w-full">
          {isClient ? (
            <canvas 
              ref={chartRef}
              className="w-full h-full"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-50 rounded-lg">
              <div className="text-gray-500 text-sm">Loading chart...</div>
            </div>
          )}
        </div>
        
        {/* Chart summary */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
          <div className="text-sm text-gray-500">
            Tracking daily conversation volume across the platform
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span className="text-gray-600">Messages</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}