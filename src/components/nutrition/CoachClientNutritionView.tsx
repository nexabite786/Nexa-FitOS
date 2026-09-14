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
  Users, 
  Award,
  TrendingUp,
  Clock,
  Layers,
  Sparkles
} from 'lucide-react';
import { 
  DailyNutritionSummary, 
  FoodLogEntry, 
  MealType, 
  NutritionAdherenceReport, 
  NutritionAssignment 
} from '../../types/nutrition';
import { 
  fetchClientDailyNutritionSummary, 
  fetchClientNutritionAdherence, 
  deleteFoodLogEntry,
  fetchClientActiveAssignment
} from '../../lib/nutritionService';
import { FoodLogModal } from './FoodLogModal';
import { WaterTrackerWidget } from './WaterTrackerWidget';

interface CoachClientNutritionViewProps {
  tenantId: string;
  clientId: string;
  clientName?: string;
  isOwnerOrTrainer?: boolean;
  onOpenAssignModal?: () => void;
}

export function CoachClientNutritionView({
  tenantId,
  clientId,
  clientName = 'Client',
  isOwnerOrTrainer = true,
  onOpenAssignModal
}: CoachClientNutritionViewProps) {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [summary, setSummary] = useState<DailyNutritionSummary | null>(null);
  const [adherence, setAdherence] = useState<NutritionAdherenceReport | null>(null);
  const [activeAssignment, setActiveAssignment] = useState<NutritionAssignment | null>(null);
  const [loading, setLoading] = useState(true);

  // Food logging modal state
  const [showLogModal, setShowLogModal] = useState(false);
  const [modalMealType, setModalMealType] = useState<MealType>('BREAKFAST');
  const [editingEntry, setEditingEntry] = useState<FoodLogEntry | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sum, adh, assign] = await Promise.all([
        fetchClientDailyNutritionSummary(tenantId, clientId, selectedDate),
        fetchClientNutritionAdherence(tenantId, clientId, 14),
        fetchClientActiveAssignment(tenantId, clientId)
      ]);
      setSummary(sum);
      setAdherence(adh);
      setActiveAssignment(assign);
    } catch (err) {
      console.error('Failed to load client nutrition data:', err);
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
    if (window.confirm(`Delete "${entry.foodNameSnapshot}" from logs?`)) {
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
    { type: 'POST_WORKOUT', title: 'Post-Workout' },
    { type: 'SNACK', title: 'Snack' }
  ];

  return (
    <div className="space-y-6">
      {/* Active Plan Banner */}
      <div className="bg-card border border-border rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-xl text-primary border border-primary/20">
            <Utensils className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">Active Plan Protocol</span>
              {activeAssignment && (
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-semibold">
                  ACTIVE
                </span>
              )}
            </div>
            <h3 className="text-base font-bold font-display text-foreground mt-0.5">
              {activeAssignment ? activeAssignment.planName : 'No Active Meal Plan Assigned'}
            </h3>
            <p className="text-xs text-muted-foreground">
              {activeAssignment 
                ? `Assigned: ${activeAssignment.startDate} • Targets: ${activeAssignment.customCalorieTarget || activeAssignment.planSnapshot?.dailyCalorieTarget} kcal/day`
                : 'Assign a structured nutrition plan to set customized calorie and macro targets.'}
            </p>
          </div>
        </div>

        {isOwnerOrTrainer && onOpenAssignModal && (
          <button
            onClick={onOpenAssignModal}
            className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-4 py-2 rounded-lg text-xs transition shadow-sm shrink-0"
          >
            <Users className="w-3.5 h-3.5" />
            {activeAssignment ? 'Change / Reassign Plan' : 'Assign Meal Plan'}
          </button>
        )}
      </div>

      {/* Date Bar */}
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

      {/* Daily Macros Intake & Target Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Calories Card */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-primary" /> Energy (Calories)
            </span>
            <span className="text-xs font-bold font-display text-primary">{currentCal} / {targetCal} kcal</span>
          </div>
          <div className="h-2 w-full bg-background rounded-full overflow-hidden border border-border">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                currentCal > targetCal * 1.1 ? 'bg-amber-400' : 'bg-primary'
              }`}
              style={{ width: `${calPercent}%` }}
            />
          </div>
          <p className="text-[11px] text-muted-foreground text-right">
            {calPercent}% of target ({Math.abs(targetCal - currentCal)} kcal {currentCal <= targetCal ? 'left' : 'over'})
          </p>
        </div>

        {/* Protein Card */}
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
          <p className="text-[11px] text-muted-foreground text-right">{pPercent}% reached</p>
        </div>

        {/* Carbs Card */}
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
          <p className="text-[11px] text-muted-foreground text-right">{cPercent}% reached</p>
        </div>

        {/* Fat Card */}
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
          <p className="text-[11px] text-muted-foreground text-right">{fPercent}% reached</p>
        </div>
      </div>

      {/* Main Grid: Meals Breakdown + Side Hydration & Adherence */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Meal Logs by Meal Type */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-sm font-semibold tracking-tight text-foreground uppercase text-muted-foreground text-[11px] flex items-center justify-between">
            <span>Daily Meal Logs ({selectedDate})</span>
            <span className="text-muted-foreground">{summary?.entriesCount || 0} items recorded</span>
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
                        <span>P: <strong className="text-foreground">{data.protein}g</strong></span>
                        <span>C: <strong className="text-emerald-400">{data.carbs}g</strong></span>
                        <span>F: <strong className="text-amber-400">{data.fat}g</strong></span>
                      </div>
                    )}
                    <button
                      onClick={() => handleOpenAdd(type)}
                      className="p-1 text-primary hover:bg-primary/10 rounded-md transition flex items-center gap-1 text-xs font-medium"
                      title={`Add Food to ${title}`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Food
                    </button>
                  </div>
                </div>

                {/* Items in this meal */}
                {!hasEntries ? (
                  <p className="text-xs text-muted-foreground italic py-1">No foods logged for {title.toLowerCase()}.</p>
                ) : (
                  <div className="space-y-2">
                    {data.entries.map((entry) => (
                      <div
                        key={entry.id}
                        className="bg-background border border-border/80 rounded-lg p-2.5 flex items-center justify-between gap-2 text-xs hover:border-primary/30 transition"
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
                            title="Edit entry"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteEntry(entry)}
                            className="p-1 text-muted-foreground hover:text-destructive transition"
                            title="Delete entry"
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

        {/* Right Column: Hydration Tracker & Coach Adherence Stats */}
        <div className="space-y-6">
          {/* Hydration Tracker */}
          <WaterTrackerWidget
            tenantId={tenantId}
            clientId={clientId}
            dateStr={selectedDate}
            waterTargetMl={summary?.targets.waterTargetMl || 2500}
            onWaterUpdated={() => loadData()}
          />

          {/* Coach Adherence Report Card */}
          {adherence && (
            <div className="bg-card border border-border rounded-xl p-5 space-y-4 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold font-display text-foreground">14-Day Coach Compliance</h3>
                  <p className="text-xs text-muted-foreground">Adherence & Macro Trends</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="bg-background border border-border rounded-lg p-3">
                  <span className="text-[10px] text-muted-foreground uppercase font-medium block">Logging Rate</span>
                  <p className="text-xl font-bold font-display text-primary">{adherence.loggingAdherencePercentage}%</p>
                  <span className="text-[10px] text-muted-foreground">{adherence.daysWithLogs} of {adherence.periodDays} days</span>
                </div>

                <div className="bg-background border border-border rounded-lg p-3">
                  <span className="text-[10px] text-muted-foreground uppercase font-medium block">Target Match</span>
                  <p className="text-xl font-bold font-display text-emerald-400">{adherence.targetAdherencePercentage}%</p>
                  <span className="text-[10px] text-muted-foreground">{adherence.daysMetCalorieTarget} target days</span>
                </div>
              </div>

              <div className="bg-background/80 border border-border rounded-lg p-3 space-y-1.5 text-xs">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold block">14-Day Daily Averages</span>
                <div className="flex justify-between py-0.5 border-b border-border/50">
                  <span className="text-muted-foreground">Calories:</span>
                  <span className="font-bold text-foreground">{adherence.avgDailyCalories} kcal</span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-border/50">
                  <span className="text-muted-foreground">Protein:</span>
                  <span className="font-bold text-foreground">{adherence.avgDailyProtein}g</span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-border/50">
                  <span className="text-muted-foreground">Carbs:</span>
                  <span className="font-bold text-emerald-400">{adherence.avgDailyCarbs}g</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-muted-foreground">Fat:</span>
                  <span className="font-bold text-amber-400">{adherence.avgDailyFat}g</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Log Modal */}
      {showLogModal && (
        <FoodLogModal
          tenantId={tenantId}
          clientId={clientId}
          dateStr={selectedDate}
          initialMealType={modalMealType}
          editingEntry={editingEntry}
          onClose={() => setShowLogModal(false)}
          onLogged={() => {
            loadData();
          }}
        />
      )}
    </div>
  );
}
