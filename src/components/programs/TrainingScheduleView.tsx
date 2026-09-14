import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  Plus, 
  Copy, 
  Edit3, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Dumbbell, 
  Coffee, 
  Clock, 
  Sparkles, 
  Eye, 
  Check, 
  MoreVertical,
  ChevronRight,
  Layers,
  FileText,
  AlertCircle
} from 'lucide-react';
import { 
  Program, 
  ProgramWeek, 
  ProgramScheduleItem, 
  Workout, 
  DayOfWeek, 
  DAYS_OF_WEEK, 
  ScheduleItemType,
  WorkoutTemplate
} from '../../types/program';
import { 
  createProgramWeek, 
  updateProgramWeek, 
  deleteProgramWeek, 
  duplicateProgramWeek, 
  reorderProgramWeeks, 
  saveScheduleItem, 
  deleteScheduleItem,
  reorderScheduleItems
} from '../../lib/scheduleService';
import { duplicateWorkoutInProgram } from '../../lib/programService';
import { createWorkoutFromTemplate } from '../../lib/templateService';
import { AssignWorkoutModal } from './AssignWorkoutModal';
import { WorkoutDetailModal } from './WorkoutDetailModal';

interface TrainingScheduleViewProps {
  program: Program;
  tenantId: string;
  userId: string;
  weeks: ProgramWeek[];
  scheduleItems: ProgramScheduleItem[];
  workouts: Workout[];
  onDataChanged: () => Promise<void>;
  onOpenWorkoutBuilder: (workoutId?: string) => void;
  onSaveWorkoutAsTemplate: (workout: Workout) => void;
}

