import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Award,
  Calendar,
  Clock,
  Dumbbell,
  TrendingUp,
  ArrowRight,
  ShieldAlert,
  Search
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import {
  fetchTrainerAnalytics,
  TrainerAnalyticsData,
  TimeRange
} from '../../lib/analyticsService';
import { CoachInsightsFeed } from './CoachInsightsFeed';

interface TrainerAnalyticsViewProps {
  tenantId: string;
  trainerId: string;
}

export function TrainerAnalyticsView({ tenantId, trainerId }: TrainerAnalyticsViewProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<TrainerAnalyticsData | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('30D');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function load() {
      if (!tenantId || !trainerId) return;
      setLoading(true);
      try {
        const res = await fetchTrainerAnalytics(tenantId, trainerId, timeRange);
        setData(res);
      } catch (err) {
        console.error('Failed to load trainer analytics:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [tenantId, trainerId, timeRange]);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-card rounded-2xl border border-border/40" />
          ))}
        </div>
        <div className="h-64 bg-card rounded-2xl border border-border/40" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 text-center rounded-2xl bg-card border border-border/50">
        <p className="text-sm text-muted-foreground">Unable to load trainer analytics data.</p>
      </div>
    );
  }

  const filteredRoster = data.roster.filter(c =>
    c.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* KPI Top Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card className="bg-card/70 border-border/60">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">Assigned Athletes</span>
              <Users className="w-4 h-4 text-primary" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-display text-foreground">
              {data.assignedClientsCount}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">
              {data.activeClientsCount} active
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/70 border-border/60">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">Workouts Logged</span>
              <CheckCircle2 className="w-4 h-4 text-green-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-display text-foreground">
              {data.totalWorkoutsCompleted}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">
              across roster
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/70 border-border/60">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">Average Adherence</span>
              <TrendingUp className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-display text-foreground">
              {data.averageCompletionRate !== null ? `${data.averageCompletionRate}%` : '—'}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">
              30-day scheduled rate
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/70 border-border/60">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">Attention Alerts</span>
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-display text-foreground">
              {data.insights.filter(i => i.severity === 'critical' || i.severity === 'warning').length}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">
              requiring check-in
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Coach Insights Section */}
      <CoachInsightsFeed
        insights={data.insights}
        title="Coach Attention & Insights"
        description="Rule-based notifications regarding athlete adherence, lapses, and records."
      />

      {/* Athlete Training Roster */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold font-display text-foreground">
              Athlete Training Roster
            </h3>
            <p className="text-xs text-muted-foreground">
              Training engagement, adherence rates, and recent activity for assigned clients.
            </p>
          </div>

          <div className="w-full sm:w-64">
            <input
              type="text"
              placeholder="Search athlete by name..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full h-9 px-3 rounded-xl bg-card border border-border/60 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {filteredRoster.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-card border border-border/50 text-xs text-muted-foreground">
            No athletes found matching criteria.
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredRoster.map(client => {
              const isInactive = client.activityTag === 'INACTIVE';
              const needsAttention = client.activityTag === 'NEEDS_ATTENTION';
              const isHighPerformer = client.activityTag === 'HIGH_PERFORMER';

              return (
                <div
                  key={client.clientId}
                  className="p-4 rounded-2xl bg-card border border-border/50 hover:border-border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center font-bold text-sm text-primary flex-shrink-0">
                      {client.avatarInitials}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/owner/clients/${client.clientId}`}
                          className="text-sm font-bold text-foreground hover:text-primary transition-colors truncate"
                        >
                          {client.clientName}
                        </Link>
                        {isInactive ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20">
                            Inactive ({client.daysSinceLastWorkout !== undefined ? `${client.daysSinceLastWorkout}d` : 'No logs'})
                          </span>
                        ) : needsAttention ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            Low Adherence
                          </span>
                        ) : isHighPerformer ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500/10 text-green-400 border border-green-500/20">
                            100% Streak
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-accent text-muted-foreground">
                            On Track
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-muted-foreground truncate mt-0.5">
                        {client.currentProgramName ? (
                          <span>Program: {client.currentProgramName}</span>
                        ) : (
                          <span className="italic">No active program assigned</span>
                        )}
                        {client.lastWorkoutDate && (
                          <span className="ml-2">· Last: {client.lastWorkoutDate}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Quick stats columns */}
                  <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs text-muted-foreground">
                    <div className="text-right sm:text-left">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                        7-Day Rate
                      </span>
                      <span className="text-xs font-semibold text-foreground">
                        {client.completionRate7D !== null ? `${client.completionRate7D}%` : '—'}
                      </span>
                    </div>

                    <div className="text-right sm:text-left">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                        Workouts
                      </span>
                      <span className="text-xs font-semibold text-foreground">
                        {client.totalWorkoutsCompleted}
                      </span>
                    </div>

                    <div className="text-right sm:text-left">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                        Total Volume
                      </span>
                      <span className="text-xs font-semibold text-amber-400">
                        {client.totalVolumeKg.toLocaleString()} kg
                      </span>
                    </div>

                    <div className="text-right sm:text-left">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                        PRs
                      </span>
                      <span className="text-xs font-semibold text-yellow-400">
                        {client.recentPRCount} 🏆
                      </span>
                    </div>

                    <Link
                      to={`/owner/clients/${client.clientId}`}
                      className="p-2 rounded-xl bg-accent text-foreground hover:bg-primary hover:text-primary-foreground transition-colors ml-auto sm:ml-0"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
