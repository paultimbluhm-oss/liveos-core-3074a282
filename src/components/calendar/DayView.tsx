import { useRef, useEffect } from 'react';
import { format, isToday, isSameDay, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { MapPin, Plus } from 'lucide-react';
import { CalendarEvent, Calendar, TimetableEntry, Task, LESSON_TIMES } from './types';

interface DayViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  calendars: Calendar[];
  timetableEntries: TimetableEntry[];
  tasks: Task[];
  showTimetable: boolean;
  showTasks: boolean;
  weekType: 'A' | 'B';
  onSlotClick: (date: Date, hour: number) => void;
  onEventClick: (event: CalendarEvent) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function DayView({
  currentDate,
  events,
  calendars,
  timetableEntries,
  tasks,
  showTimetable,
  showTasks,
  weekType,
  onSlotClick,
  onEventClick,
}: DayViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const dayOfWeek = currentDate.getDay() === 0 ? 7 : currentDate.getDay();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 7 * 60;
    }
  }, []);

  const timeToMinutes = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };

  const getTimetableEntries = () => {
    if (!showTimetable) return [];
    return timetableEntries.filter(entry => {
      if (entry.day_of_week !== dayOfWeek) return false;
      if (!entry.week_type || entry.week_type === 'both') return true;
      return entry.week_type.toUpperCase() === weekType;
    }).sort((a, b) => a.period - b.period);
  };

  const getEventStyle = (period: number) => {
    const startTime = LESSON_TIMES[period]?.start;
    const endTime = LESSON_TIMES[period]?.end;
    if (!startTime || !endTime) return { top: '0px', height: '0px' };
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);
    const top = (startMinutes / 60) * 60;
    const height = ((endMinutes - startMinutes) / 60) * 60;
    return { top: `${top}px`, height: `${height}px` };
  };

  const getCalendarEventStyle = (event: CalendarEvent) => {
    const start = new Date(event.start_time);
    const end = new Date(event.end_time);
    const startMinutes = start.getHours() * 60 + start.getMinutes();
    const endMinutes = end.getHours() * 60 + end.getMinutes();
    const top = (startMinutes / 60) * 60;
    const height = Math.max(((endMinutes - startMinutes) / 60) * 60, 30);
    return { top: `${top}px`, height: `${height}px` };
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

  const getCalendarColor = (calendarId: string | null) => {
    if (!calendarId) return '#3b82f6';
    const calendar = calendars.find(c => c.id === calendarId);
    return calendar?.color || '#3b82f6';
  };

  const getCurrentTimePosition = () => {
    const now = new Date();
    return (now.getHours() * 60 + now.getMinutes()) / 60 * 60;
  };

  const currentTimePosition = getCurrentTimePosition();
  const timetableEntriesForDay = getTimetableEntries();

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border/50 bg-muted/30">
        <div className={`text-center ${isToday(currentDate) ? 'text-primary' : ''}`}>
          <div className="text-sm font-medium text-muted-foreground">
            {format(currentDate, 'EEEE', { locale: de })}
          </div>
          <div className="text-3xl font-bold">
            {format(currentDate, 'd. MMMM yyyy', { locale: de })}
          </div>
        </div>
      </div>

      {/* Time Grid */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto relative">
        <div className="grid grid-cols-[60px_1fr] relative" style={{ height: `${24 * 60}px` }}>
          {/* Time Labels */}
          <div className="border-r border-border/50 relative">
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="absolute w-full border-t border-border/30 flex items-start justify-end pr-2 pt-1"
                style={{ top: `${hour * 60}px`, height: '60px' }}
              >
                <span className="text-xs text-muted-foreground">
                  {hour.toString().padStart(2, '0')}:00
                </span>
              </div>
            ))}
          </div>

          {/* Day Column */}
          <div className={`relative ${isToday(currentDate) ? 'bg-primary/5' : ''}`}>
            {/* Hour Grid */}
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="absolute w-full border-t border-border/30 cursor-pointer hover:bg-muted/30 transition-colors group"
                style={{ top: `${hour * 60}px`, height: '60px' }}
                onClick={() => onSlotClick(currentDate, hour)}
              >
                <Plus className="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-opacity" />
              </div>
            ))}

            {/* Half-hour Lines */}
            {HOURS.map((hour) => (
              <div
                key={`half-${hour}`}
                className="absolute w-full border-t border-border/10 pointer-events-none"
                style={{ top: `${hour * 60 + 30}px` }}
              />
            ))}

            {/* Timetable Entries */}
            {timetableEntriesForDay.map((entry) => {
              const style = getEventStyle(entry.period);
              return (
                <div
                  key={entry.id}
                  className="absolute left-2 right-2 bg-gradient-to-br from-primary/25 to-primary/10 rounded-lg border border-primary/30 overflow-hidden z-10 pointer-events-none"
                  style={style}
                >
                  <div className="p-2 h-full flex flex-col overflow-hidden">
                    <p className="font-medium text-sm">
                      {entry.subject?.name || entry.teacher_short}
                    </p>
                    <div className="text-xs text-muted-foreground mt-auto">
                      {entry.room && <span>{entry.room}</span>}
                      {entry.room && entry.teacher_short && ' · '}
                      {entry.teacher_short}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Calendar Events */}
            {dayEvents.map((event, idx) => {
              const style = getCalendarEventStyle(event);
              const color = getCalendarColor(event.calendar_id);
              return (
                <div
                  key={event.id}
                  className="absolute rounded-lg border overflow-hidden z-10 cursor-pointer hover:opacity-80 transition-opacity"
                  style={{
                    ...style,
                    left: `${8 + idx * 5}px`,
                    right: '8px',
                    backgroundColor: `${color}30`,
                    borderColor: `${color}50`,
                  }}
                  onClick={(e) => { e.stopPropagation(); onEventClick(event); }}
                >
                  <div className="p-2 h-full flex flex-col overflow-hidden">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
                      <p className="font-medium text-sm">{event.title}</p>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {format(new Date(event.start_time), 'HH:mm')} - {format(new Date(event.end_time), 'HH:mm')}
                    </div>
                    {event.location && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-auto">
                        <MapPin className="w-3 h-3" />
                        <span className="truncate">{event.location}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Tasks */}
            {dayTasks.map((task, idx) => (
              <div
                key={task.id}
                className="absolute left-2 right-2 rounded-lg border border-amber-500/50 bg-amber-500/20 overflow-hidden z-10 pointer-events-none"
                style={{ top: `${8 * 60 + idx * 30}px`, height: '28px' }}
              >
                <div className="p-1.5 h-full flex items-center gap-2 overflow-hidden">
                  <div className="w-3 h-3 rounded-sm bg-amber-500 shrink-0" />
                  <p className="font-medium text-sm truncate">{task.title}</p>
                </div>
              </div>
            ))}

            {/* Current Time Line */}
            {isToday(currentDate) && (
              <div
                className="absolute left-0 right-0 z-20 pointer-events-none"
                style={{ top: `${currentTimePosition}px` }}
              >
                <div className="relative">
                  <div className="absolute -left-1 -top-1.5 w-3 h-3 bg-red-500 rounded-full" />
                  <div className="h-0.5 bg-red-500 w-full" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
