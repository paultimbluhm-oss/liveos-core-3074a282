import { Clock } from 'lucide-react';

export function TimeProgressCard() {
  const now = new Date();
  
  // Day progress
  const hoursElapsed = now.getHours() + now.getMinutes() / 60;
  const dayProgress = Math.round((hoursElapsed / 24) * 100);
  
  // Month progress
  const currentDay = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const monthProgress = Math.round((currentDay / daysInMonth) * 100);

  // Year progress
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const endOfYear = new Date(now.getFullYear() + 1, 0, 1);
  const yearProgress = Math.round(((now.getTime() - startOfYear.getTime()) / (endOfYear.getTime() - startOfYear.getTime())) * 100);

  const items = [
    { label: 'Tag', value: dayProgress, color: 'from-primary to-primary/70' },
    { label: 'Monat', value: monthProgress, color: 'from-accent to-accent/70' },
    { label: 'Jahr', value: yearProgress, color: 'from-green-500 to-green-500/70' },
  ];

  return (
    <div className="glass-card p-3 md:p-4">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-sm">Zeitfortschritt</h3>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {items.map((item) => (
          <div key={item.label} className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{item.label}</span>
              <span className="text-sm font-bold">{item.value}%</span>
            </div>
            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
              <div 
                className={`h-full bg-gradient-to-r ${item.color} rounded-full transition-all duration-500`}
                style={{ width: `${item.value}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
