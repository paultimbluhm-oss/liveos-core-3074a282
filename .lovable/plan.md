
# Vollstaendiges Modularisierungs- und Customization-Konzept

## Analyse des aktuellen Zustands

### Hardcodierte Elemente (Problem)

| Bereich | Aktuell hardcodiert | Auswirkung |
|---------|---------------------|------------|
| **Sidebar** | 5 feste NavItems (Dashboard, Schule, Privat, Business, Freunde) | Kein Nutzer kann Menues ausblenden/umordnen |
| **Privat-Seite** | 8 feste Sections (Habits, Finanzen, Aufgaben, Lifetime, Gesundheit, Journal, Checklisten, Geschenke) | Alle Nutzer sehen identische Module |
| **Business-Seite** | 2 feste Sections (Kontakte, Auftraege) | Keine Anpassbarkeit |
| **Dashboard** | Bereits konfigurierbar via `dashboard_config` Tabelle | Gutes Muster zur Nachahmung |
| **App-Name** | "LifeOS" fest in Sidebar und Auth-Seite | Nicht white-label-faehig |

### Bereits vorhandene Konfigurationslogik

Die `dashboard_config` Tabelle und der `useDashboardConfig` Hook zeigen das richtige Muster:
- `widget_order: string[]` - Reihenfolge
- `hidden_widgets: string[]` - Ausgeblendete Elemente
- Pro Nutzer konfigurierbar

---

## Neues Konfigurationssystem

### Datenbankstruktur

Neue Tabelle: `user_app_config`

```sql
CREATE TABLE user_app_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Sidebar Konfiguration
  sidebar_items TEXT[] DEFAULT ARRAY['dashboard','schule','privat','business','freunde'],
  hidden_sidebar_items TEXT[] DEFAULT '{}',
  
  -- Privat-Seite Sektionen
  privat_sections TEXT[] DEFAULT ARRAY['habits','finanzen','aufgaben','lifetime','gesundheit','journal','checklisten','geschenke'],
  hidden_privat_sections TEXT[] DEFAULT '{}',
  
  -- Business-Seite Sektionen
  business_sections TEXT[] DEFAULT ARRAY['kontakte','auftraege'],
  hidden_business_sections TEXT[] DEFAULT '{}',
  
  -- Schule-Seite Elemente
  hidden_school_features TEXT[] DEFAULT '{}',
  
  -- UI Praeferenzen
  show_time_score BOOLEAN DEFAULT true,
  show_streak BOOLEAN DEFAULT true,
  compact_mode BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id)
);
```

---

## Komponenten-Architektur

### Neuer zentraler Hook: `useAppConfig`

```text
src/hooks/useAppConfig.tsx
```

Dieser Hook verwaltet die gesamte App-Konfiguration und bietet:
- Sidebar-Items lesen/umordnen/verstecken
- Privat-Sections lesen/umordnen/verstecken
- Business-Sections lesen/umordnen/verstecken
- UI-Praeferenzen aendern
- Reset auf Standardwerte

### Erweiterte Settings-Seite

```text
src/pages/Profile.tsx
  Tabs:
  - Dashboard (existiert)
  - Navigation (NEU - Sidebar anpassen)
  - Module (NEU - Privat/Business Sections)
  - Sicherheit (existiert)
  - Info (existiert)
```

---

## Detaillierte Aenderungen

### 1. Sidebar konfigurierbar machen

**Vorher (Sidebar.tsx):**
```typescript
const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/schule', icon: GraduationCap, label: 'Schule' },
  // ... hardcodiert
];
```

**Nachher:**
```typescript
// Alle verfuegbaren Menue-Punkte als Konstante
export const ALL_NAV_ITEMS = [
  { id: 'dashboard', to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { id: 'schule', to: '/schule', icon: GraduationCap, label: 'Schule' },
  { id: 'privat', to: '/privat', icon: User, label: 'Privat' },
  { id: 'business', to: '/business', icon: Briefcase, label: 'Business' },
  { id: 'freunde', to: '/freunde', icon: Users, label: 'Freunde' },
  { id: 'kalender', to: '/kalender', icon: Calendar, label: 'Kalender' },
];

// In Sidebar Komponente:
const { visibleNavItems } = useAppConfig();
// Zeigt nur sichtbare Items in der konfigurierten Reihenfolge
```

### 2. Privat-Seite konfigurierbar machen

**Vorher (Privat.tsx):**
```typescript
const sections = [
  { id: 'habits', icon: Check, label: 'Habits', color: 'text-emerald-500' },
  // ... hardcodiert
];
```

