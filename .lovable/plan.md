
# Kurs-Sortierung und erweiterte Stundenplan-Funktionalitaet

## Analyse

Die aktuelle Implementierung zeigt:
- Kurse werden horizontal scrollbar in beliebiger Reihenfolge angezeigt
- Der Stundenplan zeigt die aktuelle Woche mit Wochennavigation
- EVA kann per Rechtsklick/Long-Press gesetzt werden
- Der SchoolTabsDrawer zeigt im "Plan"-Tab nur einen statischen Uebersichts-Grid

## Gewuenschte Aenderungen

1. **Kurse vertikal sortiert nach naechster Stunde anzeigen**
2. **Vergangene Stunden im Stundenplan ausgrauen (basierend auf aktueller Uhrzeit)**
3. **Im SchoolTabsDrawer Plan-Tab: Wochenstunden des Kurses mit Fehlstunden/EVA-Markierung**
4. **Korrekte Stundenzeiten gemaess Nutzereingabe**

---

## Stundenzeiten-Anpassung

Die korrigierten Zeiten basierend auf der Nutzereingabe:

| Block | Stunden | Startzeit | Endzeit |
|-------|---------|-----------|---------|
| Block 1 | 1-2 | 08:00 | 09:30 |
| Block 2 | 3-4 | 09:50 | 11:20 |
| Block 3 | 5-6 | 11:40 | 13:10 |
| Block 4 | 8-9 | 14:15 | 15:45 |

Diese Zeiten werden in `LESSON_TIMES` in `src/components/calendar/types.ts` angepasst und in der Schule.tsx verwendet.

---

## Technische Umsetzung

### 1. Stundenzeiten aktualisieren (types.ts)

```typescript
export const LESSON_TIMES: Record<number, { start: string; end: string }> = {
  1: { start: '08:00', end: '08:45' },
  2: { start: '08:45', end: '09:30' },
  3: { start: '09:50', end: '10:35' },
  4: { start: '10:35', end: '11:20' },
  5: { start: '11:40', end: '12:25' },
  6: { start: '12:25', end: '13:10' },
  8: { start: '14:15', end: '15:00' },
  9: { start: '15:00', end: '15:45' },
};
```

### 2. Logik fuer "Stunde bereits vergangen" (Schule.tsx)

Neue Hilfsfunktion:
```typescript
const isPeriodPassed = (date: Date, period: number): boolean => {
  const now = new Date();
  // Nur heute pruefen
  if (!isToday(date)) return isBefore(date, startOfDay(now));
  
  const times = LESSON_TIMES[period];
  if (!times) return false;
  
  const [endH, endM] = times.end.split(':').map(Number);
  const periodEnd = new Date(date);
  periodEnd.setHours(endH, endM, 0, 0);
  
  return now > periodEnd;
};
```

Anwendung im Grid:
- Vergangene Stunden erhalten `opacity-40` und ggf. einen Durchstreich-Effekt
- Nur in der aktuellen Woche angewendet

### 3. Kurse nach naechster Stunde sortieren

Neue Sortierlogik fuer `myCourses`:
```typescript
const getSortedCourses = () => {
  const now = new Date();
  const currentDay = now.getDay(); // 0=So, 1=Mo, ...
  const currentTime = now.getHours() * 60 + now.getMinutes();
  
  return myCourses.sort((a, b) => {
    const aNextSlot = getNextSlot(a.id, currentDay, currentTime);
    const bNextSlot = getNextSlot(b.id, currentDay, currentTime);
    
    // Kurse ohne Slots ans Ende
    if (!aNextSlot && !bNextSlot) return 0;
    if (!aNextSlot) return 1;
    if (!bNextSlot) return -1;
    
    // Nach naechstem Zeitpunkt sortieren
    return aNextSlot.minutesUntil - bNextSlot.minutesUntil;
  });
};

const getNextSlot = (courseId: string, currentDay: number, currentMinutes: number) => {
  const entries = timetableEntries.filter(e => e.course_id === courseId);
  // ... Berechnung des naechsten Slots
};
```

### 4. Vertikale Kurs-Liste

Statt horizontalem Scroll:
```typescript
<div className="space-y-2">
  {sortedCourses.map(course => {
    const nextSlot = getNextSlotInfo(course.id);
    return (
      <div className="flex items-center gap-3 p-3 rounded-xl bg-card border">
        {/* Kurs-Icon */}
        <div className="w-10 h-10 rounded-lg" style={{ borderColor: course.color }}>
          {course.short_name?.slice(0,2)}
        </div>
        
        {/* Kurs-Info */}
        <div className="flex-1">
          <p className="font-medium">{course.name}</p>
          <p className="text-xs text-muted-foreground">
            {nextSlot ? `Naechste Stunde: ${nextSlot.label}` : 'Diese Woche keine Stunde'}
          </p>
        </div>
        
        {/* Noten-Badge */}
        {grade && <Badge className={getGradeColor(grade)}>{grade}</Badge>}
      </div>
    );
  })}
</div>
```

