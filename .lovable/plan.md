

# Business Widget fuer Dashboard V2

## Ueberblick

Ein neues Dashboard-Widget das Business-Pipeline-Daten kompakt anzeigt, motiviert und Quick-Actions bietet. Drei Groessen (Small/Medium/Large), konsistent mit den bestehenden Widgets.

## Datengrundlage

Das Widget nutzt die bestehenden Tabellen `v2_companies`, `v2_company_contacts`, `v2_company_categories` direkt via Supabase-Queries. Kein neues DB-Schema noetig fuer die Kernfunktionen.

Fuer den **Networking-Streak** und **Follow-up-Erinnerungen** wird `updated_at` der Companies ausgewertet (letzter Statuswechsel = letzte Aktivitaet).

## Widget-Groessen

**Small**: Pipeline-Zahlen als kompakte Leiste (4 Status-Punkte mit Anzahl), Gesamtzahl Firmen + Kontakte.

**Medium**: Pipeline-Fortschrittsbalken (farbig pro Status), Kontakt-Score ("Diese Woche: 2 neue Firmen, 3 Kontakte"), Networking-Streak (Tage in Folge mit mind. 1 Aktion), 1 Follow-up-Erinnerung ("Firma X wartet seit 14 Tagen").

**Large**: Alles aus Medium plus: Scrollbare Follow-up-Liste (alle Firmen ohne Statuswechsel > 7 Tage), Quick-Actions (Firma hinzufuegen, Status aendern per Dropdown, Notiz erfassen), Mini-Aktivitaets-Feed der letzten Aktionen.

## Technische Umsetzung

1. **Neues Widget registrieren** in `useDashboardV2.tsx`:
   - Typ `'business'` zum `WidgetType` Union hinzufuegen
   - Eintrag im `WIDGET_CATALOG` mit Name "Business", Groessen `['small', 'medium', 'large']`
   - Default-Widget in `DEFAULT_WIDGETS` aufnehmen

2. **`BusinessWidget.tsx`** erstellen (`src/components/dashboard-v2/BusinessWidget.tsx`):
   - Eigene Supabase-Queries (wie FinanceWidget-Pattern)
   - Pipeline-Berechnung: `companies.filter(c => c.status === x).length` pro Status
   - Kontakt-Score: Firmen/Kontakte der letzten 7 Tage zaehlen (via `created_at`)
   - Networking-Streak: Rueckwaerts durch Tage iterieren, pro Tag pruefen ob `created_at` oder `updated_at` einer Firma/Kontakt auf diesen Tag faellt
   - Follow-ups: Firmen mit Status != 'completed' sortiert nach `updated_at` aufsteigend, Differenz in Tagen berechnen

3. **Quick-Actions** (Medium/Large):
   - "Firma hinzufuegen" oeffnet `AddCompanyDialog`
   - "Status aendern" zeigt Firmen-Dropdown + neuen Status
   - "Notiz" oeffnet Inline-Input fuer eine Firma

4. **BusinessSheetWrapper** erstellen (analog zu `FinanceSheetWrapper`):
   - Klick auf Widget-Titel oeffnet die volle Business-Seite als Sheet
   - Nutzt `BusinessV2Provider` intern

5. **Index.tsx** anpassen:
   - `BusinessWidget` in `WIDGET_COMPONENTS` Map eintragen
   - `BusinessSheetWrapper` einbinden mit State-Management

## Dateien

| Aktion | Datei |
|--------|-------|
| Erstellen | `src/components/dashboard-v2/BusinessWidget.tsx` |
| Erstellen | `src/components/dashboard-v2/BusinessSheetWrapper.tsx` |
| Bearbeiten | `src/hooks/useDashboardV2.tsx` (WidgetType + Catalog) |
| Bearbeiten | `src/pages/Index.tsx` (Widget einbinden) |

Keine Datenbank-Migration noetig.

