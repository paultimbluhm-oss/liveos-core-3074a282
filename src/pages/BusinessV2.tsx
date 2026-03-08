import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { BusinessV2Provider } from '@/components/business-v2/context/BusinessV2Context';
import { CompanyList } from '@/components/business-v2/companies/CompanyList';
import { BusinessCostsTab } from '@/components/business-v2/costs/BusinessCostsTab';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

export default function BusinessV2() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <BusinessV2Provider>
      <AppLayout>
        <div className="container max-w-2xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold mb-6">Business</h1>
          <Tabs defaultValue="pipeline">
            <TabsList className="w-full mb-4">
              <TabsTrigger value="pipeline" className="flex-1 text-xs">Pipeline</TabsTrigger>
              <TabsTrigger value="costs" className="flex-1 text-xs">Kosten</TabsTrigger>
            </TabsList>
            <TabsContent value="pipeline">
              <CompanyList />
            </TabsContent>
            <TabsContent value="costs">
              <BusinessCostsTab />
            </TabsContent>
          </Tabs>
        </div>
      </AppLayout>
    </BusinessV2Provider>
  );
}
