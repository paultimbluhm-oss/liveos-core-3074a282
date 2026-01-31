import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * Scope-basiertes Schulsystem
 * Scope = (Schule, Jahrgangsstufe, Halbjahr, Klasse A-D)
 * 
 * Alle Daten sind strikt an einen Scope gebunden.
 * Wechsel des Scope = kompletter Datenwechsel
 */

export interface SchoolInfo {
  id: string;
  name: string;
  short_name: string | null;
}

export interface YearInfo {
  id: string;
  name: string;
  year_number: number | null;
}

export interface SemesterInfo {
  id: string;
  school_year_id: string;
  grade_level: number;
  semester: 1 | 2;
}

// Feste Klassen A-D (keine Datenbank-Entitaet noetig fuer Filter)
export const CLASS_OPTIONS = ['A', 'B', 'C', 'D'] as const;
export type ClassName = typeof CLASS_OPTIONS[number];

export interface Scope {
  school: SchoolInfo | null;
  year: YearInfo | null;
  gradeLevel: number;
  semester: 1 | 2;
  className: ClassName;
}

export function useSchoolScope() {
  const { user } = useAuth();
  
  // Scope state
  const [school, setSchool] = useState<SchoolInfo | null>(null);
  const [year, setYear] = useState<YearInfo | null>(null);
  const [gradeLevel, setGradeLevel] = useState<number>(12);
  const [semester, setSemester] = useState<1 | 2>(1);
  const [className, setClassName] = useState<ClassName>('A');
  
  // Semester entity (fuer DB-Referenzen)
  const [semesterEntity, setSemesterEntity] = useState<SemesterInfo | null>(null);
  
  // Loading
  const [loading, setLoading] = useState(true);
  
  // Verfuegbare Schulen und Jahre
  const [schools, setSchools] = useState<SchoolInfo[]>([]);
  const [years, setYears] = useState<YearInfo[]>([]);

  // Lade User-Profil und setze initialen Scope
  const loadUserScope = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('selected_school_id, selected_school_year_id, selected_class_name, current_grade_level, current_semester')
      .eq('user_id', user.id)
      .single();
    
    if (profile) {
      if (profile.current_grade_level) setGradeLevel(profile.current_grade_level);
      if (profile.current_semester) setSemester(profile.current_semester as 1 | 2);
      if (profile.selected_class_name && CLASS_OPTIONS.includes(profile.selected_class_name as ClassName)) {
        setClassName(profile.selected_class_name as ClassName);
      }
      
      if (profile.selected_school_id) {
        const { data: schoolData } = await supabase
          .from('schools')
          .select('id, name, short_name')
          .eq('id', profile.selected_school_id)
          .single();
        
        if (schoolData) setSchool(schoolData);
        
        if (profile.selected_school_year_id) {
          const { data: yearData } = await supabase
            .from('school_years')
            .select('id, name, year_number')
            .eq('id', profile.selected_school_year_id)
            .single();
          
          if (yearData) setYear(yearData);
        }
      }
    }
    
    setLoading(false);
  }, [user]);

  // Lade verfuegbare Schulen
  const loadSchools = useCallback(async () => {
    const { data } = await supabase
      .from('schools')
      .select('id, name, short_name')
      .order('name');
    
    if (data) setSchools(data);
  }, []);

  // Lade Jahre fuer aktuelle Schule
  const loadYears = useCallback(async () => {
    if (!school) {
      setYears([]);
      return;
    }
    
    const { data } = await supabase
      .from('school_years')
      .select('id, name, year_number')
      .eq('school_id', school.id)
      .order('year_number', { ascending: false });
    
    if (data) setYears(data);
  }, [school?.id]);

  // Hole oder erstelle Semester-Entity fuer aktuellen Scope
  const getOrCreateSemester = useCallback(async (): Promise<string | null> => {
    if (!user || !year) return null;
    
    // Suche existierendes Semester
    const { data: existing } = await supabase
      .from('year_semesters')
      .select('id')
      .eq('school_year_id', year.id)
      .eq('grade_level', gradeLevel)
      .eq('semester', semester)
      .maybeSingle();
    
    if (existing) return existing.id;
    
    // Erstelle neues Semester
    const { data: created, error } = await supabase
      .from('year_semesters')
      .insert({
        school_year_id: year.id,
        school_id: school?.id,
        grade_level: gradeLevel,
        semester: semester,
      })
      .select('id')
      .single();
    
    if (error) {
      console.error('Fehler beim Erstellen des Semesters:', error);
      return null;
    }
    
    return created?.id || null;
  }, [user, year?.id, school?.id, gradeLevel, semester]);

  // Lade aktuelles Semester-Entity
  const loadSemesterEntity = useCallback(async () => {
    if (!year) {
      setSemesterEntity(null);
      return;
    }
    
    const { data } = await supabase
      .from('year_semesters')
      .select('id, school_year_id, grade_level, semester')
      .eq('school_year_id', year.id)
      .eq('grade_level', gradeLevel)
      .eq('semester', semester)
      .maybeSingle();
    
    if (data) {
      setSemesterEntity({
        ...data,
        semester: data.semester as 1 | 2,
      });
    } else {
      setSemesterEntity(null);
    }
  }, [year?.id, gradeLevel, semester]);

  // Speichere Scope-Aenderungen im Profil
  const updateProfileScope = useCallback(async (updates: {
    school_id?: string;
    year_id?: string;
    grade?: number;
    sem?: 1 | 2;
    cls?: ClassName;
  }) => {
    if (!user) return;
    
    const profileUpdates: Record<string, any> = {};
    
    if (updates.school_id !== undefined) profileUpdates.selected_school_id = updates.school_id;
    if (updates.year_id !== undefined) profileUpdates.selected_school_year_id = updates.year_id;
    if (updates.grade !== undefined) profileUpdates.current_grade_level = updates.grade;
    if (updates.sem !== undefined) profileUpdates.current_semester = updates.sem;
    if (updates.cls !== undefined) profileUpdates.selected_class_name = updates.cls;
    
    if (Object.keys(profileUpdates).length > 0) {
      await supabase
        .from('profiles')
        .update(profileUpdates)
        .eq('user_id', user.id);
    }
  }, [user]);

  // Scope-Wechsel Funktionen
  const changeSchool = useCallback(async (newSchool: SchoolInfo | null) => {
    setSchool(newSchool);
    setYear(null); // Jahr zuruecksetzen bei Schulwechsel
    if (newSchool) {
      await updateProfileScope({ school_id: newSchool.id, year_id: undefined });
    }
  }, [updateProfileScope]);

  const changeYear = useCallback(async (newYear: YearInfo | null) => {
    setYear(newYear);
    if (newYear) {
      await updateProfileScope({ year_id: newYear.id });
    }
  }, [updateProfileScope]);

  const changeGradeLevel = useCallback(async (newGrade: number) => {
    setGradeLevel(newGrade);
    await updateProfileScope({ grade: newGrade });
  }, [updateProfileScope]);

  const changeSemester = useCallback(async (newSem: 1 | 2) => {
    setSemester(newSem);
    await updateProfileScope({ sem: newSem });
  }, [updateProfileScope]);

  const changeClassName = useCallback(async (newClass: ClassName) => {
    setClassName(newClass);
    await updateProfileScope({ cls: newClass });
  }, [updateProfileScope]);

  // Initial load
  useEffect(() => {
    loadUserScope();
    loadSchools();
  }, [loadUserScope, loadSchools]);

  // Load years when school changes
  useEffect(() => {
    loadYears();
  }, [loadYears]);

  // Load semester entity when scope changes
  useEffect(() => {
    loadSemesterEntity();
  }, [loadSemesterEntity]);

  return {
    // Current scope
    scope: {
      school,
      year,
      gradeLevel,
      semester,
      className,
    } as Scope,
    
    // Semester entity for DB queries
    semesterEntity,
    getOrCreateSemester,
    
    // Available options
    schools,
    years,
    classOptions: CLASS_OPTIONS,
    
    // Change functions
    changeSchool,
    changeYear,
    changeGradeLevel,
    changeSemester,
    changeClassName,
    
    // Loading state
    loading,
    
    // Refresh
    refresh: loadUserScope,
    refreshSchools: loadSchools,
    refreshYears: loadYears,
  };
}
