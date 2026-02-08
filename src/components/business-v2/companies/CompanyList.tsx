import { useState, useMemo } from 'react';
import { Plus, FolderPlus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useBusinessV2 } from '../context/BusinessV2Context';
import { Company } from '../types';
import { CategorySection } from '../categories/CategorySection';
import { AddCompanyDialog } from './AddCompanyDialog';
import { AddCategoryDialog } from '../categories/AddCategoryDialog';
import { CompanyDetailSheet } from './CompanyDetailSheet';

export function CompanyList() {
  const { companies, categories, loading } = useBusinessV2();
  const [search, setSearch] = useState('');
  const [addCompanyOpen, setAddCompanyOpen] = useState(false);
  const [addCategoryOpen, setAddCategoryOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  const filteredCompanies = useMemo(() => {
    if (!search.trim()) return companies;
    const q = search.toLowerCase();
    return companies.filter(c => 
      c.name.toLowerCase().includes(q) ||
      c.industry?.toLowerCase().includes(q) ||
      c.website?.toLowerCase().includes(q)
    );
  }, [companies, search]);

  const groupedByCategory = useMemo(() => {
    const groups: { category: typeof categories[0] | null; companies: Company[] }[] = [];
    
    // Categories with companies
    categories.forEach(cat => {
      const catCompanies = filteredCompanies.filter(c => c.category_id === cat.id);
      groups.push({ category: cat, companies: catCompanies });
    });
    
    // Uncategorized
    const uncategorized = filteredCompanies.filter(c => !c.category_id);
    if (uncategorized.length > 0 || categories.length === 0) {
      groups.push({ category: null, companies: uncategorized });
    }
    
    return groups;
  }, [filteredCompanies, categories]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Suchen..."
              className="pl-9"
            />
          </div>
          <Button variant="outline" size="icon" onClick={() => setAddCategoryOpen(true)}>
            <FolderPlus className="w-4 h-4" />
          </Button>
          <Button size="icon" onClick={() => setAddCompanyOpen(true)}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {/* Category Sections */}
        <div className="space-y-6">
          {groupedByCategory.map((group, idx) => (
            <CategorySection
              key={group.category?.id || 'uncategorized'}
              category={group.category}
              companies={group.companies}
              onCompanyClick={setSelectedCompany}
            />
          ))}
        </div>

        {companies.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">Noch keine Unternehmen</p>
            <Button onClick={() => setAddCompanyOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Erstes Unternehmen hinzufuegen
            </Button>
          </div>
        )}
      </div>

      <AddCompanyDialog open={addCompanyOpen} onOpenChange={setAddCompanyOpen} />
      <AddCategoryDialog open={addCategoryOpen} onOpenChange={setAddCategoryOpen} />
      <CompanyDetailSheet 
        open={!!selectedCompany} 
        onOpenChange={(open) => !open && setSelectedCompany(null)} 
        company={selectedCompany} 
      />
    </>
  );
}
