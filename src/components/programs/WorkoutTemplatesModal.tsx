import React, { useState, useEffect } from 'react';
import { 
  X, 
  Bookmark, 
  Dumbbell, 
  Layers, 
  Clock, 
  Trash2, 
  Check, 
  Search, 
  Plus, 
  AlertCircle,
  FileText
} from 'lucide-react';
import { WorkoutTemplate, WorkoutExercisePrescription, DayOfWeek } from '../../types/program';
import { Exercise } from '../../types/exercise';
import { fetchWorkoutTemplates, deleteWorkoutTemplate } from '../../lib/templateService';
import { fetchAllExercises } from '../../lib/exerciseService';

interface WorkoutTemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
  onSelectTemplate?: (template: WorkoutTemplate) => void;
}

export function WorkoutTemplatesModal({
  isOpen,
  onClose,
  tenantId,
  onSelectTemplate
}: WorkoutTemplatesModalProps) {
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [exerciseMap, setExerciseMap] = useState<Record<string, Exercise>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [activeTemplate, setActiveTemplate] = useState<WorkoutTemplate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !tenantId) return;

    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const [tList, exList] = await Promise.all([
          fetchWorkoutTemplates(tenantId),
          fetchAllExercises(tenantId)
        ]);

        if (!mounted) return;

        const map: Record<string, Exercise> = {};
        exList.forEach(e => { map[e.id] = e; });
        setExerciseMap(map);

        setTemplates(tList);
        if (tList.length > 0) {
          setActiveTemplate(tList[0]);
        }
      } catch (err: any) {
        console.error('Failed to load workout templates:', err);
        if (mounted) setError('Unable to load workout templates. Please try again.');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, [isOpen, tenantId]);

  if (!isOpen) return null;

  const categories = ['ALL', ...Array.from(new Set(templates.map(t => t.category || 'General')))];

  const filteredTemplates = templates.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'ALL' || (t.category || 'General') === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleDelete = async (templateId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this workout template?')) return;

    try {
      setDeletingId(templateId);
      await deleteWorkoutTemplate(tenantId, templateId);
      const updated = templates.filter(t => t.id !== templateId);
      setTemplates(updated);
      if (activeTemplate?.id === templateId) {
        setActiveTemplate(updated[0] || null);
      }
    } catch (err: any) {
      console.error('Failed to delete template:', err);
      alert(err.message || 'Failed to delete template.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-4xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-zinc-800 flex items-start justify-between bg-zinc-900/50">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Bookmark className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                Gym Template Library
              </span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Reusable Workout Templates
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              Select or manage standardized workout templates across all training programs.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="px-6 py-3 bg-zinc-900/40 border-b border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search templates..."
              className="w-full pl-9 pr-3 py-1.5 bg-zinc-900 border border-zinc-800 focus:border-amber-400 focus:outline-none rounded-xl text-xs text-white placeholder-zinc-500"
            />
          </div>

          {/* Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  selectedCategory === cat
                    ? 'bg-amber-500 text-zinc-950 font-bold'
                    : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Dual Pane Workspace */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-0">
          {/* Left Pane: Template Cards */}
          <div className="md:col-span-5 border-r border-zinc-800/80 overflow-y-auto p-4 space-y-2">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-20 bg-zinc-900/60 animate-pulse rounded-xl" />
                ))}
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className="py-12 text-center text-xs text-zinc-500">
                No matching templates found.
              </div>
            ) : (
              filteredTemplates.map(t => {
                const isSelected = activeTemplate?.id === t.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => setActiveTemplate(t)}
                    className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-amber-500/10 border-amber-500/50 shadow-sm'
                        : 'bg-zinc-900/40 border-zinc-800/80 hover:border-zinc-700 text-zinc-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-semibold text-amber-400/90 uppercase tracking-wider block mb-0.5">
                          {t.category || 'General'}
                        </span>
                        <h4 className="text-xs font-bold text-white line-clamp-1">
                          {t.name}
                        </h4>
                      </div>

                      <button
                        onClick={e => handleDelete(t.id, e)}
                        disabled={deletingId === t.id}
                        className="p-1 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                        title="Delete template"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <p className="text-[11px] text-zinc-400 line-clamp-2 mt-1 leading-relaxed">
                      {t.description}
                    </p>

                    <div className="flex items-center gap-3 mt-2 text-[11px] text-zinc-500">
                      <span className="flex items-center gap-1">
                        <Dumbbell className="w-3 h-3 text-amber-400" />
                        {t.exerciseCount || t.exercises?.length || 0} Exercises
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right Pane: Selected Template Preview */}
          <div className="md:col-span-7 flex flex-col overflow-hidden bg-zinc-950">
            {activeTemplate ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Active Template Header */}
                <div className="p-5 border-b border-zinc-800 bg-zinc-900/30">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                        {activeTemplate.category || 'Standard'}
                      </span>
                      <h3 className="text-base font-bold text-white tracking-tight mt-1.5">
                        {activeTemplate.name}
                      </h3>
                      {activeTemplate.description && (
                        <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                          {activeTemplate.description}
                        </p>
                      )}
                    </div>

                    {onSelectTemplate && (
                      <button
                        onClick={() => {
                          onSelectTemplate(activeTemplate);
                          onClose();
                        }}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-sm shrink-0"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Use This Template</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Exercises List */}
                <div className="p-5 overflow-y-auto flex-1 space-y-3">
                  <h5 className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                    Prescribed Movements ({activeTemplate.exercises?.length || 0})
                  </h5>

                  {(!activeTemplate.exercises || activeTemplate.exercises.length === 0) ? (
                    <div className="py-8 text-center text-xs text-zinc-500">
                      No exercises recorded in this template.
                    </div>
                  ) : (
                    activeTemplate.exercises.map((ex, idx) => {
                      const details = exerciseMap[ex.exerciseId];
                      return (
                        <div
                          key={ex.id || idx}
                          className="p-3.5 rounded-xl bg-zinc-900/50 border border-zinc-800 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-5 h-5 rounded-md bg-zinc-800 flex items-center justify-center font-bold text-zinc-400 text-[10px]">
                              {idx + 1}
                            </span>
                            <div>
                              <h5 className="font-semibold text-zinc-200">
                                {details?.name || 'Curated Exercise'}
                              </h5>
                              <span className="text-[11px] text-zinc-500">
                                {details?.targetMuscleGroup || 'Target'} • {details?.equipment || 'Equipment'}
                              </span>
                              {ex.notes && (
                                <p className="text-[11px] text-zinc-400 italic mt-0.5 flex items-center gap-1">
                                  <FileText className="w-3 h-3 text-amber-400/70" />
                                  <span>{ex.notes}</span>
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="px-2 py-0.5 rounded-md bg-zinc-950 border border-zinc-800 font-semibold text-zinc-300">
                              {ex.sets} Sets
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-zinc-950 border border-zinc-800 text-zinc-400">
                              {ex.reps} Reps
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-zinc-950 border border-zinc-800 text-zinc-400">
                              {ex.restSeconds}s Rest
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-xs text-zinc-500">
                Select a template from the left to view its blueprint.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/50 flex items-center justify-between text-xs text-zinc-400">
          <span>{templates.length} gym templates available</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-xl font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
