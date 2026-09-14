import React, { useState, useEffect } from 'react';
import { 
  Utensils, 
  Flame, 
  Droplets, 
  Calendar, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  Edit2, 
  BookOpen,
  Clock,
  Sparkles
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useTenantStore } from '../store/tenantStore';
import { useSearchParams } from 'react-router-dom';
import { 
  DailyNutritionSummary, 
  FoodLogEntry, 
  MealType, 
  NutritionAssignment 
} from '../types/nutrition';
import { 
  fetchClientDailyNutritionSummary, 
  fetchClientActiveAssignment, 
  deleteFoodLogEntry 
} from '../lib/nutritionService';
import { FoodLogModal } from '../components/nutrition/FoodLogModal';
import { WaterTrackerWidget } from '../components/nutrition/WaterTrackerWidget';
import { RecipeBuilder } from '../components/nutrition/RecipeBuilder';

type ClientNutritionSubTab = 'DIARY' | 'PLAN' | 'RECIPES';

export function ClientNutritionPage() {
  const [searchParams] = useSearchParams();
  const { user, profile } = useAuthStore();
  const { tenantId: storeTenantId, memberData } = useTenantStore();
  const tenantId = storeTenantId || profile?.tenantId || '';
  
  const previewClientId = searchParams.get('asClientId');
  const clientId = previewClientId || memberData?.clientId || profile?.clientId || user?.uid || '';

  const [activeSubTab, setActiveSubTab] = useState<ClientNutritionSubTab>('DIARY');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [summary, setSummary] = useState<DailyNutritionSummary | null>(null);
  const [activeAssignment, setActiveAssignment] = useState<NutritionAssignment | null>(null);
  const [loading, setLoading] = useState(true);

  // Food log modal
  const [showLogModal, setShowLogModal] = useState(false);
  const [modalMealType, setModalMealType] = useState<MealType>('BREAKFAST');
  const [editingEntry, setEditingEntry] = useState<FoodLogEntry | null>(null);

  const loadData = async () => {
    if (!tenantId || !clientId) return;
    setLoading(true);
    try {
      const [sum, assign] = await Promise.all([
        fetchClientDailyNutritionSummary(tenantId, clientId, selectedDate),
        fetchClientActiveAssignment(tenantId, clientId)
      ]);
      setSummary(sum);
      setActiveAssignment(assign);
    } catch (err) {
      console.error('Failed to load client nutrition diary:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [tenantId, clientId, selectedDate]);

  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleToday = () => {
    setSelectedDate(new Date().toISOString().split('T')[0]);
  };

  const handleDeleteEntry = async (entry: FoodLogEntry) => {
    if (window.confirm(`Remove "${entry.foodNameSnapshot}" from log?`)) {
      try {
        await deleteFoodLogEntry(tenantId, clientId, entry.id);
        loadData();
      } catch (err) {
        console.error('Failed to delete log:', err);
      }
    }
  };

  const handleOpenAdd = (mType: MealType) => {
    setEditingEntry(null);
    setModalMealType(mType);
    setShowLogModal(true);
  };

  const handleOpenEdit = (entry: FoodLogEntry) => {
    setEditingEntry(entry);
    setModalMealType(entry.mealType);
    setShowLogModal(true);
  };

  const targetCal = summary?.targets.dailyCalorieTarget || 2000;
  const currentCal = summary?.totalCalories || 0;
  const calPercent = Math.min(100, Math.round((currentCal / targetCal) * 100));

  const targetP = summary?.targets.proteinTarget || 150;
  const currentP = summary?.totalProtein || 0;
  const pPercent = Math.min(100, Math.round((currentP / Math.max(1, targetP)) * 100));

  const targetC = summary?.targets.carbsTarget || 200;
  const currentC = summary?.totalCarbs || 0;
  const cPercent = Math.min(100, Math.round((currentC / Math.max(1, targetC)) * 100));

  const targetF = summary?.targets.fatTarget || 65;
  const currentF = summary?.totalFat || 0;
  const fPercent = Math.min(100, Math.round((currentF / Math.max(1, targetF)) * 100));

  const mealSections: { type: MealType; title: string }[] = [
    { type: 'BREAKFAST', title: 'Breakfast' },
    { type: 'MORNING_SNACK', title: 'Morning Snack' },
    { type: 'LUNCH', title: 'Lunch' },
    { type: 'AFTERNOON_SNACK', title: 'Afternoon Snack' },
    { type: 'DINNER', title: 'Dinner' },
    { type: 'POST_WORKOUT', title: 'Post-Workout Fuel' },
    { type: 'SNACK', title: 'Snack' }
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-display font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Utensils className="w-6 h-6 text-primary" />
            Nutrition & Daily Fuel
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Track daily meals, hit your coach macro targets, and stay hydrated.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-card border border-border rounded-xl p-1">
          <button
            onClick={() => setActiveSubTab('DIARY')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeSubTab === 'DIARY'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Daily Diary
          </button>
          <button
            onClick={() => setActiveSubTab('PLAN')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeSubTab === 'PLAN'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Assigned Meal Plan
          </button>
          <button
            onClick={() => setActiveSubTab('RECIPES')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeSubTab === 'RECIPES'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Recipes
          </button>
        </div>
      </div>

      {activeSubTab === 'DIARY' ? (
        <div className="space-y-6">
          {/* Active Target Banner */}
          {activeAssignment && (
            <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Utensils className="w-5 h-5 text-primary" />
                <div>
                  <span className="text-xs font-semibold text-primary">Active Plan Protocol:</span>
                  <p className="text-sm font-bold text-foreground">{activeAssignment.planName}</p>
                </div>
              </div>
              <div className="text-right text-xs">
                <span className="text-muted-foreground">Target: </span>
                <span className="font-bold text-foreground">
                  {activeAssignment.customCalorieTarget || activeAssignment.planSnapshot?.dailyCalorieTarget} kcal
                </span>
              </div>
            </div>
          )}

          {/* Date Selector Bar */}
          <div className="bg-card border border-border rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevDay}
                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition"
                title="Previous Day"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-background border border-border rounded-lg px-2.5 py-1 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <button
                onClick={handleNextDay}
                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition"
                title="Next Day"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={handleToday}
              className="text-xs font-medium bg-accent hover:bg-accent/80 text-foreground px-3 py-1 rounded-lg transition"
            >
              Today
            </button>
          </div>

          {/* Macro Rings / Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-card border border-border rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-primary" /> Calories
                </span>
                <span className="text-xs font-bold text-primary font-display">{currentCal} / {targetCal}</span>
              </div>
              <div className="h-2 w-full bg-background rounded-full overflow-hidden border border-border">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${calPercent}%` }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground text-right">{calPercent}% of target</p>
            </div>

            <div className="bg-card border border-border rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-semibold">Protein</span>
                <span className="text-xs font-bold text-foreground">{currentP}g / {targetP}g</span>
              </div>
              <div className="h-2 w-full bg-background rounded-full overflow-hidden border border-border">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${pPercent}%` }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground text-right">{pPercent}% reached</p>
            </div>

            <div className="bg-card border border-border rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-semibold">Carbs</span>
                <span className="text-xs font-bold text-emerald-400">{currentC}g / {targetC}g</span>
              </div>
              <div className="h-2 w-full bg-background rounded-full overflow-hidden border border-border">
                <div
                  className="h-full bg-emerald-400 rounded-full transition-all duration-300"
                  style={{ width: `${cPercent}%` }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground text-right">{cPercent}% reached</p>
            </div>

            <div className="bg-card border border-border rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-semibold">Fats</span>
                <span className="text-xs font-bold text-amber-400">{currentF}g / {targetF}g</span>
              </div>
              <div className="h-2 w-full bg-background rounded-full overflow-hidden border border-border">
                <div
                  className="h-full bg-amber-400 rounded-full transition-all duration-300"
                  style={{ width: `${fPercent}%` }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground text-right">{fPercent}% reached</p>
            </div>
          </div>

          {/* Meals List + Hydration */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground text-[11px]">
                Meal Logs ({selectedDate})
              </h3>

              {mealSections.map(({ type, title }) => {
                const data = summary?.mealBreakdown[type] || { calories: 0, protein: 0, carbs: 0, fat: 0, entries: [] };
                const hasEntries = data.entries.length > 0;

                return (
                  <div key={type} className="bg-card border border-border rounded-xl p-4 space-y-3 shadow-sm">
                    <div className="flex items-center justify-between border-b border-border pb-2.5">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold font-display text-foreground">{title}</h4>
                        {hasEntries && (
                          <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded">
                            {data.calories} kcal
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        {hasEntries && (
                          <div className="text-[11px] text-muted-foreground hidden sm:flex items-center gap-2">
                            <span>P: <strong>{data.protein}g</strong></span>
                            <span>C: <strong className="text-emerald-400">{data.carbs}g</strong></span>
                            <span>F: <strong className="text-amber-400">{data.fat}g</strong></span>
                          </div>
                        )}
                        <button
                          onClick={() => handleOpenAdd(type)}
                          className="p-1 text-primary hover:bg-primary/10 rounded-md transition flex items-center gap-1 text-xs font-semibold"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Log Food
                        </button>
                      </div>
                    </div>

                    {!hasEntries ? (
                      <p className="text-xs text-muted-foreground italic py-1">No food logged yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {data.entries.map((entry) => (
                          <div
                            key={entry.id}
                            className="bg-background border border-border/80 rounded-lg p-2.5 flex items-center justify-between gap-2 text-xs"
                          >
                            <div className="min-w-0">
                              <p className="font-semibold text-foreground truncate">{entry.foodNameSnapshot}</p>
                              <p className="text-[11px] text-muted-foreground">
                                {entry.quantity} {entry.unit} • {entry.calories} kcal (P: {entry.protein}g C: {entry.carbs}g F: {entry.fat}g)
                              </p>
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleOpenEdit(entry)}
                                className="p-1 text-muted-foreground hover:text-foreground transition"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteEntry(entry)}
                                className="p-1 text-muted-foreground hover:text-destructive transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Hydration Widget */}
            <div>
              <WaterTrackerWidget
                tenantId={tenantId}
                clientId={clientId}
                dateStr={selectedDate}
                waterTargetMl={summary?.targets.waterTargetMl || 2500}
                onWaterUpdated={() => loadData()}
              />
            </div>
          </div>
        </div>
      ) : activeSubTab === 'PLAN' ? (
        /* Assigned Plan View */
        <div className="space-y-6">
          {!activeAssignment ? (
            <div className="bg-card border border-border border-dashed rounded-xl p-12 text-center space-y-3">
              <Utensils className="w-10 h-10 text-muted-foreground/40 mx-auto" />
              <h3 className="text-base font-semibold">No active meal plan assigned</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Your coach has not assigned a structured meal plan yet. In the meantime, you can log custom foods in the Daily Diary.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-card border border-border rounded-xl p-6 space-y-4 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
                      Assigned Nutrition Protocol
                    </span>
                    <h2 className="text-xl font-bold font-display text-foreground mt-2">
                      {activeAssignment.planName}
                    </h2>
                    <p className="text-xs text-muted-foreground mt-1">
                      Assigned by: {activeAssignment.assignedByName || 'Coach'} • Started: {activeAssignment.startDate}
                    </p>
                  </div>

                  <div className="bg-background border border-border rounded-xl p-3 text-center">
                    <span className="text-[10px] text-muted-foreground uppercase block font-semibold">Daily Calories</span>
                    <span className="text-xl font-bold font-display text-primary">
                      {activeAssignment.customCalorieTarget || activeAssignment.planSnapshot?.dailyCalorieTarget} kcal
                    </span>
                  </div>
                </div>

                {/* Day Meals from Snapshot */}
                {activeAssignment.planSnapshot?.days && (
                  <div className="space-y-4 pt-4 border-t border-border">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground text-[11px]">
                      Prescribed Daily Schedule
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {activeAssignment.planSnapshot.days.map((day) => (
                        <div key={day.id} className="bg-background border border-border rounded-xl p-4 space-y-3">
                          <h4 className="text-sm font-bold text-foreground">{day.name}</h4>
                          <div className="space-y-2">
                            {day.meals.map((meal) => (
                              <div key={meal.id} className="bg-card border border-border/60 rounded-lg p-2.5 text-xs space-y-1">
                                <div className="flex items-center justify-between font-semibold">
                                  <span>{meal.name} {meal.time ? `(${meal.time})` : ''}</span>
                                  <span className="text-primary">{meal.totalCalories} kcal</span>
                                </div>
                                <div className="text-[11px] text-muted-foreground">
                                  {meal.items.map(it => `${it.name} (${it.quantity}${it.unit})`).join(', ') || 'No prescribed items'}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Recipes View */
        <RecipeBuilder tenantId={tenantId} isOwnerOrTrainer={false} />
      )}

      {/* Log Modal */}
      {showLogModal && (
        <FoodLogModal
          tenantId={tenantId}
          clientId={clientId}
          dateStr={selectedDate}
          initialMealType={modalMealType}
          editingEntry={editingEntry}
          onClose={() => setShowLogModal(false)}
          onLogged={() => loadData()}
        />
      )}
    </div>
  );
}
