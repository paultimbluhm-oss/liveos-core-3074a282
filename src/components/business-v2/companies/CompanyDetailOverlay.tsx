import { useState } from 'react';
import { ArrowLeft, Building2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useBusinessV2 } from '../context/BusinessV2Context';
import { Company } from '../types';
import { OverviewTab } from './detail-tabs/OverviewTab';
import { TimelineTab } from './detail-tabs/TimelineTab';
import { ContactsTab } from './detail-tabs/ContactsTab';
import { TodosTab } from './detail-tabs/TodosTab';
import { LinksTab } from './detail-tabs/LinksTab';

interface CompanyDetailOverlayProps {
  company: Company;
  onBack: () => void;
}

export function CompanyDetailOverlay({ company, onBack }: CompanyDetailOverlayProps) {
  const { deleteCompany, getCompanyTags, getStatusConfig } = useBusinessV2();
  const companyTags = getCompanyTags(company.id);
  const statusCfg = getStatusConfig(company.status);

  const handleDelete = async () => {
    await deleteCompany(company.id);
    onBack();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="min-w-0">
            <h2 className="text-lg font-bold truncate">{company.name}</h2>
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                style={{ backgroundColor: `${statusCfg.color}20`, color: statusCfg.color }}
              >
                {statusCfg.name}
              </span>
              {companyTags.map(tag => (
                <span key={tag.id} className="px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ backgroundColor: `${tag.color}20`, color: tag.color }}>
                  {tag.name}
                </span>
              ))}
            </div>
          </div>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0">
              <Trash2 className="w-4 h-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Unternehmen loeschen?</AlertDialogTitle>
              <AlertDialogDescription>Alle Daten werden unwiderruflich geloescht.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Loeschen</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full grid grid-cols-5 h-9">
          <TabsTrigger value="overview" className="text-xs px-1">Info</TabsTrigger>
          <TabsTrigger value="timeline" className="text-xs px-1">Timeline</TabsTrigger>
          <TabsTrigger value="contacts" className="text-xs px-1">Kontakte</TabsTrigger>
          <TabsTrigger value="todos" className="text-xs px-1">To-Dos</TabsTrigger>
          <TabsTrigger value="links" className="text-xs px-1">Links</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-4">
          <OverviewTab company={company} />
        </TabsContent>
        <TabsContent value="timeline" className="mt-4">
          <TimelineTab company={company} />
        </TabsContent>
        <TabsContent value="contacts" className="mt-4">
          <ContactsTab company={company} />
        </TabsContent>
        <TabsContent value="todos" className="mt-4">
          <TodosTab company={company} />
        </TabsContent>
        <TabsContent value="links" className="mt-4">
          <LinksTab company={company} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
