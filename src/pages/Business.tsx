import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { Users, ClipboardList, ArrowLeft } from 'lucide-react';
import { ContactsSection } from '@/components/business/contacts';
import { OrdersSection } from '@/components/business/orders';
import { Button } from '@/components/ui/button';

type BusinessSection = 'overview' | 'kontakte' | 'auftraege';

const sections = [
  { id: 'kontakte' as const, icon: Users, label: 'Kontakte' },
  { id: 'auftraege' as const, icon: ClipboardList, label: 'Auftraege' },
];

export default function Business() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<BusinessSection>('overview');

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [user, loading, navigate]);

  if (loading || !user) return null;

  const renderSection = () => {
    switch (activeSection) {
      case 'kontakte':
        return <ContactsSection />;
      case 'auftraege':
        return <OrdersSection />;
      default:
        return null;
    }
  };

  return (
    <AppLayout>
      <div className="p-4 space-y-4 max-w-3xl mx-auto">
        {activeSection === 'overview' ? (
          <>
            <h1 className="text-xl font-bold">Business</h1>
            <div className="space-y-3">
              {sections.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setActiveSection(s.id)}
                  className="w-full flex items-center gap-4 p-4 rounded-xl bg-card/50 border border-border/50 hover:bg-card/80 transition-colors"
                >
                  <div className="p-3 rounded-xl bg-primary/10">
                    <s.icon className="w-5 h-5 text-primary" />
                  </div>
                  <span className="font-medium">{s.label}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setActiveSection('overview')}
                className="shrink-0"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="text-xl font-bold">
                {sections.find(s => s.id === activeSection)?.label}
              </h1>
            </div>
            {renderSection()}
          </>
        )}
      </div>
    </AppLayout>
  );
}