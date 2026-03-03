import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { 
  Users, UserPlus, Search, Check, X, Flame, Trophy, Settings, Swords, Clock, Target
} from 'lucide-react';
import { format, addDays } from 'date-fns';
import { de } from 'date-fns/locale';
import { SharedHabitsSection } from '@/components/freunde/SharedHabitsSection';
import { FriendDetailSheet } from '@/components/freunde/FriendDetailSheet';

interface UserProfile {
  id: string;
  user_id: string;
  username: string | null;
  display_name?: string | null;
  streak_days: number | null;
}

interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'blocked';
  created_at: string;
  friend_profile?: UserProfile;
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

const tabs = [
  { id: 'friends', label: 'Freunde', icon: Users },
  { id: 'shared', label: 'Habits', icon: Flame },
  { id: 'challenges', label: 'Challenges', icon: Trophy },
  { id: 'discover', label: 'Entdecken', icon: Search },
];

export default function Freunde() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('friends');
  const [searchQuery, setSearchQuery] = useState('');
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>({
    share_level: true, share_xp: true, share_streak: true,
    share_habits: false, share_tasks: false, share_grades: false, share_finance: false,
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [challengeDialogOpen, setChallengeDialogOpen] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<Friendship | null>(null);
  const [detailFriend, setDetailFriend] = useState<UserProfile | null>(null);
  const [detailFriendshipId, setDetailFriendshipId] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [challengeForm, setChallengeForm] = useState({ type: 'xp_race', title: '', target: 100, days: 7 });

  useEffect(() => { if (!loading && !user) navigate('/auth'); }, [user, loading, navigate]);

  const fetchData = useCallback(async () => {
    if (!user) return;

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, user_id, username, display_name, streak_days')
      .neq('user_id', user.id);
    if (profiles) setAllUsers(profiles);

    const { data: friendshipsData } = await supabase
      .from('friendships')
      .select('*')
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

    if (friendshipsData && profiles) {
      const enriched = friendshipsData.map(f => {
        const friendId = f.requester_id === user.id ? f.addressee_id : f.requester_id;
        const friendProfile = profiles.find(p => p.user_id === friendId);
        return { ...f, friend_profile: friendProfile } as Friendship;
      });
      setFriendships(enriched);
    }

    const { data: challengesData } = await supabase
      .from('challenges')
      .select('*')
      .or(`challenger_id.eq.${user.id},challenged_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (challengesData && profiles) {
      const enriched = await Promise.all(challengesData.map(async c => {
        const opponentId = c.challenger_id === user.id ? c.challenged_id : c.challenger_id;
        const opponentProfile = profiles.find(p => p.user_id === opponentId);
        const { data: progress } = await supabase
          .from('challenge_progress')
          .select('user_id, current_value')
          .eq('challenge_id', c.id);
        return {
          ...c,
          opponent_profile: opponentProfile,
          my_progress: progress?.find(p => p.user_id === user.id)?.current_value || 0,
          opponent_progress: progress?.find(p => p.user_id === opponentId)?.current_value || 0,
        } as Challenge;
      }));
      setChallenges(enriched);
    }

    const { data: settings } = await supabase
      .from('friend_privacy_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (settings) {
      setPrivacySettings({
        share_level: settings.share_level, share_xp: settings.share_xp,
        share_streak: settings.share_streak, share_habits: settings.share_habits,
        share_tasks: settings.share_tasks, share_grades: settings.share_grades,
        share_finance: settings.share_finance,
      });
    }
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const sendFriendRequest = async (targetUserId: string) => {
    if (!user) return;
    const { error } = await supabase.from('friendships').insert({
      requester_id: user.id, addressee_id: targetUserId,
    });
    if (error) {
      toast.error(error.code === '23505' ? 'Anfrage bereits gesendet' : 'Fehler beim Senden');
    } else {
      toast.success('Anfrage gesendet');
      fetchData();
    }
  };

  const respondToRequest = async (friendshipId: string, accept: boolean) => {
    const { error } = await supabase
      .from('friendships')
      .update({ status: accept ? 'accepted' : 'rejected' })
      .eq('id', friendshipId);
    if (!error) {
      toast.success(accept ? 'Freund hinzugefuegt' : 'Anfrage abgelehnt');
      if (accept) await supabase.from('friend_streaks').insert({ friendship_id: friendshipId });
      fetchData();
    }
  };

  const removeFriend = async (friendshipId: string) => {
    const { error } = await supabase.from('friendships').delete().eq('id', friendshipId);
    if (!error) { toast.success('Freund entfernt'); fetchData(); }
  };

  const savePrivacySettings = async () => {
    if (!user) return;
    const { error } = await supabase.from('friend_privacy_settings').upsert({
      user_id: user.id, ...privacySettings, updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
    if (!error) { toast.success('Einstellungen gespeichert'); setSettingsOpen(false); }
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
    if (!error) { toast.success(accept ? 'Challenge angenommen' : 'Challenge abgelehnt'); fetchData(); }
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

  const friendProfiles = friends.map(f => ({
    user_id: f.friend_profile?.user_id || '',
    display_name: f.friend_profile?.display_name || null,
    username: f.friend_profile?.username || null,
  })).filter(f => f.user_id);

  return (
    <AppLayout>
      <div className="min-h-screen pb-24">
        {/* Settings Button */}
        <div className="fixed top-4 right-4 z-40">
          <button
            onClick={() => setSettingsOpen(true)}
            className="w-10 h-10 rounded-xl bg-card/80 backdrop-blur-xl border border-border shadow-lg flex items-center justify-center hover:bg-card transition-colors"
          >
            <Settings className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 max-w-2xl mx-auto pt-16 space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-card border border-border p-3 text-center">
              <p className="text-xl font-bold">{friends.length}</p>
              <p className="text-[10px] text-muted-foreground">Freunde</p>
            </div>
            <div className="rounded-xl bg-card border border-border p-3 text-center">
              <p className="text-xl font-bold">{activeChallenges.length}</p>
              <p className="text-[10px] text-muted-foreground">Challenges</p>
            </div>
            <div className="rounded-xl bg-card border border-border p-3 text-center">
              <p className="text-xl font-bold">{pendingRequests.length + pendingChallenges.length}</p>
              <p className="text-[10px] text-muted-foreground">Anfragen</p>
            </div>
          </div>

          {/* Tab Content based on activeTab */}
          {activeTab === 'friends' && (
            <div className="space-y-3">
              {pendingRequests.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Anfragen</p>
                  {pendingRequests.map(req => (
                    <div key={req.id} className="rounded-xl border border-primary/30 bg-primary/5 p-3 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{req.friend_profile?.display_name || req.friend_profile?.username || 'Unbekannt'}</p>
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
                    </div>
                  ))}
                </div>
              )}

              {friends.length === 0 ? (
                <div className="py-12 text-center">
                  <Users className="w-12 h-12 mx-auto text-muted-foreground/20 mb-3" />
                  <p className="text-sm text-muted-foreground">Noch keine Freunde</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {friends.map(friend => {
                    const profile = friend.friend_profile;
                    const initial = (profile?.display_name || profile?.username || '?')[0].toUpperCase();
                    return (
                      <div
                        key={friend.id}
                        className="rounded-xl bg-card border border-border p-3 flex items-center gap-3 cursor-pointer hover:bg-secondary/30 transition-colors"
                        onClick={() => {
                          setDetailFriend(profile || null);
                          setDetailFriendshipId(friend.id);
                          setShowDetail(true);
                        }}
                      >
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-bold">
                          {initial}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{profile?.display_name || profile?.username || 'Unbekannt'}</p>
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Flame className="w-3 h-3 text-orange-500" />
                            {profile?.streak_days || 0} Tage
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs gap-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFriend(friend);
                            setChallengeDialogOpen(true);
                          }}
                        >
                          <Swords className="w-3 h-3" />
                          Challenge
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}

              {sentRequests.length > 0 && (
                <div className="space-y-2 pt-2">
                  <p className="text-xs font-medium text-muted-foreground">Gesendet ({sentRequests.length})</p>
                  {sentRequests.map(req => (
                    <div key={req.id} className="rounded-xl bg-card border border-border/30 p-3 flex items-center justify-between opacity-60">
                      <p className="text-sm">{req.friend_profile?.display_name || req.friend_profile?.username || 'Unbekannt'}</p>
                      <span className="text-[10px] text-muted-foreground">Ausstehend</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'shared' && (
            <SharedHabitsSection friends={friendProfiles} />
          )}

          {activeTab === 'challenges' && (
            <div className="space-y-3">
              {pendingChallenges.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Einladungen</p>
                  {pendingChallenges.map(c => (
                    <div key={c.id} className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
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
                    </div>
                  ))}
                </div>
              )}

              {activeChallenges.length === 0 && pendingChallenges.length === 0 ? (
                <div className="py-12 text-center">
                  <Trophy className="w-12 h-12 mx-auto text-muted-foreground/20 mb-3" />
                  <p className="text-sm text-muted-foreground">Keine aktiven Challenges</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {activeChallenges.map(c => {
                    const myP = c.my_progress || 0;
                    const oppP = c.opponent_progress || 0;
                    const amWinning = myP > oppP;
                    return (
                      <div key={c.id} className="rounded-xl bg-card border border-border p-3 space-y-2">
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
                            <p className="text-lg font-bold">{myP}</p>
                            <p className="text-[10px] text-muted-foreground">Du</p>
                          </div>
                          <div className="text-center p-2 rounded-lg bg-secondary/30">
                            <p className="text-lg font-bold">{oppP}</p>
                            <p className="text-[10px] text-muted-foreground">{c.opponent_profile?.username}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'discover' && (
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Nutzer suchen..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 rounded-xl"
                />
              </div>
              {availableUsers.length === 0 ? (
                <div className="py-12 text-center">
                  <UserPlus className="w-12 h-12 mx-auto text-muted-foreground/20 mb-3" />
                  <p className="text-sm text-muted-foreground">Keine Nutzer gefunden</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {availableUsers.map(u => (
                    <div key={u.id} className="rounded-xl bg-card border border-border p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-bold text-muted-foreground">
                          {(u.display_name || u.username || '?')[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{u.display_name || u.username || 'Unbekannt'}</p>
                          <p className="text-[10px] text-muted-foreground">Streak: {u.streak_days || 0} Tage</p>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => sendFriendRequest(u.user_id)}>
                        <UserPlus className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Tab Bar */}
        <div className="fixed bottom-0 left-0 right-0 z-50 safe-area-bottom">
          <div className="bg-background/95 backdrop-blur-xl border-t border-border/50">
            <div className="max-w-2xl mx-auto">
              <div className="flex justify-around items-center h-16 px-2">
                {tabs.map(tab => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex flex-col items-center justify-center gap-0.5 py-2 px-2 rounded-xl transition-all duration-200 ${
                        isActive ? 'text-primary' : 'text-muted-foreground'
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${isActive ? 'text-primary' : ''}`} />
                      <span className={`text-[9px] font-medium ${isActive ? 'text-primary' : ''}`}>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Friend Detail Sheet */}
        <FriendDetailSheet
          friend={detailFriend}
          friendshipId={detailFriendshipId}
          open={showDetail}
          onOpenChange={setShowDetail}
          onRemove={removeFriend}
        />

        {/* Privacy Settings Dialog */}
        <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Teilen-Einstellungen</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <p className="text-xs text-muted-foreground">Was duerfen Freunde sehen?</p>
              {[
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
                Fordere {selectedFriend?.friend_profile?.display_name || selectedFriend?.friend_profile?.username} heraus
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
