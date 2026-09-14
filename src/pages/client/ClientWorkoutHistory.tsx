import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  History,
  Calendar,
  Clock,
  Dumbbell,
  Trophy,
  ChevronRight,
  Filter,
  ArrowRight,
  CheckCircle2,
  FileText
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { useAuthStore } from '../../store/authStore';
import { useTenantStore } from '../../store/tenantStore';
import { fetchCompletedClientSessions } from '../../lib/workoutSessionService';
import { WorkoutSession } from '../../types/workoutSession';
import { formatReadableDate } from '../../lib/assignmentService';

export function ClientWorkoutHistory() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile } = useAuthStore();
  const { tenantId, memberData } = useTenantStore();

  const previewClientId = searchParams.get('asClientId');
  const effectiveClientId = previewClientId || memberData?.clientId || profile?.clientId;

  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<WorkoutSession | null>(null);

  useEffect(() => {
    async function loadHistory() {
      if (!tenantId || !effectiveClientId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const list = await fetchCompletedClientSessions(tenantId, effectiveClientId);
        setSessions(list);
      } catch (err) {
        console.error('Error fetching workout history:', err);
      } finally {
        setLoading(false);
      }
    }
    loadHistory();
  }, [tenantId, effectiveClientId]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-4 animate-pulse">
        <div className="h-10 w-48 bg-card rounded-xl" />
        <div className="space-y-3 pt-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-card rounded-2xl border border-border/40" />
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
          <h1 className="text-2xl sm:text-3xl font-bold font-display tracking-tight text-foreground">
            Workout History
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Complete historical training logs and performance records.
          </p>
        </div>

        <Link
          to={previewClientId ? `/client/progress?asClientId=${previewClientId}` : '/client/progress'}
          className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 self-start sm:self-auto"
        >
          View Analytics & PRs <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {sessions.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border/50 p-12 text-center space-y-3">
          <History className="w-10 h-10 text-muted-foreground mx-auto" />
          <h3 className="text-base font-bold text-foreground">No Completed Workouts Yet</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Once you complete a scheduled workout session in the Workout Player, your historical records will appear here.
          </p>
          <Button
            size="sm"
            onClick={() => navigate(previewClientId ? `/client/dashboard?asClientId=${previewClientId}` : '/client/dashboard')}
            className="mt-2"
          >
            Go to Today's Workout
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map(s => {
            const dateStr = s.scheduledDate
              ? formatReadableDate(s.scheduledDate)
              : s.completedAt
              ? new Date(s.completedAt).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric'
                })
              : 'Workout Session';

            const prsCount = s.personalRecordsAchieved?.length || 0;

            return (
              <div
                key={s.id}
                onClick={() => setSelectedSession(s)}
                className="p-4 sm:p-5 rounded-2xl bg-card border border-border/50 hover:border-border transition-all cursor-pointer space-y-3 group shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-muted-foreground">
                        {dateStr}
                      </span>
                      {prsCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 flex items-center gap-1">
                          🏆 {prsCount} New PR{prsCount === 1 ? '' : 's'}
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors mt-0.5">
                      {s.workoutName}
                    </h3>
                  </div>

                  <div className="text-xs text-muted-foreground flex items-center gap-1 group-hover:text-foreground">
                    <span>View Details</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>

                {/* Metrics */}
                <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-2 border-t border-border/40">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>{s.durationMinutes || 30} mins</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                    <span>{s.completedSets || 0} sets logged</span>
                  </div>
                  {s.totalVolumeKg ? (
                    <div className="flex items-center gap-1.5">
                      <Dumbbell className="w-3.5 h-3.5 text-amber-400" />
                      <span>{s.totalVolumeKg.toLocaleString()} kg volume</span>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Session Details Modal */}
      {selectedSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl max-w-lg w-full space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Completed Workout Session
                </span>
                <h3 className="text-xl font-bold font-display text-white">
                  {selectedSession.workoutName}
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {selectedSession.scheduledDate ? formatReadableDate(selectedSession.scheduledDate) : ''}
                </p>
              </div>
              <button
                onClick={() => setSelectedSession(null)}
                className="text-zinc-400 hover:text-white text-sm font-semibold p-1"
              >
                ✕
              </button>
            </div>

            {/* Quick KPI stats */}
            <div className="grid grid-cols-3 gap-2">
              <div className="p-3 rounded-xl bg-zinc-800/60 border border-zinc-700/50">
                <span className="text-[10px] uppercase font-bold text-zinc-400 block">Duration</span>
                <span className="text-sm font-bold text-white block mt-0.5">
                  {selectedSession.durationMinutes || 30} mins
                </span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-800/60 border border-zinc-700/50">
                <span className="text-[10px] uppercase font-bold text-zinc-400 block">Sets</span>
                <span className="text-sm font-bold text-white block mt-0.5">
                  {selectedSession.completedSets || 0} completed
                </span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-800/60 border border-zinc-700/50">
                <span className="text-[10px] uppercase font-bold text-zinc-400 block">Volume</span>
                <span className="text-sm font-bold text-amber-400 block mt-0.5">
                  {selectedSession.totalVolumeKg ? `${selectedSession.totalVolumeKg.toLocaleString()} kg` : '—'}
                </span>
              </div>
            </div>

            {/* Client Notes if any */}
            {selectedSession.clientNotes && (
              <div className="p-3 rounded-xl bg-zinc-800/40 border border-zinc-700/40 text-xs text-zinc-300 flex items-start gap-2">
                <FileText className="w-4 h-4 text-zinc-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-zinc-200 block mb-0.5">Athlete Notes</span>
                  <span>{selectedSession.clientNotes}</span>
                </div>
              </div>
            )}

            {/* Sets Summary List */}
            {selectedSession.completedSetsSummary && selectedSession.completedSetsSummary.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Logged Sets ({selectedSession.completedSetsSummary.length})
                </span>
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {selectedSession.completedSetsSummary.map((st, i) => (
                    <div
                      key={i}
                      className="p-2.5 rounded-xl bg-zinc-800/40 border border-zinc-800 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold text-zinc-500 w-5">
                          #{st.setNumber}
                        </span>
                        <span className="font-semibold text-white">
                          {st.exerciseName || `Exercise ${st.exerciseId}`}
                        </span>
                        {st.setType && st.setType !== 'NORMAL' && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-bold">
                            {st.setType}
                          </span>
                        )}
                      </div>
                      <div className="text-right font-medium text-zinc-300">
                        {st.weight && st.weight > 0 ? (
                          <span>
                            {st.weight} {st.weightUnit || 'kg'} × {st.reps || 0} reps
                          </span>
                        ) : st.durationSeconds ? (
                          <span>{st.durationSeconds}s</span>
                        ) : (
                          <span>{st.reps || 0} reps</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button
              className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs h-10"
              onClick={() => setSelectedSession(null)}
            >
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
