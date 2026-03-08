import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, getSupabase } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProfileSettings } from '@/components/settings/ProfileSettings';
import { ThemeSettings } from '@/components/settings/ThemeSettings';
import { SecuritySettings } from '@/components/settings/SecuritySettings';
import { InfoSettings } from '@/components/settings/InfoSettings';
import { User, Palette, Shield, Info, ChevronRight, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useToast } from '@/hooks/use-toast';

type SettingsSection = 'profile' | 'design' | 'security' | 'info' | null;

const SECTIONS = [
  { id: 'profile' as const, label: 'Profil', icon: User, description: 'Name, Benutzername' },
  { id: 'design' as const, label: 'Design', icon: Palette, description: 'Theme, Farben' },
  { id: 'security' as const, label: 'Sicherheit', icon: Shield, description: 'Passwort' },
  { id: 'info' as const, label: 'Info', icon: Info, description: 'App, Konto' },
];

export default function Profile() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeSheet, setActiveSheet] = useState<SettingsSection>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [user, loading, navigate]);

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
        setDisplayName(data.display_name || data.username || null);
      }
    };
    load();
  }, [user]);

  const handleLogout = async () => {
    const supabase = getSupabase();
    await supabase.auth.signOut();
    toast({ title: 'Abgemeldet' });
    navigate('/auth');
  };

  if (loading || !user) return null;

  const renderSheetContent = () => {
    switch (activeSheet) {
      case 'profile': return <ProfileSettings />;
      case 'design': return <ThemeSettings />;
      case 'security': return <SecuritySettings />;
      case 'info': return <InfoSettings />;
      default: return null;
    }
  };

  const activeSection = SECTIONS.find(s => s.id === activeSheet);

  return (
    <AppLayout>
      <div className="p-4 pb-24 max-w-lg mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 pt-2">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <span className="text-xl font-bold text-primary">
              {(displayName || user.email || '?')[0].toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold truncate">{displayName || 'Benutzer'}</h1>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
        </div>

        {/* Menu Items */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          {SECTIONS.map((section, i) => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSheet(section.id)}
                className={`w-full flex items-center gap-4 px-4 py-3.5 text-left transition-colors hover:bg-muted/50 active:bg-muted ${
                  i < SECTIONS.length - 1 ? 'border-b border-border/50' : ''
                }`}
              >
                <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                  <Icon className="w-4.5 h-4.5 text-foreground/70" strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{section.label}</p>
                  <p className="text-[11px] text-muted-foreground">{section.description}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/50 shrink-0" strokeWidth={1.5} />
              </button>
            );
          })}
        </div>

        {/* Logout */}
        <Button
          variant="outline"
          onClick={handleLogout}
          className="w-full gap-2 text-destructive border-destructive/20 hover:bg-destructive/5"
        >
          <LogOut className="w-4 h-4" strokeWidth={1.5} />
          Abmelden
        </Button>
      </div>

      {/* Bottom Sheet for each section */}
      <Sheet open={activeSheet !== null} onOpenChange={(open) => !open && setActiveSheet(null)}>
        <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-8 max-h-[85vh] overflow-y-auto">
          <SheetHeader className="pb-4">
            <SheetTitle className="text-base">{activeSection?.label}</SheetTitle>
          </SheetHeader>
          {renderSheetContent()}
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
