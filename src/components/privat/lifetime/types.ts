import { Moon, Utensils, Home, Users, Sparkles, Monitor, Dumbbell, BookOpen, Clock, Settings, Heart } from 'lucide-react';

export interface TimeEntry {
  id: string;
  category: string;
  minutes: number;
  entry_date: string;
  notes: string | null;
}

export interface LifetimeGoal {
  id: string;
  user_id: string;
  category: string;
  target_minutes: number;
  day_of_week: number | null;
  created_at: string;
  updated_at: string;
}

export const CATEGORIES = [
  { id: 'schlafen', label: 'Schlafen', icon: Moon, color: '#6366f1' },
  { id: 'essen', label: 'Essen', icon: Utensils, color: '#f59e0b' },
  { id: 'familie', label: 'Familie', icon: Home, color: '#ec4899' },
  { id: 'freunde', label: 'Freunde', icon: Users, color: '#8b5cf6' },
  { id: 'hygiene', label: 'Hygiene', icon: Sparkles, color: '#06b6d4' },
  { id: 'youtube', label: 'YouTube', icon: Monitor, color: '#ef4444' },
  { id: 'liveos', label: 'LiveOS', icon: Monitor, color: '#3b82f6' },
  { id: 'optimieren', label: 'Optimieren', icon: Settings, color: '#22c55e' },
  { id: 'sport', label: 'Sport', icon: Dumbbell, color: '#14b8a6' },
  { id: 'lernen', label: 'Lernen', icon: BookOpen, color: '#a855f7' },
  { id: 'aufraeumen', label: 'Aufräumen', icon: Home, color: '#f97316' },
  { id: 'gesundheit', label: 'Gesundheit', icon: Heart, color: '#ef4444' },
  { id: 'sonstiges', label: 'Sonstiges', icon: Clock, color: '#64748b' },
] as const;

export const TIME_OPTIONS = [
  { value: '0', label: '-' },
  { value: '15', label: '15m' },
  { value: '30', label: '30m' },
  { value: '45', label: '45m' },
  { value: '60', label: '1h' },
  { value: '90', label: '1h 30m' },
  { value: '120', label: '2h' },
  { value: '150', label: '2h 30m' },
  { value: '180', label: '3h' },
  { value: '240', label: '4h' },
  { value: '300', label: '5h' },
  { value: '360', label: '6h' },
  { value: '420', label: '7h' },
  { value: '480', label: '8h' },
  { value: '540', label: '9h' },
  { value: '600', label: '10h' },
];

export const WEEKDAYS = [
  { value: 0, label: 'So' },
  { value: 1, label: 'Mo' },
  { value: 2, label: 'Di' },
  { value: 3, label: 'Mi' },
  { value: 4, label: 'Do' },
  { value: 5, label: 'Fr' },
  { value: 6, label: 'Sa' },
];

export function formatTime(minutes: number): string {
  if (minutes === 0) return '-';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
