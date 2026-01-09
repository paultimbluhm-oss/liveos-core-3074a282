import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, BookOpen, Calendar, Users, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { format, isPast, isToday, isTomorrow, addDays } from 'date-fns';
import { de } from 'date-fns/locale';
import { Course, CourseMember, SharedHomework, SharedEvent } from './types';

interface CourseDetailViewProps {
  course: Course;
  onBack: () => void;
}

export function CourseDetailView({ course, onBack }: CourseDetailViewProps) {
  const { user } = useAuth();
  const [members, setMembers] = useState<CourseMember[]>([]);
  const [homework, setHomework] = useState<SharedHomework[]>([]);
  const [events, setEvents] = useState<SharedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [homeworkDialogOpen, setHomeworkDialogOpen] = useState(false);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  
  // Homework form
  const [hwTitle, setHwTitle] = useState('');
  const [hwDescription, setHwDescription] = useState('');
  const [hwDueDate, setHwDueDate] = useState('');
  const [hwPriority, setHwPriority] = useState('medium');
  
  // Event form
  const [evTitle, setEvTitle] = useState('');
  const [evDescription, setEvDescription] = useState('');
  const [evDate, setEvDate] = useState('');
  const [evType, setEvType] = useState('klausur');

  const fetchData = async () => {
    if (!user) return;
    
    const [membersRes, homeworkRes, eventsRes] = await Promise.all([
      supabase
        .from('course_members')
        .select('*, profiles:user_id(username, display_name)')
        .eq('course_id', course.id),
      supabase
        .from('shared_homework')
        .select('*, profiles:shared_by(username, display_name)')
        .eq('course_id', course.id)
        .order('due_date'),
      supabase
        .from('shared_events')
        .select('*, profiles:shared_by(username, display_name)')
        .eq('course_id', course.id)
        .order('event_date'),
    ]);
    
    if (membersRes.data) {
      setMembers(membersRes.data.map((m: any) => ({
        ...m,
        profile: m.profiles,
      })));
    }
    
    if (homeworkRes.data) {
      setHomework(homeworkRes.data.map((h: any) => ({
        ...h,
        sharer_profile: h.profiles,
      })));
    }
    
    if (eventsRes.data) {
      setEvents(eventsRes.data.map((e: any) => ({
        ...e,
        sharer_profile: e.profiles,
      })));
    }
    
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [course.id, user]);

  const handleShareHomework = async () => {
    if (!user || !hwTitle.trim() || !hwDueDate) {
      toast.error('Titel und Datum erforderlich');
      return;
    }
    
    const { error } = await supabase.from('shared_homework').insert({
      course_id: course.id,
      title: hwTitle.trim(),
      description: hwDescription.trim() || null,
      due_date: hwDueDate,
      priority: hwPriority,
      shared_by: user.id,
    });
    
    if (error) {
      toast.error('Fehler beim Teilen');
    } else {
      toast.success('Hausaufgabe geteilt');
      setHwTitle('');
      setHwDescription('');
      setHwDueDate('');
      setHwPriority('medium');
      setHomeworkDialogOpen(false);
      fetchData();
    }
  };

  const handleShareEvent = async () => {
    if (!user || !evTitle.trim() || !evDate) {
      toast.error('Titel und Datum erforderlich');
      return;
    }
    
    const { error } = await supabase.from('shared_events').insert({
      course_id: course.id,
      title: evTitle.trim(),
      description: evDescription.trim() || null,
      event_date: evDate,
      event_type: evType,
      shared_by: user.id,
    });
    
    if (error) {
      toast.error('Fehler beim Teilen');
    } else {
      toast.success('Termin geteilt');
      setEvTitle('');
      setEvDescription('');
      setEvDate('');
      setEvType('klausur');
      setEventDialogOpen(false);
      fetchData();
    }
  };

  const deleteHomework = async (id: string) => {
    const { error } = await supabase.from('shared_homework').delete().eq('id', id);
    if (!error) {
      toast.success('Geloescht');
      fetchData();
    }
  };

  const deleteEvent = async (id: string) => {
    const { error } = await supabase.from('shared_events').delete().eq('id', id);
    if (!error) {
      toast.success('Geloescht');
      fetchData();
    }
  };

  const getDueDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return { label: 'Heute', color: 'text-amber-500' };
    if (isTomorrow(date)) return { label: 'Morgen', color: 'text-blue-500' };
    if (isPast(date)) return { label: 'Ueberfaellig', color: 'text-rose-500' };
    return { label: format(date, 'EEE, d. MMM', { locale: de }), color: 'text-muted-foreground' };
  };

  const getEventTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      klausur: 'Klausur',
      test: 'Test',
      praesentation: 'Praesentation',
      abgabe: 'Abgabe',
      sonstiges: 'Sonstiges',
    };
    return labels[type] || type;
  };

  const quickDates = [
    { label: 'Morgen', value: format(addDays(new Date(), 1), 'yyyy-MM-dd') },
    { label: 'In 2 Tagen', value: format(addDays(new Date(), 2), 'yyyy-MM-dd') },
    { label: '1 Woche', value: format(addDays(new Date(), 7), 'yyyy-MM-dd') },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
          <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
        </Button>
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg border-2 border-emerald-500 flex items-center justify-center">
            <span className="text-xs font-bold text-emerald-500">
              {(course.short_name || course.name).slice(0, 2).toUpperCase()}
            </span>
          </div>
          <div>
            <h2 className="font-bold">{course.name}</h2>
            {course.teacher_name && (
              <p className="text-[10px] text-muted-foreground">{course.teacher_name}</p>
            )}
          </div>
        </div>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="p-3 rounded-xl bg-card border border-border/50 text-center">
          <div className="text-lg font-bold">{members.length}</div>
          <div className="text-[10px] text-muted-foreground">Mitglieder</div>
        </div>
        <div className="p-3 rounded-xl bg-card border border-border/50 text-center">
          <div className="text-lg font-bold">{homework.filter(h => !isPast(new Date(h.due_date)) || isToday(new Date(h.due_date))).length}</div>
          <div className="text-[10px] text-muted-foreground">Hausaufgaben</div>
        </div>
        <div className="p-3 rounded-xl bg-card border border-border/50 text-center">
          <div className="text-lg font-bold">{events.filter(e => !isPast(new Date(e.event_date)) || isToday(new Date(e.event_date))).length}</div>
          <div className="text-[10px] text-muted-foreground">Termine</div>
        </div>
      </div>
      
      {/* Tabs */}
      <Tabs defaultValue="homework">
        <TabsList className="grid w-full grid-cols-3 h-9">
          <TabsTrigger value="homework" className="text-xs gap-1">
            <BookOpen className="w-3 h-3" strokeWidth={1.5} />
            Hausaufgaben
          </TabsTrigger>
          <TabsTrigger value="events" className="text-xs gap-1">
            <Calendar className="w-3 h-3" strokeWidth={1.5} />
            Termine
          </TabsTrigger>
          <TabsTrigger value="members" className="text-xs gap-1">
            <Users className="w-3 h-3" strokeWidth={1.5} />
            Mitglieder
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="homework" className="mt-3 space-y-3">
          <Button 
            size="sm" 
            className="w-full h-8 text-xs gap-1"
            onClick={() => setHomeworkDialogOpen(true)}
          >
            <Plus className="w-3 h-3" strokeWidth={1.5} />
            Hausaufgabe teilen
          </Button>
          
          {homework.length === 0 ? (
            <div className="py-6 text-center">
              <BookOpen className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" strokeWidth={1.5} />
              <p className="text-xs text-muted-foreground">Keine Hausaufgaben</p>
            </div>
          ) : (
            <div className="space-y-2">
              {homework.map(hw => {
                const due = getDueDateLabel(hw.due_date);
                return (
                  <Card key={hw.id}>
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm">{hw.title}</p>
                          {hw.description && (
                            <p className="text-[10px] text-muted-foreground line-clamp-2">{hw.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1 text-[10px]">
                            <span className={due.color}>{due.label}</span>
                            <span className="text-muted-foreground">
                              von {hw.sharer_profile?.display_name || hw.sharer_profile?.username || 'Unbekannt'}
                            </span>
                          </div>
                        </div>
                        {hw.shared_by === user?.id && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6"
                            onClick={() => deleteHomework(hw.id)}
                          >
                            <Trash2 className="w-3 h-3" strokeWidth={1.5} />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="events" className="mt-3 space-y-3">
          <Button 
            size="sm" 
            className="w-full h-8 text-xs gap-1"
            onClick={() => setEventDialogOpen(true)}
          >
            <Plus className="w-3 h-3" strokeWidth={1.5} />
            Termin teilen
          </Button>
          
          {events.length === 0 ? (
            <div className="py-6 text-center">
              <Calendar className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" strokeWidth={1.5} />
              <p className="text-xs text-muted-foreground">Keine Termine</p>
            </div>
          ) : (
            <div className="space-y-2">
              {events.map(ev => {
                const eventDate = getDueDateLabel(ev.event_date);
                return (
                  <Card key={ev.id}>
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm">{ev.title}</p>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary">
                              {getEventTypeLabel(ev.event_type)}
                            </span>
                          </div>
                          {ev.description && (
                            <p className="text-[10px] text-muted-foreground line-clamp-2">{ev.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1 text-[10px]">
                            <span className={eventDate.color}>{eventDate.label}</span>
                            <span className="text-muted-foreground">
                              von {ev.sharer_profile?.display_name || ev.sharer_profile?.username || 'Unbekannt'}
                            </span>
                          </div>
                        </div>
                        {ev.shared_by === user?.id && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6"
                            onClick={() => deleteEvent(ev.id)}
                          >
                            <Trash2 className="w-3 h-3" strokeWidth={1.5} />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="members" className="mt-3">
          <div className="space-y-2">
            {members.map(member => (
              <Card key={member.id}>
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-medium">
                    {(member.profile?.display_name || member.profile?.username || '?')[0].toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {member.profile?.display_name || member.profile?.username || 'Unbekannt'}
                    </p>
                    <p className="text-[10px] text-muted-foreground capitalize">{member.role}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Homework Dialog */}
      <Dialog open={homeworkDialogOpen} onOpenChange={setHomeworkDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" strokeWidth={1.5} />
              Hausaufgabe teilen
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div>
              <Label className="text-xs">Titel</Label>
              <Input 
                value={hwTitle}
                onChange={(e) => setHwTitle(e.target.value)}
                placeholder="z.B. Aufgaben S. 42"
                className="h-9 mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Beschreibung</Label>
              <Textarea 
                value={hwDescription}
                onChange={(e) => setHwDescription(e.target.value)}
                placeholder="Optional"
                rows={2}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Faellig am</Label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {quickDates.map((qd) => (
                  <Button
                    key={qd.label}
                    type="button"
                    variant={hwDueDate === qd.value ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setHwDueDate(qd.value)}
                  >
                    {qd.label}
                  </Button>
                ))}
                <Input 
                  type="date"
                  value={hwDueDate}
                  onChange={(e) => setHwDueDate(e.target.value)}
                  className="h-7 w-auto text-xs"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Prioritaet</Label>
              <Select value={hwPriority} onValueChange={setHwPriority}>
                <SelectTrigger className="h-9 mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">Hoch</SelectItem>
                  <SelectItem value="medium">Mittel</SelectItem>
                  <SelectItem value="low">Niedrig</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleShareHomework} className="w-full" disabled={!hwTitle.trim() || !hwDueDate}>
              Teilen
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Event Dialog */}
      <Dialog open={eventDialogOpen} onOpenChange={setEventDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-4 h-4" strokeWidth={1.5} />
              Termin teilen
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div>
              <Label className="text-xs">Titel</Label>
              <Input 
                value={evTitle}
                onChange={(e) => setEvTitle(e.target.value)}
                placeholder="z.B. Mathe Klausur"
                className="h-9 mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Beschreibung</Label>
              <Textarea 
                value={evDescription}
                onChange={(e) => setEvDescription(e.target.value)}
                placeholder="Optional"
                rows={2}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Datum</Label>
              <Input 
                type="date"
                value={evDate}
                onChange={(e) => setEvDate(e.target.value)}
                className="h-9 mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Art</Label>
              <Select value={evType} onValueChange={setEvType}>
                <SelectTrigger className="h-9 mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="klausur">Klausur</SelectItem>
                  <SelectItem value="test">Test</SelectItem>
                  <SelectItem value="praesentation">Praesentation</SelectItem>
                  <SelectItem value="abgabe">Abgabe</SelectItem>
                  <SelectItem value="sonstiges">Sonstiges</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleShareEvent} className="w-full" disabled={!evTitle.trim() || !evDate}>
              Teilen
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}