
# Finanzen V2 - Statistik-Datenintegrität

## Identifizierte Probleme

### 1. Snapshots zeigen falsche Income/Expenses-Werte
Die Snapshots in der Datenbank zeigen `income_eur: 0.00` und `expenses_eur: 0.00` für alle Tage, obwohl Transaktionen existieren:
- Am 05.02. gab es eine Einnahme von 597.70 EUR (Gehalt)
- Am 04.02. gab es eine Ausgabe von 3.58 EUR

Die Snapshots zeigen aber income_eur und expenses_eur beide als 0.

### 2. Transaktionen werden nur begrenzt geladen
Die `refreshTransactions` Funktion lädt nur die letzten 100 Transaktionen:
```typescript
.limit(100)
```
Für historische Berechnungen werden aber ALLE Transaktionen benötigt.

### 3. Investments-Wert in historischen Snapshots ist immer der aktuelle Wert
Der Code verwendet immer den aktuellen Investmentwert für historische Snapshots:
```typescript
investments.forEach(inv => {
  const value = inv.quantity * (inv.current_price || inv.avg_purchase_price);
  // ...
});
```
Das bedeutet, dass der historische Net-Worth falsch berechnet wird, weil sich Kryptokurse täglich ändern.

### 4. Keine Berücksichtigung von Investment-Käufen/-Verkäufen
Bei `investment_buy` und `investment_sell` Transaktionen wird der Kontostand historisch nicht korrekt rückberechnet.

### 5. StatisticsTab liest Cashflow aus Snapshots, aber diese sind leer
Die Statistik-Charts zeigen falsche Werte, weil sie auf den korrupten Snapshot-Daten basieren.

---

## Lösungsplan

### Schritt 1: Alle Transaktionen für Berechnungen laden
Für die Snapshot-Neuberechnung müssen ALLE Transaktionen abgerufen werden, nicht nur die letzten 100.

**Datei:** `FinanceV2Context.tsx`
- In `recalculateSnapshotsFromDate` wird bereits eine separate Abfrage gemacht
- Diese Abfrage muss ohne `.limit()` erfolgen

### Schritt 2: Snapshot-Erstellung bei Transaktionen korrigieren
Nach jeder Transaktion (hinzufügen/bearbeiten/löschen) muss der Snapshot für das betroffene Datum korrekt aktualisiert werden.

**Dateien:**
- `AddTransactionDialog.tsx`
- `EditTransactionDialog.tsx`
- `TransactionDetailSheet.tsx` (Löschen)

Die `recalculateSnapshotsFromDate` Funktion muss robuster werden:
1. Alle Transaktionen ohne Limit laden
2. Für jeden Tag vom geänderten Datum bis heute:
   - Historische Kontostände berechnen
   - Tageseinnahmen/-ausgaben summieren
   - Snapshot upserten

### Schritt 3: Investment-Handling verbessern
Investment-Transaktionen (`investment_buy`, `investment_sell`) müssen korrekt behandelt werden:
- `investment_buy`: Zählt als Ausgabe (Geld verlässt Konto)
- `investment_sell`: Zählt als Einnahme (Geld kommt auf Konto)

### Schritt 4: Konsistenzprüfung beim Laden
Beim Öffnen der Finanzen V2 Seite:
1. Prüfen, ob der heutige Snapshot existiert und aktuell ist
2. Prüfen, ob es Lücken in den Snapshots gibt
3. Automatisch fehlende Snapshots erstellen

### Schritt 5: Edge-Function für tägliche Snapshot-Aktualisierung
Die bestehende `v2-daily-snapshot` Edge-Function muss:
- Alle Transaktionen laden (nicht nur heute)
- Income/Expenses pro Tag korrekt summieren
- Historische Kontostände berechnen

---

## Technische Details

### Korrigierte `recalculateSnapshotsFromDate` Funktion

