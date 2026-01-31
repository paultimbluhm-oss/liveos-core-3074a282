import { useSchoolV2 } from '../context/SchoolV2Context';
import { CLASS_OPTIONS } from '../types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';

interface ScopeSelectorV2Props {
  onSettingsClick?: () => void;
}

export function ScopeSelectorV2({ onSettingsClick }: ScopeSelectorV2Props) {
  const { scope, school, setGradeLevel, setSemester, setClassName } = useSchoolV2();

  const gradeLevels = Array.from({ length: 13 }, (_, i) => i + 1);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Schulkürzel */}
      {school && (
        <div className="flex items-center justify-center h-9 px-3 rounded-md bg-primary/10 text-primary font-medium text-sm">
          {school.short_name || school.name.substring(0, 3).toUpperCase()}
        </div>
      )}

      {/* Jahrgang */}
      <Select 
        value={scope.gradeLevel.toString()} 
        onValueChange={(v) => setGradeLevel(parseInt(v))}
      >
        <SelectTrigger className="w-16 h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {gradeLevels.map(g => (
            <SelectItem key={g} value={g.toString()}>
              {g}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Halbjahr */}
      <Select 
        value={scope.semester.toString()} 
        onValueChange={(v) => setSemester(parseInt(v) as 1 | 2)}
      >
        <SelectTrigger className="w-20 h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="1">1. HJ</SelectItem>
          <SelectItem value="2">2. HJ</SelectItem>
        </SelectContent>
      </Select>

      {/* Klasse */}
      <Select 
        value={scope.className} 
        onValueChange={(v) => setClassName(v as 'A' | 'B' | 'C' | 'D')}
      >
        <SelectTrigger className="w-14 h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {CLASS_OPTIONS.map(c => (
            <SelectItem key={c} value={c}>
              {c}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Settings */}
      {onSettingsClick && (
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-9 w-9 ml-auto"
          onClick={onSettingsClick}
        >
          <Settings className="w-4 h-4" strokeWidth={1.5} />
        </Button>
      )}
    </div>
  );
}
