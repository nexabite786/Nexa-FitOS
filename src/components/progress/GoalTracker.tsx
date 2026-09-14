/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Target,
  Plus,
  CheckCircle2,
  Clock,
  Dumbbell,
  Scale,
  Activity,
  Award,
  Trash2,
  Edit2,
  AlertCircle,
  PauseCircle,
  PlayCircle
} from 'lucide-react';
import { GoalEntry, GoalType, GoalStatus } from '../../types/progress';

interface GoalTrackerProps {
  goals: GoalEntry[];
  exercises?: Array<{ id: string; name: string }>;
  currentWeight?: number;
  onAddGoal: (data: Omit<GoalEntry, 'id' | 'tenantId' | 'clientId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onUpdateGoal?: (id: string, data: Partial<GoalEntry>) => Promise<void>;
  onDeleteGoal?: (id: string) => Promise<void>;
  isCoachView?: boolean;
}

export const GoalTracker: React.FC<GoalTrackerProps> = ({
  goals,
  exercises = [],
  currentWeight,
  onAddGoal,
  onUpdateGoal,
  onDeleteGoal,
  isCoachView = false
}) => {
  const [filterStatus, setFilterStatus] = useState<GoalStatus | 'ALL'>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);

  // Form State
  const [goalType, setGoalType] = useState<GoalType>('BODY_WEIGHT');
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [startValue, setStartValue] = useState<string>(currentWeight ? String(currentWeight) : '');
  const [targetValue, setTargetValue] = useState<string>('');
  const [unit, setUnit] = useState<string>('kg');
  const [exerciseId, setExerciseId] = useState<string>('');
  const [targetReps, setTargetReps] = useState<string>('1');
  const [weeklyTarget, setWeeklyTarget] = useState<string>('4');
  const [targetDate, setTargetDate] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Filtered Goals
  const filteredGoals = useMemo(() => {
    if (filterStatus === 'ALL') return goals;
    return goals.filter(g => g.status === filterStatus);
  }, [goals, filterStatus]);

  // Compute live progress percentage
  const calculateGoalProgress = (goal: GoalEntry): { percent: number; isAhead: boolean } => {
    if (goal.status === 'COMPLETED') return { percent: 100, isAhead: true };
    const cur = goal.currentValue !== undefined ? goal.currentValue : goal.startValue;
    const totalDelta = goal.targetValue - goal.startValue;
    if (totalDelta === 0) return { percent: 100, isAhead: true };

    const currentDelta = cur - goal.startValue;
    const ratio = (currentDelta / totalDelta) * 100;
    const clamped = Math.max(0, Math.min(100, Math.round(ratio)));
    return { percent: clamped, isAhead: ratio >= 50 };
  };

