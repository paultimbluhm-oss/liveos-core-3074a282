import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, RefreshCw, Calendar, ArrowUpRight, ArrowDownRight, ArrowLeftRight, TrendingUp, Trash2 } from 'lucide-react';
import { useFinanceV2, V2Automation } from '../context/FinanceV2Context';
import { AddAutomationDialog } from '../dialogs/AddAutomationDialog';
import { format, addDays, addMonths, addYears } from 'date-fns';
import { de } from 'date-fns/locale';
import { useAuth, getSupabase } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const automationTypeConfig: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  income: { 
    icon: <ArrowUpRight className="w-5 h-5" />, 
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/20'
  },
  expense: { 
    icon: <ArrowDownRight className="w-5 h-5" />, 
    color: 'text-rose-400',
    bg: 'bg-rose-500/20'
  },
  transfer: { 
    icon: <ArrowLeftRight className="w-5 h-5" />, 
    color: 'text-blue-400',
    bg: 'bg-blue-500/20'
  },
  investment: { 
    icon: <TrendingUp className="w-5 h-5" />, 
    color: 'text-violet-400',
    bg: 'bg-violet-500/20'
  },
};

const automationTypeLabels: Record<string, string> = {
  income: 'Einnahme',
  expense: 'Ausgabe',
  transfer: 'Umbuchung',
  investment: 'Investment',
};

const intervalLabels: Record<string, string> = {
  weekly: 'Wöchentlich',
  monthly: 'Monatlich',
  yearly: 'Jährlich',
};

