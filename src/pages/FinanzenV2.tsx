import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { LayoutDashboard, Wallet, TrendingUp, Package, History, RefreshCw, Tag } from 'lucide-react';
import { DashboardTab } from '@/components/finanzen-v2/tabs/DashboardTab';
import { AccountsTab } from '@/components/finanzen-v2/tabs/AccountsTab';
import { InvestmentsTab } from '@/components/finanzen-v2/tabs/InvestmentsTab';
import { MaterialTab } from '@/components/finanzen-v2/tabs/MaterialTab';
import { HistoryTab } from '@/components/finanzen-v2/tabs/HistoryTab';
import { AutomationsTab } from '@/components/finanzen-v2/tabs/AutomationsTab';
import { CategoriesTab } from '@/components/finanzen-v2/tabs/CategoriesTab';
import { FinanceV2Provider } from '@/components/finanzen-v2/context/FinanceV2Context';

const tabs = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { id: 'accounts', icon: Wallet, label: 'Konten' },
  { id: 'investments', icon: TrendingUp, label: 'Invest' },
  { id: 'material', icon: Package, label: 'Materiell' },
  { id: 'automations', icon: RefreshCw, label: 'Auto' },
  { id: 'history', icon: History, label: 'Verlauf' },
  { id: 'categories', icon: Tag, label: 'Kat.' },
];

export default function FinanzenV2() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <DashboardTab />;
      case 'accounts': return <AccountsTab />;
      case 'investments': return <InvestmentsTab />;
      case 'material': return <MaterialTab />;
      case 'automations': return <AutomationsTab />;
      case 'history': return <HistoryTab />;
      case 'categories': return <CategoriesTab />;
      default: return <DashboardTab />;
    }
  };

  return (
    <AppLayout>
      <FinanceV2Provider>
        <div className="min-h-screen pb-28">
          {/* Content Area */}
          <div className="p-4 max-w-2xl mx-auto">
            {renderContent()}
          </div>

          {/* iOS-Style Bottom Tab Bar */}
          <div className="fixed bottom-0 left-0 right-0 z-50">
            <div className="bg-card/80 backdrop-blur-2xl border-t border-white/10">
              <div className="max-w-2xl mx-auto px-2 py-2">
                <div className="flex justify-around items-center">
                  {tabs.map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`
                          flex flex-col items-center justify-center py-2 px-3 rounded-2xl transition-all duration-300
                          ${isActive 
                            ? 'text-primary' 
                            : 'text-muted-foreground hover:text-foreground'
                          }
                        `}
                      >
                        <div className={`
                          relative p-2 rounded-2xl transition-all duration-300
                          ${isActive ? 'bg-primary/20' : ''}
                        `}>
                          <Icon className={`w-5 h-5 transition-transform duration-300 ${isActive ? 'scale-110' : ''}`} />
                          {isActive && (
                            <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-xl" />
                          )}
                        </div>
                        <span className={`text-[10px] mt-1 font-medium transition-all duration-300 ${isActive ? 'opacity-100' : 'opacity-70'}`}>
                          {tab.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            
            {/* Home Indicator Line */}
            <div className="bg-card/80 backdrop-blur-2xl pb-2 flex justify-center">
              <div className="w-32 h-1 bg-white/20 rounded-full" />
            </div>
          </div>
        </div>
      </FinanceV2Provider>
    </AppLayout>
  );
}
