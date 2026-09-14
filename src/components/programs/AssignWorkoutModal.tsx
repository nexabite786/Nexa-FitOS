import React, { useState, useEffect } from 'react';
import { 
  X, 
  Dumbbell, 
  Coffee, 
  Sparkles, 
  Bookmark, 
  Calendar, 
  Plus, 
  Check, 
  Layers, 
  Clock, 
  FileText,
  AlertCircle
} from 'lucide-react';
import { 
  DayOfWeek, 
  DAYS_OF_WEEK, 
  ScheduleItemType, 
  Workout, 
  ProgramScheduleItem,
  WorkoutTemplate
} from '../../types/program';
import { fetchWorkoutTemplates } from '../../lib/templateService';

interface AssignWorkoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  programId: string;
  tenantId: string;
  weekId: string;
  weekNumber: number;
  initialDay?: DayOfWeek;
  existingItem?: ProgramScheduleItem | null;
  existingWorkouts: Workout[];
  onSaveScheduleItem: (item: {
    weekId: string;
    weekNumber: number;
    dayOfWeek: DayOfWeek;
    type: ScheduleItemType;
    workoutId?: string | null;
    isOptional: boolean;
    notes?: string;
  }) => Promise<void>;
  onCreateFromTemplate?: (template: WorkoutTemplate, day: DayOfWeek) => Promise<Workout>;
  onCreateNewWorkout?: (name: string, day: DayOfWeek) => Promise<Workout>;
}

