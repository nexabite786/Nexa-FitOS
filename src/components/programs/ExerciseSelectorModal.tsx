import { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  X, 
  Dumbbell, 
  Filter, 
  Plus, 
  Check, 
  Sparkles,
  Info
} from 'lucide-react';
import { Exercise } from '../../types/exercise';
import { MUSCLE_GROUPS, EQUIPMENT_LIST } from '../../data/curatedExercises';
import { fetchAllExercises } from '../../lib/exerciseService';

interface ExerciseSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
  onSelectExercise: (exercise: Exercise) => void;
  alreadySelectedExerciseIds?: string[];
}

export function ExerciseSelectorModal({
  isOpen,
  onClose,
  tenantId,
  onSelectExercise,
  alreadySelectedExerciseIds = []
}: ExerciseSelectorModalProps) {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState<string>('ALL');
  const [selectedEquipment, setSelectedEquipment] = useState<string>('ALL');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('ALL');
  const [justAddedId, setJustAddedId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        const data = await fetchAllExercises(tenantId);
        if (mounted) {
          setExercises(data);
        }
      } catch (err) {
        console.error('Failed to load exercises for selector:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();

    return () => {
      mounted = false;
    };
  }, [isOpen, tenantId]);

  const filteredExercises = useMemo(() => {
    return exercises.filter(ex => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = ex.name.toLowerCase().includes(q);
        const matchesMuscle = ex.targetMuscleGroup.toLowerCase().includes(q);
        const matchesEquip = ex.equipment.toLowerCase().includes(q);
        if (!matchesName && !matchesMuscle && !matchesEquip) return false;
      }
      // Muscle
      if (selectedMuscle !== 'ALL' && ex.targetMuscleGroup !== selectedMuscle) {
        return false;
      }
      // Equipment
      if (selectedEquipment !== 'ALL' && ex.equipment !== selectedEquipment) {
        return false;
      }
      // Difficulty
      if (selectedDifficulty !== 'ALL' && ex.difficulty !== selectedDifficulty) {
        return false;
      }
      return true;
    });
  }, [exercises, searchQuery, selectedMuscle, selectedEquipment, selectedDifficulty]);

  if (!isOpen) return null;

  const handleAdd = (ex: Exercise) => {
    onSelectExercise(ex);
    setJustAddedId(ex.id);
    setTimeout(() => setJustAddedId(null), 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-4xl bg-zinc-950 border border-zinc-800/90 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/80 bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Dumbbell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-zinc-100 tracking-tight">
                Add Exercise from Library
              </h2>
              <p className="text-xs text-zinc-400">
                Select an exercise to prescribe in this workout session
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Controls Bar */}
        <div className="p-4 border-b border-zinc-800/80 bg-zinc-900/30 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by exercise name, target muscle, or equipment..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-zinc-900/80 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20"
              autoFocus
            />
          </div>

          {/* Pill / Dropdown Filters */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 text-zinc-400 mr-1">
              <Filter className="w-3.5 h-3.5" />
              <span>Filters:</span>
            </div>

            {/* Muscle Filter */}
            <select
              value={selectedMuscle}
              onChange={(e) => setSelectedMuscle(e.target.value)}
              className="px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-300 focus:border-amber-500/50 focus:outline-none"
            >
              <option value="ALL">All Muscles</option>
              {MUSCLE_GROUPS.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>

            {/* Equipment Filter */}
            <select
              value={selectedEquipment}
              onChange={(e) => setSelectedEquipment(e.target.value)}
              className="px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-300 focus:border-amber-500/50 focus:outline-none"
            >
              <option value="ALL">All Equipment</option>
              {EQUIPMENT_LIST.map(eq => (
                <option key={eq} value={eq}>{eq}</option>
              ))}
            </select>

            {/* Difficulty Filter */}
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-300 focus:border-amber-500/50 focus:outline-none"
            >
              <option value="ALL">All Difficulties</option>
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
            </select>

            {(searchQuery || selectedMuscle !== 'ALL' || selectedEquipment !== 'ALL' || selectedDifficulty !== 'ALL') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedMuscle('ALL');
                  setSelectedEquipment('ALL');
                  setSelectedDifficulty('ALL');
                }}
                className="text-amber-400 hover:text-amber-300 underline underline-offset-2 ml-auto"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Exercises List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2.5">
          {loading ? (
            <div className="py-16 text-center text-zinc-500 text-sm">
              Loading exercise database...
            </div>
          ) : filteredExercises.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <p className="text-zinc-400 text-sm font-medium">No exercises match your search criteria.</p>
              <p className="text-zinc-600 text-xs">Try searching for a different muscle or reset your filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredExercises.map((ex) => {
                const isAlreadyInWorkout = alreadySelectedExerciseIds.includes(ex.id);
                const isJustAdded = justAddedId === ex.id;

                return (
                  <div
                    key={ex.id}
                    className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between ${
                      isAlreadyInWorkout 
                        ? 'bg-zinc-900/40 border-zinc-800/60 opacity-90' 
                        : 'bg-zinc-900/80 hover:bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-sm font-medium text-zinc-100 line-clamp-1">
                            {ex.name}
                          </h4>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            <span className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] font-medium">
                              {ex.targetMuscleGroup}
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-400 text-[11px]">
                              {ex.equipment}
                            </span>
                            <span className="text-[11px] text-zinc-500">
                              {ex.difficulty}
                            </span>
                          </div>
                        </div>

                        {ex.isCustom ? (
                          <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[10px] font-medium border border-blue-500/20">
                            Custom
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 text-[10px] font-medium">
                            System
                          </span>
                        )}
                      </div>

                      {ex.instructions && ex.instructions.length > 0 && (
                        <p className="text-xs text-zinc-500 mt-2 line-clamp-2">
                          {ex.instructions[0]}
                        </p>
                      )}
                    </div>

                    <div className="mt-3 pt-3 border-t border-zinc-800/60 flex items-center justify-between">
                      <span className="text-[11px] text-zinc-500">
                        {ex.movementPattern || 'Movement'}
                      </span>

                      <button
                        onClick={() => handleAdd(ex)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                          isJustAdded
                            ? 'bg-emerald-600 text-white'
                            : isAlreadyInWorkout
                            ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white'
                            : 'bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold shadow-sm'
                        }`}
                      >
                        {isJustAdded ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Added!</span>
                          </>
                        ) : isAlreadyInWorkout ? (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add Again</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            <span>Prescribe</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800/80 bg-zinc-900/50 flex items-center justify-between text-xs text-zinc-500">
          <span>
            Showing {filteredExercises.length} of {exercises.length} available exercises
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-medium transition-colors"
          >
            Done Selecting
          </button>
        </div>

      </div>
    </div>
  );
}
