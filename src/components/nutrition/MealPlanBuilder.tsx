import React, { useState, useEffect } from 'react';
import {
  Utensils,
  Plus,
  Trash2,
  Copy,
  ChevronDown,
  ChevronUp,
  Flame,
  Scale,
  Droplets,
  AlertTriangle,
  Check,
  ArrowLeft,
  Search,
  X,
  Sparkles,
  Clock,
  Layers,
  Save
} from 'lucide-react';
import { 
  MealPlan, 
  MealPlanDay, 
  PlanMeal, 
  PlanMealItem, 
  MealType, 
  ServingUnit, 
  Food, 
  PlanStatus 
} from '../../types/nutrition';
import { 
  calculateItemNutrition, 
  calculateMealTotals, 
  calculateDayTotals,
  createMealPlan,
  updateMealPlan,
  fetchMealPlanById
} from '../../lib/nutritionService';
import { FoodLibraryView } from './FoodLibraryView';

interface MealPlanBuilderProps {
  tenantId: string;
  planId?: string | null;
  onBack: () => void;
  onSaved: (plan: MealPlan) => void;
}

const DEFAULT_MEAL_TYPES: { type: MealType; label: string; defaultTime: string }[] = [
  { type: 'BREAKFAST', label: 'Breakfast', defaultTime: '08:00 AM' },
  { type: 'MORNING_SNACK', label: 'Morning Snack', defaultTime: '10:30 AM' },
  { type: 'LUNCH', label: 'Lunch', defaultTime: '01:00 PM' },
  { type: 'AFTERNOON_SNACK', label: 'Afternoon Snack', defaultTime: '04:00 PM' },
  { type: 'DINNER', label: 'Dinner', defaultTime: '07:30 PM' },
  { type: 'POST_WORKOUT', label: 'Post-Workout Fuel', defaultTime: '05:30 PM' },
  { type: 'CUSTOM', label: 'Custom Meal', defaultTime: '12:00 PM' }
];

