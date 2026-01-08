import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { GraduationCap, FolderKanban, CalendarX, ClipboardList, BookOpen, Award, Building2, Users } from 'lucide-react';
import { ProjectsSection } from '@/components/schule/ProjectsSection';
import { SchoolTasksSection } from '@/components/schule/SchoolTasksSection';
import { AbsencesSection } from '@/components/schule/AbsencesSection';
import { UnifiedTimetableSection } from '@/components/schule/UnifiedTimetableSection';
import { HomeworkSection } from '@/components/schule/HomeworkSection';
import { GradesSection } from '@/components/schule/GradesSection';
import { SchoolsSection } from '@/components/schule/schools';

const sections = [
  { id: 'schulen', icon: Building2, label: 'Schulen & Kurse', color: 'text-violet-500' },
  { id: 'stundenplan', icon: GraduationCap, label: 'Stundenplan', color: 'text-blue-500' },
  { id: 'hausaufgaben', icon: BookOpen, label: 'Hausaufgaben', color: 'text-green-500' },
  { id: 'noten', icon: Award, label: 'Noten', color: 'text-amber-500' },
  { id: 'projekte', icon: FolderKanban, label: 'Projekte', color: 'text-purple-500' },
  { id: 'fehltage', icon: CalendarX, label: 'Fehltage', color: 'text-rose-500' },
  { id: 'aufgaben', icon: ClipboardList, label: 'Aufgaben', color: 'text-orange-500' },
];

export default function Schule() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading || !user) return null;

  if (activeSection === 'schulen') {
    return (
      <AppLayout>
        <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
          <SchoolsSection onBack={() => setActiveSection(null)} />
        </div>
      </AppLayout>
    );
  }

  if (activeSection === 'stundenplan') {
    return (
      <AppLayout>
        <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
          <UnifiedTimetableSection onBack={() => setActiveSection(null)} />
        </div>
      </AppLayout>
    );
  }

  if (activeSection === 'hausaufgaben') {
    return (
      <AppLayout>
        <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
          <HomeworkSection onBack={() => setActiveSection(null)} />
        </div>
      </AppLayout>
    );
  }

  if (activeSection === 'noten') {
    return (
      <AppLayout>
        <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
          <GradesSection onBack={() => setActiveSection(null)} />
        </div>
      </AppLayout>
    );
  }

  if (activeSection === 'projekte') {
    return (
      <AppLayout>
        <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
          <ProjectsSection onBack={() => setActiveSection(null)} />
        </div>
      </AppLayout>
    );
  }

  if (activeSection === 'fehltage') {
    return (
      <AppLayout>
        <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
          <AbsencesSection onBack={() => setActiveSection(null)} />
        </div>
      </AppLayout>
    );
  }

  if (activeSection === 'aufgaben') {
    return (
      <AppLayout>
        <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
          <SchoolTasksSection onBack={() => setActiveSection(null)} />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
        {/* Section Cards Grid - compact for mobile */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 md:gap-3">
          {sections.map((s, i) => (
            <div
              key={s.id}
              onClick={() => setActiveSection(s.id)}
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
