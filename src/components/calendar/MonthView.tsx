import { useMemo } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isToday, isSameDay, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { CalendarEvent, Calendar, Task } from './types';

interface MonthViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  calendars: Calendar[];
  tasks: Task[];
  showTasks: boolean;
  onDayClick: (date: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
}

const DAY_NAMES = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

export function MonthView({
  currentDate,
  events,
  calendars,
  tasks,
  showTasks,
  onDayClick,
  onEventClick,
}: MonthViewProps) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const weeks = useMemo(() => {
    const weeks: Date[][] = [];
    let day = calendarStart;
    while (day <= calendarEnd) {
      const week: Date[] = [];
      for (let i = 0; i < 7; i++) {
        week.push(day);
        day = addDays(day, 1);
      }
      weeks.push(week);
    }
    return weeks;
  }, [calendarStart, calendarEnd]);

  const getEventsForDay = (day: Date) => {
    return events.filter(event => {
      const eventDate = parseISO(event.start_time);
      const cal = calendars.find(c => c.id === event.calendar_id);
      return isSameDay(eventDate, day) && (!cal || cal.is_visible);
    });
  };

  const getTasksForDay = (day: Date) => {
    if (!showTasks) return [];
    return tasks.filter(task => {
      if (!task.due_date || task.completed) return false;
      return isSameDay(new Date(task.due_date), day);
    });
  };

  const getCalendarColor = (calendarId: string | null) => {
    if (!calendarId) return '#3b82f6';
    const calendar = calendars.find(c => c.id === calendarId);
    return calendar?.color || '#3b82f6';
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-4">
      {/* Day Headers */}
      <div className="grid grid-cols-7 border-b border-border/50 pb-2 mb-2">
        {DAY_NAMES.map((day) => (
          <div key={day} className="text-center text-sm font-medium text-muted-foreground">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 grid grid-rows-[repeat(auto-fill,minmax(0,1fr))] gap-1">
        {weeks.map((week, weekIdx) => (
          <div key={weekIdx} className="grid grid-cols-7 gap-1">
            {week.map((day, dayIdx) => {
              const dayEvents = getEventsForDay(day);
              const dayTasks = getTasksForDay(day);
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isCurrentDay = isToday(day);

              return (
                <div
                  key={dayIdx}
                  className={`min-h-[80px] md:min-h-[100px] p-1 rounded-lg border transition-colors cursor-pointer ${
                    isCurrentMonth
                      ? isCurrentDay
                        ? 'bg-primary/10 border-primary/50'
                        : 'bg-card/50 border-border/50 hover:bg-muted/30'
                      : 'bg-muted/20 border-border/30 opacity-50'
                  }`}
                  onClick={() => onDayClick(day)}
                >
                  <div className={`text-sm font-medium mb-1 ${
                    isCurrentDay ? 'text-primary' : isCurrentMonth ? '' : 'text-muted-foreground'
                  }`}>
                    {format(day, 'd')}
                  </div>

                  <div className="space-y-0.5 overflow-hidden">
                    {/* Events */}
                    {dayEvents.slice(0, 3).map((event) => {
                      const color = getCalendarColor(event.calendar_id);
                      return (
                        <div
                          key={event.id}
                          className="text-[10px] px-1.5 py-0.5 rounded truncate cursor-pointer hover:opacity-80 transition-opacity"
                          style={{ backgroundColor: `${color}30`, color: color }}
                          onClick={(e) => { e.stopPropagation(); onEventClick(event); }}
                        >
                          {event.title}
                        </div>
                      );
                    })}

                    {/* Tasks */}
                    {dayTasks.slice(0, 3 - dayEvents.length).map((task) => (
                      <div
                        key={task.id}
                        className="text-[10px] px-1.5 py-0.5 rounded truncate bg-amber-500/20 text-amber-600"
                      >
                        {task.title}
                      </div>
                    ))}

                    {/* More indicator */}
                    {dayEvents.length + dayTasks.length > 3 && (
                      <div className="text-[9px] text-muted-foreground px-1">
                        +{dayEvents.length + dayTasks.length - 3} mehr
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
