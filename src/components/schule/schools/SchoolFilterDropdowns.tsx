import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Class } from './types';

interface SchoolFilterDropdownsProps {
  gradeLevel: number;
  semester: 1 | 2;
  selectedClassId: string | null;
  availableClasses: Class[];
  onGradeLevelChange: (level: number) => void;
  onSemesterChange: (sem: 1 | 2) => void;
  onClassChange: (id: string | null) => void;
}

export function SchoolFilterDropdowns({
  gradeLevel,
  semester,
  selectedClassId,
  availableClasses,
  onGradeLevelChange,
  onSemesterChange,
  onClassChange,
}: SchoolFilterDropdownsProps) {
  const gradeLevels = [13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];

  return (
    <div className="flex items-center gap-1.5">
      {/* Grade Level */}
      <Select
        value={gradeLevel.toString()}
        onValueChange={(val) => onGradeLevelChange(parseInt(val))}
      >
        <SelectTrigger className="h-7 w-12 px-2 text-xs border-border/50">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {gradeLevels.map((level) => (
            <SelectItem key={level} value={level.toString()}>
              {level}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Semester */}
      <Select
        value={semester.toString()}
        onValueChange={(val) => onSemesterChange(parseInt(val) as 1 | 2)}
      >
        <SelectTrigger className="h-7 w-14 px-2 text-xs border-border/50">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="1">1. HJ</SelectItem>
          <SelectItem value="2">2. HJ</SelectItem>
        </SelectContent>
      </Select>

      {/* Class Filter */}
      {availableClasses.length > 0 && (
        <Select
          value={selectedClassId || 'all'}
          onValueChange={(val) => onClassChange(val === 'all' ? null : val)}
        >
          <SelectTrigger className="h-7 w-16 px-2 text-xs border-border/50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle</SelectItem>
            {availableClasses.map((cls) => (
              <SelectItem key={cls.id} value={cls.id}>
                {cls.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
