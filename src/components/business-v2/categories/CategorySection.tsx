import { useState } from 'react';
import { ChevronDown, ChevronRight, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CompanyCategory, Company } from '../types';
import { CompanyCard } from '../companies/CompanyCard';
import { useBusinessV2 } from '../context/BusinessV2Context';
import { EditCategoryDialog } from './EditCategoryDialog';

interface CategorySectionProps {
  category: CompanyCategory | null;
  companies: Company[];
  onCompanyClick: (company: Company) => void;
}

export function CategorySection({ category, companies, onCompanyClick }: CategorySectionProps) {
  const { deleteCategory } = useBusinessV2();
  const [open, setOpen] = useState(true);
  const [editOpen, setEditOpen] = useState(false);

  const title = category?.name || 'Ohne Kategorie';

  return (
    <>
      <Collapsible open={open} onOpenChange={setOpen} className="space-y-2">
        <div className="flex items-center justify-between">
          <CollapsibleTrigger asChild>
            <button className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
              {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              <span>{title}</span>
              <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full">{companies.length}</span>
            </button>
          </CollapsibleTrigger>
          
          {category && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setEditOpen(true)}>
                  <Pencil className="w-4 h-4 mr-2" />
                  Bearbeiten
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => deleteCategory(category.id)}
                  className="text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Loeschen
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <CollapsibleContent className="space-y-2">
          {companies.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2 px-3">Keine Unternehmen</p>
          ) : (
            companies.map(company => (
              <CompanyCard key={company.id} company={company} onClick={() => onCompanyClick(company)} />
            ))
          )}
        </CollapsibleContent>
      </Collapsible>

      {category && (
        <EditCategoryDialog 
          open={editOpen} 
          onOpenChange={setEditOpen} 
          category={category} 
        />
      )}
    </>
  );
}