export function AutomationsTab() {
  const { automations, accounts, investments, loading, refreshAutomations } = useFinanceV2();
  const { user } = useAuth();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [deleteAutomation, setDeleteAutomation] = useState<V2Automation | null>(null);
  const [deleting, setDeleting] = useState(false);

  const formatCurrency = (value: number, currency: string = 'EUR') => 
    value.toLocaleString('de-DE', { style: 'currency', currency, maximumFractionDigits: 2 });

  // Group automations by type
  const groupedAutomations = useMemo(() => {
    return automations.reduce((acc, auto) => {
      if (!acc[auto.automation_type]) acc[auto.automation_type] = [];
      acc[auto.automation_type].push(auto);
      return acc;
    }, {} as Record<string, V2Automation[]>);
  }, [automations]);

  // Calculate monthly totals
  const monthlyTotals = useMemo(() => {
    let income = 0;
    let expenses = 0;
    
    automations.filter(a => a.is_active).forEach(auto => {
      const monthlyAmount = auto.interval_type === 'weekly' ? auto.amount * 4.33 :
        auto.interval_type === 'yearly' ? auto.amount / 12 : auto.amount;
      
      if (auto.automation_type === 'income') income += monthlyAmount;
      if (auto.automation_type === 'expense') expenses += monthlyAmount;
    });
    
    return { income, expenses, difference: income - expenses };
  }, [automations]);

  const getAccountName = (id?: string) => {
    if (!id) return '-';
    return accounts.find(a => a.id === id)?.name || 'Unbekannt';
  };

  const getInvestmentName = (id?: string) => {
    if (!id) return '-';
    return investments.find(i => i.id === id)?.name || 'Unbekannt';
  };

  const getNextExecution = (auto: V2Automation) => {
    if (auto.next_execution_date) {
      return format(new Date(auto.next_execution_date), 'dd.MM.yyyy', { locale: de });
    }
    const today = new Date();
    let nextDate = new Date(today.getFullYear(), today.getMonth(), auto.execution_day);
    
    if (auto.interval_type === 'weekly') {
      const dayOfWeek = auto.execution_day;
      const currentDay = today.getDay();
      const daysUntilNext = (dayOfWeek - currentDay + 7) % 7 || 7;
      nextDate = addDays(today, daysUntilNext);
    } else if (auto.interval_type === 'monthly') {
      if (nextDate <= today) {
        nextDate = addMonths(nextDate, 1);
      }
    } else if (auto.interval_type === 'yearly') {
      if (nextDate <= today) {
        nextDate = addYears(nextDate, 1);
      }
    }
    
    return format(nextDate, 'dd.MM.yyyy', { locale: de });
  };

  const handleDelete = async () => {
    if (!deleteAutomation || !user) return;
    
    setDeleting(true);
    const supabase = getSupabase();
    
    const { error } = await supabase
      .from('v2_automations')
      .delete()
      .eq('id', deleteAutomation.id);
    
    setDeleting(false);
    setDeleteAutomation(null);
    
    if (error) {
      toast.error('Fehler beim Löschen');
      console.error(error);
    } else {
      toast.success('Automation gelöscht');
      await refreshAutomations();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-500 p-8 shadow-2xl">
        <div className="absolute inset-0 bg-white/10 backdrop-blur-3xl" />
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-white/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-white/10 rounded-full blur-2xl" />
        
        <div className="relative z-10 text-center">
          <p className="text-white/70 text-sm font-medium mb-4">Monatliche Automationen</p>
          
          <div className="flex justify-center gap-6">
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl px-5 py-3">
              <p className="text-white/60 text-xs">Einnahmen</p>
              <p className="text-xl font-bold text-emerald-300">{formatCurrency(monthlyTotals.income)}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl px-5 py-3">
              <p className="text-white/60 text-xs">Ausgaben</p>
              <p className="text-xl font-bold text-rose-300">{formatCurrency(monthlyTotals.expenses)}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl px-5 py-3">
              <p className="text-white/60 text-xs">Netto</p>
              <p className={`text-xl font-bold ${monthlyTotals.difference >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                {monthlyTotals.difference >= 0 ? '+' : ''}{formatCurrency(monthlyTotals.difference)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Add Button */}
      <Button 
        onClick={() => setShowAddDialog(true)} 
        className="w-full h-14 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-xl text-foreground"
        variant="ghost"
      >
        <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center mr-3">
          <Plus className="w-5 h-5 text-violet-400" />
        </div>
        Neue Automation
      </Button>

      {/* Automations by Type */}
      {Object.entries(groupedAutomations).map(([type, autos]) => {
        const config = automationTypeConfig[type] || automationTypeConfig.expense;
        
        return (
          <div key={type} className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <div className={`w-6 h-6 rounded-lg ${config.bg} flex items-center justify-center`}>
                <span className={config.color}>{config.icon}</span>
              </div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                {automationTypeLabels[type]}n
              </h3>
            </div>
            
            <div className="rounded-2xl overflow-hidden bg-white/5 backdrop-blur-xl border border-white/10">
              {autos.map((auto, index) => (
                <div 
                  key={auto.id} 
                  className={`
                    flex items-center gap-4 p-4
                    transition-all duration-200
                    ${!auto.is_active ? 'opacity-50' : ''}
                    ${index !== autos.length - 1 ? 'border-b border-white/5' : ''}
                  `}
                >
                  {/* Icon */}
                  <div className={`w-12 h-12 rounded-2xl ${config.bg} flex items-center justify-center`}>
                    <span className={config.color}>{config.icon}</span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-foreground truncate">{auto.name}</p>
                      {!auto.is_active && (
                        <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full text-muted-foreground">Pausiert</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {intervalLabels[auto.interval_type]} am {auto.interval_type === 'weekly' ? ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'][auto.execution_day] : `${auto.execution_day}.`}
                    </p>
                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      <span>Nächste: {getNextExecution(auto)}</span>
                    </div>
                  </div>

                  {/* Amount & Delete */}
                  <div className="flex items-center gap-3">
                    <span className={`font-bold text-base ${config.color}`}>
                      {formatCurrency(auto.amount, auto.currency)}
                    </span>
                    <button 
                      className="w-9 h-9 rounded-xl bg-rose-500/10 flex items-center justify-center hover:bg-rose-500/20 transition-colors"
                      onClick={() => setDeleteAutomation(auto)}
                    >
                      <Trash2 className="w-4 h-4 text-rose-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Empty State */}
      {automations.length === 0 && (
        <div className="rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 p-12 text-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center mx-auto mb-6">
            <RefreshCw className="w-10 h-10 text-violet-400" />
          </div>
          <p className="text-lg font-semibold text-foreground mb-2">Noch keine Automationen</p>
          <p className="text-sm text-muted-foreground">Richte wiederkehrende Buchungen ein</p>
        </div>
      )}

      {/* Dialogs */}
      <AddAutomationDialog 
        open={showAddDialog} 
        onOpenChange={setShowAddDialog} 
      />

      <AlertDialog open={!!deleteAutomation} onOpenChange={(open) => !open && setDeleteAutomation(null)}>
        <AlertDialogContent className="rounded-3xl border-white/10 bg-card/95 backdrop-blur-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Automation löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchtest du "{deleteAutomation?.name}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="rounded-xl bg-rose-500 hover:bg-rose-600">
              {deleting ? 'Lösche...' : 'Löschen'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