### 5. SchoolTabsDrawer Plan-Tab erweitern

Wenn ein Kurs geoeffnet wird, zeigt der Plan-Tab:
- Alle Wochenstunden dieses Kurses fuer die aktuelle Woche
- Status pro Stunde: Normal / EVA / Gefehlt
- Moeglichkeit, Fehlstunde oder EVA zu markieren

```typescript
// Im SchoolTabsDrawer.tsx

// Neuer State
const [courseSlots, setCourseSlots] = useState<CourseSlotWithStatus[]>([]);

// Interface
interface CourseSlotWithStatus {
  date: Date;
  period: number;
  status: 'normal' | 'eva' | 'absent';
  room: string | null;
}

// Fetch beim Oeffnen
const fetchCourseWeekSlots = async () => {
  // 1. Hole course_timetable_slots fuer diesen Kurs
  // 2. Hole timetable_overrides fuer diese Woche
  // 3. Hole lesson_absences fuer diese Woche
  // 4. Kombiniere zu CourseSlotWithStatus[]
};

// Rendering
<TabsContent value="plan">
  {courseSlots.length === 0 ? (
    <EmptyState />
  ) : (
    <div className="space-y-2">
      {courseSlots.map(slot => (
        <Card key={`${slot.date}-${slot.period}`}>
          <CardContent className="p-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">
                {format(slot.date, 'EEE, d. MMM')} - Stunde {slot.period}
              </p>
              <p className="text-xs text-muted-foreground">{slot.room}</p>
            </div>
            
            {/* Status-Buttons */}
            <div className="flex gap-1">
              <Button variant={slot.status === 'eva' ? 'default' : 'outline'} 
                      onClick={() => toggleEva(slot)}>
                EVA
              </Button>
              <Button variant={slot.status === 'absent' ? 'destructive' : 'outline'}
                      onClick={() => toggleAbsent(slot)}>
                Gefehlt
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )}
</TabsContent>
```

### 6. Wochenkontext an SchoolTabsDrawer uebergeben

Der Drawer muss die aktuelle Woche kennen:
```typescript
// In Schule.tsx
<SchoolTabsDrawer 
  open={drawerOpen}
  onOpenChange={...}
  context={drawerContext}
  course={selectedCourse}
  currentWeekStart={currentWeekStart}  // NEU
  weekType={weekType}                   // NEU
/>
```

---

## Dateiaenderungen

| Datei | Aenderung |
|-------|-----------|
| `src/components/calendar/types.ts` | LESSON_TIMES anpassen (Periode 7 entfernen, 8-9 korrigieren) |
| `src/pages/Schule.tsx` | Kurs-Sortierung, vergangene Stunden ausgrauen, Props an Drawer |
| `src/components/schule/SchoolTabsDrawer.tsx` | Plan-Tab mit wochenbezogenen Kursstunden, EVA/Fehlstunden-Buttons |

---

## Visuelle Darstellung

### Stundenplan mit vergangenen Stunden (ausgegraut)
```text
     Mo    Di    Mi    Do    Fr
 1  [MA]  [DE]  [EN]  [---] [PH]    <- vergangen (opacity-40)
 2  [MA]  [DE]  [EN]  [---] [PH]    <- vergangen
 3  [BI]  [CH]  [MA]  [GE]  [EN]    <- aktuelle Stunde (highlight)
 4  [BI]  [CH]  [MA]  [GE]  [EN]
 5  [---] [KU]  [---] [PO]  [---]   <- kommend (normal)
 6  [---] [KU]  [---] [PO]  [---]
 8  [---] [---] [IF]  [---] [---]
 9  [---] [---] [IF]  [---] [---]
```

### Kurs-Liste (vertikal, sortiert nach naechster Stunde)
```text
+--------------------------------------------------+
| [MA] Mathematik                    Jetzt: St. 3  |
|      Naechste: Heute, 09:50                      |
+--------------------------------------------------+
| [DE] Deutsch                              12.5 P |
|      Naechste: Morgen, 08:00                     |
+--------------------------------------------------+
| [EN] Englisch                             10.2 P |
|      Naechste: Uebermorgen, 08:00                |
+--------------------------------------------------+
```

### Plan-Tab im Drawer (Kursspezifisch)
```text
+--------------------------------------------------+
| Diese Woche: Mathematik (KW 5)                   |
+--------------------------------------------------+

| Mo, 27. Jan - Stunde 1-2     Raum A104           |
|                              [EVA] [Gefehlt]     |
+--------------------------------------------------+
| Mi, 29. Jan - Stunde 3-4     Raum B201           |
|                              [   ] [Gefehlt]     |
+--------------------------------------------------+
| Fr, 31. Jan - Stunde 1-2     Raum A104           |
|                              [   ] [        ]    |
+--------------------------------------------------+
```
