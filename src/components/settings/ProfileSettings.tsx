import { useState, useEffect } from 'react';
import { useAuth, getSupabase } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export function ProfileSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const supabase = getSupabase();
      const { data } = await supabase
        .from('profiles')
        .select('display_name, username')
        .eq('user_id', user.id)
        .single();
      if (data) {
        setDisplayName(data.display_name || '');
        setUsername(data.username || '');
      }
      setLoaded(true);
    };
    load();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const supabase = getSupabase();
    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: displayName.trim() || null,
        username: username.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    if (error) {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Gespeichert', description: 'Profil wurde aktualisiert.' });
    }
    setSaving(false);
  };

  if (!loaded) return null;

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="displayName" className="text-xs text-muted-foreground">Anzeigename</Label>
        <Input
          id="displayName"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Dein Name"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="username" className="text-xs text-muted-foreground">Benutzername</Label>
        <Input
          id="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="z.B. paul123"
        />
        <p className="text-[10px] text-muted-foreground">Wird Freunden bei Streaks und Challenges angezeigt</p>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">E-Mail</Label>
        <Input value={user?.email || ''} disabled className="opacity-60" />
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-full" size="sm">
        {saving ? 'Wird gespeichert...' : 'Speichern'}
      </Button>
    </div>
  );
}
