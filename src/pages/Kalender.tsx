import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, getSupabase } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { CalendarDays, ChevronLeft, ChevronRight, Menu, Calendar as CalIcon, List } from 'lucide-react';
import { format, addWeeks, subWeeks, addMonths, subMonths, addDays, subDays, getWeek } from 'date-fns';
import { de } from 'date-fns/locale';
import { AddEventDialog } from '@/components/calendar/AddEventDialog';
import { CalendarSidebar } from '@/components/calendar/CalendarSidebar';
import { WeekView } from '@/components/calendar/WeekView';
import { MonthView } from '@/components/calendar/MonthView';
import { DayView } from '@/components/calendar/DayView';
import { MobileCalendarView } from '@/components/calendar/MobileCalendarView';
import { Calendar, CalendarEvent, TimetableEntry, Task, ViewType } from '@/components/calendar/types';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

export default function Kalender() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<ViewType>('week');
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [timetableEntries, setTimetableEntries] = useState<TimetableEntry[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showTimetable, setShowTimetable] = useState(true);
  const [showTasks, setShowTasks] = useState(true);
  const [loadingData, setLoadingData] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editEvent, setEditEvent] = useState<CalendarEvent | null>(null);
  const [initialDate, setInitialDate] = useState<Date | undefined>();
  const [initialHour, setInitialHour] = useState<number | undefined>();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const weekNumber = getWeek(currentDate, { weekStartsOn: 1 });
  const weekType: 'A' | 'B' = weekNumber % 2 === 0 ? 'B' : 'A';

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) fetchAllData();
  }, [user]);

  const fetchAllData = async () => {
    const supabase = getSupabase();
    const [calendarsRes, eventsRes, timetableRes, tasksRes] = await Promise.all([
      supabase.from('calendars').select('*').order('created_at'),
      supabase.from('calendar_events').select('*').order('start_time'),
      supabase.from('timetable_entries').select('*, subject:subjects(name, short_name)').order('period'),
      supabase.from('tasks').select('*').eq('completed', false),
    ]);

    if (calendarsRes.data) {
      if (calendarsRes.data.length === 0) {
        // Create default calendar
        const { data: newCal } = await supabase.from('calendars').insert({
          user_id: user!.id,
          name: 'Mein Kalender',
          color: '#3b82f6',
          is_default: true,
          is_visible: true,
        }).select().single();
        if (newCal) setCalendars([newCal]);
      } else {
        setCalendars(calendarsRes.data);
      }
    }
    if (eventsRes.data) setEvents(eventsRes.data);
    if (timetableRes.data) setTimetableEntries(timetableRes.data);
    if (tasksRes.data) setTasks(tasksRes.data);
    setLoadingData(false);
  };

  const handleSlotClick = (date: Date, hour: number) => {
    setEditEvent(null);
    setInitialDate(date);
    setInitialHour(hour);
    setDialogOpen(true);
  };

  const handleEventClick = (event: CalendarEvent) => {
    setEditEvent(event);
    setInitialDate(undefined);
    setInitialHour(undefined);
    setDialogOpen(true);
  };

  const handleSaveEvent = async (eventData: Partial<CalendarEvent>) => {
    const supabase = getSupabase();
    if (eventData.id) {
      const { error } = await supabase.from('calendar_events').update(eventData).eq('id', eventData.id);
      if (error) { toast({ title: 'Fehler', description: error.message, variant: 'destructive' }); return; }
      setEvents(prev => prev.map(e => e.id === eventData.id ? { ...e, ...eventData } as CalendarEvent : e));
      toast({ title: 'Event aktualisiert' });
    } else {
      const insertData = { ...eventData, user_id: user!.id } as any;
      const { data, error } = await supabase.from('calendar_events').insert(insertData).select().single();
      if (error) { toast({ title: 'Fehler', description: error.message, variant: 'destructive' }); return; }
      setEvents(prev => [...prev, data]);
      toast({ title: 'Event erstellt' });
    }
  };

  const handleToggleCalendar = async (id: string) => {
    const cal = calendars.find(c => c.id === id);
    if (!cal) return;
    const supabase = getSupabase();
    await supabase.from('calendars').update({ is_visible: !cal.is_visible }).eq('id', id);
    setCalendars(prev => prev.map(c => c.id === id ? { ...c, is_visible: !c.is_visible } : c));
  };

  const handleAddCalendar = async (name: string, color: string) => {
    const supabase = getSupabase();
    const { data, error } = await supabase.from('calendars').insert({ user_id: user!.id, name, color, is_visible: true }).select().single();
    if (!error && data) setCalendars(prev => [...prev, data]);
  };

  const handleUpdateCalendar = async (id: string, updates: Partial<Calendar>) => {
    const supabase = getSupabase();
    await supabase.from('calendars').update(updates).eq('id', id);
    setCalendars(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const handleDeleteCalendar = async (id: string) => {
    const supabase = getSupabase();
    await supabase.from('calendars').delete().eq('id', id);
    setCalendars(prev => prev.filter(c => c.id !== id));
    setEvents(prev => prev.filter(e => e.calendar_id !== id));
  };

  const handleNavigate = (direction: 'prev' | 'next' | 'today') => {
    if (direction === 'today') { setCurrentDate(new Date()); return; }
    const fn = direction === 'next' ? (view === 'month' ? addMonths : view === 'week' ? addWeeks : addDays) : (view === 'month' ? subMonths : view === 'week' ? subWeeks : subDays);
    setCurrentDate(fn(currentDate, 1));
  };

  if (loading || !user) return null;

  const sidebarContent = (
    <CalendarSidebar
      calendars={calendars}
      onToggleCalendar={handleToggleCalendar}
      onAddCalendar={handleAddCalendar}
      onUpdateCalendar={handleUpdateCalendar}
      onDeleteCalendar={handleDeleteCalendar}
      tasks={tasks}
      showTimetable={showTimetable}
      onToggleTimetable={() => setShowTimetable(!showTimetable)}
      showTasks={showTasks}
      onToggleTasks={() => setShowTasks(!showTasks)}
    />
  );

  return (
    <AppLayout>
      <div className="h-[calc(100vh-4rem)] flex flex-col">
        {/* Header */}
        <div className="p-3 md:p-4 border-b border-border/50 bg-card/50">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 md:gap-4">
              {isMobile && (
                <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="icon"><Menu className="w-4 h-4" /></Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="p-0 w-72">{sidebarContent}</SheetContent>
                </Sheet>
              )}
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-primary/10"><CalendarDays className="w-5 h-5 text-primary" /></div>
                <div className="hidden sm:block">
                  <h1 className="text-lg font-bold">Kalender</h1>
                  <p className="text-xs text-muted-foreground">{format(currentDate, 'MMMM yyyy', { locale: de })}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 md:gap-2">
              <Badge variant="outline" className="hidden sm:flex">{weekType}-Woche</Badge>
              <Button variant="outline" size="icon" onClick={() => handleNavigate('prev')}><ChevronLeft className="w-4 h-4" /></Button>
              <Button variant="outline" size="sm" onClick={() => handleNavigate('today')}>Heute</Button>
              <Button variant="outline" size="icon" onClick={() => handleNavigate('next')}><ChevronRight className="w-4 h-4" /></Button>
              {!isMobile && (
                <div className="flex ml-2 border rounded-lg overflow-hidden">
                  {(['day', 'week', 'month'] as ViewType[]).map(v => (
                    <Button key={v} variant={view === v ? 'default' : 'ghost'} size="sm" className="rounded-none" onClick={() => setView(v)}>
                      {v === 'day' ? 'Tag' : v === 'week' ? 'Woche' : 'Monat'}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {!isMobile && sidebarContent}
          <Card className="flex-1 overflow-hidden border-0 rounded-none">
            {isMobile ? (
              <MobileCalendarView
                currentDate={currentDate}
                onDateChange={setCurrentDate}
                events={events}
                calendars={calendars}
                timetableEntries={timetableEntries}
                tasks={tasks}
                showTimetable={showTimetable}
                showTasks={showTasks}
                weekType={weekType}
                onAddEvent={() => { setEditEvent(null); setInitialDate(currentDate); setDialogOpen(true); }}
                onEventClick={handleEventClick}
              />
            ) : view === 'week' ? (
              <WeekView currentDate={currentDate} events={events} calendars={calendars} timetableEntries={timetableEntries} tasks={tasks} showTimetable={showTimetable} showTasks={showTasks} weekType={weekType} onSlotClick={handleSlotClick} onEventClick={handleEventClick} />
            ) : view === 'month' ? (
              <MonthView currentDate={currentDate} events={events} calendars={calendars} tasks={tasks} showTasks={showTasks} onDayClick={(d) => { setCurrentDate(d); setView('day'); }} onEventClick={handleEventClick} />
            ) : (
              <DayView currentDate={currentDate} events={events} calendars={calendars} timetableEntries={timetableEntries} tasks={tasks} showTimetable={showTimetable} showTasks={showTasks} weekType={weekType} onSlotClick={handleSlotClick} onEventClick={handleEventClick} />
            )}
          </Card>
        </div>
      </div>

      <AddEventDialog open={dialogOpen} onOpenChange={setDialogOpen} onSave={handleSaveEvent} calendars={calendars} initialDate={initialDate} initialHour={initialHour} editEvent={editEvent} />
    </AppLayout>
  );
}
