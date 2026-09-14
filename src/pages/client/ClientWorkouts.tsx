import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  Clock, 
  Play, 
  Dumbbell, 
  AlertCircle,
  Filter,
  ArrowRight
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { useAuthStore } from '../../store/authStore';
import { useTenantStore } from '../../store/tenantStore';
import { fetchClientAllScheduledWorkouts } from '../../lib/workoutSessionService';
import { ClientScheduledWorkoutItem } from '../../types/workoutSession';
import { ProgramAssignment } from '../../types/assignment';

export function ClientWorkouts() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile } = useAuthStore();
  const { tenantId, memberData } = useTenantStore();

  const previewClientId = searchParams.get('asClientId');
  const effectiveClientId = previewClientId || memberData?.clientId || profile?.clientId;

  const [loading, setLoading] = useState(true);
  const [program, setProgram] = useState<ProgramAssignment | null>(null);
  const [workouts, setWorkouts] = useState<ClientScheduledWorkoutItem[]>([]);
  const [activeTab, setActiveTab] = useState<'ALL' | 'UPCOMING' | 'COMPLETED'>('ALL');

  useEffect(() => {
    async function loadWorkouts() {
      if (!tenantId || !effectiveClientId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const res = await fetchClientAllScheduledWorkouts(tenantId, effectiveClientId);
        setProgram(res.program);
        setWorkouts(res.workouts);
      } catch (err) {
        console.error('Error fetching client workouts:', err);
      } finally {
        setLoading(false);
      }
    }
    loadWorkouts();
  }, [tenantId, effectiveClientId]);

  const handleOpenWorkout = (workoutId: string) => {
    const url = previewClientId 
      ? `/client/workouts/${workoutId}?asClientId=${previewClientId}` 
      : `/client/workouts/${workoutId}`;
    navigate(url);
  };

  const filteredWorkouts = workouts.filter(w => {
    if (activeTab === 'UPCOMING') return w.status === 'UPCOMING' || w.status === 'TODAY';
    if (activeTab === 'COMPLETED') return w.status === 'COMPLETED';
    return true;
  });

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-4 animate-pulse">
        <div className="h-10 w-48 bg-card rounded-xl" />
        <div className="h-28 bg-card rounded-2xl border border-border/40" />
        <div className="space-y-3 pt-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-card rounded-xl border border-border/40" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 md:py-8 space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display tracking-tight text-foreground">
            Program Schedule
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {program ? `${program.programName} (${program.programDurationWeeks} Weeks)` : 'Scheduled Workouts'}
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="inline-flex p-1 rounded-xl bg-card border border-border/50 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'ALL' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            All ({workouts.length})
          </button>
          <button
            onClick={() => setActiveTab('UPCOMING')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'UPCOMING' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Scheduled
          </button>
          <button
            onClick={() => setActiveTab('COMPLETED')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'COMPLETED' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Completed ({workouts.filter(w => w.status === 'COMPLETED').length})
          </button>
        </div>
      </div>

      {filteredWorkouts.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border/50 p-12 text-center space-y-3">
          <Dumbbell className="w-10 h-10 text-muted-foreground mx-auto" />
          <h3 className="text-base font-bold text-foreground">No workouts found</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            {activeTab === 'COMPLETED'
              ? 'You have not completed any workouts yet. Once completed, your sessions will show here.'
              : 'No scheduled workouts match your current filter.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredWorkouts.map((wk, idx) => {
            const isToday = wk.status === 'TODAY';
            const isCompleted = wk.status === 'COMPLETED';
            const isMissed = wk.status === 'MISSED';

            return (
              <div
                key={`${wk.workoutId}_${wk.scheduledDate}_${idx}`}
                className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                  isToday
                    ? 'bg-primary/5 border-primary/40 shadow-sm ring-1 ring-primary/20'
                    : isCompleted
                    ? 'bg-card/70 border-border/40'
                    : 'bg-card border-border/50 hover:border-border'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-muted-foreground">
                        Week {wk.weekNumber} · {wk.dayOfWeek}, {wk.formattedDate}
                      </span>
                      {isToday && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary/20 text-primary">
                          Today
                        </span>
                      )}
                      {isCompleted && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-green-500/10 text-green-400">
                          <CheckCircle2 className="w-3 h-3" /> Completed
                        </span>
                      )}
                      {isMissed && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400">
                          Past Due
                        </span>
                      )}
                      {wk.isOptional && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-muted text-muted-foreground">
                          Optional
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg font-bold font-display text-foreground">
                      {wk.workoutName}
                    </h3>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span>{wk.exerciseCount} exercises</span>
                      <span>·</span>
                      <span>{wk.totalSets} sets</span>
                      {wk.targetMuscles.length > 0 && (
                        <>
                          <span>·</span>
                          <span className="text-foreground/80">{wk.targetMuscles.join(', ')}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    {isCompleted ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenWorkout(wk.workoutId)}
                        className="h-10 text-xs"
                      >
                        Review Session
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleOpenWorkout(wk.workoutId)}
                        className={`h-10 px-4 text-xs font-bold ${
                          isToday ? 'bg-primary text-primary-foreground hover:bg-primary/90' : ''
                        }`}
                      >
                        <Play className="w-3.5 h-3.5 mr-1.5 fill-current" />
                        {isToday ? 'Start Workout' : 'View Workout'}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
