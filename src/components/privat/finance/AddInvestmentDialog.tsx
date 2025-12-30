import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, Search, Check, Loader2, CalendarIcon, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabase } from '@/hooks/useAuth';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface AddInvestmentDialogProps {
  onInvestmentAdded: () => void;
}

interface SearchResult {
  symbol: string;
  name: string;
  type?: string;
  price?: number;
}

interface ExistingInvestment {
  id: string;
  name: string;
  symbol: string | null;
  investment_type: string;
  quantity: number;
  purchase_price: number;
  currency: string;
}

interface Account {
  id: string;
  name: string;
  balance: number;
}

const investmentTypes = [
  { value: 'etf', label: 'ETF' },
  { value: 'stock', label: 'Aktie' },
  { value: 'crypto', label: 'Kryptowährung' },
];

const currencies = [
  { value: 'EUR', label: '€ Euro' },
  { value: 'USD', label: '$ US-Dollar' },
];

export function AddInvestmentDialog({ onInvestmentAdded }: AddInvestmentDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'new' | 'existing'>('existing');
  
  // New investment states
  const [investmentType, setInvestmentType] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<SearchResult | null>(null);
  const [quantity, setQuantity] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  
  // Existing investment states
  const [existingInvestments, setExistingInvestments] = useState<ExistingInvestment[]>([]);
  const [selectedExisting, setSelectedExisting] = useState<ExistingInvestment | null>(null);
  const [addAmount, setAddAmount] = useState('');
  const [addDate, setAddDate] = useState<Date>(new Date());
  const [historicalPrice, setHistoricalPrice] = useState<number | null>(null);
  const [fetchingPrice, setFetchingPrice] = useState(false);
  
  // Account selection for both new and existing
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountNew, setSelectedAccountNew] = useState<string>('');
  const [selectedAccountExisting, setSelectedAccountExisting] = useState<string>('');
  
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);

  // Fetch existing investments and accounts when dialog opens
  useEffect(() => {
    if (open && user) {
      fetchExistingInvestments();
      fetchAccounts();
    }
  }, [open, user]);

  const fetchAccounts = async () => {
    if (!user) return;
    const supabaseClient = getSupabase();
    const { data } = await supabaseClient
      .from('accounts')
      .select('id, name, balance')
      .eq('user_id', user.id)
      .order('name');
    if (data) setAccounts(data);
  };

  const fetchExistingInvestments = async () => {
    if (!user) return;
    const supabase = getSupabase();
    const { data } = await supabase
      .from('investments')
      .select('*')
      .eq('user_id', user.id)
      .order('name');
    if (data) setExistingInvestments(data);
  };

  // Fetch historical price when existing investment and date are selected
  useEffect(() => {
    if (!selectedExisting || !addDate) {
      setHistoricalPrice(null);
      return;
    }

    const fetchHistoricalPrice = async () => {
      setFetchingPrice(true);
      try {
        const dateStr = format(addDate, 'dd-MM-yyyy');
        
        if (selectedExisting.investment_type === 'crypto' && selectedExisting.symbol) {
          // CoinGecko historical price
          const vsCurrency = selectedExisting.currency.toLowerCase();
          const res = await fetch(
            `https://api.coingecko.com/api/v3/coins/${selectedExisting.symbol}/history?date=${dateStr}`
          );
          const data = await res.json();
          const price = data?.market_data?.current_price?.[vsCurrency];
          if (price) {
            setHistoricalPrice(price);
          } else {
            // Fallback to current price if historical not available
            const currentRes = await fetch(
              `https://api.coingecko.com/api/v3/simple/price?ids=${selectedExisting.symbol}&vs_currencies=${vsCurrency}`
            );
            const currentData = await currentRes.json();
            setHistoricalPrice(currentData[selectedExisting.symbol]?.[vsCurrency] || null);
          }
        } else if (selectedExisting.symbol) {
          // For stocks/ETFs, use current price as approximation
          const supabaseClient = getSupabase();
          const { data } = await supabaseClient.functions.invoke('get-stock-price', {
            body: { symbol: selectedExisting.symbol, targetCurrency: selectedExisting.currency },
          });
          if (data?.price) {
            setHistoricalPrice(data.price);
          }
        }
      } catch (error) {
        console.error('Historical price fetch error:', error);
      }
      setFetchingPrice(false);
    };

    fetchHistoricalPrice();
  }, [selectedExisting, addDate]);

  // Search for assets when query changes
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2 || !investmentType) {
      setSearchResults([]);
      return;
    }

    const searchAssets = async () => {
      setSearching(true);
      try {
        if (investmentType === 'crypto') {
          const res = await fetch(
            `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(searchQuery)}`
          );
          const data = await res.json();
          const results: SearchResult[] = (data.coins || []).slice(0, 8).map((coin: any) => ({
            symbol: coin.id,
            name: coin.name,
            type: coin.symbol?.toUpperCase(),
          }));
          setSearchResults(results);
        } else {
          const supabaseClient = getSupabase();
          const { data, error } = await supabaseClient.functions.invoke('search-stocks', {
            body: { query: searchQuery },
          });
          if (!error && data?.results) {
            setSearchResults(data.results);
          }
        }
      } catch (error) {
        console.error('Search error:', error);
      }
      setSearching(false);
    };

    const debounce = setTimeout(searchAssets, 500);
    return () => clearTimeout(debounce);
  }, [searchQuery, investmentType]);

  // Fetch current price when asset is selected
  useEffect(() => {
    if (!selectedAsset) return;

    const fetchPrice = async () => {
      try {
        if (investmentType === 'crypto') {
          const vsCurrency = currency.toLowerCase();
          const res = await fetch(
            `https://api.coingecko.com/api/v3/simple/price?ids=${selectedAsset.symbol}&vs_currencies=${vsCurrency}`
          );
          const data = await res.json();
          const price = data[selectedAsset.symbol]?.[vsCurrency];
          if (price) {
            setSelectedAsset((prev) => prev ? { ...prev, price } : null);
          }
        } else {
          const supabaseClient = getSupabase();
          const { data, error } = await supabaseClient.functions.invoke('get-stock-price', {
            body: { symbol: selectedAsset.symbol, targetCurrency: currency },
          });
          if (!error && data?.price) {
            setSelectedAsset((prev) => prev ? { ...prev, price: data.price } : null);
          }
        }
      } catch (error) {
        console.error('Price fetch error:', error);
      }
    };

    fetchPrice();
  }, [selectedAsset?.symbol, investmentType, currency]);

  const handleSelectAsset = (result: SearchResult) => {
    setSelectedAsset(result);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleSubmitNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedAsset || !investmentType || !quantity || !purchasePrice) return;

    setLoading(true);
    const supabaseClient = getSupabase();
    const purchasePriceNum = parseFloat(purchasePrice);

    const { error } = await supabaseClient.from('investments').insert({
      user_id: user.id,
      name: selectedAsset.name,
      symbol: selectedAsset.symbol,
      investment_type: investmentType,
      quantity: parseFloat(quantity),
      purchase_price: purchasePriceNum,
      currency: currency,
      source_account_id: selectedAccountNew && selectedAccountNew !== 'none' ? selectedAccountNew : null,
    });

    if (error) {
      toast.error('Fehler beim Hinzufügen');
    } else {
      // Deduct from account if selected
      if (selectedAccountNew && selectedAccountNew !== 'none') {
        const account = accounts.find(a => a.id === selectedAccountNew);
        if (account) {
          await supabaseClient.from('accounts').update({
            balance: account.balance - purchasePriceNum,
          }).eq('id', selectedAccountNew);

          await supabaseClient.from('transactions').insert({
            user_id: user.id,
            account_id: selectedAccountNew,
            amount: purchasePriceNum,
            transaction_type: 'expense',
            category: 'Investment',
            description: `Investment: ${selectedAsset.name}`,
          });
        }
      }
      
      toast.success('Investment hinzugefügt');
      setOpen(false);
      resetForm();
      onInvestmentAdded();
    }
    setLoading(false);
  };

  const handleSubmitExisting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedExisting || !addAmount || !historicalPrice) return;

    setLoading(true);
    const supabaseClient = getSupabase();

    // Calculate quantity based on amount and historical price
    const amountNum = parseFloat(addAmount);
    const newQuantity = amountNum / historicalPrice;
    
    // Update existing investment
    const updatedQuantity = selectedExisting.quantity + newQuantity;
    const updatedPurchasePrice = selectedExisting.purchase_price + amountNum;

    const { error } = await supabaseClient
      .from('investments')
      .update({
        quantity: updatedQuantity,
        purchase_price: updatedPurchasePrice,
      })
      .eq('id', selectedExisting.id);

    if (error) {
      toast.error('Fehler beim Hinzufügen');
    } else {
      // Deduct from account if selected
      if (selectedAccountExisting && selectedAccountExisting !== 'none') {
        const account = accounts.find(a => a.id === selectedAccountExisting);
        if (account) {
          await supabaseClient.from('accounts').update({
            balance: account.balance - amountNum,
          }).eq('id', selectedAccountExisting);

          await supabaseClient.from('transactions').insert({
            user_id: user.id,
            account_id: selectedAccountExisting,
            amount: amountNum,
            transaction_type: 'expense',
            category: 'Investment',
            description: `Investment: ${selectedExisting.name}`,
          });
        }
      }

      toast.success(`${newQuantity.toFixed(8)} ${selectedExisting.name} hinzugefügt`);
      setOpen(false);
      resetForm();
      onInvestmentAdded();
    }
    setLoading(false);
  };

  const resetForm = () => {
    setActiveTab('existing');
    setInvestmentType('');
    setCurrency('EUR');
    setSearchQuery('');
    setSearchResults([]);
    setSelectedAsset(null);
    setQuantity('');
    setPurchasePrice('');
    setSelectedExisting(null);
    setAddAmount('');
    setAddDate(new Date());
    setHistoricalPrice(null);
    setSelectedAccountNew('');
    setSelectedAccountExisting('');
  };

  const currencySymbol = currency === 'EUR' ? '€' : '$';
  const existingCurrencySymbol = selectedExisting?.currency === 'EUR' ? '€' : '$';

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetForm();
    }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary" className="gap-1.5 h-7 px-2 text-xs">
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Investment</span>
          <span className="sm:hidden">Invest</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Investment hinzufügen</DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'new' | 'existing')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="existing" className="text-xs">Zu bestehendem</TabsTrigger>
            <TabsTrigger value="new" className="text-xs">Neues anlegen</TabsTrigger>
          </TabsList>
          
          {/* Add to existing investment */}
          <TabsContent value="existing" className="space-y-4 mt-4">
            {existingInvestments.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Keine Investments vorhanden</p>
                <Button 
                  variant="link" 
                  className="text-xs mt-2"
                  onClick={() => setActiveTab('new')}
                >
                  Erstelle dein erstes Investment
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmitExisting} className="space-y-4">
                <div className="space-y-2">
                  <Label>Investment auswählen</Label>
                  <Select 
                    value={selectedExisting?.id || ''} 
                    onValueChange={(id) => {
                      const inv = existingInvestments.find(i => i.id === id);
                      setSelectedExisting(inv || null);
                      setHistoricalPrice(null);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Investment wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {existingInvestments.map((inv) => (
                        <SelectItem key={inv.id} value={inv.id}>
                          <div className="flex items-center gap-2">
                            <span>{inv.name}</span>
                            <span className="text-xs text-muted-foreground">
                              ({inv.investment_type === 'crypto' ? 'Krypto' : inv.investment_type === 'etf' ? 'ETF' : 'Aktie'})
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedExisting && (
                  <>
                    <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-sm">
                      <div className="flex justify-between mb-1">
                        <span className="text-muted-foreground">Aktuell:</span>
                        <span className="font-medium">
                          {selectedExisting.quantity.toLocaleString('de-DE', { maximumFractionDigits: 8 })} Stück
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Investiert:</span>
                        <span className="font-medium">
                          {selectedExisting.purchase_price.toLocaleString('de-DE', {
                            style: 'currency',
                            currency: selectedExisting.currency,
                          })}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Kaufdatum</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !addDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {addDate ? format(addDate, 'PPP', { locale: de }) : 'Datum wählen'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={addDate}
                            onSelect={(date) => date && setAddDate(date)}
                            disabled={(date) => date > new Date()}
                            initialFocus
                            className="p-3 pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-2">
                      <Label>Investierter Betrag ({existingCurrencySymbol})</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={addAmount}
                        onChange={(e) => setAddAmount(e.target.value)}
                        placeholder="0.00"
                        required
                      />
                    </div>

                    {accounts.length > 0 && (
                      <div className="space-y-2">
                        <Label>Von Konto abbuchen (optional)</Label>
                        <Select value={selectedAccountExisting} onValueChange={setSelectedAccountExisting}>
                          <SelectTrigger>
                            <SelectValue placeholder="Kein Konto" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Kein Konto</SelectItem>
                            {accounts.map((acc) => (
                              <SelectItem key={acc.id} value={acc.id}>
                                {acc.name} ({acc.balance.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {fetchingPrice ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Lade Kurs...
                      </div>
                    ) : historicalPrice && addAmount ? (
                      <div className="p-3 rounded-lg bg-muted/50 text-sm space-y-2">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Kurs am {format(addDate, 'dd.MM.yy')}:</span>
                          <span className="font-medium">
                            {historicalPrice.toLocaleString('de-DE', {
                              style: 'currency',
                              currency: selectedExisting.currency,
                            })}
                          </span>
                        </div>
                        <div className="flex justify-between text-primary font-medium">
                          <span>Ergibt:</span>
                          <span>
                            +{(parseFloat(addAmount) / historicalPrice).toLocaleString('de-DE', { maximumFractionDigits: 8 })} {selectedExisting.name}
                          </span>
                        </div>
                      </div>
                    ) : null}

                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={loading || !historicalPrice || !addAmount}
                    >
                      {loading ? 'Füge hinzu...' : 'Zu Investment hinzufügen'}
                    </Button>
                  </>
                )}
              </form>
            )}
          </TabsContent>

          {/* Create new investment */}
          <TabsContent value="new" className="space-y-4 mt-4">
            <form onSubmit={handleSubmitNew} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Typ</Label>
                  <Select value={investmentType} onValueChange={(val) => {
                    setInvestmentType(val);
                    setSelectedAsset(null);
                    setSearchQuery('');
                    setSearchResults([]);
                  }} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Typ wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {investmentTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Währung</Label>
                  <Select value={currency} onValueChange={(val) => {
                    setCurrency(val);
                    if (selectedAsset) {
                      setSelectedAsset({ ...selectedAsset, price: undefined });
                    }
                  }} required>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {investmentType && (
                <div className="space-y-2">
                  <Label>
                    {investmentType === 'crypto' ? 'Kryptowährung suchen' : 'Aktie/ETF suchen'}
                  </Label>
                  
                  {selectedAsset ? (
                    <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold flex items-center gap-2">
                            <Check className="w-4 h-4 text-primary" />
                            {selectedAsset.name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {selectedAsset.type || selectedAsset.symbol}
                          </div>
                          {selectedAsset.price && (
                            <div className="text-sm font-medium text-primary mt-1">
                              Aktueller Kurs: {selectedAsset.price.toLocaleString('de-DE', {
                                style: 'currency',
                                currency: currency,
                              })}
                            </div>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedAsset(null)}
                        >
                          Ändern
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={
                          investmentType === 'crypto'
                            ? 'z.B. Bitcoin, Ethereum...'
                            : 'z.B. Apple, MSCI World...'
                        }
                        className="pl-9"
                      />
                      {searching && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                      )}
                      
                      {searchResults.length > 0 && (
                        <div className="absolute z-50 mt-1 w-full bg-popover border border-border rounded-lg shadow-lg max-h-60 overflow-auto">
                          {searchResults.map((result, index) => (
                            <button
                              key={`${result.symbol}-${index}`}
                              type="button"
                              onClick={() => handleSelectAsset(result)}
                              className={cn(
                                'w-full px-3 py-2 text-left hover:bg-accent transition-colors',
                                index !== searchResults.length - 1 && 'border-b border-border/50'
                              )}
                            >
                              <div className="font-medium">{result.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {result.type || result.symbol}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {selectedAsset && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="quantity">Menge</Label>
                      <Input
                        id="quantity"
                        type="number"
                        step="0.00000001"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        placeholder="0"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="price">Kaufpreis gesamt ({currencySymbol})</Label>
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        value={purchasePrice}
                        onChange={(e) => setPurchasePrice(e.target.value)}
                        placeholder="0.00"
                        required
                      />
                    </div>
                  </div>

                  {accounts.length > 0 && (
                    <div className="space-y-2">
                      <Label>Von Konto abbuchen (optional)</Label>
                      <Select value={selectedAccountNew} onValueChange={setSelectedAccountNew}>
                        <SelectTrigger>
                          <SelectValue placeholder="Kein Konto" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Kein Konto</SelectItem>
                          {accounts.map((acc) => (
                            <SelectItem key={acc.id} value={acc.id}>
                              {acc.name} ({acc.balance.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {quantity && purchasePrice && selectedAsset.price && (
                    <div className="p-3 rounded-lg bg-muted/50 text-sm space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Aktueller Wert:</span>
                        <span className="font-medium">
                          {(parseFloat(quantity) * selectedAsset.price).toLocaleString('de-DE', {
                            style: 'currency',
                            currency: currency,
                          })}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Differenz:</span>
                        <span className={cn(
                          'font-medium',
                          parseFloat(quantity) * selectedAsset.price - parseFloat(purchasePrice) >= 0
                            ? 'text-success'
                            : 'text-destructive'
                        )}>
                          {(parseFloat(quantity) * selectedAsset.price - parseFloat(purchasePrice)).toLocaleString('de-DE', {
                            style: 'currency',
                            currency: currency,
                            signDisplay: 'always',
                          })}
                          {' '}
                          ({(((parseFloat(quantity) * selectedAsset.price - parseFloat(purchasePrice)) / parseFloat(purchasePrice)) * 100).toFixed(2)}%)
                        </span>
                      </div>
                    </div>
                  )}

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Füge hinzu...' : 'Hinzufügen'}
                  </Button>
                </>
              )}
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
