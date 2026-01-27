
# Finanzen-Sektion Redesign

## Analyse des aktuellen Zustands

Die aktuelle `FinanceSection.tsx` hat 880 Zeilen Code in einer einzigen Komponente, was die Übersichtlichkeit und Wartbarkeit erschwert. Alle Features sind vorhanden, aber die Struktur ist unübersichtlich.

**Vorhandene Features (werden beibehalten):**
- Konten (Bank, Bargeld)
- Investments (ETFs, Aktien, Krypto)
- Kredite/Verliehen & Geliehen
- Abos & Automationen
- Transaktionsverlauf
- Monatliche Übersicht (Einnahmen/Ausgaben/Differenz)
- Statistiken & Charts
- Umschichtungs-Logik (korrekt als Transfer markiert)

---

## Neues Design-Konzept

### 1. Tab-basierte Navigation

Statt verschachtelter Collapsibles eine klare Tab-Struktur:

```text
+--------------------------------------------------+
|  [Übersicht]  [Konten]  [Investments]  [Verlauf] |
+--------------------------------------------------+
```

### 2. Übersicht-Tab (Dashboard)

```text
+--------------------------------------------------+
|          € 45.230                                |
|       Gesamtvermögen                             |
+--------------------------------------------------+

+-------------+  +-------------+  +-------------+
| Konten      |  | Investments |  | Kredite     |
| € 12.500    |  | € 32.730    |  | +€ 500      |
+-------------+  +-------------+  +-------------+

+--------------------------------------------------+
|  Januar 2026                                     |
|  +€ 1.200 Einnahmen  -€ 800 Ausgaben  =+€ 400   |
+--------------------------------------------------+

+--------------------------------------------------+
|  [Vermögensentwicklung Chart - letzte 30 Tage]  |
+--------------------------------------------------+

+--------------------------------------------------+
|  Nächste Abbuchungen (3)                        |
|  - Netflix: €12.99 am 15.01                     |
|  - Spotify: €9.99 am 20.01                      |
+--------------------------------------------------+
```

### 3. Konten-Tab

```text
+--------------------------------------------------+
|  Bankkonten                         € 10.500    |
+--------------------------------------------------+
|  [Konto 1]           [Konto 2]                  |
|  € 8.000             € 2.500                    |
+--------------------------------------------------+

+--------------------------------------------------+
|  Bargeld                             € 2.000    |
+--------------------------------------------------+
|  [Scheine]           [Münzen]                   |
|  € 1.800             € 200                      |
+--------------------------------------------------+

+--------------------------------------------------+
|  Verliehen & Geliehen               Netto +€500 |
+--------------------------------------------------+
|  [Person 1: +€300]   [Person 2: -€200]          |
+--------------------------------------------------+
```

### 4. Investments-Tab

```text
+--------------------------------------------------+
|  Portfolio-Übersicht           € 32.730  +12.5% |
+--------------------------------------------------+

+--------------------------------------------------+
|  ETFs & Aktien                  € 25.000  +15%  |
+--------------------------------------------------+
|  [ETF 1]  [ETF 2]  [Aktie 1]                    |
+--------------------------------------------------+

+--------------------------------------------------+
|  Kryptowährungen                 € 7.730  +8%   |
+--------------------------------------------------+
|  [Bitcoin]  [Ethereum]                          |
+--------------------------------------------------+

+--------------------------------------------------+
|  [Performance-Chart mit Zeitraumfilter]         |
+--------------------------------------------------+
```

### 5. Verlauf-Tab

```text
+--------------------------------------------------+
|  [Suchfeld]  [Filter: Alle/Einnahmen/Ausgaben]  |
+--------------------------------------------------+

+--------------------------------------------------+
|  Heute                                          |
|  [Transaktion 1]                                |
|  [Transaktion 2]                                |
+--------------------------------------------------+

+--------------------------------------------------+
|  Gestern                                        |
|  [Transaktion 3]                                |
+--------------------------------------------------+

+--------------------------------------------------+
|  Abos & Automationen (5 aktiv)         [+]      |
+--------------------------------------------------+
|  [Abo 1]  [Abo 2]  [Abo 3]                      |
+--------------------------------------------------+
```

---

## Technische Umsetzung

### Neue Dateistruktur

```text
src/components/privat/finance/
├── FinanceSection.tsx (Hauptkomponente mit Tabs)
├── tabs/
│   ├── OverviewTab.tsx (Dashboard-Ansicht)
│   ├── AccountsTab.tsx (Konten + Kredite)
│   ├── InvestmentsTab.tsx (ETFs, Aktien, Krypto)
│   └── HistoryTab.tsx (Verlauf + Abos)
├── cards/
│   ├── TotalBalanceCard.tsx
│   ├── MonthlyOverviewCard.tsx
│   ├── QuickStatsRow.tsx
│   └── UpcomingPaymentsCard.tsx
├── charts/
│   └── WealthChart.tsx
├── AccountCard.tsx (bestehend)
├── InvestmentCard.tsx (bestehend)
├── ... (bestehende Dialoge)
```

### Hauptkomponente FinanceSection.tsx

```typescript
// Neue Struktur mit Tabs
export function FinanceSection({ onBack }: FinanceSectionProps) {
  const [activeTab, setActiveTab] = useState('overview');
  
  // Zentraler State für alle Daten
  const { accounts, investments, transactions, ... } = useFinanceData();
  
  return (
    <div className="space-y-3">
      {/* Kompakter Header mit Gesamtvermögen */}
      <FinanceHeader totalBalance={...} onBack={onBack} />
      
      {/* Tab Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="overview">Übersicht</TabsTrigger>
          <TabsTrigger value="accounts">Konten</TabsTrigger>
          <TabsTrigger value="investments">Invest</TabsTrigger>
          <TabsTrigger value="history">Verlauf</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview">
          <OverviewTab {...} />
        </TabsContent>
        {/* ... weitere Tabs */}
      </Tabs>
    </div>
  );
}
```

---

## Designverbesserungen

### Visuelle Hierarchie

- Grössere, klarere Zahlen für wichtige Werte
- Farbcodierung: Grün (Einnahmen/Gewinn), Rot (Ausgaben/Verlust), Blau (Umschichtungen)
- Mehr Weissraum zwischen Sektionen
- Karten statt Collapsibles für bessere Übersicht

### Mobile-First Anpassungen

- Horizontale Tabs mit Scroll auf kleinen Bildschirmen
- Kompakte Karten-Layouts
- Touch-freundliche Buttons (min. 44px)
- Swipe-Gesten für Tab-Wechsel

### Schnellaktionen

Floating Action Button (FAB) mit:
- Neue Transaktion
- Neues Investment
- Neues Konto

---

## Zusammenfassung der Änderungen

| Bereich | Vorher | Nachher |
|---------|--------|---------|
| Struktur | 1 Datei, 880 Zeilen | 8+ Dateien, modular |
| Navigation | Collapsibles | Tabs |
| Übersicht | Verteilt | Zentrales Dashboard |
| Charts | Versteckt in Collapsible | Prominent im Overview |
| Abos | Eigene Card | Teil des Verlauf-Tabs |

**Wichtig:** Alle bestehenden Features und die Umschichtungs-Logik bleiben vollständig erhalten. Es werden keine Daten oder Funktionen entfernt.
