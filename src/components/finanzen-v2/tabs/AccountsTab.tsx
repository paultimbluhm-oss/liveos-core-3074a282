import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Wallet, Banknote, PiggyBank, HelpCircle, Coins, ChevronRight } from 'lucide-react';
import { useFinanceV2, V2Account } from '../context/FinanceV2Context';
import { AddAccountDialog } from '../dialogs/AddAccountDialog';
import { AccountDetailSheet } from '../sheets/AccountDetailSheet';
import { CashDenominationSheet } from '../sheets/CashDenominationSheet';

const accountTypeIcons: Record<string, React.ReactNode> = {
  giro: <Wallet className="w-5 h-5" />,
  tagesgeld: <PiggyBank className="w-5 h-5" />,
  cash: <Banknote className="w-5 h-5" />,
  sonstiges: <HelpCircle className="w-5 h-5" />,
};

const accountTypeLabels: Record<string, string> = {
  giro: 'Girokonto',
  tagesgeld: 'Tagesgeld',
  cash: 'Bargeld',
  sonstiges: 'Sonstiges',
};

const accountTypeColors: Record<string, string> = {
  giro: 'from-blue-500/20 to-blue-600/10',
  tagesgeld: 'from-emerald-500/20 to-emerald-600/10',
  cash: 'from-amber-500/20 to-amber-600/10',
  sonstiges: 'from-slate-500/20 to-slate-600/10',
};

export function AccountsTab() {
  const { accounts, totalAccountsEur, loading } = useFinanceV2();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<V2Account | null>(null);
  const [showCashSheet, setShowCashSheet] = useState(false);
  const [selectedCashAccount, setSelectedCashAccount] = useState<V2Account | null>(null);

  const formatCurrency = (value: number, currency: string = 'EUR') => 
    value.toLocaleString('de-DE', { style: 'currency', currency, maximumFractionDigits: 2 });

  // Group accounts by type
  const groupedAccounts = accounts.reduce((acc, account) => {
    if (!acc[account.account_type]) acc[account.account_type] = [];
    acc[account.account_type].push(account);
    return acc;
  }, {} as Record<string, V2Account[]>);

  const handleAccountClick = (account: V2Account) => {
    if (account.account_type === 'cash') {
      setSelectedCashAccount(account);
      setShowCashSheet(true);
    } else {
      setSelectedAccount(account);
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
    <div className="space-y-6">
      {/* Hero Total Card - iOS Glassmorphism Style */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-600 p-6 shadow-2xl">
        <div className="absolute inset-0 bg-white/10 backdrop-blur-3xl" />
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-white/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
        
        <div className="relative z-10 text-center">
          <p className="text-white/70 text-sm font-medium mb-2">Kontenstände gesamt</p>
          <p className="text-4xl font-bold text-white tracking-tight">{formatCurrency(totalAccountsEur)}</p>
        </div>
      </div>

      {/* Add Account Button - Pill Style */}
      <Button 
        onClick={() => setShowAddDialog(true)} 
        className="w-full h-14 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-xl text-foreground transition-all duration-300"
        variant="ghost"
      >
        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center mr-3">
          <Plus className="w-5 h-5 text-primary" />
        </div>
        <span className="font-medium">Neues Konto hinzufügen</span>
      </Button>

      {/* Accounts by Type - iOS Card Groups */}
      {Object.entries(groupedAccounts).map(([type, accs]) => (
        <div key={type} className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center">
              {accountTypeIcons[type]}
            </div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {accountTypeLabels[type]}
            </h3>
          </div>
          
          <div className="rounded-2xl overflow-hidden bg-white/5 backdrop-blur-xl border border-white/10">
            {accs.map((account, index) => (
              <div 
                key={account.id} 
                className={`
                  flex items-center gap-4 p-4 cursor-pointer
                  transition-all duration-200 active:scale-[0.98]
                  hover:bg-white/5
                  ${index !== accs.length - 1 ? 'border-b border-white/5' : ''}
                `}
                onClick={() => handleAccountClick(account)}
              >
                {/* Account Icon with Gradient */}
                <div className={`
                  w-12 h-12 rounded-2xl flex items-center justify-center
                  bg-gradient-to-br ${accountTypeColors[account.account_type]}
                  shadow-lg shadow-black/10
                `}>
                  {account.account_type === 'cash' ? (
                    <Coins className="w-6 h-6 text-amber-400" />
                  ) : (
                    <span className="text-blue-400">{accountTypeIcons[account.account_type]}</span>
                  )}
                </div>

                {/* Account Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">{account.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{account.currency}</p>
                </div>

                {/* Balance & Chevron */}
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-foreground">
                    {formatCurrency(account.balance, account.currency)}
                  </span>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Empty State */}
      {accounts.length === 0 && (
        <div className="rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 p-12 text-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500/20 to-indigo-500/20 flex items-center justify-center mx-auto mb-6">
            <Wallet className="w-10 h-10 text-blue-400" />
          </div>
          <p className="text-lg font-semibold text-foreground mb-2">Noch keine Konten</p>
          <p className="text-sm text-muted-foreground">Erstelle dein erstes Konto um loszulegen</p>
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
    </div>
  );
}
