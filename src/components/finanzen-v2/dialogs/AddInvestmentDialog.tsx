import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth, getSupabase } from '@/hooks/useAuth';
import { useFinanceV2 } from '../context/FinanceV2Context';
import { toast } from 'sonner';
import { Search, Check, Loader2, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AddInvestmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SearchResult {
  symbol: string;
  name: string;
  type?: string;
  price?: number;
}

const investmentTypes = [
  { value: 'etf', label: 'ETF' },
  { value: 'stock', label: 'Aktie' },
  { value: 'crypto', label: 'Krypto' },
  { value: 'fund', label: 'Fonds' },
  { value: 'metal', label: 'Edelmetall' },
  { value: 'other', label: 'Sonstige' },
];

export function AddInvestmentDialog({ open, onOpenChange }: AddInvestmentDialogProps) {
  const { user } = useAuth();
  const { refreshInvestments } = useFinanceV2();
  const [loading, setLoading] = useState(false);
  
  // Form states
  const [assetType, setAssetType] = useState<string>('etf');
  const [currency, setCurrency] = useState<string>('EUR');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<SearchResult | null>(null);
  const [quantity, setQuantity] = useState('');
  const [avgPrice, setAvgPrice] = useState('');
  const [searching, setSearching] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualSymbol, setManualSymbol] = useState('');

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setAssetType('etf');
      setCurrency('EUR');
      setSearchQuery('');
      setSearchResults([]);
      setSelectedAsset(null);
      setQuantity('');
      setAvgPrice('');
      setManualMode(false);
      setManualName('');
      setManualSymbol('');
    }
  }, [open]);

  // Search for assets when query changes
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2 || !assetType || manualMode) {
      setSearchResults([]);
      return;
    }

    const searchAssets = async () => {
      setSearching(true);
      try {
        if (assetType === 'crypto') {
          // CoinGecko API for crypto
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
        } else if (assetType === 'etf' || assetType === 'stock') {
          // Yahoo Finance via Edge Function for stocks/ETFs
          const supabaseClient = getSupabase();
          const { data, error } = await supabaseClient.functions.invoke('search-stocks', {
            body: { query: searchQuery },
          });
          if (!error && data?.results) {
            setSearchResults(data.results);
          }
        } else {
          // For other types, show manual entry
          setSearchResults([]);
        }
      } catch (error) {
        console.error('Search error:', error);
      }
      setSearching(false);
    };

    const debounce = setTimeout(searchAssets, 500);
    return () => clearTimeout(debounce);
  }, [searchQuery, assetType, manualMode]);

  // Fetch current price when asset is selected
  useEffect(() => {
    if (!selectedAsset) return;

    const fetchPrice = async () => {
      try {
        if (assetType === 'crypto') {
          const vsCurrency = currency.toLowerCase();
          const res = await fetch(
            `https://api.coingecko.com/api/v3/simple/price?ids=${selectedAsset.symbol}&vs_currencies=${vsCurrency}`
          );
          const data = await res.json();
          const price = data[selectedAsset.symbol]?.[vsCurrency];
          if (price) {
            setSelectedAsset((prev) => prev ? { ...prev, price } : null);
            setAvgPrice(price.toString());
          }
        } else if (assetType === 'etf' || assetType === 'stock') {
          const supabaseClient = getSupabase();
          const { data, error } = await supabaseClient.functions.invoke('get-stock-price', {
            body: { symbol: selectedAsset.symbol, targetCurrency: currency },
          });
          if (!error && data?.price) {
            setSelectedAsset((prev) => prev ? { ...prev, price: data.price } : null);
            setAvgPrice(data.price.toString());
          }
        }
      } catch (error) {
        console.error('Price fetch error:', error);
      }
    };

    fetchPrice();
  }, [selectedAsset?.symbol, assetType, currency]);

  const handleSelectAsset = (result: SearchResult) => {
    setSelectedAsset(result);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const name = manualMode ? manualName.trim() : selectedAsset?.name;
    const symbol = manualMode ? (manualSymbol.trim() || null) : selectedAsset?.symbol;

    if (!name) {
      toast.error('Bitte wähle ein Asset aus');
      return;
    }

    setLoading(true);
    const supabase = getSupabase();

    const { error } = await supabase.from('v2_investments').insert({
      user_id: user.id,
      name: name,
      symbol: symbol,
      asset_type: assetType,
      currency,
      quantity: parseFloat(quantity) || 0,
      avg_purchase_price: parseFloat(avgPrice) || 0,
      current_price: parseFloat(avgPrice) || null,
    });

    setLoading(false);

    if (error) {
      toast.error('Fehler beim Erstellen');
      console.error(error);
    } else {
      toast.success('Investment erstellt');
      await refreshInvestments();
      onOpenChange(false);
    }
  };

  const currencySymbol = currency === 'EUR' ? '€' : '$';
  const showSearch = (assetType === 'etf' || assetType === 'stock' || assetType === 'crypto') && !manualMode;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Neue Position</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Asset Type */}
          <div className="space-y-2">
            <Label>Typ</Label>
            <Select value={assetType} onValueChange={(v) => {
              setAssetType(v);
              setSelectedAsset(null);
              setSearchQuery('');
              setSearchResults([]);
              setManualMode(v === 'fund' || v === 'metal' || v === 'other');
            }}>
              <SelectTrigger>
                <SelectValue />
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

          {/* Search or Manual Entry */}
          {showSearch ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Asset suchen</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs text-muted-foreground"
                  onClick={() => setManualMode(true)}
                >
                  Manuell eingeben
                </Button>
              </div>
              
              {selectedAsset ? (
                <div className="p-3 rounded-xl bg-primary/10 border border-primary/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{selectedAsset.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {selectedAsset.symbol} {selectedAsset.type && `(${selectedAsset.type})`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedAsset.price && (
                        <span className="text-sm font-medium">
                          {selectedAsset.price.toLocaleString('de-DE', { minimumFractionDigits: 2 })} {currencySymbol}
                        </span>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => setSelectedAsset(null)}
                      >
                        ×
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={assetType === 'crypto' ? 'z.B. Bitcoin, Ethereum...' : 'z.B. MSCI World, Apple...'}
                    className="pl-9"
                  />
                  {searching && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                  )}
                </div>
              )}

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="border rounded-xl overflow-hidden bg-background max-h-48 overflow-y-auto">
                  {searchResults.map((result) => (
                    <button
                      key={result.symbol}
                      type="button"
                      onClick={() => handleSelectAsset(result)}
                      className={cn(
                        "w-full px-3 py-2 text-left hover:bg-muted/50 transition-colors flex items-center justify-between",
                        "border-b last:border-b-0"
                      )}
                    >
                      <div>
                        <p className="text-sm font-medium">{result.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {result.symbol} {result.type && `· ${result.type}`}
                        </p>
                      </div>
                      <TrendingUp className="w-4 h-4 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="name">Name</Label>
                  {(assetType === 'etf' || assetType === 'stock' || assetType === 'crypto') && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs text-muted-foreground"
                      onClick={() => setManualMode(false)}
                    >
                      Suche verwenden
                    </Button>
                  )}
                </div>
                <Input
                  id="name"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="z.B. MSCI World ETF"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="symbol">Symbol (optional)</Label>
                <Input
                  id="symbol"
                  value={manualSymbol}
                  onChange={(e) => setManualSymbol(e.target.value)}
                  placeholder="z.B. IWDA.AS"
                />
              </div>
            </>
          )}

          {/* Currency */}
          <div className="space-y-2">
            <Label>Währung</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EUR">EUR</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Quantity and Price */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="quantity">Anzahl</Label>
              <Input
                id="quantity"
                type="number"
                step="0.0001"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="avgPrice">Ø Kaufpreis ({currencySymbol})</Label>
              <Input
                id="avgPrice"
                type="number"
                step="0.01"
                value={avgPrice}
                onChange={(e) => setAvgPrice(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Total Value Preview */}
          {quantity && avgPrice && (
            <div className="p-3 rounded-xl bg-muted/50 border">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Gesamtwert</span>
                <span className="font-medium">
                  {(parseFloat(quantity) * parseFloat(avgPrice)).toLocaleString('de-DE', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })} {currencySymbol}
                </span>
              </div>
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full" 
            disabled={loading || (!manualMode && !selectedAsset) || (manualMode && !manualName.trim())}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Erstelle...
              </>
            ) : (
              'Position erstellen'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
