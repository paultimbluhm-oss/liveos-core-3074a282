import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { 
  Users, 
  UserPlus, 
  Search, 
  Check, 
  X, 
  Flame, 
  Trophy, 
  Settings, 
  Swords,
  Clock,
  Target
} from 'lucide-react';
import { format, addDays } from 'date-fns';
import { de } from 'date-fns/locale';

interface UserProfile {
  id: string;
  user_id: string;
  username: string | null;
  display_name?: string | null;
  level: number | null;
  xp: number | null;
  streak_days: number | null;
}

interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'blocked';
  created_at: string;
  friend_profile?: UserProfile;
  friend_streak?: { current_streak: number; longest_streak: number };
}

interface Challenge {
  id: string;
  challenger_id: string;
  challenged_id: string;
  challenge_type: string;
  title: string;
  description: string | null;
  target_value: number | null;
  start_date: string;
  end_date: string;
  status: string;
  winner_id: string | null;
  my_progress?: number;
  opponent_progress?: number;
  opponent_profile?: UserProfile;
}

interface PrivacySettings {
  share_level: boolean;
  share_xp: boolean;
  share_streak: boolean;
  share_habits: boolean;
  share_tasks: boolean;
  share_grades: boolean;
  share_finance: boolean;
}

export default function Freunde() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('friends');
  const [searchQuery, setSearchQuery] = useState('');
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>({
    share_level: true,
    share_xp: true,
    share_streak: true,
    share_habits: false,
    share_tasks: false,
    share_grades: false,
    share_finance: false,
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [challengeDialogOpen, setChallengeDialogOpen] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<Friendship | null>(null);
  const [challengeForm, setChallengeForm] = useState({
    type: 'xp_race',
    title: '',
    target: 100,
    days: 7,
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  const fetchData = async () => {
    if (!user) return;

    // Fetch all user profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, user_id, username, display_name, level, xp, streak_days')
      .neq('user_id', user.id);
    
    if (profiles) setAllUsers(profiles);

    // Fetch friendships
    const { data: friendshipsData } = await supabase
      .from('friendships')
      .select('*')
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

    if (friendshipsData && profiles) {
      const enrichedFriendships = friendshipsData.map(f => {
        const friendId = f.requester_id === user.id ? f.addressee_id : f.requester_id;
        const friendProfile = profiles.find(p => p.user_id === friendId);
        return { ...f, friend_profile: friendProfile } as Friendship;
      });
      setFriendships(enrichedFriendships);
    }

    // Fetch challenges
    const { data: challengesData } = await supabase
      .from('challenges')
      .select('*')
      .or(`challenger_id.eq.${user.id},challenged_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (challengesData && profiles) {
      const enrichedChallenges = await Promise.all(challengesData.map(async c => {
        const opponentId = c.challenger_id === user.id ? c.challenged_id : c.challenger_id;
        const opponentProfile = profiles.find(p => p.user_id === opponentId);
        
        const { data: progress } = await supabase
          .from('challenge_progress')
          .select('user_id, current_value')
          .eq('challenge_id', c.id);
        
        const myProgress = progress?.find(p => p.user_id === user.id)?.current_value || 0;
        const oppProgress = progress?.find(p => p.user_id === opponentId)?.current_value || 0;
        
        return { 
          ...c, 
          opponent_profile: opponentProfile, 
          my_progress: myProgress,
          opponent_progress: oppProgress 
        } as Challenge;
      }));
      setChallenges(enrichedChallenges);
    }

    // Fetch privacy settings
    const { data: settings } = await supabase
      .from('friend_privacy_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (settings) {
      setPrivacySettings({
        share_level: settings.share_level,
        share_xp: settings.share_xp,
        share_streak: settings.share_streak,
        share_habits: settings.share_habits,
        share_tasks: settings.share_tasks,
        share_grades: settings.share_grades,
        share_finance: settings.share_finance,
      });
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const sendFriendRequest = async (targetUserId: string) => {
    if (!user) return;

    const { error } = await supabase.from('friendships').insert({
      requester_id: user.id,
      addressee_id: targetUserId,
    });

    if (error) {
      if (error.code === '23505') {
        toast.error('Anfrage bereits gesendet');
      } else {
        toast.error('Fehler beim Senden');
      }
    } else {
      toast.success('Anfrage gesendet');
      fetchData();
    }
  };

  const respondToRequest = async (friendshipId: string, accept: boolean) => {
    const newStatus = accept ? 'accepted' : 'rejected';
    const { error } = await supabase
      .from('friendships')
      .update({ status: newStatus })
      .eq('id', friendshipId);

    if (!error) {
      toast.success(accept ? 'Freund hinzugefuegt' : 'Anfrage abgelehnt');
      
      // Create friend streak if accepted
      if (accept) {
        await supabase.from('friend_streaks').insert({
          friendship_id: friendshipId,
        });
      }
      
      fetchData();
    }
  };

  const removeFriend = async (friendshipId: string) => {
    const { error } = await supabase.from('friendships').delete().eq('id', friendshipId);
    if (!error) {
      toast.success('Freund entfernt');
      fetchData();
    }
  };

  const savePrivacySettings = async () => {
    if (!user) return;

    const { error } = await supabase.from('friend_privacy_settings').upsert({
      user_id: user.id,
      ...privacySettings,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

    if (!error) {
      toast.success('Einstellungen gespeichert');
      setSettingsOpen(false);
    }
  };

  const createChallenge = async () => {
    if (!user || !selectedFriend) return;

    const { error } = await supabase.from('challenges').insert({
      challenger_id: user.id,
      challenged_id: selectedFriend.friend_profile?.user_id,
      challenge_type: challengeForm.type,
      title: challengeForm.title || `${challengeForm.type === 'xp_race' ? 'XP-Rennen' : 'Challenge'}`,
      target_value: challengeForm.target,
      start_date: format(new Date(), 'yyyy-MM-dd'),
      end_date: format(addDays(new Date(), challengeForm.days), 'yyyy-MM-dd'),
    });

    if (!error) {
      toast.success('Challenge gesendet');
      setChallengeDialogOpen(false);
      setChallengeForm({ type: 'xp_race', title: '', target: 100, days: 7 });
      fetchData();
    }
  };

  const respondToChallenge = async (challengeId: string, accept: boolean) => {
    const { error } = await supabase
      .from('challenges')
      .update({ status: accept ? 'active' : 'declined' })
      .eq('id', challengeId);

    if (!error) {
      toast.success(accept ? 'Challenge angenommen' : 'Challenge abgelehnt');
      fetchData();
    }
  };

  if (loading || !user) return null;

  const pendingRequests = friendships.filter(f => f.status === 'pending' && f.addressee_id === user.id);
  const sentRequests = friendships.filter(f => f.status === 'pending' && f.requester_id === user.id);
  const friends = friendships.filter(f => f.status === 'accepted');
  
  const availableUsers = allUsers.filter(u => 
    !friendships.some(f => f.friend_profile?.user_id === u.user_id) &&
    (searchQuery === '' || 
      u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.display_name?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const pendingChallenges = challenges.filter(c => c.status === 'pending' && c.challenged_id === user.id);
  const activeChallenges = challenges.filter(c => c.status === 'active');

  return (
    <AppLayout>
      <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600">
              <Users className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold">Freunde</h1>
          </div>
          <Button variant="outline" size="icon" onClick={() => setSettingsOpen(true)}>
            <Settings className="w-4 h-4" />
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="p-3 rounded-xl bg-secondary/40 text-center">
            <p className="text-xl font-bold">{friends.length}</p>
            <p className="text-[10px] text-muted-foreground">Freunde</p>
          </div>
          <div className="p-3 rounded-xl bg-secondary/40 text-center">
            <p className="text-xl font-bold">{activeChallenges.length}</p>
            <p className="text-[10px] text-muted-foreground">Challenges</p>
          </div>
          <div className="p-3 rounded-xl bg-secondary/40 text-center">
            <p className="text-xl font-bold">{pendingRequests.length + pendingChallenges.length}</p>
            <p className="text-[10px] text-muted-foreground">Anfragen</p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="friends" className="text-xs">Freunde</TabsTrigger>
            <TabsTrigger value="challenges" className="text-xs">Challenges</TabsTrigger>
            <TabsTrigger value="discover" className="text-xs">Entdecken</TabsTrigger>
          </TabsList>

          {/* Friends Tab */}
          <TabsContent value="friends" className="space-y-3 mt-3">
            {/* Pending Requests */}
            {pendingRequests.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Anfragen ({pendingRequests.length})</p>
                {pendingRequests.map(req => (
                  <Card key={req.id} className="border-primary/30 bg-primary/5">
                    <CardContent className="p-3 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{req.friend_profile?.username || 'Unbekannt'}</p>
                        <p className="text-[10px] text-muted-foreground">Moechte dich als Freund</p>
                      </div>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-500" onClick={() => respondToRequest(req.id, true)}>
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-400" onClick={() => respondToRequest(req.id, false)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Friends List */}
            {friends.length === 0 ? (
              <div className="py-12 text-center">
                <Users className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">Noch keine Freunde</p>
                <p className="text-xs text-muted-foreground/70">Entdecke Nutzer im "Entdecken" Tab</p>
              </div>
            ) : (
              <div className="space-y-2">
                {friends.map(friend => (
                  <Card key={friend.id} className="border-border/50">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold">
                            {(friend.friend_profile?.username || '?')[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{friend.friend_profile?.username || 'Unbekannt'}</p>
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                              <span>Lvl {friend.friend_profile?.level || 1}</span>
                              <span className="flex items-center gap-0.5">
                                <Flame className="w-3 h-3 text-orange-500" />
                                {friend.friend_profile?.streak_days || 0}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="h-8 text-xs gap-1"
                            onClick={() => {
                              setSelectedFriend(friend);
                              setChallengeDialogOpen(true);
                            }}
                          >
                            <Swords className="w-3 h-3" />
                            Challenge
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Sent Requests */}
            {sentRequests.length > 0 && (
              <div className="space-y-2 pt-2">
                <p className="text-xs font-medium text-muted-foreground">Gesendet ({sentRequests.length})</p>
                {sentRequests.map(req => (
                  <Card key={req.id} className="border-border/30 opacity-60">
                    <CardContent className="p-3 flex items-center justify-between">
                      <p className="text-sm">{req.friend_profile?.username || 'Unbekannt'}</p>
                      <span className="text-[10px] text-muted-foreground">Ausstehend</span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Challenges Tab */}
          <TabsContent value="challenges" className="space-y-3 mt-3">
            {/* Pending Challenges */}
            {pendingChallenges.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Einladungen ({pendingChallenges.length})</p>
                {pendingChallenges.map(c => (
                  <Card key={c.id} className="border-amber-500/30 bg-amber-500/5">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-medium text-sm">{c.title}</p>
                          <p className="text-[10px] text-muted-foreground">
                            von {c.opponent_profile?.username} - bis {format(new Date(c.end_date), 'dd.MM.', { locale: de })}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-500" onClick={() => respondToChallenge(c.id, true)}>
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-400" onClick={() => respondToChallenge(c.id, false)}>
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Active Challenges */}
            {activeChallenges.length === 0 && pendingChallenges.length === 0 ? (
              <div className="py-12 text-center">
                <Trophy className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">Keine aktiven Challenges</p>
                <p className="text-xs text-muted-foreground/70">Fordere einen Freund heraus</p>
              </div>
            ) : (
              <div className="space-y-2">
                {activeChallenges.map(c => {
                  const myProgress = c.my_progress || 0;
                  const oppProgress = c.opponent_progress || 0;
                  const target = c.target_value || 100;
                  const amWinning = myProgress > oppProgress;
                  
                  return (
                    <Card key={c.id} className="border-border/50">
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm">{c.title}</p>
                            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              bis {format(new Date(c.end_date), 'dd.MM.', { locale: de })}
                            </p>
                          </div>
                          <div className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-medium",
                            amWinning ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-400/10 text-rose-400"
                          )}>
                            {amWinning ? 'Fuehrst' : 'Zurueck'}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="text-center p-2 rounded-lg bg-secondary/30">
                            <p className="text-lg font-bold">{myProgress}</p>
                            <p className="text-[10px] text-muted-foreground">Du</p>
                          </div>
                          <div className="text-center p-2 rounded-lg bg-secondary/30">
                            <p className="text-lg font-bold">{oppProgress}</p>
                            <p className="text-[10px] text-muted-foreground">{c.opponent_profile?.username}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Discover Tab */}
          <TabsContent value="discover" className="space-y-3 mt-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Nutzer suchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {availableUsers.length === 0 ? (
              <div className="py-12 text-center">
                <UserPlus className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">Keine Nutzer gefunden</p>
              </div>
            ) : (
              <div className="space-y-2">
                {availableUsers.map(u => (
                  <Card key={u.id} className="border-border/50">
                    <CardContent className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-muted to-muted-foreground/30 flex items-center justify-center font-bold">
                          {(u.username || '?')[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{u.username || 'Unbekannt'}</p>
                          <p className="text-[10px] text-muted-foreground">Level {u.level || 1}</p>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => sendFriendRequest(u.user_id)}>
                        <UserPlus className="w-3 h-3" />
                        Hinzufuegen
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Privacy Settings Dialog */}
        <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Teilen-Einstellungen</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <p className="text-xs text-muted-foreground">Was duerfen Freunde sehen?</p>
              {[
                { key: 'share_level', label: 'Level' },
                { key: 'share_xp', label: 'XP' },
                { key: 'share_streak', label: 'Streak-Tage' },
                { key: 'share_habits', label: 'Gewohnheiten' },
                { key: 'share_tasks', label: 'Aufgaben' },
                { key: 'share_grades', label: 'Noten' },
                { key: 'share_finance', label: 'Finanzen' },
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between">
                  <Label className="text-sm">{item.label}</Label>
                  <Switch
                    checked={privacySettings[item.key as keyof PrivacySettings]}
                    onCheckedChange={(checked) => 
                      setPrivacySettings(prev => ({ ...prev, [item.key]: checked }))
                    }
                  />
                </div>
              ))}
              <Button className="w-full" onClick={savePrivacySettings}>
                Speichern
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Create Challenge Dialog */}
        <Dialog open={challengeDialogOpen} onOpenChange={setChallengeDialogOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Challenge erstellen</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <p className="text-xs text-muted-foreground">
                Fordere {selectedFriend?.friend_profile?.username} heraus
              </p>
              <div>
                <Label className="text-xs">Typ</Label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {[
                    { value: 'xp_race', label: 'XP sammeln', icon: Target },
                    { value: 'task_count', label: 'Aufgaben', icon: Check },
                  ].map(t => (
                    <Button
                      key={t.value}
                      variant={challengeForm.type === t.value ? 'default' : 'outline'}
                      className="h-auto py-3 flex-col gap-1"
                      onClick={() => setChallengeForm(prev => ({ ...prev, type: t.value }))}
                    >
                      <t.icon className="w-4 h-4" />
                      <span className="text-xs">{t.label}</span>
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-xs">Ziel</Label>
                <Input
                  type="number"
                  value={challengeForm.target}
                  onChange={(e) => setChallengeForm(prev => ({ ...prev, target: parseInt(e.target.value) || 0 }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Dauer (Tage)</Label>
                <div className="flex gap-2 mt-1">
                  {[3, 7, 14, 30].map(d => (
                    <Button
                      key={d}
                      variant={challengeForm.days === d ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setChallengeForm(prev => ({ ...prev, days: d }))}
                    >
                      {d}
                    </Button>
                  ))}
                </div>
              </div>
              <Button className="w-full" onClick={createChallenge}>
                Challenge senden
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}