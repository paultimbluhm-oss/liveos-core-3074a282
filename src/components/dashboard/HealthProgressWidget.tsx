import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Heart } from 'lucide-react';
import { format } from 'date-fns';

export function HealthProgressWidget() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);

  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    if (user) fetchProgress();
  }, [user]);

  const fetchProgress = async () => {
    if (!user) return;
    setLoading(true);

    const [itemsRes, completionsRes] = await Promise.all([
      supabase
        .from('health_items')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .eq('category', 'daily_routine'),
      supabase
        .from('health_completions')
        .select('health_item_id')
        .eq('user_id', user.id)
        .eq('completed_date', today),
    ]);

    const dailyItems = itemsRes.data || [];
    const completions = completionsRes.data || [];
    
    const completedCount = dailyItems.filter(item => 
      completions.some(c => c.health_item_id === item.id)
    ).length;
    
    const percent = dailyItems.length > 0 
      ? Math.round((completedCount / dailyItems.length) * 100) 
      : 0;
    
    setProgress(percent);
    setLoading(false);
  };

  const handleClick = () => {
    navigate('/privat?section=gesundheit');
  };

  return (
    <div 
      className="p-3 rounded-xl bg-card border border-border/50 cursor-pointer hover:bg-accent/50 transition-colors"
      onClick={handleClick}
    >
      <div className="flex items-center gap-3">
        <div className="p-1.5 rounded-lg bg-rose-500/10">
          <Heart className="w-4 h-4 text-rose-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">Gesundheit</span>
            <span className="text-sm font-bold text-rose-500">
              {loading ? '-' : `${progress}%`}
            </span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-rose-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
