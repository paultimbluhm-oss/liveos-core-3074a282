import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Plus, BookOpen, Calendar, Users, Clock, AlertCircle, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO, isPast, isToday, addDays, isTomorrow } from 'date-fns';
import { de } from 'date-fns/locale';
import { Course, CourseMember, SharedHomework, SharedEvent } from './types';

interface CourseDetailSectionProps {
  course: Course;
  onBack: () => void;
}

export function CourseDetailSection({ course, onBack }: CourseDetailSectionProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('homework');
  const [members, setMembers] = useState<CourseMember[]>([]);
  const [homework, setHomework] = useState<SharedHomework[]>([]);
  const [events, setEvents] = useState<SharedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [hwDialogOpen, setHwDialogOpen] = useState(false);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  
  const [hwTitle, setHwTitle] = useState('');
  const [hwDescription, setHwDescription] = useState('');
  const [hwDueDate, setHwDueDate] = useState('');
  const [hwPriority, setHwPriority] = useState('medium');
  
  const [eventTitle, setEventTitle] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventType, setEventType] = useState('exam');

  const fetchData = async () => {
    if (!user) return;

    const [membersRes, hwRes, eventsRes] = await Promise.all([
      supabase
        .from('course_members')
        .select('*')
        .eq('course_id', course.id),
      supabase
        .from('shared_homework')
        .select('*')
        .eq('course_id', course.id)
        .order('due_date'),
      supabase
        .from('shared_events')
        .select('*')
        .eq('course_id', course.id)
        .order('event_date'),
    ]);

    // Enrich with profile data
    if (membersRes.data) {
      const enrichedMembers = await Promise.all(membersRes.data.map(async (m) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username, display_name')
          .eq('user_id', m.user_id)
          .maybeSingle();
        return { ...m, profile };
      }));
      setMembers(enrichedMembers);
    }

    if (hwRes.data) {
      const enrichedHw = await Promise.all(hwRes.data.map(async (h) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username, display_name')
          .eq('user_id', h.shared_by)
          .maybeSingle();
        return { ...h, sharer_profile: profile };
      }));
      setHomework(enrichedHw);
    }

    if (eventsRes.data) {
      const enrichedEvents = await Promise.all(eventsRes.data.map(async (e) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username, display_name')
          .eq('user_id', e.shared_by)
          .maybeSingle();
        return { ...e, sharer_profile: profile };
      }));
      setEvents(enrichedEvents);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [course.id, user]);

  const shareHomework = async () => {
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
      setHwDialogOpen(false);
      setHwTitle('');
      setHwDescription('');
      setHwDueDate('');
      setHwPriority('medium');
      fetchData();
    }
  };

  const shareEvent = async () => {
    if (!user || !eventTitle.trim() || !eventDate) {
      toast.error('Titel und Datum erforderlich');
      return;
    }

    const { error } = await supabase.from('shared_events').insert({
      course_id: course.id,
      title: eventTitle.trim(),
      description: eventDescription.trim() || null,
      event_date: eventDate,
      event_type: eventType,
      shared_by: user.id,
    });

    if (error) {
      toast.error('Fehler beim Teilen');
    } else {
      toast.success('Termin geteilt');
      setEventDialogOpen(false);
      setEventTitle('');
      setEventDescription('');
      setEventDate('');
      setEventType('exam');
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
    const date = parseISO(dateStr);
    if (isPast(date) && !isToday(date)) return { label: 'Ueberfaellig', color: 'text-rose-500' };
    if (isToday(date)) return { label: 'Heute', color: 'text-amber-500' };
    if (isTomorrow(date)) return { label: 'Morgen', color: 'text-amber-500' };
    return { label: format(date, 'dd.MM.', { locale: de }), color: 'text-muted-foreground' };
  };

  const getEventTypeLabel = (type: string) => {
    switch (type) {
      case 'exam': return 'Klausur';
      case 'test': return 'Test';
      case 'presentation': return 'Vortrag';
      case 'deadline': return 'Abgabe';
      default: return 'Termin';
    }
  };

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
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-sm">
              {(course.short_name || course.name)[0].toUpperCase()}
            </div>
            <div>
              <h2 className="text-lg font-bold">{course.name}</h2>
              {course.teacher_name && (
                <p className="text-[10px] text-muted-foreground">{course.teacher_name}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="p-3 rounded-xl bg-secondary/40 text-center">
          <p className="text-xl font-bold">{members.length}</p>
          <p className="text-[10px] text-muted-foreground">Mitglieder</p>
        </div>
        <div className="p-3 rounded-xl bg-secondary/40 text-center">
          <p className="text-xl font-bold">{homework.filter(h => !isPast(parseISO(h.due_date)) || isToday(parseISO(h.due_date))).length}</p>
          <p className="text-[10px] text-muted-foreground">Hausaufgaben</p>
        </div>
        <div className="p-3 rounded-xl bg-secondary/40 text-center">
          <p className="text-xl font-bold">{events.filter(e => !isPast(parseISO(e.event_date)) || isToday(parseISO(e.event_date))).length}</p>
          <p className="text-[10px] text-muted-foreground">Termine</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="homework" className="text-xs">Hausaufgaben</TabsTrigger>
          <TabsTrigger value="events" className="text-xs">Termine</TabsTrigger>
          <TabsTrigger value="members" className="text-xs">Mitglieder</TabsTrigger>
        </TabsList>

        {/* Homework Tab */}
        <TabsContent value="homework" className="space-y-3 mt-3">
          <Dialog open={hwDialogOpen} onOpenChange={setHwDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="w-full gap-1">
                <Share2 className="w-4 h-4" />
                Hausaufgabe teilen
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Hausaufgabe teilen</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 pt-2">
                <div>
                  <Label className="text-xs">Titel</Label>
                  <Input 
                    value={hwTitle} 
                    onChange={(e) => setHwTitle(e.target.value)} 
                    placeholder="z.B. Seite 42, Nr. 1-5"
                    className="h-9"
                  />
                </div>
                <div>
                  <Label className="text-xs">Beschreibung</Label>
                  <Textarea 
                    value={hwDescription} 
                    onChange={(e) => setHwDescription(e.target.value)} 
                    placeholder="Optional"
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Faellig am</Label>
                    <Input 
                      type="date"
                      value={hwDueDate} 
                      onChange={(e) => setHwDueDate(e.target.value)}
                      className="h-9"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Prioritaet</Label>
                    <Select value={hwPriority} onValueChange={setHwPriority}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Niedrig</SelectItem>
                        <SelectItem value="medium">Mittel</SelectItem>
                        <SelectItem value="high">Hoch</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button onClick={shareHomework} className="w-full">
                  Teilen
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {homework.length === 0 ? (
            <div className="py-8 text-center">
              <BookOpen className="w-10 h-10 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">Keine Hausaufgaben</p>
            </div>
          ) : (
            <div className="space-y-2">
              {homework.map(hw => {
                const dateInfo = getDueDateLabel(hw.due_date);
                return (
                  <Card key={hw.id} className="border-border/50">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm">{hw.title}</p>
                            {hw.priority === 'high' && (
                              <AlertCircle className="w-3 h-3 text-rose-500" />
                            )}
                          </div>
                          {hw.description && (
                            <p className="text-xs text-muted-foreground mt-0.5">{hw.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1.5 text-[10px] text-muted-foreground">
                            <span className={dateInfo.color}>{dateInfo.label}</span>
                            <span>von {hw.sharer_profile?.display_name || hw.sharer_profile?.username || 'Unbekannt'}</span>
                          </div>
                        </div>
                        {hw.shared_by === user?.id && (
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-7 text-xs text-muted-foreground"
                            onClick={() => deleteHomework(hw.id)}
                          >
                            Loeschen
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

        {/* Events Tab */}
        <TabsContent value="events" className="space-y-3 mt-3">
          <Dialog open={eventDialogOpen} onOpenChange={setEventDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="w-full gap-1">
                <Share2 className="w-4 h-4" />
                Termin teilen
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Termin teilen</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 pt-2">
                <div>
                  <Label className="text-xs">Titel</Label>
                  <Input 
                    value={eventTitle} 
                    onChange={(e) => setEventTitle(e.target.value)} 
                    placeholder="z.B. Klausur Analysis"
                    className="h-9"
                  />
                </div>
                <div>
                  <Label className="text-xs">Beschreibung</Label>
                  <Textarea 
                    value={eventDescription} 
                    onChange={(e) => setEventDescription(e.target.value)} 
                    placeholder="Optional"
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Datum</Label>
                    <Input 
                      type="date"
                      value={eventDate} 
                      onChange={(e) => setEventDate(e.target.value)}
                      className="h-9"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Typ</Label>
                    <Select value={eventType} onValueChange={setEventType}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="exam">Klausur</SelectItem>
                        <SelectItem value="test">Test</SelectItem>
                        <SelectItem value="presentation">Vortrag</SelectItem>
                        <SelectItem value="deadline">Abgabe</SelectItem>
                        <SelectItem value="other">Sonstiges</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button onClick={shareEvent} className="w-full">
                  Teilen
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {events.length === 0 ? (
            <div className="py-8 text-center">
              <Calendar className="w-10 h-10 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">Keine Termine</p>
            </div>
          ) : (
            <div className="space-y-2">
              {events.map(event => {
                const dateInfo = getDueDateLabel(event.event_date);
                return (
                  <Card key={event.id} className="border-border/50">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary">
                              {getEventTypeLabel(event.event_type)}
                            </span>
                            <p className="font-medium text-sm">{event.title}</p>
                          </div>
                          {event.description && (
                            <p className="text-xs text-muted-foreground mt-0.5">{event.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1.5 text-[10px] text-muted-foreground">
                            <span className={dateInfo.color}>{dateInfo.label}</span>
                            <span>von {event.sharer_profile?.display_name || event.sharer_profile?.username || 'Unbekannt'}</span>
                          </div>
                        </div>
                        {event.shared_by === user?.id && (
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-7 text-xs text-muted-foreground"
                            onClick={() => deleteEvent(event.id)}
                          >
                            Loeschen
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

        {/* Members Tab */}
        <TabsContent value="members" className="space-y-3 mt-3">
          {members.length === 0 ? (
            <div className="py-8 text-center">
              <Users className="w-10 h-10 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">Keine Mitglieder</p>
            </div>
          ) : (
            <div className="space-y-2">
              {members.map(member => (
                <Card key={member.id} className="border-border/50">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-sm">
                      {(member.profile?.display_name || member.profile?.username || '?')[0].toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">
                        {member.profile?.display_name || member.profile?.username || 'Unbekannt'}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {member.role === 'admin' ? 'Admin' : 'Mitglied'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
