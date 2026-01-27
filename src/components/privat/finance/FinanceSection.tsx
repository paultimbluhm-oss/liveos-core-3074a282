import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, LayoutDashboard, Wallet, TrendingUp, History } from 'lucide-react';
import { useFinanceData } from './hooks/useFinanceData';
import { OverviewTab } from './tabs/OverviewTab';
import { AccountsTab } from './tabs/AccountsTab';
import { InvestmentsTab } from './tabs/InvestmentsTab';
import { HistoryTab } from './tabs/HistoryTab';

interface FinanceSectionProps {
  onBack: () => void;
}

export function FinanceSection({ onBack }: FinanceSectionProps) {
  const [activeTab, setActiveTab] = useState('overview');
  
  const {
    accounts,
    investments,
    transactions,
    balanceHistory,
    prices,
    loadingPrices,
    totalBalance,
    totalInvestments,
    stockInvestments,
    cryptoInvestments,
    etfTotalValue,
    etfTotalCost,
    etfProfit,
    etfProfitPercent,
    cryptoTotalValue,
    cryptoTotalCost,
    cryptoProfit,
    cryptoProfitPercent,
    monthlyStats,
    bankAccounts,
    cashAccounts,
    fetchData,
    refreshPrice,
    deleteTransaction,
    fetchPrices,
  } = useFinanceData();

  const formatCurrency = (value: number) => 
    value.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="h-9 w-9 shrink-0">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <p className="text-2xl font-bold">{formatCurrency(totalBalance + totalInvestments)}</p>
          <p className="text-xs text-muted-foreground">Gesamtvermögen</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-4 w-full h-10">
          <TabsTrigger value="overview" className="text-xs gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Übersicht</span>
          </TabsTrigger>
          <TabsTrigger value="accounts" className="text-xs gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Wallet className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Konten</span>
          </TabsTrigger>
          <TabsTrigger value="investments" className="text-xs gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <TrendingUp className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Invest</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="text-xs gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <History className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Verlauf</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <OverviewTab
            accounts={accounts}
            investments={investments}
            transactions={transactions}
            balanceHistory={balanceHistory}
            totalBalance={totalBalance}
            totalInvestments={totalInvestments}
            monthlyStats={monthlyStats}
          />
        </TabsContent>

        <TabsContent value="accounts" className="mt-4">
          <AccountsTab
            accounts={accounts}
            bankAccounts={bankAccounts}
            cashAccounts={cashAccounts}
            totalBalance={totalBalance}
            onRefresh={fetchData}
          />
        </TabsContent>

        <TabsContent value="investments" className="mt-4">
          <InvestmentsTab
            investments={investments}
            stockInvestments={stockInvestments}
            cryptoInvestments={cryptoInvestments}
            prices={prices}
            loadingPrices={loadingPrices}
            totalInvestments={totalInvestments}
            etfTotalValue={etfTotalValue}
            etfTotalCost={etfTotalCost}
            etfProfit={etfProfit}
            etfProfitPercent={etfProfitPercent}
            cryptoTotalValue={cryptoTotalValue}
            cryptoTotalCost={cryptoTotalCost}
            cryptoProfit={cryptoProfit}
            cryptoProfitPercent={cryptoProfitPercent}
            onRefresh={fetchData}
            onRefreshPrice={refreshPrice}
            onRefreshAll={fetchPrices}
          />
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <HistoryTab
            accounts={accounts}
            investments={investments}
            transactions={transactions}
            onRefresh={fetchData}
            onDeleteTransaction={deleteTransaction}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
