import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Clock } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface TimeEntry {
  category: string;
  minutes: number;
}

const CATEGORY_CONFIG: Record<string, { label: string; color: string }> = {
  schlafen: { label: 'Schlafen', color: '#6366f1' },
  essen: { label: 'Essen', color: '#f59e0b' },
  familie: { label: 'Familie', color: '#ec4899' },
  freunde: { label: 'Freunde', color: '#8b5cf6' },
  hygiene: { label: 'Hygiene', color: '#06b6d4' },
  youtube: { label: 'YouTube', color: '#ef4444' },
  liveos: { label: 'LiveOS', color: '#3b82f6' },
  optimieren: { label: 'Optimieren', color: '#22c55e' },
  sport: { label: 'Sport', color: '#14b8a6' },
  lernen: { label: 'Lernen', color: '#a855f7' },
  sonstiges: { label: 'Sonstiges', color: '#64748b' },
};

export function TimeDistributionWidget() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    if (user) fetchTodayEntries();
  }, [user]);

  const fetchTodayEntries = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('time_entries')
      .select('category, minutes')
      .eq('user_id', user.id)
      .eq('entry_date', today);
    
    if (data) setEntries(data);
  };

  const getTotalMinutes = () => entries.reduce((sum, e) => sum + e.minutes, 0);

  const getChartData = () => {
    if (entries.length === 0) return [];
    return entries
      .filter(e => e.minutes > 0)
      .map(e => ({
        name: CATEGORY_CONFIG[e.category]?.label || e.category,
        value: e.minutes,
        color: CATEGORY_CONFIG[e.category]?.color || '#64748b',
      }))
      .sort((a, b) => b.value - a.value);
  };

  const formatTime = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m}m`;
    return `${h}h ${m}m`;
  };

  const totalMinutes = getTotalMinutes();
  const chartData = getChartData();
  const hasData = chartData.length > 0;

  // SVG arc calculation
  const size = 96;
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Calculate arc segments
  const getArcSegments = () => {
    if (!hasData) return [];
    const total = chartData.reduce((sum, d) => sum + d.value, 0);
    let currentOffset = 0;
    
    return chartData.map(item => {
      const percentage = item.value / total;
      const arcLength = circumference * percentage;
      const segment = {
        ...item,
        arcLength,
        offset: currentOffset,
      };
      currentOffset += arcLength;
      return segment;
    });
  };

  const segments = getArcSegments();

  return (
    <>
      <div
        className="relative flex items-center justify-center p-2 cursor-pointer"
        onClick={() => setDialogOpen(true)}
      >
        <div className="relative w-24 h-24 md:w-28 md:h-28">
          {/* SVG Ring without background stroke */}
          <svg 
            className="w-full h-full transform -rotate-90" 
            viewBox={`0 0 ${size} ${size}`}
          >
            {/* Colored segments with glow */}
            {segments.map((segment, index) => (
              <motion.circle
                key={segment.name}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={segment.color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={`${segment.arcLength - 2} ${circumference - segment.arcLength + 2}`}
                strokeDashoffset={-segment.offset}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                style={{
                  filter: `drop-shadow(0 0 6px ${segment.color}80)`,
                }}
              />
            ))}
          </svg>
          
          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <Clock className="w-4 h-4 text-muted-foreground mb-0.5" />
            <span className="text-lg md:text-xl font-bold font-mono">
              {hasData ? formatTime(totalMinutes) : '-'}
            </span>
          </div>
        </div>
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Heutige Zeitverteilung</DialogTitle>
          </DialogHeader>
          
          {hasData ? (
            <div className="space-y-4">
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              <div className="space-y-2">
                {chartData.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span>{item.name}</span>
                    </div>
                    <span className="font-medium">{formatTime(item.value)}</span>
                  </div>
                ))}
              </div>
              
              <div className="pt-2 border-t flex justify-between text-sm font-medium">
                <span>Gesamt</span>
                <span>{formatTime(totalMinutes)}</span>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Noch keine Zeit fuer heute getrackt</p>
            </div>
          )}
          
          <Link 
            to="/privat?section=lifetime" 
            className="block w-full text-center text-sm text-primary hover:underline mt-2"
            onClick={() => setDialogOpen(false)}
          >
            Zeit eintragen
          </Link>
        </DialogContent>
      </Dialog>
    </>
  );
}
