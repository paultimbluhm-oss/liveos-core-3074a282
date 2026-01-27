import { Card, CardContent } from '@/components/ui/card';
import { Wallet, Banknote, Coins } from 'lucide-react';
import { AccountCard } from '../AccountCard';
import { AddAccountDialog } from '../AddAccountDialog';
import { LoansSection } from '../LoansSection';
import type { Account } from '../hooks/useFinanceData';

interface AccountsTabProps {
  accounts: Account[];
  bankAccounts: Account[];
  cashAccounts: Account[];
  totalBalance: number;
  onRefresh: () => void;
}

export function AccountsTab({
  accounts,
  bankAccounts,
  cashAccounts,
  totalBalance,
  onRefresh,
}: AccountsTabProps) {
  const formatCurrency = (value: number) => 
    value.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

  const bankTotal = bankAccounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
  const cashTotal = cashAccounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);

  return (
    <div className="space-y-4">
      {/* Total Balance Card */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/20">
                <Wallet className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Konten gesamt</p>
                <p className="text-xl font-bold">{formatCurrency(totalBalance)}</p>
              </div>
            </div>
            <AddAccountDialog onAccountAdded={onRefresh} />
          </div>
        </CardContent>
      </Card>

      {/* Bank Accounts Section */}
      {bankAccounts.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Banknote className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Bankkonten</span>
            </div>
            <span className="text-sm font-bold">{formatCurrency(bankTotal)}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {bankAccounts.map((acc) => (
              <AccountCard key={acc.id} account={acc} onUpdated={onRefresh} />
            ))}
          </div>
        </div>
      )}

      {/* Cash Section */}
      {cashAccounts.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Bargeld</span>
            </div>
            <span className="text-sm font-bold">{formatCurrency(cashTotal)}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {cashAccounts.map((acc) => (
              <AccountCard key={acc.id} account={acc} onUpdated={onRefresh} />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {accounts.length === 0 && (
        <Card className="border-border/50 border-dashed">
          <CardContent className="p-8 text-center">
            <Wallet className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground mb-3">Noch keine Konten vorhanden</p>
            <AddAccountDialog onAccountAdded={onRefresh} />
          </CardContent>
        </Card>
      )}

      {/* Loans Section */}
      <LoansSection onRefresh={onRefresh} accounts={accounts} />
    </div>
  );
}
