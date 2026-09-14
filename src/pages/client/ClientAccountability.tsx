import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ClipboardCheck,
  CheckCircle2,
  Clock,
  Flame,
  Plus,
  Droplets,
  Footprints,
  Moon,
  Apple,
  Target,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  AlertCircle,
  Calendar,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { useAuthStore } from '../../store/authStore';
import { useTenantStore } from '../../store/tenantStore';
import {
  Habit,
  HabitLog,
  CheckInRecord
} from '../../types/accountability';
import {
  fetchClientHabits,
  fetchHabitLogsForDate,
  fetchClientCheckIns,
  logHabitEntry,
  calculateHabitStreak
} from '../../lib/accountabilityService';
import { AssignHabitModal } from '../../components/accountability/AssignHabitModal';
import { formatDateToYMD, formatReadableDate } from '../../lib/assignmentService';

export default function ClientAccountability() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const previewClientId = searchParams.get('asClientId');
  const { user, profile } = useAuthStore();
  const { tenantId, memberData } = useTenantStore();

  const effectiveClientId = previewClientId || memberData?.clientId || profile?.clientId || user?.uid;
  const clientQueryParam = previewClientId ? `?asClientId=${previewClientId}` : '';

  const [selectedDate, setSelectedDate] = useState<string>(formatDateToYMD(new Date()));
  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitLogs, setHabitLogs] = useState<Record<string, HabitLog>>({});
  const [checkIns, setCheckIns] = useState<CheckInRecord[]>([]);
  const [streaks, setStreaks] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const [isAddHabitModalOpen, setIsAddHabitModalOpen] = useState(false);
  const [expandedCheckInId, setExpandedCheckInId] = useState<string | null>(null);

  const loadData = async () => {
    if (!tenantId || !effectiveClientId) return;
    setLoading(true);
    try {
      const [hList, cList] = await Promise.all([
        fetchClientHabits(tenantId, effectiveClientId),
        fetchClientCheckIns(tenantId, effectiveClientId)
      ]);

      setHabits(hList);
      setCheckIns(cList);

      // Load logs for the selected date
      const logs = await fetchHabitLogsForDate(tenantId, effectiveClientId, selectedDate);
      const logMap: Record<string, HabitLog> = {};
      logs.forEach(l => {
        logMap[l.habitId] = l;
      });
      setHabitLogs(logMap);

      // Calculate streaks for habits
      const streakMap: Record<string, number> = {};
      await Promise.all(
        hList.map(async h => {
          const streakRes = await calculateHabitStreak(tenantId, h.id, effectiveClientId);
          streakMap[h.id] = typeof streakRes === 'number' ? streakRes : streakRes?.currentStreak || 0;
        })
      );
      setStreaks(streakMap);
    } catch (err) {
      console.error('Failed to load client accountability data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [tenantId, effectiveClientId, selectedDate]);

  const handleDateChange = (daysDelta: number) => {
    const curr = new Date(selectedDate + 'T00:00:00');
    curr.setDate(curr.getDate() + daysDelta);
    setSelectedDate(formatDateToYMD(curr));
  };

  const handleToggleHabit = async (habit: Habit) => {
    if (!tenantId || !effectiveClientId) return;
    const currentLog = habitLogs[habit.id];
    const isCurrentlyCompleted = currentLog?.completed;

    const newCompleted = !isCurrentlyCompleted;
    const newValue = newCompleted ? habit.target : 0;

    try {
      // Optimistic update
      setHabitLogs(prev => ({
        ...prev,
        [habit.id]: {
          id: currentLog?.id || 'temp',
          tenantId,
          habitId: habit.id,
          clientId: effectiveClientId,
          date: selectedDate,
          value: newValue,
          target: habit.target,
          completed: newCompleted,
          unit: habit.unit,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      }));

      await logHabitEntry(
        tenantId,
        habit.id,
        effectiveClientId,
        selectedDate,
        newValue,
        newCompleted
      );
    } catch (err) {
      console.error('Failed to update habit log:', err);
      loadData();
    }
  };

  const handleIncrementHabit = async (habit: Habit, delta: number) => {
    if (!tenantId || !effectiveClientId) return;
    const currentLog = habitLogs[habit.id];
    const currentValue = currentLog?.value || 0;
    const newValue = Math.max(0, currentValue + delta);
    const newCompleted = newValue >= habit.target;

    try {
      // Optimistic update
      setHabitLogs(prev => ({
        ...prev,
        [habit.id]: {
          id: currentLog?.id || 'temp',
          tenantId,
          habitId: habit.id,
          clientId: effectiveClientId,
          date: selectedDate,
          value: newValue,
          target: habit.target,
          completed: newCompleted,
          unit: habit.unit,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      }));

      await logHabitEntry(
        tenantId,
        habit.id,
        effectiveClientId,
        selectedDate,
        newValue,
        newCompleted
      );
    } catch (err) {
      console.error('Failed to update habit log:', err);
      loadData();
    }
  };

  const getCategoryIcon = (category?: string) => {
    switch (category) {
      case 'HYDRATION': return Droplets;
      case 'ACTIVITY': return Footprints;
      case 'SLEEP': return Moon;
      case 'NUTRITION': return Apple;
      case 'MINDFULNESS': return Flame;
      default: return Target;
    }
  };

  const isToday = selectedDate === formatDateToYMD(new Date());

  // Find any pending or due check-ins
  const pendingCheckIn = checkIns.find(
    c => c.status === 'DUE' || c.status === 'DRAFT' || c.status === 'OVERDUE'
  );

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground tracking-tight">
            Daily Habits & Check-Ins
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Log your daily accountability goals and complete structured coach check-ins
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => setIsAddHabitModalOpen(true)}
          className="gap-1.5 text-xs h-9"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Personal Habit</span>
        </Button>
      </div>

      {/* Prominent Due Check-In Callout Banner */}
      {pendingCheckIn && (
        <div className="p-5 rounded-xl bg-gradient-to-r from-primary/15 via-primary/5 to-transparent border border-primary/40 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-primary text-primary-foreground shrink-0 shadow-xs">
              <ClipboardCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                  {pendingCheckIn.status === 'OVERDUE' ? 'Overdue Check-In' : 'Action Required'}
                </span>
                <span className="text-xs text-muted-foreground">• Due {formatReadableDate(pendingCheckIn.dueDate)}</span>
              </div>
              <h3 className="text-base font-bold text-foreground mt-0.5">
                {pendingCheckIn.templateName}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Submit your weekly measurements, adherence reflections, and notes for your coach.
              </p>
            </div>
          </div>

          <Button
            onClick={() => navigate(`/client/check-in/${pendingCheckIn.id}${clientQueryParam}`)}
            className="gap-2 shrink-0 font-semibold"
          >
            <span>Complete Check-In</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* SECTION 1: DAILY HABIT TRACKER */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            <h2 className="text-base font-semibold text-foreground">
              Daily Habits Tracker
            </h2>
          </div>

          {/* Date Selector */}
          <div className="flex items-center gap-1 bg-card p-1 rounded-lg border border-border">
            <button
              onClick={() => handleDateChange(-1)}
              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
              title="Previous Day"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-semibold px-2 text-foreground">
              {isToday ? 'Today' : selectedDate}
            </span>
            <button
              onClick={() => handleDateChange(1)}
              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
              title="Next Day"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-muted-foreground animate-pulse">
            Loading habits...
          </div>
        ) : habits.length === 0 ? (
          <div className="py-12 text-center bg-card rounded-xl border border-dashed border-border p-6 space-y-2">
            <Target className="w-8 h-8 text-muted-foreground mx-auto opacity-40" />
            <p className="text-sm font-semibold text-foreground">No active habits yet</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Create personal habits like water, steps, or sleep goals to track daily consistency.
            </p>
            <Button size="sm" onClick={() => setIsAddHabitModalOpen(true)} className="mt-2 text-xs">
              Add Personal Habit
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {habits.map(habit => {
              const Icon = getCategoryIcon(habit.category);
              const log = habitLogs[habit.id];
              const isCompleted = !!log?.completed;
              const currentValue = log?.value || 0;
              const streak = streaks[habit.id] || 0;

              return (
                <div
                  key={habit.id}
                  className={`p-4 rounded-xl border transition-all flex flex-col justify-between space-y-3 ${
                    isCompleted
                      ? 'bg-emerald-500/[0.04] border-emerald-500/40 shadow-xs'
                      : 'bg-card border-border hover:border-primary/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl shrink-0 ${
                        isCompleted ? 'bg-emerald-500/15 text-emerald-500' : 'bg-primary/10 text-primary'
                      }`}>
                        <Icon className="w-5 h-5" />
                      </div>

                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-sm text-foreground truncate">
                            {habit.name}
                          </h4>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Target: {habit.target} {habit.unit || ''} • {habit.frequency.toLowerCase()}
                        </p>
                      </div>
                    </div>

                    {/* Streak Badge */}
                    {streak > 0 && (
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 text-xs font-bold shrink-0" title={`${streak}-day active streak`}>
                        <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                        <span>{streak}</span>
                      </div>
                    )}
                  </div>

                  {/* Interactive Habit Controls */}
                  <div className="pt-2 border-t border-border/60 flex items-center justify-between">
                    {habit.type === 'BOOLEAN' ? (
                      <button
                        onClick={() => handleToggleHabit(habit)}
                        className={`w-full py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                          isCompleted
                            ? 'bg-emerald-500 text-white shadow-xs'
                            : 'bg-muted hover:bg-accent text-foreground'
                        }`}
                      >
                        <CheckCircle2 className={`w-4 h-4 ${isCompleted ? 'text-white' : 'text-muted-foreground'}`} />
                        <span>{isCompleted ? 'Completed for Today!' : 'Mark as Completed'}</span>
                      </button>
                    ) : (
                      <div className="flex items-center justify-between w-full gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-foreground">
                            {currentValue} / {habit.target} {habit.unit}
                          </span>
                          {isCompleted && (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleIncrementHabit(habit, habit.type === 'COUNT' && habit.target > 100 ? -500 : -1)}
                            disabled={currentValue <= 0}
                            className="w-7 h-7 rounded-md bg-muted hover:bg-accent text-foreground flex items-center justify-center text-xs font-bold disabled:opacity-30"
                          >
                            -
                          </button>
                          <button
                            onClick={() => handleIncrementHabit(habit, habit.type === 'COUNT' && habit.target > 100 ? 500 : 1)}
                            className="px-2.5 h-7 rounded-md bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shadow-xs hover:bg-primary/90"
                          >
                            + {habit.type === 'COUNT' && habit.target > 100 ? '500' : '1'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 2: CHECK-IN HISTORY & COACH FEEDBACK */}
      <div className="space-y-4 pt-6 border-t border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-primary" />
            <h2 className="text-base font-semibold text-foreground">
              Check-In History & Feedback
            </h2>
          </div>
        </div>

        {checkIns.length === 0 ? (
          <div className="py-12 text-center bg-card rounded-xl border border-dashed border-border p-6 text-xs text-muted-foreground">
            No check-in history logged yet.
          </div>
        ) : (
          <div className="space-y-3">
            {checkIns.map(item => {
              const isReviewed = item.status === 'REVIEWED';
              const isSubmitted = item.status === 'SUBMITTED';
              const isDraft = item.status === 'DRAFT' || item.status === 'DUE' || item.status === 'OVERDUE';
              const isExpanded = expandedCheckInId === item.id;

              return (
                <div
                  key={item.id}
                  className="p-5 rounded-xl bg-card border border-border space-y-3 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-sm text-foreground">
                          {item.templateName}
                        </h4>
                        {isReviewed && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[11px] font-semibold">
                            <CheckCircle2 className="w-3 h-3" />
                            Coach Reviewed
                          </span>
                        )}
                        {isSubmitted && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 text-[11px] font-semibold">
                            <Clock className="w-3 h-3" />
                            Submitted (Pending Review)
                          </span>
                        )}
                        {isDraft && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[11px] font-semibold">
                            Due {item.dueDate}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Due: {formatReadableDate(item.dueDate)}{' '}
                        {item.submittedAt && `• Submitted ${new Date(item.submittedAt).toLocaleDateString()}`}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {isDraft ? (
                        <Button
                          size="sm"
                          onClick={() => navigate(`/client/check-in/${item.id}${clientQueryParam}`)}
                          className="h-8 text-xs px-3"
                        >
                          Complete Now
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setExpandedCheckInId(isExpanded ? null : item.id)}
                          className="h-8 text-xs px-3"
                        >
                          {isExpanded ? 'Hide Responses' : 'View Submission'}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Coach Feedback Box */}
                  {item.coachNote && (
                    <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-1.5">
                      <div className="flex items-center gap-2 text-xs font-bold text-primary">
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Coach Feedback from {item.reviewedByName || 'Coach'}:</span>
                      </div>
                      <p className="text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed">
                        {item.coachNote}
                      </p>
                    </div>
                  )}

                  {/* Expanded Submitted Answers */}
                  {isExpanded && item.answers.length > 0 && (
                    <div className="pt-3 border-t border-border space-y-2.5">
                      <span className="text-xs font-semibold text-muted-foreground uppercase">
                        Your Submitted Responses:
                      </span>
                      <div className="grid grid-cols-1 gap-2">
                        {item.answers.map((ans, idx) => (
                          <div key={idx} className="p-3 rounded-lg bg-background border border-border text-xs space-y-1">
                            <span className="font-medium text-foreground block">
                              {idx + 1}. {ans.questionLabelSnapshot}
                            </span>
                            <p className="text-muted-foreground">
                              {ans.questionType === 'RATING'
                                ? `${ans.answer} / 10`
                                : ans.questionType === 'WEIGHT'
                                ? `${ans.numericValue} ${ans.unit || 'kg'}`
                                : ans.questionType === 'MEASUREMENT'
                                ? `${ans.numericValue} ${ans.unit || 'cm'}`
                                : String(ans.answer)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Personal Habit Modal */}
      {tenantId && effectiveClientId && (
        <AssignHabitModal
          tenantId={tenantId}
          isOpen={isAddHabitModalOpen}
          isClientSelfCreate={true}
          clientId={effectiveClientId}
          clientName={profile ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim() : 'Me'}
          onClose={() => setIsAddHabitModalOpen(false)}
          onSaved={() => {
            setIsAddHabitModalOpen(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}
