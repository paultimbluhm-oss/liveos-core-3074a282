import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { GraduationCap, FolderKanban, CalendarX, ClipboardList, BookOpen, Award, Settings, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProjectsSection } from '@/components/schule/ProjectsSection';
import { SchoolTasksSection } from '@/components/schule/SchoolTasksSection';
import { AbsencesSection } from '@/components/schule/AbsencesSection';
import { UnifiedTimetableSection } from '@/components/schule/UnifiedTimetableSection';
import { HomeworkSection } from '@/components/schule/HomeworkSection';
import { GradesSection } from '@/components/schule/GradesSection';
import { CoursesList } from '@/components/schule/schools/CoursesList';
import { SchoolSettingsDialog } from '@/components/schule/schools/SchoolSettingsDialog';

interface SchoolInfo {
  id: string;
  name: string;
  short_name: string | null;
}

interface YearInfo {
  id: string;
  name: string;
  year_number: number | null;
}

interface ClassInfo {
  id: string;
  name: string;
}

const sections = [
  { id: 'stundenplan', icon: GraduationCap, label: 'Stundenplan', color: 'border-blue-500 text-blue-500' },
  { id: 'hausaufgaben', icon: BookOpen, label: 'Hausaufgaben', color: 'border-green-500 text-green-500' },
  { id: 'noten', icon: Award, label: 'Noten', color: 'border-amber-500 text-amber-500' },
  { id: 'projekte', icon: FolderKanban, label: 'Projekte', color: 'border-purple-500 text-purple-500' },
  { id: 'fehltage', icon: CalendarX, label: 'Fehltage', color: 'border-rose-500 text-rose-500' },
  { id: 'aufgaben', icon: ClipboardList, label: 'Aufgaben', color: 'border-orange-500 text-orange-500' },
];

export default function Schule() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<SchoolInfo | null>(null);
  const [selectedYear, setSelectedYear] = useState<YearInfo | null>(null);
  const [selectedClass, setSelectedClass] = useState<ClassInfo | null>(null);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  const fetchUserSchool = async () => {
    if (!user) return;
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('selected_school_id, selected_school_year_id, selected_class_id')
      .eq('user_id', user.id)
      .single();
    
    if (profile?.selected_school_id) {
      const { data: school } = await supabase
        .from('schools')
        .select('id, name, short_name')
        .eq('id', profile.selected_school_id)
        .single();
      
      if (school) setSelectedSchool(school);
      
      if (profile.selected_school_year_id) {
        const { data: year } = await supabase
          .from('school_years')
          .select('id, name, year_number')
          .eq('id', profile.selected_school_year_id)
          .single();
        
        if (year) setSelectedYear(year);
      }
      
      if (profile.selected_class_id) {
        const { data: cls } = await supabase
          .from('classes')
          .select('id, name')
          .eq('id', profile.selected_class_id)
          .single();
        
        if (cls) setSelectedClass(cls);
      } else {
        setSelectedClass(null);
      }
    }
    
    setDataLoading(false);
  };

  useEffect(() => {
    fetchUserSchool();
  }, [user]);

  if (loading || !user) return null;

  // Render active sections
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
      <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        {/* Header with Settings */}
        <div className="flex items-center justify-between">
          <div>
            {selectedSchool ? (
              <>
                <h1 className="text-lg font-bold">{selectedSchool.short_name || selectedSchool.name}</h1>
                <p className="text-xs text-muted-foreground">
                  {selectedYear?.name}
                  {selectedClass && ` - ${selectedClass.name}`}
                </p>
              </>
            ) : (
              <h1 className="text-lg font-bold">Schule</h1>
            )}
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings className="w-4 h-4" strokeWidth={1.5} />
          </Button>
        </div>
        
        {/* Section Cards Grid */}
        <div className="grid grid-cols-3 gap-2">
          {sections.map((s, i) => (
            <div
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className="group relative overflow-hidden rounded-xl bg-card/80 backdrop-blur-sm border border-border/50 p-3 hover:border-primary/50 transition-all duration-300 cursor-pointer"
            >
              <div className="relative z-10 flex flex-col items-center gap-1.5 text-center">
                <div className={`p-2 rounded-lg border-2 ${s.color} bg-transparent`}>
                  <s.icon className="w-4 h-4" strokeWidth={1.5} />
                </div>
                <h3 className="font-medium text-[10px] group-hover:text-primary transition-colors">{s.label}</h3>
              </div>
            </div>
          ))}
        </div>
        
        {/* Courses Section */}
        {dataLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        ) : selectedSchool && selectedYear ? (
          <div className="pt-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-lg border-2 border-violet-500 bg-transparent">
                <Users className="w-4 h-4 text-violet-500" strokeWidth={1.5} />
              </div>
              <h2 className="font-semibold">Kurse</h2>
              {selectedClass && (
                <span className="text-xs text-muted-foreground">({selectedClass.name})</span>
              )}
            </div>
            <CoursesList 
              schoolYearId={selectedYear.id}
              schoolId={selectedSchool.id}
              schoolName={selectedSchool.name}
              yearName={selectedYear.name}
              classId={selectedClass?.id}
              className={selectedClass?.name}
            />
          </div>
        ) : (
          <div className="py-8 text-center">
            <div className="p-3 rounded-xl border-2 border-muted-foreground/30 bg-transparent w-fit mx-auto mb-3">
              <GraduationCap className="w-8 h-8 text-muted-foreground/50" strokeWidth={1.5} />
            </div>
            <p className="text-sm text-muted-foreground">Keine Schule ausgewaehlt</p>
            <p className="text-[10px] text-muted-foreground/70 mb-3">
              Waehle Schule, Jahrgang und Klasse aus
            </p>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setSettingsOpen(true)}
            >
              <Settings className="w-4 h-4 mr-1" strokeWidth={1.5} />
              Einstellungen
            </Button>
          </div>
        )}
        
        {/* Settings Dialog */}
        <SchoolSettingsDialog 
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          onSchoolChanged={fetchUserSchool}
        />
      </div>
    </AppLayout>
  );
}
