
# Business V2 - Unternehmens-Pipeline

## Uebersicht

Eine neue, unabhaengige Business-Seite zur Verwaltung von Unternehmen, Kategorien und zugehoerigen Kontakten. Die Seite wird unter `/business-v2` erreichbar sein und in der Sidebar angezeigt.

---

## Datenmodell

### Neue Datenbank-Tabellen

```text
v2_company_categories
+------------------+
| id               |
| user_id          |
| name             |
| color (optional) |
| order_index      |
| created_at       |
+------------------+

v2_companies
+-------------------+
| id                |
| user_id           |
| name              |
| category_id       |
| status            | (researched, contacted, in_contact, completed)
| website           |
| industry          |
| notes             |
| created_at        |
| updated_at        |
+-------------------+

v2_company_contacts
+-------------------+
| id                |
| user_id           |
| company_id        |
| name              |
| position          |
| email             |
| phone             |
| notes             |
| created_at        |
+-------------------+

v2_company_relations
+-------------------+
| id                |
| user_id           |
| from_company_id   |
| to_company_id     |
| relation_type     | (partner, competitor, subsidiary, supplier, customer)
| description       |
| created_at        |
+-------------------+
```

### Status-Definitionen

| Status | Label | Farbe |
|--------|-------|-------|
| researched | Recherchiert | Grau |
| contacted | Angeschrieben | Blau |
| in_contact | In Kontakt | Violett |
| completed | Abgeschlossen | Gruen |

---

## Seitenstruktur

### Hauptansicht (Mobile-First)

```text
+--------------------------------+
|  Business V2                   |
|  [Suche...] [+ Kategorie] [+]  |
+--------------------------------+
|                                |
|  KATEGORIE 1          (3)      |
|  +----------------------------+|
|  | Unternehmen A    [Status] ||
|  | Website | 2 Kontakte      ||
|  +----------------------------+|
|  | Unternehmen B    [Status] ||
|  +----------------------------+|
|                                |
|  KATEGORIE 2          (1)      |
|  +----------------------------+|
|  | Unternehmen C    [Status] ||
|  +----------------------------+|
|                                |
|  OHNE KATEGORIE       (2)      |
|  ...                           |
+--------------------------------+
```

### Unternehmen-Detail (Sheet)

```text
+--------------------------------+
|  [<]  Unternehmen A   [Loeschen]|
+--------------------------------+
|  Status: [Dropdown]            |
|  Kategorie: [Dropdown]         |
|  Website: example.com          |
|  Branche: Software             |
|  Notizen: ...                  |
+--------------------------------+
|  KONTAKTE             [+]      |
|  +----------------------------+|
|  | Max Muster | CEO           ||
|  | max@example.com            ||
|  +----------------------------+|
|  | Anna Schmidt | Sales       ||
|  +----------------------------+|
+--------------------------------+
|  VERKNUEPFUNGEN       [+]      |
|  +----------------------------+|
|  | Partner von: Firma X       ||
|  +----------------------------+|
+--------------------------------+
```

---

## Komponenten-Struktur

```text
src/pages/BusinessV2.tsx
src/components/business-v2/
  context/BusinessV2Context.tsx
  types.ts
  
  companies/
    CompanyList.tsx
    CompanyCard.tsx
    AddCompanyDialog.tsx
    CompanyDetailSheet.tsx
  
  categories/
    CategorySection.tsx
    AddCategoryDialog.tsx
    EditCategoryDialog.tsx
  
  contacts/
    CompanyContactsList.tsx
    AddContactDialog.tsx
    ContactCard.tsx
  
  relations/
    CompanyRelationsList.tsx
    AddRelationDialog.tsx
```

---

## Implementierungsschritte

### Schritt 1: Datenbank-Migrationen
- Erstellen der 4 neuen Tabellen
- RLS-Policies fuer alle Tabellen (user_id basiert)
- Foreign Key Constraints

### Schritt 2: Grundstruktur
- BusinessV2Context mit State-Management
- Types-Definitionen
- Seite `/business-v2` anlegen
- Sidebar um Eintrag erweitern

### Schritt 3: Kategorien
- Kategorie-Liste anzeigen
- Neue Kategorie erstellen
- Kategorie bearbeiten/loeschen
- Drag & Drop Sortierung (optional)

### Schritt 4: Unternehmen
- Unternehmen nach Kategorien gruppiert anzeigen
- Neues Unternehmen hinzufuegen
- Unternehmen-Detail-Sheet mit Bearbeitung
- Status-Aenderung (Dropdown)
- Suchfunktion

### Schritt 5: Kontakte
- Kontakte innerhalb eines Unternehmens anzeigen
- Neuen Kontakt hinzufuegen
- Kontakt bearbeiten/loeschen

### Schritt 6: Unternehmens-Verknuepfungen
- Beziehungen zwischen Unternehmen anzeigen
- Neue Verknuepfung erstellen
- Beziehungstypen: Partner, Konkurrent, Tochterunternehmen, Lieferant, Kunde

---

## Technische Details

### Context-Struktur
- `companies`: Alle Unternehmen des Users
- `categories`: Alle Kategorien
- `contacts`: Alle Kontakte (company_id verknuepft)
- `relations`: Alle Unternehmens-Verknuepfungen
- CRUD-Funktionen fuer alle Entitaeten
- Loading-States

### UI-Patterns (Konsistent mit Finanzen V2)
- Sheet statt Dialog fuer Details
- Inline-Status-Aenderung
- Kompakte Cards
- Collapsible Kategorien
- Floating Action Button fuer Hauptaktionen

---

## Dateiaenderungen

| Datei | Aktion |
|-------|--------|
| Supabase Migration | 4 neue Tabellen + RLS |
| `src/pages/BusinessV2.tsx` | Neu |
| `src/components/business-v2/...` | Neu (ca. 12 Komponenten) |
| `src/components/layout/Sidebar.tsx` | Eintrag hinzufuegen |
| `src/App.tsx` | Route hinzufuegen |
