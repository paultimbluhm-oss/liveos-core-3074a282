import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Plus, Building2, Users, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { School, SchoolYear } from './types';
import { SchoolYearsSection } from './SchoolYearsSection';

interface SchoolsSectionProps {
  onBack: () => void;
}

export function SchoolsSection({ onBack }: SchoolsSectionProps) {
  const { user } = useAuth();
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  
  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [description, setDescription] = useState('');

  const fetchSchools = async () => {
    const { data, error } = await supabase
      .from('schools')
      .select('*')
      .order('name');
    
    if (!error && data) {
      setSchools(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSchools();
  }, []);

  const handleCreate = async () => {
    if (!user || !name.trim()) {
      toast.error('Name erforderlich');
      return;
    }

    const { error } = await supabase.from('schools').insert({
      name: name.trim(),
      short_name: shortName.trim() || null,
      description: description.trim() || null,
      created_by: user.id,
    });

    if (error) {
      toast.error('Fehler beim Erstellen');
    } else {
      toast.success('Schule erstellt');
      setDialogOpen(false);
      setName('');
      setShortName('');
      setDescription('');
      fetchSchools();
    }
  };

  if (selectedSchool) {
    return (
      <SchoolYearsSection 
        school={selectedSchool} 
        onBack={() => setSelectedSchool(null)} 
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
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-lg font-bold">Schulen</h2>
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
              <DialogTitle>Schule erstellen</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 pt-2">
              <div>
                <Label className="text-xs">Name</Label>
                <Input 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  placeholder="z.B. Max-Planck-Gymnasium"
                  className="h-9"
                />
              </div>
              <div>
                <Label className="text-xs">Kuerzel</Label>
                <Input 
                  value={shortName} 
                  onChange={(e) => setShortName(e.target.value)} 
                  placeholder="z.B. MPG"
                  className="h-9"
                />
              </div>
              <div>
                <Label className="text-xs">Beschreibung</Label>
                <Textarea 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  placeholder="Optional"
                  rows={2}
                />
              </div>
              <Button onClick={handleCreate} className="w-full">
                Erstellen
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {schools.length === 0 ? (
        <div className="py-12 text-center">
          <Building2 className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">Keine Schulen vorhanden</p>
          <p className="text-xs text-muted-foreground/70">Erstelle eine Schule, um loszulegen</p>
        </div>
      ) : (
        <div className="space-y-2">
          {schools.map(school => (
            <Card 
              key={school.id} 
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => setSelectedSchool(school)}
            >
              <CardContent className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">
                    {(school.short_name || school.name)[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{school.name}</p>
                    {school.short_name && (
                      <p className="text-[10px] text-muted-foreground">{school.short_name}</p>
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
