import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Wallet, Banknote, PiggyBank, HelpCircle, Coins, ChevronRight, Check, ArrowUpRight, ArrowDownRight, HandCoins } from 'lucide-react';
import { useFinanceV2, V2Account, V2Loan } from '../context/FinanceV2Context';
import { AddAccountDialog } from '../dialogs/AddAccountDialog';
import { AccountDetailSheet } from '../sheets/AccountDetailSheet';
import { CashDenominationSheet } from '../sheets/CashDenominationSheet';
import { AddLoanDialog } from '../dialogs/AddLoanDialog';
import { LoanDetailSheet } from '../sheets/LoanDetailSheet';
import { getSupabase } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

const accountTypeIcons: Record<string, React.ReactNode> = {
  giro: <Wallet className="w-4 h-4" />,
  tagesgeld: <PiggyBank className="w-4 h-4" />,
  cash: <Banknote className="w-4 h-4" />,
  sonstiges: <HelpCircle className="w-4 h-4" />,
};

const accountTypeLabels: Record<string, string> = {
  giro: 'Girokonto',
  tagesgeld: 'Tagesgeld',
  cash: 'Bargeld',
  sonstiges: 'Sonstiges',
};

export function AccountsTab() {
  const { accounts, loans, totalAccountsEur, loading, refreshAccounts } = useFinanceV2();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<V2Account | null>(null);
  const [showCashSheet, setShowCashSheet] = useState(false);
  const [selectedCashAccount, setSelectedCashAccount] = useState<V2Account | null>(null);
  
  // Loans state
  const [showAddLoanDialog, setShowAddLoanDialog] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<V2Loan | null>(null);

  // Quick cash input state
  const [quickCashAmount, setQuickCashAmount] = useState('');
  const [savingCash, setSavingCash] = useState(false);

  const formatCurrency = (value: number, currency: string = 'EUR') => 
    value.toLocaleString('de-DE', { style: 'currency', currency });

  // Group accounts by type
  const groupedAccounts = accounts.reduce((acc, account) => {
    if (!acc[account.account_type]) acc[account.account_type] = [];
    acc[account.account_type].push(account);
    return acc;
  }, {} as Record<string, V2Account[]>);

  const cashAccount = accounts.find(a => a.account_type === 'cash');

  const handleAccountClick = (account: V2Account) => {
    if (account.account_type === 'cash') {
      setSelectedCashAccount(account);
      setShowCashSheet(true);
    } else {
      setSelectedAccount(account);
    }
  };

  const handleQuickCashSave = async () => {
    if (!cashAccount || !quickCashAmount) return;
    
    const amount = parseFloat(quickCashAmount.replace(',', '.'));
    if (isNaN(amount)) {
      toast.error('Ungueltiger Betrag');
      return;
    }
    
    setSavingCash(true);
    try {
      const supabase = getSupabase();
      await supabase
        .from('v2_accounts')
        .update({ balance: amount, updated_at: new Date().toISOString() })
        .eq('id', cashAccount.id);
      
      await refreshAccounts();
      setQuickCashAmount('');
      toast.success('Bargeld aktualisiert');
    } catch (error) {
      toast.error('Fehler beim Speichern');
    } finally {
      setSavingCash(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Total Card */}
      <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 p-5">
        <p className="text-white/70 text-xs font-medium mb-1">Kontenstaende gesamt</p>
        <p className="text-3xl font-bold text-white tracking-tight">{formatCurrency(totalAccountsEur)}</p>
      </div>

      {/* Quick Cash Input */}
      {cashAccount && (
        <div className="rounded-2xl bg-card border border-border p-4">
          <div className="flex items-center gap-2 mb-3">
            <Coins className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-medium">Bargeld aktualisieren</span>
          </div>
          <div className="flex gap-2">
            <Input
              type="text"
              inputMode="decimal"
              placeholder={formatCurrency(cashAccount.balance)}
              value={quickCashAmount}
              onChange={(e) => setQuickCashAmount(e.target.value)}
              className="flex-1 h-10 rounded-xl bg-secondary border-0"
            />
            <Button
              onClick={handleQuickCashSave}
              disabled={!quickCashAmount || savingCash}
              className="h-10 w-10 rounded-xl bg-primary p-0"
            >
              <Check className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Add Account Button */}
      <Button 
        onClick={() => setShowAddDialog(true)} 
        variant="ghost"
        className="w-full h-12 rounded-xl bg-card border border-border hover:bg-secondary"
      >
        <Plus className="w-4 h-4 mr-2 text-primary" />
        <span className="font-medium">Neues Konto</span>
      </Button>

      {/* Accounts by Type */}
      {Object.entries(groupedAccounts).map(([type, accs]) => (
        <div key={type} className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {accountTypeLabels[type]}
            </span>
          </div>
          
          <div className="rounded-2xl bg-card border border-border overflow-hidden">
            {accs.map((account, index) => (
              <div 
                key={account.id} 
                className={`
                  flex items-center gap-3 p-3 cursor-pointer hover:bg-secondary/50 transition-colors
                  ${index !== accs.length - 1 ? 'border-b border-border' : ''}
                `}
                onClick={() => handleAccountClick(account)}
              >
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  {account.account_type === 'cash' ? (
                    <Coins className="w-5 h-5 text-amber-500" />
                  ) : (
                    <span className="text-blue-500">{accountTypeIcons[account.account_type]}</span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{account.name}</p>
                  <p className="text-xs text-muted-foreground">{account.currency}</p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">
                    {formatCurrency(account.balance, account.currency)}
                  </span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Loans Section */}
      <div className="space-y-2 pt-4 border-t border-border">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <HandCoins className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Verliehen / Geliehen
            </span>
          </div>
          {loans.filter(l => !l.is_settled).length > 0 && (
            <span className="text-sm font-semibold">
              {formatCurrency(
                loans.filter(l => !l.is_settled && l.loan_type === 'lent').reduce((s, l) => s + l.amount, 0) -
                loans.filter(l => !l.is_settled && l.loan_type === 'borrowed').reduce((s, l) => s + l.amount, 0)
              )}
            </span>
          )}
        </div>

        <Button
          onClick={() => setShowAddLoanDialog(true)}
          variant="ghost"
          className="w-full h-10 rounded-xl bg-card border border-border hover:bg-secondary text-sm"
        >
          <Plus className="w-4 h-4 mr-2 text-primary" />
          Neuer Eintrag
        </Button>

        {loans.filter(l => !l.is_settled).length > 0 && (
          <div className="rounded-2xl bg-card border border-border overflow-hidden">
            {loans.filter(l => !l.is_settled).map((loan, index, arr) => (
              <div
                key={loan.id}
                className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-secondary/50 transition-colors ${
                  index !== arr.length - 1 ? 'border-b border-border' : ''
                }`}
                onClick={() => setSelectedLoan(loan)}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  loan.loan_type === 'lent' ? 'bg-amber-500/10' : 'bg-violet-500/10'
                }`}>
                  {loan.loan_type === 'lent'
                    ? <ArrowUpRight className="w-5 h-5 text-amber-500" />
                    : <ArrowDownRight className="w-5 h-5 text-violet-500" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{loan.person_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {loan.loan_type === 'lent' ? 'Verliehen' : 'Geliehen'}
                    {' · '}{format(new Date(loan.date), 'dd.MM.yy', { locale: de })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`font-semibold text-sm ${loan.loan_type === 'lent' ? 'text-amber-500' : 'text-violet-500'}`}>
                    {formatCurrency(loan.amount, loan.currency)}
                  </span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Settled loans */}
        {loans.filter(l => l.is_settled).length > 0 && (
          <details className="group">
            <summary className="text-xs text-muted-foreground cursor-pointer px-1 py-1">
              {loans.filter(l => l.is_settled).length} beglichen
            </summary>
            <div className="rounded-2xl bg-card border border-border overflow-hidden mt-2 opacity-60">
              {loans.filter(l => l.is_settled).map((loan, index, arr) => (
                <div
                  key={loan.id}
                  className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-secondary/50 transition-colors ${
                    index !== arr.length - 1 ? 'border-b border-border' : ''
                  }`}
                  onClick={() => setSelectedLoan(loan)}
                >
                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                    <Check className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{loan.person_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {loan.loan_type === 'lent' ? 'Verliehen' : 'Geliehen'}
                    </p>
                  </div>
                  <span className="font-semibold text-sm text-muted-foreground">
                    {formatCurrency(loan.amount, loan.currency)}
                  </span>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>

      {/* Empty State */}
      {accounts.length === 0 && (
        <div className="rounded-2xl bg-card border border-border p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Wallet className="w-8 h-8 text-primary" />
          </div>
          <p className="font-semibold mb-1">Noch keine Konten</p>
          <p className="text-sm text-muted-foreground">Erstelle dein erstes Konto</p>
        </div>
      )}

      {/* Dialogs & Sheets */}
      <AddAccountDialog 
        open={showAddDialog} 
        onOpenChange={setShowAddDialog} 
      />
      
      <AccountDetailSheet
        account={selectedAccount}
        open={!!selectedAccount}
        onOpenChange={(open) => !open && setSelectedAccount(null)}
      />
      
      <CashDenominationSheet
        account={selectedCashAccount}
        open={showCashSheet}
        onOpenChange={setShowCashSheet}
      />

      <AddLoanDialog
        open={showAddLoanDialog}
        onOpenChange={setShowAddLoanDialog}
      />

      <LoanDetailSheet
        loan={selectedLoan}
        open={!!selectedLoan}
        onOpenChange={(open) => !open && setSelectedLoan(null)}
      />
    </div>
  );
}
