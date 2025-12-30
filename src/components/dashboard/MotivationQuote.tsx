import { Sparkles } from 'lucide-react';
import { useMemo } from 'react';

const quotes = [
  { text: "Der beste Zeitpunkt anzufangen war gestern. Der zweitbeste ist jetzt.", author: "Unbekannt" },
  { text: "Erfolg ist die Summe kleiner Anstrengungen, die Tag für Tag wiederholt werden.", author: "Robert Collier" },
  { text: "Die einzige Grenze für unsere Verwirklichung von morgen werden unsere Zweifel von heute sein.", author: "Franklin D. Roosevelt" },
  { text: "Tu heute etwas, wofür dein zukünftiges Ich dir danken wird.", author: "Unbekannt" },
  { text: "Produktivität ist nie ein Zufall. Sie ist das Ergebnis eines Engagements für Exzellenz.", author: "Paul J. Meyer" },
  { text: "Kleine Taten, die man ausführt, sind besser als große Taten, die man plant.", author: "Peter Marshall" },
  { text: "Es ist nicht genug zu wissen – man muss auch anwenden.", author: "Johann Wolfgang von Goethe" },
];

export function MotivationQuote() {
  const quote = useMemo(() => {
    const today = new Date().toDateString();
    const index = today.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % quotes.length;
    return quotes[index];
  }, []);

  return (
    <div className="glass-card p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5" />
      
      <div className="relative">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-xs text-muted-foreground uppercase tracking-wider">Tägliche Motivation</span>
        </div>
        
        <blockquote className="text-lg font-medium text-foreground leading-relaxed">
          "{quote.text}"
        </blockquote>
        
        <p className="mt-3 text-sm text-muted-foreground">— {quote.author}</p>
      </div>
    </div>
  );
}
