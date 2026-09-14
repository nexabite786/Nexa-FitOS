import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { 
  Dumbbell, 
  Flame, 
  CheckCircle2, 
  Play, 
  Calendar, 
  ArrowRight, 
  Coffee, 
  Clock, 
  Award,
  Sparkles,
  AlertCircle,
  ClipboardCheck,
  Target
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { useAuthStore } from '../../store/authStore';
import { useTenantStore } from '../../store/tenantStore';
import { 
  getClientTodayWorkout, 
  fetchClientAllScheduledWorkouts 
} from '../../lib/workoutSessionService';
import { TodayWorkoutState } from '../../types/workoutSession';
import { fetchClientHabits, fetchClientCheckIns } from '../../lib/accountabilityService';
import { CheckInRecord, Habit } from '../../types/accountability';

export function ClientDashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile } = useAuthStore();
  const { tenantId, memberData } = useTenantStore();

  const previewClientId = searchParams.get('asClientId');
  const effectiveClientId = previewClientId || memberData?.clientId || profile?.clientId;
  const clientQueryParam = previewClientId ? `?asClientId=${previewClientId}` : '';

  const [loading, setLoading] = useState(true);
  const [todayState, setTodayState] = useState<TodayWorkoutState | null>(null);
  const [weeklyStats, setWeeklyStats] = useState({ completed: 0, scheduled: 0 });
  const [dueCheckIn, setDueCheckIn] = useState<CheckInRecord | null>(null);
  const [habitsCount, setHabitsCount] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboard() {
      if (!tenantId || !effectiveClientId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const [todayRes, allRes, habitsList, checkInsList] = await Promise.all([
          getClientTodayWorkout(tenantId, effectiveClientId),
          fetchClientAllScheduledWorkouts(tenantId, effectiveClientId),
          fetchClientHabits(tenantId, effectiveClientId).catch(() => []),
          fetchClientCheckIns(tenantId, effectiveClientId).catch(() => [])
        ]);
        setTodayState(todayRes);
        setWeeklyStats({
          completed: allRes.weeklyCompletedCount,
          scheduled: allRes.weeklyScheduledCount
        });
        setHabitsCount(habitsList.length);
        const due = checkInsList.find(c => c.status === 'DUE' || c.status === 'DRAFT' || c.status === 'OVERDUE');
        setDueCheckIn(due || null);
      } catch (err: any) {
        console.error('Error loading client dashboard:', err);
        setError('Failed to load workout schedule. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, [tenantId, effectiveClientId]);

  const handleStartWorkout = (workoutId: string) => {
    const url = previewClientId 
      ? `/client/workouts/${workoutId}?asClientId=${previewClientId}` 
      : `/client/workouts/${workoutId}`;
    navigate(url);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6 animate-pulse">
        <div className="h-20 bg-card rounded-2xl border border-border/40" />
        <div className="h-64 bg-card rounded-2xl border border-border/40" />
        <div className="h-32 bg-card rounded-2xl border border-border/40" />
      </div>
    );
  }

  if (!effectiveClientId) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-400 mx-auto flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold font-display text-foreground">No Client Account Linked</h2>
        <p className="text-sm text-muted-foreground mt-2 mb-6">
          Your user profile is not linked to a client record in this gym yet. Please contact your coach or gym owner.
        </p>
        <Button onClick={() => navigate('/owner/dashboard')} variant="outline">
          Return to Gym Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 md:py-8 space-y-8 animate-in fade-in duration-300">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase tracking-widest text-primary font-bold">
            {todayState?.programName || 'Training Portal'}
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold font-display tracking-tight text-foreground mt-1">
            Welcome back, {profile?.firstName || 'Athlete'}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {todayState?.hasActiveProgram && (
          <Link
            to={previewClientId ? `/client/workouts?asClientId=${previewClientId}` : '/client/workouts'}
            className="inline-flex items-center text-xs font-semibold text-primary hover:underline gap-1 self-start sm:self-auto"
          >
            <Calendar className="w-3.5 h-3.5" /> View Full Schedule <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* TODAY'S WORKOUT SECTION */}
      {!todayState?.hasActiveProgram ? (
        // Empty State: No Active Program
        <div className="bg-card rounded-2xl border border-border/50 p-8 text-center space-y-4 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <Dumbbell className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-lg font-bold font-display text-foreground">No Active Training Program</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1">
              Your coach hasn't assigned a training program yet. Once assigned, your daily workouts and exercise prescriptions will appear here.
            </p>
          </div>
        </div>
      ) : todayState.isRestDay ? (
        // Rest Day Card
        <div className="bg-gradient-to-br from-card to-card/80 rounded-2xl border border-border/60 p-6 md:p-8 space-y-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                <Coffee className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400">Scheduled Rest</span>
                <h2 className="text-2xl font-bold font-display text-foreground">Rest & Recovery Day</h2>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Rest Day
            </span>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">
            Recovery is part of the program. Rest your muscles, stay hydrated, and prioritize quality sleep to prepare for your next training session.
          </p>

          {/* Next Scheduled Workout */}
          {todayState.nextScheduledWorkout && (
            <div className="pt-4 border-t border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Next Scheduled Workout</span>
                <div className="flex items-center gap-2 mt-1">
                  <h4 className="text-base font-bold text-foreground">
                    {todayState.nextScheduledWorkout.name}
                  </h4>
                  <span className="text-xs text-muted-foreground">
                    · {todayState.nextScheduledWorkout.dayOfWeek}, {todayState.nextScheduledWorkout.dateFormatted}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {todayState.nextScheduledWorkout.exerciseCount} exercises prescribed
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStartWorkout(todayState.nextScheduledWorkout!.workoutId)}
                className="self-start sm:self-auto h-9 text-xs"
              >
                Preview Next Workout <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </div>
          )}
        </div>
      ) : (
        // Active Workout Today Card
        <div className="relative overflow-hidden bg-gradient-to-br from-card via-card to-card/70 rounded-2xl border border-primary/30 p-6 md:p-8 space-y-6 shadow-md shadow-primary/5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary/20 text-primary border border-primary/30">
                  Today's Workout
                </span>
                {todayState.isOptional && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-muted text-muted-foreground">
                    Optional
                  </span>
                )}
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold font-display text-foreground tracking-tight">
                {todayState.workoutName}
              </h2>
              {todayState.workoutDescription && (
                <p className="text-sm text-muted-foreground mt-1 max-w-xl">
                  {todayState.workoutDescription}
                </p>
              )}
            </div>

            {/* Session status indicator */}
            {todayState.sessionStatus === 'COMPLETED' ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-500/10 text-green-400 border border-green-500/20">
                <CheckCircle2 className="w-3.5 h-3.5" /> Completed Today
              </span>
            ) : todayState.sessionStatus === 'IN_PROGRESS' ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
                <Flame className="w-3.5 h-3.5" /> In Progress
              </span>
            ) : null}
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
            <div className="p-3 rounded-xl bg-background/60 border border-border/40">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Prescribed</span>
              <p className="text-lg font-bold font-display text-foreground mt-0.5">
                {todayState.exerciseCount} <span className="text-xs font-normal text-muted-foreground">exercises</span>
              </p>
            </div>
            <div className="p-3 rounded-xl bg-background/60 border border-border/40">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Volume</span>
              <p className="text-lg font-bold font-display text-foreground mt-0.5">
                {todayState.totalSets} <span className="text-xs font-normal text-muted-foreground">sets</span>
              </p>
            </div>
            {todayState.targetMuscles && todayState.targetMuscles.length > 0 && (
              <div className="col-span-2 sm:col-span-1 p-3 rounded-xl bg-background/60 border border-border/40">
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Target</span>
                <p className="text-sm font-semibold text-foreground mt-1 truncate">
                  {todayState.targetMuscles.slice(0, 2).join(', ')}
                </p>
              </div>
            )}
          </div>

          {/* Primary Action Button */}
          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {todayState.sessionStatus === 'COMPLETED' ? (
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  onClick={() => handleStartWorkout(todayState.workoutId!)}
                  variant="outline"
                  className="h-12 px-6 rounded-xl font-semibold text-sm"
                >
                  Review Today's Session
                </Button>
                <Link
                  to={previewClientId ? `/client/workouts/history?asClientId=${previewClientId}` : '/client/workouts/history'}
                  className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                >
                  View in History <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ) : todayState.sessionStatus === 'IN_PROGRESS' ? (
              <Button
                onClick={() => handleStartWorkout(todayState.workoutId!)}
                className="h-14 px-8 rounded-xl font-bold text-base bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
              >
                <Play className="w-5 h-5 fill-current" /> Resume Workout
              </Button>
            ) : (
              <Button
                onClick={() => handleStartWorkout(todayState.workoutId!)}
                className="h-14 px-8 rounded-xl font-bold text-base bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
              >
                <Play className="w-5 h-5 fill-current" /> Start Today's Workout
              </Button>
            )}
          </div>
        </div>
      )}

      {/* WEEKLY PROGRESS SECTION */}
      {todayState?.hasActiveProgram && (
        <div className="bg-card rounded-2xl border border-border/50 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Award className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold font-display text-foreground">Weekly Consistency</h3>
            </div>
            <span className="text-xs font-bold text-foreground">
              {weeklyStats.completed} of {weeklyStats.scheduled} workouts
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2.5 bg-accent/60 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${weeklyStats.scheduled > 0 ? Math.min(100, Math.round((weeklyStats.completed / weeklyStats.scheduled) * 100)) : 0}%`
              }}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            {weeklyStats.completed === weeklyStats.scheduled && weeklyStats.scheduled > 0
              ? 'Outstanding! All scheduled workouts for this week are completed.'
              : `${weeklyStats.scheduled - weeklyStats.completed} workout${weeklyStats.scheduled - weeklyStats.completed === 1 ? '' : 's'} remaining this week.`}
          </p>
        </div>
      )}

      {/* ACCOUNTABILITY & HABITS QUICK CARD */}
      <div className="bg-card rounded-2xl border border-border/50 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <ClipboardCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold font-display text-foreground">Habits & Check-Ins</h3>
              <p className="text-xs text-muted-foreground">
                {habitsCount > 0 ? `${habitsCount} active daily habits` : 'Track daily consistency and weekly coach check-ins'}
              </p>
            </div>
          </div>

          <Link
            to={`/client/accountability${clientQueryParam}`}
            className="inline-flex items-center text-xs font-semibold text-primary hover:underline gap-1"
          >
            <span>Open Tracker</span> <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {dueCheckIn && (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-amber-500 shrink-0" />
              <div>
                <span className="text-xs font-bold text-foreground block">
                  {dueCheckIn.templateName} Due
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Due date: {dueCheckIn.dueDate}
                </span>
              </div>
            </div>

            <Button
              size="sm"
              onClick={() => navigate(`/client/check-in/${dueCheckIn.id}${clientQueryParam}`)}
              className="h-7 text-xs px-3"
            >
              Complete Now
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
