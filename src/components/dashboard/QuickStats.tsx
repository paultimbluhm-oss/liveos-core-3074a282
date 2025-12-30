import { Loader2 } from 'lucide-react';

interface QuickStatsProps {
  averageGrade: number | null;
  totalBalance: number;
  loadingPrices?: boolean;
}

export function QuickStats({ averageGrade, totalBalance, loadingPrices }: QuickStatsProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {/* Grade Average */}
      <div className="glass-card p-4 text-center">
        <p className="text-2xl md:text-3xl font-bold font-mono text-accent">
          {averageGrade !== null ? averageGrade.toFixed(1) : '—'}
        </p>
        <p className="text-xs text-muted-foreground mt-1">Notenschnitt</p>
      </div>
      
      {/* Total Balance */}
      <div className="glass-card p-4 text-center">
        <div className="flex items-center justify-center gap-1">
          <p className="text-2xl md:text-3xl font-bold font-mono text-primary">
            {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(totalBalance)}
          </p>
          {loadingPrices && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
        </div>
        <p className="text-xs text-muted-foreground mt-1">Vermögen</p>
      </div>
    </div>
  );
}
