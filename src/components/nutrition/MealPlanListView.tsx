import React, { useState, useEffect } from 'react';
import { 
  Utensils, 
  Plus, 
  Search, 
  Users, 
  Copy, 
  Edit3, 
  Archive, 
  Flame, 
  Droplets, 
  Clock, 
  MoreVertical,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { MealPlan, PlanStatus } from '../../types/nutrition';
import { 
  fetchMealPlans, 
  duplicateMealPlan, 
  updateMealPlan 
} from '../../lib/nutritionService';

interface MealPlanListViewProps {
  tenantId: string;
  isOwnerOrTrainer?: boolean;
  onCreateNew: () => void;
  onEditPlan: (planId: string) => void;
  onAssignPlan: (plan: MealPlan) => void;
}

export function MealPlanListView({
  tenantId,
  isOwnerOrTrainer = true,
  onCreateNew,
  onEditPlan,
  onAssignPlan
}: MealPlanListViewProps) {
  const [plans, setPlans] = useState<MealPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<PlanStatus | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const loadPlans = async () => {
    setLoading(true);
    try {
      const data = await fetchMealPlans(tenantId, {
        status: statusFilter,
        search: searchQuery
      });
      setPlans(data);
    } catch (err) {
      console.error('Failed to load meal plans:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadPlans();
    }, 200);
    return () => clearTimeout(timer);
  }, [tenantId, statusFilter, searchQuery]);

  const handleDuplicate = async (plan: MealPlan) => {
    setActionLoadingId(plan.id);
    try {
      await duplicateMealPlan(tenantId, plan.id);
      loadPlans();
    } catch (err) {
      console.error('Failed to duplicate plan:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleToggleArchive = async (plan: MealPlan) => {
    const nextStatus: PlanStatus = plan.status === 'ARCHIVED' ? 'ACTIVE' : 'ARCHIVED';
    setActionLoadingId(plan.id);
    try {
      await updateMealPlan(tenantId, plan.id, { status: nextStatus });
      loadPlans();
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-display font-bold tracking-tight flex items-center gap-2">
            <Utensils className="w-5 h-5 text-primary" />
            Meal Plans & Prescriptions
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Structured dietary protocols, macro targets, and meal scheduling.
          </p>
        </div>

        {isOwnerOrTrainer && (
          <button
            id="btn-create-meal-plan"
            onClick={onCreateNew}
            className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-4 py-2.5 rounded-lg transition text-sm shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Create Meal Plan
          </button>
        )}
      </div>

      {/* Filter Toolbar */}
      <div className="bg-card border border-border rounded-xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search meal plans..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-background border border-border rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-background border border-border rounded-lg p-1 w-full md:w-auto overflow-x-auto">
          {(['ALL', 'ACTIVE', 'DRAFT', 'ARCHIVED'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-accent text-primary font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {st === 'ALL' ? 'All Plans' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Plan Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-5 animate-pulse space-y-4">
              <div className="h-5 bg-accent/60 rounded w-3/4" />
              <div className="h-4 bg-accent/40 rounded w-1/2" />
              <div className="h-16 bg-accent/30 rounded w-full" />
            </div>
          ))}
        </div>
      ) : plans.length === 0 ? (
        <div className="bg-card border border-border border-dashed rounded-xl p-12 text-center space-y-3">
          <Utensils className="w-10 h-10 text-muted-foreground/40 mx-auto" />
          <h3 className="text-base font-semibold">No meal plans found</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            {searchQuery 
              ? `No meal plans match "${searchQuery}".`
              : 'Create your first structured nutrition plan for clients.'}
          </p>
          {isOwnerOrTrainer && (
            <button
              onClick={onCreateNew}
              className="inline-flex items-center gap-2 text-primary text-sm font-medium hover:underline pt-2"
            >
              <Plus className="w-4 h-4" />
              Build meal plan
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="bg-card border border-border rounded-xl p-5 flex flex-col justify-between hover:border-primary/40 transition space-y-4 shadow-sm group"
            >
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      plan.status === 'ACTIVE' 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : plan.status === 'DRAFT'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-muted text-muted-foreground border border-border'
                    }`}>
                      {plan.status}
                    </span>
                    <h3 className="text-base font-bold font-display text-foreground group-hover:text-primary transition mt-1.5 line-clamp-1">
                      {plan.name}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleDuplicate(plan)}
                      disabled={actionLoadingId === plan.id}
                      className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition"
                      title="Duplicate Plan"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    {isOwnerOrTrainer && (
                      <button
                        onClick={() => handleToggleArchive(plan)}
                        disabled={actionLoadingId === plan.id}
                        className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition"
                        title={plan.status === 'ARCHIVED' ? 'Restore Plan' : 'Archive Plan'}
                      >
                        <Archive className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {plan.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{plan.description}</p>
                )}

                {/* Macro Target Stats Box */}
                <div className="bg-background/80 border border-border rounded-lg p-3 space-y-2">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 text-primary" /> Daily Target
                    </span>
                    <span className="text-sm font-bold text-foreground font-display">
                      {plan.dailyCalorieTarget} <span className="text-xs font-normal text-muted-foreground">kcal</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-1 text-center text-xs pt-1 border-t border-border/50">
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Protein</span>
                      <span className="font-semibold text-primary">{plan.proteinTarget}g</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Carbs</span>
                      <span className="font-semibold text-emerald-400">{plan.carbsTarget}g</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Fat</span>
                      <span className="font-semibold text-amber-400">{plan.fatTarget}g</span>
                    </div>
                  </div>
                </div>

                {/* Meta details */}
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                  <span>{plan.days?.length || 1} day schedule</span>
                  <span>{plan.assignedClientCount || 0} active clients</span>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-border">
                <button
                  onClick={() => onEditPlan(plan.id)}
                  className="flex items-center justify-center gap-1.5 bg-accent hover:bg-accent/80 text-foreground text-xs font-medium py-2 rounded-lg transition"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Edit Plan
                </button>

                {isOwnerOrTrainer && (
                  <button
                    onClick={() => onAssignPlan(plan)}
                    className="flex items-center justify-center gap-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 text-xs font-semibold py-2 rounded-lg transition"
                  >
                    <Users className="w-3.5 h-3.5" />
                    Assign Client
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
