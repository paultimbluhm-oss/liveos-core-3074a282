import { useState } from 'react';
import { useAuth, getSupabase } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff } from 'lucide-react';

export function SecuritySettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!oldPassword.trim()) {
      toast({ title: 'Fehler', description: 'Bitte gib dein aktuelles Passwort ein.', variant: 'destructive' });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: 'Fehler', description: 'Das neue Passwort muss mindestens 6 Zeichen lang sein.', variant: 'destructive' });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: 'Fehler', description: 'Die Passwoerter stimmen nicht ueberein.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    const supabase = getSupabase();

    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user!.email!,
      password: oldPassword,
    });

    if (verifyError) {
      toast({ title: 'Fehler', description: 'Das aktuelle Passwort ist falsch.', variant: 'destructive' });
      setSaving(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });

    if (updateError) {
      toast({ title: 'Fehler', description: updateError.message, variant: 'destructive' });
    } else {
      toast({ title: 'Gespeichert', description: 'Passwort wurde aktualisiert.' });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
    setSaving(false);
  };

  const PasswordField = ({ id, label, value, onChange, show, onToggle, placeholder }: {
    id: string; label: string; value: string; onChange: (v: string) => void;
    show: boolean; onToggle: () => void; placeholder: string;
  }) => (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs text-muted-foreground">{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="pr-10"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-0 top-0 h-full px-3"
          onClick={onToggle}
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );

  return (
    <form onSubmit={handlePasswordChange} className="space-y-4">
      <PasswordField id="oldPassword" label="Aktuelles Passwort" value={oldPassword} onChange={setOldPassword}
        show={showOldPassword} onToggle={() => setShowOldPassword(!showOldPassword)} placeholder="Aktuelles Passwort" />
      <PasswordField id="newPassword" label="Neues Passwort" value={newPassword} onChange={setNewPassword}
        show={showNewPassword} onToggle={() => setShowNewPassword(!showNewPassword)} placeholder="Neues Passwort" />
      <PasswordField id="confirmPassword" label="Passwort bestaetigen" value={confirmPassword} onChange={setConfirmPassword}
        show={showConfirmPassword} onToggle={() => setShowConfirmPassword(!showConfirmPassword)} placeholder="Passwort wiederholen" />
      <Button type="submit" disabled={saving} className="w-full" size="sm">
        {saving ? 'Wird geaendert...' : 'Passwort aendern'}
      </Button>

      <div className="pt-2 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">E-Mail-Verifizierung</span>
          <span className="text-emerald-500 font-medium text-xs">Aktiv</span>
        </div>
      </div>
    </form>
  );
}
