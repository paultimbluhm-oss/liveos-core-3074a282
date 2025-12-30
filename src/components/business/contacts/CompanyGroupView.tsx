import { useState, useMemo } from 'react';
import { Building2, ChevronDown, ChevronRight, Users, Mail, Phone, Briefcase, MoreVertical, Pencil, Trash2, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Contact, Order, STATUS_CONFIG, ContactStatus } from './types';
import { motion, AnimatePresence } from 'framer-motion';

interface CompanyGroupViewProps {
  contacts: Contact[];
  orders: Order[];
  onEdit: (contact: Contact) => void;
  onDelete: (contact: Contact) => void;
  onLinkContacts: (contact: Contact) => void;
  connectionCount: (contactId: string) => number;
}

interface CompanyGroup {
  name: string;
  contacts: Contact[];
  orderCount: number;
}

export function CompanyGroupView({ contacts, orders, onEdit, onDelete, onLinkContacts, connectionCount }: CompanyGroupViewProps) {
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set());

  const companyGroups = useMemo(() => {
    const groups: Record<string, CompanyGroup> = {};
    
    contacts.forEach(contact => {
      const companyName = contact.company?.trim() || 'Ohne Unternehmen';
      
      if (!groups[companyName]) {
        groups[companyName] = {
          name: companyName,
          contacts: [],
          orderCount: 0,
        };
      }
      
      groups[companyName].contacts.push(contact);
      groups[companyName].orderCount += orders.filter(o => o.contact_id === contact.id).length;
    });

    // Sort contacts within each group by status order
    Object.values(groups).forEach(group => {
      group.contacts.sort((a, b) => {
        const orderA = STATUS_CONFIG[a.status]?.order || 99;
        const orderB = STATUS_CONFIG[b.status]?.order || 99;
        return orderA - orderB;
      });
    });

    // Sort groups: companies with orders first, then by contact count
    return Object.values(groups).sort((a, b) => {
      if (a.orderCount !== b.orderCount) return b.orderCount - a.orderCount;
      return b.contacts.length - a.contacts.length;
    });
  }, [contacts, orders]);

  const toggleCompany = (companyName: string) => {
    setExpandedCompanies(prev => {
      const next = new Set(prev);
      if (next.has(companyName)) {
        next.delete(companyName);
      } else {
        next.add(companyName);
      }
      return next;
    });
  };

  const getStatusConfig = (status: ContactStatus) => {
    return STATUS_CONFIG[status] || { 
      label: status, 
      color: 'text-muted-foreground', 
      bgColor: 'bg-muted/50', 
      borderColor: 'border-muted',
      dotColor: 'bg-muted-foreground',
      order: 99 
    };
  };

  const getStatusCounts = (contacts: Contact[]) => {
    const counts: Partial<Record<string, number>> = {};
    contacts.forEach(c => {
      const config = getStatusConfig(c.status);
      if (config) {
        counts[c.status] = (counts[c.status] || 0) + 1;
      }
    });
    return counts;
  };

  if (companyGroups.length === 0) {
    return (
      <div className="text-center py-12">
        <Building2 className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
        <h3 className="font-medium text-muted-foreground mb-2">Keine Unternehmen gefunden</h3>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {companyGroups.map((group, idx) => {
        const isExpanded = expandedCompanies.has(group.name);
        const statusCounts = getStatusCounts(group.contacts);
        
        return (
          <motion.div
            key={group.name}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
          >
            <Collapsible open={isExpanded} onOpenChange={() => toggleCompany(group.name)}>
              <CollapsibleTrigger asChild>
                <button className="w-full glass-card p-4 flex items-center justify-between hover:border-primary/50 transition-all duration-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-info/20">
                      <Building2 className="w-5 h-5 text-info" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold">{group.name}</h3>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {group.contacts.length} Kontakt{group.contacts.length !== 1 ? 'e' : ''}
                        </span>
                        {group.orderCount > 0 && (
                          <span className="flex items-center gap-1 text-primary">
                            <Briefcase className="w-3 h-3" />
                            {group.orderCount} Auftrag{group.orderCount !== 1 ? 'e' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="hidden sm:flex gap-1.5">
                      {Object.entries(statusCounts).slice(0, 4).map(([status, count]) => {
                        const config = getStatusConfig(status as ContactStatus);
                        return (
                          <Badge 
                            key={status} 
                            variant="outline" 
                            className={`${config.bgColor} ${config.color} ${config.borderColor} text-xs font-medium px-2 py-0.5`}
                          >
                            <span className={`w-2 h-2 rounded-full ${config.dotColor} mr-1.5`} />
                            {count}
                          </Badge>
                        );
                      })}
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                </button>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <AnimatePresence>
                  <div className="mt-2 ml-4 pl-4 border-l-2 border-border/50 space-y-2">
                    {group.contacts.map((contact, cIdx) => {
                      const statusConfig = getStatusConfig(contact.status);
                      const connCount = connectionCount(contact.id);
                      
                      return (
                        <motion.div
                          key={contact.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: cIdx * 0.03 }}
                          className="glass-card p-3 flex items-center justify-between group hover:border-primary/30 transition-all"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`w-3 h-3 rounded-full ${statusConfig.dotColor} flex-shrink-0`} />
                              <span className="font-medium">{contact.name}</span>
                              <Badge 
                                variant="outline" 
                                className={`${statusConfig.bgColor} ${statusConfig.color} ${statusConfig.borderColor} text-xs font-medium`}
                              >
                                {statusConfig.label}
                              </Badge>
                              {connCount > 0 && (
                                <Badge variant="outline" className="bg-primary/10 text-primary border-0 text-xs">
                                  <Link2 className="w-3 h-3 mr-1" />
                                  {connCount}
                                </Badge>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                              {contact.position && (
                                <span className="flex items-center gap-1">
                                  <Briefcase className="w-3 h-3" />
                                  {contact.position}
                                </span>
                              )}
                              {contact.email && (
                                <a href={`mailto:${contact.email}`} className="flex items-center gap-1 hover:text-primary transition-colors">
                                  <Mail className="w-3 h-3" />
                                  <span className="truncate max-w-[150px]">{contact.email}</span>
                                </a>
                              )}
                              {contact.phone && (
                                <a href={`tel:${contact.phone}`} className="flex items-center gap-1 hover:text-primary transition-colors">
                                  <Phone className="w-3 h-3" />
                                  {contact.phone}
                                </a>
                              )}
                            </div>
                          </div>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-popover">
                              <DropdownMenuItem onClick={() => onEdit(contact)}>
                                <Pencil className="w-4 h-4 mr-2" />
                                Bearbeiten
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => onLinkContacts(contact)}>
                                <Link2 className="w-4 h-4 mr-2" />
                                Verknüpfen
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => onDelete(contact)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Löschen
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </motion.div>
                      );
                    })}
                  </div>
                </AnimatePresence>
              </CollapsibleContent>
            </Collapsible>
          </motion.div>
        );
      })}
    </div>
  );
}