export function MealPlanBuilder({
  tenantId,
  planId,
  onBack,
  onSaved
}: MealPlanBuilderProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [durationDays, setDurationDays] = useState(7);
  const [dailyCalorieTarget, setDailyCalorieTarget] = useState(2000);
  const [proteinTarget, setProteinTarget] = useState(150);
  const [carbsTarget, setCarbsTarget] = useState(200);
  const [fatTarget, setFatTarget] = useState(65);
  const [waterTargetMl, setWaterTargetMl] = useState(2500);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<PlanStatus>('ACTIVE');

  // Days & Meals State
  const [days, setDays] = useState<MealPlanDay[]>([
    {
      id: `day_${Date.now()}_1`,
      dayNumber: 1,
      name: 'Day 1 - High Energy',
      meals: [
        {
          id: `meal_${Date.now()}_1`,
          name: 'Breakfast',
          type: 'BREAKFAST',
          time: '08:00 AM',
          items: [],
          totalCalories: 0,
          totalProtein: 0,
          totalCarbs: 0,
          totalFat: 0
        },
        {
          id: `meal_${Date.now()}_2`,
          name: 'Lunch',
          type: 'LUNCH',
          time: '01:00 PM',
          items: [],
          totalCalories: 0,
          totalProtein: 0,
          totalCarbs: 0,
          totalFat: 0
        },
        {
          id: `meal_${Date.now()}_3`,
          name: 'Dinner',
          type: 'DINNER',
          time: '07:30 PM',
          items: [],
          totalCalories: 0,
          totalProtein: 0,
          totalCarbs: 0,
          totalFat: 0
        }
      ],
      totalCalories: 0,
      totalProtein: 0,
      totalCarbs: 0,
      totalFat: 0
    }
  ]);

  const [activeDayIndex, setActiveDayIndex] = useState(0);

  // Food Picker State
  const [foodPickerTarget, setFoodPickerTarget] = useState<{
    dayIndex: number;
    mealIndex: number;
  } | null>(null);

  useEffect(() => {
    if (planId) {
      loadPlan(planId);
    }
  }, [planId, tenantId]);

  const loadPlan = async (id: string) => {
    setLoading(true);
    try {
      const p = await fetchMealPlanById(tenantId, id);
      if (p) {
        setName(p.name);
        setDescription(p.description || '');
        setDurationDays(p.durationDays || 7);
        setDailyCalorieTarget(p.dailyCalorieTarget || 2000);
        setProteinTarget(p.proteinTarget || 150);
        setCarbsTarget(p.carbsTarget || 200);
        setFatTarget(p.fatTarget || 65);
        setWaterTargetMl(p.waterTargetMl || 2500);
        setNotes(p.notes || '');
        setStatus(p.status || 'ACTIVE');
        if (p.days && p.days.length > 0) {
          setDays(p.days);
        }
      }
    } catch (err) {
      console.error('Error loading plan:', err);
    } finally {
      setLoading(false);
    }
  };

  // Recalculate totals for a day
  const recalculateDay = (day: MealPlanDay): MealPlanDay => {
    const updatedMeals = day.meals.map(m => {
      const totals = calculateMealTotals(m.items);
      return {
        ...m,
        totalCalories: totals.calories,
        totalProtein: totals.protein,
        totalCarbs: totals.carbs,
        totalFat: totals.fat,
        totalFiber: totals.fiber
      };
    });

    const dayTotals = calculateDayTotals(updatedMeals);
    return {
      ...day,
      meals: updatedMeals,
      totalCalories: dayTotals.calories,
      totalProtein: dayTotals.protein,
      totalCarbs: dayTotals.carbs,
      totalFat: dayTotals.fat,
      totalFiber: dayTotals.fiber
    };
  };

  // Day operations
  const handleAddDay = () => {
    const nextNumber = days.length + 1;
    const newDay: MealPlanDay = {
      id: `day_${Date.now()}_${nextNumber}`,
      dayNumber: nextNumber,
      name: `Day ${nextNumber}`,
      meals: [
        {
          id: `meal_${Date.now()}_1`,
          name: 'Breakfast',
          type: 'BREAKFAST',
          time: '08:00 AM',
          items: [],
          totalCalories: 0,
          totalProtein: 0,
          totalCarbs: 0,
          totalFat: 0
        },
        {
          id: `meal_${Date.now()}_2`,
          name: 'Lunch',
          type: 'LUNCH',
          time: '01:00 PM',
          items: [],
          totalCalories: 0,
          totalProtein: 0,
          totalCarbs: 0,
          totalFat: 0
        },
        {
          id: `meal_${Date.now()}_3`,
          name: 'Dinner',
          type: 'DINNER',
          time: '07:30 PM',
          items: [],
          totalCalories: 0,
          totalProtein: 0,
          totalCarbs: 0,
          totalFat: 0
        }
      ],
      totalCalories: 0,
      totalProtein: 0,
      totalCarbs: 0,
      totalFat: 0
    };

    setDays([...days, newDay]);
    setActiveDayIndex(days.length);
  };

  const handleDuplicateDay = (dayIdx: number) => {
    const source = days[dayIdx];
    const newNumber = days.length + 1;
    const clonedDay: MealPlanDay = {
      ...source,
      id: `day_${Date.now()}_${newNumber}`,
      dayNumber: newNumber,
      name: `${source.name} (Copy)`,
      meals: source.meals.map((m, mIdx) => ({
        ...m,
        id: `meal_${Date.now()}_${mIdx}`,
        items: m.items.map((it, iIdx) => ({
          ...it,
          id: `item_${Date.now()}_${mIdx}_${iIdx}`
        }))
      }))
    };

    setDays([...days, clonedDay]);
    setActiveDayIndex(days.length);
  };

  const handleDeleteDay = (dayIdx: number) => {
    if (days.length <= 1) {
      alert('A meal plan must contain at least one day.');
      return;
    }
    const filtered = days.filter((_, i) => i !== dayIdx);
    setDays(filtered);
    setActiveDayIndex(Math.max(0, dayIdx - 1));
  };

  // Meal operations
  const handleAddMealToActiveDay = (mealType: MealType = 'CUSTOM', defaultName: string = 'Meal') => {
    const updatedDays = [...days];
    const curDay = updatedDays[activeDayIndex];
    const newMeal: PlanMeal = {
      id: `meal_${Date.now()}`,
      name: defaultName,
      type: mealType,
      time: '12:00 PM',
      items: [],
      totalCalories: 0,
      totalProtein: 0,
      totalCarbs: 0,
      totalFat: 0
    };

    curDay.meals.push(newMeal);
    updatedDays[activeDayIndex] = recalculateDay(curDay);
    setDays(updatedDays);
  };

  const handleDuplicateMeal = (mealIdx: number) => {
    const updatedDays = [...days];
    const curDay = updatedDays[activeDayIndex];
    const source = curDay.meals[mealIdx];
    const clonedMeal: PlanMeal = {
      ...source,
      id: `meal_${Date.now()}`,
      name: `${source.name} (Copy)`,
      items: source.items.map((it, idx) => ({
        ...it,
        id: `item_${Date.now()}_${idx}`
      }))
    };

    curDay.meals.splice(mealIdx + 1, 0, clonedMeal);
    updatedDays[activeDayIndex] = recalculateDay(curDay);
    setDays(updatedDays);
  };

  const handleDeleteMeal = (mealIdx: number) => {
    const updatedDays = [...days];
    const curDay = updatedDays[activeDayIndex];
    curDay.meals.splice(mealIdx, 1);
    updatedDays[activeDayIndex] = recalculateDay(curDay);
    setDays(updatedDays);
  };

  // Food Item Selection into Meal
  const handleSelectFood = (food: Food) => {
    if (!foodPickerTarget) return;
    const { dayIndex, mealIndex } = foodPickerTarget;

    const updatedDays = [...days];
    const targetDay = updatedDays[dayIndex];
    const targetMeal = targetDay.meals[mealIndex];

    const defaultQty = food.servingSize || 100;
    const defaultUnit = food.servingUnit || 'g';
    const computed = calculateItemNutrition(food, defaultQty, defaultUnit);

    const newItem: PlanMealItem = {
      id: `item_${Date.now()}`,
      type: 'FOOD',
      referenceId: food.id,
      name: food.name,
      quantity: defaultQty,
      unit: defaultUnit,
      calories: computed.calories,
      protein: computed.protein,
      carbs: computed.carbs,
      fat: computed.fat,
      fiber: computed.fiber
    };

    targetMeal.items.push(newItem);
    updatedDays[dayIndex] = recalculateDay(targetDay);
    setDays(updatedDays);
    setFoodPickerTarget(null);
  };

  // Modify Item Quantity / Unit
  const handleUpdateItemQuantity = (
    dayIdx: number,
    mealIdx: number,
    itemIdx: number,
    newQuantity: number,
    basisFood?: Food
  ) => {
    const safeQty = Math.max(0, newQuantity);
    const updatedDays = [...days];
    const targetDay = updatedDays[dayIdx];
    const targetMeal = targetDay.meals[mealIdx];
    const item = targetMeal.items[itemIdx];

    // Compute proportionally
    const ratio = item.quantity > 0 ? safeQty / item.quantity : 1;
    item.quantity = safeQty;
    item.calories = Math.round(item.calories * ratio);
    item.protein = Math.round(item.protein * ratio * 10) / 10;
    item.carbs = Math.round(item.carbs * ratio * 10) / 10;
    item.fat = Math.round(item.fat * ratio * 10) / 10;

    updatedDays[dayIdx] = recalculateDay(targetDay);
    setDays(updatedDays);
  };

  const handleDeleteItem = (dayIdx: number, mealIdx: number, itemIdx: number) => {
    const updatedDays = [...days];
    const targetDay = updatedDays[dayIdx];
    targetDay.meals[mealIdx].items.splice(itemIdx, 1);
    updatedDays[dayIdx] = recalculateDay(targetDay);
    setDays(updatedDays);
  };

  // Save Plan
  const handleSave = async () => {
    if (!name.trim()) {
      alert('Please enter a meal plan name.');
      return;
    }

    setSaving(true);
    setSaveSuccess(false);
    try {
      let savedResult: MealPlan;
      if (planId) {
        await updateMealPlan(tenantId, planId, {
          name: name.trim(),
          description,
          durationDays,
          dailyCalorieTarget: Number(dailyCalorieTarget),
          proteinTarget: Number(proteinTarget),
          carbsTarget: Number(carbsTarget),
          fatTarget: Number(fatTarget),
          waterTargetMl: Number(waterTargetMl),
          notes,
          status,
          days
        });
        savedResult = {
          id: planId,
          tenantId,
          name: name.trim(),
          description,
          durationDays,
          dailyCalorieTarget,
          proteinTarget,
          carbsTarget,
          fatTarget,
          waterTargetMl,
          notes,
          status,
          days,
          version: 2,
          createdAt: new Date().toISOString()
        };
      } else {
        savedResult = await createMealPlan(tenantId, {
          name: name.trim(),
          description,
          durationDays,
          dailyCalorieTarget: Number(dailyCalorieTarget),
          proteinTarget: Number(proteinTarget),
          carbsTarget: Number(carbsTarget),
          fatTarget: Number(fatTarget),
          waterTargetMl: Number(waterTargetMl),
          notes,
          status,
          days
        });
      }

      setSaveSuccess(true);
      setTimeout(() => {
        onSaved(savedResult);
      }, 600);
    } catch (err: any) {
      alert(err.message || 'Failed to save meal plan.');
    } finally {
      setSaving(false);
    }
  };

  // Warnings
  const warnings: string[] = [];
  if (!dailyCalorieTarget || dailyCalorieTarget <= 0) {
    warnings.push('Daily calorie target is not set.');
  }
  if (!proteinTarget || proteinTarget <= 0) {
    warnings.push('Protein target is missing.');
  }
  if (days.some(d => d.meals.length === 0)) {
    warnings.push('One or more days have no meals configured.');
  }

  const activeDay = days[activeDayIndex] || days[0];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-display font-bold tracking-tight flex items-center gap-2">
              <Utensils className="w-5 h-5 text-primary" />
              {planId ? 'Edit Nutrition Plan' : 'Create Nutrition Plan'}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Design daily meal schedules, macro allocations, and portion prescriptions.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as PlanStatus)}
            className="bg-background border border-border rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="ACTIVE">ACTIVE PLAN</option>
            <option value="DRAFT">DRAFT</option>
            <option value="ARCHIVED">ARCHIVED</option>
          </select>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-5 py-2 rounded-lg text-sm transition shadow-sm disabled:opacity-50"
          >
            {saveSuccess ? (
              <>
                <Check className="w-4 h-4" />
                Saved!
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Plan'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Warnings Panel */}
      {warnings.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-300 p-3 rounded-xl flex items-start gap-2 text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
          <div>
            <span className="font-semibold">Coach Attention: </span>
            {warnings.join(' ')}
          </div>
        </div>
      )}

      {/* Plan Primary Details Panel */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold tracking-tight text-foreground uppercase text-muted-foreground text-[11px]">
          Plan Overview & Macro Targets
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Plan Name *</label>
            <input
              type="text"
              placeholder="e.g. Hypertrophy Lean Bulk (Phase 1)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Duration (Days)</label>
            <input
              type="number"
              min="1"
              max="365"
              value={durationDays}
              onChange={(e) => setDurationDays(Number(e.target.value))}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {/* Target Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2 border-t border-border">
          <div className="space-y-1 bg-background border border-border rounded-lg p-2.5 text-center">
            <label className="text-[10px] text-muted-foreground font-semibold uppercase flex items-center justify-center gap-1">
              <Flame className="w-3 h-3 text-primary" /> Daily Calories
            </label>
            <div className="flex items-baseline justify-center gap-1">
              <input
                type="number"
                min="0"
                value={dailyCalorieTarget}
                onChange={(e) => setDailyCalorieTarget(Number(e.target.value))}
                className="w-20 bg-transparent text-center font-bold text-lg font-display text-primary focus:outline-none border-b border-primary/40"
              />
              <span className="text-xs text-muted-foreground">kcal</span>
            </div>
          </div>

          <div className="space-y-1 bg-background border border-border rounded-lg p-2.5 text-center">
            <label className="text-[10px] text-muted-foreground font-semibold uppercase">Protein</label>
            <div className="flex items-baseline justify-center gap-1">
              <input
                type="number"
                min="0"
                value={proteinTarget}
                onChange={(e) => setProteinTarget(Number(e.target.value))}
                className="w-16 bg-transparent text-center font-bold text-lg font-display text-foreground focus:outline-none border-b border-border"
              />
              <span className="text-xs text-muted-foreground">g</span>
            </div>
          </div>

          <div className="space-y-1 bg-background border border-border rounded-lg p-2.5 text-center">
            <label className="text-[10px] text-muted-foreground font-semibold uppercase">Carbs</label>
            <div className="flex items-baseline justify-center gap-1">
              <input
                type="number"
                min="0"
                value={carbsTarget}
                onChange={(e) => setCarbsTarget(Number(e.target.value))}
                className="w-16 bg-transparent text-center font-bold text-lg font-display text-emerald-400 focus:outline-none border-b border-emerald-500/40"
              />
              <span className="text-xs text-muted-foreground">g</span>
            </div>
          </div>

          <div className="space-y-1 bg-background border border-border rounded-lg p-2.5 text-center">
            <label className="text-[10px] text-muted-foreground font-semibold uppercase">Fat</label>
            <div className="flex items-baseline justify-center gap-1">
              <input
                type="number"
                min="0"
                value={fatTarget}
                onChange={(e) => setFatTarget(Number(e.target.value))}
                className="w-16 bg-transparent text-center font-bold text-lg font-display text-amber-400 focus:outline-none border-b border-amber-500/40"
              />
              <span className="text-xs text-muted-foreground">g</span>
            </div>
          </div>

          <div className="space-y-1 bg-background border border-border rounded-lg p-2.5 text-center col-span-2 sm:col-span-1">
            <label className="text-[10px] text-muted-foreground font-semibold uppercase flex items-center justify-center gap-1">
              <Droplets className="w-3 h-3 text-blue-400" /> Water Target
            </label>
            <div className="flex items-baseline justify-center gap-1">
              <input
                type="number"
                min="0"
                step="100"
                value={waterTargetMl}
                onChange={(e) => setWaterTargetMl(Number(e.target.value))}
                className="w-20 bg-transparent text-center font-bold text-lg font-display text-blue-400 focus:outline-none border-b border-blue-500/40"
              />
              <span className="text-xs text-muted-foreground">ml</span>
            </div>
          </div>
        </div>
      </div>

      {/* Day Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-border">
        {days.map((day, idx) => (
          <div key={day.id} className="flex items-center">
            <button
              onClick={() => setActiveDayIndex(idx)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-2 ${
                activeDayIndex === idx
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-card text-muted-foreground hover:bg-accent border border-border'
              }`}
            >
              <span>{day.name}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                activeDayIndex === idx ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-accent text-muted-foreground'
              }`}>
                {day.totalCalories} kcal
              </span>
            </button>
          </div>
        ))}

        <button
          onClick={handleAddDay}
          className="px-3 py-2 rounded-lg text-xs font-medium border border-dashed border-border hover:border-primary/50 text-muted-foreground hover:text-primary transition flex items-center gap-1.5 shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Day
        </button>
      </div>

      {/* Active Day Content */}
      {activeDay && (
        <div className="space-y-6">
          {/* Day Toolbar & Live Comparison */}
          <div className="bg-card border border-border rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={activeDay.name}
                onChange={(e) => {
                  const updatedDays = [...days];
                  updatedDays[activeDayIndex].name = e.target.value;
                  setDays(updatedDays);
                }}
                className="bg-background border border-border rounded-lg px-3 py-1.5 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <span className="text-xs text-muted-foreground">
                ({activeDay.meals.length} meals)
              </span>
            </div>

            {/* Target vs Actual Day Comparison */}
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-baseline gap-1">
                <span className="text-muted-foreground">Calories:</span>
                <span className={`font-bold ${
                  activeDay.totalCalories > dailyCalorieTarget * 1.1 
                    ? 'text-amber-400' 
                    : activeDay.totalCalories >= dailyCalorieTarget * 0.9 
                      ? 'text-primary' 
                      : 'text-muted-foreground'
                }`}>
                  {activeDay.totalCalories}
                </span>
                <span className="text-muted-foreground">/ {dailyCalorieTarget} kcal</span>
              </div>

              <div className="flex items-baseline gap-1">
                <span className="text-muted-foreground">Protein:</span>
                <span className="font-bold text-foreground">{activeDay.totalProtein}</span>
                <span className="text-muted-foreground">/ {proteinTarget}g</span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleDuplicateDay(activeDayIndex)}
                  className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition"
                  title="Duplicate this day"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDeleteDay(activeDayIndex)}
                  className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition"
                  title="Delete this day"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Meals List */}
          <div className="space-y-4">
            {activeDay.meals.map((meal, mealIdx) => (
              <div key={meal.id} className="bg-card border border-border rounded-xl p-4 space-y-3">
                {/* Meal Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={meal.name}
                      onChange={(e) => {
                        const updatedDays = [...days];
                        updatedDays[activeDayIndex].meals[mealIdx].name = e.target.value;
                        setDays(updatedDays);
                      }}
                      className="bg-background border border-border rounded-lg px-2.5 py-1 text-sm font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <input
                        type="text"
                        placeholder="Time"
                        value={meal.time || ''}
                        onChange={(e) => {
                          const updatedDays = [...days];
                          updatedDays[activeDayIndex].meals[mealIdx].time = e.target.value;
                          setDays(updatedDays);
                        }}
                        className="w-20 bg-transparent border-b border-border px-1 py-0.5 text-xs text-muted-foreground focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>

                  {/* Meal Totals & Actions */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-xs bg-background/80 px-2.5 py-1 rounded-lg border border-border">
                      <span className="font-bold text-primary">{meal.totalCalories} kcal</span>
                      <span className="text-muted-foreground">|</span>
                      <span>P: <strong className="text-foreground">{meal.totalProtein}g</strong></span>
                      <span>C: <strong className="text-emerald-400">{meal.totalCarbs}g</strong></span>
                      <span>F: <strong className="text-amber-400">{meal.totalFat}g</strong></span>
                    </div>

                    <button
                      onClick={() => handleDuplicateMeal(mealIdx)}
                      className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition"
                      title="Duplicate Meal"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteMeal(mealIdx)}
                      className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition"
                      title="Delete Meal"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Meal Items Table / List */}
                {meal.items.length === 0 ? (
                  <div className="py-4 text-center text-xs text-muted-foreground border border-dashed border-border rounded-lg">
                    No foods added to this meal yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {meal.items.map((item, itemIdx) => (
                      <div
                        key={item.id}
                        className="bg-background border border-border/80 rounded-lg p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-semibold text-foreground truncate">{item.name}</span>
                        </div>

                        <div className="flex items-center gap-3 flex-wrap">
                          {/* Quantity and Unit */}
                          <div className="flex items-center gap-1.5 bg-card px-2 py-1 rounded border border-border">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={item.quantity}
                              onChange={(e) => handleUpdateItemQuantity(activeDayIndex, mealIdx, itemIdx, Number(e.target.value))}
                              className="w-14 bg-transparent text-center font-semibold text-foreground focus:outline-none"
                            />
                            <span className="text-muted-foreground text-[10px]">{item.unit}</span>
                          </div>

                          {/* Calculated Nutrition */}
                          <div className="flex items-center gap-2 text-[11px]">
                            <span className="font-bold text-primary">{item.calories} kcal</span>
                            <span className="text-muted-foreground">P: {item.protein}g</span>
                            <span className="text-muted-foreground">C: {item.carbs}g</span>
                            <span className="text-muted-foreground">F: {item.fat}g</span>
                          </div>

                          <button
                            onClick={() => handleDeleteItem(activeDayIndex, mealIdx, itemIdx)}
                            className="p-1 text-muted-foreground hover:text-destructive transition"
                            title="Remove Food"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Food to this Meal button */}
                <button
                  onClick={() => setFoodPickerTarget({ dayIndex: activeDayIndex, mealIndex: mealIdx })}
                  className="w-full py-2 bg-background hover:bg-accent border border-dashed border-border hover:border-primary/50 text-xs font-medium text-muted-foreground hover:text-primary rounded-lg transition flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Food to {meal.name}
                </button>
              </div>
            ))}
          </div>

          {/* Quick Add Meal Presets */}
          <div className="flex items-center gap-2 flex-wrap pt-2">
            <span className="text-xs text-muted-foreground">Quick Add Meal:</span>
            {DEFAULT_MEAL_TYPES.map((preset) => (
              <button
                key={preset.type + preset.label}
                onClick={() => handleAddMealToActiveDay(preset.type, preset.label)}
                className="px-2.5 py-1 bg-card hover:bg-accent border border-border rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground transition"
              >
                + {preset.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Food Search / Selector Modal */}
      {foodPickerTarget && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-4xl max-h-[85vh] p-6 space-y-4 shadow-2xl relative flex flex-col">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold font-display text-foreground flex items-center gap-2">
                <Search className="w-4 h-4 text-primary" />
                Select Food to Add
              </h3>
              <button
                onClick={() => setFoodPickerTarget(null)}
                className="p-1 text-muted-foreground hover:text-foreground rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 pr-1">
              <FoodLibraryView
                tenantId={tenantId}
                isOwnerOrTrainer={false}
                selectionMode={true}
                onSelectFood={handleSelectFood}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
