import { Tables } from '@/integrations/supabase/types';

export type Order = Tables<'orders'> & {
  contact?: Tables<'contacts'> | null;
};

export type OrderExpense = Tables<'order_expenses'>;
export type OrderTimeEntry = Tables<'order_time_entries'>;

export type OrderStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type OrderPriority = 'low' | 'medium' | 'high';

export const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; bgColor: string }> = {
  pending: { label: 'Ausstehend', color: 'text-amber-400', bgColor: 'bg-amber-500/20' },
  in_progress: { label: 'In Bearbeitung', color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
  completed: { label: 'Abgeschlossen', color: 'text-emerald-400', bgColor: 'bg-emerald-500/20' },
  cancelled: { label: 'Abgebrochen', color: 'text-red-400', bgColor: 'bg-red-500/20' },
};

export const PRIORITY_CONFIG: Record<OrderPriority, { label: string; color: string }> = {
  low: { label: 'Niedrig', color: 'text-slate-400' },
  medium: { label: 'Mittel', color: 'text-amber-400' },
  high: { label: 'Hoch', color: 'text-red-400' },
};

export const STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: 'pending', label: 'Ausstehend' },
  { value: 'in_progress', label: 'In Bearbeitung' },
  { value: 'completed', label: 'Abgeschlossen' },
  { value: 'cancelled', label: 'Abgebrochen' },
];

export const PRIORITY_OPTIONS: { value: OrderPriority; label: string }[] = [
  { value: 'low', label: 'Niedrig' },
  { value: 'medium', label: 'Mittel' },
  { value: 'high', label: 'Hoch' },
];

export const EXPENSE_CATEGORIES = [
  'Material',
  'Transport',
  'Werkzeug',
  'Subunternehmer',
  'Sonstiges',
];
