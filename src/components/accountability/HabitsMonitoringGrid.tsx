import React, { useState } from 'react';
import {
  Target,
  Plus,
  Flame,
  CheckCircle2,
  Clock,
  Droplets,
  Footprints,
  Moon,
  Apple,
  Search,
  Filter,
  MoreVertical,
  Edit2,
  Archive,
  User
} from 'lucide-react';
import { Habit, HabitLog } from '../../types/accountability';
import { Button } from '../ui/button';
import { archiveHabit } from '../../lib/accountabilityService';

interface HabitsMonitoringGridProps {
  tenantId: string;
  habits: Habit[];
  clients: Array<{ id: string; name: string }>;
  loading: boolean;
  onOpenAssignModal: (clientId?: string) => void;
  onEditHabit: (habit: Habit) => void;
  onRefresh: () => void;
}

export function HabitsMonitoringGrid({
  tenantId,
  habits,
  clients,
  loading,
  onOpenAssignModal,
  onEditHabit,
  onRefresh
}: HabitsMonitoringGridProps) {
  const [selectedClientFilter, setSelectedClientFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredHabits = habits.filter(h => {
    if (selectedClientFilter !== 'ALL' && h.clientId !== selectedClientFilter) return false;
    if (categoryFilter !== 'ALL' && (h.category || 'GENERAL') !== categoryFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = h.name.toLowerCase().includes(q);
      const matchClient = (h.clientName || '').toLowerCase().includes(q);
      return matchName || matchClient;
    }
    return true;
  });

  const handleArchive = async (habitId: string) => {
    if (!confirm('Are you sure you want to archive this habit?')) return;
    try {
      await archiveHabit(tenantId, habitId);
      onRefresh();
    } catch (e) {
      console.error('Failed to archive habit:', e);
    }
  };

  const getCategoryIcon = (category?: string) => {
    switch (category) {
      case 'HYDRATION': return Droplets;
      case 'ACTIVITY': return Footprints;
      case 'SLEEP': return Moon;
      case 'NUTRITION': return Apple;
      case 'MINDFULNESS': return Flame;
      default: return Target;
    }
  };

  return (
    <div className="space-y-4">
      {/* Control Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border">
        <div className="flex flex-wrap items-center gap-2">
          {/* Client Filter */}
          <select
            value={selectedClientFilter}
            onChange={e => setSelectedClientFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="ALL">All Clients ({clients.length})</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="ALL">All Categories</option>
            <option value="ACTIVITY">Activity & Steps</option>
            <option value="HYDRATION">Hydration</option>
            <option value="NUTRITION">Nutrition</option>
            <option value="SLEEP">Sleep & Rest</option>
            <option value="MINDFULNESS">Mindfulness</option>
            <option value="GENERAL">General</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search habits..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <Button size="sm" onClick={() => onOpenAssignModal()} className="gap-1.5 text-xs">
            <Plus className="w-3.5 h-3.5" />
            <span>Assign Habit</span>
          </Button>
        </div>
      </div>

      {/* Grid of Habits */}
      {loading ? (
        <div className="py-16 text-center text-sm text-muted-foreground animate-pulse">
          Loading client habits...
        </div>
      ) : filteredHabits.length === 0 ? (
        <div className="py-16 text-center bg-card rounded-xl border border-dashed border-border p-8 space-y-3">
          <Target className="w-10 h-10 text-muted-foreground mx-auto opacity-40" />
          <h3 className="text-base font-semibold text-foreground">No Habits Found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Assign accountability habits (hydration, daily steps, sleep, nutrition adherence) to your clients.
          </p>
          <Button onClick={() => onOpenAssignModal()} size="sm" className="mt-2">
            Assign First Habit
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredHabits.map(habit => {
            const Icon = getCategoryIcon(habit.category);
            const isPersonal = habit.ownership === 'CLIENT_PERSONAL';

            return (
              <div
                key={habit.id}
                className="p-4 rounded-xl bg-card border border-border hover:border-primary/40 transition-all flex flex-col justify-between space-y-3"
              >
                <div>
                  {/* Top Bar: Icon + Client Badge + Actions */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-semibold text-foreground truncate block">
                          {habit.name}
                        </span>
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <User className="w-3 h-3 text-muted-foreground/70" />
                          <span className="font-medium text-foreground/80">{habit.clientName || 'Athlete'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onEditHabit(habit)}
                        className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
                        title="Edit Habit"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleArchive(habit.id)}
                        className="p-1 rounded text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                        title="Archive Habit"
                      >
                        <Archive className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Habit Target & Description */}
                  <div className="mt-3 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-accent text-accent-foreground font-semibold">
                        {habit.type === 'BOOLEAN'
                          ? 'Daily Target'
                          : `Target: ${habit.target} ${habit.unit || ''}`}
                      </span>
                      <span className="text-[11px] text-muted-foreground capitalize">
                        {habit.frequency.replace('_', ' ').toLowerCase()}
                      </span>
                    </div>

                    {habit.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 pt-1">
                        {habit.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Footer Badges */}
                <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Started {habit.startDate}</span>
                  <span className={`px-2 py-0.5 rounded-full font-medium ${
                    isPersonal ? 'bg-sky-500/10 text-sky-400' : 'bg-primary/10 text-primary'
                  }`}>
                    {isPersonal ? 'Client Created' : 'Coach Assigned'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
