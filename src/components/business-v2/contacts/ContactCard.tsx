import { Mail, Phone, Trash2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CompanyContact } from '../types';
import { useBusinessV2 } from '../context/BusinessV2Context';

interface ContactCardProps {
  contact: CompanyContact;
}

export function ContactCard({ contact }: ContactCardProps) {
  const { deleteContact } = useBusinessV2();

  return (
    <div className="flex items-start justify-between p-3 bg-muted/50 rounded-lg">
      <div className="flex items-start gap-3 min-w-0 flex-1">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
          <User className="w-4 h-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm">{contact.name}</p>
          {contact.position && (
            <p className="text-xs text-muted-foreground">{contact.position}</p>
          )}
          <div className="flex flex-wrap gap-2 mt-1">
            {contact.email && (
              <a 
                href={`mailto:${contact.email}`}
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <Mail className="w-3 h-3" />
                {contact.email}
              </a>
            )}
            {contact.phone && (
              <a 
                href={`tel:${contact.phone}`}
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <Phone className="w-3 h-3" />
                {contact.phone}
              </a>
            )}
          </div>
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
        onClick={() => deleteContact(contact.id)}
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
}
