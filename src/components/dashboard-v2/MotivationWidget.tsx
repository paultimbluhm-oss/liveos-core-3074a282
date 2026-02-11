import { useState, useEffect } from 'react';
import { Quote } from 'lucide-react';
import type { WidgetSize } from '@/hooks/useDashboardV2';

const QUOTES = [
  { text: 'Kleine Schritte fuehren zu grossen Veraenderungen.', author: 'James Clear' },
  { text: 'Disziplin ist die Bruecke zwischen Zielen und Erfolg.', author: 'Jim Rohn' },
  { text: 'Der beste Zeitpunkt anzufangen ist jetzt.', author: '' },
  { text: 'Erfolg ist die Summe kleiner Anstrengungen, die Tag fuer Tag wiederholt werden.', author: 'Robert Collier' },
  { text: 'Du musst nicht grossartig sein, um anzufangen. Aber du musst anfangen, um grossartig zu werden.', author: 'Zig Ziglar' },
  { text: 'Motivation bringt dich in Gang. Gewohnheit bringt dich voran.', author: 'Jim Ryun' },
  { text: 'Jeder Tag ist eine neue Chance, dich zu verbessern.', author: '' },
  { text: 'Der einzige Weg, grossartige Arbeit zu leisten, ist zu lieben, was man tut.', author: 'Steve Jobs' },
  { text: 'Fortschritt, nicht Perfektion.', author: '' },
  { text: 'Die Zukunft gehoert denen, die an die Schoenheit ihrer Traeume glauben.', author: 'Eleanor Roosevelt' },
];

export function MotivationWidget({ size }: { size: WidgetSize }) {
  const [quote, setQuote] = useState(QUOTES[0]);

  useEffect(() => {
    // Deterministic daily quote based on day of year
    const now = new Date();
    const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);
    setQuote(QUOTES[dayOfYear % QUOTES.length]);
  }, []);

  return (
    <div className="rounded-2xl bg-card border border-border/50 p-4 flex items-start gap-3">
      <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
        <Quote className="w-4 h-4 text-primary" strokeWidth={1.5} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`${size === 'small' ? 'text-xs' : 'text-sm'} leading-relaxed`}>
          {quote.text}
        </p>
        {quote.author && (
          <p className="text-[10px] text-muted-foreground mt-1.5">-- {quote.author}</p>
        )}
      </div>
    </div>
  );
}