  const handleOpenAdd = () => {
    setIsEditing(null);
    setGoalType('BODY_WEIGHT');
    setTitle('');
    setDescription('');
    setStartValue(currentWeight ? String(currentWeight) : '');
    setTargetValue('');
    setUnit('kg');
    setExerciseId(exercises[0]?.id || '');
    setTargetReps('1');
    setWeeklyTarget('4');
    const future = new Date();
    future.setMonth(future.getMonth() + 2);
    setTargetDate(future.toISOString().split('T')[0]);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (goal: GoalEntry) => {
    setIsEditing(goal.id);
    setGoalType(goal.type);
    setTitle(goal.title);
    setDescription(goal.description || '');
    setStartValue(String(goal.startValue));
    setTargetValue(String(goal.targetValue));
    setUnit(goal.unit || '');
    setExerciseId(goal.exerciseId || '');
    setTargetReps(goal.targetReps ? String(goal.targetReps) : '1');
    setWeeklyTarget(goal.weeklyTarget ? String(goal.weeklyTarget) : '4');
    setTargetDate(goal.targetDate || '');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const startNum = parseFloat(startValue) || 0;
    const targetNum = parseFloat(targetValue) || 0;

    if (!title.trim()) {
      setFormError('Please enter a goal title.');
      return;
    }
    if (targetNum <= 0 && goalType !== 'CUSTOM') {
      setFormError('Please enter a valid target value greater than 0.');
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError(null);

      const selectedEx = exercises.find(ex => ex.id === exerciseId);

      const payload: Omit<GoalEntry, 'id' | 'tenantId' | 'clientId' | 'createdAt' | 'updatedAt'> = {
        type: goalType,
        title: title.trim(),
        description: description.trim(),
        startValue: startNum,
        targetValue: targetNum,
        currentValue: startNum,
        unit: goalType === 'BODY_WEIGHT' ? unit : goalType === 'STRENGTH' ? unit : '',
        exerciseId: goalType === 'STRENGTH' ? exerciseId : undefined,
        exerciseName: goalType === 'STRENGTH' ? selectedEx?.name : undefined,
        targetReps: goalType === 'STRENGTH' ? parseInt(targetReps) || 1 : undefined,
        weeklyTarget: goalType === 'CONSISTENCY' ? parseInt(weeklyTarget) || 4 : undefined,
        startDate: new Date().toISOString().split('T')[0],
        targetDate: targetDate || undefined,
        status: 'ACTIVE'
      };

      if (isEditing && onUpdateGoal) {
        await onUpdateGoal(isEditing, payload);
      } else {
        await onAddGoal(payload);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Failed to save goal.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (goal: GoalEntry) => {
    if (!onUpdateGoal) return;
    const newStatus: GoalStatus = goal.status === 'COMPLETED' ? 'ACTIVE' : 'COMPLETED';
    try {
      await onUpdateGoal(goal.id, {
        status: newStatus,
        completedAt: newStatus === 'COMPLETED' ? new Date().toISOString() : undefined
      });
    } catch (err: any) {
      console.error('Toggle status failed:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!onDeleteGoal) return;
    if (window.confirm('Are you sure you want to delete this goal?')) {
      try {
        await onDeleteGoal(id);
      } catch (err: any) {
        console.error('Delete goal failed:', err);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card/60 backdrop-blur-md p-6 rounded-2xl border border-border/40 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Target Objectives & Milestones</h2>
            <p className="text-sm text-muted-foreground">
              Define body weight, 1RM strength lifts, and workout consistency targets
            </p>
          </div>
        </div>

        <button
          id="btn-create-goal"
          onClick={handleOpenAdd}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 text-black font-semibold hover:bg-emerald-400 transition-all shadow-md shadow-emerald-500/20 text-sm"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          Set New Goal
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 bg-muted/40 p-1 rounded-xl border border-border/30 w-fit">
        {(['ALL', 'ACTIVE', 'COMPLETED', 'PAUSED'] as Array<GoalStatus | 'ALL'>).map(status => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterStatus === status
                ? 'bg-emerald-500 text-black shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {status} ({goals.filter(g => (status === 'ALL' ? true : g.status === status)).length})
          </button>
        ))}
      </div>

      {/* Goals Grid */}
      {filteredGoals.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredGoals.map(goal => {
            const { percent } = calculateGoalProgress(goal);
            const isDone = goal.status === 'COMPLETED';

            return (
              <div
                key={goal.id}
                className={`p-5 rounded-2xl border transition-all space-y-4 ${
                  isDone
                    ? 'bg-emerald-950/10 border-emerald-500/30'
                    : 'bg-card/40 border-border/40 hover:border-border/70'
                }`}
              >
                {/* Top Badge & Actions */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1.5 ${
                        goal.type === 'BODY_WEIGHT'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : goal.type === 'STRENGTH'
                          ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                          : goal.type === 'CONSISTENCY'
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          : 'bg-muted text-foreground border border-border'
                      }`}
                    >
                      {goal.type === 'BODY_WEIGHT' && <Scale className="w-3.5 h-3.5" />}
                      {goal.type === 'STRENGTH' && <Dumbbell className="w-3.5 h-3.5" />}
                      {goal.type === 'CONSISTENCY' && <Activity className="w-3.5 h-3.5" />}
                      {goal.type === 'CUSTOM' && <Award className="w-3.5 h-3.5" />}
                      {goal.type.replace('_', ' ')}
                    </span>

                    {isDone && (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 text-[11px] font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Completed
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {onUpdateGoal && (
                      <button
                        onClick={() => handleToggleStatus(goal)}
                        className={`p-1.5 rounded-lg border transition-colors ${
                          isDone
                            ? 'bg-emerald-500 text-black border-emerald-500'
                            : 'hover:bg-muted text-muted-foreground border-border/40'
                        }`}
                        title={isDone ? 'Mark as Active' : 'Mark as Completed'}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    )}
                    {onUpdateGoal && (
                      <button
                        onClick={() => handleOpenEdit(goal)}
                        className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {onDeleteGoal && (
                      <button
                        onClick={() => handleDelete(goal.id)}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Title & Description */}
                <div>
                  <h3 className="text-base font-bold text-foreground">{goal.title}</h3>
                  {goal.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{goal.description}</p>
                  )}
                  {goal.exerciseName && (
                    <div className="text-xs text-purple-300 mt-1 font-medium">
                      Lift Target: {goal.exerciseName} ({goal.targetReps || 1} reps)
                    </div>
                  )}
                </div>

                {/* Metrics Breakdown */}
                <div className="flex items-baseline justify-between text-xs pt-1 border-t border-border/20">
                  <span className="text-muted-foreground">
                    Start: <strong className="text-foreground">{goal.startValue} {goal.unit}</strong>
                  </span>
                  <span className="text-muted-foreground">
                    Target: <strong className="text-emerald-400 font-bold">{goal.targetValue} {goal.unit}</strong>
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-medium">Estimated Progress</span>
                    <span className="font-bold text-emerald-400">{percent}%</span>
                  </div>
                  <div className="w-full h-2 bg-muted/40 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 rounded-full ${
                        isDone
                          ? 'bg-emerald-400'
                          : 'bg-gradient-to-r from-emerald-500 to-amber-400'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>

                {/* Footer Date / Time */}
                {goal.targetDate && (
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Target Date: {goal.targetDate}
                    </span>
                    {goal.completedAt && (
                      <span className="text-emerald-400 font-semibold">
                        Achieved on {goal.completedAt.split('T')[0]}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-16 text-center text-muted-foreground text-sm bg-card/20 rounded-2xl border border-dashed border-border/40">
          No goals found in this view. Click "Set New Goal" above to create an objective!
        </div>
      )}

      {/* Goal Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-border w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-border/40">
              <h3 className="text-lg font-bold text-foreground">
                {isEditing ? 'Edit Fitness Goal' : 'Define New Goal'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Type Picker */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Goal Archetype</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { type: 'BODY_WEIGHT', label: 'Body Weight', icon: Scale },
                    { type: 'STRENGTH', label: 'Strength PR', icon: Dumbbell },
                    { type: 'CONSISTENCY', label: 'Consistency', icon: Activity },
                    { type: 'CUSTOM', label: 'Custom', icon: Award }
                  ].map(item => {
                    const Icon = item.icon;
                    const isSel = goalType === item.type;
                    return (
                      <button
                        key={item.type}
                        type="button"
                        onClick={() => {
                          setGoalType(item.type as GoalType);
                          if (item.type === 'BODY_WEIGHT' && !title) setTitle('Target Body Weight');
                          if (item.type === 'CONSISTENCY' && !title) setTitle('Weekly Training Habit');
                        }}
                        className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                          isSel
                            ? 'bg-emerald-500/10 border-emerald-500/50 text-foreground font-semibold'
                            : 'bg-background border-border text-muted-foreground hover:border-border/80'
                        }`}
                      >
                        <Icon className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Goal Title</label>
                <input
                  type="text"
                  placeholder="e.g. Cut to 75 kg or Bench Press 100 kg"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm font-semibold"
                />
              </div>

              {/* Conditional Strength Fields */}
              {goalType === 'STRENGTH' && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-purple-950/10 border border-purple-500/20 rounded-xl">
                  <div className="col-span-2 space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Target Exercise</label>
                    <select
                      value={exerciseId}
                      onChange={e => setExerciseId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-background border border-border text-foreground text-xs"
                    >
                      {exercises.map(ex => (
                        <option key={ex.id} value={ex.id}>
                          {ex.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Target Reps</label>
                    <input
                      type="number"
                      min="1"
                      value={targetReps}
                      onChange={e => setTargetReps(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-background border border-border text-foreground text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Weight Unit</label>
                    <select
                      value={unit}
                      onChange={e => setUnit(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-background border border-border text-foreground text-xs"
                    >
                      <option value="kg">kg</option>
                      <option value="lbs">lbs</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Numerical Targets */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Start Value</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="0"
                    value={startValue}
                    onChange={e => setStartValue(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Target Value</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="100"
                    value={targetValue}
                    onChange={e => setTargetValue(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Unit</label>
                  <input
                    type="text"
                    placeholder="kg, lbs, days"
                    value={unit}
                    onChange={e => setUnit(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm font-semibold"
                  />
                </div>
              </div>

              {/* Target Date */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Target Deadline Date</label>
                <input
                  type="date"
                  value={targetDate}
                  onChange={e => setTargetDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Description & Strategy</label>
                <textarea
                  placeholder="e.g. Focus on progressive overload, adding 2.5kg per week with 3 rest days"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={2}
                  className="w-full px-3.5 py-2 rounded-xl bg-background border border-border text-foreground text-xs resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-emerald-500 text-black hover:bg-emerald-400 disabled:opacity-50 transition-all shadow-md shadow-emerald-500/20"
                >
                  {isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Goal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
