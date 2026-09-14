import { useEffect, useState } from 'react';
import { 
  X, 
  Dumbbell, 
  Clock, 
  Layers, 
  Edit3, 
  Copy, 
  Bookmark, 
  FileText,
  AlertCircle
} from 'lucide-react';
import { Workout, WorkoutExercisePrescription } from '../../types/program';
import { Exercise } from '../../types/exercise';
import { fetchSingleWorkout } from '../../lib/programService';
import { fetchAllExercises } from '../../lib/exerciseService';

interface WorkoutDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  workoutId: string | null;
  programId: string;
  tenantId: string;
  onEditInBuilder?: (workoutId: string) => void;
  onDuplicate?: (workoutId: string) => void;
  onSaveAsTemplate?: (workout: Workout) => void;
}

export function WorkoutDetailModal({
  isOpen,
  onClose,
  workoutId,
  programId,
  tenantId,
  onEditInBuilder,
  onDuplicate,
  onSaveAsTemplate
}: WorkoutDetailModalProps) {
  const [loading, setLoading] = useState(false);
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [exerciseMap, setExerciseMap] = useState<Record<string, Exercise>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !workoutId) return;

    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const [wData, exList] = await Promise.all([
          fetchSingleWorkout(tenantId, programId, workoutId!),
          fetchAllExercises(tenantId)
        ]);

        if (!mounted) return;

        const map: Record<string, Exercise> = {};
        exList.forEach(ex => { map[ex.id] = ex; });
        setExerciseMap(map);
        setWorkout(wData);
      } catch (err: any) {
        console.error('Failed to load workout details:', err);
        if (mounted) setError('Unable to load workout details. Please try again.');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, [isOpen, workoutId, programId, tenantId]);

  if (!isOpen) return null;

  const exercises = workout?.exercises || [];
  const totalSets = exercises.reduce((acc, ex) => acc + (Number(ex.sets) || 0), 0);
  const totalRestSeconds = exercises.reduce((acc, ex) => acc + ((Number(ex.sets) || 0) * (Number(ex.restSeconds) || 60)), 0);
  const estimatedDurationMinutes = Math.max(20, Math.round((totalSets * 45 + totalRestSeconds) / 60));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-6 border-b border-zinc-800 flex items-start justify-between gap-4 bg-zinc-900/50">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
                {workout?.dayOfWeek || 'Scheduled Workout'}
              </span>
              <span className="text-xs text-zinc-400">
                Week {workout?.weekNumber || 1}
              </span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              {workout?.name || 'Workout Preview'}
            </h2>
            {workout?.description && (
              <p className="text-xs text-zinc-400 mt-1">
                {workout.description}
              </p>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Workout Stats Bar */}
        <div className="px-6 py-3 bg-zinc-900/80 border-b border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5">
              <Dumbbell className="w-4 h-4 text-amber-400" />
              <strong className="text-zinc-200">{exercises.length}</strong> Exercises
            </span>
            <span className="flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-amber-400" />
              <strong className="text-zinc-200">{totalSets}</strong> Total Sets
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-400" />
              ~<strong className="text-zinc-200">{estimatedDurationMinutes}</strong> Mins
            </span>
          </div>

          {/* Action Quick Links */}
          <div className="flex items-center gap-2">
            {onSaveAsTemplate && workout && (
              <button
                onClick={() => onSaveAsTemplate(workout)}
                className="px-2.5 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg flex items-center gap-1.5 transition-colors"
                title="Save as Reusable Template"
              >
                <Bookmark className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Save Template</span>
              </button>
            )}
            {onDuplicate && workout && (
              <button
                onClick={() => {
                  onDuplicate(workout.id);
                  onClose();
                }}
                className="px-2.5 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg flex items-center gap-1.5 transition-colors"
                title="Duplicate Workout"
              >
                <Copy className="w-3.5 h-3.5 text-zinc-400" />
                <span className="hidden sm:inline">Duplicate</span>
              </button>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-20 bg-zinc-900/70 animate-pulse rounded-xl" />
              ))}
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : exercises.length === 0 ? (
            <div className="py-12 text-center text-zinc-500">
              <Dumbbell className="w-8 h-8 mx-auto mb-2 opacity-40 text-amber-400" />
              <p className="text-sm">No exercises prescribed in this workout yet.</p>
              {onEditInBuilder && workout && (
                <button
                  onClick={() => {
                    onClose();
                    onEditInBuilder(workout.id);
                  }}
                  className="mt-3 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-xl text-xs font-semibold inline-flex items-center gap-2 transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Open Workout Builder</span>
                </button>
              )}
            </div>
          ) : (
            exercises.map((ex, idx) => {
              const details = exerciseMap[ex.exerciseId];
              return (
                <div 
                  key={ex.id || idx}
                  className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700/80 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-lg bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400 shrink-0">
                      {idx + 1}
                    </span>
                    <div>
                      <h4 className="text-sm font-semibold text-zinc-100">
                        {details?.name || 'Custom Exercise'}
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-400">
                        <span>{details?.targetMuscleGroup || 'Target Muscle'}</span>
                        <span>•</span>
                        <span>{details?.equipment || 'Equipment'}</span>
                      </div>
                      {ex.notes && (
                        <p className="text-xs text-zinc-400 italic mt-1.5 flex items-center gap-1.5">
                          <FileText className="w-3 h-3 text-amber-400/80 shrink-0" />
                          <span>{ex.notes}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Prescription Chips */}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 font-semibold text-zinc-200">
                      {ex.sets} Sets
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-300">
                      {ex.reps} Reps
                    </span>
                    {ex.weight ? (
                      <span className="px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-300">
                        {ex.weight} {ex.weightUnit}
                      </span>
                    ) : null}
                    <span className="px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-400">
                      {ex.restSeconds}s Rest
                    </span>
                    {ex.rpe ? (
                      <span className="px-2 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
                        RPE {ex.rpe}
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/50 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-medium transition-colors"
          >
            Close
          </button>
          {onEditInBuilder && workout && (
            <button
              onClick={() => {
                onClose();
                onEditInBuilder(workout.id);
              }}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit in Builder</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
