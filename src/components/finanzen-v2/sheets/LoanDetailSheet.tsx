import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useAuth, getSupabase } from '@/hooks/useAuth';
import { useFinanceV2, V2Loan } from '../context/FinanceV2Context';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { ArrowUpRight, ArrowDownRight, Check, Trash2, Calendar, User } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface LoanDetailSheetProps {
  loan: V2Loan | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LoanDetailSheet({ loan, open, onOpenChange }: LoanDetailSheetProps) {
  const { user } = useAuth();
  const { accounts, refreshLoans, refreshAccounts, recalculateSnapshotsFromDate } = useFinanceV2();
  const [settling, setSettling] = useState(false);
  const [showSettle, setShowSettle] = useState(false);
  const [settleAccountId, setSettleAccountId] = useState('');
  const [settleDate, setSettleDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!loan) return null;

  const formatCurrency = (value: number, currency: string = 'EUR') =>
    value.toLocaleString('de-DE', { style: 'currency', currency, maximumFractionDigits: 2 });

  const getAccountName = (id?: string) => accounts.find(a => a.id === id)?.name || '-';

  const handleSettle = async () => {
    if (!user || !loan) return;
    setSettling(true);
    const supabase = getSupabase();

    // Update loan as settled
    await supabase.from('v2_loans').update({
      is_settled: true,
      settled_date: settleDate,
      settled_account_id: settleAccountId && settleAccountId !== 'none' ? settleAccountId : null,
      updated_at: new Date().toISOString(),
    }).eq('id', loan.id);

    // Update account balance if account selected
    const targetAccountId = settleAccountId && settleAccountId !== 'none' ? settleAccountId : null;
    if (targetAccountId) {
      const account = accounts.find(a => a.id === targetAccountId);
      if (account) {
        const newBalance = loan.loan_type === 'lent'
          ? account.balance + loan.amount  // Money comes back
          : account.balance - loan.amount; // Paying back debt
        await supabase.from('v2_accounts').update({ balance: newBalance }).eq('id', targetAccountId);
      }
    }

    await Promise.all([refreshLoans(), refreshAccounts()]);
    if (targetAccountId) await recalculateSnapshotsFromDate(settleDate);

    setSettling(false);
    setShowSettle(false);
    toast.success(loan.loan_type === 'lent' ? 'Rueckzahlung verbucht' : 'Schuld beglichen');
    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (!user || !loan) return;
    setDeleting(true);
    const supabase = getSupabase();

    // Reverse account balance if it was linked and not yet settled
    if (!loan.is_settled && loan.account_id) {
      const account = accounts.find(a => a.id === loan.account_id);
      if (account) {
        const newBalance = loan.loan_type === 'lent'
          ? account.balance + loan.amount
          : account.balance - loan.amount;
        await supabase.from('v2_accounts').update({ balance: newBalance }).eq('id', loan.account_id);
      }
    }

    await supabase.from('v2_loans').delete().eq('id', loan.id);
    await Promise.all([refreshLoans(), refreshAccounts()]);

    setDeleting(false);
    setShowDelete(false);
    toast.success('Eintrag geloescht');
    onOpenChange(false);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-auto max-h-[80vh] rounded-t-2xl">
          <SheetHeader className="pb-4">
            <SheetTitle className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                loan.loan_type === 'lent' ? 'bg-amber-500/20' : 'bg-violet-500/20'
              }`}>
                {loan.loan_type === 'lent'
                  ? <ArrowUpRight className="w-4 h-4 text-amber-500" />
                  : <ArrowDownRight className="w-4 h-4 text-violet-500" />
                }
              </div>
              {loan.loan_type === 'lent' ? 'Verliehen' : 'Geliehen'}
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-4 pb-6">
            {/* Amount */}
            <div className="rounded-2xl bg-card border border-border p-4 text-center">
              <p className="text-3xl font-bold">{formatCurrency(loan.amount, loan.currency)}</p>
              {loan.is_settled && (
                <span className="inline-flex items-center gap-1 mt-2 text-xs bg-emerald-500/20 text-emerald-500 px-2 py-1 rounded-full">
                  <Check className="w-3 h-3" /> Beglichen
                </span>
              )}
            </div>

            {/* Details */}
            <div className="rounded-2xl bg-card border border-border divide-y divide-border">
              <div className="flex items-center gap-3 p-3">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Person</span>
                <span className="ml-auto text-sm font-medium">{loan.person_name}</span>
              </div>
              <div className="flex items-center gap-3 p-3">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Datum</span>
                <span className="ml-auto text-sm font-medium">
                  {format(new Date(loan.date), 'dd.MM.yyyy', { locale: de })}
                </span>
              </div>
              {loan.account_id && (
                <div className="flex items-center gap-3 p-3">
                  <span className="text-sm text-muted-foreground">
                    {loan.loan_type === 'lent' ? 'Von Konto' : 'Auf Konto'}
                  </span>
                  <span className="ml-auto text-sm font-medium">{getAccountName(loan.account_id)}</span>
                </div>
              )}
              {loan.note && (
                <div className="p-3">
                  <p className="text-xs text-muted-foreground mb-1">Notiz</p>
                  <p className="text-sm">{loan.note}</p>
                </div>
              )}
              {loan.is_settled && loan.settled_date && (
                <div className="flex items-center gap-3 p-3">
                  <span className="text-sm text-muted-foreground">Beglichen am</span>
                  <span className="ml-auto text-sm font-medium">
                    {format(new Date(loan.settled_date), 'dd.MM.yyyy', { locale: de })}
                  </span>
                </div>
              )}
              {loan.is_settled && loan.settled_account_id && (
                <div className="flex items-center gap-3 p-3">
                  <span className="text-sm text-muted-foreground">
                    {loan.loan_type === 'lent' ? 'Zurueck auf' : 'Bezahlt von'}
                  </span>
                  <span className="ml-auto text-sm font-medium">{getAccountName(loan.settled_account_id)}</span>
                </div>
              )}
            </div>

            {/* Settle Section */}
            {!loan.is_settled && !showSettle && (
              <Button onClick={() => setShowSettle(true)} className="w-full rounded-xl h-12">
                <Check className="w-4 h-4 mr-2" />
                {loan.loan_type === 'lent' ? 'Rueckzahlung erhalten' : 'Schuld begleichen'}
              </Button>
            )}

            {!loan.is_settled && showSettle && (
              <div className="rounded-2xl bg-card border border-border p-4 space-y-3">
                <p className="text-sm font-medium">
                  {loan.loan_type === 'lent' ? 'Auf welches Konto?' : 'Von welchem Konto?'}
                </p>
                <div className="space-y-2">
                  <Label>Konto</Label>
                  <Select value={settleAccountId} onValueChange={setSettleAccountId}>
                    <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Kein Konto</SelectItem>
                      {accounts.map(acc => (
                        <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Datum</Label>
                  <Input type="date" value={settleDate} onChange={(e) => setSettleDate(e.target.value)} />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setShowSettle(false)} className="flex-1 rounded-xl">
                    Abbrechen
                  </Button>
                  <Button onClick={handleSettle} disabled={settling} className="flex-1 rounded-xl">
                    {settling ? 'Verbuche...' : 'Bestaetigen'}
                  </Button>
                </div>
              </div>
            )}

            {/* Delete */}
            <Button
              variant="ghost"
              onClick={() => setShowDelete(true)}
              className="w-full rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Loeschen
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Eintrag loeschen?</AlertDialogTitle>
            <AlertDialogDescription>
              {!loan.is_settled && loan.account_id
                ? 'Der Kontostand wird entsprechend korrigiert.'
                : 'Diese Aktion kann nicht rueckgaengig gemacht werden.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="rounded-xl bg-destructive hover:bg-destructive/90">
              {deleting ? 'Loesche...' : 'Loeschen'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
