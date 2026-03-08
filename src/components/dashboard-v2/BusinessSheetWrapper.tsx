import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { BusinessV2Provider } from '@/components/business-v2/context/BusinessV2Context';
import { CompanyList } from '@/components/business-v2/companies/CompanyList';
import { BusinessCostsTab } from '@/components/business-v2/costs/BusinessCostsTab';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

interface BusinessSheetWrapperProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BusinessSheetWrapper({ open, onOpenChange }: BusinessSheetWrapperProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[92vh] rounded-t-[1.5rem] p-0">
        <BusinessV2Provider>
          <SheetHeader className="px-4 pt-4 pb-2">
            <SheetTitle>Business</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto p-4 max-h-[calc(92vh-80px)]">
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
        </BusinessV2Provider>
      </SheetContent>
    </Sheet>
  );
}
