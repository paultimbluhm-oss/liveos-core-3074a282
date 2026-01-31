import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { V2School, V2SchoolMembership, V2Scope, CLASS_OPTIONS } from '../types';

interface SchoolV2ContextValue {
  // Membership & School
  membership: V2SchoolMembership | null;
  school: V2School | null;
  
  // Current Scope
  scope: V2Scope;
  
  // Scope changers
  setGradeLevel: (level: number) => Promise<void>;
  setSemester: (sem: 1 | 2) => Promise<void>;
  setClassName: (cls: 'A' | 'B' | 'C' | 'D') => Promise<void>;
  
  // Setup
  hasSchool: boolean;
  joinSchool: (schoolId: string, abiturYear: number) => Promise<void>;
  createSchool: (name: string, shortName: string, abiturYear: number) => Promise<void>;
  
  // Loading
  loading: boolean;
  
  // Refresh
  refresh: () => Promise<void>;
}

const SchoolV2Context = createContext<SchoolV2ContextValue | null>(null);

export function SchoolV2Provider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  
  const [membership, setMembership] = useState<V2SchoolMembership | null>(null);
  const [school, setSchool] = useState<V2School | null>(null);
  const [loading, setLoading] = useState(true);

  // Load membership
  const loadMembership = useCallback(async () => {
    if (!user) {
      setMembership(null);
      setSchool(null);
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from('v2_school_memberships')
      .select(`
        *,
        school:v2_schools(*)
      `)
      .eq('user_id', user.id)
      .maybeSingle();

    if (data) {
      const schoolData = data.school as unknown as V2School;
      setMembership({
        ...data,
        current_semester: data.current_semester as 1 | 2,
        current_class_name: data.current_class_name as 'A' | 'B' | 'C' | 'D',
        school: schoolData,
      });
      setSchool(schoolData);
    } else {
      setMembership(null);
      setSchool(null);
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadMembership();
  }, [loadMembership]);

  // Update scope in DB
  const updateScope = useCallback(async (updates: Partial<{
    current_grade_level: number;
    current_semester: number;
    current_class_name: string;
  }>) => {
    if (!user || !membership) return;

    await supabase
      .from('v2_school_memberships')
      .update(updates)
      .eq('user_id', user.id);

    // Update local state
    setMembership(prev => prev ? { ...prev, ...updates } as V2SchoolMembership : null);
  }, [user, membership]);

  const setGradeLevel = useCallback(async (level: number) => {
    await updateScope({ current_grade_level: level });
  }, [updateScope]);

  const setSemester = useCallback(async (sem: 1 | 2) => {
    await updateScope({ current_semester: sem });
  }, [updateScope]);

  const setClassName = useCallback(async (cls: 'A' | 'B' | 'C' | 'D') => {
    await updateScope({ current_class_name: cls });
  }, [updateScope]);

  // Join existing school
  const joinSchool = useCallback(async (schoolId: string, abiturYear: number) => {
    if (!user) return;

    // Berechne Jahrgang aus Abi-Jahr
    const currentYear = new Date().getFullYear();
    const gradeLevel = Math.max(1, Math.min(13, 13 - (abiturYear - currentYear)));

    await supabase
      .from('v2_school_memberships')
      .insert({
        user_id: user.id,
        school_id: schoolId,
        abitur_year: abiturYear,
        current_grade_level: gradeLevel,
        current_semester: 1,
        current_class_name: 'A',
      });

    await loadMembership();
  }, [user, loadMembership]);

  // Create new school
  const createSchool = useCallback(async (name: string, shortName: string, abiturYear: number) => {
    if (!user) return;

    const { data: schoolData, error } = await supabase
      .from('v2_schools')
      .insert({
        name,
        short_name: shortName || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (error || !schoolData) {
      console.error('Fehler beim Erstellen der Schule:', error);
      return;
    }

    await joinSchool(schoolData.id, abiturYear);
  }, [user, joinSchool]);

  // Build scope object
  const scope: V2Scope = {
    school,
    gradeLevel: membership?.current_grade_level ?? 12,
    semester: membership?.current_semester ?? 1,
    className: membership?.current_class_name ?? 'A',
  };

  return (
    <SchoolV2Context.Provider value={{
      membership,
      school,
      scope,
      setGradeLevel,
      setSemester,
      setClassName,
      hasSchool: !!membership,
      joinSchool,
      createSchool,
      loading,
      refresh: loadMembership,
    }}>
      {children}
    </SchoolV2Context.Provider>
  );
}

export function useSchoolV2() {
  const context = useContext(SchoolV2Context);
  if (!context) {
    throw new Error('useSchoolV2 must be used within SchoolV2Provider');
  }
  return context;
}
