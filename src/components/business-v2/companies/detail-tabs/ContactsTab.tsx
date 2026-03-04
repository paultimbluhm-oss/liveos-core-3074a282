import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBusinessV2 } from '../../context/BusinessV2Context';
import { Company } from '../../types';
import { ContactCard } from '../../contacts/ContactCard';
import { AddContactDialog } from '../../contacts/AddContactDialog';

interface ContactsTabProps {
  company: Company;
}

export function ContactsTab({ company }: ContactsTabProps) {
  const { getCompanyContacts } = useBusinessV2();
  const [addOpen, setAddOpen] = useState(false);
  const contacts = getCompanyContacts(company.id);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Kontakte</span>
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setAddOpen(true)}>
          <Plus className="w-3.5 h-3.5 mr-1" /> Hinzufuegen
        </Button>
      </div>
      {contacts.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-8">Keine Kontakte</p>
      ) : (
        <div className="space-y-2">
          {contacts.map(contact => (
            <ContactCard key={contact.id} contact={contact} />
          ))}
        </div>
      )}
      <AddContactDialog open={addOpen} onOpenChange={setAddOpen} companyId={company.id} />
    </div>
  );
}