**Nachher:**
```typescript
// Alle verfuegbaren Sections als Konstante
export const ALL_PRIVAT_SECTIONS = [
  { id: 'habits', icon: Check, label: 'Habits', color: 'text-emerald-500', component: HabitsSection },
  { id: 'finanzen', icon: Wallet, label: 'Finanzen', color: 'text-amber-500', component: FinanceSection },
  // ...
];

// In Privat Komponente:
const { visiblePrivatSections } = useAppConfig();
// Zeigt nur sichtbare Sections in der konfigurierten Reihenfolge
```

### 3. Business-Seite konfigurierbar machen

Gleiches Muster wie Privat-Seite.

### 4. Neue Settings-Komponenten

```text
src/components/settings/
  DashboardSettings.tsx (existiert)
  NavigationSettings.tsx (NEU)
  ModuleSettings.tsx (NEU)
  SecuritySettings.tsx (existiert)
  InfoSettings.tsx (existiert)
```

**NavigationSettings.tsx:**
- Sidebar-Items ein-/ausblenden
- Reihenfolge per Drag-and-Drop oder Pfeile aendern
- Time-Score und Streak im Header anzeigen/verstecken

**ModuleSettings.tsx:**
- Privat-Sections konfigurieren
- Business-Sections konfigurieren
- Mit Vorschau welche Module sichtbar sind

---

## Visuelle Darstellung

### NavigationSettings UI

```text
+--------------------------------------------------+
| Navigation anpassen                              |
+--------------------------------------------------+

| Sichtbare Menue-Punkte                           |
+--------------------------------------------------+
| [v] [^] Dashboard                    [Sichtbar]  |
| [v] [^] Schule                       [Sichtbar]  |
| [v] [^] Privat                       [Sichtbar]  |
| [v] [^] Business                     [Versteckt] |
| [v] [^] Freunde                      [Sichtbar]  |
| [v] [^] Kalender                     [Versteckt] |
+--------------------------------------------------+

| Header-Anzeigen                                  |
+--------------------------------------------------+
| Time-Score anzeigen             [====O]          |
| Streak anzeigen                 [====O]          |
+--------------------------------------------------+

                                   [Zuruecksetzen] |
```

### ModuleSettings UI

```text
+--------------------------------------------------+
| Module anpassen                                  |
+--------------------------------------------------+

| Privat-Bereich                                   |
+--------------------------------------------------+
| [v] [^] Habits                       [Sichtbar]  |
| [v] [^] Finanzen                     [Sichtbar]  |
| [v] [^] Aufgaben                     [Sichtbar]  |
| [v] [^] Lifetime                     [Sichtbar]  |
| [v] [^] Gesundheit                   [Versteckt] |
| [v] [^] Journal                      [Versteckt] |
| [v] [^] Checklisten                  [Sichtbar]  |
| [v] [^] Geschenke                    [Versteckt] |
+--------------------------------------------------+

| Business-Bereich                                 |
+--------------------------------------------------+
| [v] [^] Kontakte                     [Sichtbar]  |
| [v] [^] Auftraege                    [Sichtbar]  |
+--------------------------------------------------+
```

---

## Dateiaenderungen-Uebersicht

| Datei | Aenderung |
|-------|-----------|
| `supabase/migrations/xxx_add_user_app_config.sql` | Neue Tabelle erstellen |
| `src/integrations/supabase/types.ts` | Wird automatisch regeneriert |
| `src/hooks/useAppConfig.tsx` | NEU - Zentraler Config-Hook |
| `src/components/layout/Sidebar.tsx` | Nutzt useAppConfig statt hardcodierter Items |
| `src/pages/Privat.tsx` | Nutzt useAppConfig fuer Sections |
| `src/pages/Business.tsx` | Nutzt useAppConfig fuer Sections |
| `src/pages/Profile.tsx` | Neue Tabs hinzufuegen |
| `src/components/settings/NavigationSettings.tsx` | NEU |
| `src/components/settings/ModuleSettings.tsx` | NEU |
| `src/constants/appConfig.ts` | NEU - Alle verfuegbaren Items/Sections |

---

## Migrations-Sicherheit

Fuer bestehende Nutzer:
- Default-Werte entsprechen dem aktuellen Verhalten
- Keine Funktionen werden automatisch versteckt
- Nutzer koennen aktiv Module deaktivieren

---

## Zusammenfassung der Vorteile

| Aspekt | Vorher | Nachher |
|--------|--------|---------|
| Sidebar | Alle 5 Items fuer alle | Jeder waehlt seine Items |
| Privat-Seite | Alle 8 Sections identisch | Individuell konfigurierbar |
| Business-Seite | Beide Sections sichtbar | Selektiv nutzbar |
| Header | Time-Score/Streak immer sichtbar | Optional versteckbar |
| Rollout-faehigkeit | Alle sehen alles | Nutzer konfigurieren selbst |

Dieses System ermoeglicht es, die App fuer den gesamten Schuljahrgang auszurollen, wobei jeder Nutzer nur die Module sieht und verwendet, die er benoetigt.
