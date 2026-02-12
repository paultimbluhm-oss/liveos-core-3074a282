import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { FinanceV2Provider } from '@/components/finanzen-v2/context/FinanceV2Context';
import { DashboardTab } from '@/components/finanzen-v2/tabs/DashboardTab';
import { AccountsTab } from '@/components/finanzen-v2/tabs/AccountsTab';
import { InvestmentsTab } from '@/components/finanzen-v2/tabs/InvestmentsTab';
import { TransactionsTab } from '@/components/finanzen-v2/tabs/TransactionsTab';
import { StatisticsTab } from '@/components/finanzen-v2/tabs/StatisticsTab';
import { useState } from 'react';
import { LayoutDashboard, Wallet, TrendingUp, Receipt, BarChart3 } from 'lucide-react';

const tabs = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Uebersicht' },
  { id: 'accounts', icon: Wallet, label: 'Konten' },
  { id: 'investments', icon: TrendingUp, label: 'Invest' },
  { id: 'transactions', icon: Receipt, label: 'Buchungen' },
  { id: 'statistics', icon: BarChart3, label: 'Statistik' },
];

interface FinanceSheetWrapperProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FinanceSheetWrapper({ open, onOpenChange }: FinanceSheetWrapperProps) {
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <DashboardTab />;
      case 'accounts': return <AccountsTab />;
      case 'investments': return <InvestmentsTab />;
      case 'transactions': return <TransactionsTab />;
      case 'statistics': return <StatisticsTab />;
      default: return <DashboardTab />;
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[92vh] rounded-t-2xl p-0">
        <FinanceV2Provider>
          <SheetHeader className="px-4 pt-4 pb-2">
            <SheetTitle>Finanzen</SheetTitle>
          </SheetHeader>

          {/* Tab bar */}
          <div className="flex justify-around items-center h-12 px-2 border-b border-border/50">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-col items-center gap-0.5 py-1.5 px-2 rounded-xl transition-colors ${
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-[9px] font-medium">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 max-h-[calc(92vh-120px)]">
            {renderContent()}
          </div>
        </FinanceV2Provider>
      </SheetContent>
    </Sheet>
  );
}
