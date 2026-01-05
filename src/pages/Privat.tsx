import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { Wallet, ListChecks, Calendar, Check, Gift, BookHeart, Clock, Heart } from 'lucide-react';
import { FinanceSection } from '@/components/privat/finance/FinanceSection';
import { ChecklistSection } from '@/components/privat/checklists';
import { TaskSection } from '@/components/privat/tasks';
import { HabitsSection } from '@/components/privat/habits';
import { GiftsSection } from '@/components/privat/gifts';
import { JournalSection } from '@/components/privat/journal';
import { LifetimeSection } from '@/components/privat/lifetime';
import { UnifiedHealthSection } from '@/components/privat/health';

const sections = [
  { id: 'habits', icon: Check, label: 'Habits', color: 'text-emerald-500' },
  { id: 'finanzen', icon: Wallet, label: 'Finanzen', color: 'text-amber-500' },
  { id: 'aufgaben', icon: Calendar, label: 'Aufgaben', color: 'text-sky-500' },
  { id: 'lifetime', icon: Clock, label: 'Lifetime', color: 'text-indigo-500' },
  { id: 'gesundheit', icon: Heart, label: 'Gesundheit', color: 'text-rose-500' },
  { id: 'journal', icon: BookHeart, label: 'Journal', color: 'text-cyan-500' },
  { id: 'checklisten', icon: ListChecks, label: 'Checklisten', color: 'text-blue-500' },
  { id: 'geschenke', icon: Gift, label: 'Geschenke', color: 'text-pink-500' },
];

export default function Privat() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeSection, setActiveSection] = useState<string | null>(searchParams.get('section'));

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [user, loading, navigate]);

  useEffect(() => {
    const section = searchParams.get('section');
    if (section && sections.some(s => s.id === section)) {
      setActiveSection(section);
    }
  }, [searchParams]);

  const handleSetSection = (sectionId: string | null) => {
    setActiveSection(sectionId);
    if (sectionId) {
      setSearchParams({ section: sectionId });
    } else {
      setSearchParams({});
    }
  };

  if (loading || !user) return null;

  if (activeSection === 'habits') {
    return (
      <AppLayout>
        <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
          <HabitsSection onBack={() => handleSetSection(null)} />
        </div>
      </AppLayout>
    );
  }

  if (activeSection === 'journal') {
    return (
      <AppLayout>
        <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
          <JournalSection onBack={() => handleSetSection(null)} />
        </div>
      </AppLayout>
    );
  }

  if (activeSection === 'finanzen') {
    return (
      <AppLayout>
        <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
          <FinanceSection onBack={() => handleSetSection(null)} />
        </div>
      </AppLayout>
    );
  }

  if (activeSection === 'checklisten') {
    return (
      <AppLayout>
        <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
          <ChecklistSection onBack={() => handleSetSection(null)} />
        </div>
      </AppLayout>
    );
  }

  if (activeSection === 'aufgaben') {
    return (
      <AppLayout>
        <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
          <TaskSection onBack={() => handleSetSection(null)} />
        </div>
      </AppLayout>
    );
  }

  if (activeSection === 'lifetime') {
    return (
      <AppLayout>
        <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
          <LifetimeSection onBack={() => handleSetSection(null)} />
        </div>
      </AppLayout>
    );
  }

  if (activeSection === 'gesundheit') {
    return (
      <AppLayout>
        <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
          <UnifiedHealthSection onBack={() => handleSetSection(null)} />
        </div>
      </AppLayout>
    );
  }

  if (activeSection === 'geschenke') {
    return (
      <AppLayout>
        <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
          <GiftsSection onBack={() => handleSetSection(null)} />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-8 gap-2 md:gap-3">
          {sections.map((s, i) => (
            <div
              key={s.id}
              onClick={() => handleSetSection(s.id)}
              className="group relative overflow-hidden rounded-xl bg-card/80 backdrop-blur-sm border border-border/50 p-3 md:p-4 hover:border-primary/50 transition-all duration-300 cursor-pointer fade-in"
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <div className="relative z-10 flex flex-col items-center gap-2 text-center">
                <div className={`p-2.5 md:p-3 rounded-xl border-2 border-current ${s.color} bg-transparent`}>
                  <s.icon className="w-5 h-5 md:w-6 md:h-6" strokeWidth={1.5} />
                </div>
                <h3 className="font-medium text-xs md:text-sm group-hover:text-primary transition-colors">{s.label}</h3>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
