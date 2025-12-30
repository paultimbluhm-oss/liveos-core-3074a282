import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { HandCoins, ChevronDown, Check, Trash2, ArrowUpRight, ArrowDownLeft, Clock } from 'lucide-react';
import { useAuth, getSupabase } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format, isPast } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { AddLoanDialog } from './AddLoanDialog';

interface Account {
  id: string;
  name: string;
  account_type: string;
  balance: number;
}

interface Loan {
  id: string;
  person_name: string;
  amount: number;
  loan_type: 'lent' | 'borrowed';
  description: string | null;
  loan_date: string;
  due_date: string | null;
  is_returned: boolean;
  returned_date: string | null;
  source_account_id: string | null;
  return_account_id: string | null;
}

interface LoansSectionProps {
  onRefresh: () => void;
  accounts?: Account[];
}

export function LoansSection({ onRefresh, accounts: propAccounts }: LoansSectionProps) {
  const { user } = useAuth();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [accounts, setAccounts] = useState<Account[]>(propAccounts || []);
  const [open, setOpen] = useState(false);
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [returnAccountId, setReturnAccountId] = useState<string>('');

  const fetchLoans = async () => {
    if (!user) return;
    const supabase = getSupabase();
    const { data } = await supabase
      .from('loans')
      .select('*')
      .eq('user_id', user.id)
      .order('is_returned', { ascending: true })
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('loan_date', { ascending: false });
    
    if (data) setLoans(data as Loan[]);
  };

  const fetchAccounts = async () => {
    if (!user) return;
    const supabase = getSupabase();
    const { data } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', user.id)
      .order('name');
    if (data) setAccounts(data);
  };

  useEffect(() => {
    fetchLoans();
    if (!propAccounts) {
      fetchAccounts();
    }
  }, [user, propAccounts]);

  useEffect(() => {
    if (propAccounts) {
      setAccounts(propAccounts);
    }
  }, [propAccounts]);

  const openReturnDialog = (loan: Loan) => {
    setSelectedLoan(loan);
    setReturnAccountId(loan.source_account_id || '');
    setReturnDialogOpen(true);
  };

  const markAsReturned = async () => {
    if (!selectedLoan || !user) return;

    const supabase = getSupabase();
    const today = new Date().toISOString().split('T')[0];

    // If we have an account selected, update the balance first
    if (returnAccountId) {
      const account = accounts.find(a => a.id === returnAccountId);
      if (account) {
        if (selectedLoan.loan_type === 'lent') {
          // Money was lent out and is now returned - add to account
          await supabase
            .from('accounts')
            .update({ balance: (account.balance || 0) + selectedLoan.amount })
            .eq('id', returnAccountId);

          await supabase.from('transactions').insert({
            user_id: user.id,
            account_id: returnAccountId,
            transaction_type: 'income',
            amount: selectedLoan.amount,
            description: `Rückzahlung von ${selectedLoan.person_name}`,
            category: 'Rückzahlung',
            date: today,
          });
        } else {
          // Money was borrowed and is now returned - deduct from account
          await supabase
            .from('accounts')
            .update({ balance: (account.balance || 0) - selectedLoan.amount })
            .eq('id', returnAccountId);

          await supabase.from('transactions').insert({
            user_id: user.id,
            account_id: returnAccountId,
            transaction_type: 'expense',
            amount: selectedLoan.amount,
            description: `Rückzahlung an ${selectedLoan.person_name}`,
            category: 'Rückzahlung',
            date: today,
          });
        }
      }
    }

    // Delete the loan instead of marking as returned
    const { error } = await supabase
      .from('loans')
      .delete()
      .eq('id', selectedLoan.id);
    
    if (error) {
      toast.error('Fehler beim Löschen');
      return;
    }

    toast.success(selectedLoan.loan_type === 'lent' ? 'Geld zurückerhalten!' : 'Geld zurückgezahlt!');
    setReturnDialogOpen(false);
    setSelectedLoan(null);
    setReturnAccountId('');
    fetchLoans();
    onRefresh();
  };

  const deleteLoan = async (id: string) => {
    if (!confirm('Eintrag wirklich löschen? Der Kontostand wird wiederhergestellt.')) return;
    
    const supabase = getSupabase();
    const loan = loans.find(l => l.id === id);
    
    // Reverse the initial transaction if applicable
    if (loan && loan.source_account_id && !loan.is_returned) {
      const account = accounts.find(a => a.id === loan.source_account_id);
      if (account) {
        if (loan.loan_type === 'lent') {
          // Money was deducted when lending, add it back
          await supabase
            .from('accounts')
            .update({ balance: (account.balance || 0) + loan.amount })
            .eq('id', loan.source_account_id);
        } else {
          // Money was added when borrowing, deduct it
          await supabase
            .from('accounts')
            .update({ balance: (account.balance || 0) - loan.amount })
            .eq('id', loan.source_account_id);
        }
      }
    }
    
    const { error } = await supabase.from('loans').delete().eq('id', id);
    
    if (error) {
      toast.error('Fehler beim Löschen');
    } else {
      toast.success('Eintrag gelöscht, Kontostand wiederhergestellt');
      fetchLoans();
      onRefresh();
    }
  };

  const formatCurrency = (value: number) => 
    value.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });

  // Only show loans that are not returned (returned ones are now deleted)
  const activeLoans = loans.filter(l => !l.is_returned);
  const lentTotal = activeLoans.filter(l => l.loan_type === 'lent').reduce((sum, l) => sum + l.amount, 0);
  const borrowedTotal = activeLoans.filter(l => l.loan_type === 'borrowed').reduce((sum, l) => sum + l.amount, 0);
  const netBalance = lentTotal - borrowedTotal;

  // Don't render if there are no active loans
  if (activeLoans.length === 0) {
    return (
      <div className="flex items-center justify-between p-2 bg-card/30 rounded-lg border border-border/30">
        <div className="flex items-center gap-2">
          <HandCoins className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Keine offenen Kredite</span>
        </div>
        <AddLoanDialog onLoanAdded={fetchLoans} accounts={accounts} />
      </div>
    );
  }

  return (
    <>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <div className="group relative overflow-hidden rounded-xl bg-card/80 backdrop-blur-sm border border-border/50 p-4 cursor-pointer hover:border-primary/30 transition-all">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 opacity-5" />
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500">
                  <HandCoins className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold">Verliehen & Geliehen</h3>
                  <p className="text-xs text-muted-foreground">{activeLoans.length} offen</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className={cn(
                    "font-bold text-lg",
                    netBalance > 0 ? "text-success" : netBalance < 0 ? "text-destructive" : ""
                  )}>
                    {netBalance > 0 ? '+' : ''}{formatCurrency(netBalance)}
                  </span>
                  <p className="text-xs text-muted-foreground">Netto</p>
                </div>
                <ChevronDown className={cn(
                  "w-5 h-5 text-muted-foreground transition-transform duration-200",
                  open && "rotate-180"
                )} />
              </div>
            </div>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3 space-y-3">
          <div className="flex justify-between items-center">
            <div className="flex gap-4 text-sm">
              <span className="text-success">Verliehen: {formatCurrency(lentTotal)}</span>
              <span className="text-destructive">Geliehen: {formatCurrency(borrowedTotal)}</span>
            </div>
            <AddLoanDialog onLoanAdded={fetchLoans} accounts={accounts} />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {loans.map((loan) => {
              const isOverdue = loan.due_date && isPast(new Date(loan.due_date)) && !loan.is_returned;
              const sourceAccount = accounts.find(a => a.id === loan.source_account_id);
              
              return (
                <Card key={loan.id} className={cn(
                  "glass-card relative overflow-hidden",
                  loan.is_returned && "opacity-60"
                )}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {loan.loan_type === 'lent' ? (
                          <ArrowUpRight className="w-4 h-4 text-success" />
                        ) : (
                          <ArrowDownLeft className="w-4 h-4 text-destructive" />
                        )}
                        <span className="font-medium">{loan.person_name}</span>
                      </div>
                      <Badge variant={loan.is_returned ? "secondary" : loan.loan_type === 'lent' ? "default" : "destructive"}>
                        {loan.is_returned ? 'Erledigt' : loan.loan_type === 'lent' ? 'Verliehen' : 'Geliehen'}
                      </Badge>
                    </div>
                    
                    <p className={cn(
                      "text-xl font-bold mb-2",
                      loan.loan_type === 'lent' ? "text-success" : "text-destructive"
                    )}>
                      {loan.loan_type === 'lent' ? '+' : '-'}{formatCurrency(loan.amount)}
                    </p>

                    {sourceAccount && (
                      <p className="text-xs text-muted-foreground mb-1">
                        {loan.loan_type === 'lent' ? 'Von: ' : 'Auf: '}{sourceAccount.name}
                      </p>
                    )}
                    
                    {loan.description && (
                      <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{loan.description}</p>
                    )}
                    
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                      <span>{format(new Date(loan.loan_date), 'dd.MM.yyyy', { locale: de })}</span>
                      {loan.due_date && (
                        <span className={cn("flex items-center gap-1", isOverdue && "text-destructive")}>
                          <Clock className="w-3 h-3" />
                          Fällig: {format(new Date(loan.due_date), 'dd.MM.yyyy', { locale: de })}
                        </span>
                      )}
                    </div>
                    
                    {!loan.is_returned && (
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="flex-1" onClick={() => openReturnDialog(loan)}>
                          <Check className="w-3 h-3 mr-1" />
                          {loan.loan_type === 'lent' ? 'Zurückerhalten' : 'Zurückgezahlt'}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => deleteLoan(loan.id)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                    
                    {loan.is_returned && loan.returned_date && (
                      <p className="text-xs text-muted-foreground">
                        Erledigt am {format(new Date(loan.returned_date), 'dd.MM.yyyy', { locale: de })}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
          
          {loans.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <HandCoins className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Keine Einträge vorhanden</p>
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* Return Dialog */}
      <Dialog open={returnDialogOpen} onOpenChange={setReturnDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="w-5 h-5" />
              {selectedLoan?.loan_type === 'lent' ? 'Geld zurückerhalten' : 'Geld zurückgezahlt'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-secondary/30 rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Betrag</p>
              <p className="text-2xl font-bold">{selectedLoan && formatCurrency(selectedLoan.amount)}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {selectedLoan?.loan_type === 'lent' ? 'Von' : 'An'}: {selectedLoan?.person_name}
              </p>
            </div>

            <div className="space-y-2">
              <Label>
                {selectedLoan?.loan_type === 'lent' 
                  ? 'Auf welches Konto wurde das Geld zurückgezahlt?' 
                  : 'Von welchem Konto wurde das Geld zurückgezahlt?'}
              </Label>
              <Select value={returnAccountId} onValueChange={setReturnAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Konto wählen" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name} ({acc.balance?.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {selectedLoan?.loan_type === 'lent' 
                  ? 'Das Geld wird diesem Konto gutgeschrieben' 
                  : 'Das Geld wird von diesem Konto abgezogen'}
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setReturnDialogOpen(false)}>
                Abbrechen
              </Button>
              <Button onClick={markAsReturned}>
                <Check className="w-4 h-4 mr-2" />
                Bestätigen
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}