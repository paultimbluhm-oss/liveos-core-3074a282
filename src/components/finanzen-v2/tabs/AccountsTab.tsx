import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Wallet, Banknote, PiggyBank, HelpCircle, Coins } from 'lucide-react';
import { useFinanceV2, V2Account } from '../context/FinanceV2Context';
import { AddAccountDialog } from '../dialogs/AddAccountDialog';
import { AccountDetailSheet } from '../sheets/AccountDetailSheet';
import { CashDenominationSheet } from '../sheets/CashDenominationSheet';

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
    <div className="space-y-4">
      {/* Summary Card */}
      <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5">
        <CardContent className="pt-6 pb-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-1">Kontenstände gesamt</p>
            <p className="text-3xl font-bold">{formatCurrency(totalAccountsEur)}</p>
          </div>
        </CardContent>
      </Card>

      {/* Add Account Button */}
      <Button 
        onClick={() => setShowAddDialog(true)} 
        className="w-full"
        variant="outline"
      >
        <Plus className="w-4 h-4 mr-2" />
        Neues Konto
      </Button>

      {/* Accounts by Type */}
      {Object.entries(groupedAccounts).map(([type, accs]) => (
        <Card key={type}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              {accountTypeIcons[type]}
              {accountTypeLabels[type]}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {accs.map(account => (
              <div 
                key={account.id} 
                className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors border"
                onClick={() => handleAccountClick(account)}
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: account.color || 'hsl(var(--muted))' }}
                  >
                    {account.account_type === 'cash' ? (
                      <Coins className="w-5 h-5" />
                    ) : (
                      accountTypeIcons[account.account_type]
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{account.name}</p>
                    <p className="text-xs text-muted-foreground">{account.currency}</p>
                  </div>
                </div>
                <span className="text-lg font-semibold">
                  {formatCurrency(account.balance, account.currency)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      {accounts.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Wallet className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground">Noch keine Konten angelegt</p>
            <p className="text-sm text-muted-foreground mt-1">Erstelle dein erstes Konto um loszulegen</p>
          </CardContent>
        </Card>
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
