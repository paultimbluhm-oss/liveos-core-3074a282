import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth, getSupabase } from '@/hooks/useAuth';
import { 
  Company, CompanyCategory, CompanyContact, CompanyRelation, CompanyStatus, RelationType,
  TimelineEntry, TimelineEntryType, CompanyTag, CompanyTagAssignment, CompanyTodo, CompanyLink,
  DEFAULT_STATUSES
} from '../types';

interface BusinessV2ContextType {
  companies: Company[];
  categories: CompanyCategory[];
  contacts: CompanyContact[];
  relations: CompanyRelation[];
  timeline: TimelineEntry[];
  tags: CompanyTag[];
  tagAssignments: CompanyTagAssignment[];
  todos: CompanyTodo[];
  links: CompanyLink[];
  statuses: CompanyStatus[];
  loading: boolean;
  
  addCompany: (data: Omit<Company, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<Company | null>;
  updateCompany: (id: string, data: Partial<Company>) => Promise<void>;
  deleteCompany: (id: string) => Promise<void>;
  
  addCategory: (name: string, color?: string) => Promise<CompanyCategory | null>;
  updateCategory: (id: string, data: Partial<CompanyCategory>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  
  addContact: (data: Omit<CompanyContact, 'id' | 'user_id' | 'created_at'>) => Promise<CompanyContact | null>;
  updateContact: (id: string, data: Partial<CompanyContact>) => Promise<void>;
  deleteContact: (id: string) => Promise<void>;
  
  addRelation: (fromId: string, toId: string, type: RelationType, description?: string) => Promise<CompanyRelation | null>;
  deleteRelation: (id: string) => Promise<void>;
  
  addTimelineEntry: (companyId: string, type: TimelineEntryType, title?: string, content?: string, contactId?: string) => Promise<TimelineEntry | null>;
  deleteTimelineEntry: (id: string) => Promise<void>;
  
  addTag: (name: string, color?: string) => Promise<CompanyTag | null>;
  deleteTag: (id: string) => Promise<void>;
  assignTag: (companyId: string, tagId: string) => Promise<void>;
  unassignTag: (companyId: string, tagId: string) => Promise<void>;
  
  addTodo: (companyId: string, title: string, dueDate?: string) => Promise<CompanyTodo | null>;
  updateTodo: (id: string, data: Partial<CompanyTodo>) => Promise<void>;
  deleteTodo: (id: string) => Promise<void>;
  
  addLink: (companyId: string, title: string, url: string, linkType?: string) => Promise<CompanyLink | null>;
  deleteLink: (id: string) => Promise<void>;
  
  addStatus: (name: string, color?: string) => Promise<CompanyStatus | null>;
  updateStatus: (id: string, data: Partial<CompanyStatus>) => Promise<void>;
  deleteStatus: (id: string) => Promise<void>;
  
  getCompanyContacts: (companyId: string) => CompanyContact[];
  getCompanyRelations: (companyId: string) => { relation: CompanyRelation; company: Company }[];
  getCompanyTimeline: (companyId: string) => TimelineEntry[];
  getCompanyTags: (companyId: string) => CompanyTag[];
  getCompanyTodos: (companyId: string) => CompanyTodo[];
  getCompanyLinks: (companyId: string) => CompanyLink[];
  getStatusConfig: (statusKey: string) => { name: string; color: string };
  refresh: () => Promise<void>;
}

const BusinessV2Context = createContext<BusinessV2ContextType | undefined>(undefined);

export function BusinessV2Provider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [categories, setCategories] = useState<CompanyCategory[]>([]);
  const [contacts, setContacts] = useState<CompanyContact[]>([]);
  const [relations, setRelations] = useState<CompanyRelation[]>([]);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [tags, setTags] = useState<CompanyTag[]>([]);
  const [tagAssignments, setTagAssignments] = useState<CompanyTagAssignment[]>([]);
  const [todos, setTodos] = useState<CompanyTodo[]>([]);
  const [links, setLinks] = useState<CompanyLink[]>([]);
  const [statuses, setStatuses] = useState<CompanyStatus[]>([]);
  const [loading, setLoading] = useState(true);

  const ensureDefaultStatuses = useCallback(async () => {
    if (!user) return;
    const supabase = getSupabase();
    const { data } = await supabase.from('v2_company_statuses').select('*').eq('user_id', user.id);
    if (!data || data.length === 0) {
      const inserts = DEFAULT_STATUSES.map(s => ({ ...s, user_id: user.id }));
      await supabase.from('v2_company_statuses').insert(inserts);
    }
  }, [user]);

  const refresh = useCallback(async () => {
    if (!user) return;
    const supabase = getSupabase();
    
    const [companiesRes, categoriesRes, contactsRes, relationsRes, timelineRes, tagsRes, tagAssignRes, todosRes, linksRes, statusesRes] = await Promise.all([
      supabase.from('v2_companies').select('*').eq('user_id', user.id).order('name'),
      supabase.from('v2_company_categories').select('*').eq('user_id', user.id).order('order_index'),
      supabase.from('v2_company_contacts').select('*').eq('user_id', user.id).order('name'),
      supabase.from('v2_company_relations').select('*').eq('user_id', user.id),
      supabase.from('v2_company_timeline').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('v2_company_tags').select('*').eq('user_id', user.id).order('name'),
      supabase.from('v2_company_tag_assignments').select('*').eq('user_id', user.id),
      supabase.from('v2_company_todos').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('v2_company_links').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('v2_company_statuses').select('*').eq('user_id', user.id).order('order_index'),
    ]);
    
    if (companiesRes.data) setCompanies(companiesRes.data as Company[]);
    if (categoriesRes.data) setCategories(categoriesRes.data as CompanyCategory[]);
    if (contactsRes.data) setContacts(contactsRes.data as CompanyContact[]);
    if (relationsRes.data) setRelations(relationsRes.data as CompanyRelation[]);
    if (timelineRes.data) setTimeline(timelineRes.data as TimelineEntry[]);
    if (tagsRes.data) setTags(tagsRes.data as CompanyTag[]);
    if (tagAssignRes.data) setTagAssignments(tagAssignRes.data as CompanyTagAssignment[]);
    if (todosRes.data) setTodos(todosRes.data as CompanyTodo[]);
    if (linksRes.data) setLinks(linksRes.data as CompanyLink[]);
    if (statusesRes.data) setStatuses(statusesRes.data as CompanyStatus[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    const init = async () => {
      await ensureDefaultStatuses();
      await refresh();
    };
    init();
  }, [ensureDefaultStatuses, refresh]);

  // Companies CRUD
  const addCompany = async (data: Omit<Company, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return null;
    const supabase = getSupabase();
    const { data: newCompany, error } = await supabase.from('v2_companies').insert({ ...data, user_id: user.id }).select().single();
    if (error) { console.error(error); return null; }
    const c = newCompany as Company;
    setCompanies(prev => [...prev, c].sort((a, b) => a.name.localeCompare(b.name)));
    return c;
  };

  const updateCompany = async (id: string, data: Partial<Company>) => {
    const supabase = getSupabase();
    const oldCompany = companies.find(c => c.id === id);
    const { error } = await supabase.from('v2_companies').update(data).eq('id', id);
    if (error) { console.error(error); return; }
    setCompanies(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
    if (data.status && oldCompany && data.status !== oldCompany.status) {
      const oldLabel = getStatusConfig(oldCompany.status).name;
      const newLabel = getStatusConfig(data.status).name;
      await addTimelineEntry(id, 'status_change', `${oldLabel} → ${newLabel}`);
    }
  };

  const deleteCompany = async (id: string) => {
    const supabase = getSupabase();
    const { error } = await supabase.from('v2_companies').delete().eq('id', id);
    if (error) { console.error(error); return; }
    setCompanies(prev => prev.filter(c => c.id !== id));
    setContacts(prev => prev.filter(c => c.company_id !== id));
    setRelations(prev => prev.filter(r => r.from_company_id !== id && r.to_company_id !== id));
    setTimeline(prev => prev.filter(t => t.company_id !== id));
    setTodos(prev => prev.filter(t => t.company_id !== id));
    setLinks(prev => prev.filter(l => l.company_id !== id));
  };

  // Categories CRUD
  const addCategory = async (name: string, color?: string) => {
    if (!user) return null;
    const supabase = getSupabase();
    const maxOrder = categories.length > 0 ? Math.max(...categories.map(c => c.order_index)) + 1 : 0;
    const { data: newCat, error } = await supabase.from('v2_company_categories').insert({ name, color, order_index: maxOrder, user_id: user.id }).select().single();
    if (error) { console.error(error); return null; }
    setCategories(prev => [...prev, newCat as CompanyCategory].sort((a, b) => a.order_index - b.order_index));
    return newCat as CompanyCategory;
  };

  const updateCategory = async (id: string, data: Partial<CompanyCategory>) => {
    const supabase = getSupabase();
    const { error } = await supabase.from('v2_company_categories').update(data).eq('id', id);
    if (error) { console.error(error); return; }
    setCategories(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
  };

  const deleteCategory = async (id: string) => {
    const supabase = getSupabase();
    const { error } = await supabase.from('v2_company_categories').delete().eq('id', id);
    if (error) { console.error(error); return; }
    setCategories(prev => prev.filter(c => c.id !== id));
  };

  // Contacts CRUD
  const addContact = async (data: Omit<CompanyContact, 'id' | 'user_id' | 'created_at'>) => {
    if (!user) return null;
    const supabase = getSupabase();
    const { data: newContact, error } = await supabase.from('v2_company_contacts').insert({ ...data, user_id: user.id }).select().single();
    if (error) { console.error(error); return null; }
    setContacts(prev => [...prev, newContact as CompanyContact]);
    return newContact as CompanyContact;
  };

  const updateContact = async (id: string, data: Partial<CompanyContact>) => {
    const supabase = getSupabase();
    const { error } = await supabase.from('v2_company_contacts').update(data).eq('id', id);
    if (error) { console.error(error); return; }
    setContacts(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
  };

  const deleteContact = async (id: string) => {
    const supabase = getSupabase();
    const { error } = await supabase.from('v2_company_contacts').delete().eq('id', id);
    if (error) { console.error(error); return; }
    setContacts(prev => prev.filter(c => c.id !== id));
  };

  // Relations CRUD
  const addRelation = async (fromId: string, toId: string, type: RelationType, description?: string) => {
    if (!user) return null;
    const supabase = getSupabase();
    const { data: newRel, error } = await supabase.from('v2_company_relations').insert({ from_company_id: fromId, to_company_id: toId, relation_type: type, description, user_id: user.id }).select().single();
    if (error) { console.error(error); return null; }
    setRelations(prev => [...prev, newRel as CompanyRelation]);
    return newRel as CompanyRelation;
  };

  const deleteRelation = async (id: string) => {
    const supabase = getSupabase();
    const { error } = await supabase.from('v2_company_relations').delete().eq('id', id);
    if (error) { console.error(error); return; }
    setRelations(prev => prev.filter(r => r.id !== id));
  };

  // Timeline CRUD
  const addTimelineEntry = async (companyId: string, type: TimelineEntryType, title?: string, content?: string, contactId?: string) => {
    if (!user) return null;
    const supabase = getSupabase();
    const { data: entry, error } = await supabase.from('v2_company_timeline').insert({
      company_id: companyId, entry_type: type, title, content, contact_id: contactId || null, user_id: user.id
    }).select().single();
    if (error) { console.error(error); return null; }
    const e = entry as TimelineEntry;
    setTimeline(prev => [e, ...prev]);
    await supabase.from('v2_companies').update({ updated_at: new Date().toISOString() }).eq('id', companyId);
    setCompanies(prev => prev.map(c => c.id === companyId ? { ...c, updated_at: new Date().toISOString() } : c));
    return e;
  };

  const deleteTimelineEntry = async (id: string) => {
    const supabase = getSupabase();
    const { error } = await supabase.from('v2_company_timeline').delete().eq('id', id);
    if (error) { console.error(error); return; }
    setTimeline(prev => prev.filter(t => t.id !== id));
  };

  // Tags CRUD
  const addTag = async (name: string, color?: string) => {
    if (!user) return null;
    const supabase = getSupabase();
    const { data: tag, error } = await supabase.from('v2_company_tags').insert({ name, color: color || '#6366f1', user_id: user.id }).select().single();
    if (error) { console.error(error); return null; }
    setTags(prev => [...prev, tag as CompanyTag]);
    return tag as CompanyTag;
  };

  const deleteTag = async (id: string) => {
    const supabase = getSupabase();
    const { error } = await supabase.from('v2_company_tags').delete().eq('id', id);
    if (error) { console.error(error); return; }
    setTags(prev => prev.filter(t => t.id !== id));
    setTagAssignments(prev => prev.filter(a => a.tag_id !== id));
  };

  const assignTag = async (companyId: string, tagId: string) => {
    if (!user) return;
    const supabase = getSupabase();
    const { data, error } = await supabase.from('v2_company_tag_assignments').insert({ company_id: companyId, tag_id: tagId, user_id: user.id }).select().single();
    if (error) { console.error(error); return; }
    setTagAssignments(prev => [...prev, data as CompanyTagAssignment]);
  };

  const unassignTag = async (companyId: string, tagId: string) => {
    const supabase = getSupabase();
    const { error } = await supabase.from('v2_company_tag_assignments').delete().eq('company_id', companyId).eq('tag_id', tagId);
    if (error) { console.error(error); return; }
    setTagAssignments(prev => prev.filter(a => !(a.company_id === companyId && a.tag_id === tagId)));
  };

  // Todos CRUD
  const addTodo = async (companyId: string, title: string, dueDate?: string) => {
    if (!user) return null;
    const supabase = getSupabase();
    const { data: todo, error } = await supabase.from('v2_company_todos').insert({
      company_id: companyId, title, due_date: dueDate || null, user_id: user.id
    }).select().single();
    if (error) { console.error(error); return null; }
    setTodos(prev => [todo as CompanyTodo, ...prev]);
    return todo as CompanyTodo;
  };

  const updateTodo = async (id: string, data: Partial<CompanyTodo>) => {
    const supabase = getSupabase();
    const { error } = await supabase.from('v2_company_todos').update(data).eq('id', id);
    if (error) { console.error(error); return; }
    setTodos(prev => prev.map(t => t.id === id ? { ...t, ...data } : t));
  };

  const deleteTodo = async (id: string) => {
    const supabase = getSupabase();
    const { error } = await supabase.from('v2_company_todos').delete().eq('id', id);
    if (error) { console.error(error); return; }
    setTodos(prev => prev.filter(t => t.id !== id));
  };

  // Links CRUD
  const addLink = async (companyId: string, title: string, url: string, linkType?: string) => {
    if (!user) return null;
    const supabase = getSupabase();
    const { data: link, error } = await supabase.from('v2_company_links').insert({
      company_id: companyId, title, url, link_type: linkType || 'link', user_id: user.id
    }).select().single();
    if (error) { console.error(error); return null; }
    setLinks(prev => [link as CompanyLink, ...prev]);
    return link as CompanyLink;
  };

  const deleteLink = async (id: string) => {
    const supabase = getSupabase();
    const { error } = await supabase.from('v2_company_links').delete().eq('id', id);
    if (error) { console.error(error); return; }
    setLinks(prev => prev.filter(l => l.id !== id));
  };

  // Status CRUD
  const addStatus = async (name: string, color?: string) => {
    if (!user) return null;
    const supabase = getSupabase();
    const maxOrder = statuses.length > 0 ? Math.max(...statuses.map(s => s.order_index)) + 1 : 0;
    const key = name.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
    const { data: s, error } = await supabase.from('v2_company_statuses').insert({
      name, color: color || '#64748b', order_index: maxOrder, key, user_id: user.id
    }).select().single();
    if (error) { console.error(error); return null; }
    setStatuses(prev => [...prev, s as CompanyStatus]);
    return s as CompanyStatus;
  };

  const updateStatus = async (id: string, data: Partial<CompanyStatus>) => {
    const supabase = getSupabase();
    const { error } = await supabase.from('v2_company_statuses').update(data).eq('id', id);
    if (error) { console.error(error); return; }
    setStatuses(prev => prev.map(s => s.id === id ? { ...s, ...data } : s));
  };

  const deleteStatus = async (id: string) => {
    const supabase = getSupabase();
    const { error } = await supabase.from('v2_company_statuses').delete().eq('id', id);
    if (error) { console.error(error); return; }
    setStatuses(prev => prev.filter(s => s.id !== id));
  };

  // Helpers
  const getCompanyContacts = (companyId: string) => contacts.filter(c => c.company_id === companyId);
  const getCompanyTimeline = (companyId: string) => timeline.filter(t => t.company_id === companyId);
  const getCompanyTags = (companyId: string) => {
    const assignedIds = tagAssignments.filter(a => a.company_id === companyId).map(a => a.tag_id);
    return tags.filter(t => assignedIds.includes(t.id));
  };
  const getCompanyTodos = (companyId: string) => todos.filter(t => t.company_id === companyId);
  const getCompanyLinks = (companyId: string) => links.filter(l => l.company_id === companyId);
  
  const getStatusConfig = (statusKey: string): { name: string; color: string } => {
    const found = statuses.find(s => s.key === statusKey);
    if (found) return { name: found.name, color: found.color };
    const def = DEFAULT_STATUSES.find(s => s.key === statusKey);
    if (def) return { name: def.name, color: def.color };
    return { name: statusKey, color: '#64748b' };
  };
  
  const getCompanyRelations = (companyId: string) => {
    return relations
      .filter(r => r.from_company_id === companyId || r.to_company_id === companyId)
      .map(r => {
        const otherId = r.from_company_id === companyId ? r.to_company_id : r.from_company_id;
        const otherCompany = companies.find(c => c.id === otherId);
        return otherCompany ? { relation: r, company: otherCompany } : null;
      })
      .filter(Boolean) as { relation: CompanyRelation; company: Company }[];
  };

  return (
    <BusinessV2Context.Provider value={{
      companies, categories, contacts, relations, timeline, tags, tagAssignments, todos, links, statuses, loading,
      addCompany, updateCompany, deleteCompany,
      addCategory, updateCategory, deleteCategory,
      addContact, updateContact, deleteContact,
      addRelation, deleteRelation,
      addTimelineEntry, deleteTimelineEntry,
      addTag, deleteTag, assignTag, unassignTag,
      addTodo, updateTodo, deleteTodo,
      addLink, deleteLink,
      addStatus, updateStatus, deleteStatus,
      getCompanyContacts, getCompanyRelations, getCompanyTimeline, getCompanyTags, getCompanyTodos, getCompanyLinks,
      getStatusConfig,
      refresh,
    }}>
      {children}
    </BusinessV2Context.Provider>
  );
}

export function useBusinessV2() {
  const context = useContext(BusinessV2Context);
  if (!context) throw new Error('useBusinessV2 must be used within BusinessV2Provider');
  return context;
}
