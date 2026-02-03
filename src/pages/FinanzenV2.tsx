import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { LayoutDashboard, Wallet, TrendingUp, BarChart3 } from 'lucide-react';
import { DashboardTab } from '@/components/finanzen-v2/tabs/DashboardTab';
import { AccountsTab } from '@/components/finanzen-v2/tabs/AccountsTab';
import { InvestmentsTab } from '@/components/finanzen-v2/tabs/InvestmentsTab';
import { StatisticsTab } from '@/components/finanzen-v2/tabs/StatisticsTab';
import { FinanceV2Provider } from '@/components/finanzen-v2/context/FinanceV2Context';

const tabs = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Übersicht' },
  { id: 'accounts', icon: Wallet, label: 'Konten' },
  { id: 'investments', icon: TrendingUp, label: 'Invest' },
  { id: 'statistics', icon: BarChart3, label: 'Statistik' },
];

export default function FinanzenV2() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <DashboardTab />;
      case 'accounts': return <AccountsTab />;
      case 'investments': return <InvestmentsTab />;
      case 'statistics': return <StatisticsTab />;
      default: return <DashboardTab />;
    }
  };

  return (
    <AppLayout>
      <FinanceV2Provider>
        <div className="min-h-screen pb-24">
          {/* Content Area */}
          <div className="p-4 max-w-2xl mx-auto">
            {renderContent()}
          </div>

          {/* Compact Bottom Tab Bar - iOS Style */}
          <div className="fixed bottom-0 left-0 right-0 z-50 safe-area-bottom">
            <div className="bg-background/95 backdrop-blur-xl border-t border-border/50">
              <div className="max-w-2xl mx-auto">
                <div className="flex justify-around items-center h-16 px-4">
                  {tabs.map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`
                          flex flex-col items-center justify-center gap-1 py-2 px-4 rounded-xl transition-all duration-200
                          ${isActive 
                            ? 'text-primary' 
                            : 'text-muted-foreground'
                          }
                        `}
                      >
                        <Icon className={`w-5 h-5 ${isActive ? 'text-primary' : ''}`} />
                        <span className={`text-[10px] font-medium ${isActive ? 'text-primary' : ''}`}>
                          {tab.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </FinanceV2Provider>
    </AppLayout>
  );
}
