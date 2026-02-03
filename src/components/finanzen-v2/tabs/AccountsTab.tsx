import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Wallet, Banknote, PiggyBank, HelpCircle, Coins, ChevronRight, Users, Check } from 'lucide-react';
import { useFinanceV2, V2Account, V2ExternalSaving } from '../context/FinanceV2Context';
import { AddAccountDialog } from '../dialogs/AddAccountDialog';
import { AccountDetailSheet } from '../sheets/AccountDetailSheet';
import { CashDenominationSheet } from '../sheets/CashDenominationSheet';
import { AddExternalSavingDialog } from '../dialogs/AddExternalSavingDialog';
import { ExternalSavingDetailSheet } from '../sheets/ExternalSavingDetailSheet';
import { getSupabase } from '@/hooks/useAuth';
import { toast } from 'sonner';

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
  const { accounts, externalSavings, totalAccountsEur, totalExternalSavingsEur, loading, refreshAccounts, refreshExternalSavings } = useFinanceV2();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<V2Account | null>(null);
  const [showCashSheet, setShowCashSheet] = useState(false);
  const [selectedCashAccount, setSelectedCashAccount] = useState<V2Account | null>(null);
  
  // External savings state
  const [showAddExternalDialog, setShowAddExternalDialog] = useState(false);
  const [selectedExternalSaving, setSelectedExternalSaving] = useState<V2ExternalSaving | null>(null);
  
  // Quick cash input state
  const [quickCashAmount, setQuickCashAmount] = useState('');
  const [savingCash, setSavingCash] = useState(false);

  const formatCurrency = (value: number, currency: string = 'EUR') => 
    value.toLocaleString('de-DE', { style: 'currency', currency, maximumFractionDigits: 2 });

  // Group accounts by type
  const groupedAccounts = accounts.reduce((acc, account) => {
    if (!acc[account.account_type]) acc[account.account_type] = [];
    acc[account.account_type].push(account);
    return acc;
  }, {} as Record<string, V2Account[]>);

  // Get first cash account for quick input
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
      toast.error('Ungültiger Betrag');
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
        <p className="text-white/70 text-xs font-medium mb-1">Kontenstände gesamt</p>
        <p className="text-3xl font-bold text-white tracking-tight">{formatCurrency(totalAccountsEur)}</p>
      </div>

      {/* Quick Cash Input - Only show if cash account exists */}
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

      {/* External Savings Section */}
      <div className="space-y-2 pt-4 border-t border-border">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Externe Sparbeträge
            </span>
          </div>
          <span className="text-sm font-semibold text-primary">{formatCurrency(totalExternalSavingsEur)}</span>
        </div>
        
        <Button 
          onClick={() => setShowAddExternalDialog(true)} 
          variant="ghost"
          className="w-full h-10 rounded-xl bg-card border border-border hover:bg-secondary text-sm"
        >
          <Plus className="w-4 h-4 mr-2 text-primary" />
          Neuer Sparbetrag
        </Button>

        {externalSavings.length > 0 && (
          <div className="rounded-2xl bg-card border border-border overflow-hidden">
            {externalSavings.map((saving, index) => (
              <div 
                key={saving.id} 
                className={`
                  flex items-center gap-3 p-3 cursor-pointer hover:bg-secondary/50 transition-colors
                  ${index !== externalSavings.length - 1 ? 'border-b border-border' : ''}
                `}
                onClick={() => setSelectedExternalSaving(saving)}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${saving.is_received ? 'bg-emerald-500/10' : 'bg-primary/10'}`}>
                  <Users className={`w-5 h-5 ${saving.is_received ? 'text-emerald-500' : 'text-primary'}`} />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{saving.name}</p>
                  <p className="text-xs text-muted-foreground">{saving.source_person}</p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <span className="font-semibold text-sm block">
                      {formatCurrency(saving.amount)}
                    </span>
                    {saving.is_received && (
                      <span className="text-[10px] text-emerald-500">Erhalten</span>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Empty State */}
      {accounts.length === 0 && (
        <div className="rounded-2xl bg-card border border-border p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
            <Wallet className="w-8 h-8 text-blue-500" />
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
      
      <AddExternalSavingDialog
        open={showAddExternalDialog}
        onOpenChange={setShowAddExternalDialog}
      />
      
      <ExternalSavingDetailSheet
        saving={selectedExternalSaving}
        open={!!selectedExternalSaving}
        onOpenChange={(open) => !open && setSelectedExternalSaving(null)}
      />
    </div>
  );
}
