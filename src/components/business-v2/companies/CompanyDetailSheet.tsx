import { useState } from 'react';
import { ArrowLeft, ExternalLink, Globe, Link2, Plus, Trash2 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useBusinessV2 } from '../context/BusinessV2Context';
import { Company, CompanyStatus, STATUS_CONFIG, RELATION_CONFIG } from '../types';
import { ContactCard } from '../contacts/ContactCard';
import { AddContactDialog } from '../contacts/AddContactDialog';
import { AddRelationDialog } from '../relations/AddRelationDialog';

interface CompanyDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company: Company | null;
}

export function CompanyDetailSheet({ open, onOpenChange, company }: CompanyDetailSheetProps) {
  const { updateCompany, deleteCompany, categories, getCompanyContacts, getCompanyRelations, deleteRelation } = useBusinessV2();
  const [addContactOpen, setAddContactOpen] = useState(false);
  const [addRelationOpen, setAddRelationOpen] = useState(false);

  if (!company) return null;

  const contacts = getCompanyContacts(company.id);
  const relations = getCompanyRelations(company.id);

  const handleDelete = async () => {
    await deleteCompany(company.id);
    onOpenChange(false);
  };

  const handleUpdate = (field: keyof Company, value: string | undefined) => {
    updateCompany(company.id, { [field]: value || undefined });
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="h-8 w-8">
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <SheetTitle className="text-lg">{company.name}</SheetTitle>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Unternehmen loeschen?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Alle Kontakte und Verknuepfungen werden ebenfalls geloescht.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                    Loeschen
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </SheetHeader>

          <div className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={company.name}
                  onChange={(e) => handleUpdate('name', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select 
                    value={company.status} 
                    onValueChange={(v) => handleUpdate('status', v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                        <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Kategorie</Label>
                  <Select 
                    value={company.category_id || 'none'} 
                    onValueChange={(v) => handleUpdate('category_id', v === 'none' ? undefined : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Keine" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Keine</SelectItem>
                      {categories.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Website</Label>
                <div className="flex gap-2">
                  <Input
                    value={company.website || ''}
                    onChange={(e) => handleUpdate('website', e.target.value)}
                    placeholder="https://..."
                    className="flex-1"
                  />
                  {company.website && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => window.open(company.website, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Branche</Label>
                <Input
                  value={company.industry || ''}
                  onChange={(e) => handleUpdate('industry', e.target.value)}
                  placeholder="z.B. Software, Beratung..."
                />
              </div>

              <div className="space-y-2">
                <Label>Notizen</Label>
                <Textarea
                  value={company.notes || ''}
                  onChange={(e) => handleUpdate('notes', e.target.value)}
                  placeholder="Notizen..."
                  rows={3}
                />
              </div>
            </div>

            <Separator />

            {/* Contacts */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">Kontakte</h3>
                <Button variant="ghost" size="sm" onClick={() => setAddContactOpen(true)}>
                  <Plus className="w-4 h-4 mr-1" />
                  Hinzufuegen
                </Button>
              </div>
              {contacts.length === 0 ? (
                <p className="text-sm text-muted-foreground">Keine Kontakte</p>
              ) : (
                <div className="space-y-2">
                  {contacts.map(contact => (
                    <ContactCard key={contact.id} contact={contact} />
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Relations */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">Verknuepfungen</h3>
                <Button variant="ghost" size="sm" onClick={() => setAddRelationOpen(true)}>
                  <Plus className="w-4 h-4 mr-1" />
                  Hinzufuegen
                </Button>
              </div>
              {relations.length === 0 ? (
                <p className="text-sm text-muted-foreground">Keine Verknuepfungen</p>
              ) : (
                <div className="space-y-2">
                  {relations.map(({ relation, company: relCompany }) => (
                    <div key={relation.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2 min-w-0">
                        <Link2 className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="text-sm font-medium truncate">{relCompany.name}</span>
                        <span className="text-xs text-muted-foreground">
                          ({RELATION_CONFIG[relation.relation_type]})
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                        onClick={() => deleteRelation(relation.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <AddContactDialog 
        open={addContactOpen} 
        onOpenChange={setAddContactOpen} 
        companyId={company.id} 
      />
      <AddRelationDialog 
        open={addRelationOpen} 
        onOpenChange={setAddRelationOpen} 
        fromCompanyId={company.id} 
      />
    </>
  );
}
