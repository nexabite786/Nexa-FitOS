import React, { useState, useEffect } from 'react';
import {
  X,
  Target,
  Droplets,
  Footprints,
  Moon,
  Flame,
  Apple,
  Sparkles,
  CheckCircle2,
  Clock,
  Layers
} from 'lucide-react';
import { Button } from '../ui/button';
import {
  Habit,
  HabitType,
  HabitFrequency,
  HabitOwnership
} from '../../types/accountability';
import { createHabit, updateHabit } from '../../lib/accountabilityService';
import { useAuthStore } from '../../store/authStore';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { formatDateToYMD } from '../../lib/assignmentService';

interface AssignHabitModalProps {
  tenantId: string;
  isOpen: boolean;
  onClose: () => void;
  habitToEdit?: Habit | null;
  clientId?: string;
  clientName?: string;
  isClientSelfCreate?: boolean;
  onSaved: (habit: Habit) => void;
}

const HABIT_PRESETS: Array<{
  name: string;
  description: string;
  type: HabitType;
  target: number;
  unit: string;
  category: 'HYDRATION' | 'SLEEP' | 'ACTIVITY' | 'MINDFULNESS' | 'NUTRITION' | 'GENERAL';
  icon: any;
}> = [
  {
    name: 'Daily Hydration Target',
    description: 'Drink optimal water throughout the day for hydration and energy.',
    type: 'QUANTITY',
    target: 3,
    unit: 'L',
    category: 'HYDRATION',
    icon: Droplets
  },
  {
    name: 'Daily Step Goal',
    description: 'Maintain baseline non-exercise physical activity (NEAT).',
    type: 'COUNT',
    target: 10000,
    unit: 'steps',
    category: 'ACTIVITY',
    icon: Footprints
  },
  {
    name: '7+ Hours Sleep',
    description: 'Ensure adequate nightly sleep duration for muscle recovery and hormonal balance.',
    type: 'DURATION',
    target: 7,
    unit: 'hours',
    category: 'SLEEP',
    icon: Moon
  },
  {
    name: 'Daily Protein Target',
    description: 'Hit target dietary protein intake to support muscle repair and satiety.',
    type: 'COUNT',
    target: 150,
    unit: 'g',
    category: 'NUTRITION',
    icon: Apple
  },
  {
    name: 'Morning Mobility & Stretching',
    description: 'Perform 15 minutes of dynamic stretching and joint mobility.',
    type: 'DURATION',
    target: 15,
    unit: 'min',
    category: 'MINDFULNESS',
    icon: Flame
  },
  {
    name: 'Daily Creatine / Supplements',
    description: 'Take prescribed daily vitamins and creatine monohydrate.',
    type: 'BOOLEAN',
    target: 1,
    unit: 'times',
    category: 'GENERAL',
    icon: CheckCircle2
  }
];

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function AssignHabitModal({
  tenantId,
  isOpen,
  onClose,
  habitToEdit,
  clientId,
  clientName,
  isClientSelfCreate,
  onSaved
}: AssignHabitModalProps) {
  const { user, profile } = useAuthStore();
  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedClientId, setSelectedClientId] = useState(clientId || '');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<HabitType>('BOOLEAN');
  const [target, setTarget] = useState(1);
  const [unit, setUnit] = useState('times');
  const [frequency, setFrequency] = useState<HabitFrequency>('DAILY');
  const [weekdays, setWeekdays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [weeklyTargetDays, setWeeklyTargetDays] = useState(5);
  const [category, setCategory] = useState<'HYDRATION' | 'SLEEP' | 'ACTIVITY' | 'MINDFULNESS' | 'NUTRITION' | 'GENERAL'>('GENERAL');
  const [startDate, setStartDate] = useState(formatDateToYMD(new Date()));
  const [endDate, setEndDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadClients() {
      if (isClientSelfCreate || !tenantId || clientId) return;
      try {
        const snap = await getDocs(query(collection(db, 'tenants', tenantId, 'clients'), where('status', '==', 'ACTIVE')));
        const list = snap.docs.map(d => {
          const dt = d.data();
          return { id: d.id, name: `${dt.firstName || ''} ${dt.lastName || ''}`.trim() || 'Client' };
        });
        setClients(list);
        if (!selectedClientId && list.length > 0) setSelectedClientId(list[0].id);
      } catch (e) {
        console.warn('Could not fetch clients for habit dialog:', e);
      }
    }
    loadClients();
  }, [tenantId, clientId, isClientSelfCreate]);

  useEffect(() => {
    if (habitToEdit) {
      setSelectedClientId(habitToEdit.clientId);
      setName(habitToEdit.name);
      setDescription(habitToEdit.description || '');
      setType(habitToEdit.type);
      setTarget(habitToEdit.target);
      setUnit(habitToEdit.unit || 'times');
      setFrequency(habitToEdit.frequency);
      setWeekdays(habitToEdit.weekdays || [0, 1, 2, 3, 4, 5, 6]);
      setWeeklyTargetDays(habitToEdit.weeklyTargetDays || 5);
      setCategory(habitToEdit.category || 'GENERAL');
      setStartDate(habitToEdit.startDate);
      setEndDate(habitToEdit.endDate || '');
    } else {
      setName('');
      setDescription('');
      setType('BOOLEAN');
      setTarget(1);
      setUnit('times');
      setFrequency('DAILY');
      setWeekdays([0, 1, 2, 3, 4, 5, 6]);
      setWeeklyTargetDays(5);
      setCategory('GENERAL');
      setStartDate(formatDateToYMD(new Date()));
      setEndDate('');
      if (clientId) setSelectedClientId(clientId);
    }
  }, [habitToEdit, isOpen, clientId]);

  if (!isOpen) return null;

  const handleApplyPreset = (preset: typeof HABIT_PRESETS[0]) => {
    setName(preset.name);
    setDescription(preset.description);
    setType(preset.type);
    setTarget(preset.target);
    setUnit(preset.unit);
    setCategory(preset.category);
  };

  const toggleWeekday = (dayIdx: number) => {
    if (weekdays.includes(dayIdx)) {
      if (weekdays.length > 1) {
        setWeekdays(weekdays.filter(d => d !== dayIdx));
      }
    } else {
      setWeekdays([...weekdays, dayIdx].sort());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveClientId = clientId || selectedClientId;
    if (!effectiveClientId || !name.trim()) return;

    setIsSubmitting(true);
    try {
      const creatorName = profile ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim() : 'User';
      const ownership: HabitOwnership = isClientSelfCreate ? 'CLIENT_PERSONAL' : 'COACH_ASSIGNED';

      const habitData = {
        clientId: effectiveClientId,
        clientName: clientName || clients.find(c => c.id === effectiveClientId)?.name,
        name: name.trim(),
        description: description.trim(),
        type,
        target: type === 'BOOLEAN' ? 1 : Number(target) || 1,
        unit: type === 'BOOLEAN' ? 'times' : unit.trim(),
        frequency,
        weekdays: frequency === 'SPECIFIC_DAYS' ? weekdays : undefined,
        weeklyTargetDays: frequency === 'WEEKLY_TARGET' ? Number(weeklyTargetDays) || 5 : undefined,
        category,
        startDate,
        endDate: endDate.trim() ? endDate : undefined,
        status: 'ACTIVE' as const,
        ownership
      };

      if (habitToEdit) {
        await updateHabit(tenantId, habitToEdit.id, habitData);
        onSaved({ ...habitToEdit, ...habitData, updatedAt: new Date().toISOString() });
      } else {
        const created = await createHabit(
          tenantId,
          habitData,
          user?.uid || 'user',
          creatorName
        );
        onSaved(created);
      }
      onClose();
    } catch (err: any) {
      console.error('Failed to save habit:', err);
      alert('Error saving habit: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg my-8 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {habitToEdit ? 'Edit Habit' : isClientSelfCreate ? 'Create Personal Habit' : 'Assign Client Habit'}
              </h2>
              <p className="text-xs text-muted-foreground">
                Build daily consistency with target metrics and tracking
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Quick Presets for New Habits */}
          {!habitToEdit && (
            <div className="p-3.5 rounded-xl bg-accent/40 border border-border/80 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-primary uppercase">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Habit Presets</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {HABIT_PRESETS.map((p, idx) => {
                  const Icon = p.icon;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleApplyPreset(p)}
                      className="text-left p-2 rounded-lg bg-card/90 hover:bg-card border border-border text-xs flex items-center gap-2 transition-all hover:border-primary/40"
                    >
                      <Icon className="w-4 h-4 text-primary shrink-0" />
                      <span className="font-medium text-foreground truncate">{p.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Client Selection (if coach view and no preselected client) */}
          {!isClientSelfCreate && !clientId && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Target Client *
              </label>
              <select
                required
                value={selectedClientId}
                onChange={e => setSelectedClientId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {clients.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Habit Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Habit Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. 10,000 Daily Steps"
              className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Description / Notes
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Instructions or motivation for this habit..."
              className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Type & Target */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Habit Type
              </label>
              <select
                value={type}
                onChange={e => {
                  const newType = e.target.value as HabitType;
                  setType(newType);
                  if (newType === 'BOOLEAN') {
                    setTarget(1);
                    setUnit('times');
                  }
                }}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="BOOLEAN">Yes/No (Done)</option>
                <option value="COUNT">Count / Reps</option>
                <option value="DURATION">Duration (Time)</option>
                <option value="QUANTITY">Quantity (L/g)</option>
              </select>
            </div>

            {type !== 'BOOLEAN' && (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Target Goal
                  </label>
                  <input
                    type="number"
                    min={0.1}
                    step="any"
                    value={target}
                    onChange={e => setTarget(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Unit
                  </label>
                  <input
                    type="text"
                    value={unit}
                    onChange={e => setUnit(e.target.value)}
                    placeholder="steps, min, L, g"
                    className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </>
            )}
          </div>

          {/* Frequency & Days */}
          <div className="space-y-2 pt-2 border-t border-border">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Schedule Frequency
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setFrequency('DAILY')}
                className={`py-2 px-3 rounded-lg border text-xs font-semibold transition-all ${
                  frequency === 'DAILY'
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card border-border text-foreground hover:bg-accent'
                }`}
              >
                Daily
              </button>
              <button
                type="button"
                onClick={() => setFrequency('SPECIFIC_DAYS')}
                className={`py-2 px-3 rounded-lg border text-xs font-semibold transition-all ${
                  frequency === 'SPECIFIC_DAYS'
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card border-border text-foreground hover:bg-accent'
                }`}
              >
                Specific Days
              </button>
              <button
                type="button"
                onClick={() => setFrequency('WEEKLY_TARGET')}
                className={`py-2 px-3 rounded-lg border text-xs font-semibold transition-all ${
                  frequency === 'WEEKLY_TARGET'
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card border-border text-foreground hover:bg-accent'
                }`}
              >
                X Days / Week
              </button>
            </div>

            {frequency === 'SPECIFIC_DAYS' && (
              <div className="flex gap-1.5 pt-2">
                {WEEKDAY_NAMES.map((d, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleWeekday(i)}
                    className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all ${
                      weekdays.includes(i)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-accent'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            )}

            {frequency === 'WEEKLY_TARGET' && (
              <div className="flex items-center gap-3 pt-2">
                <span className="text-xs text-muted-foreground">Target days per week:</span>
                <select
                  value={weeklyTargetDays}
                  onChange={e => setWeeklyTargetDays(parseInt(e.target.value) || 5)}
                  className="px-3 py-1.5 rounded-lg bg-background border border-border text-xs text-foreground"
                >
                  {[1, 2, 3, 4, 5, 6, 7].map(n => (
                    <option key={n} value={n}>
                      {n} Day{n > 1 ? 's' : ''} a week
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Category & Start Date */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Category
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as any)}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-xs text-foreground"
              >
                <option value="GENERAL">General</option>
                <option value="ACTIVITY">Activity & Steps</option>
                <option value="HYDRATION">Hydration</option>
                <option value="NUTRITION">Nutrition</option>
                <option value="SLEEP">Sleep & Rest</option>
                <option value="MINDFULNESS">Mindfulness & Mobility</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Start Date
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-xs text-foreground"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Button variant="ghost" type="button" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !name.trim()}>
              {isSubmitting ? 'Saving...' : habitToEdit ? 'Update Habit' : 'Create Habit'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
