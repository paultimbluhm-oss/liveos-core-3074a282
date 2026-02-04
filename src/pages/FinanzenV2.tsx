import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { LayoutDashboard, Wallet, TrendingUp, BarChart3, Receipt, Settings } from 'lucide-react';
import { DashboardTab } from '@/components/finanzen-v2/tabs/DashboardTab';
import { AccountsTab } from '@/components/finanzen-v2/tabs/AccountsTab';
import { InvestmentsTab } from '@/components/finanzen-v2/tabs/InvestmentsTab';
import { StatisticsTab } from '@/components/finanzen-v2/tabs/StatisticsTab';
import { TransactionsTab } from '@/components/finanzen-v2/tabs/TransactionsTab';
import { FinanceSettingsSheet } from '@/components/finanzen-v2/sheets/FinanceSettingsSheet';
import { FinanceV2Provider } from '@/components/finanzen-v2/context/FinanceV2Context';

const tabs = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Übersicht' },
  { id: 'accounts', icon: Wallet, label: 'Konten' },
  { id: 'investments', icon: TrendingUp, label: 'Invest' },
  { id: 'transactions', icon: Receipt, label: 'Buchungen' },
  { id: 'statistics', icon: BarChart3, label: 'Statistik' },
];

export default function FinanzenV2() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showSettings, setShowSettings] = useState(false);

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
    <AppLayout>
      <FinanceV2Provider>
        <div className="min-h-screen pb-24">
          {/* Settings Button */}
          <div className="fixed top-4 right-4 z-40">
            <button
              onClick={() => setShowSettings(true)}
              className="w-10 h-10 rounded-xl bg-card/80 backdrop-blur-xl border border-border shadow-lg flex items-center justify-center hover:bg-card transition-colors"
            >
              <Settings className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {/* Content Area */}
          <div className="p-4 max-w-2xl mx-auto pt-16">
            {renderContent()}
          </div>

          {/* Compact Bottom Tab Bar - iOS Style */}
          <div className="fixed bottom-0 left-0 right-0 z-50 safe-area-bottom">
            <div className="bg-background/95 backdrop-blur-xl border-t border-border/50">
              <div className="max-w-2xl mx-auto">
                <div className="flex justify-around items-center h-16 px-2">
                  {tabs.map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`
                          flex flex-col items-center justify-center gap-0.5 py-2 px-2 rounded-xl transition-all duration-200
                          ${isActive 
                            ? 'text-primary' 
                            : 'text-muted-foreground'
                          }
                        `}
                      >
                        <Icon className={`w-5 h-5 ${isActive ? 'text-primary' : ''}`} />
                        <span className={`text-[9px] font-medium ${isActive ? 'text-primary' : ''}`}>
                          {tab.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Settings Sheet */}
          <FinanceSettingsSheet open={showSettings} onOpenChange={setShowSettings} />
        </div>
      </FinanceV2Provider>
    </AppLayout>
  );
}
