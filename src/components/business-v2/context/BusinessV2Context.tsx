import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth, getSupabase } from '@/hooks/useAuth';
import { Company, CompanyCategory, CompanyContact, CompanyRelation, CompanyStatus, RelationType } from '../types';

interface BusinessV2ContextType {
  companies: Company[];
  categories: CompanyCategory[];
  contacts: CompanyContact[];
  relations: CompanyRelation[];
  loading: boolean;
  
  // Companies
  addCompany: (data: Omit<Company, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<Company | null>;
  updateCompany: (id: string, data: Partial<Company>) => Promise<void>;
  deleteCompany: (id: string) => Promise<void>;
  
  // Categories
  addCategory: (name: string, color?: string) => Promise<CompanyCategory | null>;
  updateCategory: (id: string, data: Partial<CompanyCategory>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  
  // Contacts
  addContact: (data: Omit<CompanyContact, 'id' | 'user_id' | 'created_at'>) => Promise<CompanyContact | null>;
  updateContact: (id: string, data: Partial<CompanyContact>) => Promise<void>;
  deleteContact: (id: string) => Promise<void>;
  
  // Relations
  addRelation: (fromId: string, toId: string, type: RelationType, description?: string) => Promise<CompanyRelation | null>;
  deleteRelation: (id: string) => Promise<void>;
  
  // Helpers
  getCompanyContacts: (companyId: string) => CompanyContact[];
  getCompanyRelations: (companyId: string) => { relation: CompanyRelation; company: Company }[];
  refresh: () => Promise<void>;
}

const BusinessV2Context = createContext<BusinessV2ContextType | undefined>(undefined);

export function BusinessV2Provider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [categories, setCategories] = useState<CompanyCategory[]>([]);
  const [contacts, setContacts] = useState<CompanyContact[]>([]);
  const [relations, setRelations] = useState<CompanyRelation[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) return;
    const supabase = getSupabase();
    
    const [companiesRes, categoriesRes, contactsRes, relationsRes] = await Promise.all([
      supabase.from('v2_companies').select('*').eq('user_id', user.id).order('name'),
      supabase.from('v2_company_categories').select('*').eq('user_id', user.id).order('order_index'),
      supabase.from('v2_company_contacts').select('*').eq('user_id', user.id).order('name'),
      supabase.from('v2_company_relations').select('*').eq('user_id', user.id),
    ]);
    
    if (companiesRes.data) setCompanies(companiesRes.data as Company[]);
    if (categoriesRes.data) setCategories(categoriesRes.data as CompanyCategory[]);
    if (contactsRes.data) setContacts(contactsRes.data as CompanyContact[]);
    if (relationsRes.data) setRelations(relationsRes.data as CompanyRelation[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Companies CRUD
  const addCompany = async (data: Omit<Company, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return null;
    const supabase = getSupabase();
    const { data: newCompany, error } = await supabase
      .from('v2_companies')
      .insert({ ...data, user_id: user.id })
      .select()
      .single();
    if (error) { console.error(error); return null; }
    setCompanies(prev => [...prev, newCompany as Company].sort((a, b) => a.name.localeCompare(b.name)));
    return newCompany as Company;
  };

  const updateCompany = async (id: string, data: Partial<Company>) => {
    const supabase = getSupabase();
    const { error } = await supabase.from('v2_companies').update(data).eq('id', id);
    if (error) { console.error(error); return; }
    setCompanies(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
  };

  const deleteCompany = async (id: string) => {
    const supabase = getSupabase();
    const { error } = await supabase.from('v2_companies').delete().eq('id', id);
    if (error) { console.error(error); return; }
    setCompanies(prev => prev.filter(c => c.id !== id));
    setContacts(prev => prev.filter(c => c.company_id !== id));
    setRelations(prev => prev.filter(r => r.from_company_id !== id && r.to_company_id !== id));
  };

  // Categories CRUD
  const addCategory = async (name: string, color?: string) => {
    if (!user) return null;
    const supabase = getSupabase();
    const maxOrder = categories.length > 0 ? Math.max(...categories.map(c => c.order_index)) + 1 : 0;
    const { data: newCat, error } = await supabase
      .from('v2_company_categories')
      .insert({ name, color, order_index: maxOrder, user_id: user.id })
      .select()
      .single();
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
    const { data: newContact, error } = await supabase
      .from('v2_company_contacts')
      .insert({ ...data, user_id: user.id })
      .select()
      .single();
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
    const { data: newRel, error } = await supabase
      .from('v2_company_relations')
      .insert({ from_company_id: fromId, to_company_id: toId, relation_type: type, description, user_id: user.id })
      .select()
      .single();
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

  // Helpers
  const getCompanyContacts = (companyId: string) => contacts.filter(c => c.company_id === companyId);
  
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
      companies, categories, contacts, relations, loading,
      addCompany, updateCompany, deleteCompany,
      addCategory, updateCategory, deleteCategory,
      addContact, updateContact, deleteContact,
      addRelation, deleteRelation,
      getCompanyContacts, getCompanyRelations, refresh,
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
