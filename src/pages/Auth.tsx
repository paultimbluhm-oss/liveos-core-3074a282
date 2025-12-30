import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Loader2, Warehouse, Zap, Trophy, Target } from 'lucide-react';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Bitte fülle alle Felder aus');
      return;
    }
    setIsLoading(true);
    const { error } = await signIn(email, password);
    setIsLoading(false);
    if (error) {
      if (error.message.includes('Invalid login')) {
        toast.error('Ungültige E-Mail oder Passwort');
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success('Erfolgreich angemeldet!');
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Bitte fülle alle Felder aus');
      return;
    }
    if (password.length < 6) {
      toast.error('Passwort muss mindestens 6 Zeichen haben');
      return;
    }
    setIsLoading(true);
    const { error } = await signUp(email, password, username);
    setIsLoading(false);
    if (error) {
      if (error.message.includes('already registered')) {
        toast.error('Diese E-Mail ist bereits registriert');
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success('Account erstellt! Du wirst jetzt angemeldet...');
    }
  };

  const features = [
    { icon: Zap, label: 'XP System', desc: 'Sammle Punkte für produktive Aktivitäten' },
    { icon: Trophy, label: 'Achievements', desc: 'Schalte Erfolge frei' },
    { icon: Target, label: 'Tracking', desc: 'Behalte alles im Blick' },
  ];

  return (
    <div className="min-h-screen bg-background industrial-grid flex">
      {/* Left side - Features */}
      <div className="hidden lg:flex flex-1 flex-col justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10" />
        <div className="relative z-10 max-w-lg">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-primary/20 rounded-xl glow-primary">
              <Warehouse className="w-10 h-10 text-primary" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gradient-primary">LifeOS</h1>
              <p className="text-muted-foreground">Personal Management System</p>
            </div>
          </div>
          
          <p className="text-xl text-foreground/80 mb-10 leading-relaxed">
            Verwalte dein Leben wie ein <span className="text-primary font-semibold">Lagerhaus</span>. 
            Organisiert, effizient und mit voller Kontrolle über jeden Bereich.
          </p>

          <div className="space-y-6">
            {features.map((feature, i) => (
              <div 
                key={feature.label} 
                className="flex items-center gap-4 p-4 rounded-lg bg-card/50 border border-border/50 backdrop-blur-sm fade-in"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="p-2 rounded-lg bg-primary/20">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{feature.label}</h3>
                  <p className="text-sm text-muted-foreground">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right side - Auth form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <Card className="w-full max-w-md glass-card border-border/50">
          <CardHeader className="text-center pb-2">
            <div className="lg:hidden flex items-center justify-center gap-2 mb-4">
              <Warehouse className="w-8 h-8 text-primary" />
              <span className="text-2xl font-bold text-gradient-primary">LifeOS</span>
            </div>
            <CardTitle className="text-2xl">Willkommen</CardTitle>
            <CardDescription>Melde dich an oder erstelle einen Account</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="signin">Anmelden</TabsTrigger>
                <TabsTrigger value="signup">Registrieren</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">E-Mail</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="deine@email.de"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-background/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Passwort</Label>
                    <Input
                      id="signin-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-background/50"
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Anmelden
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-username">Benutzername (optional)</Label>
                    <Input
                      id="signup-username"
                      type="text"
                      placeholder="DeinName"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="bg-background/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">E-Mail</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="deine@email.de"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-background/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Passwort</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="Mindestens 6 Zeichen"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-background/50"
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Account erstellen
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
