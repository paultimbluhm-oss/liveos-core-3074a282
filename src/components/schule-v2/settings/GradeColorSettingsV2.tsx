import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface GradeColorSettingsV2Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSettingsChange?: () => void;
}

export function GradeColorSettingsV2({ open, onOpenChange, onSettingsChange }: GradeColorSettingsV2Props) {
  const { user } = useAuth();
  
  const [greenMin, setGreenMin] = useState(11);
  const [yellowMin, setYellowMin] = useState(5);
  const [loading, setLoading] = useState(false);

  // Load existing settings
  useEffect(() => {
    const loadSettings = async () => {
      if (!user) return;

      const { data } = await supabase
        .from('grade_color_settings')
        .select('green_min, yellow_min')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        setGreenMin(data.green_min);
        setYellowMin(data.yellow_min);
      }
    };

    if (open) loadSettings();
  }, [open, user]);

  const handleSave = async () => {
    if (!user) return;

    setLoading(true);

    const { error } = await supabase
      .from('grade_color_settings')
      .upsert({
        user_id: user.id,
        green_min: greenMin,
        yellow_min: yellowMin,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (error) {
      toast.error('Fehler beim Speichern');
    } else {
      toast.success('Einstellungen gespeichert');
      onSettingsChange?.();
      onOpenChange(false);
    }

    setLoading(false);
  };

  // Ensure yellowMin is always less than greenMin
  const handleGreenChange = (value: number[]) => {
    const newGreen = value[0];
    setGreenMin(newGreen);
    if (yellowMin >= newGreen) {
      setYellowMin(Math.max(0, newGreen - 1));
    }
  };

  const handleYellowChange = (value: number[]) => {
    const newYellow = value[0];
    if (newYellow < greenMin) {
      setYellowMin(newYellow);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Notenfarben</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Preview */}
          <div className="flex justify-center gap-2">
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-lg bg-emerald-500 flex items-center justify-center text-white font-bold">
                {greenMin}+
              </div>
              <span className="text-[10px] text-muted-foreground mt-1">Gut</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-lg bg-amber-500 flex items-center justify-center text-white font-bold">
                {yellowMin}-{greenMin - 1}
              </div>
              <span className="text-[10px] text-muted-foreground mt-1">OK</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-lg bg-rose-500 flex items-center justify-center text-white font-bold">
                0-{yellowMin - 1}
              </div>
              <span className="text-[10px] text-muted-foreground mt-1">Schlecht</span>
            </div>
          </div>

          {/* Green threshold */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Ab wann ist gut?</Label>
              <span className="text-lg font-bold text-emerald-500">{greenMin} Punkte</span>
            </div>
            <Slider
              value={[greenMin]}
              onValueChange={handleGreenChange}
              min={1}
              max={15}
              step={1}
              className="w-full"
            />
          </div>

          {/* Yellow threshold */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Ab wann ist OK?</Label>
              <span className="text-lg font-bold text-amber-500">{yellowMin} Punkte</span>
            </div>
            <Slider
              value={[yellowMin]}
              onValueChange={handleYellowChange}
              min={0}
              max={greenMin - 1}
              step={1}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              0-{yellowMin > 0 ? yellowMin - 1 : 0} Punkte = Rot
            </p>
          </div>

          <Button onClick={handleSave} disabled={loading} className="w-full">
            Speichern
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
