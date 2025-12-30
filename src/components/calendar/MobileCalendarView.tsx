import { useState } from 'react';
import { format, addDays, subDays, isToday, isSameDay, parseISO, startOfWeek } from 'date-fns';
import { de } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, MapPin, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { CalendarEvent, Calendar, TimetableEntry, Task, LESSON_TIMES } from './types';

interface MobileCalendarViewProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  events: CalendarEvent[];
  calendars: Calendar[];
  timetableEntries: TimetableEntry[];
  tasks: Task[];
  showTimetable: boolean;
  showTasks: boolean;
  weekType: 'A' | 'B';
  onAddEvent: () => void;
  onEventClick: (event: CalendarEvent) => void;
}

export function MobileCalendarView({
  currentDate,
  onDateChange,
  events,
  calendars,
  timetableEntries,
  tasks,
  showTimetable,
  showTasks,
  weekType,
  onAddEvent,
  onEventClick,
}: MobileCalendarViewProps) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const dayOfWeek = currentDate.getDay() === 0 ? 7 : currentDate.getDay();

  const getTimetableEntries = () => {
    if (!showTimetable) return [];
    return timetableEntries.filter(entry => {
      if (entry.day_of_week !== dayOfWeek) return false;
      if (!entry.week_type || entry.week_type === 'both') return true;
      return entry.week_type.toUpperCase() === weekType;
    }).sort((a, b) => a.period - b.period);
  };

  const dayEvents = events.filter(event => {
    const eventDate = parseISO(event.start_time);
    const cal = calendars.find(c => c.id === event.calendar_id);
    return isSameDay(eventDate, currentDate) && (!cal || cal.is_visible);
  });

  const dayTasks = showTasks ? tasks.filter(task => {
    if (!task.due_date || task.completed) return false;
    return isSameDay(new Date(task.due_date), currentDate);
  }) : [];

  const timetableEntriesForDay = getTimetableEntries();

  const getCalendarColor = (calendarId: string | null) => {
    if (!calendarId) return '#3b82f6';
    const calendar = calendars.find(c => c.id === calendarId);
    return calendar?.color || '#3b82f6';
  };

  // Combine all items for timeline
  const allItems = [
    ...timetableEntriesForDay.map(entry => ({
      type: 'timetable' as const,
      id: entry.id,
      title: entry.subject?.name || entry.teacher_short,
      subtitle: `${entry.room || ''} ${entry.teacher_short}`.trim(),
      startTime: LESSON_TIMES[entry.period]?.start || '00:00',
      endTime: LESSON_TIMES[entry.period]?.end || '00:00',
      color: null,
    })),
    ...dayEvents.map(event => ({
      type: 'event' as const,
      id: event.id,
      title: event.title,
      subtitle: event.location || '',
      startTime: format(new Date(event.start_time), 'HH:mm'),
      endTime: format(new Date(event.end_time), 'HH:mm'),
      color: getCalendarColor(event.calendar_id),
      event,
    })),
  ].sort((a, b) => a.startTime.localeCompare(b.startTime));

  return (
    <div className="flex flex-col h-full">
      {/* Week Day Selector */}
      <div className="p-3 border-b border-border/50 bg-card/50">
        <div className="flex items-center justify-between mb-3">
          <Button variant="ghost" size="icon" onClick={() => onDateChange(subDays(currentDate, 7))}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <span className="font-semibold">{format(currentDate, 'MMMM yyyy', { locale: de })}</span>
          <Button variant="ghost" size="icon" onClick={() => onDateChange(addDays(currentDate, 7))}>
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
        
        <div className="flex gap-1 overflow-x-auto pb-2">
          {weekDays.map((day) => {
            const isSelected = isSameDay(day, currentDate);
            const isTodayDate = isToday(day);
            return (
              <button
                key={day.toISOString()}
                onClick={() => onDateChange(day)}
                className={`flex-1 min-w-[40px] py-2 px-1 rounded-xl text-center transition-all ${
                  isSelected
                    ? 'bg-primary text-primary-foreground'
                    : isTodayDate
                    ? 'bg-primary/20 text-primary'
                    : 'hover:bg-muted/50'
                }`}
              >
                <div className="text-[10px] font-medium opacity-70">
                  {format(day, 'EEE', { locale: de })}
                </div>
                <div className="text-lg font-bold">{format(day, 'd')}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Add Event Button */}
      <div className="p-3 border-b border-border/50">
        <Button onClick={onAddEvent} className="w-full gap-2">
          <Plus className="w-4 h-4" />
          Event hinzufügen
        </Button>
      </div>

      {/* Timeline */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {allItems.length === 0 && dayTasks.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Keine Termine für diesen Tag</p>
            </div>
          ) : (
            <>
              {/* Tasks Section */}
              {dayTasks.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Aufgaben</h3>
                  <div className="space-y-2">
                    {dayTasks.map(task => (
                      <div
                        key={task.id}
                        className="p-3 rounded-xl border border-amber-500/50 bg-amber-500/10"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-sm bg-amber-500" />
                          <span className="font-medium">{task.title}</span>
                          {task.priority === 'high' && (
                            <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                              Hoch
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Timeline Items */}
              {allItems.map((item) => (
                <div
                  key={`${item.type}-${item.id}`}
                  className={`p-3 rounded-xl border transition-colors ${
                    item.type === 'timetable'
                      ? 'border-primary/30 bg-primary/10'
                      : 'cursor-pointer hover:opacity-80'
                  }`}
                  style={item.type === 'event' ? {
                    borderColor: `${item.color}50`,
                    backgroundColor: `${item.color}15`,
                  } : undefined}
                  onClick={() => item.type === 'event' && item.event && onEventClick(item.event)}
                >
                  <div className="flex gap-3">
                    <div className="text-xs text-muted-foreground min-w-[50px]">
                      <div>{item.startTime}</div>
                      <div>{item.endTime}</div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {item.type === 'event' && (
                          <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color! }} />
                        )}
                        <span className="font-medium">{item.title}</span>
                      </div>
                      {item.subtitle && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                          {item.type === 'event' && <MapPin className="w-3 h-3" />}
                          {item.subtitle}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
