import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { BusinessV2Provider } from '@/components/business-v2/context/BusinessV2Context';
import { CompanyList } from '@/components/business-v2/companies/CompanyList';

interface BusinessSheetWrapperProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BusinessSheetWrapper({ open, onOpenChange }: BusinessSheetWrapperProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[92vh] rounded-t-2xl p-0">
        <BusinessV2Provider>
          <SheetHeader className="px-4 pt-4 pb-2">
            <SheetTitle>Business Pipeline</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto p-4 max-h-[calc(92vh-80px)]">
            <CompanyList />
          </div>
        </BusinessV2Provider>
      </SheetContent>
    </Sheet>
  );
}
