import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Fixed class names A-E
const CLASS_NAMES = ['A', 'B', 'C', 'D', 'E'];

interface SchoolFilterDropdownsProps {
  gradeLevel: number;
  semester: 1 | 2;
  selectedClassName: string;
  onGradeLevelChange: (level: number) => void;
  onSemesterChange: (sem: 1 | 2) => void;
  onClassNameChange: (name: string) => void;
}

export function SchoolFilterDropdowns({
  gradeLevel,
  semester,
  selectedClassName,
  onGradeLevelChange,
  onSemesterChange,
  onClassNameChange,
}: SchoolFilterDropdownsProps) {
  // Grade levels 1-12 (not 13, as the Abitur year is the reference point)
  const gradeLevels = [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];

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

      {/* Class Name (A, B, C, D, E) */}
      <Select
        value={selectedClassName}
        onValueChange={onClassNameChange}
      >
        <SelectTrigger className="h-7 w-12 px-2 text-xs border-border/50">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {CLASS_NAMES.map((name) => (
            <SelectItem key={name} value={name}>
              {name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
