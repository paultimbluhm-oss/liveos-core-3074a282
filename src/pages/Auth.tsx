import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Loader2, BookOpen, Wallet, Briefcase, CalendarDays,
  ListChecks, Users, Heart, ChevronDown, Lock
} from 'lucide-react';

const FEATURES = [
  { icon: BookOpen, label: 'Schule', desc: 'Noten, Stundenplan, Hausaufgaben, Vokabeln' },
  { icon: Wallet, label: 'Finanzen', desc: 'Konten, Transaktionen, Investments, Statistiken' },
  { icon: Briefcase, label: 'Business', desc: 'Kontakte, Auftraege, Umsatz-Tracking' },
  { icon: CalendarDays, label: 'Kalender', desc: 'Termine, Events, Tagesplanung' },
  { icon: ListChecks, label: 'Aufgaben & Habits', desc: 'To-dos, Gewohnheiten, Streaks' },
  { icon: Users, label: 'Freunde', desc: 'Challenges, gemeinsame Habits' },
  { icon: Heart, label: 'Privat', desc: 'Gesundheit, Rezepte, Checklisten, Ideen' },
];

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate('/');
  }, [user, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error('Bitte fuell alle Felder aus'); return; }
    setIsLoading(true);
    const { error } = await signIn(email, password);
    setIsLoading(false);
    if (error) {
      toast.error(error.message.includes('Invalid login') ? 'Falsche E-Mail oder Passwort' : error.message);
    } else {
      toast.success('Angemeldet');
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error('Bitte fuell alle Felder aus'); return; }
    if (password.length < 6) { toast.error('Passwort: min. 6 Zeichen'); return; }
    setIsLoading(true);
    const { error } = await signUp(email, password, username);
    setIsLoading(false);
    if (error) {
      toast.error(error.message.includes('already registered') ? 'E-Mail bereits registriert' : error.message);
    } else {
      toast.success('Account erstellt');
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground overflow-y-auto">
      {/* Hero */}
      <section className="relative min-h-[90vh] flex flex-col items-center justify-center px-6 text-center">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10 max-w-lg"
        >
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight leading-tight">
            Life<span className="text-primary">OS</span>
          </h1>
          <p className="mt-4 text-lg text-muted-foreground leading-relaxed max-w-md mx-auto">
            Dein persoenliches System fuer Schule, Finanzen, Business und alles andere.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" className="text-base px-8" onClick={() => setAuthOpen(true)}>
              <Lock className="w-4 h-4 mr-2" />
              Anmelden
            </Button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.8 }}
          className="absolute bottom-8"
        >
          <ChevronDown className="w-6 h-6 text-muted-foreground animate-bounce" />
        </motion.div>
      </section>

      {/* Features */}
      <section className="px-6 py-16 max-w-lg mx-auto">
        <h2 className="text-2xl font-bold text-center mb-10">Alles an einem Ort</h2>
        <div className="space-y-4">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.label}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              className="flex items-start gap-4 p-4 rounded-2xl bg-card border border-border/50"
            >
              <div className="p-2.5 rounded-xl bg-primary/10 shrink-0">
                <f.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">{f.label}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Disclaimer */}
      <section className="px-6 py-12 max-w-lg mx-auto">
        <div className="p-5 rounded-2xl bg-destructive/5 border border-destructive/20">
          <p className="text-xs font-semibold text-destructive mb-2">Hinweis</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Diese App ist ausschliesslich fuer den privaten Gebrauch bestimmt. 
            Es handelt sich um ein persoenliches Projekt ohne kommerzielle Absicht. 
            Es wird keine Garantie fuer Verfuegbarkeit, Datensicherheit oder Funktionalitaet uebernommen. 
            Die Nutzung erfolgt auf eigene Verantwortung.
          </p>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="px-6 pb-16 text-center">
        <Button variant="outline" size="lg" onClick={() => setAuthOpen(true)}>
          Jetzt starten
        </Button>
      </section>

      {/* Auth Sheet */}
      <Sheet open={authOpen} onOpenChange={setAuthOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto px-6 pb-8">
          <div className="pt-2 pb-4 text-center">
            <h2 className="text-xl font-bold">Willkommen</h2>
          </div>

          <Tabs defaultValue="signin" className="w-full max-w-sm mx-auto">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="signin">Anmelden</TabsTrigger>
              <TabsTrigger value="signup">Registrieren</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="si-email">E-Mail</Label>
                  <Input id="si-email" type="email" placeholder="deine@email.de" value={email} onChange={e => setEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="si-pw">Passwort</Label>
                  <Input id="si-pw" type="password" placeholder="********" value={password} onChange={e => setPassword(e.target.value)} />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Anmelden
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="su-user">Benutzername (optional)</Label>
                  <Input id="su-user" type="text" placeholder="DeinName" value={username} onChange={e => setUsername(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="su-email">E-Mail</Label>
                  <Input id="su-email" type="email" placeholder="deine@email.de" value={email} onChange={e => setEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="su-pw">Passwort</Label>
                  <Input id="su-pw" type="password" placeholder="Min. 6 Zeichen" value={password} onChange={e => setPassword(e.target.value)} />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Account erstellen
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>
    </div>
  );
}
