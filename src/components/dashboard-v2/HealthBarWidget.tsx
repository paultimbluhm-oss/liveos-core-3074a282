import { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import type { WidgetSize } from '@/hooks/useDashboardV2';

export function HealthBarWidget({ size }: { size: WidgetSize }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);
  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    if (user) fetchProgress();
  }, [user]);

  const fetchProgress = async () => {
    if (!user) return;
    const [itemsRes, compRes] = await Promise.all([
      supabase.from('health_items').select('id').eq('user_id', user.id).eq('is_active', true).eq('category', 'daily_routine'),
      supabase.from('health_completions').select('health_item_id').eq('user_id', user.id).eq('completed_date', today),
    ]);
    const items = itemsRes.data || [];
    const comps = compRes.data || [];
    const done = items.filter(i => comps.some(c => c.health_item_id === i.id)).length;
    setProgress(items.length > 0 ? Math.round((done / items.length) * 100) : 0);
  };

  return (
    <div
      className="rounded-2xl bg-card border border-border/50 p-4 cursor-pointer hover:bg-muted/30 transition-colors"
      onClick={() => navigate('/privat?section=gesundheit')}
    >
      <div className="flex items-center gap-2.5 mb-2">
        <div className="w-7 h-7 rounded-lg bg-destructive/10 flex items-center justify-center">
          <Heart className="w-4 h-4 text-destructive" strokeWidth={1.5} />
        </div>
        <span className="text-sm font-semibold flex-1">Gesundheit</span>
        <span className="text-sm font-bold font-mono text-destructive">{progress}%</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-destructive/80 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}
