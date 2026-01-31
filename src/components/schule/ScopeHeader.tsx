import { GraduationCap, Settings, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Scope, ClassName, CLASS_OPTIONS } from '@/hooks/useSchoolScope';

interface ScopeHeaderProps {
  scope: Scope;
  onGradeLevelChange: (grade: number) => void;
  onSemesterChange: (sem: 1 | 2) => void;
  onClassNameChange: (cls: ClassName) => void;
  onSettingsOpen: () => void;
  totalLessons?: number;
  yearAverage?: number | null;
}

export function ScopeHeader({
  scope,
  onGradeLevelChange,
  onSemesterChange,
  onClassNameChange,
  onSettingsOpen,
  totalLessons = 0,
  yearAverage,
}: ScopeHeaderProps) {
  // Jahrgang 1-13
  const gradeLevels = Array.from({ length: 13 }, (_, i) => i + 1);

  return (
    <div className="space-y-3">
      {/* Top row: School info + Settings */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10 border border-primary/30">
            <GraduationCap className="w-5 h-5 text-primary" strokeWidth={1.5} />
          </div>
          <div>
            {scope.school ? (
              <>
                <h1 className="text-base font-bold leading-tight">
                  {scope.school.short_name || scope.school.name}
                </h1>
                {scope.year && (
                  <p className="text-[11px] text-muted-foreground">
                    {scope.year.name}
                  </p>
                )}
              </>
            ) : (
              <h1 className="text-base font-bold">Schule</h1>
            )}
          </div>
        </div>
        
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-9 w-9 rounded-xl"
          onClick={onSettingsOpen}
        >
          <Settings className="w-4 h-4" strokeWidth={1.5} />
        </Button>
      </div>
      
      {/* Scope Dropdowns - nur wenn Schule und Jahr gewaehlt */}
      {scope.school && scope.year && (
        <div className="flex items-center gap-2">
          {/* Jahrgang */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1 text-xs">
                {scope.gradeLevel}. Jg
                <ChevronDown className="w-3 h-3" strokeWidth={1.5} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-64 overflow-y-auto">
              {gradeLevels.map(grade => (
                <DropdownMenuItem 
                  key={grade} 
                  onClick={() => onGradeLevelChange(grade)}
                  className={grade === scope.gradeLevel ? 'bg-primary/10' : ''}
                >
                  {grade}. Jahrgang
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Halbjahr */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1 text-xs">
                {scope.semester}. HJ
                <ChevronDown className="w-3 h-3" strokeWidth={1.5} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem 
                onClick={() => onSemesterChange(1)}
                className={scope.semester === 1 ? 'bg-primary/10' : ''}
              >
                1. Halbjahr
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onSemesterChange(2)}
                className={scope.semester === 2 ? 'bg-primary/10' : ''}
              >
                2. Halbjahr
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Klasse */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1 text-xs">
                {scope.gradeLevel}{scope.className}
                <ChevronDown className="w-3 h-3" strokeWidth={1.5} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {CLASS_OPTIONS.map(cls => (
                <DropdownMenuItem 
                  key={cls} 
                  onClick={() => onClassNameChange(cls)}
                  className={cls === scope.className ? 'bg-primary/10' : ''}
                >
                  {scope.gradeLevel}{cls}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
      
      {/* Stats row */}
      {scope.school && scope.year && (
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>{totalLessons} Stunden/Woche</span>
          {yearAverage !== null && yearAverage !== undefined && (
            <span>Jahresschnitt: {yearAverage.toFixed(1)} P</span>
          )}
        </div>
      )}
    </div>
  );
}
