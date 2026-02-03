-- =============================================
-- FINANZEN V2 - SCHRITT 1: KERN-DATENSTRUKTUR
-- =============================================

-- 1) Kategorien-Tabelle (editierbar durch User)
CREATE TABLE public.v2_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  icon TEXT,
  color TEXT,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, name)
);

ALTER TABLE public.v2_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own categories"
ON public.v2_categories FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 2) Konten-Tabelle (Giro, Tagesgeld, Cash, Sonstiges)
CREATE TABLE public.v2_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('giro', 'tagesgeld', 'cash', 'sonstiges')),
  currency TEXT NOT NULL DEFAULT 'EUR' CHECK (currency IN ('EUR', 'USD')),
  balance NUMERIC(15,2) NOT NULL DEFAULT 0,
  icon TEXT,
  color TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.v2_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own accounts"
ON public.v2_accounts FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 3) Cash-Stückelung (für Bargeld-Konten)
CREATE TABLE public.v2_cash_denominations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.v2_accounts(id) ON DELETE CASCADE,
  denomination NUMERIC(6,2) NOT NULL, -- 0.01, 0.02, ..., 200.00
  quantity INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(account_id, denomination)
);

ALTER TABLE public.v2_cash_denominations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage cash denominations via account"
ON public.v2_cash_denominations FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.v2_accounts 
  WHERE id = v2_cash_denominations.account_id 
  AND user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.v2_accounts 
  WHERE id = v2_cash_denominations.account_id 
  AND user_id = auth.uid()
));

-- 4) Buchungen (Einnahmen/Ausgaben/Umbuchungen)
CREATE TABLE public.v2_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('income', 'expense', 'transfer', 'investment_buy', 'investment_sell')),
  amount NUMERIC(15,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  time TIME,
  account_id UUID REFERENCES public.v2_accounts(id) ON DELETE SET NULL, -- Hauptkonto (Ziel bei Einnahme, Quelle bei Ausgabe)
  to_account_id UUID REFERENCES public.v2_accounts(id) ON DELETE SET NULL, -- Nur bei Umbuchung
  category_id UUID REFERENCES public.v2_categories(id) ON DELETE SET NULL,
  investment_id UUID, -- Wird später mit v2_investments verknüpft
  note TEXT,
  automation_id UUID, -- Referenz auf Automation (falls automatisch erstellt)
  execution_id TEXT, -- Eindeutige ID für Automation-Ausführung (verhindert Duplikate)
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_v2_transactions_user_date ON public.v2_transactions(user_id, date DESC);
CREATE INDEX idx_v2_transactions_execution ON public.v2_transactions(execution_id) WHERE execution_id IS NOT NULL;

ALTER TABLE public.v2_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own transactions"
ON public.v2_transactions FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 5) Automationen (wiederkehrende Buchungen)
CREATE TABLE public.v2_automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  automation_type TEXT NOT NULL CHECK (automation_type IN ('income', 'expense', 'transfer', 'investment')),
  amount NUMERIC(15,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  interval_type TEXT NOT NULL CHECK (interval_type IN ('weekly', 'monthly', 'yearly')),
  execution_day INTEGER NOT NULL, -- Tag im Monat (1-31) oder Wochentag (0-6) bei weekly
  account_id UUID REFERENCES public.v2_accounts(id) ON DELETE SET NULL,
  to_account_id UUID REFERENCES public.v2_accounts(id) ON DELETE SET NULL,
  investment_id UUID,
  category_id UUID REFERENCES public.v2_categories(id) ON DELETE SET NULL,
  note TEXT,
  is_active BOOLEAN DEFAULT true,
  last_executed_at TIMESTAMPTZ,
  next_execution_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.v2_automations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own automations"
ON public.v2_automations FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 6) Tägliche Snapshots (für schnelle Statistiken)
CREATE TABLE public.v2_daily_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  -- Kontostände (JSON mit account_id -> balance)
  account_balances JSONB NOT NULL DEFAULT '{}',
  -- Aggregierte Werte
  total_accounts_eur NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_investments_eur NUMERIC(15,2) NOT NULL DEFAULT 0,
  net_worth_eur NUMERIC(15,2) NOT NULL DEFAULT 0,
  -- Cashflow des Tages
  income_eur NUMERIC(15,2) NOT NULL DEFAULT 0,
  expenses_eur NUMERIC(15,2) NOT NULL DEFAULT 0,
  -- Wechselkurs des Tages
  eur_usd_rate NUMERIC(10,6),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
);

CREATE INDEX idx_v2_snapshots_user_date ON public.v2_daily_snapshots(user_id, date DESC);

ALTER TABLE public.v2_daily_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own snapshots"
ON public.v2_daily_snapshots FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 7) Investments-Tabelle
CREATE TABLE public.v2_investments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  symbol TEXT, -- Ticker-Symbol für API-Abfragen
  asset_type TEXT NOT NULL CHECK (asset_type IN ('etf', 'stock', 'fund', 'crypto', 'metal', 'other')),
  currency TEXT NOT NULL DEFAULT 'EUR',
  quantity NUMERIC(18,8) NOT NULL DEFAULT 0, -- Anteile/Units
  avg_purchase_price NUMERIC(15,4) NOT NULL DEFAULT 0, -- Durchschnittlicher Kaufpreis pro Einheit
  current_price NUMERIC(15,4), -- Aktueller Kurs
  current_price_updated_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.v2_investments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own investments"
ON public.v2_investments FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- FK für transactions.investment_id hinzufügen
ALTER TABLE public.v2_transactions
ADD CONSTRAINT v2_transactions_investment_id_fkey
FOREIGN KEY (investment_id) REFERENCES public.v2_investments(id) ON DELETE SET NULL;

-- FK für automations.investment_id hinzufügen
ALTER TABLE public.v2_automations
ADD CONSTRAINT v2_automations_investment_id_fkey
FOREIGN KEY (investment_id) REFERENCES public.v2_investments(id) ON DELETE SET NULL;

-- 8) Materiell (separate Verwaltung, nicht im Net Worth)
CREATE TABLE public.v2_material_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  purchase_price NUMERIC(15,2),
  purchase_date DATE,
  current_value NUMERIC(15,2),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.v2_material_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own material assets"
ON public.v2_material_assets FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Trigger für updated_at
CREATE TRIGGER update_v2_accounts_updated_at
BEFORE UPDATE ON public.v2_accounts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_v2_automations_updated_at
BEFORE UPDATE ON public.v2_automations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_v2_investments_updated_at
BEFORE UPDATE ON public.v2_investments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_v2_material_assets_updated_at
BEFORE UPDATE ON public.v2_material_assets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_v2_snapshots_updated_at
BEFORE UPDATE ON public.v2_daily_snapshots
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();