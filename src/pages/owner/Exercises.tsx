import React, { useState, useEffect, useMemo } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useTenantStore } from '../../store/tenantStore';
import { Exercise } from '../../types/exercise';
import { 
  fetchAllExercises, 
  saveCustomExercise, 
  deleteCustomExercise 
} from '../../lib/exerciseService';
import { 
  MUSCLE_GROUPS, 
  EQUIPMENT_LIST, 
  MOVEMENT_PATTERNS, 
  DIFFICULTY_LEVELS, 
  EXERCISE_TYPES 
} from '../../data/curatedExercises';
import { ExerciseCard } from '../../components/exercises/ExerciseCard';
import { ExerciseDetailModal } from '../../components/exercises/ExerciseDetailModal';
import { ExerciseFormModal } from '../../components/exercises/ExerciseFormModal';
import { DeleteExerciseModal } from '../../components/exercises/DeleteExerciseModal';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { 
  Search, 
  Plus, 
  Filter, 
  X, 
  Sparkles, 
  Shield, 
  Dumbbell, 
  Layers, 
  LayoutGrid, 
  List, 
  ArrowUpDown, 
  RefreshCw,
  Flame,
  Check
} from 'lucide-react';

export function Exercises() {
  const { user } = useAuthStore();
  const { tenantId } = useTenantStore();

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'ALL' | 'SYSTEM' | 'CUSTOM'>('ALL');
  const [muscleFilter, setMuscleFilter] = useState<string>('ALL');
  const [equipmentFilter, setEquipmentFilter] = useState<string>('ALL');
  const [movementFilter, setMovementFilter] = useState<string>('ALL');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'name-asc' | 'name-desc' | 'difficulty' | 'muscle'>('name-asc');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modal States
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formInitialData, setFormInitialData] = useState<Exercise | null>(null);
  const [isDuplicateMode, setIsDuplicateMode] = useState(false);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [exerciseToDelete, setExerciseToDelete] = useState<Exercise | null>(null);

  // Notification Toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await fetchAllExercises(tenantId);
      setExercises(data);
    } catch (err) {
      console.error('Failed to load exercises:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [tenantId]);

  // Handler: Save Custom Exercise
  const handleSaveExercise = async (
    data: Omit<Exercise, 'id' | 'isCustom' | 'tenantId' | 'createdAt' | 'updatedAt' | 'createdBy'>,
    existingId?: string
  ) => {
    if (!tenantId || !user) throw new Error('Tenant authentication required');
    await saveCustomExercise(tenantId, user.uid, data, existingId);
    showToast(existingId ? 'Custom exercise updated successfully' : 'Custom exercise created successfully');
    await loadData(true);
  };

  // Handler: Delete Custom Exercise
  const handleDeleteExercise = async (ex: Exercise) => {
    if (!tenantId || !user) throw new Error('Tenant authentication required');
    await deleteCustomExercise(tenantId, user.uid, ex.id, ex.name);
    showToast(`Deleted "${ex.name}"`);
    await loadData(true);
  };

  // Open Form Handlers
  const handleOpenCreate = () => {
    setFormInitialData(null);
    setIsDuplicateMode(false);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (ex: Exercise) => {
    setFormInitialData(ex);
    setIsDuplicateMode(false);
    setIsFormOpen(true);
  };

  const handleOpenDuplicate = (ex: Exercise) => {
    setFormInitialData(ex);
    setIsDuplicateMode(true);
    setIsFormOpen(true);
  };

  const handleOpenDelete = (ex: Exercise) => {
    setExerciseToDelete(ex);
    setIsDeleteOpen(true);
  };

  const handleOpenDetail = (ex: Exercise) => {
    setSelectedExercise(ex);
    setIsDetailOpen(true);
  };

  // Filter and Search Pipeline
  const filteredExercises = useMemo(() => {
    return exercises.filter(ex => {
      // Source filter
      if (sourceFilter === 'SYSTEM' && ex.isCustom) return false;
      if (sourceFilter === 'CUSTOM' && !ex.isCustom) return false;

      // Muscle filter
      if (muscleFilter !== 'ALL' && ex.targetMuscleGroup !== muscleFilter) return false;

      // Equipment filter
      if (equipmentFilter !== 'ALL' && ex.equipment !== equipmentFilter) return false;

      // Movement pattern filter
      if (movementFilter !== 'ALL' && ex.movementPattern !== movementFilter) return false;

      // Difficulty filter
      if (difficultyFilter !== 'ALL' && ex.difficulty !== difficultyFilter) return false;

      // Type filter
      if (typeFilter !== 'ALL' && ex.exerciseType !== typeFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = ex.name.toLowerCase().includes(query);
        const matchesMuscle = ex.targetMuscleGroup.toLowerCase().includes(query);
        const matchesEquip = ex.equipment.toLowerCase().includes(query);
        const matchesPattern = ex.movementPattern.toLowerCase().includes(query);
        const matchesSecondary = ex.secondaryMuscles?.some(m => m.toLowerCase().includes(query));
        if (!matchesName && !matchesMuscle && !matchesEquip && !matchesPattern && !matchesSecondary) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'name-asc') return a.name.localeCompare(b.name);
      if (sortBy === 'name-desc') return b.name.localeCompare(a.name);
      if (sortBy === 'muscle') return a.targetMuscleGroup.localeCompare(b.targetMuscleGroup);
      if (sortBy === 'difficulty') {
        const order = { Beginner: 1, Intermediate: 2, Advanced: 3 };
        return order[a.difficulty] - order[b.difficulty];
      }
      return 0;
    });
  }, [
    exercises,
    searchQuery,
    sourceFilter,
    muscleFilter,
    equipmentFilter,
    movementFilter,
    difficultyFilter,
    typeFilter,
    sortBy,
  ]);

  const activeFilterCount = [
    sourceFilter !== 'ALL',
    muscleFilter !== 'ALL',
    equipmentFilter !== 'ALL',
    movementFilter !== 'ALL',
    difficultyFilter !== 'ALL',
    typeFilter !== 'ALL',
  ].filter(Boolean).length;

  const resetFilters = () => {
    setSearchQuery('');
    setSourceFilter('ALL');
    setMuscleFilter('ALL');
    setEquipmentFilter('ALL');
    setMovementFilter('ALL');
    setDifficultyFilter('ALL');
    setTypeFilter('ALL');
  };

  const systemCount = useMemo(() => exercises.filter(e => !e.isCustom).length, [exercises]);
  const customCount = useMemo(() => exercises.filter(e => e.isCustom).length, [exercises]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-lg shadow-xl text-sm font-medium animate-in slide-in-from-bottom-3 duration-200">
          <Check className="h-4 w-4" />
          {toastMessage}
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs uppercase tracking-widest text-primary font-bold">Programs Engine</span>
            <div className="h-1 w-1 rounded-full bg-primary"></div>
            <span className="text-xs text-muted-foreground">Phase 7A</span>
          </div>
          <h1 className="text-4xl font-display font-semibold tracking-tight text-foreground">Exercise Library</h1>
          <p className="text-muted-foreground mt-2 text-base max-w-2xl">
            The central exercise database and movement catalog used by coaches to build high-performance training programs.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => loadData(true)} 
            disabled={refreshing}
            title="Refresh database"
            className="h-11 w-11"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>

          <Button onClick={handleOpenCreate} className="flex-1 md:flex-none h-11 px-6 shadow-md">
            <Plus className="h-4 w-4 mr-2" /> Add Custom Exercise
          </Button>
        </div>
      </div>

      {/* Metrics / Source Tabs Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          type="button"
          onClick={() => setSourceFilter('ALL')}
          className={`flex items-center justify-between p-4 rounded-xl border text-left transition-all ${
            sourceFilter === 'ALL'
              ? 'bg-card border-primary/50 shadow-md ring-1 ring-primary/30'
              : 'bg-card/40 border-border/50 hover:bg-card/80 hover:border-border'
          }`}
        >
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Total Library</p>
            <p className="text-2xl font-display font-bold text-foreground mt-1">{exercises.length}</p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center text-primary">
            <Layers className="h-5 w-5" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => setSourceFilter('SYSTEM')}
          className={`flex items-center justify-between p-4 rounded-xl border text-left transition-all ${
            sourceFilter === 'SYSTEM'
              ? 'bg-card border-primary/50 shadow-md ring-1 ring-primary/30'
              : 'bg-card/40 border-border/50 hover:bg-card/80 hover:border-border'
          }`}
        >
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">System Curated</p>
            <p className="text-2xl font-display font-bold text-foreground mt-1">{systemCount}</p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center text-muted-foreground">
            <Shield className="h-5 w-5" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => setSourceFilter('CUSTOM')}
          className={`flex items-center justify-between p-4 rounded-xl border text-left transition-all ${
            sourceFilter === 'CUSTOM'
              ? 'bg-card border-primary/50 shadow-md ring-1 ring-primary/30'
              : 'bg-card/40 border-border/50 hover:bg-card/80 hover:border-border'
          }`}
        >
          <div>
            <p className="text-xs uppercase tracking-wider text-primary font-semibold">Gym Custom</p>
            <p className="text-2xl font-display font-bold text-foreground mt-1">{customCount}</p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <Sparkles className="h-5 w-5" />
          </div>
        </button>
      </div>

      {/* Search and Advanced Filter Control Bar */}
      <div className="space-y-3 bg-card/60 p-4 rounded-xl border border-border/60 backdrop-blur">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          {/* Search Input */}
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search exercise, muscle, equipment..." 
              className="pl-9 pr-8 bg-input/50 border-border/50 h-10 text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Quick Select Filters & Controls */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
            {/* Muscle Group Filter */}
            <select
              value={muscleFilter}
              onChange={(e) => setMuscleFilter(e.target.value)}
              className="h-10 rounded-md border border-border/60 bg-input/50 px-3 py-1.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="ALL">All Muscles</option>
              {MUSCLE_GROUPS.map(mg => (
                <option key={mg} value={mg}>{mg}</option>
              ))}
            </select>

            {/* Equipment Filter */}
            <select
              value={equipmentFilter}
              onChange={(e) => setEquipmentFilter(e.target.value)}
              className="h-10 rounded-md border border-border/60 bg-input/50 px-3 py-1.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="ALL">All Equipment</option>
              {EQUIPMENT_LIST.map(eq => (
                <option key={eq} value={eq}>{eq}</option>
              ))}
            </select>

            {/* Movement Pattern Filter */}
            <select
              value={movementFilter}
              onChange={(e) => setMovementFilter(e.target.value)}
              className="h-10 rounded-md border border-border/60 bg-input/50 px-3 py-1.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="ALL">All Patterns</option>
              {MOVEMENT_PATTERNS.map(mp => (
                <option key={mp} value={mp}>{mp}</option>
              ))}
            </select>

            {/* Difficulty Filter */}
            <select
              value={difficultyFilter}
              onChange={(e) => setDifficultyFilter(e.target.value)}
              className="h-10 rounded-md border border-border/60 bg-input/50 px-3 py-1.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="ALL">All Difficulties</option>
              {DIFFICULTY_LEVELS.map(lvl => (
                <option key={lvl} value={lvl}>{lvl}</option>
              ))}
            </select>

            {/* Sort Select */}
            <div className="flex items-center gap-1">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="h-10 rounded-md border border-border/60 bg-input/50 px-3 py-1.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="name-asc">Sort: A to Z</option>
                <option value="name-desc">Sort: Z to A</option>
                <option value="muscle">Sort: Muscle</option>
                <option value="difficulty">Sort: Difficulty</option>
              </select>
            </div>

            {/* View Mode Toggle */}
            <div className="flex rounded-md border border-border/60 bg-input/40 p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded ${viewMode === 'grid' ? 'bg-accent text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                title="Grid View"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-2 rounded ${viewMode === 'table' ? 'bg-accent text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                title="Table View"
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Active Filter Chips Row */}
        {(activeFilterCount > 0 || searchQuery) && (
          <div className="pt-2 border-t border-border/40 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-muted-foreground font-medium">Active filters:</span>

            {searchQuery && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-accent text-foreground">
                "{searchQuery}"
                <button onClick={() => setSearchQuery('')} className="hover:text-primary"><X className="h-3 w-3" /></button>
              </span>
            )}

            {sourceFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-accent text-foreground">
                Source: {sourceFilter === 'SYSTEM' ? 'System' : 'Custom'}
                <button onClick={() => setSourceFilter('ALL')} className="hover:text-primary"><X className="h-3 w-3" /></button>
              </span>
            )}

            {muscleFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-accent text-foreground">
                Muscle: {muscleFilter}
                <button onClick={() => setMuscleFilter('ALL')} className="hover:text-primary"><X className="h-3 w-3" /></button>
              </span>
            )}

            {equipmentFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-accent text-foreground">
                Equipment: {equipmentFilter}
                <button onClick={() => setEquipmentFilter('ALL')} className="hover:text-primary"><X className="h-3 w-3" /></button>
              </span>
            )}

            {movementFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-accent text-foreground">
                Pattern: {movementFilter}
                <button onClick={() => setMovementFilter('ALL')} className="hover:text-primary"><X className="h-3 w-3" /></button>
              </span>
            )}

            {difficultyFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-accent text-foreground">
                Difficulty: {difficultyFilter}
                <button onClick={() => setDifficultyFilter('ALL')} className="hover:text-primary"><X className="h-3 w-3" /></button>
              </span>
            )}

            <button
              onClick={resetFilters}
              className="text-xs text-primary hover:underline font-medium ml-auto"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>

      {/* Results Count Counter */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <span>
          Showing <strong className="text-foreground">{filteredExercises.length}</strong> of {exercises.length} exercises
        </span>
        {filteredExercises.length > 0 && (
          <span>Click any exercise to inspect execution form & cues</span>
        )}
      </div>

      {/* Exercises Content Display */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-48 rounded-xl bg-accent/40 animate-pulse border border-border/40"></div>
          ))}
        </div>
      ) : filteredExercises.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-14 text-center rounded-xl border border-border border-dashed bg-card/20">
          <div className="h-14 w-14 rounded-full bg-accent flex items-center justify-center mb-4 text-muted-foreground">
            <Dumbbell className="h-7 w-7" />
          </div>
          <h3 className="text-lg font-display font-semibold text-foreground mb-1">No exercises found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mb-5">
            {searchQuery || activeFilterCount > 0 
              ? 'No exercises matched your search terms or active filters. Try broadening your criteria.'
              : 'Your exercise database is currently empty.'}
          </p>
          <div className="flex items-center gap-3">
            {(searchQuery || activeFilterCount > 0) && (
              <Button variant="outline" size="sm" onClick={resetFilters}>
                Reset Filters
              </Button>
            )}
            <Button size="sm" onClick={handleOpenCreate}>
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Custom Exercise
            </Button>
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredExercises.map(exercise => (
            <ExerciseCard
              key={exercise.id}
              exercise={exercise}
              onView={handleOpenDetail}
              onEdit={exercise.isCustom ? handleOpenEdit : undefined}
              onDelete={exercise.isCustom ? handleOpenDelete : undefined}
              onDuplicate={!exercise.isCustom ? handleOpenDuplicate : undefined}
            />
          ))}
        </div>
      ) : (
        /* High-Density Table View */
        <div className="overflow-hidden rounded-xl border border-border/60 bg-card/60 backdrop-blur">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-accent/30 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-5 py-3.5">Exercise</th>
                  <th className="px-5 py-3.5">Primary Muscle</th>
                  <th className="px-5 py-3.5">Equipment</th>
                  <th className="px-5 py-3.5">Pattern</th>
                  <th className="px-5 py-3.5">Difficulty</th>
                  <th className="px-5 py-3.5">Source</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filteredExercises.map(exercise => (
                  <tr 
                    key={exercise.id}
                    onClick={() => handleOpenDetail(exercise)}
                    className="hover:bg-accent/40 cursor-pointer transition-colors group"
                  >
                    <td className="px-5 py-3.5 font-medium text-foreground group-hover:text-primary transition-colors">
                      {exercise.name}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1 font-medium text-foreground">
                        <Flame className="h-3 w-3 text-primary" />
                        {exercise.targetMuscleGroup}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-muted-foreground">
                      {exercise.equipment}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-muted-foreground">
                      {exercise.movementPattern}
                    </td>
                    <td className="px-5 py-3.5 text-xs">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold ${
                        exercise.difficulty === 'Beginner' ? 'bg-emerald-500/10 text-emerald-400' :
                        exercise.difficulty === 'Intermediate' ? 'bg-amber-500/10 text-amber-400' :
                        'bg-rose-500/10 text-rose-400'
                      }`}>
                        {exercise.difficulty}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs">
                      {exercise.isCustom ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-primary">
                          <Sparkles className="h-3 w-3" /> Custom
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Shield className="h-3 w-3" /> System
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right text-xs" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => handleOpenDetail(exercise)}
                        >
                          View
                        </Button>
                        {exercise.isCustom ? (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-xs"
                              onClick={() => handleOpenEdit(exercise)}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/30"
                              onClick={() => handleOpenDelete(exercise)}
                            >
                              Delete
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs text-muted-foreground hover:text-primary"
                            onClick={() => handleOpenDuplicate(exercise)}
                          >
                            Duplicate
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Exercise Detail Modal */}
      <ExerciseDetailModal
        isOpen={isDetailOpen}
        exercise={selectedExercise}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedExercise(null);
        }}
        onEdit={handleOpenEdit}
        onDelete={handleOpenDelete}
        onDuplicate={handleOpenDuplicate}
      />

      {/* Add / Edit Form Modal */}
      <ExerciseFormModal
        isOpen={isFormOpen}
        initialData={formInitialData}
        isDuplicate={isDuplicateMode}
        onClose={() => {
          setIsFormOpen(false);
          setFormInitialData(null);
          setIsDuplicateMode(false);
        }}
        onSave={handleSaveExercise}
      />

      {/* Delete Confirmation Modal */}
      <DeleteExerciseModal
        isOpen={isDeleteOpen}
        exercise={exerciseToDelete}
        onClose={() => {
          setIsDeleteOpen(false);
          setExerciseToDelete(null);
        }}
        onConfirm={handleDeleteExercise}
      />
    </div>
  );
}
