import React from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  UserSquare2, 
  Settings as SettingsIcon, 
  LogOut, 
  Paintbrush,
  Dumbbell,
  MessageSquare,
  LineChart,
  Calendar,
  ClipboardCheck,
  CreditCard,
  User,
  Utensils
} from 'lucide-react';
import { auth } from '../lib/firebase';
import { useAuthStore } from '../store/authStore';
import { useTenantStore } from '../store/tenantStore';

export function OwnerLayout() {
  const { user, profile, loading: authLoading } = useAuthStore();
  const { tenantData, loading: tenantLoading } = useTenantStore();
  const navigate = useNavigate();
  const location = useLocation();

  if (authLoading || tenantLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
          <p className="text-muted-foreground text-sm tracking-widest uppercase">Loading</p>
        </div>
      </div>
    );
  }

  if (!user || !profile?.onboardingComplete) {
    navigate('/login');
    return null;
  }

  const handleLogout = () => {
    auth.signOut();
    navigate('/login');
  };

  const navGroups = [
    {
      items: [
        { name: 'Dashboard', href: '/owner/dashboard', icon: LayoutDashboard, active: true },
        { name: 'Clients', href: '/owner/clients', icon: Users, active: true },
        { name: 'Trainers', href: '/owner/trainers', icon: UserSquare2, active: true },
        { 
          name: 'Programs', 
          href: '/owner/programs', 
          icon: Dumbbell, 
          active: true,
          subItems: [
            { name: 'Workout Programs', href: '/owner/programs', active: true },
            { name: 'Exercise Library', href: '/owner/exercises', active: true },
          ]
        },
        { name: 'Nutrition', href: '/owner/nutrition', icon: Utensils, active: true },
        { name: 'Check-ins & Habits', href: '/owner/check-ins', icon: ClipboardCheck, active: true },
        { name: 'Messages', href: '#', icon: MessageSquare, active: false },
      ]
    },
    {
      items: [
        { name: 'Progress', href: '#', icon: LineChart, active: false },
        { name: 'Calendar', href: '#', icon: Calendar, active: false },
        { name: 'Attendance', href: '#', icon: ClipboardCheck, active: false },
        { name: 'Billing', href: '/owner/settings/billing', icon: CreditCard, active: true },
      ]
    },
    {
      items: [
        { name: 'Branding', href: '/owner/branding', icon: Paintbrush, active: true },
        { name: 'Settings', href: '/owner/settings', icon: SettingsIcon, active: true },
      ]
    }
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background md:flex-row text-foreground">
      {/* Desktop Sidebar */}
      <aside className="hidden w-72 flex-col border-r border-border bg-card md:flex">
        <div className="flex flex-col p-6 border-b border-border">
          <div className="flex items-baseline gap-2 mb-6">
            <h1 className="text-xl font-display font-bold tracking-tight">NEXA FITOS</h1>
            <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-md bg-accent flex items-center justify-center font-display font-bold text-lg text-primary">
              {tenantData?.name?.charAt(0) || 'N'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{tenantData?.name || 'My Business'}</p>
              <p className="text-xs text-muted-foreground truncate">Owner Portal</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-6">
          {navGroups.map((group, idx) => (
            <div key={idx} className="space-y-1">
              {idx > 0 && <div className="h-px w-full bg-border/50 mb-4 mt-2"></div>}
              {group.items.map((item: any) => {
                const Icon = item.icon;
                const hasSubItems = Boolean(item.subItems && item.subItems.length > 0);
                const isCurrentRoute = item.active && (
                  location.pathname === item.href ||
                  (hasSubItems && item.subItems?.some((sub: any) => location.pathname.startsWith(sub.href)))
                );
                return (
                  <div key={item.name} className="space-y-1">
                    <Link
                      to={item.active ? item.href : '#'}
                      onClick={(e) => {
                        if (!item.active) e.preventDefault();
                      }}
                      className={`flex items-center justify-between rounded-md px-3 py-2.5 text-sm font-medium transition-all group ${
                        isCurrentRoute
                          ? 'bg-accent text-foreground'
                          : item.active
                          ? 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                          : 'text-muted-foreground/50 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`h-5 w-5 ${isCurrentRoute ? 'text-primary' : item.active ? 'group-hover:text-primary transition-colors' : ''}`} />
                        {item.name}
                      </div>
                      {!item.active ? (
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground/50">Soon</span>
                      ) : null}
                    </Link>

                    {/* Sub-items rendering */}
                    {hasSubItems && (
                      <div className="ml-5 pl-3 border-l border-border/60 space-y-1 pt-0.5">
                        {item.subItems?.map((sub: any) => {
                          const isSubActive = sub.active && location.pathname.startsWith(sub.href);
                          return (
                            <Link
                              key={sub.name}
                              to={sub.active ? sub.href : '#'}
                              onClick={(e) => {
                                if (!sub.active) e.preventDefault();
                              }}
                              className={`flex items-center justify-between rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                                isSubActive
                                  ? 'text-primary bg-primary/10 font-semibold'
                                  : sub.active
                                  ? 'text-muted-foreground hover:text-foreground hover:bg-accent/40'
                                  : 'text-muted-foreground/40 cursor-not-allowed'
                              }`}
                            >
                              <span>{sub.name}</span>
                              {sub.badge && (
                                <span className="text-[9px] uppercase tracking-wider text-muted-foreground/50">{sub.badge}</span>
                              )}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-border space-y-2">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center text-primary">
              <User className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{profile?.firstName} {profile?.lastName}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent/50 hover:text-destructive transition-colors"
          >
            <LogOut className="h-5 w-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Mobile Header */}
        <header className="flex h-16 items-center justify-between border-b border-border bg-card px-4 md:hidden">
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-display font-bold">{tenantData?.name || 'NEXA FITOS'}</span>
            <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
          </div>
          <button onClick={handleLogout} className="text-muted-foreground"><LogOut className="h-5 w-5" /></button>
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-8 bg-background">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </div>

        {/* Mobile Nav */}
        <nav className="flex border-t border-border bg-card p-2 pb-safe md:hidden justify-around">
          {navGroups[0].items.filter(i => i.active).map((item) => {
            const Icon = item.icon;
            const isCurrentRoute = location.pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex flex-col items-center p-2 text-xs font-medium transition-colors ${
                  isCurrentRoute ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <Icon className="h-5 w-5 mb-1" />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </main>
    </div>
  );
}
