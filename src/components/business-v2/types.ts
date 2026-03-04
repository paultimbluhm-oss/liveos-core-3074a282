export type CompanyStatus = 'researched' | 'contacted' | 'in_contact' | 'completed';
export type RelationType = 'partner' | 'competitor' | 'subsidiary' | 'supplier' | 'customer';
export type TimelineEntryType = 'call' | 'email' | 'status_change' | 'note';

export interface CompanyCategory {
  id: string;
  user_id: string;
  name: string;
  color?: string;
  order_index: number;
  created_at: string;
}

export interface Company {
  id: string;
  user_id: string;
  name: string;
  category_id?: string;
  status: CompanyStatus;
  website?: string;
  industry?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CompanyContact {
  id: string;
  user_id: string;
  company_id: string;
  name: string;
  position?: string;
  email?: string;
  phone?: string;
  notes?: string;
  created_at: string;
}

export interface CompanyRelation {
  id: string;
  user_id: string;
  from_company_id: string;
  to_company_id: string;
  relation_type: RelationType;
  description?: string;
  created_at: string;
}

export interface TimelineEntry {
  id: string;
  user_id: string;
  company_id: string;
  entry_type: TimelineEntryType;
  title?: string;
  content?: string;
  contact_id?: string;
  created_at: string;
}

export interface CompanyTag {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface CompanyTagAssignment {
  id: string;
  company_id: string;
  tag_id: string;
  user_id: string;
}

export interface CompanyTodo {
  id: string;
  user_id: string;
  company_id: string;
  title: string;
  completed: boolean;
  due_date?: string;
  created_at: string;
}

export interface CompanyLink {
  id: string;
  user_id: string;
  company_id: string;
  title: string;
  url: string;
  link_type: string;
  created_at: string;
}

export const STATUS_CONFIG: Record<CompanyStatus, { label: string; color: string }> = {
  researched: { label: 'Recherchiert', color: 'bg-muted text-muted-foreground' },
  contacted: { label: 'Angeschrieben', color: 'bg-blue-500/20 text-blue-600' },
  in_contact: { label: 'In Kontakt', color: 'bg-violet-500/20 text-violet-600' },
  completed: { label: 'Abgeschlossen', color: 'bg-green-500/20 text-green-600' },
};

export const RELATION_CONFIG: Record<RelationType, string> = {
  partner: 'Partner',
  competitor: 'Konkurrent',
  subsidiary: 'Tochterunternehmen',
  supplier: 'Lieferant',
  customer: 'Kunde',
};

export const TIMELINE_TYPE_CONFIG: Record<TimelineEntryType, { label: string; icon: string }> = {
  call: { label: 'Anruf / Gespraech', icon: 'Phone' },
  email: { label: 'E-Mail', icon: 'Mail' },
  status_change: { label: 'Status-Wechsel', icon: 'ArrowRight' },
  note: { label: 'Notiz', icon: 'StickyNote' },
};
