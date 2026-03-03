import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth, getSupabase } from '@/hooks/useAuth';
import { useFinanceV2 } from '../context/FinanceV2Context';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Friend {
  user_id: string;
  display_name: string | null;
  username: string | null;
}

interface AddLoanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddLoanDialog({ open, onOpenChange }: AddLoanDialogProps) {
  const { user } = useAuth();
  const { accounts, refreshLoans, refreshAccounts, recalculateSnapshotsFromDate } = useFinanceV2();
  const [loading, setLoading] = useState(false);
  const [loanType, setLoanType] = useState<'lent' | 'borrowed'>('lent');
  const [personName, setPersonName] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [accountId, setAccountId] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [note, setNote] = useState('');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriendId, setSelectedFriendId] = useState<string>('');

  useEffect(() => {
    if (!open || !user) return;
    // Fetch accepted friends
    const fetchFriends = async () => {
      const { data: friendships } = await supabase
        .from('friendships')
        .select('requester_id, addressee_id')
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
        .eq('status', 'accepted');

      if (!friendships?.length) return;

      const friendIds = friendships.map(f => f.requester_id === user.id ? f.addressee_id : f.requester_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, username')
        .in('user_id', friendIds);

      setFriends(profiles || []);
    };
    fetchFriends();
  }, [open, user]);

  const handleFriendSelect = (friendUserId: string) => {
    if (friendUserId === 'none') {
      setSelectedFriendId('');
      return;
    }
    setSelectedFriendId(friendUserId);
    const friend = friends.find(f => f.user_id === friendUserId);
    if (friend) {
      setPersonName(friend.display_name || friend.username || '');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !personName || !amount) return;

    setLoading(true);
    const supabase = getSupabase();
    const amountNum = parseFloat(amount);

    const { error } = await supabase.from('v2_loans').insert({
      user_id: user.id,
      loan_type: loanType,
      person_name: personName.trim(),
      amount: amountNum,
      currency,
      account_id: accountId || null,
      date,
      note: note.trim() || null,
      friend_user_id: selectedFriendId || null,
    });

    if (error) {
      setLoading(false);
      toast.error('Fehler beim Erstellen');
      console.error(error);
      return;
    }

    // Update account balance if account selected
    if (accountId) {
      const account = accounts.find(a => a.id === accountId);
      if (account) {
        const newBalance = loanType === 'lent'
          ? account.balance - amountNum
          : account.balance + amountNum;
        await supabase.from('v2_accounts').update({ balance: newBalance }).eq('id', accountId);
      }
    }

    await Promise.all([refreshLoans(), refreshAccounts()]);
    if (accountId) await recalculateSnapshotsFromDate(date);

    setLoading(false);
    toast.success(loanType === 'lent' ? 'Verleih erstellt' : 'Schuld erstellt');
    onOpenChange(false);
    setPersonName('');
    setAmount('');
    setNote('');
    setAccountId('');
    setSelectedFriendId('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Geld verleihen / leihen</DialogTitle>
        </DialogHeader>

        {/* Type Toggle */}
        <div className="flex gap-2 p-1 bg-secondary/50 rounded-xl">
          <button
            type="button"
            onClick={() => setLoanType('lent')}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
              loanType === 'lent' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
            }`}
          >
            Verliehen
          </button>
          <button
            type="button"
            onClick={() => setLoanType('borrowed')}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
              loanType === 'borrowed' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
            }`}
          >
            Geliehen
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Friend select */}
          {friends.length > 0 && (
            <div className="space-y-2">
              <Label>Freund verknuepfen</Label>
              <Select value={selectedFriendId || 'none'} onValueChange={handleFriendSelect}>
                <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Kein Freund</SelectItem>
                  {friends.map(f => (
                    <SelectItem key={f.user_id} value={f.user_id}>
                      {f.display_name || f.username || 'Unbekannt'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Person</Label>
            <Input
              value={personName}
              onChange={(e) => setPersonName(e.target.value)}
              placeholder="Name der Person"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Betrag</Label>
              <Input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Waehrung</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Datum</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>{loanType === 'lent' ? 'Von Konto' : 'Auf Konto'}</Label>
            <Select value={accountId} onValueChange={setAccountId}>
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
            <Label>Notiz</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional..."
              rows={2}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading || !personName || !amount}>
            {loading ? 'Erstelle...' : 'Erstellen'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
