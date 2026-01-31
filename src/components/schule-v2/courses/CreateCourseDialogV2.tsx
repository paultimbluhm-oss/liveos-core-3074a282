import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSchoolV2 } from '../context/SchoolV2Context';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';

interface CreateCourseDialogV2Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

const COURSE_COLORS = [
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e', '#ef4444', '#f97316',
  '#eab308', '#84cc16', '#22c55e', '#14b8a6',
  '#06b6d4', '#0ea5e9', '#3b82f6', '#64748b',
];

export function CreateCourseDialogV2({ open, onOpenChange, onCreated }: CreateCourseDialogV2Props) {
  const { user } = useAuth();
  const { scope } = useSchoolV2();
  
  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [room, setRoom] = useState('');
  const [color, setColor] = useState(COURSE_COLORS[0]);
  const [isClassCourse, setIsClassCourse] = useState(true);
  
  // Notengewichtung
  const [hasPractical, setHasPractical] = useState(false);
  const [oralWeight, setOralWeight] = useState(40);
  const [writtenWeight, setWrittenWeight] = useState(60);
  const [practicalWeight, setPracticalWeight] = useState(0);

  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!user || !scope.school || !name.trim()) return;

    setLoading(true);

    // Create course
    const { data: course, error } = await supabase
      .from('v2_courses')
      .insert({
        school_id: scope.school.id,
        grade_level: scope.gradeLevel,
        semester: scope.semester,
        class_name: isClassCourse ? scope.className : null,
        name: name.trim(),
        short_name: shortName.trim() || null,
        teacher_name: teacherName.trim() || null,
        room: room.trim() || null,
        color,
        has_oral: true,
        has_written: true,
        has_practical: hasPractical,
        oral_weight: oralWeight,
        written_weight: writtenWeight,
        practical_weight: hasPractical ? practicalWeight : 0,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Fehler beim Erstellen:', error);
      setLoading(false);
      return;
    }

    // Auto-join the course
    if (course) {
      await supabase
        .from('v2_course_members')
        .insert({
          course_id: course.id,
          user_id: user.id,
          role: 'admin',
        });
    }

    // Reset form
    setName('');
    setShortName('');
    setTeacherName('');
    setRoom('');
    setColor(COURSE_COLORS[0]);
    setIsClassCourse(true);
    setHasPractical(false);
    setOralWeight(40);
    setWrittenWeight(60);
    setPracticalWeight(0);

    setLoading(false);
    onOpenChange(false);
    onCreated?.();
  };

  // Adjust weights when practical is toggled
  const handlePracticalToggle = (enabled: boolean) => {
    setHasPractical(enabled);
    if (enabled) {
      setOralWeight(30);
      setWrittenWeight(50);
      setPracticalWeight(20);
    } else {
      setOralWeight(40);
      setWrittenWeight(60);
      setPracticalWeight(0);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Kurs erstellen</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Scope Info */}
          <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
            Wird erstellt für: <span className="font-medium text-foreground">
              {scope.gradeLevel}. Klasse · {scope.semester}. Halbjahr
              {isClassCourse && ` · Klasse ${scope.className}`}
            </span>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label>Kursname</Label>
            <Input 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z.B. Mathematik"
            />
          </div>

          {/* Short Name */}
          <div className="space-y-2">
            <Label>Kürzel</Label>
            <Input 
              value={shortName}
              onChange={(e) => setShortName(e.target.value)}
              placeholder="z.B. Ma"
              maxLength={4}
            />
          </div>

          {/* Teacher */}
          <div className="space-y-2">
            <Label>Lehrer (optional)</Label>
            <Input 
              value={teacherName}
              onChange={(e) => setTeacherName(e.target.value)}
              placeholder="z.B. Herr Müller"
            />
          </div>

          {/* Room */}
          <div className="space-y-2">
            <Label>Raum (optional)</Label>
            <Input 
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              placeholder="z.B. A201"
            />
          </div>

          {/* Color */}
          <div className="space-y-2">
            <Label>Farbe</Label>
            <div className="flex flex-wrap gap-2">
              {COURSE_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full transition-all ${
                    color === c ? 'ring-2 ring-offset-2 ring-primary scale-110' : ''
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Course Type */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div>
              <div className="font-medium text-sm">Klassenkurs</div>
              <div className="text-xs text-muted-foreground">
                {isClassCourse ? `Nur für Klasse ${scope.className}` : 'Für gesamten Jahrgang sichtbar'}
              </div>
            </div>
            <Switch checked={isClassCourse} onCheckedChange={setIsClassCourse} />
          </div>

          {/* Grading */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Praxisnote aktivieren</Label>
              <Switch checked={hasPractical} onCheckedChange={handlePracticalToggle} />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Mündlich: {oralWeight}%</span>
                <span>Schriftlich: {writtenWeight}%</span>
                {hasPractical && <span>Praxis: {practicalWeight}%</span>}
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs w-8">M</span>
                  <Slider
                    value={[oralWeight]}
                    onValueChange={([v]) => {
                      setOralWeight(v);
                      if (hasPractical) {
                        const remaining = 100 - v;
                        setWrittenWeight(Math.round(remaining * 0.7));
                        setPracticalWeight(remaining - Math.round(remaining * 0.7));
                      } else {
                        setWrittenWeight(100 - v);
                      }
                    }}
                    max={80}
                    min={10}
                    step={5}
                  />
                </div>
              </div>
            </div>
          </div>

          <Button 
            onClick={handleCreate} 
            disabled={!name.trim() || loading}
            className="w-full"
          >
            Kurs erstellen
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
