import { useMemo, useRef, useEffect } from 'react';
import { format, startOfWeek, addDays, isToday, isSameDay, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { Clock, MapPin, Plus } from 'lucide-react';
import { CalendarEvent, Calendar, TimetableEntry, Task, LESSON_TIMES } from './types';

interface MergedTimetableEntry {
  id: string;
  startPeriod: number;
  endPeriod: number;
  room: string | null;
  teacher_short: string;
  subject?: { name: string; short_name: string | null } | null;
  isDouble: boolean;
}

interface WeekViewProps {
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
const DAY_NAMES = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

export function WeekView({
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
}: WeekViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 7 * 60;
    }
  }, []);

  const timeToMinutes = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };

  const getMergedEntriesForDay = (dayOfWeek: number): MergedTimetableEntry[] => {
    const dayEntries = timetableEntries.filter(entry => {
      if (entry.day_of_week !== dayOfWeek) return false;
      if (!entry.week_type || entry.week_type === 'both') return true;
      return entry.week_type.toUpperCase() === weekType;
    }).sort((a, b) => a.period - b.period);

    const merged: MergedTimetableEntry[] = [];
    let i = 0;

    while (i < dayEntries.length) {
      const current = dayEntries[i];
      const next = dayEntries[i + 1];
      const isConsecutive = next &&
        current.subject_id &&
        current.subject_id === next.subject_id &&
        next.period === current.period + 1 &&
        !([2, 4, 6].includes(current.period));

      if (isConsecutive) {
        merged.push({
          id: current.id,
          startPeriod: current.period,
          endPeriod: next.period,
          room: current.room,
          teacher_short: current.teacher_short,
          subject: current.subject,
          isDouble: true,
        });
        i += 2;
      } else {
        merged.push({
          id: current.id,
          startPeriod: current.period,
          endPeriod: current.period,
          room: current.room,
          teacher_short: current.teacher_short,
          subject: current.subject,
          isDouble: false,
        });
        i += 1;
      }
    }
    return merged;
  };

  const getEventStyle = (startPeriod: number, endPeriod: number) => {
    const startTime = LESSON_TIMES[startPeriod]?.start;
    const endTime = LESSON_TIMES[endPeriod]?.end;
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

  const getEventsForDay = (day: Date) => {
    return events.filter(event => {
      const eventDate = parseISO(event.start_time);
      return isSameDay(eventDate, day);
    });
  };

  const getTasksForDay = (day: Date) => {
    return tasks.filter(task => {
      if (!task.due_date || task.completed) return false;
      const taskDate = new Date(task.due_date);
      return isSameDay(taskDate, day);
    });
  };

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
  const todayIndex = weekDays.findIndex(day => isToday(day));

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Day Headers */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border/50 bg-muted/30 sticky top-0 z-20">
        <div className="p-3 flex items-center justify-center border-r border-border/50">
          <Clock className="w-4 h-4 text-muted-foreground" />
        </div>
        {weekDays.map((day, idx) => (
          <div
            key={idx}
            className={`p-2 md:p-3 text-center border-r last:border-r-0 border-border/50 ${
              isToday(day) ? 'bg-primary/10' : ''
            }`}
          >
            <div className={`text-xs font-medium ${isToday(day) ? 'text-primary' : 'text-muted-foreground'}`}>
              {DAY_NAMES[idx]}
            </div>
            <div className={`text-lg font-bold ${isToday(day) ? 'text-primary' : ''}`}>
              {format(day, 'd')}
            </div>
          </div>
        ))}
      </div>

      {/* Time Grid */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto relative">
        <div className="grid grid-cols-[60px_repeat(7,1fr)] relative" style={{ height: `${24 * 60}px` }}>
          {/* Time Labels */}
          <div className="border-r border-border/50 relative">
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="absolute w-full border-t border-border/30 flex items-start justify-end pr-2 pt-1"
                style={{ top: `${hour * 60}px`, height: '60px' }}
              >
                <span className="text-[10px] text-muted-foreground">
                  {hour.toString().padStart(2, '0')}:00
                </span>
              </div>
            ))}
          </div>

          {/* Day Columns */}
          {weekDays.map((day, dayIdx) => {
            const mergedEntries = showTimetable ? getMergedEntriesForDay(dayIdx + 1) : [];
            const dayEvents = getEventsForDay(day).filter(e => {
              const cal = calendars.find(c => c.id === e.calendar_id);
              return !cal || cal.is_visible;
            });
            const dayTasks = showTasks ? getTasksForDay(day) : [];

            return (
              <div
                key={dayIdx}
                className={`relative border-r last:border-r-0 border-border/50 ${
                  isToday(day) ? 'bg-primary/5' : ''
                }`}
              >
                {/* Hour Grid */}
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    className="absolute w-full border-t border-border/30 cursor-pointer hover:bg-muted/30 transition-colors group"
                    style={{ top: `${hour * 60}px`, height: '60px' }}
                    onClick={() => onSlotClick(day, hour)}
                  >
                    <Plus className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-opacity" />
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
                {mergedEntries.map((entry) => {
                  const style = getEventStyle(entry.startPeriod, entry.endPeriod);
                  return (
                    <div
                      key={entry.id}
                      className="absolute left-1 right-1 bg-gradient-to-br from-primary/25 to-primary/10 rounded-lg border border-primary/30 overflow-hidden z-10 pointer-events-none"
                      style={style}
                    >
                      <div className="p-1.5 h-full flex flex-col overflow-hidden">
                        <p className="font-medium text-xs truncate">
                          {entry.subject?.short_name || entry.subject?.name || entry.teacher_short}
                        </p>
                        <div className="text-[9px] text-muted-foreground mt-auto truncate">
                          {entry.room || entry.teacher_short}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Calendar Events */}
                {dayEvents.map((event) => {
                  const style = getCalendarEventStyle(event);
                  const color = getCalendarColor(event.calendar_id);
                  return (
                    <div
                      key={event.id}
                      className="absolute left-1 right-1 rounded-lg border overflow-hidden z-10 cursor-pointer hover:opacity-80 transition-opacity"
                      style={{
                        ...style,
                        backgroundColor: `${color}30`,
                        borderColor: `${color}50`,
                      }}
                      onClick={(e) => { e.stopPropagation(); onEventClick(event); }}
                    >
                      <div className="p-1.5 h-full flex flex-col overflow-hidden">
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                          <p className="font-medium text-xs truncate">{event.title}</p>
                        </div>
                        {event.location && (
                          <div className="flex items-center gap-1 text-[9px] text-muted-foreground mt-auto">
                            <MapPin className="w-2.5 h-2.5" />
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
                    className="absolute left-1 right-1 rounded-lg border border-amber-500/50 bg-amber-500/20 overflow-hidden z-10 pointer-events-none"
                    style={{ top: `${8 * 60 + idx * 25}px`, height: '24px' }}
                  >
                    <div className="p-1 h-full flex items-center gap-1 overflow-hidden">
                      <div className="w-2 h-2 rounded-sm bg-amber-500 shrink-0" />
                      <p className="font-medium text-[10px] truncate">{task.title}</p>
                    </div>
                  </div>
                ))}

                {/* Current Time Line */}
                {isToday(day) && (
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
            );
          })}
        </div>
      </div>
    </div>
  );
}
