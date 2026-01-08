import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Plus, GraduationCap, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { School, SchoolYear } from './types';
import { CoursesSection } from './CoursesSection';

interface SchoolYearsSectionProps {
  school: School;
  onBack: () => void;
}

export function SchoolYearsSection({ school, onBack }: SchoolYearsSectionProps) {
  const { user } = useAuth();
  const [years, setYears] = useState<SchoolYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState<SchoolYear | null>(null);
  
  const [name, setName] = useState('');
  const [yearNumber, setYearNumber] = useState('');

  const fetchYears = async () => {
    const { data, error } = await supabase
      .from('school_years')
      .select('*')
      .eq('school_id', school.id)
      .order('year_number', { nullsFirst: false });
    
    if (!error && data) {
      setYears(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchYears();
  }, [school.id]);

  const handleCreate = async () => {
    if (!user || !name.trim()) {
      toast.error('Name erforderlich');
      return;
    }

    const { error } = await supabase.from('school_years').insert({
      school_id: school.id,
      name: name.trim(),
      year_number: yearNumber ? parseInt(yearNumber) : null,
      created_by: user.id,
    });

    if (error) {
      toast.error('Fehler beim Erstellen');
    } else {
      toast.success('Jahrgang erstellt');
      setDialogOpen(false);
      setName('');
      setYearNumber('');
      fetchYears();
    }
  };

  if (selectedYear) {
    return (
      <CoursesSection 
        schoolYear={selectedYear}
        schoolName={school.name}
        onBack={() => setSelectedYear(null)} 
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <p className="text-[10px] text-muted-foreground">{school.name}</p>
            <h2 className="text-lg font-bold">Jahrgaenge</h2>
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-8 px-2.5">
              <Plus className="w-4 h-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Jahrgang erstellen</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 pt-2">
              <div>
                <Label className="text-xs">Name</Label>
                <Input 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  placeholder="z.B. Abitur 2026"
                  className="h-9"
                />
              </div>
              <div>
                <Label className="text-xs">Klassenstufe (optional)</Label>
                <Input 
                  type="number"
                  value={yearNumber} 
                  onChange={(e) => setYearNumber(e.target.value)} 
                  placeholder="z.B. 12"
                  className="h-9"
                />
              </div>
              <Button onClick={handleCreate} className="w-full">
                Erstellen
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {years.length === 0 ? (
        <div className="py-12 text-center">
          <GraduationCap className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">Keine Jahrgaenge vorhanden</p>
          <p className="text-xs text-muted-foreground/70">Erstelle einen Jahrgang</p>
        </div>
      ) : (
        <div className="space-y-2">
          {years.map(year => (
            <Card 
              key={year.id} 
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => setSelectedYear(year)}
            >
              <CardContent className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center text-white font-bold">
                    {year.year_number || year.name[0]}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{year.name}</p>
                    {year.year_number && (
                      <p className="text-[10px] text-muted-foreground">Klasse {year.year_number}</p>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
