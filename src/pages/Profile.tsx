import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Shield, LayoutDashboard, Info, Palette } from 'lucide-react';
import { SecuritySettings } from '@/components/settings/SecuritySettings';
import { DashboardV2Settings } from '@/components/settings/DashboardV2Settings';
import { InfoSettings } from '@/components/settings/InfoSettings';
import { ThemeSettings } from '@/components/settings/ThemeSettings';

export default function Profile() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [user, loading, navigate]);

  if (loading || !user) return null;

  return (
    <AppLayout>
      <div className="p-4 pb-24 max-w-lg mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10 border border-primary/30">
            <User className="w-5 h-5 text-primary" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-base font-bold">Einstellungen</h1>
            <p className="text-[11px] text-muted-foreground">{user.email}</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-4 h-10">
            <TabsTrigger value="dashboard" className="gap-1.5 text-xs">
              <LayoutDashboard className="w-3.5 h-3.5" strokeWidth={1.5} />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="theme" className="gap-1.5 text-xs">
              <Palette className="w-3.5 h-3.5" strokeWidth={1.5} />
              Design
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-1.5 text-xs">
              <Shield className="w-3.5 h-3.5" strokeWidth={1.5} />
              Sicherheit
            </TabsTrigger>
            <TabsTrigger value="info" className="gap-1.5 text-xs">
              <Info className="w-3.5 h-3.5" strokeWidth={1.5} />
              Info
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-4">
            <DashboardV2Settings />
          </TabsContent>

          <TabsContent value="theme" className="mt-4">
            <ThemeSettings />
          </TabsContent>

          <TabsContent value="security" className="mt-4">
            <SecuritySettings />
          </TabsContent>

          <TabsContent value="info" className="mt-4">
            <InfoSettings />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