```typescript
const recalculateSnapshotsFromDate = useCallback(async (fromDate: string) => {
  if (!user) return;
  const supabase = getSupabase();
  const today = startOfDay(new Date());
  const startDate = startOfDay(parseISO(fromDate));
  
  if (isBefore(today, startDate)) return;
  
  const daysToRecalculate = eachDayOfInterval({ start: startDate, end: today });
  
  // ALLE Transaktionen laden (kein Limit!)
  const { data: allTransactions } = await supabase
    .from('v2_transactions')
    .select('*')
    .eq('user_id', user.id)
    .order('date', { ascending: true });
  
  const { data: currentAccounts } = await supabase
    .from('v2_accounts')
    .select('*')
    .eq('user_id', user.id);
  
  if (!allTransactions || !currentAccounts) return;
  
  for (const day of daysToRecalculate) {
    const dayStr = format(day, 'yyyy-MM-dd');
    
    // Tageseinnahmen/-ausgaben aus Transaktionen
    const dayTx = allTransactions.filter(tx => tx.date === dayStr);
    let incomeEur = 0;
    let expensesEur = 0;
    
    dayTx.forEach(tx => {
      const amt = tx.currency === 'USD' ? tx.amount / eurUsdRate : tx.amount;
      if (tx.transaction_type === 'income' || tx.transaction_type === 'investment_sell') {
        incomeEur += amt;
      } else if (tx.transaction_type === 'expense' || tx.transaction_type === 'investment_buy') {
        expensesEur += amt;
      }
      // transfer wird nicht gezählt (kein Geld verlässt/kommt)
    });
    
    // Historische Kontostände berechnen
    const accountBalances: Record<string, number> = {};
    let totalAccountsEurCalc = 0;
    
    currentAccounts.forEach(acc => {
      let historicalBalance = acc.balance;
      
      // Alle Transaktionen NACH diesem Tag rückgängig machen
      allTransactions
        .filter(tx => tx.date > dayStr)
        .forEach(tx => {
          if (tx.account_id === acc.id) {
            if (tx.transaction_type === 'income' || tx.transaction_type === 'investment_sell') {
              historicalBalance -= tx.amount;
            } else if (tx.transaction_type === 'expense' || tx.transaction_type === 'investment_buy' || tx.transaction_type === 'transfer') {
              historicalBalance += tx.amount;
            }
          }
          if (tx.to_account_id === acc.id && tx.transaction_type === 'transfer') {
            historicalBalance -= tx.amount;
          }
        });
      
      accountBalances[acc.id] = historicalBalance;
      totalAccountsEurCalc += acc.currency === 'USD' ? historicalBalance / eurUsdRate : historicalBalance;
    });
    
    // Investment-Wert (vereinfacht: aktueller Wert, da historische Kurse komplex wären)
    let totalInvestmentsEurCalc = 0;
    investments.forEach(inv => {
      const value = inv.quantity * (inv.current_price || inv.avg_purchase_price);
      totalInvestmentsEurCalc += inv.currency === 'USD' ? value / eurUsdRate : value;
    });
    
    await supabase.from('v2_daily_snapshots').upsert({
      user_id: user.id,
      date: dayStr,
      account_balances: accountBalances,
      total_accounts_eur: totalAccountsEurCalc,
      total_investments_eur: totalInvestmentsEurCalc,
      net_worth_eur: totalAccountsEurCalc + totalInvestmentsEurCalc,
      income_eur: incomeEur,
      expenses_eur: expensesEur,
      eur_usd_rate: eurUsdRate,
    }, { onConflict: 'user_id,date' });
  }
  
  await refreshSnapshots();
}, [user, investments, eurUsdRate, refreshSnapshots]);
```

### Einmaliger Reparatur-Aufruf
Nach dem Deploy sollte einmalig eine Reparatur aller historischen Snapshots erfolgen:
```typescript
// Im useEffect nach dem ersten Laden
useEffect(() => {
  if (user && !loading && transactions.length > 0) {
    // Finde das älteste Transaktionsdatum
    const oldestDate = transactions.reduce((min, tx) => 
      tx.date < min ? tx.date : min, 
      format(new Date(), 'yyyy-MM-dd')
    );
    recalculateSnapshotsFromDate(oldestDate);
  }
}, [user, loading, transactions.length]);
```

---

## Betroffene Dateien

| Datei | Änderung |
|-------|----------|
| `FinanceV2Context.tsx` | Korrigierte Snapshot-Berechnung, vollständige Transaktionsliste |
| `AddTransactionDialog.tsx` | Sicherstellen, dass Snapshot korrekt aktualisiert wird |
| `EditTransactionDialog.tsx` | Snapshot-Update bei Bearbeitung |
| `TransactionDetailSheet.tsx` | Snapshot-Update bei Löschung |
| `v2-daily-snapshot/index.ts` | Edge-Function Korrektur für tägliche Snapshots |

---

## Erwartetes Ergebnis

Nach der Implementierung:
1. Alle Snapshots enthalten korrekte Income/Expenses-Werte
2. Die Vermögensentwicklung im Chart zeigt den korrekten Verlauf
3. Monatlicher Cashflow zeigt die tatsächlichen Ein-/Ausgaben
4. Bei Transaktionsänderungen werden alle betroffenen Snapshots aktualisiert
