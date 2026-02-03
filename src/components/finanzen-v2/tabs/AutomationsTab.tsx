import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, RefreshCw, Calendar, ArrowUpRight, ArrowDownRight, ArrowLeftRight, TrendingUp, Settings, Trash2 } from 'lucide-react';
import { useFinanceV2, V2Automation } from '../context/FinanceV2Context';
import { AddAutomationDialog } from '../dialogs/AddAutomationDialog';
import { format, addDays, addWeeks, addMonths, addYears } from 'date-fns';
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

const automationTypeIcons: Record<string, React.ReactNode> = {
  income: <ArrowUpRight className="w-4 h-4 text-emerald-500" />,
  expense: <ArrowDownRight className="w-4 h-4 text-rose-500" />,
  transfer: <ArrowLeftRight className="w-4 h-4 text-blue-500" />,
  investment: <TrendingUp className="w-4 h-4 text-purple-500" />,
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
    // Calculate next execution
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
    <div className="space-y-4">
      {/* Monthly Summary */}
      <Card className="bg-gradient-to-br from-violet-500/10 to-violet-500/5">
        <CardContent className="pt-6 pb-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-1">Monatliche Automationen</p>
            <div className="flex justify-center gap-6 mt-2">
              <div>
                <p className="text-xs text-muted-foreground">Einnahmen</p>
                <p className="text-lg font-semibold text-emerald-600">{formatCurrency(monthlyTotals.income)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Ausgaben</p>
                <p className="text-lg font-semibold text-rose-600">{formatCurrency(monthlyTotals.expenses)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Netto</p>
                <p className={`text-lg font-semibold ${monthlyTotals.difference >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {monthlyTotals.difference >= 0 ? '+' : ''}{formatCurrency(monthlyTotals.difference)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Button */}
      <Button 
        onClick={() => setShowAddDialog(true)} 
        className="w-full"
        variant="outline"
      >
        <Plus className="w-4 h-4 mr-2" />
        Neue Automation
      </Button>

      {/* Automations by Type */}
      {Object.entries(groupedAutomations).map(([type, autos]) => (
        <Card key={type}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              {automationTypeIcons[type]}
              {automationTypeLabels[type]}n
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {autos.map(auto => (
              <div 
                key={auto.id} 
                className={`flex items-center justify-between py-3 px-3 rounded-lg border transition-colors ${!auto.is_active ? 'opacity-50' : ''}`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{auto.name}</p>
                    {!auto.is_active && (
                      <span className="text-xs bg-muted px-1.5 py-0.5 rounded">Pausiert</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {intervalLabels[auto.interval_type]} am {auto.interval_type === 'weekly' ? ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'][auto.execution_day] : `${auto.execution_day}.`}
                    {' • '}
                    {type === 'transfer' 
                      ? `${getAccountName(auto.account_id)} → ${getAccountName(auto.to_account_id)}`
                      : type === 'investment'
                        ? `${getAccountName(auto.account_id)} → ${getInvestmentName(auto.investment_id)}`
                        : getAccountName(auto.account_id)
                    }
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <Calendar className="w-3 h-3" />
                    Nächste: {getNextExecution(auto)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`font-semibold ${type === 'income' ? 'text-emerald-600' : type === 'expense' ? 'text-rose-600' : ''}`}>
                    {formatCurrency(auto.amount, auto.currency)}
                  </span>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => setDeleteAutomation(auto)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      {automations.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <RefreshCw className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground">Noch keine Automationen</p>
            <p className="text-sm text-muted-foreground mt-1">Richte wiederkehrende Buchungen ein</p>
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <AddAutomationDialog 
        open={showAddDialog} 
        onOpenChange={setShowAddDialog} 
      />

      <AlertDialog open={!!deleteAutomation} onOpenChange={(open) => !open && setDeleteAutomation(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Automation löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchtest du "{deleteAutomation?.name}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Lösche...' : 'Löschen'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