export function AssignWorkoutModal({
  isOpen,
  onClose,
  tenantId,
  weekId,
  weekNumber,
  initialDay = 'Monday',
  existingItem,
  existingWorkouts,
  onSaveScheduleItem,
  onCreateFromTemplate,
  onCreateNewWorkout
}: AssignWorkoutModalProps) {
  const [dayOfWeek, setDayOfWeek] = useState<DayOfWeek>(initialDay);
  const [scheduleType, setScheduleType] = useState<ScheduleItemType>('WORKOUT');
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string>('');
  const [isOptional, setIsOptional] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tab mode for workout selection: 'EXISTING' | 'TEMPLATE' | 'NEW'
  const [workoutSelectMode, setWorkoutSelectMode] = useState<'EXISTING' | 'TEMPLATE' | 'NEW'>('EXISTING');
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [newWorkoutName, setNewWorkoutName] = useState<string>('');

  useEffect(() => {
    if (!isOpen) return;

    if (existingItem) {
      setDayOfWeek(existingItem.dayOfWeek);
      setScheduleType(existingItem.type);
      setSelectedWorkoutId(existingItem.workoutId || '');
      setIsOptional(!!existingItem.isOptional);
      setNotes(existingItem.notes || '');
    } else {
      setDayOfWeek(initialDay);
      setScheduleType('WORKOUT');
      setSelectedWorkoutId(existingWorkouts[0]?.id || '');
      setIsOptional(false);
      setNotes('');
    }
    setError(null);
    setWorkoutSelectMode('EXISTING');
  }, [isOpen, initialDay, existingItem, existingWorkouts]);

  // Load templates on demand if switched to TEMPLATE mode
  useEffect(() => {
    if (workoutSelectMode === 'TEMPLATE' && templates.length === 0 && tenantId) {
      let active = true;
      async function load() {
        try {
          setLoadingTemplates(true);
          const tList = await fetchWorkoutTemplates(tenantId);
          if (active) {
            setTemplates(tList);
            if (tList.length > 0) setSelectedTemplateId(tList[0].id);
          }
        } catch (err) {
          console.error('Failed to load templates:', err);
        } finally {
          if (active) setLoadingTemplates(false);
        }
      }
      load();
      return () => { active = false; };
    }
  }, [workoutSelectMode, templates.length, tenantId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      let finalWorkoutId: string | null = null;

      if (scheduleType === 'REST') {
        finalWorkoutId = null;
      } else {
        // Workout or Optional
        if (workoutSelectMode === 'EXISTING') {
          if (!selectedWorkoutId) {
            throw new Error('Please select an existing workout or create a new one.');
          }
          finalWorkoutId = selectedWorkoutId;
        } else if (workoutSelectMode === 'TEMPLATE') {
          const selectedTpl = templates.find(t => t.id === selectedTemplateId);
          if (!selectedTpl) {
            throw new Error('Please select a workout template.');
          }
          if (onCreateFromTemplate) {
            const created = await onCreateFromTemplate(selectedTpl, dayOfWeek);
            finalWorkoutId = created.id;
          }
        } else if (workoutSelectMode === 'NEW') {
          if (!newWorkoutName.trim()) {
            throw new Error('Please enter a name for the new workout.');
          }
          if (onCreateNewWorkout) {
            const created = await onCreateNewWorkout(newWorkoutName.trim(), dayOfWeek);
            finalWorkoutId = created.id;
          }
        }
      }

      await onSaveScheduleItem({
        weekId,
        weekNumber,
        dayOfWeek,
        type: scheduleType === 'REST' ? 'REST' : (isOptional ? 'OPTIONAL' : 'WORKOUT'),
        workoutId: finalWorkoutId,
        isOptional: scheduleType === 'REST' ? false : isOptional,
        notes: notes.trim()
      });

      onClose();
    } catch (err: any) {
      console.error('Save schedule item error:', err);
      setError(err.message || 'Failed to save schedule item.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-zinc-800 flex items-start justify-between bg-zinc-900/50">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
              Week {weekNumber} Schedule
            </span>
            <h2 className="text-lg font-bold text-white tracking-tight mt-1">
              {existingItem ? 'Edit Scheduled Day' : 'Schedule Day / Workout'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Day of Week Selector */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
              Scheduled Day
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
              {DAYS_OF_WEEK.map(d => {
                const isSelected = dayOfWeek === d;
                return (
                  <button
                    type="button"
                    key={d}
                    onClick={() => setDayOfWeek(d)}
                    className={`py-2 px-1 text-center rounded-xl text-xs font-medium transition-all ${
                      isSelected
                        ? 'bg-amber-500 text-zinc-950 font-bold shadow-sm'
                        : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                    }`}
                  >
                    <span className="block text-[10px] opacity-70 sm:hidden">
                      {d.slice(0, 3)}
                    </span>
                    <span className="hidden sm:block">
                      {d.slice(0, 3)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Schedule Type Selection */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
              Day Protocol
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setScheduleType('WORKOUT');
                }}
                className={`p-3.5 rounded-xl border text-left flex items-start gap-3 transition-all ${
                  scheduleType !== 'REST'
                    ? 'bg-amber-500/10 border-amber-500/40 text-white shadow-sm'
                    : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div className={`p-2 rounded-lg ${scheduleType !== 'REST' ? 'bg-amber-500 text-zinc-950' : 'bg-zinc-800 text-zinc-400'}`}>
                  <Dumbbell className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-zinc-100">Workout Session</h4>
                  <p className="text-[11px] text-zinc-400 mt-0.5">Assigned training prescription</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setScheduleType('REST');
                  setIsOptional(false);
                }}
                className={`p-3.5 rounded-xl border text-left flex items-start gap-3 transition-all ${
                  scheduleType === 'REST'
                    ? 'bg-blue-500/10 border-blue-500/40 text-white shadow-sm'
                    : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div className={`p-2 rounded-lg ${scheduleType === 'REST' ? 'bg-blue-500 text-zinc-950' : 'bg-zinc-800 text-zinc-400'}`}>
                  <Coffee className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-zinc-100">Rest & Recovery</h4>
                  <p className="text-[11px] text-zinc-400 mt-0.5">Active recovery or off day</p>
                </div>
              </button>
            </div>
          </div>

          {/* Workout Selection (if not REST) */}
          {scheduleType !== 'REST' && (
            <div className="space-y-3 pt-2 border-t border-zinc-800/80">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                  Select Workout
                </label>
                {/* Source Mode Tabs */}
                <div className="flex items-center gap-1 bg-zinc-900 p-0.5 rounded-lg border border-zinc-800 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setWorkoutSelectMode('EXISTING')}
                    className={`px-2.5 py-1 rounded-md transition-all ${
                      workoutSelectMode === 'EXISTING'
                        ? 'bg-zinc-800 text-zinc-100 font-semibold shadow-xs'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Program Workouts
                  </button>
                  <button
                    type="button"
                    onClick={() => setWorkoutSelectMode('TEMPLATE')}
                    className={`px-2.5 py-1 rounded-md transition-all ${
                      workoutSelectMode === 'TEMPLATE'
                        ? 'bg-zinc-800 text-zinc-100 font-semibold shadow-xs'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    From Template
                  </button>
                  <button
                    type="button"
                    onClick={() => setWorkoutSelectMode('NEW')}
                    className={`px-2.5 py-1 rounded-md transition-all ${
                      workoutSelectMode === 'NEW'
                        ? 'bg-zinc-800 text-zinc-100 font-semibold shadow-xs'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    + New
                  </button>
                </div>
              </div>

              {/* Mode 1: Existing Workouts */}
              {workoutSelectMode === 'EXISTING' && (
                <div>
                  {existingWorkouts.length === 0 ? (
                    <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 text-center text-xs text-zinc-400">
                      <p>No workouts created in this program yet.</p>
                      <button
                        type="button"
                        onClick={() => setWorkoutSelectMode('NEW')}
                        className="mt-2 text-amber-400 hover:underline font-semibold"
                      >
                        Create a new workout
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {existingWorkouts.map(w => {
                        const isSelected = selectedWorkoutId === w.id;
                        return (
                          <div
                            key={w.id}
                            onClick={() => setSelectedWorkoutId(w.id)}
                            className={`p-3 rounded-xl border text-xs cursor-pointer flex items-center justify-between transition-all ${
                              isSelected
                                ? 'bg-amber-500/10 border-amber-500/50 text-zinc-100'
                                : 'bg-zinc-900/50 border-zinc-800/80 hover:border-zinc-700 text-zinc-300'
                            }`}
                          >
                            <div>
                              <span className="font-semibold block">{w.name}</span>
                              <span className="text-[11px] text-zinc-500">
                                {w.exerciseCount || w.exercises?.length || 0} Exercises • Week {w.weekNumber || 1}
                              </span>
                            </div>
                            {isSelected && (
                              <Check className="w-4 h-4 text-amber-400" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Mode 2: From Gym Template */}
              {workoutSelectMode === 'TEMPLATE' && (
                <div>
                  {loadingTemplates ? (
                    <div className="p-6 text-center text-xs text-zinc-500">
                      Loading gym templates...
                    </div>
                  ) : templates.length === 0 ? (
                    <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 text-center text-xs text-zinc-400">
                      No reusable gym workout templates found.
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {templates.map(t => {
                        const isSelected = selectedTemplateId === t.id;
                        return (
                          <div
                            key={t.id}
                            onClick={() => setSelectedTemplateId(t.id)}
                            className={`p-3 rounded-xl border text-xs cursor-pointer flex items-center justify-between transition-all ${
                              isSelected
                                ? 'bg-amber-500/10 border-amber-500/50 text-zinc-100'
                                : 'bg-zinc-900/50 border-zinc-800/80 hover:border-zinc-700 text-zinc-300'
                            }`}
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold">{t.name}</span>
                                {t.category && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-zinc-800 text-zinc-400">
                                    {t.category}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-zinc-500 line-clamp-1 mt-0.5">
                                {t.exerciseCount} Exercises • {t.description}
                              </p>
                            </div>
                            {isSelected && (
                              <Check className="w-4 h-4 text-amber-400" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Mode 3: Brand New Workout */}
              {workoutSelectMode === 'NEW' && (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={newWorkoutName}
                    onChange={e => setNewWorkoutName(e.target.value)}
                    placeholder="e.g. Upper Body Push, Leg Hypertrophy..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 focus:border-amber-400 focus:outline-none text-xs text-white placeholder-zinc-500"
                  />
                  <p className="text-[11px] text-zinc-500">
                    This will create a new workout session in the program and assign it to this day. You can prescribe exercises later in the builder.
                  </p>
                </div>
              )}

              {/* Optional Workout Checkbox */}
              <div className="pt-2">
                <label className="flex items-center gap-2.5 text-xs text-zinc-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isOptional}
                    onChange={e => setIsOptional(e.target.checked)}
                    className="w-4 h-4 rounded bg-zinc-900 border-zinc-700 text-amber-500 focus:ring-amber-400/20"
                  />
                  <span>
                    Mark as <strong>Optional Workout</strong> (e.g. Optional Cardio, Saturday Recovery)
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Coaching Notes */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
              Coaching Notes / Instructions (Optional)
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder={scheduleType === 'REST' ? 'e.g. Active recovery, 10k steps, sauna, foam rolling...' : 'e.g. Ensure full shoulder warm-up before working sets...'}
              className="w-full px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 focus:border-amber-400 focus:outline-none text-xs text-white placeholder-zinc-500 resize-none"
            />
          </div>

          {/* Footer Submit */}
          <div className="pt-3 border-t border-zinc-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-xl text-xs font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 rounded-xl text-xs font-semibold transition-all shadow-sm flex items-center gap-1.5"
            >
              {submitting ? 'Saving...' : existingItem ? 'Update Schedule' : 'Schedule Day'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
