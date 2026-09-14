import { useState, useEffect } from 'react';
import { 
  X, 
  Dumbbell, 
  Clock, 
  Calendar, 
  Layers, 
  Target, 
  Printer, 
  FileText,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Program, Workout, WorkoutExercisePrescription } from '../../types/program';
import { Exercise } from '../../types/exercise';
import { fetchProgramWithWorkouts } from '../../lib/programService';
import { fetchAllExercises } from '../../lib/exerciseService';

interface ProgramPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  programId: string | null;
  tenantId: string;
  onOpenBuilder?: (programId: string) => void;
}

export function ProgramPreviewModal({
  isOpen,
  onClose,
  programId,
  tenantId,
  onOpenBuilder
}: ProgramPreviewModalProps) {
  const [loading, setLoading] = useState(true);
  const [program, setProgram] = useState<Program | null>(null);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [exerciseMap, setExerciseMap] = useState<Record<string, Exercise>>({});
  const [selectedWeek, setSelectedWeek] = useState<number>(1);

  useEffect(() => {
    if (!isOpen || !programId) return;

    let isMounted = true;
    async function loadData() {
      try {
        setLoading(true);
        const [progData, exList] = await Promise.all([
          fetchProgramWithWorkouts(tenantId, programId!),
          fetchAllExercises(tenantId)
        ]);

        if (!isMounted) return;

        const map: Record<string, Exercise> = {};
        exList.forEach(e => { map[e.id] = e; });
        setExerciseMap(map);

        setProgram(progData.program);
        setWorkouts(progData.workouts);

        // Find min week or week 1
        const weeks = Array.from(new Set(progData.workouts.map(w => w.weekNumber || 1))).sort((a, b) => a - b);
        if (weeks.length > 0) {
          setSelectedWeek(weeks[0]);
        }
      } catch (err) {
        console.error('Error loading program preview:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [isOpen, programId, tenantId]);

  if (!isOpen) return null;

  // Group workouts by week
  const allWeeks = Array.from(
    new Set<number>(
      workouts.length > 0 
        ? workouts.map(w => w.weekNumber || 1) 
        : [1]
    )
  ).sort((a: number, b: number) => a - b);

  const activeWeekWorkouts = workouts.filter(w => (w.weekNumber || 1) === selectedWeek);

  const calculateEstimatedDuration = (exercises: WorkoutExercisePrescription[]) => {
    let totalSeconds = 0;
    exercises.forEach(ex => {
      const sets = Number(ex.sets) || 3;
      const rest = Number(ex.restSeconds) || 60;
      const workTimePerSet = ex.durationSeconds || 45; // average estimated work set
      totalSeconds += sets * (workTimePerSet + rest);
    });
    const mins = Math.round(totalSeconds / 60);
    return mins > 0 ? `~${mins} min` : '15 min';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 print:p-0">
      <div 
        className="fixed inset-0 bg-black/85 backdrop-blur-md transition-opacity print:hidden" 
        onClick={onClose} 
      />

      <div className="relative w-full max-w-5xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden z-10 print:border-none print:max-h-none print:w-full">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/80 bg-zinc-900/60 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-zinc-100">
                  Program Preview & Coaching Outline
                </h2>
                {program && (
                  <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                    program.status === 'ACTIVE'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : program.status === 'DRAFT'
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                  }`}>
                    {program.status}
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400">
                Review the scheduled training flow, exercise prescriptions, and coaching parameters
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>

            {onOpenBuilder && program && (
              <button
                onClick={() => {
                  onClose();
                  onOpenBuilder(program.id);
                }}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <span>Edit in Builder</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="py-24 text-center text-zinc-500 text-sm">
              Loading program structure and exercises...
            </div>
          ) : !program ? (
            <div className="py-24 text-center text-zinc-500 text-sm">
              Program could not be found.
            </div>
          ) : (
            <>
              {/* Program Overview Banner */}
              <div className="p-6 rounded-2xl bg-zinc-900/80 border border-zinc-800/80">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
                        {program.goal === 'Custom' && program.customGoal ? program.customGoal : program.goal}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-zinc-800 border border-zinc-700/60 text-zinc-300 text-xs font-medium">
                        {program.difficulty} Level
                      </span>
                    </div>
                    <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">
                      {program.name}
                    </h1>
                    {program.description && (
                      <p className="text-sm text-zinc-400 mt-2 max-w-3xl leading-relaxed">
                        {program.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-4 bg-zinc-950/70 border border-zinc-800/80 rounded-xl p-3.5 shrink-0">
                    <div className="text-center px-2">
                      <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">Duration</span>
                      <span className="text-sm font-bold text-zinc-200 block mt-0.5">{program.durationWeeks} Weeks</span>
                    </div>
                    <div className="h-7 w-px bg-zinc-800" />
                    <div className="text-center px-2">
                      <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">Workouts</span>
                      <span className="text-sm font-bold text-zinc-200 block mt-0.5">{workouts.length}</span>
                    </div>
                    <div className="h-7 w-px bg-zinc-800" />
                    <div className="text-center px-2">
                      <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">Assigned</span>
                      <span className="text-sm font-bold text-zinc-200 block mt-0.5">{program.assignedClientCount || 0}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Week Switcher Tabs */}
              {allWeeks.length > 1 && (
                <div className="flex items-center gap-2 border-b border-zinc-800/80 pb-2 overflow-x-auto print:hidden">
                  <span className="text-xs font-semibold text-zinc-400 mr-2 uppercase tracking-wider">
                    Weeks:
                  </span>
                  {allWeeks.map(wk => (
                    <button
                      key={wk}
                      onClick={() => setSelectedWeek(wk)}
                      className={`px-4 py-1.5 rounded-xl text-xs font-medium transition-all ${
                        selectedWeek === wk
                          ? 'bg-amber-500 text-zinc-950 font-semibold shadow-sm'
                          : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
                      }`}
                    >
                      Week {wk}
                    </button>
                  ))}
                </div>
              )}

              {/* Workouts in Active Week */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-amber-400" />
                    <span>Week {selectedWeek} Training Schedule</span>
                  </h3>
                  <span className="text-xs text-zinc-500">
                    {activeWeekWorkouts.length} {activeWeekWorkouts.length === 1 ? 'Session' : 'Sessions'}
                  </span>
                </div>

                {activeWeekWorkouts.length === 0 ? (
                  <div className="p-8 text-center rounded-2xl bg-zinc-900/30 border border-zinc-800/60 text-zinc-500 text-sm">
                    No workouts scheduled for Week {selectedWeek}.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activeWeekWorkouts.map((workout, wIdx) => {
                      const exList = workout.exercises || [];
                      const duration = calculateEstimatedDuration(exList);

                      return (
                        <div
                          key={workout.id}
                          className="bg-zinc-900/50 border border-zinc-800/90 rounded-2xl p-5 overflow-hidden"
                        >
                          {/* Workout Header */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-zinc-800/60 mb-4">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[11px] font-semibold border border-amber-500/20">
                                  {workout.dayOfWeek || `Day ${wIdx + 1}`}
                                </span>
                                <h4 className="text-base font-semibold text-zinc-100">
                                  {workout.name}
                                </h4>
                              </div>
                              {workout.description && (
                                <p className="text-xs text-zinc-400 mt-1">
                                  {workout.description}
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-3 text-xs text-zinc-400">
                              <span className="flex items-center gap-1 bg-zinc-950 px-2.5 py-1 rounded-lg border border-zinc-800">
                                <Dumbbell className="w-3.5 h-3.5 text-zinc-500" />
                                {exList.length} {exList.length === 1 ? 'Exercise' : 'Exercises'}
                              </span>
                              <span className="flex items-center gap-1 bg-zinc-950 px-2.5 py-1 rounded-lg border border-zinc-800">
                                <Clock className="w-3.5 h-3.5 text-zinc-500" />
                                {duration}
                              </span>
                            </div>
                          </div>

                          {/* Exercise List Table / Rows */}
                          {exList.length === 0 ? (
                            <p className="text-xs text-zinc-500 py-3 italic">
                              No exercises prescribed in this workout yet.
                            </p>
                          ) : (
                            <div className="space-y-2.5">
                              {exList.map((ex, exIdx) => {
                                const resolved = exerciseMap[ex.exerciseId] || ex.exerciseDetails;
                                const isWarmup = ex.setType === 'WARMUP';

                                return (
                                  <div
                                    key={ex.id}
                                    className={`p-3.5 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                                      isWarmup 
                                        ? 'bg-amber-500/[0.03] border-amber-500/20' 
                                        : 'bg-zinc-950/60 border-zinc-800/60'
                                    }`}
                                  >
                                    <div className="flex items-start gap-3">
                                      <span className="w-6 h-6 rounded-lg bg-zinc-800/80 border border-zinc-700/50 text-zinc-300 font-semibold text-xs flex items-center justify-center shrink-0 mt-0.5">
                                        {exIdx + 1}
                                      </span>

                                      <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="text-sm font-semibold text-zinc-200">
                                            {resolved?.name || 'Exercise'}
                                          </span>
                                          {isWarmup && (
                                            <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[10px] font-semibold uppercase tracking-wider border border-amber-500/20">
                                              Warmup
                                            </span>
                                          )}
                                          {resolved?.targetMuscleGroup && (
                                            <span className="text-[11px] text-zinc-500">
                                              • {resolved.targetMuscleGroup} ({resolved.equipment})
                                            </span>
                                          )}
                                        </div>

                                        {ex.notes && (
                                          <p className="text-xs text-amber-400/80 mt-1 italic">
                                            Coach Note: {ex.notes}
                                          </p>
                                        )}
                                      </div>
                                    </div>

                                    {/* Prescription Numbers */}
                                    <div className="flex items-center gap-4 text-xs shrink-0 self-end md:self-center">
                                      <div className="text-right">
                                        <span className="text-[10px] text-zinc-500 block uppercase font-medium">Sets × Reps</span>
                                        <span className="font-semibold text-zinc-200">
                                          {ex.sets} × {ex.reps}
                                        </span>
                                      </div>

                                      {ex.weight !== null && ex.weight !== undefined && (
                                        <div className="text-right">
                                          <span className="text-[10px] text-zinc-500 block uppercase font-medium">Target</span>
                                          <span className="font-semibold text-zinc-200">
                                            {ex.weight} {ex.weightUnit}
                                          </span>
                                        </div>
                                      )}

                                      <div className="text-right">
                                        <span className="text-[10px] text-zinc-500 block uppercase font-medium">Rest</span>
                                        <span className="font-semibold text-zinc-200">
                                          {ex.restSeconds}s
                                        </span>
                                      </div>

                                      {(ex.rpe || ex.rir) && (
                                        <div className="text-right">
                                          <span className="text-[10px] text-zinc-500 block uppercase font-medium">Intensity</span>
                                          <span className="font-semibold text-zinc-200">
                                            {ex.rpe ? `RPE ${ex.rpe}` : `RIR ${ex.rir}`}
                                          </span>
                                        </div>
                                      )}

                                      {ex.tempo && (
                                        <div className="text-right">
                                          <span className="text-[10px] text-zinc-500 block uppercase font-medium">Tempo</span>
                                          <span className="font-mono text-zinc-300">
                                            {ex.tempo}
                                          </span>
                                        </div>
                                      )}
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
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800/80 bg-zinc-900/60 flex items-center justify-between print:hidden">
          <span className="text-xs text-zinc-500">
            NEXA FITOS Multi-Tenant Program Blueprint
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-medium transition-colors"
          >
            Close Preview
          </button>
        </div>

      </div>
    </div>
  );
}
