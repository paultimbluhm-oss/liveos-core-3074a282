import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSchoolV2 } from '../context/SchoolV2Context';
import { V2School } from '../types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GraduationCap, Plus, Users } from 'lucide-react';

export function SchoolSetupV2() {
  const { createSchool, joinSchool } = useSchoolV2();
  
  const [tab, setTab] = useState<'join' | 'create'>('join');
  const [loading, setLoading] = useState(false);
  
  // Join state
  const [schools, setSchools] = useState<V2School[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('');
  const [joinAbiturYear, setJoinAbiturYear] = useState<number>(new Date().getFullYear() + 2);
  
  // Create state
  const [schoolName, setSchoolName] = useState('');
  const [shortName, setShortName] = useState('');
  const [createAbiturYear, setCreateAbiturYear] = useState<number>(new Date().getFullYear() + 2);

  // Load available schools
  useEffect(() => {
    const loadSchools = async () => {
      const { data } = await supabase
        .from('v2_schools')
        .select('*')
        .order('name');
      
      if (data) setSchools(data);
    };
    loadSchools();
  }, []);

  const handleJoin = async () => {
    if (!selectedSchoolId) return;
    setLoading(true);
    await joinSchool(selectedSchoolId, joinAbiturYear);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!schoolName.trim()) return;
    setLoading(true);
    await createSchool(schoolName.trim(), shortName.trim(), createAbiturYear);
    setLoading(false);
  };

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 8 }, (_, i) => currentYear + i);

  return (
    <div className="p-4 max-w-lg mx-auto">
      <Card>
        <CardContent className="p-6 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
              <GraduationCap className="w-8 h-8 text-primary" strokeWidth={1.5} />
            </div>
            <h1 className="text-xl font-semibold">Schule einrichten</h1>
            <p className="text-sm text-muted-foreground">
              Tritt einer Schule bei oder erstelle eine neue
            </p>
          </div>

          <Tabs value={tab} onValueChange={(v) => setTab(v as 'join' | 'create')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="join" className="gap-2">
                <Users className="w-4 h-4" strokeWidth={1.5} />
                Beitreten
              </TabsTrigger>
              <TabsTrigger value="create" className="gap-2">
                <Plus className="w-4 h-4" strokeWidth={1.5} />
                Erstellen
              </TabsTrigger>
            </TabsList>

            <TabsContent value="join" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Schule</Label>
                <Select value={selectedSchoolId} onValueChange={setSelectedSchoolId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Schule auswählen..." />
                  </SelectTrigger>
                  <SelectContent>
                    {schools.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} {s.short_name && `(${s.short_name})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Abitur-Jahr</Label>
                <Select 
                  value={joinAbiturYear.toString()} 
                  onValueChange={(v) => setJoinAbiturYear(parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {yearOptions.map(y => (
                      <SelectItem key={y} value={y.toString()}>
                        Abitur {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button 
                onClick={handleJoin} 
                disabled={!selectedSchoolId || loading}
                className="w-full"
              >
                Beitreten
              </Button>
            </TabsContent>

            <TabsContent value="create" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Schulname</Label>
                <Input 
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  placeholder="z.B. Max-Planck-Gymnasium"
                />
              </div>

              <div className="space-y-2">
                <Label>Kürzel (optional)</Label>
                <Input 
                  value={shortName}
                  onChange={(e) => setShortName(e.target.value)}
                  placeholder="z.B. MPG"
                />
              </div>

              <div className="space-y-2">
                <Label>Dein Abitur-Jahr</Label>
                <Select 
                  value={createAbiturYear.toString()} 
                  onValueChange={(v) => setCreateAbiturYear(parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {yearOptions.map(y => (
                      <SelectItem key={y} value={y.toString()}>
                        Abitur {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button 
                onClick={handleCreate} 
                disabled={!schoolName.trim() || loading}
                className="w-full"
              >
                Schule erstellen
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
