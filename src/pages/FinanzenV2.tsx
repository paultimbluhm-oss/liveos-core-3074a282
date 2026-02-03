import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LayoutDashboard, Wallet, TrendingUp, Package, History, RefreshCw, Tag } from 'lucide-react';
import { DashboardTab } from '@/components/finanzen-v2/tabs/DashboardTab';
import { AccountsTab } from '@/components/finanzen-v2/tabs/AccountsTab';
import { InvestmentsTab } from '@/components/finanzen-v2/tabs/InvestmentsTab';
import { MaterialTab } from '@/components/finanzen-v2/tabs/MaterialTab';
import { HistoryTab } from '@/components/finanzen-v2/tabs/HistoryTab';
import { AutomationsTab } from '@/components/finanzen-v2/tabs/AutomationsTab';
import { CategoriesTab } from '@/components/finanzen-v2/tabs/CategoriesTab';
import { FinanceV2Provider } from '@/components/finanzen-v2/context/FinanceV2Context';

export default function FinanzenV2() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <AppLayout>
      <FinanceV2Provider>
        <div className="p-4 pb-24 max-w-7xl mx-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-7 w-full h-12 mb-4">
              <TabsTrigger 
                value="dashboard" 
                className="flex flex-col items-center gap-0.5 text-[10px] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </TabsTrigger>
              <TabsTrigger 
                value="accounts" 
                className="flex flex-col items-center gap-0.5 text-[10px] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Wallet className="w-4 h-4" />
                <span className="hidden sm:inline">Konten</span>
              </TabsTrigger>
              <TabsTrigger 
                value="investments" 
                className="flex flex-col items-center gap-0.5 text-[10px] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <TrendingUp className="w-4 h-4" />
                <span className="hidden sm:inline">Invest</span>
              </TabsTrigger>
              <TabsTrigger 
                value="material" 
                className="flex flex-col items-center gap-0.5 text-[10px] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Package className="w-4 h-4" />
                <span className="hidden sm:inline">Materiell</span>
              </TabsTrigger>
              <TabsTrigger 
                value="automations" 
                className="flex flex-col items-center gap-0.5 text-[10px] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="hidden sm:inline">Auto</span>
              </TabsTrigger>
              <TabsTrigger 
                value="history" 
                className="flex flex-col items-center gap-0.5 text-[10px] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <History className="w-4 h-4" />
                <span className="hidden sm:inline">Verlauf</span>
              </TabsTrigger>
              <TabsTrigger 
                value="categories" 
                className="flex flex-col items-center gap-0.5 text-[10px] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Tag className="w-4 h-4" />
                <span className="hidden sm:inline">Kat.</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard" className="mt-0">
              <DashboardTab />
            </TabsContent>

            <TabsContent value="accounts" className="mt-0">
              <AccountsTab />
            </TabsContent>

            <TabsContent value="investments" className="mt-0">
              <InvestmentsTab />
            </TabsContent>

            <TabsContent value="material" className="mt-0">
              <MaterialTab />
            </TabsContent>

            <TabsContent value="automations" className="mt-0">
              <AutomationsTab />
            </TabsContent>

            <TabsContent value="history" className="mt-0">
              <HistoryTab />
            </TabsContent>

            <TabsContent value="categories" className="mt-0">
              <CategoriesTab />
            </TabsContent>
          </Tabs>
        </div>
      </FinanceV2Provider>
    </AppLayout>
  );
}