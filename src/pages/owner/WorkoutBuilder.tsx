import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  ArrowLeft, 
  Save, 
  Check, 
  AlertCircle, 
  Plus, 
  Trash2, 
  MoveUp, 
  MoveDown, 
  Copy, 
  Dumbbell, 
  Eye, 
  Clock, 
  HelpCircle, 
  ChevronRight, 
  Calendar,
  AlertTriangle,
  Info,
  CheckCircle2,
  Bookmark,
  Layers,
  Repeat,
  Timer,
  Flame,
  Zap,
  Split,
  Unlink,
  Link2,
  ShieldAlert
} from 'lucide-react';
import { useTenantStore } from '../../store/tenantStore';
import { useAuthStore } from '../../store/authStore';
import { 
  Program, 
  Workout, 
  WorkoutExercisePrescription, 
  WorkoutBlock,
  BlockType,
  DropSetPrescription,
  ValidationIssue,
  SET_TYPE_CONFIGS,
  SetType
} from '../../types/program';
import { Exercise } from '../../types/exercise';
import { 
  fetchProgramWithWorkouts, 
  saveProgramWorkoutsHierarchy, 
  publishProgram,
  validateProgramForPublish,
  updateProgramMetadata 
} from '../../lib/programService';
import { fetchAllExercises } from '../../lib/exerciseService';
import { ExerciseSelectorModal } from '../../components/programs/ExerciseSelectorModal';
import { ValidationModal } from '../../components/programs/ValidationModal';
import { ProgramPreviewModal } from '../../components/programs/ProgramPreviewModal';
import { SaveWorkoutTemplateModal } from '../../components/programs/SaveWorkoutTemplateModal';

const DAY_OPTIONS = [
  'Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7',
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
];

