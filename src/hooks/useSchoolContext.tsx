import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { YearSemester, Class } from '@/components/schule/schools/types';

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

export function useSchoolContext() {
  const { user } = useAuth();
  
  // Selected school context
  const [selectedSchool, setSelectedSchool] = useState<SchoolInfo | null>(null);
  const [selectedYear, setSelectedYear] = useState<YearInfo | null>(null);
  
  // Filter states
  const [gradeLevel, setGradeLevel] = useState<number>(12);
  const [semester, setSemester] = useState<1 | 2>(1);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  
  // Current semester entity
  const [currentSemester, setCurrentSemester] = useState<YearSemester | null>(null);
  
  // Available classes
  const [availableClasses, setAvailableClasses] = useState<Class[]>([]);
  
  const [loading, setLoading] = useState(true);

  // Fetch user's profile and school context
  const fetchUserSchoolContext = useCallback(async () => {
    if (!user) return;
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('selected_school_id, selected_school_year_id, selected_class_id, current_grade_level, current_semester')
      .eq('user_id', user.id)
      .single();
    
    if (profile) {
      // Set filter states from profile
      if (profile.current_grade_level) {
        setGradeLevel(profile.current_grade_level);
      }
      if (profile.current_semester) {
        setSemester(profile.current_semester as 1 | 2);
      }
      if (profile.selected_class_id) {
        setSelectedClassId(profile.selected_class_id);
      }
      
      if (profile.selected_school_id) {
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
      }
    }
    
    setLoading(false);
  }, [user]);

  // Fetch available classes for the selected year
  const fetchClasses = useCallback(async () => {
    if (!selectedYear) {
      setAvailableClasses([]);
      return;
    }
    
    const { data } = await supabase
      .from('classes')
      .select('*')
      .eq('school_year_id', selectedYear.id)
      .order('name');
    
    if (data) {
      setAvailableClasses(data);
    }
  }, [selectedYear?.id]);

  // Get or create semester entity
  const getOrCreateSemester = useCallback(async (): Promise<string | null> => {
    if (!user || !selectedYear) return null;
    
    // First, try to find existing semester
    const { data: existing } = await supabase
      .from('year_semesters')
      .select('id')
      .eq('school_year_id', selectedYear.id)
      .eq('grade_level', gradeLevel)
      .eq('semester', semester)
      .maybeSingle();
    
    if (existing) {
      return existing.id;
    }
    
    // Create new semester entry
    const { data: created, error } = await supabase
      .from('year_semesters')
      .insert({
        school_year_id: selectedYear.id,
        grade_level: gradeLevel,
        semester: semester,
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating semester:', error);
      return null;
    }
    
    return created?.id || null;
  }, [user, selectedYear?.id, gradeLevel, semester]);

  // Fetch current semester entity
  const fetchCurrentSemester = useCallback(async () => {
    if (!selectedYear) {
      setCurrentSemester(null);
      return;
    }
    
    const { data } = await supabase
      .from('year_semesters')
      .select('*')
      .eq('school_year_id', selectedYear.id)
      .eq('grade_level', gradeLevel)
      .eq('semester', semester)
      .maybeSingle();
    
    if (data) {
      setCurrentSemester({
        ...data,
        semester: data.semester as 1 | 2,
      });
    } else {
      setCurrentSemester(null);
    }
  }, [selectedYear?.id, gradeLevel, semester]);

  // Update profile when filters change
  const updateProfileFilters = useCallback(async (
    newGradeLevel?: number,
    newSemester?: 1 | 2,
    newClassId?: string | null
  ) => {
    if (!user) return;
    
    const updates: Record<string, any> = {};
    
    if (newGradeLevel !== undefined) {
      updates.current_grade_level = newGradeLevel;
      setGradeLevel(newGradeLevel);
    }
    
    if (newSemester !== undefined) {
      updates.current_semester = newSemester;
      setSemester(newSemester);
    }
    
    if (newClassId !== undefined) {
      updates.selected_class_id = newClassId;
      setSelectedClassId(newClassId);
    }
    
    if (Object.keys(updates).length > 0) {
      await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', user.id);
    }
  }, [user]);

  useEffect(() => {
    fetchUserSchoolContext();
  }, [fetchUserSchoolContext]);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  useEffect(() => {
    fetchCurrentSemester();
  }, [fetchCurrentSemester]);

  return {
    // School context
    selectedSchool,
    selectedYear,
    setSelectedSchool,
    setSelectedYear,
    
    // Filter states
    gradeLevel,
    semester,
    selectedClassId,
    
    // Update functions
    setGradeLevel: (level: number) => updateProfileFilters(level, undefined, undefined),
    setSemester: (sem: 1 | 2) => updateProfileFilters(undefined, sem, undefined),
    setSelectedClassId: (id: string | null) => updateProfileFilters(undefined, undefined, id),
    
    // Semester entity
    currentSemester,
    getOrCreateSemester,
    
    // Classes
    availableClasses,
    
    // Loading
    loading,
    
    // Refresh
    refetch: fetchUserSchoolContext,
  };
}
