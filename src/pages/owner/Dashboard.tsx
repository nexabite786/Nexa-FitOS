import React, { useEffect, useState } from 'react';
import { collection, query, where, getCountFromServer } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuthStore } from '../../store/authStore';
import { useTenantStore } from '../../store/tenantStore';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import {
  Users,
  UserSquare2,
  Activity,
  ArrowRight,
  CheckCircle2,
  Circle,
  Dumbbell,
  Flame,
  Trophy,
  Clock,
  Sparkles,
  TrendingUp,
  BarChart3
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { Button } from '../../components/ui/button';
import { Link, useNavigate } from 'react-router-dom';
import {
  fetchGymOwnerOverviewAnalytics,
  GymOwnerOverviewAnalytics,
  TimeRange
} from '../../lib/analyticsService';
import { CoachInsightsFeed } from '../../components/analytics/CoachInsightsFeed';

export function Dashboard() {
  const navigate = useNavigate();
  const { profile } = useAuthStore();
  const { tenantId, tenantData } = useTenantStore();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>('30D');
  const [analytics, setAnalytics] = useState<GymOwnerOverviewAnalytics | null>(null);

  useEffect(() => {
    if (!tenantId) return;
    
    async function loadGymDashboard() {
      setLoading(true);
      try {
        const data = await fetchGymOwnerOverviewAnalytics(tenantId as string, timeRange);
        setAnalytics(data);
      } catch (err) {
        console.error("Error fetching gym analytics:", err);
      } finally {
        setLoading(false);
      }
    }
    
    loadGymDashboard();
  }, [tenantId, timeRange]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-display font-semibold tracking-tight text-foreground">
            Good morning, {profile?.firstName || 'Owner'}
          </h1>
          <p className="text-muted-foreground mt-1 text-base sm:text-lg">
            Here's what's happening at <span className="text-foreground font-medium">{tenantData?.name || 'your business'}</span>.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <Link to="/owner/programs" className="flex-1 md:flex-none">
            <Button variant="outline" className="w-full text-xs font-semibold">
              <Dumbbell className="mr-1.5 h-3.5 w-3.5" /> Programs
            </Button>
          </Link>
          <Link to="/owner/clients" className="flex-1 md:flex-none">
            <Button className="w-full text-xs font-bold">
              Add Client <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Primary KPI Top Grid */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
        <Card className="bg-card/50 backdrop-blur border-border/50 hover:border-border transition-colors">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Total Clients</span>
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-4 w-4 text-primary" />
              </div>
            </div>
            <div className="text-3xl font-display font-semibold text-foreground">
              {loading ? <span className="opacity-50">—</span> : analytics?.totalClients || 0}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">
              {analytics?.activeClients || 0} active members
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card/50 backdrop-blur border-border/50 hover:border-border transition-colors">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">This Week</span>
              <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </div>
            </div>
            <div className="text-3xl font-display font-semibold text-foreground">
              {loading ? <span className="opacity-50">—</span> : analytics?.workoutsThisWeek || 0}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">
              workouts completed
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur border-border/50 hover:border-border transition-colors">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">This Month</span>
              <div className="h-8 w-8 rounded-full bg-amber-500/10 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-amber-400" />
              </div>
            </div>
            <div className="text-3xl font-display font-semibold text-foreground">
              {loading ? <span className="opacity-50">—</span> : analytics?.workoutsThisMonth || 0}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">
              workouts completed
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur border-border/50 hover:border-border transition-colors">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Coaches</span>
              <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                <UserSquare2 className="h-4 w-4 text-blue-500" />
              </div>
            </div>
            <div className="text-3xl font-display font-semibold text-foreground">
              {loading ? <span className="opacity-50">—</span> : analytics?.totalTrainers || 0}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">
              active trainers
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur border-border/50 hover:border-border transition-colors col-span-2 md:col-span-4 lg:col-span-1">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Total Workouts</span>
              <div className="h-8 w-8 rounded-full bg-purple-500/10 flex items-center justify-center">
                <Dumbbell className="h-4 w-4 text-purple-400" />
              </div>
            </div>
            <div className="text-3xl font-display font-semibold text-foreground">
              {loading ? <span className="opacity-50">—</span> : analytics?.totalWorkoutsAllTime || 0}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">
              all-time logged
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gym-Wide Training Volume Chart */}
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-base font-bold font-display text-foreground">
              Gym Training Volume
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Cumulative weighted volume (kg) moved by athletes across your gym.
            </p>
          </div>

          <div className="inline-flex p-1 rounded-xl bg-card border border-border/50 text-xs font-semibold">
            {(['7D', '30D', '90D', '1Y'] as TimeRange[]).map(r => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  timeRange === r
                    ? 'bg-primary text-primary-foreground font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {!analytics || analytics.volumeOverTime.length < 2 ? (
            <div className="py-14 text-center space-y-2">
              <BarChart3 className="w-8 h-8 text-muted-foreground mx-auto" />
              <p className="text-sm font-semibold text-foreground">
                Training data will appear here as athletes complete workouts.
              </p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Once athletes log their training sets in the workout player, gym-wide volume trends render automatically.
              </p>
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={analytics.volumeOverTime}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="gymVolGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#E5A93C" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#E5A93C" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="label" stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `${v >= 1000 ? `${Math.round(v / 1000)}k` : v}`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#18181b',
                      borderColor: '#27272a',
                      borderRadius: '0.75rem',
                      color: '#fff',
                      fontSize: '12px'
                    }}
                    formatter={(val: any) => [`${Number(val).toLocaleString()} kg`, 'Gym Volume']}
                  />
                  <Area
                    type="monotone"
                    dataKey="volumeKg"
                    stroke="#E5A93C"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#gymVolGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2-Column Grid: Coach Attention Insights + Recent Workouts Feed */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: Coach Attention Insights */}
        <div className="space-y-4">
          <CoachInsightsFeed
            insights={analytics?.insights || []}
            title="Coach Attention & Insights"
            description="Rule-based notifications for client training lapses and achievements."
            emptyMessage="All clients are currently on track with their training schedules."
          />
        </div>

        {/* Right: Recent Completed Workouts Feed */}
        <div className="space-y-4">
          <div>
            <h3 className="text-base font-bold font-display text-foreground flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Recent Completed Workouts
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Live feed of training sessions completed across your gym.
            </p>
          </div>

          {!analytics || analytics.recentWorkouts.length === 0 ? (
            <Card className="border-border/50 bg-card/50">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center mb-3">
                  <Activity className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm font-semibold text-foreground">No recent workout activity</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                  When athletes finish workouts in the player, real-time records appear here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2.5">
              {analytics.recentWorkouts.map(w => (
                <div
                  key={w.id}
                  onClick={() => navigate(`/owner/clients/${w.clientId}`)}
                  className="p-3.5 rounded-2xl bg-card border border-border/50 hover:border-border transition-all flex items-center justify-between gap-3 cursor-pointer group shadow-sm"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors truncate">
                        {w.clientName}
                      </span>
                      {w.prsCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                          🏆 {w.prsCount} PR
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground truncate mt-0.5">
                      {w.workoutName} · {w.durationMinutes}m · {w.volumeKg > 0 ? `${w.volumeKg.toLocaleString()} kg` : 'Bodyweight'}
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0 text-xs text-muted-foreground">
                    <span className="text-[11px] block">
                      {new Date(w.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    <span className="text-[10px] text-primary group-hover:underline flex items-center gap-0.5 justify-end">
                      View Profile <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