export function WorkoutBuilder() {
  const { programId } = useParams<{ programId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuthStore();
  const { tenantId } = useTenantStore();

  // Core Data
  const [loading, setLoading] = useState(true);
  const [program, setProgram] = useState<Program | null>(null);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [activeWorkoutId, setActiveWorkoutId] = useState<string | null>(null);
  const [exerciseMap, setExerciseMap] = useState<Record<string, Exercise>>({});

  // Dirty State & Saving
  const [isDirty, setIsDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'IDLE' | 'SAVING' | 'SAVED' | 'ERROR'>('IDLE');
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Modals
  const [showExerciseSelector, setShowExerciseSelector] = useState(false);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [workoutToSaveAsTemplate, setWorkoutToSaveAsTemplate] = useState<Workout | null>(null);

  // Auto-save debounce timer ref
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ----------------------------------------------------------------------
  // INITIAL LOAD
  // ----------------------------------------------------------------------
  useEffect(() => {
    if (!tenantId || !programId) return;

    let mounted = true;
    async function loadData() {
      try {
        setLoading(true);
        const [progData, allExercises] = await Promise.all([
          fetchProgramWithWorkouts(tenantId, programId!),
          fetchAllExercises(tenantId)
        ]);

        if (!mounted) return;

        const map: Record<string, Exercise> = {};
        allExercises.forEach(ex => { map[ex.id] = ex; });
        setExerciseMap(map);

        setProgram(progData.program);
        setWorkouts(progData.workouts);

        const targetWId = searchParams.get('workoutId');
        if (targetWId && progData.workouts.some(w => w.id === targetWId)) {
          setActiveWorkoutId(targetWId);
        } else if (progData.workouts.length > 0) {
          setActiveWorkoutId(progData.workouts[0].id);
        }
      } catch (err: any) {
        console.error('Failed to load workout builder:', err);
        setSaveError(err.message || 'Failed to load program data.');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadData();

    return () => {
      mounted = false;
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [tenantId, programId]);

  // Active Workout
  const activeWorkout = useMemo(() => {
    return workouts.find(w => w.id === activeWorkoutId) || workouts[0] || null;
  }, [workouts, activeWorkoutId]);

  // Mark dirty & trigger debounced auto-save
  const markDirty = () => {
    setIsDirty(true);
    setSaveStatus('IDLE');
  };

  // ----------------------------------------------------------------------
  // SAVE IMPLEMENTATION
  // ----------------------------------------------------------------------
  const executeSave = async (silent = false): Promise<boolean> => {
    if (!tenantId || !programId || !user || !program) return false;

    try {
      setSaveStatus('SAVING');
      setSaveError(null);

      // Save metadata and workouts
      await Promise.all([
        updateProgramMetadata(tenantId, programId, user.uid, {
          name: program.name,
          description: program.description,
          durationWeeks: program.durationWeeks,
          difficulty: program.difficulty,
          goal: program.goal,
          customGoal: program.customGoal
        }),
        saveProgramWorkoutsHierarchy(tenantId, programId, user.uid, workouts)
      ]);

      const now = new Date();
      setLastSavedTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setSaveStatus('SAVED');
      setIsDirty(false);
      return true;
    } catch (err: any) {
      console.error('Error saving program:', err);
      setSaveStatus('ERROR');
      setSaveError(err.message || 'Failed to save changes.');
      return false;
    }
  };

  // ----------------------------------------------------------------------
  // WORKOUT CRUD
  // ----------------------------------------------------------------------
  const handleAddWorkout = (weekNumber = 1) => {
    if (!programId || !tenantId) return;

    const newWorkoutId = `wout-${Date.now()}`;
    const newOrder = workouts.length + 1;
    const sameWeekWorkouts = workouts.filter(w => w.weekNumber === weekNumber);
    const dayLabel = DAY_OPTIONS[sameWeekWorkouts.length] || `Day ${sameWeekWorkouts.length + 1}`;

    const newWorkout: Workout = {
      id: newWorkoutId,
      programId,
      tenantId,
      name: `Day ${sameWeekWorkouts.length + 1} — Workout`,
      description: '',
      weekNumber,
      dayOfWeek: dayLabel,
      order: newOrder,
      exerciseCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      exercises: []
    };

    setWorkouts(prev => [...prev, newWorkout]);
    setActiveWorkoutId(newWorkoutId);
    markDirty();
  };

  const handleAddWeek = () => {
    const existingWeeks = workouts.map(w => w.weekNumber || 1);
    const nextWeek = existingWeeks.length > 0 ? Math.max(...existingWeeks) + 1 : 1;
    handleAddWorkout(nextWeek);
  };

  const handleDuplicateWorkout = (workoutToDup: Workout) => {
    if (!programId || !tenantId) return;

    const newWorkoutId = `wout-${Date.now()}`;
    const clonedExercises: WorkoutExercisePrescription[] = (workoutToDup.exercises || []).map((ex, idx) => ({
      ...ex,
      id: `wex-${Date.now()}-${idx + 1}`,
      workoutId: newWorkoutId,
      programId,
      tenantId
    }));

    const clonedWorkout: Workout = {
      ...workoutToDup,
      id: newWorkoutId,
      name: `${workoutToDup.name} (Copy)`,
      order: workouts.length + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      exercises: clonedExercises
    };

    setWorkouts(prev => [...prev, clonedWorkout]);
    setActiveWorkoutId(newWorkoutId);
    markDirty();
  };

  const handleDeleteWorkout = (workoutIdToDelete: string) => {
    if (workouts.length <= 1) {
      alert('A program must keep at least one workout session.');
      return;
    }

    const updated = workouts.filter(w => w.id !== workoutIdToDelete);
    setWorkouts(updated);

    if (activeWorkoutId === workoutIdToDelete) {
      setActiveWorkoutId(updated[0]?.id || null);
    }
    markDirty();
  };

  const handleMoveWorkout = (index: number, direction: 'UP' | 'DOWN') => {
    if (
      (direction === 'UP' && index === 0) || 
      (direction === 'DOWN' && index === workouts.length - 1)
    ) return;

    const newWorkouts = [...workouts];
    const targetIdx = direction === 'UP' ? index - 1 : index + 1;
    const temp = newWorkouts[index];
    newWorkouts[index] = newWorkouts[targetIdx];
    newWorkouts[targetIdx] = temp;

    // re-assign orders
    newWorkouts.forEach((w, idx) => {
      w.order = idx + 1;
    });

    setWorkouts(newWorkouts);
    markDirty();
  };

  const updateActiveWorkoutField = (field: keyof Workout, value: any) => {
    if (!activeWorkout) return;

    setWorkouts(prev => prev.map(w => {
      if (w.id === activeWorkout.id) {
        return { ...w, [field]: value };
      }
      return w;
    }));
    markDirty();
  };

  // ----------------------------------------------------------------------
  // EXERCISE PRESCRIPTION CRUD
  // ----------------------------------------------------------------------
  const handleAddExerciseToWorkout = (exercise: Exercise) => {
    if (!activeWorkout || !programId || !tenantId) return;

    const currentExercises = activeWorkout.exercises || [];
    const newExId = `wex-${Date.now()}-${currentExercises.length + 1}`;

    const newPrescription: WorkoutExercisePrescription = {
      id: newExId,
      workoutId: activeWorkout.id,
      programId,
      tenantId,
      exerciseId: exercise.id,
      order: currentExercises.length + 1,
      setType: 'NORMAL',
      sets: 3,
      reps: '10',
      weight: null,
      weightUnit: 'lbs',
      restSeconds: 60,
      notes: '',
      exerciseDetails: exercise
    };

    setWorkouts(prev => prev.map(w => {
      if (w.id === activeWorkout.id) {
        const updatedExercises = [...(w.exercises || []), newPrescription];
        return {
          ...w,
          exerciseCount: updatedExercises.length,
          exercises: updatedExercises
        };
      }
      return w;
    }));

    markDirty();
  };

  const handleRemoveExercise = (exerciseIdToRemove: string) => {
    if (!activeWorkout) return;

    setWorkouts(prev => prev.map(w => {
      if (w.id === activeWorkout.id) {
        const filtered = (w.exercises || []).filter(e => e.id !== exerciseIdToRemove);
        // re-index order
        filtered.forEach((e, idx) => { e.order = idx + 1; });
        return {
          ...w,
          exerciseCount: filtered.length,
          exercises: filtered
        };
      }
      return w;
    }));

    markDirty();
  };

  const handleMoveExercise = (index: number, direction: 'UP' | 'DOWN') => {
    if (!activeWorkout || !activeWorkout.exercises) return;

    const exList = [...activeWorkout.exercises];
    if (
      (direction === 'UP' && index === 0) || 
      (direction === 'DOWN' && index === exList.length - 1)
    ) return;

    const targetIdx = direction === 'UP' ? index - 1 : index + 1;
    const temp = exList[index];
    exList[index] = exList[targetIdx];
    exList[targetIdx] = temp;

    // re-index order
    exList.forEach((e, idx) => { e.order = idx + 1; });

    setWorkouts(prev => prev.map(w => {
      if (w.id === activeWorkout.id) {
        return { ...w, exercises: exList };
      }
      return w;
    }));

    markDirty();
  };

  const handleUpdatePrescription = (
    exerciseId: string, 
    field: keyof WorkoutExercisePrescription, 
    value: any
  ) => {
    if (!activeWorkout) return;

    setWorkouts(prev => prev.map(w => {
      if (w.id === activeWorkout.id) {
        const updated = (w.exercises || []).map(ex => {
          if (ex.id === exerciseId) {
            return { ...ex, [field]: value };
          }
          return ex;
        });
        return { ...w, exercises: updated };
      }
      return w;
    }));

    markDirty();
  };

  // ----------------------------------------------------------------------
  // BLOCK MANAGEMENT (SUPERSETS & CIRCUITS)
  // ----------------------------------------------------------------------
  const handleCreateBlock = (type: BlockType, targetExerciseIds: string[]) => {
    if (!activeWorkout || targetExerciseIds.length < 2) return;

    const blockId = `block-${Date.now()}`;
    const existingBlocks = activeWorkout.blocks || [];
    const blockLetter = String.fromCharCode(65 + existingBlocks.length); // A, B, C...
    const blockName = type === 'SUPERSET' ? `Superset ${blockLetter}` : `Circuit ${existingBlocks.length + 1}`;

    const newBlock: WorkoutBlock = {
      id: blockId,
      workoutId: activeWorkout.id,
      type,
      order: existingBlocks.length + 1,
      name: blockName,
      rounds: 3,
      restSeconds: type === 'SUPERSET' ? 90 : 120,
      exerciseIds: targetExerciseIds
    };

    setWorkouts(prev => prev.map(w => {
      if (w.id === activeWorkout.id) {
        const updatedBlocks = [...(w.blocks || []), newBlock];
        const updatedExercises = (w.exercises || []).map(ex => {
          if (targetExerciseIds.includes(ex.id)) {
            return {
              ...ex,
              blockId,
              blockType: type,
              setType: type === 'SUPERSET' ? ('SUPERSET' as SetType) : ('CIRCUIT' as SetType)
            };
          }
          return ex;
        });
        return {
          ...w,
          blocks: updatedBlocks,
          exercises: updatedExercises
        };
      }
      return w;
    }));

    markDirty();
  };

  const handleUngroupBlock = (blockId: string) => {
    if (!activeWorkout) return;

    setWorkouts(prev => prev.map(w => {
      if (w.id === activeWorkout.id) {
        const updatedBlocks = (w.blocks || []).filter(b => b.id !== blockId);
        const updatedExercises = (w.exercises || []).map(ex => {
          if (ex.blockId === blockId) {
            return {
              ...ex,
              blockId: '',
              blockType: 'SINGLE' as BlockType,
              setType: 'NORMAL' as SetType
            };
          }
          return ex;
        });
        return {
          ...w,
          blocks: updatedBlocks,
          exercises: updatedExercises
        };
      }
      return w;
    }));

    markDirty();
  };

  const handleUpdateBlock = (blockId: string, updates: Partial<WorkoutBlock>) => {
    if (!activeWorkout) return;

    setWorkouts(prev => prev.map(w => {
      if (w.id === activeWorkout.id) {
        const updatedBlocks = (w.blocks || []).map(b => {
          if (b.id === blockId) {
            return { ...b, ...updates };
          }
          return b;
        });
        return { ...w, blocks: updatedBlocks };
      }
      return w;
    }));

    markDirty();
  };

  // ----------------------------------------------------------------------
  // DROP SET STAGES HANDLER
  // ----------------------------------------------------------------------
  const handleAddDropStage = (exerciseId: string) => {
    if (!activeWorkout) return;

    setWorkouts(prev => prev.map(w => {
      if (w.id === activeWorkout.id) {
        const updated = (w.exercises || []).map(ex => {
          if (ex.id === exerciseId) {
            const currentDrops = ex.dropSets || [];
            const newDrop: DropSetPrescription = {
              dropIndex: currentDrops.length + 1,
              weight: ex.weight ? Math.round(ex.weight * 0.8) : null,
              reps: '8-10',
              isFailure: true
            };
            return {
              ...ex,
              dropSets: [...currentDrops, newDrop]
            };
          }
          return ex;
        });
        return { ...w, exercises: updated };
      }
      return w;
    }));

    markDirty();
  };

  const handleRemoveDropStage = (exerciseId: string, dropIndex: number) => {
    if (!activeWorkout) return;

    setWorkouts(prev => prev.map(w => {
      if (w.id === activeWorkout.id) {
        const updated = (w.exercises || []).map(ex => {
          if (ex.id === exerciseId) {
            const filtered = (ex.dropSets || [])
              .filter(d => d.dropIndex !== dropIndex)
              .map((d, idx) => ({ ...d, dropIndex: idx + 1 }));
            return {
              ...ex,
              dropSets: filtered
            };
          }
          return ex;
        });
        return { ...w, exercises: updated };
      }
      return w;
    }));

    markDirty();
  };

  const handleUpdateDropStage = (
    exerciseId: string, 
    dropIndex: number, 
    field: keyof DropSetPrescription, 
    value: any
  ) => {
    if (!activeWorkout) return;

    setWorkouts(prev => prev.map(w => {
      if (w.id === activeWorkout.id) {
        const updated = (w.exercises || []).map(ex => {
          if (ex.id === exerciseId) {
            const updatedDrops = (ex.dropSets || []).map(d => {
              if (d.dropIndex === dropIndex) {
                return { ...d, [field]: value };
              }
              return d;
            });
            return {
              ...ex,
              dropSets: updatedDrops
            };
          }
          return ex;
        });
        return { ...w, exercises: updated };
      }
      return w;
    }));

    markDirty();
  };

  // ----------------------------------------------------------------------
  // PUBLISH WORKFLOW
  // ----------------------------------------------------------------------
  const handlePublish = async () => {
    if (!program || !tenantId || !user) return;

    // Run client-side validation
    const { isValid, issues } = validateProgramForPublish(program, workouts);

    if (!isValid) {
      setValidationIssues(issues);
      setShowValidationModal(true);
      return;
    }

    try {
      setSaveStatus('SAVING');
      await publishProgram(tenantId, program.id, user.uid, workouts);
      setProgram(prev => prev ? { ...prev, status: 'ACTIVE' } : null);
      setIsDirty(false);
      setSaveStatus('SAVED');
      alert(`Program "${program.name}" has been published and is now Active!`);
    } catch (err: any) {
      console.error('Publish error:', err);
      setSaveError(err.message || 'Failed to publish program.');
      setSaveStatus('ERROR');
    }
  };

  // ----------------------------------------------------------------------
  // ESTIMATED STATS FOR ACTIVE WORKOUT
  // ----------------------------------------------------------------------
  const activeWorkoutStats = useMemo(() => {
    if (!activeWorkout || !activeWorkout.exercises) return { totalSets: 0, estimatedMins: 0 };
    let totalSets = 0;
    let totalSeconds = 0;

    activeWorkout.exercises.forEach(ex => {
      const sets = Number(ex.sets) || 0;
      const rest = Number(ex.restSeconds) || 60;
      const workTime = ex.durationSeconds || 45;
      totalSets += sets;
      totalSeconds += sets * (workTime + rest);
    });

    return {
      totalSets,
      estimatedMins: Math.round(totalSeconds / 60)
    };
  }, [activeWorkout]);

  // Group workouts by week for schedule tree
  const weekGroups = useMemo(() => {
    const map = new Map<number, Workout[]>();
    workouts.forEach(w => {
      const wk = w.weekNumber || 1;
      if (!map.has(wk)) map.set(wk, []);
      map.get(wk)!.push(w);
    });
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [workouts]);

  if (loading) {
    return (
      <div className="py-24 text-center text-zinc-500 text-sm">
        Loading workout builder...
      </div>
    );
  }

  if (!program) {
    return (
      <div className="py-24 text-center space-y-3">
        <p className="text-zinc-300 font-semibold">Program not found.</p>
        <button
          onClick={() => navigate('/owner/programs')}
          className="px-4 py-2 bg-zinc-800 text-zinc-200 rounded-xl text-xs"
        >
          Return to Programs
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto space-y-5 pb-16">
      
      {/* ================================================================ */}
      {/* TOP BUILDER NAVIGATION BAR */}
      {/* ================================================================ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800/90 shadow-sm">
        
        {/* Left: Back & Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (isDirty) {
                setShowExitConfirm(true);
              } else {
                navigate(`/owner/programs/${programId}`);
              }
            }}
            className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-xl transition-colors shrink-0"
            title="Return to Training Schedule"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => {
                  if (isDirty) {
                    setShowExitConfirm(true);
                  } else {
                    navigate('/owner/programs');
                  }
                }}
                className="text-xs text-zinc-400 hover:text-zinc-200 font-medium transition-colors"
              >
                Programs
              </button>
              <span className="text-zinc-600">/</span>
              <button 
                onClick={() => {
                  if (isDirty) {
                    setShowExitConfirm(true);
                  } else {
                    navigate(`/owner/programs/${programId}`);
                  }
                }}
                className="text-xs text-amber-400/90 hover:text-amber-300 font-medium transition-colors"
              >
                Schedule
              </button>
              <span className="text-zinc-600">/</span>
              <input
                type="text"
                value={program.name}
                onChange={(e) => {
                  setProgram(prev => prev ? { ...prev, name: e.target.value } : null);
                  markDirty();
                }}
                className="text-base font-bold text-zinc-100 bg-transparent hover:bg-zinc-800/40 focus:bg-zinc-950 px-1.5 py-0.5 rounded-lg border border-transparent focus:border-amber-500/50 focus:outline-none transition-all tracking-tight"
                placeholder="Program Name"
              />
              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border ${
                program.status === 'ACTIVE'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              }`}>
                {program.status}
              </span>
            </div>

            <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-400">
              <span>{program.goal}</span>
              <span>•</span>
              <span>{program.difficulty} Level</span>
              <span>•</span>
              <span>{program.durationWeeks} Weeks</span>
            </div>
          </div>
        </div>

        {/* Right: Dirty Status, Save & Publish */}
        <div className="flex items-center gap-2.5 flex-wrap">
          
          {/* Status Indicator */}
          <div className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800">
            {saveStatus === 'SAVING' ? (
              <span className="flex items-center gap-1.5 text-amber-400">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <span>Saving...</span>
              </span>
            ) : isDirty ? (
              <span className="flex items-center gap-1.5 text-amber-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>Unsaved changes</span>
              </span>
            ) : saveStatus === 'SAVED' || lastSavedTime ? (
              <span className="flex items-center gap-1.5 text-emerald-400">
                <Check className="w-3.5 h-3.5" />
                <span>Saved {lastSavedTime ? `at ${lastSavedTime}` : ''}</span>
              </span>
            ) : (
              <span className="text-zinc-500">All changes saved</span>
            )}
          </div>

          {/* Schedule View Link */}
          <button
            onClick={() => {
              if (isDirty) {
                setShowExitConfirm(true);
              } else {
                navigate(`/owner/programs/${programId}`);
              }
            }}
            className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors border border-zinc-700/50"
            title="View Weekly Training Schedule"
          >
            <Calendar className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Training Schedule</span>
          </button>

          {/* Preview Toggle */}
          <button
            onClick={() => setShowPreviewModal(true)}
            className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Preview</span>
          </button>

          {/* Manual Save Draft */}
          <button
            onClick={() => executeSave(false)}
            disabled={saveStatus === 'SAVING'}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border border-zinc-700/60 disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Draft</span>
          </button>

          {/* Publish Button */}
          <button
            onClick={handlePublish}
            disabled={saveStatus === 'SAVING'}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-50"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Publish Program</span>
          </button>

        </div>
      </div>

      {saveError && (
        <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{saveError}</span>
          </div>
          <button onClick={() => setSaveError(null)} className="text-red-300 underline">
            Dismiss
          </button>
        </div>
      )}

      {/* ================================================================ */}
      {/* MAIN TWO-COLUMN WORKOUT BUILDER LAYOUT */}
      {/* ================================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* -------------------------------------------------------------- */}
        {/* LEFT COLUMN: SCHEDULE TREE & WORKOUT NAVIGATION (4 Cols) */}
        {/* -------------------------------------------------------------- */}
        <div className="lg:col-span-4 bg-zinc-900/60 border border-zinc-800/90 rounded-2xl p-4 space-y-4">
          
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-200">
                Program Structure
              </h3>
            </div>

            <button
              onClick={handleAddWeek}
              className="text-xs text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Week</span>
            </button>
          </div>

          {/* Week Groups & Workouts Tree */}
          <div className="space-y-4 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
            {weekGroups.map(([weekNum, weekWorkouts]) => (
              <div key={weekNum} className="space-y-1.5">
                
                {/* Week Header */}
                <div className="flex items-center justify-between px-2 py-1 text-xs text-zinc-400">
                  <span className="font-semibold text-zinc-300 uppercase tracking-wider text-[11px]">
                    Week {weekNum}
                  </span>
                  <button
                    onClick={() => handleAddWorkout(weekNum)}
                    className="text-[11px] text-zinc-400 hover:text-amber-400 flex items-center gap-1 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Workout</span>
                  </button>
                </div>

                {/* Workouts in this week */}
                <div className="space-y-1 pl-1">
                  {weekWorkouts.map((w, idx) => {
                    const isActive = w.id === activeWorkout?.id;
                    const overallIndex = workouts.findIndex(item => item.id === w.id);
                    const exCount = (w.exercises || []).length;

                    return (
                      <div
                        key={w.id}
                        className={`group relative rounded-xl border p-2.5 transition-all flex items-center justify-between ${
                          isActive
                            ? 'bg-zinc-950 border-amber-500/50 shadow-sm'
                            : 'bg-zinc-950/40 border-zinc-800/80 hover:bg-zinc-950/80 hover:border-zinc-700'
                        }`}
                      >
                        <div
                          onClick={() => setActiveWorkoutId(w.id)}
                          className="flex-1 cursor-pointer pr-2"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-semibold text-amber-400 shrink-0">
                              {w.dayOfWeek || `Day ${idx + 1}`}
                            </span>
                            <span className="text-xs font-medium text-zinc-200 line-clamp-1">
                              {w.name}
                            </span>
                          </div>
                          <span className="text-[10px] text-zinc-500 block mt-0.5">
                            {exCount} {exCount === 1 ? 'exercise' : 'exercises'}
                          </span>
                        </div>

                        {/* Quick Workout Actions */}
                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleMoveWorkout(overallIndex, 'UP')}
                            disabled={overallIndex === 0}
                            className="p-1 text-zinc-500 hover:text-zinc-200 disabled:opacity-20"
                            title="Move Up"
                          >
                            <MoveUp className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleMoveWorkout(overallIndex, 'DOWN')}
                            disabled={overallIndex === workouts.length - 1}
                            className="p-1 text-zinc-500 hover:text-zinc-200 disabled:opacity-20"
                            title="Move Down"
                          >
                            <MoveDown className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDuplicateWorkout(w)}
                            className="p-1 text-zinc-500 hover:text-zinc-200"
                            title="Duplicate Workout"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => setWorkoutToSaveAsTemplate(w)}
                            className="p-1 text-zinc-500 hover:text-amber-400"
                            title="Save as Gym Template"
                          >
                            <Bookmark className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteWorkout(w.id)}
                            className="p-1 text-zinc-500 hover:text-red-400"
                            title="Delete Workout"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-zinc-800/80 flex justify-center">
            <button
              onClick={() => handleAddWorkout(workouts[workouts.length - 1]?.weekNumber || 1)}
              className="w-full py-2 bg-zinc-950 hover:bg-zinc-850 border border-zinc-800 rounded-xl text-xs font-medium text-zinc-300 flex items-center justify-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Workout to Schedule</span>
            </button>
          </div>

        </div>

        {/* -------------------------------------------------------------- */}
        {/* RIGHT COLUMN: ACTIVE WORKOUT CANVAS & PRESCRIPTION (8 Cols) */}
        {/* -------------------------------------------------------------- */}
        <div className="lg:col-span-8 space-y-4">
          
          {activeWorkout ? (
            <>
              {/* Workout Attributes Card */}
              <div className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800/90 space-y-4 shadow-sm">
                
                {/* Title & Day Row */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-7">
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                      Workout Title
                    </label>
                    <input
                      type="text"
                      value={activeWorkout.name}
                      onChange={(e) => updateActiveWorkoutField('name', e.target.value)}
                      placeholder="e.g. Upper Body Push — Hypertrophy"
                      className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-sm font-semibold text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500/50"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                      Scheduled Day
                    </label>
                    <input
                      type="text"
                      list="day-suggestions"
                      value={activeWorkout.dayOfWeek || 'Monday'}
                      onChange={(e) => updateActiveWorkoutField('dayOfWeek', e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-amber-500/50"
                    />
                    <datalist id="day-suggestions">
                      {DAY_OPTIONS.map(d => (
                        <option key={d} value={d} />
                      ))}
                    </datalist>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                      Week #
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={52}
                      value={activeWorkout.weekNumber || 1}
                      onChange={(e) => updateActiveWorkoutField('weekNumber', parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 text-center focus:outline-none focus:border-amber-500/50"
                    />
                  </div>
                </div>

                {/* Description & Coaching Cues */}
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                    Workout Coaching Notes & Session Focus <span className="text-zinc-500 font-normal lowercase">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={activeWorkout.description || ''}
                    onChange={(e) => updateActiveWorkoutField('description', e.target.value)}
                    placeholder="e.g. Emphasize full range of motion, maintain steady tempo on squats, warm up shoulders thoroughly."
                    className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-300 placeholder-zinc-500 focus:outline-none focus:border-amber-500/50"
                  />
                </div>

                {/* Session Summary Badges */}
                <div className="flex items-center justify-between gap-3 pt-1 text-xs text-zinc-400 flex-wrap">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800">
                      <Dumbbell className="w-3.5 h-3.5 text-amber-400" />
                      <strong className="text-zinc-200">{(activeWorkout.exercises || []).length}</strong> Exercises
                    </span>
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800">
                      <strong className="text-zinc-200">{activeWorkoutStats.totalSets}</strong> Total Sets
                    </span>
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800">
                      <Clock className="w-3.5 h-3.5 text-zinc-500" />
                      Est. Duration: <strong className="text-zinc-200">~{activeWorkoutStats.estimatedMins || 15} min</strong>
                    </span>
                  </div>

                  <button
                    onClick={() => setWorkoutToSaveAsTemplate(activeWorkout)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-zinc-950 hover:bg-zinc-850 border border-zinc-800 text-xs font-medium text-amber-400 hover:text-amber-300 transition-colors"
                    title="Save this workout layout to template library"
                  >
                    <Bookmark className="w-3.5 h-3.5" />
                    <span>Save as Template</span>
                  </button>
                </div>

              </div>

              {/* Prescribed Exercises & Blocks Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
                      <span>Exercise Prescriptions & Blocks</span>
                      <span className="text-zinc-500 font-normal">
                        ({(activeWorkout.exercises || []).length})
                      </span>
                    </h3>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Quick Grouping Buttons */}
                    {(activeWorkout.exercises || []).length >= 2 && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            const unblocked = (activeWorkout.exercises || []).filter(e => !e.blockId);
                            if (unblocked.length >= 2) {
                              handleCreateBlock('SUPERSET', [unblocked[0].id, unblocked[1].id]);
                            } else {
                              handleCreateBlock('SUPERSET', [(activeWorkout.exercises || [])[0].id, (activeWorkout.exercises || [])[1].id]);
                            }
                          }}
                          className="px-3 py-1.5 bg-zinc-950 hover:bg-zinc-850 border border-zinc-800 text-amber-400 hover:text-amber-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                          title="Group two exercises into a Superset block"
                        >
                          <Layers className="w-3.5 h-3.5" />
                          <span>+ Superset</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const unblocked = (activeWorkout.exercises || []).filter(e => !e.blockId);
                            if (unblocked.length >= 3) {
                              handleCreateBlock('CIRCUIT', unblocked.slice(0, 3).map(e => e.id));
                            } else if ((activeWorkout.exercises || []).length >= 3) {
                              handleCreateBlock('CIRCUIT', (activeWorkout.exercises || []).slice(0, 3).map(e => e.id));
                            } else {
                              handleCreateBlock('CIRCUIT', (activeWorkout.exercises || []).map(e => e.id));
                            }
                          }}
                          className="px-3 py-1.5 bg-zinc-950 hover:bg-zinc-850 border border-zinc-800 text-cyan-400 hover:text-cyan-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                          title="Group exercises into a Circuit block"
                        >
                          <Repeat className="w-3.5 h-3.5" />
                          <span>+ Circuit</span>
                        </button>
                      </>
                    )}

                    <button
                      onClick={() => setShowExerciseSelector(true)}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Exercise</span>
                    </button>
                  </div>
                </div>

                {/* Exercises & Blocks List */}
                {(!activeWorkout.exercises || activeWorkout.exercises.length === 0) ? (
                  <div className="p-12 text-center rounded-2xl bg-zinc-900/40 border border-dashed border-zinc-800 space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mx-auto">
                      <Dumbbell className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-zinc-200">
                        No exercises in this workout session yet.
                      </p>
                      <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-1">
                        Select exercises from your Exercise Library and prescribe sets, reps, load, tempo, RPE, drop sets, and supersets.
                      </p>
                    </div>
                    <button
                      onClick={() => setShowExerciseSelector(true)}
                      className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-medium inline-flex items-center gap-1.5 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Browse Library</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Render by Blocks or Standalone */}
                    {(() => {
                      const allExercises = activeWorkout.exercises || [];
                      const blocks = activeWorkout.blocks || [];
                      const processedExIds = new Set<string>();
                      const elements: React.ReactNode[] = [];

                      // Helper to render an individual prescription card
                      const renderPrescriptionCard = (
                        prescription: WorkoutExercisePrescription, 
                        exIndex: number,
                        blockContext?: { block: WorkoutBlock; indexInBlock: number }
                      ) => {
                        const resolved = exerciseMap[prescription.exerciseId] || prescription.exerciseDetails;
                        const isWarmup = prescription.setType === 'WARMUP';
                        const isDropSet = prescription.setType === 'DROP_SET';
                        const isEmom = prescription.setType === 'EMOM';
                        const isAmrap = prescription.setType === 'AMRAP';
                        const isTimed = prescription.setType === 'TIMED';

                        return (
                          <div
                            key={prescription.id}
                            className={`rounded-2xl border transition-all p-4 space-y-3 ${
                              blockContext
                                ? 'bg-zinc-950/70 border-zinc-800/80 shadow-sm'
                                : isWarmup
                                ? 'bg-amber-500/[0.03] border-amber-500/20'
                                : 'bg-zinc-900/60 border-zinc-800/90'
                            }`}
                          >
                            {/* Exercise Card Header */}
                            <div className="flex items-center justify-between gap-3 pb-3 border-b border-zinc-800/60">
                              
                              {/* Exercise Identity */}
                              <div className="flex items-center gap-3">
                                <span className={`w-7 h-7 rounded-lg border font-bold text-xs flex items-center justify-center shrink-0 ${
                                  blockContext?.block.type === 'SUPERSET'
                                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                    : blockContext?.block.type === 'CIRCUIT'
                                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                                    : 'bg-zinc-800 border-zinc-700/60 text-zinc-200'
                                }`}>
                                  {blockContext
                                    ? `${blockContext.block.name?.split(' ')[1] || 'S'}${blockContext.indexInBlock + 1}`
                                    : exIndex + 1}
                                </span>

                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="text-sm font-semibold text-zinc-100">
                                      {resolved?.name || 'Exercise'}
                                    </h4>
                                    {resolved?.targetMuscleGroup && (
                                      <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 text-[10px] font-medium border border-amber-500/20">
                                        {resolved.targetMuscleGroup}
                                      </span>
                                    )}
                                    {resolved?.equipment && (
                                      <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-400 text-[10px]">
                                        {resolved.equipment}
                                      </span>
                                    )}
                                    {isDropSet && (
                                      <span className="px-2 py-0.5 rounded-md bg-red-500/10 text-red-400 text-[10px] font-medium border border-red-500/20 flex items-center gap-1">
                                        <Flame className="w-3 h-3" />
                                        Drop Set
                                      </span>
                                    )}
                                    {isEmom && (
                                      <span className="px-2 py-0.5 rounded-md bg-orange-500/10 text-orange-400 text-[10px] font-medium border border-orange-500/20 flex items-center gap-1">
                                        <Timer className="w-3 h-3" />
                                        EMOM
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Reordering and Delete Controls */}
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleMoveExercise(exIndex, 'UP')}
                                  disabled={exIndex === 0}
                                  className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg disabled:opacity-20 transition-colors"
                                  title="Move Up"
                                >
                                  <MoveUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleMoveExercise(exIndex, 'DOWN')}
                                  disabled={exIndex === allExercises.length - 1}
                                  className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg disabled:opacity-20 transition-colors"
                                  title="Move Down"
                                >
                                  <MoveDown className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveExercise(prescription.id)}
                                  className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors ml-1"
                                  title="Remove Exercise"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>

                            </div>

                            {/* Primary Prescription Controls Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                              
                              {/* Set Type */}
                              <div className="col-span-2 sm:col-span-1">
                                <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                                  Set Type
                                </label>
                                <select
                                  value={prescription.setType}
                                  onChange={(e) => handleUpdatePrescription(prescription.id, 'setType', e.target.value as SetType)}
                                  className="w-full px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-amber-500/50"
                                >
                                  {SET_TYPE_CONFIGS.map(cfg => (
                                    <option key={cfg.type} value={cfg.type}>
                                      {cfg.label}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              {/* Sets */}
                              <div>
                                <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                                  {blockContext ? 'Rounds/Sets' : 'Sets'}
                                </label>
                                <input
                                  type="number"
                                  min={1}
                                  max={20}
                                  value={prescription.sets}
                                  onChange={(e) => handleUpdatePrescription(prescription.id, 'sets', Math.max(1, parseInt(e.target.value) || 1))}
                                  className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-semibold text-zinc-100 text-center focus:outline-none focus:border-amber-500/50"
                                />
                              </div>

                              {/* Reps */}
                              <div>
                                <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                                  {isTimed ? 'Duration' : 'Reps'}
                                </label>
                                <input
                                  type="text"
                                  placeholder={isTimed ? '45s' : isEmom ? '12/min' : '10, 8-12'}
                                  value={prescription.reps}
                                  onChange={(e) => handleUpdatePrescription(prescription.id, 'reps', e.target.value)}
                                  className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 text-center focus:outline-none focus:border-amber-500/50"
                                />
                              </div>

                              {/* Target Weight & Unit */}
                              <div>
                                <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                                  Target Load
                                </label>
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    placeholder="—"
                                    value={prescription.weight !== null && prescription.weight !== undefined ? prescription.weight : ''}
                                    onChange={(e) => handleUpdatePrescription(
                                      prescription.id, 
                                      'weight', 
                                      e.target.value === '' ? null : Number(e.target.value)
                                    )}
                                    className="w-full px-2 py-1.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 text-center focus:outline-none focus:border-amber-500/50"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleUpdatePrescription(
                                      prescription.id, 
                                      'weightUnit', 
                                      prescription.weightUnit === 'lbs' ? 'kg' : 'lbs'
                                    )}
                                    className="px-2 py-1.5 bg-zinc-800 rounded-xl text-[10px] font-semibold text-zinc-300 hover:text-white shrink-0"
                                  >
                                    {prescription.weightUnit}
                                  </button>
                                </div>
                              </div>

                              {/* Rest Seconds */}
                              <div>
                                <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                                  Rest (sec)
                                </label>
                                <input
                                  type="number"
                                  min={0}
                                  step={15}
                                  value={prescription.restSeconds}
                                  onChange={(e) => handleUpdatePrescription(
                                    prescription.id, 
                                    'restSeconds', 
                                    Math.max(0, parseInt(e.target.value) || 0)
                                  )}
                                  className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 text-center focus:outline-none focus:border-amber-500/50"
                                />
                              </div>

                            </div>

                            {/* Drop Set Configuration Row (if DROP_SET) */}
                            {isDropSet && (
                              <div className="p-3 rounded-xl bg-zinc-950 border border-red-500/20 space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-[11px] font-bold text-red-400 flex items-center gap-1.5">
                                    <Flame className="w-3.5 h-3.5" />
                                    Drop Set Stages (Immediate Weight Drops)
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleAddDropStage(prescription.id)}
                                    className="text-[10px] text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1"
                                  >
                                    <Plus className="w-3 h-3" />
                                    <span>Add Drop</span>
                                  </button>
                                </div>

                                {(!prescription.dropSets || prescription.dropSets.length === 0) ? (
                                  <div className="text-[11px] text-zinc-500 py-1">
                                    Click "Add Drop" to configure descending weight stages without rest upon failure.
                                  </div>
                                ) : (
                                  <div className="space-y-1.5">
                                    {prescription.dropSets.map(drop => (
                                      <div key={drop.dropIndex} className="flex items-center gap-2 text-xs bg-zinc-900/80 p-2 rounded-lg border border-zinc-800">
                                        <span className="font-bold text-red-400 text-[10px] uppercase w-14 shrink-0">
                                          Drop #{drop.dropIndex}
                                        </span>
                                        <div className="flex items-center gap-1 flex-1">
                                          <span className="text-[10px] text-zinc-500">Weight:</span>
                                          <input
                                            type="number"
                                            placeholder="Load"
                                            value={drop.weight !== null && drop.weight !== undefined ? drop.weight : ''}
                                            onChange={(e) => handleUpdateDropStage(
                                              prescription.id, 
                                              drop.dropIndex, 
                                              'weight', 
                                              e.target.value === '' ? null : Number(e.target.value)
                                            )}
                                            className="w-16 px-2 py-0.5 bg-zinc-950 border border-zinc-800 rounded text-xs text-center text-zinc-100"
                                          />
                                          <span className="text-[10px] text-zinc-400">{prescription.weightUnit}</span>
                                        </div>
                                        <div className="flex items-center gap-1 flex-1">
                                          <span className="text-[10px] text-zinc-500">Target Reps:</span>
                                          <input
                                            type="text"
                                            placeholder="e.g. 8 or Failure"
                                            value={drop.reps || ''}
                                            onChange={(e) => handleUpdateDropStage(
                                              prescription.id, 
                                              drop.dropIndex, 
                                              'reps', 
                                              e.target.value
                                            )}
                                            className="w-24 px-2 py-0.5 bg-zinc-950 border border-zinc-800 rounded text-xs text-center text-zinc-100"
                                          />
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => handleRemoveDropStage(prescription.id, drop.dropIndex)}
                                          className="p-1 text-zinc-500 hover:text-red-400"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* EMOM Configuration Row (if EMOM) */}
                            {isEmom && (
                              <div className="p-3 rounded-xl bg-zinc-950 border border-orange-500/20 flex items-center gap-4 flex-wrap text-xs">
                                <div className="flex items-center gap-1.5 text-orange-400 font-semibold text-[11px]">
                                  <Timer className="w-3.5 h-3.5" />
                                  EMOM Settings:
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="text-[10px] text-zinc-400">Total Minutes:</span>
                                  <input
                                    type="number"
                                    min={1}
                                    max={60}
                                    placeholder="10"
                                    value={prescription.emomMinutes || ''}
                                    onChange={(e) => handleUpdatePrescription(
                                      prescription.id, 
                                      'emomMinutes', 
                                      e.target.value === '' ? null : Number(e.target.value)
                                    )}
                                    className="w-16 px-2 py-1 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-center text-zinc-100"
                                  />
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="text-[10px] text-zinc-400">Reps / Minute:</span>
                                  <input
                                    type="number"
                                    min={1}
                                    max={50}
                                    placeholder="12"
                                    value={prescription.emomRepsPerMinute || ''}
                                    onChange={(e) => handleUpdatePrescription(
                                      prescription.id, 
                                      'emomRepsPerMinute', 
                                      e.target.value === '' ? null : Number(e.target.value)
                                    )}
                                    className="w-16 px-2 py-1 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-center text-zinc-100"
                                  />
                                </div>
                              </div>
                            )}

                            {/* AMRAP or Timed Configuration Row */}
                            {(isAmrap || isTimed) && (
                              <div className="p-3 rounded-xl bg-zinc-950 border border-cyan-500/20 flex items-center gap-4 flex-wrap text-xs">
                                <div className="flex items-center gap-1.5 text-cyan-400 font-semibold text-[11px]">
                                  <Clock className="w-3.5 h-3.5" />
                                  {isAmrap ? 'AMRAP Window:' : 'Work Interval Duration:'}
                                </div>
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    min={5}
                                    step={5}
                                    placeholder="Seconds (e.g. 300)"
                                    value={prescription.targetDurationSeconds || prescription.durationSeconds || ''}
                                    onChange={(e) => {
                                      const val = e.target.value === '' ? null : Number(e.target.value);
                                      handleUpdatePrescription(prescription.id, 'targetDurationSeconds', val);
                                      handleUpdatePrescription(prescription.id, 'durationSeconds', val);
                                    }}
                                    className="w-24 px-2 py-1 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-center text-zinc-100"
                                  />
                                  <span className="text-[10px] text-zinc-400">seconds (~{Math.round(((prescription.targetDurationSeconds || 0) / 60) * 10) / 10} min)</span>
                                </div>
                              </div>
                            )}

                            {/* Secondary Prescription Inputs (RPE, RIR, Tempo, Coach Notes) */}
                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2 border-t border-zinc-800/40 text-xs">
                              
                              {/* RPE */}
                              <div className="sm:col-span-2">
                                <label className="block text-[10px] text-zinc-500 uppercase font-medium mb-1">
                                  Target RPE (1-10)
                                </label>
                                <input
                                  type="number"
                                  min={1}
                                  max={10}
                                  step={0.5}
                                  placeholder="e.g. 8"
                                  value={prescription.rpe !== null && prescription.rpe !== undefined ? prescription.rpe : ''}
                                  onChange={(e) => handleUpdatePrescription(
                                    prescription.id,
                                    'rpe',
                                    e.target.value === '' ? null : Number(e.target.value)
                                  )}
                                  className="w-full px-2.5 py-1 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-amber-500/50 text-center"
                                />
                              </div>

                              {/* RIR */}
                              <div className="sm:col-span-2">
                                <label className="block text-[10px] text-zinc-500 uppercase font-medium mb-1">
                                  Target RIR (0-5)
                                </label>
                                <input
                                  type="number"
                                  min={0}
                                  max={5}
                                  placeholder="e.g. 2"
                                  value={prescription.rir !== null && prescription.rir !== undefined ? prescription.rir : ''}
                                  onChange={(e) => handleUpdatePrescription(
                                    prescription.id,
                                    'rir',
                                    e.target.value === '' ? null : Number(e.target.value)
                                  )}
                                  className="w-full px-2.5 py-1 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-amber-500/50 text-center"
                                />
                              </div>

                              {/* Tempo */}
                              <div className="sm:col-span-2">
                                <label className="block text-[10px] text-zinc-500 uppercase font-medium mb-1">
                                  Tempo (e.g. 3-0-1-0)
                                </label>
                                <input
                                  type="text"
                                  placeholder="3-0-1-0"
                                  value={prescription.tempo || ''}
                                  onChange={(e) => handleUpdatePrescription(prescription.id, 'tempo', e.target.value)}
                                  className="w-full px-2.5 py-1 bg-zinc-950 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-200 focus:outline-none focus:border-amber-500/50 text-center"
                                />
                              </div>

                              {/* Coaching Cues / Notes */}
                              <div className="sm:col-span-6">
                                <label className="block text-[10px] text-zinc-500 uppercase font-medium mb-1">
                                  Coaching Cues / Technical Notes
                                </label>
                                <input
                                  type="text"
                                  placeholder="e.g. Pause 1 sec at chest, maintain control on descent"
                                  value={prescription.notes || ''}
                                  onChange={(e) => handleUpdatePrescription(prescription.id, 'notes', e.target.value)}
                                  className="w-full px-2.5 py-1 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-amber-500/50"
                                />
                              </div>

                            </div>

                          </div>
                        );
                      };

                      // Walk through exercises and group by blocks if assigned
                      for (let i = 0; i < allExercises.length; i++) {
                        const ex = allExercises[i];
                        if (processedExIds.has(ex.id)) continue;

                        const matchingBlock = blocks.find(b => b.id === ex.blockId);
                        if (matchingBlock) {
                          // Collect all exercises in this block
                          const blockExercises = allExercises.filter(e => e.blockId === matchingBlock.id);
                          blockExercises.forEach(e => processedExIds.add(e.id));

                          elements.push(
                            <div 
                              key={matchingBlock.id} 
                              className={`p-4 rounded-2xl border space-y-3 ${
                                matchingBlock.type === 'SUPERSET'
                                  ? 'bg-amber-950/20 border-amber-500/30'
                                  : 'bg-cyan-950/20 border-cyan-500/30'
                              }`}
                            >
                              {/* Block Header */}
                              <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-zinc-800">
                                <div className="flex items-center gap-2">
                                  <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                                    matchingBlock.type === 'SUPERSET'
                                      ? 'bg-amber-500 text-zinc-950'
                                      : 'bg-cyan-500 text-zinc-950'
                                  }`}>
                                    {matchingBlock.type === 'SUPERSET' ? <Layers className="w-3.5 h-3.5" /> : <Repeat className="w-3.5 h-3.5" />}
                                    {matchingBlock.name || matchingBlock.type}
                                  </span>
                                  <span className="text-xs text-zinc-400">
                                    ({blockExercises.length} paired movements)
                                  </span>
                                </div>

                                <div className="flex items-center gap-3 text-xs">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-zinc-400 text-[11px]">Rounds:</span>
                                    <input
                                      type="number"
                                      min={1}
                                      max={10}
                                      value={matchingBlock.rounds || 3}
                                      onChange={(e) => handleUpdateBlock(matchingBlock.id, { rounds: Math.max(1, parseInt(e.target.value) || 1) })}
                                      className="w-14 px-2 py-0.5 bg-zinc-900 border border-zinc-700 rounded-lg text-xs text-center text-zinc-100"
                                    />
                                  </div>

                                  <div className="flex items-center gap-1.5">
                                    <span className="text-zinc-400 text-[11px]">Rest After Round:</span>
                                    <input
                                      type="number"
                                      min={0}
                                      step={15}
                                      value={matchingBlock.restSeconds || 90}
                                      onChange={(e) => handleUpdateBlock(matchingBlock.id, { restSeconds: Math.max(0, parseInt(e.target.value) || 0) })}
                                      className="w-16 px-2 py-0.5 bg-zinc-900 border border-zinc-700 rounded-lg text-xs text-center text-zinc-100"
                                    />
                                    <span className="text-[10px] text-zinc-500">sec</span>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => handleUngroupBlock(matchingBlock.id)}
                                    className="p-1 text-zinc-400 hover:text-red-400 flex items-center gap-1 text-[11px]"
                                    title="Ungroup block into standard sets"
                                  >
                                    <Unlink className="w-3.5 h-3.5" />
                                    <span>Ungroup</span>
                                  </button>
                                </div>
                              </div>

                              {/* Prescriptions inside block */}
                              <div className="space-y-2.5">
                                {blockExercises.map((bEx, bIdx) => {
                                  const originalIndex = allExercises.findIndex(item => item.id === bEx.id);
                                  return renderPrescriptionCard(bEx, originalIndex, { block: matchingBlock, indexInBlock: bIdx });
                                })}
                              </div>
                            </div>
                          );
                        } else {
                          processedExIds.add(ex.id);
                          elements.push(renderPrescriptionCard(ex, i));
                        }
                      }

                      return elements;
                    })()}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="p-12 text-center rounded-2xl bg-zinc-900/40 border border-zinc-800 text-zinc-400">
              Select or create a workout from the schedule sidebar.
            </div>
          )}

        </div>

      </div>

      {/* ================================================================ */}
      {/* MODALS */}
      {/* ================================================================ */}
      
      {/* Exercise Selector Modal */}
      {showExerciseSelector && tenantId && (
        <ExerciseSelectorModal
          isOpen={showExerciseSelector}
          onClose={() => setShowExerciseSelector(false)}
          tenantId={tenantId}
          onSelectExercise={handleAddExerciseToWorkout}
          alreadySelectedExerciseIds={(activeWorkout?.exercises || []).map(e => e.exerciseId)}
        />
      )}

      {/* Validation Issues Modal */}
      {showValidationModal && (
        <ValidationModal
          isOpen={showValidationModal}
          onClose={() => setShowValidationModal(false)}
          issues={validationIssues}
          onFocusWorkout={(wId) => setActiveWorkoutId(wId)}
        />
      )}

      {/* Program Preview Modal */}
      {showPreviewModal && tenantId && (
        <ProgramPreviewModal
          isOpen={showPreviewModal}
          onClose={() => setShowPreviewModal(false)}
          programId={program.id}
          tenantId={tenantId}
        />
      )}

      {/* Unsaved Changes Exit Prompt */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm" 
            onClick={() => setShowExitConfirm(false)} 
          />
          <div className="relative w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-2xl z-10 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-100">
                  You Have Unsaved Changes
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Save your draft before leaving to keep your workout edits.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
              <button
                onClick={() => {
                  setShowExitConfirm(false);
                  navigate(`/owner/programs/${programId}`);
                }}
                className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-medium transition-colors"
              >
                Discard & Leave
              </button>

              <button
                onClick={async () => {
                  const saved = await executeSave(false);
                  if (saved) {
                    setShowExitConfirm(false);
                    navigate(`/owner/programs/${programId}`);
                  }
                }}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-xl text-xs font-semibold transition-colors"
              >
                Save & Exit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Workout As Template Modal */}
      {workoutToSaveAsTemplate && tenantId && (
        <SaveWorkoutTemplateModal
          isOpen={Boolean(workoutToSaveAsTemplate)}
          onClose={() => setWorkoutToSaveAsTemplate(null)}
          tenantId={tenantId}
          workout={workoutToSaveAsTemplate}
          onSaved={() => {
            setWorkoutToSaveAsTemplate(null);
          }}
        />
      )}

    </div>
  );
}