export function TrainingScheduleView({
  program,
  tenantId,
  userId,
  weeks,
  scheduleItems,
  workouts,
  onDataChanged,
  onOpenWorkoutBuilder,
  onSaveWorkoutAsTemplate
}: TrainingScheduleViewProps) {
  // Currently active/selected week for focus (default to Week 1 or first week)
  const [activeWeekId, setActiveWeekId] = useState<string>(weeks[0]?.id || 'week-1');
  const [selectedDayModal, setSelectedDayModal] = useState<{
    isOpen: boolean;
    dayOfWeek: DayOfWeek;
    existingItem?: ProgramScheduleItem | null;
  }>({
    isOpen: false,
    dayOfWeek: 'Monday',
    existingItem: null
  });

  // Workout Preview Modal
  const [previewWorkoutId, setPreviewWorkoutId] = useState<string | null>(null);

  // Week renaming inline state
  const [editingWeekId, setEditingWeekId] = useState<string | null>(null);
  const [editingWeekName, setEditingWeekName] = useState<string>('');

  // Status & Feedback
  const [savingStatus, setSavingStatus] = useState<'IDLE' | 'SAVING' | 'SAVED'>('IDLE');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sort weeks by order or weekNumber
  const sortedWeeks = useMemo(() => {
    return [...weeks].sort((a, b) => (a.order || a.weekNumber) - (b.order || b.weekNumber));
  }, [weeks]);

  // Current active week object
  const activeWeek = useMemo(() => {
    return sortedWeeks.find(w => w.id === activeWeekId) || sortedWeeks[0] || null;
  }, [sortedWeeks, activeWeekId]);

  // Schedule items for current active week
  const activeWeekScheduleItems = useMemo(() => {
    if (!activeWeek) return [];
    return scheduleItems.filter(item => item.weekId === activeWeek.id || item.weekNumber === activeWeek.weekNumber);
  }, [scheduleItems, activeWeek]);

  // Map of items grouped by day of week for fast lookup
  const dayScheduleMap = useMemo(() => {
    const map: Partial<Record<DayOfWeek, ProgramScheduleItem[]>> = {};
    DAYS_OF_WEEK.forEach(d => { map[d] = []; });
    activeWeekScheduleItems.forEach(item => {
      if (map[item.dayOfWeek]) {
        map[item.dayOfWeek]!.push(item);
      }
    });
    // Sort items within each day by order
    DAYS_OF_WEEK.forEach(d => {
      map[d]?.sort((a, b) => (a.order || 0) - (b.order || 0));
    });
    return map;
  }, [activeWeekScheduleItems]);

  // ----------------------------------------------------------------------
  // WEEK MANAGEMENT ACTIONS
  // ----------------------------------------------------------------------

  const handleAddWeek = async () => {
    try {
      setSavingStatus('SAVING');
      setErrorMessage(null);
      const nextWeekNum = sortedWeeks.length > 0 
        ? Math.max(...sortedWeeks.map(w => w.weekNumber)) + 1 
        : 1;

      const created = await createProgramWeek(
        tenantId,
        program.id,
        nextWeekNum,
        `Week ${nextWeekNum}`
      );
      await onDataChanged();
      setActiveWeekId(created.id!);
      setSavingStatus('SAVED');
      setTimeout(() => setSavingStatus('IDLE'), 2000);
    } catch (err: any) {
      console.error('Failed to add week:', err);
      setErrorMessage(err.message || 'Failed to add week.');
      setSavingStatus('IDLE');
    }
  };

  const handleStartRenameWeek = (week: ProgramWeek) => {
    setEditingWeekId(week.id || null);
    setEditingWeekName(week.name || `Week ${week.weekNumber}`);
  };

  const handleSaveRenameWeek = async (weekId: string) => {
    if (!editingWeekName.trim()) {
      setEditingWeekId(null);
      return;
    }
    try {
      setSavingStatus('SAVING');
      await updateProgramWeek(tenantId, program.id, weekId, { name: editingWeekName.trim() });
      await onDataChanged();
      setEditingWeekId(null);
      setSavingStatus('SAVED');
      setTimeout(() => setSavingStatus('IDLE'), 2000);
    } catch (err: any) {
      console.error('Failed to rename week:', err);
      setErrorMessage(err.message || 'Failed to rename week.');
      setSavingStatus('IDLE');
    }
  };

  const handleDuplicateWeek = async (weekToDup: ProgramWeek) => {
    try {
      setSavingStatus('SAVING');
      setErrorMessage(null);
      const nextWeekNum = sortedWeeks.length > 0 
        ? Math.max(...sortedWeeks.map(w => w.weekNumber)) + 1 
        : 1;

      const { newWeek } = await duplicateProgramWeek(
        tenantId,
        program.id,
        weekToDup,
        nextWeekNum,
        `${weekToDup.name} (Copy)`
      );
      await onDataChanged();
      setActiveWeekId(newWeek.id!);
      setSavingStatus('SAVED');
      setTimeout(() => setSavingStatus('IDLE'), 2000);
    } catch (err: any) {
      console.error('Failed to duplicate week:', err);
      setErrorMessage(err.message || 'Failed to duplicate week.');
      setSavingStatus('IDLE');
    }
  };

  const handleDeleteWeek = async (week: ProgramWeek) => {
    if (sortedWeeks.length <= 1) {
      alert('A program must keep at least one training week.');
      return;
    }
    const hasItems = scheduleItems.some(i => i.weekId === week.id);
    const confirmMsg = hasItems
      ? `"${week.name}" has scheduled workouts. Delete this week and all its scheduled sessions?`
      : `Delete "${week.name}"?`;
    if (!confirm(confirmMsg)) return;

    try {
      setSavingStatus('SAVING');
      setErrorMessage(null);
      await deleteProgramWeek(tenantId, program.id, week.id!);
      await onDataChanged();

      const remaining = sortedWeeks.filter(w => w.id !== week.id);
      if (activeWeekId === week.id) {
        setActiveWeekId(remaining[0]?.id || '');
      }
      setSavingStatus('SAVED');
      setTimeout(() => setSavingStatus('IDLE'), 2000);
    } catch (err: any) {
      console.error('Failed to delete week:', err);
      setErrorMessage(err.message || 'Failed to delete week.');
      setSavingStatus('IDLE');
    }
  };

  const handleMoveWeek = async (index: number, direction: 'UP' | 'DOWN') => {
    if (
      (direction === 'UP' && index === 0) ||
      (direction === 'DOWN' && index === sortedWeeks.length - 1)
    ) return;

    try {
      setSavingStatus('SAVING');
      setErrorMessage(null);
      const targetIdx = direction === 'UP' ? index - 1 : index + 1;
      const reordered = [...sortedWeeks];
      const temp = reordered[index];
      reordered[index] = reordered[targetIdx];
      reordered[targetIdx] = temp;

      await reorderProgramWeeks(tenantId, program.id, reordered);
      await onDataChanged();
      setSavingStatus('SAVED');
      setTimeout(() => setSavingStatus('IDLE'), 2000);
    } catch (err: any) {
      console.error('Failed to reorder weeks:', err);
      setErrorMessage(err.message || 'Failed to reorder weeks.');
      setSavingStatus('IDLE');
    }
  };

  // ----------------------------------------------------------------------
  // SCHEDULE ITEM MUTATIONS
  // ----------------------------------------------------------------------

  const handleSaveScheduleItem = async (data: {
    weekId: string;
    weekNumber: number;
    dayOfWeek: DayOfWeek;
    type: ScheduleItemType;
    workoutId?: string | null;
    isOptional: boolean;
    notes?: string;
  }) => {
    if (!activeWeek) return;
    try {
      setSavingStatus('SAVING');
      setErrorMessage(null);

      const existing = selectedDayModal.existingItem;
      const currentDayItems = dayScheduleMap[data.dayOfWeek] || [];
      const order = existing?.order || currentDayItems.length + 1;

      await saveScheduleItem(tenantId, program.id, {
        id: existing?.id,
        tenantId,
        programId: program.id,
        weekId: activeWeek.id!,
        weekNumber: activeWeek.weekNumber,
        dayOfWeek: data.dayOfWeek,
        type: data.type,
        workoutId: data.workoutId || null,
        isOptional: data.isOptional,
        order,
        notes: data.notes || '',
        createdAt: existing?.createdAt
      });

      await onDataChanged();
      setSavingStatus('SAVED');
      setTimeout(() => setSavingStatus('IDLE'), 2000);
    } catch (err: any) {
      console.error('Failed to save schedule item:', err);
      setErrorMessage(err.message || 'Failed to save schedule item.');
      setSavingStatus('IDLE');
      throw err;
    }
  };

  const handleDeleteScheduleItem = async (scheduleItemId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Remove this scheduled session from the day?')) return;

    try {
      setSavingStatus('SAVING');
      await deleteScheduleItem(tenantId, program.id, scheduleItemId);
      await onDataChanged();
      setSavingStatus('SAVED');
      setTimeout(() => setSavingStatus('IDLE'), 2000);
    } catch (err: any) {
      console.error('Failed to remove schedule item:', err);
      setErrorMessage(err.message || 'Failed to remove schedule item.');
      setSavingStatus('IDLE');
    }
  };

  const handleDuplicateScheduledWorkout = async (workoutId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setSavingStatus('SAVING');
      setErrorMessage(null);
      const cloned = await duplicateWorkoutInProgram(tenantId, program.id, workoutId);
      await onDataChanged();
      setSavingStatus('SAVED');
      setTimeout(() => setSavingStatus('IDLE'), 2000);
      alert(`Workout cloned successfully as "${cloned.name}".`);
    } catch (err: any) {
      console.error('Failed to duplicate workout:', err);
      setErrorMessage(err.message || 'Failed to duplicate workout.');
      setSavingStatus('IDLE');
    }
  };

  const handleCreateFromTemplateForDay = async (template: WorkoutTemplate, day: DayOfWeek): Promise<Workout> => {
    if (!activeWeek) throw new Error('No active week');
    const newWorkout = await createWorkoutFromTemplate(
      tenantId,
      program.id,
      template,
      activeWeek.weekNumber,
      day
    );
    await onDataChanged();
    return newWorkout;
  };

  const handleCreateNewWorkoutForDay = async (name: string, day: DayOfWeek): Promise<Workout> => {
    if (!activeWeek) throw new Error('No active week');
    // Save new basic workout in program workouts
    const newWorkout = await duplicateWorkoutInProgram(
      tenantId,
      program.id,
      workouts[0]?.id || 'dummy',
      name
    );
    await onDataChanged();
    return newWorkout;
  };

  const handleReorderDayItem = async (day: DayOfWeek, index: number, direction: 'UP' | 'DOWN') => {
    const items = dayScheduleMap[day] || [];
    if (
      (direction === 'UP' && index === 0) ||
      (direction === 'DOWN' && index === items.length - 1)
    ) return;

    try {
      setSavingStatus('SAVING');
      const targetIdx = direction === 'UP' ? index - 1 : index + 1;
      const reordered = [...items];
      const temp = reordered[index];
      reordered[index] = reordered[targetIdx];
      reordered[targetIdx] = temp;

      await reorderScheduleItems(tenantId, program.id, reordered);
      await onDataChanged();
      setSavingStatus('SAVED');
      setTimeout(() => setSavingStatus('IDLE'), 2000);
    } catch (err: any) {
      console.error('Failed to reorder scheduled items:', err);
      setSavingStatus('IDLE');
    }
  };

  return (
    <div className="space-y-6">
      {/* Save Status & Alerts */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {savingStatus === 'SAVING' && (
            <span className="text-xs text-amber-400 flex items-center gap-1.5 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              Saving schedule changes...
            </span>
          )}
          {savingStatus === 'SAVED' && (
            <span className="text-xs text-emerald-400 flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5" />
              Schedule updated and saved to Firestore
            </span>
          )}
          {savingStatus === 'IDLE' && (
            <span className="text-xs text-zinc-500">
              Training Schedule • Week {activeWeek?.weekNumber || 1} of {sortedWeeks.length}
            </span>
          )}
        </div>

        {errorMessage && (
          <div className="text-xs text-red-400 flex items-center gap-1.5 bg-red-500/10 px-3 py-1 rounded-lg border border-red-500/20">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Week Selector Tabs & Management Toolbar */}
      <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Weeks Scrollable Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {sortedWeeks.map((week, idx) => {
            const isSelected = activeWeek?.id === week.id;
            const isEditing = editingWeekId === week.id;
            const weekItems = scheduleItems.filter(i => i.weekId === week.id || i.weekNumber === week.weekNumber);
            const workoutCount = weekItems.filter(i => i.type !== 'REST').length;

            return (
              <div
                key={week.id || idx}
                className="group/week relative flex items-center shrink-0"
              >
                {isEditing ? (
                  <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-amber-500/50">
                    <input
                      type="text"
                      value={editingWeekName}
                      onChange={e => setEditingWeekName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleSaveRenameWeek(week.id!);
                        if (e.key === 'Escape') setEditingWeekId(null);
                      }}
                      autoFocus
                      className="px-2 py-1 bg-zinc-900 rounded-lg text-xs text-white focus:outline-none w-32 font-semibold"
                    />
                    <button
                      onClick={() => handleSaveRenameWeek(week.id!)}
                      className="p-1 text-emerald-400 hover:bg-emerald-500/20 rounded"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setActiveWeekId(week.id!)}
                    className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 border ${
                      isSelected
                        ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-md font-bold'
                        : 'bg-zinc-900/90 text-zinc-300 hover:text-white hover:bg-zinc-800/80 border-zinc-800'
                    }`}
                  >
                    <span>{week.name || `Week ${week.weekNumber}`}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isSelected ? 'bg-zinc-950/20 text-zinc-950 font-bold' : 'bg-zinc-800 text-zinc-400'
                    }`}>
                      {workoutCount} {workoutCount === 1 ? 'Wkout' : 'Wkouts'}
                    </span>
                  </button>
                )}
              </div>
            );
          })}

          {/* Add Week Button */}
          <button
            onClick={handleAddWeek}
            className="px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-zinc-900/50 hover:bg-zinc-800 text-zinc-400 hover:text-amber-400 border border-dashed border-zinc-700/80 flex items-center gap-1.5 transition-colors shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Week</span>
          </button>
        </div>

        {/* Current Active Week Controls */}
        {activeWeek && (
          <div className="flex items-center gap-2 shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-zinc-800">
            {/* Rename */}
            <button
              onClick={() => handleStartRenameWeek(activeWeek)}
              className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors"
              title="Rename this week"
            >
              <Edit3 className="w-3.5 h-3.5 text-zinc-400" />
              <span className="hidden sm:inline">Rename</span>
            </button>

            {/* Duplicate Week */}
            <button
              onClick={() => handleDuplicateWeek(activeWeek)}
              className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors"
              title="Duplicate this week and scheduled items"
            >
              <Copy className="w-3.5 h-3.5 text-zinc-400" />
              <span className="hidden sm:inline">Duplicate Week</span>
            </button>

            {/* Reorder Week Up/Down */}
            {(() => {
              const curIdx = sortedWeeks.findIndex(w => w.id === activeWeek.id);
              return (
                <div className="flex items-center gap-1 bg-zinc-950 p-0.5 rounded-xl border border-zinc-800">
                  <button
                    onClick={() => handleMoveWeek(curIdx, 'UP')}
                    disabled={curIdx === 0}
                    className="p-1 text-zinc-400 hover:text-white disabled:opacity-30 rounded hover:bg-zinc-800 transition-colors"
                    title="Move Week Earlier"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleMoveWeek(curIdx, 'DOWN')}
                    disabled={curIdx === sortedWeeks.length - 1}
                    className="p-1 text-zinc-400 hover:text-white disabled:opacity-30 rounded hover:bg-zinc-800 transition-colors"
                    title="Move Week Later"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })()}

            {/* Delete Week */}
            <button
              onClick={() => handleDeleteWeek(activeWeek)}
              className="p-2 bg-zinc-900 hover:bg-red-500/10 text-zinc-400 hover:text-red-400 rounded-xl text-xs transition-colors border border-zinc-800"
              title="Delete this week"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* SCHEDULE LAYOUT:
          Desktop: 7-Column Grid
          Mobile: Stacked Day Cards
          No page-level horizontal scrolling! */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3">
        {DAYS_OF_WEEK.map((day) => {
          const itemsForDay = dayScheduleMap[day] || [];
          const hasItems = itemsForDay.length > 0;

          return (
            <div
              key={day}
              className={`rounded-2xl border flex flex-col justify-between transition-all duration-200 min-h-[220px] ${
                hasItems
                  ? 'bg-zinc-900/60 border-zinc-800/80 shadow-sm hover:border-zinc-700/80'
                  : 'bg-zinc-950/40 border-dashed border-zinc-800/60 hover:border-zinc-700/60'
              }`}
            >
              {/* Day Header */}
              <div className="p-3 border-b border-zinc-800/60 flex items-center justify-between bg-zinc-900/40 rounded-t-2xl">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                  {day}
                </span>

                <button
                  onClick={() => setSelectedDayModal({
                    isOpen: true,
                    dayOfWeek: day,
                    existingItem: null
                  })}
                  className="p-1 text-zinc-400 hover:text-amber-400 hover:bg-zinc-800 rounded-lg transition-colors"
                  title={`Add workout to ${day}`}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Day Content Body */}
              <div className="p-3 flex-1 space-y-2">
                {!hasItems ? (
                  /* Empty State for Day */
                  <div className="h-full flex flex-col items-center justify-center py-6 text-center text-zinc-500">
                    <span className="text-[11px] text-zinc-500 mb-2">Rest / Unscheduled</span>
                    <button
                      onClick={() => setSelectedDayModal({
                        isOpen: true,
                        dayOfWeek: day,
                        existingItem: null
                      })}
                      className="px-2.5 py-1 text-[11px] font-semibold text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 rounded-lg transition-all"
                    >
                      + Schedule
                    </button>
                  </div>
                ) : (
                  itemsForDay.map((item, itemIdx) => {
                    const isRest = item.type === 'REST';
                    const isOpt = item.isOptional || item.type === 'OPTIONAL';
                    const workout = item.workoutDetails || workouts.find(w => w.id === item.workoutId);

                    return (
                      <div
                        key={item.id || itemIdx}
                        className={`group relative p-3 rounded-xl border transition-all text-xs ${
                          isRest
                            ? 'bg-zinc-900/90 border-blue-500/20 text-blue-200/90'
                            : 'bg-zinc-950 border-zinc-800/90 hover:border-amber-500/40 text-zinc-200'
                        }`}
                      >
                        {/* Badges & Reorder Controls */}
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {isRest ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1">
                                <Coffee className="w-3 h-3" />
                                Rest Day
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                                <Dumbbell className="w-3 h-3" />
                                Workout
                              </span>
                            )}

                            {isOpt && !isRest && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                Optional
                              </span>
                            )}
                          </div>

                          {/* Reorder Buttons (if multiple on same day) */}
                          {itemsForDay.length > 1 && (
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleReorderDayItem(day, itemIdx, 'UP')}
                                disabled={itemIdx === 0}
                                className="p-0.5 text-zinc-400 hover:text-white disabled:opacity-20"
                                title="Move Up"
                              >
                                <ArrowUp className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleReorderDayItem(day, itemIdx, 'DOWN')}
                                disabled={itemIdx === itemsForDay.length - 1}
                                className="p-0.5 text-zinc-400 hover:text-white disabled:opacity-20"
                                title="Move Down"
                              >
                                <ArrowDown className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Title & Workout Details */}
                        {isRest ? (
                          <div className="py-1">
                            <h4 className="font-semibold text-blue-300">Rest & Recovery</h4>
                            {item.notes ? (
                              <p className="text-[11px] text-zinc-400 italic mt-1 leading-relaxed">
                                {item.notes}
                              </p>
                            ) : (
                              <p className="text-[11px] text-zinc-500 mt-0.5">
                                Scheduled rest protocol
                              </p>
                            )}
                          </div>
                        ) : (
                          <div>
                            <h4 
                              onClick={() => workout && setPreviewWorkoutId(workout.id)}
                              className="font-bold text-zinc-100 hover:text-amber-400 cursor-pointer transition-colors line-clamp-1 text-xs"
                            >
                              {workout?.name || 'Workout Session'}
                            </h4>

                            <div className="flex items-center gap-2 mt-1 text-[11px] text-zinc-400">
                              <span>{workout?.exerciseCount || workout?.exercises?.length || 0} Ex</span>
                              <span>•</span>
                              <span>Wk {activeWeek?.weekNumber || 1}</span>
                            </div>

                            {item.notes && (
                              <p className="text-[11px] text-amber-400/80 italic mt-1.5 line-clamp-2">
                                Note: {item.notes}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Card Hover Action Bar */}
                        <div className="mt-3 pt-2 border-t border-zinc-800/80 flex items-center justify-between gap-1 text-[11px]">
                          {!isRest && workout && (
                            <button
                              onClick={() => setPreviewWorkoutId(workout.id)}
                              className="p-1 text-zinc-400 hover:text-blue-400 hover:bg-zinc-800 rounded transition-colors"
                              title="Preview workout prescription"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {!isRest && workout && (
                            <button
                              onClick={() => onOpenWorkoutBuilder(workout.id)}
                              className="p-1 text-zinc-400 hover:text-amber-400 hover:bg-zinc-800 rounded transition-colors"
                              title="Edit in Workout Builder"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {!isRest && workout && (
                            <button
                              onClick={(e) => handleDuplicateScheduledWorkout(workout.id, e)}
                              className="p-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors"
                              title="Duplicate Workout"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            onClick={() => setSelectedDayModal({
                              isOpen: true,
                              dayOfWeek: day,
                              existingItem: item
                            })}
                            className="p-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors"
                            title="Edit schedule entry"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={(e) => handleDeleteScheduleItem(item.id, e)}
                            className="p-1 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors ml-auto"
                            title="Remove from Day"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Day Bottom Quick Add */}
              <div className="p-2 border-t border-zinc-800/60 bg-zinc-950/60 rounded-b-2xl flex items-center justify-between">
                <button
                  onClick={() => setSelectedDayModal({
                    isOpen: true,
                    dayOfWeek: day,
                    existingItem: null
                  })}
                  className="w-full py-1 text-[11px] font-medium text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg transition-colors flex items-center justify-center gap-1"
                >
                  <Plus className="w-3 h-3 text-amber-400" />
                  <span>Add Session</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Schedule Item (Assign Workout or Rest Day) */}
      <AssignWorkoutModal
        isOpen={selectedDayModal.isOpen}
        onClose={() => setSelectedDayModal(prev => ({ ...prev, isOpen: false }))}
        programId={program.id}
        tenantId={tenantId}
        weekId={activeWeek?.id || ''}
        weekNumber={activeWeek?.weekNumber || 1}
        initialDay={selectedDayModal.dayOfWeek}
        existingItem={selectedDayModal.existingItem}
        existingWorkouts={workouts}
        onSaveScheduleItem={handleSaveScheduleItem}
        onCreateFromTemplate={handleCreateFromTemplateForDay}
        onCreateNewWorkout={handleCreateNewWorkoutForDay}
      />

      {/* Modal: Single Workout Preview */}
      <WorkoutDetailModal
        isOpen={!!previewWorkoutId}
        onClose={() => setPreviewWorkoutId(null)}
        workoutId={previewWorkoutId}
        programId={program.id}
        tenantId={tenantId}
        onEditInBuilder={(wId) => {
          setPreviewWorkoutId(null);
          onOpenWorkoutBuilder(wId);
        }}
        onDuplicate={async (wId) => {
          await duplicateWorkoutInProgram(tenantId, program.id, wId);
          await onDataChanged();
        }}
        onSaveAsTemplate={(w) => {
          onSaveWorkoutAsTemplate(w);
        }}
      />
    </div>
  );
}
