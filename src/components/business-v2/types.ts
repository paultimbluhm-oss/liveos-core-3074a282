export type RelationType = 'partner' | 'competitor' | 'subsidiary' | 'supplier' | 'customer';
export type TimelineEntryType = 'call' | 'email' | 'status_change' | 'note';

export interface CompanyStatus {
  id: string;
  user_id: string;
  key: string;
  name: string;
  color: string;
  order_index: number;
  created_at: string;
}

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
  status: string;
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

export const DEFAULT_STATUSES = [
  { key: 'researched', name: 'Recherchiert', color: '#64748b', order_index: 0 },
  { key: 'contacted', name: 'Angeschrieben', color: '#3b82f6', order_index: 1 },
  { key: 'in_contact', name: 'In Kontakt', color: '#8b5cf6', order_index: 2 },
  { key: 'completed', name: 'Abgeschlossen', color: '#22c55e', order_index: 3 },
];

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
