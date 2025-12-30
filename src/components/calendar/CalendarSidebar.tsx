import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, Palette, Trash2, MoreVertical, CheckSquare, GraduationCap } from 'lucide-react';
import { Calendar, DEFAULT_CALENDAR_COLORS, Task } from './types';
import { format, isToday, isTomorrow, isPast } from 'date-fns';
import { de } from 'date-fns/locale';

interface CalendarSidebarProps {
  calendars: Calendar[];
  onToggleCalendar: (id: string) => void;
  onAddCalendar: (name: string, color: string) => Promise<void>;
  onUpdateCalendar: (id: string, updates: Partial<Calendar>) => Promise<void>;
  onDeleteCalendar: (id: string) => Promise<void>;
  tasks: Task[];
  showTimetable: boolean;
  onToggleTimetable: () => void;
  showTasks: boolean;
  onToggleTasks: () => void;
}

export function CalendarSidebar({
  calendars,
  onToggleCalendar,
  onAddCalendar,
  onUpdateCalendar,
  onDeleteCalendar,
  tasks,
  showTimetable,
  onToggleTimetable,
  showTasks,
  onToggleTasks,
}: CalendarSidebarProps) {
  const [newCalendarName, setNewCalendarName] = useState('');
  const [newCalendarColor, setNewCalendarColor] = useState(DEFAULT_CALENDAR_COLORS[0]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleAddCalendar = async () => {
    if (!newCalendarName.trim()) return;
    await onAddCalendar(newCalendarName.trim(), newCalendarColor);
    setNewCalendarName('');
    setNewCalendarColor(DEFAULT_CALENDAR_COLORS[0]);
    setShowAddForm(false);
  };

  const upcomingTasks = tasks
    .filter(t => !t.completed && t.due_date)
    .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
    .slice(0, 5);

  const getTaskDateLabel = (date: string) => {
    const d = new Date(date);
    if (isToday(d)) return 'Heute';
    if (isTomorrow(d)) return 'Morgen';
    if (isPast(d)) return 'Überfällig';
    return format(d, 'd. MMM', { locale: de });
  };

  return (
    <div className="w-64 border-r border-border/50 bg-card/50 flex flex-col h-full">
      <div className="p-4 border-b border-border/50">
        <h3 className="font-semibold text-sm mb-3">Kalender</h3>
        
        {/* Timetable Toggle */}
        <div className="flex items-center gap-2 mb-2 p-2 rounded-lg hover:bg-muted/50 transition-colors">
          <Checkbox
            id="timetable"
            checked={showTimetable}
            onCheckedChange={onToggleTimetable}
          />
          <GraduationCap className="w-4 h-4 text-primary" />
          <label htmlFor="timetable" className="text-sm cursor-pointer flex-1">
            Stundenplan
          </label>
        </div>

        {/* Tasks Toggle */}
        <div className="flex items-center gap-2 mb-2 p-2 rounded-lg hover:bg-muted/50 transition-colors">
          <Checkbox
            id="tasks"
            checked={showTasks}
            onCheckedChange={onToggleTasks}
          />
          <CheckSquare className="w-4 h-4 text-amber-500" />
          <label htmlFor="tasks" className="text-sm cursor-pointer flex-1">
            Aufgaben
          </label>
        </div>

        <div className="h-px bg-border/50 my-3" />

        {/* User Calendars */}
        <ScrollArea className="max-h-48">
          <div className="space-y-1">
            {calendars.map((cal) => (
              <div
                key={cal.id}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors group"
              >
                <Checkbox
                  checked={cal.is_visible}
                  onCheckedChange={() => onToggleCalendar(cal.id)}
                />
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: cal.color }}
                />
                <span className="text-sm flex-1 truncate">{cal.name}</span>
                
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreVertical className="w-3 h-3" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-48 p-2" align="end">
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-muted-foreground px-2">Farbe</div>
                      <div className="flex flex-wrap gap-1 px-2">
                        {DEFAULT_CALENDAR_COLORS.map((color) => (
                          <button
                            key={color}
                            className={`w-6 h-6 rounded-full border-2 transition-all ${
                              cal.color === color ? 'border-foreground scale-110' : 'border-transparent hover:scale-105'
                            }`}
                            style={{ backgroundColor: color }}
                            onClick={() => onUpdateCalendar(cal.id, { color })}
                          />
                        ))}
                      </div>
                      {!cal.is_default && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-destructive hover:text-destructive"
                          onClick={() => onDeleteCalendar(cal.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Löschen
                        </Button>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Add Calendar */}
        {showAddForm ? (
          <div className="mt-3 space-y-2">
            <Input
              placeholder="Kalender-Name"
              value={newCalendarName}
              onChange={(e) => setNewCalendarName(e.target.value)}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleAddCalendar()}
            />
            <div className="flex gap-1">
              {DEFAULT_CALENDAR_COLORS.map((color) => (
                <button
                  key={color}
                  className={`w-6 h-6 rounded-full border-2 transition-all ${
                    newCalendarColor === color ? 'border-foreground scale-110' : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => setNewCalendarColor(color)}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setShowAddForm(false)} className="flex-1">
                Abbrechen
              </Button>
              <Button size="sm" onClick={handleAddCalendar} className="flex-1">
                Erstellen
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-2 justify-start"
            onClick={() => setShowAddForm(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Kalender hinzufügen
          </Button>
        )}
      </div>

      {/* Upcoming Tasks */}
      {showTasks && upcomingTasks.length > 0 && (
        <div className="p-4 flex-1 overflow-auto">
          <h3 className="font-semibold text-sm mb-3">Anstehende Aufgaben</h3>
          <div className="space-y-2">
            {upcomingTasks.map((task) => (
              <div
                key={task.id}
                className="p-2 rounded-lg bg-muted/30 border border-border/50 text-sm"
              >
                <div className="font-medium truncate">{task.title}</div>
                {task.due_date && (
                  <Badge
                    variant={isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date)) ? 'destructive' : 'secondary'}
                    className="text-[10px] mt-1"
                  >
                    {getTaskDateLabel(task.due_date)}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
