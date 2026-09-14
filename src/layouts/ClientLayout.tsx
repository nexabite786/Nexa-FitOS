import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Dumbbell, Calendar, History, TrendingUp, User, LogOut, ArrowLeft, ShieldAlert, Utensils, ClipboardCheck, Bot } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useTenantStore } from '../store/tenantStore';
import { auth, db } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { Button } from '../components/ui/button';

export function ClientLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile } = useAuthStore();
  const { tenantId, tenantData, memberData } = useTenantStore();

  const previewClientId = searchParams.get('asClientId');
  const [clientProfile, setClientProfile] = useState<any>(null);

  // If owner previewing client or direct client
  const effectiveClientId = previewClientId || memberData?.clientId || profile?.clientId;
  const isPreviewMode = !!previewClientId || memberData?.role === 'GYM_OWNER' || memberData?.role === 'TRAINER';

  useEffect(() => {
    async function loadClientInfo() {
      if (!tenantId || !effectiveClientId) return;
      try {
        const cDoc = await getDoc(doc(db, 'tenants', tenantId, 'clients', effectiveClientId));
        if (cDoc.exists()) {
          setClientProfile(cDoc.data());
        }
      } catch (err) {
        console.warn('Could not load client profile:', err);
      }
    }
    loadClientInfo();
  }, [tenantId, effectiveClientId]);

  const handleSignOut = async () => {
    await signOut(auth);
    navigate('/login');
  };

  const navItems = [
    {
      to: previewClientId ? `/client/dashboard?asClientId=${previewClientId}` : '/client/dashboard',
      label: 'Today',
      icon: Dumbbell,
      active: location.pathname === '/client/dashboard'
    },
    {
      to: previewClientId ? `/client/workouts?asClientId=${previewClientId}` : '/client/workouts',
      label: 'Workouts',
      icon: Calendar,
      active: location.pathname === '/client/workouts'
    },
    {
      to: previewClientId ? `/client/nutrition?asClientId=${previewClientId}` : '/client/nutrition',
      label: 'Nutrition',
      icon: Utensils,
      active: location.pathname.startsWith('/client/nutrition')
    },
    {
      to: previewClientId ? `/client/accountability?asClientId=${previewClientId}` : '/client/accountability',
      label: 'Habits & Check-in',
      icon: ClipboardCheck,
      active: location.pathname.startsWith('/client/accountability') || location.pathname.startsWith('/client/check-in')
    },
    {
      to: previewClientId ? `/client/progress?asClientId=${previewClientId}` : '/client/progress',
      label: 'Progress',
      icon: TrendingUp,
      active: location.pathname.startsWith('/client/progress')
    },
    {
      to: previewClientId ? `/client/ai-coach?asClientId=${previewClientId}` : '/client/ai-coach',
      label: 'AI Coach',
      icon: Bot,
      active: location.pathname === '/client/ai-coach'
    },
    {
      to: previewClientId ? `/client/workouts/history?asClientId=${previewClientId}` : '/client/workouts/history',
      label: 'History',
      icon: History,
      active: location.pathname === '/client/workouts/history'
    },
    {
      to: previewClientId ? `/client/profile?asClientId=${previewClientId}` : '/client/profile',
      label: 'Profile',
      icon: User,
      active: location.pathname === '/client/profile'
    }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Banner for Owner/Trainer Preview Mode */}
      {isPreviewMode && effectiveClientId && (
        <div className="bg-primary/10 border-b border-primary/20 px-4 py-2 text-xs flex items-center justify-between z-50">
          <div className="flex items-center gap-2 text-primary font-medium">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>
              Previewing Client: <strong className="text-foreground">{clientProfile ? `${clientProfile.firstName} ${clientProfile.lastName}` : 'Client View'}</strong>
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(previewClientId ? `/owner/clients/${previewClientId}` : '/owner/dashboard')}
            className="h-6 text-[11px] px-2 text-primary hover:text-primary hover:bg-primary/20"
          >
            <ArrowLeft className="w-3 h-3 mr-1" /> Return to Owner View
          </Button>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/90 backdrop-blur border-b border-border/40 px-4 lg:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center font-display font-bold text-sm">
            {tenantData?.name ? tenantData.name[0] : 'N'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold font-display tracking-tight text-foreground">
                {tenantData?.name || 'NEXA FITOS'}
              </span>
              <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/10 text-primary font-semibold">
                Client Portal
              </span>
            </div>
            <p className="text-xs text-muted-foreground truncate max-w-[180px] sm:max-w-xs">
              {clientProfile
                ? `${clientProfile.firstName} ${clientProfile.lastName}`
                : profile?.firstName
                ? `${profile.firstName} ${profile.lastName}`
                : 'Athlete'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-1 mr-2">
            {navItems.map(item => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  to={item.to}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    item.active
                      ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="h-8 px-2.5 text-xs text-muted-foreground hover:text-destructive"
            title="Sign Out"
          >
            <LogOut className="w-3.5 h-3.5 sm:mr-1.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 pb-20 md:pb-8">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation Bar (Mobile First) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur border-t border-border/50 px-2 py-1.5 flex items-center justify-around">
        {navItems.map(item => {
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              to={item.to}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg text-[10px] font-medium transition-all ${
                item.active
                  ? 'text-primary font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <div
                className={`p-1.5 rounded-full mb-0.5 transition-colors ${
                  item.active ? 'bg-primary/15 text-primary' : ''
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
