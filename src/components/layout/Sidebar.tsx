import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  Warehouse,
  LayoutDashboard,
  GraduationCap,
  User,
  Briefcase,
  LogOut,
  Menu,
  X,
  Settings,
  Flame,
  Zap,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useTimeScore } from '@/hooks/useTimeScore';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/schule', icon: GraduationCap, label: 'Schule' },
  { to: '/privat', icon: User, label: 'Privat' },
  { to: '/business', icon: Briefcase, label: 'Business' },
];

const getPageTitle = (pathname: string): string => {
  if (pathname === '/') return 'Dashboard';
  if (pathname === '/schule') return 'Schule';
  if (pathname === '/privat') return 'Privat';
  if (pathname === '/business') return 'Business';
  if (pathname === '/kalender') return 'Kalender';
  if (pathname === '/profil') return 'Profil';
  return 'LifeOS';
};


export function Sidebar() {
  const [expanded, setExpanded] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { signOut, user } = useAuth();
  const { profile } = useProfile();
  const { score, hasActiveTracker } = useTimeScore();
  const location = useLocation();

  const streakDays = profile?.streak_days || 0;

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Close mobile menu on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const pageTitle = getPageTitle(location.pathname);

  return (
    <TooltipProvider delayDuration={0}>
      {/* Mobile Header Bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 h-12 bg-sidebar border-b border-sidebar-border flex items-center justify-between px-3">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-1.5 h-8 w-8"
          >
            {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </Button>
          <NavLink to="/" className="flex items-center">
            <Warehouse className="w-4 h-4 text-primary" />
          </NavLink>
          <span className="text-sm font-semibold">{pageTitle}</span>
        </div>
        
        {/* Time Score & Streak in header */}
        <div className="flex items-center gap-2">
          {/* Time Score */}
          <div className={cn(
            "flex items-center gap-1 px-2 py-1 rounded-full transition-colors",
            hasActiveTracker ? "bg-primary/10 text-primary" : "text-muted-foreground"
          )}>
            <Zap className={cn("w-3.5 h-3.5", hasActiveTracker && "animate-pulse")} />
            <span className="text-xs font-bold font-mono tabular-nums">{score.toFixed(0)}</span>
          </div>
          
          {/* Streak */}
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${streakDays > 0 ? 'bg-streak/10 text-streak' : 'text-muted-foreground'}`}>
            <Flame className="w-3.5 h-3.5" />
            <span className="text-xs font-bold font-mono">{streakDays}</span>
          </div>
        </div>
      </div>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'h-screen flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300',
          // Desktop styles
          'hidden md:flex md:sticky md:top-0',
          expanded ? 'md:w-56' : 'md:w-14',
          // Mobile styles
          mobileOpen && 'fixed top-12 left-0 bottom-0 w-64 z-50 flex'
        )}
      >
        {/* Desktop Logo & Toggle */}
        <div className="hidden md:flex p-2 border-b border-sidebar-border items-center justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="p-2"
          >
            {expanded ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </Button>
          {expanded && (
            <div className="flex items-center gap-2 ml-2">
              <Warehouse className="w-5 h-5 text-primary" />
              <span className="text-lg font-bold text-gradient-primary">LifeOS</span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.to;
            const isMobileOrExpanded = mobileOpen || expanded;
            const linkContent = (
              <NavLink
                key={item.to}
                to={item.to}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group',
                  isMobileOrExpanded ? '' : 'justify-center',
                  isActive
                    ? 'bg-primary/20 text-primary'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                )}
              >
                <item.icon
                  className={cn(
                    'w-5 h-5 shrink-0 transition-colors',
                    isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                  )}
                />
                {isMobileOrExpanded && (
                  <span className="font-medium truncate">{item.label}</span>
                )}
              </NavLink>
            );

            if (!isMobileOrExpanded) {
              return (
                <Tooltip key={item.to}>
                  <TooltipTrigger asChild>
                    {linkContent}
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return linkContent;
          })}
        </nav>

        {/* User & Logout */}
        <div className="p-2 border-t border-sidebar-border space-y-1">
          {/* Profile Link */}
          {(() => {
            const isProfileActive = location.pathname === '/profil';
            const isMobileOrExpanded = mobileOpen || expanded;
            const profileLink = (
              <NavLink
                to="/profil"
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group',
                  isMobileOrExpanded ? '' : 'justify-center',
                  isProfileActive
                    ? 'bg-primary/20 text-primary'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                )}
              >
                <Settings
                  className={cn(
                    'w-5 h-5 shrink-0 transition-colors',
                    isProfileActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                  )}
                />
                {isMobileOrExpanded && (
                  <span className="font-medium truncate">Profil</span>
                )}
              </NavLink>
            );

            if (!isMobileOrExpanded) {
              return (
                <Tooltip>
                  <TooltipTrigger asChild>
                    {profileLink}
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    Profil
                  </TooltipContent>
                </Tooltip>
              );
            }
            return profileLink;
          })()}

          {(mobileOpen || expanded) && user && (
            <div className="px-3 py-2 text-xs text-muted-foreground truncate">
              {user.email}
            </div>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => signOut()}
                className={cn(
                  'w-full text-muted-foreground hover:text-destructive',
                  (mobileOpen || expanded) ? 'justify-start gap-3' : 'justify-center px-0'
                )}
              >
                <LogOut className="w-4 h-4" />
                {(mobileOpen || expanded) && 'Abmelden'}
              </Button>
            </TooltipTrigger>
            {!(mobileOpen || expanded) && (
              <TooltipContent side="right">
                Abmelden
              </TooltipContent>
            )}
          </Tooltip>
        </div>
      </aside>
    </TooltipProvider>
  );
}
