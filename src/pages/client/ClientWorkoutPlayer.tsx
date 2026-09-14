import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Check, 
  Clock, 
  Play, 
  Pause, 
  RotateCcw,
  SkipForward, 
  ChevronLeft, 
  ChevronRight, 
  Dumbbell, 
  Info, 
  Award, 
  CheckCircle2, 
  Flame,
  AlertCircle,
  Plus,
  Minus,
  Layers,
  Repeat,
  Timer,
  Zap,
  Volume2
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { useAuthStore } from '../../store/authStore';
import { useTenantStore } from '../../store/tenantStore';
import { 
  fetchWorkoutForPlayer,
  getOrCreateWorkoutSession,
  logWorkoutSet,
  completeWorkoutSession,
  fetchPreviousExercisePerformance,
  fetchSessionSets
} from '../../lib/workoutSessionService';
import { formatDateToYMD } from '../../lib/assignmentService';
import { WorkoutSession, WorkoutSetLog } from '../../types/workoutSession';
import { Workout, WorkoutExercisePrescription, Exercise, WorkoutBlock } from '../../types/program';

export function ClientWorkoutPlayer() {
  const { workoutId } = useParams<{ workoutId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { profile } = useAuthStore();
  const { tenantId, memberData } = useTenantStore();

  const previewClientId = searchParams.get('asClientId');
  const effectiveClientId = previewClientId || memberData?.clientId || profile?.clientId;

  // Workout & prescription data
  const [loading, setLoading] = useState(true);
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [prescriptions, setPrescriptions] = useState<
    Array<WorkoutExercisePrescription & { exerciseDetails?: Exercise }>
  >([]);
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [loggedSets, setLoggedSets] = useState<Map<string, WorkoutSetLog>>(new Map());

  // Player Navigation & State
  const [currentExIndex, setCurrentExIndex] = useState(0);
  const [previousPerformance, setPreviousPerformance] = useState<{
    weight?: number;
    reps?: number;
    durationSeconds?: number;
    weightUnit?: string;
  } | null>(null);
  const [loadingPrevious, setLoadingPrevious] = useState(false);

  // Set Inputs per set index: Map<setNumber, { weight: string, reps: string, durationSeconds: string, rpe?: string }>
  const [setInputs, setSetInputs] = useState<
    Map<number, { weight: string; reps: string; durationSeconds: string; rpe: string }>
  >(new Map());

  // Drop Set Stage Inputs: Map<"setNumber_dropIndex", { weight: string, reps: string }>
  const [dropSetInputs, setDropSetInputs] = useState<Map<string, { weight: string; reps: string }>>(new Map());

  const [savingSetNumber, setSavingSetNumber] = useState<number | null>(null);

  // Rest Timer State
  const [isResting, setIsResting] = useState(false);
  const [restSecondsLeft, setRestSecondsLeft] = useState(90);
  const [restTotalSeconds, setRestTotalSeconds] = useState(90);
  const [isRestPaused, setIsRestPaused] = useState(false);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Interval / Work Timer (for AMRAP, EMOM, Timed Sets)
  const [isWorkTimerRunning, setIsWorkTimerRunning] = useState(false);
  const [workTimerSecondsLeft, setWorkTimerSecondsLeft] = useState(0);
  const [workTimerTotalSeconds, setWorkTimerTotalSeconds] = useState(0);
  const [emomCurrentMinute, setEmomCurrentMinute] = useState(1);
  const [emomTotalMinutes, setEmomTotalMinutes] = useState(10);
  const workTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Elapsed Workout Duration Tracker
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const workoutStartTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Summary & Completion Modal
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isCompletedCelebration, setIsCompletedCelebration] = useState(false);

  // 1. Initial Load: Workout & Session
  useEffect(() => {
    async function loadPlayerData() {
      if (!tenantId || !workoutId || !effectiveClientId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const clientAssoc = await import('../../lib/assignmentService').then(m =>
          m.fetchClientAssignments(tenantId, effectiveClientId)
        );
        const activeAssignment = clientAssoc.find(a => a.status === 'ACTIVE');

        if (!activeAssignment) {
          throw new Error('No active assignment found for client');
        }

        const { workout: wkData, prescriptions: rxList } = await fetchWorkoutForPlayer(
          tenantId,
          activeAssignment.programId,
          workoutId
        );

        setWorkout(wkData);
        setPrescriptions(rxList);

        // Total sets across all prescriptions
        const totalSets = rxList.reduce((sum, rx) => sum + (Number(rx.sets) || 3), 0);
        const todayYMD = formatDateToYMD(new Date());

        // Get or resume existing session
        const { session: ws, existingSets } = await getOrCreateWorkoutSession(tenantId, {
          clientId: effectiveClientId,
          assignmentId: activeAssignment.id,
          programId: activeAssignment.programId,
          workoutId,
          workoutName: wkData.name,
          scheduledDate: todayYMD,
          totalExercises: rxList.length,
          totalSets
        });

        setSession(ws);

        // Map existing sets
        const setMap = new Map<string, WorkoutSetLog>();
        existingSets.forEach(s => {
          setMap.set(`${s.exerciseId}_${s.setNumber}`, s);
        });
        setLoggedSets(setMap);

        if (ws.status === 'COMPLETED') {
          setIsCompletedCelebration(true);
        }
      } catch (err) {
        console.error('Error loading workout player:', err);
      } finally {
        setLoading(false);
      }
    }

    loadPlayerData();
  }, [tenantId, workoutId, effectiveClientId]);

  // 2. Active Workout Timer
  useEffect(() => {
    if (!isCompletedCelebration) {
      workoutStartTimerRef.current = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (workoutStartTimerRef.current) clearInterval(workoutStartTimerRef.current);
    };
  }, [isCompletedCelebration]);

  // 3. Load Previous Performance & Initialize Inputs for Current Exercise
  const currentRx = prescriptions[currentExIndex];

  // Block Context (Superset / Circuit)
  const currentBlock: WorkoutBlock | undefined = workout?.blocks?.find(b => b.id === currentRx?.blockId);
  const blockExercises = currentBlock ? prescriptions.filter(p => p.blockId === currentBlock.id) : [];
  const currentBlockIndex = blockExercises.findIndex(p => p.id === currentRx?.id);

  useEffect(() => {
    async function loadExerciseContext() {
      if (!tenantId || !effectiveClientId || !currentRx) return;

      setLoadingPrevious(true);
      try {
        const prev = await fetchPreviousExercisePerformance(
          tenantId,
          effectiveClientId,
          currentRx.exerciseId,
          1
        );
        setPreviousPerformance(prev);

        // Populate set inputs with defaults from prescription or previous
        const count = Number(currentRx.sets) || 3;
        const inputMap = new Map<number, { weight: string; reps: string; durationSeconds: string; rpe: string }>();
        const dropMap = new Map<string, { weight: string; reps: string }>();

        for (let i = 1; i <= count; i++) {
          const logged = loggedSets.get(`${currentRx.exerciseId}_${i}`);
          if (logged) {
            inputMap.set(i, {
              weight: logged.weight !== undefined ? String(logged.weight) : '',
              reps: logged.reps !== undefined ? String(logged.reps) : '',
              durationSeconds: logged.durationSeconds !== undefined ? String(logged.durationSeconds) : '',
              rpe: logged.rpe !== undefined ? String(logged.rpe) : ''
            });
          } else {
            const defaultWeight = currentRx.weight !== undefined ? String(currentRx.weight) : prev?.weight !== undefined ? String(prev.weight) : '';
            const defaultReps = currentRx.reps ? String(currentRx.reps).replace(/[^0-9]/g, '') : prev?.reps ? String(prev.reps) : '10';
            const defaultDuration = currentRx.targetDurationSeconds ? String(currentRx.targetDurationSeconds) : currentRx.durationSeconds ? String(currentRx.durationSeconds) : '';
            const defaultRpe = currentRx.rpe !== undefined && currentRx.rpe !== null ? String(currentRx.rpe) : '';
            inputMap.set(i, {
              weight: defaultWeight,
              reps: defaultReps,
              durationSeconds: defaultDuration,
              rpe: defaultRpe
            });
          }

          // If drop sets exist, populate drop stages
          if (currentRx.setType === 'DROP_SET' && currentRx.dropSets) {
            currentRx.dropSets.forEach(ds => {
              dropMap.set(`${i}_${ds.dropIndex}`, {
                weight: ds.weight !== undefined ? String(ds.weight) : '',
                reps: ds.reps ? String(ds.reps) : '8'
              });
            });
          }
        }
        setSetInputs(inputMap);
        setDropSetInputs(dropMap);

        // Initialize Work Timers if TIMED, AMRAP, or EMOM
        if (currentRx.setType === 'TIMED' || currentRx.setType === 'AMRAP') {
          const dur = currentRx.targetDurationSeconds || currentRx.durationSeconds || (currentRx.setType === 'AMRAP' ? 300 : 45);
          setWorkTimerTotalSeconds(dur);
          setWorkTimerSecondsLeft(dur);
          setIsWorkTimerRunning(false);
        } else if (currentRx.setType === 'EMOM') {
          const mins = currentRx.emomMinutes || 10;
          setEmomTotalMinutes(mins);
          setEmomCurrentMinute(1);
          setWorkTimerTotalSeconds(60);
          setWorkTimerSecondsLeft(60);
          setIsWorkTimerRunning(false);
        }
      } catch (err) {
        console.warn('Could not load exercise context:', err);
      } finally {
        setLoadingPrevious(false);
      }
    }

    loadExerciseContext();
  }, [currentExIndex, currentRx, tenantId, effectiveClientId]);

  // 4. Rest Timer Loop
  useEffect(() => {
    if (isResting && !isRestPaused && restSecondsLeft > 0) {
      timerIntervalRef.current = setInterval(() => {
        setRestSecondsLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerIntervalRef.current as NodeJS.Timeout);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isResting, isRestPaused, restSecondsLeft]);

  // 5. Work Timer Loop (for TIMED / AMRAP / EMOM)
  useEffect(() => {
    if (isWorkTimerRunning && workTimerSecondsLeft > 0) {
      workTimerRef.current = setInterval(() => {
        setWorkTimerSecondsLeft(prev => {
          if (prev <= 1) {
            // For EMOM, advance minute or complete
            if (currentRx?.setType === 'EMOM') {
              setEmomCurrentMinute(cur => {
                if (cur < emomTotalMinutes) {
                  return cur + 1;
                } else {
                  setIsWorkTimerRunning(false);
                  return cur;
                }
              });
              return 60;
            } else {
              setIsWorkTimerRunning(false);
              return 0;
            }
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (workTimerRef.current) clearInterval(workTimerRef.current);
    }

    return () => {
      if (workTimerRef.current) clearInterval(workTimerRef.current);
    };
  }, [isWorkTimerRunning, workTimerSecondsLeft, currentRx?.setType, emomTotalMinutes]);

  // Trigger Rest Period
  const startRestTimer = (seconds: number) => {
    const period = Math.max(15, seconds || currentRx?.restSeconds || 90);
    setRestTotalSeconds(period);
    setRestSecondsLeft(period);
    setIsRestPaused(false);
    setIsResting(true);
  };

  const handleSkipRest = () => {
    setIsResting(false);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
  };

  const handleAdjustRest = (amount: number) => {
    setRestSecondsLeft(prev => Math.max(0, prev + amount));
  };

  // 6. Complete a Set
  const handleCompleteSet = async (setNumber: number) => {
    if (!tenantId || !session || !currentRx) return;

    setSavingSetNumber(setNumber);
    const inputs = setInputs.get(setNumber) || { weight: '', reps: '', durationSeconds: '', rpe: '' };

    const parsedWeight = inputs.weight ? Math.max(0, parseFloat(inputs.weight)) : undefined;
    const parsedReps = inputs.reps ? Math.max(0, parseInt(inputs.reps, 10)) : undefined;
    const parsedDuration = inputs.durationSeconds ? Math.max(0, parseInt(inputs.durationSeconds, 10)) : undefined;
    const parsedRpe = inputs.rpe ? Math.max(1, Math.min(10, parseFloat(inputs.rpe))) : undefined;

    try {
      const savedSet = await logWorkoutSet(tenantId, session.id, {
        exerciseId: currentRx.exerciseId,
        setNumber,
        setType: currentRx.setType || 'NORMAL',
        weight: parsedWeight,
        weightUnit: currentRx.weightUnit || 'kg',
        reps: parsedReps,
        durationSeconds: parsedDuration,
        rpe: parsedRpe
      });

      // Update local state immediately
      setLoggedSets(prev => {
        const next = new Map(prev);
        next.set(`${currentRx.exerciseId}_${setNumber}`, savedSet);
        return next;
      });

      // Superset / Circuit transition logic:
      if (currentBlock && blockExercises.length > 1) {
        const isLastInBlock = currentBlockIndex === blockExercises.length - 1;
        if (!isLastInBlock) {
          // Advance directly to next exercise in Superset with minimal/zero rest
          const nextExId = blockExercises[currentBlockIndex + 1].id;
          const nextIndex = prescriptions.findIndex(p => p.id === nextExId);
          if (nextIndex !== -1) {
            setCurrentExIndex(nextIndex);
          }
        } else {
          // Completed full round of the block! Start block round rest period
          startRestTimer(currentBlock.restSeconds || 90);
        }
      } else {
        // Standard set completion
        const isLastSetOfExercise = setNumber === (Number(currentRx.sets) || 3);
        const isLastExercise = currentExIndex === prescriptions.length - 1;

        if (!isLastSetOfExercise || !isLastExercise) {
          startRestTimer(currentRx.restSeconds || 90);
        }
      }
    } catch (err) {
      console.error('Failed to log set:', err);
      alert('Failed to save set. Please check your connection.');
    } finally {
      setSavingSetNumber(null);
    }
  };

  // Calculate Progress
  const totalRequiredSets = prescriptions.reduce((sum, rx) => sum + (Number(rx.sets) || 3), 0);
  const totalCompletedSets = loggedSets.size;
  const isWorkoutFullyCompleted = totalCompletedSets >= totalRequiredSets && totalRequiredSets > 0;

  // 7. Complete Workout
  const handleFinalizeWorkout = async () => {
    if (!tenantId || !session) return;
    setIsCompleting(true);
    const durationMinutes = Math.max(1, Math.round(elapsedSeconds / 60));
    try {
      await completeWorkoutSession(tenantId, session.id, durationMinutes);
      setIsCompletedCelebration(true);
      setShowSummaryModal(false);
    } catch (err) {
      console.error('Failed to complete workout:', err);
      alert('Failed to record workout completion. Please try again.');
    } finally {
      setIsCompleting(false);
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 space-y-6 animate-pulse text-center">
        <div className="h-8 w-48 bg-card rounded-xl mx-auto" />
        <div className="h-64 bg-card rounded-2xl border border-border/40" />
        <div className="h-40 bg-card rounded-2xl border border-border/40" />
      </div>
    );
  }

  if (!workout || prescriptions.length === 0) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto" />
        <h2 className="text-xl font-bold text-foreground">Workout Not Found</h2>
        <p className="text-sm text-muted-foreground">
          This workout could not be loaded or contains no prescribed exercises.
        </p>
        <Button onClick={() => navigate(-1)}>Return to Schedule</Button>
      </div>
    );
  }

  // CELEBRATION VIEW
  if (isCompletedCelebration) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 text-center space-y-8 animate-in zoom-in-95 duration-500">
        <div className="w-20 h-20 rounded-3xl bg-green-500/10 text-green-400 border border-green-500/20 mx-auto flex items-center justify-center shadow-lg shadow-green-500/10">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-primary">Session Accomplished</span>
          <h1 className="text-3xl font-bold font-display text-foreground">Workout Complete 🎉</h1>
          <p className="text-base text-muted-foreground">
            Great work. Keep building consistency.
          </p>
        </div>

        {/* Real Summary Card */}
        <div className="p-6 rounded-2xl bg-card border border-border/60 text-left space-y-4 shadow-sm">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Workout Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-1 border-b border-border/30">
              <span className="text-muted-foreground">Workout</span>
              <span className="font-semibold text-foreground">{workout.name}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/30">
              <span className="text-muted-foreground">Exercises Completed</span>
              <span className="font-semibold text-foreground">{prescriptions.length} exercises</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/30">
              <span className="text-muted-foreground">Total Sets Logged</span>
              <span className="font-semibold text-foreground">{totalCompletedSets} sets</span>
            </div>
            {elapsedSeconds > 0 && (
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Duration</span>
                <span className="font-semibold text-foreground">{Math.max(1, Math.round(elapsedSeconds / 60))} minutes</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={() => {
              const url = previewClientId ? `/client/workouts/history?asClientId=${previewClientId}` : '/client/workouts/history';
              navigate(url);
            }}
            variant="outline"
            className="flex-1 h-12 rounded-xl text-sm font-semibold"
          >
            View Workout History
          </Button>
          <Button
            onClick={() => {
              const url = previewClientId ? `/client/dashboard?asClientId=${previewClientId}` : '/client/dashboard';
              navigate(url);
            }}
            className="flex-1 h-12 rounded-xl text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const exerciseCount = Number(currentRx.sets) || 3;
  const isDropSet = currentRx.setType === 'DROP_SET';
  const isAmrap = currentRx.setType === 'AMRAP';
  const isEmom = currentRx.setType === 'EMOM';
  const isTimed = currentRx.setType === 'TIMED';

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 md:py-6 space-y-6 pb-24 animate-in fade-in duration-300">
      {/* Top Header & Progress */}
      <div className="flex items-center justify-between gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(previewClientId ? `/client/dashboard?asClientId=${previewClientId}` : '/client/dashboard')}
          className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Save & Exit
        </Button>

        <div className="text-right">
          <div className="flex items-center gap-1.5 text-xs font-bold text-foreground justify-end">
            <Clock className="w-3.5 h-3.5 text-primary" />
            <span>{formatTimer(elapsedSeconds)}</span>
          </div>
          <span className="text-[11px] text-muted-foreground">
            {totalCompletedSets} / {totalRequiredSets} sets completed
          </span>
        </div>
      </div>

      {/* Exercise Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs font-semibold">
          <span className="text-muted-foreground">
            Exercise {currentExIndex + 1} of {prescriptions.length}
          </span>
          <span className="text-primary font-bold">
            {Math.round((totalCompletedSets / (totalRequiredSets || 1)) * 100)}% Workout Done
          </span>
        </div>
        <div className="w-full h-2 bg-card rounded-full overflow-hidden border border-border/40">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${Math.min(100, Math.round((totalCompletedSets / (totalRequiredSets || 1)) * 100))}%` }}
          />
        </div>
      </div>

      {/* SUPERSET / CIRCUIT BLOCK BANNER (if part of a block) */}
      {currentBlock && (
        <div className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${
          currentBlock.type === 'SUPERSET'
            ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
            : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${currentBlock.type === 'SUPERSET' ? 'bg-amber-500/20' : 'bg-cyan-500/20'}`}>
              {currentBlock.type === 'SUPERSET' ? <Layers className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider">
                {currentBlock.name || currentBlock.type} — Movement {currentBlockIndex + 1} of {blockExercises.length}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {currentBlock.rounds || 3} Rounds · Perform movements sequentially with {currentBlock.restSeconds || 90}s rest between rounds.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REST TIMER BANNER (when active) */}
      {isResting && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-card to-card/90 border-2 border-primary shadow-xl shadow-primary/10 space-y-3 animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
              <Clock className="w-4 h-4 animate-spin-slow" />
              <span>Rest Timer</span>
            </div>
            {restSecondsLeft === 0 ? (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-500/20 text-green-400">
                Rest Complete! Ready for Next Set
              </span>
            ) : isRestPaused ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400">
                Paused
              </span>
            ) : null}
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="text-4xl sm:text-5xl font-mono font-bold tracking-tight text-foreground">
              {formatTimer(restSecondsLeft)}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAdjustRest(30)}
                className="h-10 text-xs px-2.5"
                title="Add 30 seconds"
              >
                +30s
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsRestPaused(!isRestPaused)}
                className="h-10 w-10 p-0"
              >
                {isRestPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              </Button>
              <Button
                size="sm"
                onClick={handleSkipRest}
                className="h-10 px-3 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <SkipForward className="w-3.5 h-3.5 mr-1" /> Skip
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* LIVE WORK INTERVAL / EMOM / AMRAP TIMER (if applicable) */}
      {(isTimed || isAmrap || isEmom) && !isResting && (
        <div className="p-4 rounded-2xl bg-zinc-950 border border-primary/30 space-y-3 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider">
              <Timer className="w-4 h-4" />
              <span>{isEmom ? `EMOM Pace (Minute ${emomCurrentMinute} of ${emomTotalMinutes})` : isAmrap ? 'AMRAP Clock' : 'Timed Work Interval'}</span>
            </div>
            {isEmom && currentRx.emomRepsPerMinute && (
              <span className="text-xs font-semibold text-amber-400">
                Target: {currentRx.emomRepsPerMinute} reps this minute
              </span>
            )}
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="text-3xl font-mono font-bold text-foreground">
              {formatTimer(workTimerSecondsLeft)}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const initial = isEmom ? 60 : (currentRx.targetDurationSeconds || currentRx.durationSeconds || 45);
                  setWorkTimerSecondsLeft(initial);
                  setIsWorkTimerRunning(false);
                }}
                className="h-9 px-2 text-xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </Button>
              <Button
                size="sm"
                onClick={() => setIsWorkTimerRunning(!isWorkTimerRunning)}
                className={`h-9 px-4 text-xs font-bold ${
                  isWorkTimerRunning
                    ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950'
                    : 'bg-primary text-primary-foreground hover:bg-primary/90'
                }`}
              >
                {isWorkTimerRunning ? <Pause className="w-3.5 h-3.5 mr-1" /> : <Play className="w-3.5 h-3.5 mr-1" />}
                {isWorkTimerRunning ? 'Pause' : 'Start Timer'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* CURRENT EXERCISE CARD */}
      <div className="p-6 rounded-2xl bg-card border border-border/60 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
              {currentRx.exerciseDetails?.targetMuscleGroup || 'Primary Exercise'}
            </span>
            <h2 className="text-2xl font-bold font-display text-foreground tracking-tight mt-0.5">
              {currentRx.exerciseDetails?.name || 'Prescribed Exercise'}
            </h2>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-1.5">
              {currentRx.exerciseDetails?.equipment && (
                <span className="px-2 py-0.5 rounded-md bg-accent/60">
                  {currentRx.exerciseDetails.equipment}
                </span>
              )}
              {currentRx.setType && currentRx.setType !== 'NORMAL' && (
                <span className={`px-2 py-0.5 rounded-md font-semibold ${
                  currentRx.setType === 'DROP_SET' ? 'bg-red-500/10 text-red-400' :
                  currentRx.setType === 'WARMUP' ? 'bg-amber-500/10 text-amber-400' :
                  'bg-primary/10 text-primary'
                }`}>
                  {currentRx.setType}
                </span>
              )}
              {currentRx.tempo && (
                <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 font-mono text-[11px]">
                  Tempo: {currentRx.tempo}
                </span>
              )}
            </div>
          </div>

          {/* Prescription Summary */}
          <div className="text-left sm:text-right text-xs bg-background/50 p-2.5 rounded-xl border border-border/30">
            <div className="font-semibold text-foreground">
              Prescription: {currentRx.sets} sets × {currentRx.reps || 'reps'}
            </div>
            {currentRx.rpe && (
              <div className="text-amber-400 font-semibold text-[11px] mt-0.5">
                Target RPE: {currentRx.rpe} {currentRx.rir !== undefined ? `(${currentRx.rir} RIR)` : ''}
              </div>
            )}
            {currentRx.restSeconds ? (
              <div className="text-muted-foreground text-[11px] mt-0.5">
                Rest: {currentRx.restSeconds}s
              </div>
            ) : null}
          </div>
        </div>

        {/* Coach Notes / Technical Cues (if prescribed) */}
        {currentRx.notes && (
          <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs text-amber-200 flex items-start gap-2">
            <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-amber-300">Coach Cue: </span>
              {currentRx.notes}
            </div>
          </div>
        )}

        {/* Previous Performance Banner */}
        <div className="p-3 rounded-xl bg-background/60 border border-border/40 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Award className="w-4 h-4 text-primary" />
            <span>Previous:</span>
          </div>
          <div className="font-semibold text-foreground">
            {loadingPrevious ? (
              <span className="text-muted-foreground text-[11px]">Loading...</span>
            ) : previousPerformance ? (
              <span>
                {previousPerformance.weight !== undefined ? `${previousPerformance.weight} ${previousPerformance.weightUnit || 'kg'}` : ''}
                {previousPerformance.reps !== undefined ? ` × ${previousPerformance.reps} reps` : ''}
              </span>
            ) : (
              <span className="text-muted-foreground text-[11px] font-normal">No previous performance</span>
            )}
          </div>
        </div>

        {/* SETS LOGGING TABLE */}
        <div className="space-y-3 pt-2">
          <div className="grid grid-cols-12 gap-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-2">
            <div className="col-span-2 text-center">Set</div>
            <div className="col-span-4 text-center">Weight ({currentRx.weightUnit || 'kg'})</div>
            <div className="col-span-3 text-center">{isTimed ? 'Secs' : 'Reps'}</div>
            <div className="col-span-3 text-center">Done</div>
          </div>

          {Array.from({ length: exerciseCount }).map((_, idx) => {
            const setNumber = idx + 1;
            const setKey = `${currentRx.exerciseId}_${setNumber}`;
            const logged = loggedSets.get(setKey);
            const isCompleted = !!logged;
            const inputs = setInputs.get(setNumber) || { weight: '', reps: '', durationSeconds: '', rpe: '' };
            const isSaving = savingSetNumber === setNumber;

            return (
              <div key={setNumber} className="space-y-2">
                <div
                  className={`grid grid-cols-12 gap-2 items-center p-2 rounded-xl transition-colors ${
                    isCompleted
                      ? 'bg-green-500/5 border border-green-500/20'
                      : 'bg-background border border-border/40'
                  }`}
                >
                  {/* Set Number */}
                  <div className="col-span-2 text-center font-bold text-sm text-foreground">
                    {setNumber}
                  </div>

                  {/* Weight Input */}
                  <div className="col-span-4">
                    <Input
                      type="number"
                      min="0"
                      step="0.5"
                      value={inputs.weight}
                      onChange={e => {
                        const val = e.target.value;
                        setSetInputs(prev => {
                          const m = new Map<number, { weight: string; reps: string; durationSeconds: string; rpe: string }>(prev);
                          const cur = prev.get(setNumber);
                          m.set(setNumber, {
                            weight: val,
                            reps: cur?.reps || '',
                            durationSeconds: cur?.durationSeconds || '',
                            rpe: cur?.rpe || ''
                          });
                          return m;
                        });
                      }}
                      placeholder={currentRx.weight ? String(currentRx.weight) : '—'}
                      className="h-10 text-center text-sm font-semibold rounded-lg bg-card/50"
                    />
                  </div>

                  {/* Reps or Duration Input */}
                  <div className="col-span-3">
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      value={isTimed ? inputs.durationSeconds : inputs.reps}
                      onChange={e => {
                        const val = e.target.value;
                        setSetInputs(prev => {
                          const m = new Map<number, { weight: string; reps: string; durationSeconds: string; rpe: string }>(prev);
                          const cur = prev.get(setNumber);
                          m.set(setNumber, {
                            weight: cur?.weight || '',
                            reps: isTimed ? (cur?.reps || '') : val,
                            durationSeconds: isTimed ? val : (cur?.durationSeconds || ''),
                            rpe: cur?.rpe || ''
                          });
                          return m;
                        });
                      }}
                      placeholder={isTimed ? '45' : currentRx.reps ? String(currentRx.reps).replace(/[^0-9]/g, '') : '10'}
                      className="h-10 text-center text-sm font-semibold rounded-lg bg-card/50"
                    />
                  </div>

                  {/* Complete Set Action */}
                  <div className="col-span-3 flex justify-center">
                    <Button
                      onClick={() => handleCompleteSet(setNumber)}
                      disabled={isSaving}
                      size="sm"
                      className={`h-10 w-full rounded-lg font-bold text-xs transition-all ${
                        isCompleted
                          ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30'
                          : 'bg-primary text-primary-foreground hover:bg-primary/90'
                      }`}
                    >
                      {isSaving ? (
                        <span className="text-[10px]">Saving...</span>
                      ) : isCompleted ? (
                        <Check className="w-4 h-4 stroke-[3]" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Drop Set Sub-stages (if DROP_SET) */}
                {isDropSet && currentRx.dropSets && currentRx.dropSets.length > 0 && (
                  <div className="pl-6 space-y-1.5 border-l-2 border-red-500/30 ml-3">
                    {currentRx.dropSets.map(ds => {
                      const dropKey = `${setNumber}_${ds.dropIndex}`;
                      const dropInput = dropSetInputs.get(dropKey) || { weight: String(ds.weight || ''), reps: String(ds.reps || '8') };

                      return (
                        <div key={ds.dropIndex} className="flex items-center gap-2 text-xs bg-zinc-950/60 p-2 rounded-lg border border-red-500/20">
                          <span className="text-red-400 font-bold text-[10px] uppercase w-16 shrink-0 flex items-center gap-1">
                            <Flame className="w-3 h-3" /> Drop #{ds.dropIndex}
                          </span>
                          <div className="flex items-center gap-1 flex-1">
                            <span className="text-[10px] text-zinc-500">Weight:</span>
                            <Input
                              type="number"
                              value={dropInput.weight}
                              onChange={e => {
                                const v = e.target.value;
                                setDropSetInputs(prev => {
                                  const m = new Map(prev);
                                  m.set(dropKey, { weight: v, reps: dropInput.reps });
                                  return m;
                                });
                              }}
                              placeholder="Load"
                              className="h-8 text-center text-xs w-16"
                            />
                            <span className="text-[10px] text-zinc-400">{currentRx.weightUnit || 'kg'}</span>
                          </div>
                          <div className="flex items-center gap-1 flex-1">
                            <span className="text-[10px] text-zinc-500">Reps:</span>
                            <Input
                              type="text"
                              value={dropInput.reps}
                              onChange={e => {
                                const v = e.target.value;
                                setDropSetInputs(prev => {
                                  const m = new Map(prev);
                                  m.set(dropKey, { weight: dropInput.weight, reps: v });
                                  return m;
                                });
                              }}
                              placeholder="Reps"
                              className="h-8 text-center text-xs w-16"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* EXERCISE NAVIGATION CONTROLS */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <Button
          variant="outline"
          disabled={currentExIndex === 0}
          onClick={() => {
            handleSkipRest();
            setCurrentExIndex(prev => Math.max(0, prev - 1));
          }}
          className="h-11 px-4 text-xs font-semibold rounded-xl"
        >
          <ChevronLeft className="w-4 h-4 mr-1" /> Previous
        </Button>

        {currentExIndex < prescriptions.length - 1 ? (
          <Button
            onClick={() => {
              handleSkipRest();
              setCurrentExIndex(prev => Math.min(prescriptions.length - 1, prev + 1));
            }}
            className="h-11 px-6 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Next Exercise <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        ) : (
          <Button
            onClick={() => setShowSummaryModal(true)}
            className="h-11 px-6 text-xs font-bold rounded-xl bg-green-500 text-white hover:bg-green-600 shadow-md shadow-green-500/20"
          >
            Complete Workout <CheckCircle2 className="w-4 h-4 ml-1.5" />
          </Button>
        )}
      </div>

      {/* Floating Finish Workout Button if ready */}
      {isWorkoutFullyCompleted && !showSummaryModal && currentExIndex < prescriptions.length - 1 && (
        <div className="fixed bottom-20 left-4 right-4 max-w-md mx-auto z-30 animate-in slide-in-from-bottom-3 duration-300">
          <Button
            onClick={() => setShowSummaryModal(true)}
            className="w-full h-14 rounded-2xl font-bold text-sm bg-green-500 text-white hover:bg-green-600 shadow-xl shadow-green-500/30 flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-5 h-5" /> All Sets Completed · Finish Workout
          </Button>
        </div>
      )}

      {/* WORKOUT COMPLETION CONFIRMATION MODAL */}
      {showSummaryModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-card border border-border/80 rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="text-center space-y-1">
              <span className="text-xs uppercase font-bold tracking-wider text-primary">Final Confirmation</span>
              <h2 className="text-2xl font-bold font-display text-foreground">Finish Your Workout?</h2>
              <p className="text-sm text-muted-foreground">
                You have logged your training sets for {workout.name}.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-background border border-border/40 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Exercises</span>
                <span className="font-semibold text-foreground">{prescriptions.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sets Completed</span>
                <span className="font-semibold text-foreground">{totalCompletedSets} / {totalRequiredSets}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Elapsed Time</span>
                <span className="font-semibold text-foreground">{Math.max(1, Math.round(elapsedSeconds / 60))} mins</span>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowSummaryModal(false)}
                className="flex-1 h-12 rounded-xl text-sm"
              >
                Keep Logging
              </Button>
              <Button
                onClick={handleFinalizeWorkout}
                disabled={isCompleting}
                className="flex-1 h-12 rounded-xl text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isCompleting ? 'Saving...' : 'Complete Workout'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
