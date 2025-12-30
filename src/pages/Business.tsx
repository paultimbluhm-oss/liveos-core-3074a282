import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { Briefcase, Users, ClipboardList, TrendingUp, Package } from 'lucide-react';
import { ContactsSection } from '@/components/business/contacts';
import { OrdersSection } from '@/components/business/orders';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type BusinessSection = 'kontakte' | 'auftraege' | 'investitionen' | 'produkte';

const sections: { id: BusinessSection; icon: React.ElementType; label: string; desc: string }[] = [
  { id: 'kontakte', icon: Users, label: 'Kontakte', desc: 'Kontaktverzeichnis' },
  { id: 'auftraege', icon: ClipboardList, label: 'Aufträge', desc: 'Status & Übersicht' },
  { id: 'investitionen', icon: TrendingUp, label: 'Investitionen', desc: 'Prognosen & Planung' },
  { id: 'produkte', icon: Package, label: 'Produkte', desc: 'Produkte & Dienstleistungen' },
];

export default function Business() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<BusinessSection>('kontakte');

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [user, loading, navigate]);

  if (loading || !user) return null;

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-warning/20">
            <Briefcase className="w-6 h-6 text-warning" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Business</h1>
            <p className="text-muted-foreground">Geschäftliche Verwaltung</p>
          </div>
        </div>

        <Tabs value={activeSection} onValueChange={(v) => setActiveSection(v as BusinessSection)}>
          <TabsList className="grid grid-cols-4 w-full max-w-2xl">
            {sections.map((s) => (
              <TabsTrigger key={s.id} value={s.id} className="flex items-center gap-2">
                <s.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{s.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="kontakte" className="mt-6">
            <ContactsSection />
          </TabsContent>

          <TabsContent value="auftraege" className="mt-6">
            <OrdersSection />
          </TabsContent>

          <TabsContent value="investitionen" className="mt-6">
            <div className="glass-card p-8 text-center">
              <TrendingUp className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="font-medium text-muted-foreground mb-2">Investitionen</h3>
              <p className="text-sm text-muted-foreground/70">Kommt bald...</p>
            </div>
          </TabsContent>

          <TabsContent value="produkte" className="mt-6">
            <div className="glass-card p-8 text-center">
              <Package className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="font-medium text-muted-foreground mb-2">Produkte</h3>
              <p className="text-sm text-muted-foreground/70">Kommt bald...</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
