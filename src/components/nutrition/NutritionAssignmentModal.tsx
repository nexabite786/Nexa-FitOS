import React, { useState, useEffect } from 'react';
import { 
  Users, 
  X, 
  Calendar, 
  Flame, 
  Check, 
  AlertCircle,
  Sliders,
  Sparkles 
} from 'lucide-react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { MealPlan, NutritionAssignment } from '../../types/nutrition';
import { assignNutritionPlan } from '../../lib/nutritionService';

interface ClientOption {
  id: string;
  name: string;
  email?: string;
  status?: string;
}

interface NutritionAssignmentModalProps {
  tenantId: string;
  plan: MealPlan | null;
  onClose: () => void;
  onAssigned: (assignment: NutritionAssignment) => void;
}

export function NutritionAssignmentModal({
  tenantId,
  plan,
  onClose,
  onAssigned
}: NutritionAssignmentModalProps) {
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>('');
  
  // Target customization override
  const [enableCustomOverrides, setEnableCustomOverrides] = useState(false);
  const [customCalories, setCustomCalories] = useState<number>(plan?.dailyCalorieTarget || 2000);
  const [customProtein, setCustomProtein] = useState<number>(plan?.proteinTarget || 150);
  const [customCarbs, setCustomCarbs] = useState<number>(plan?.carbsTarget || 200);
  const [customFat, setCustomFat] = useState<number>(plan?.fatTarget || 65);
  const [customWater, setCustomWater] = useState<number>(plan?.waterTargetMl || 2500);

  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadClients();
  }, [tenantId]);

  useEffect(() => {
    if (plan) {
      setCustomCalories(plan.dailyCalorieTarget);
      setCustomProtein(plan.proteinTarget);
      setCustomCarbs(plan.carbsTarget);
      setCustomFat(plan.fatTarget);
      setCustomWater(plan.waterTargetMl);
    }
  }, [plan]);

  const loadClients = async () => {
    setLoadingClients(true);
    try {
      const clientsCol = collection(db, 'tenants', tenantId, 'clients');
      const snap = await getDocs(clientsCol);
      const list: ClientOption[] = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          name: data.name || data.fullName || data.displayName || 'Unnamed Client',
          email: data.email,
          status: data.status
        };
      });
      setClients(list);
      if (list.length > 0) {
        setSelectedClientId(list[0].id);
      }
    } catch (err) {
      console.error('Failed to load clients:', err);
    } finally {
      setLoadingClients(false);
    }
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plan) return;
    if (!selectedClientId) {
      setError('Please select a client to assign this meal plan to.');
      return;
    }

    const selectedClient = clients.find(c => c.id === selectedClientId);

    setAssigning(true);
    setError(null);
    try {
      const assignment = await assignNutritionPlan(tenantId, {
        clientId: selectedClientId,
        planId: plan.id,
        startDate,
        endDate: endDate || undefined,
        customCalorieTarget: enableCustomOverrides ? Number(customCalories) : plan.dailyCalorieTarget,
        customProteinTarget: enableCustomOverrides ? Number(customProtein) : plan.proteinTarget,
        customCarbsTarget: enableCustomOverrides ? Number(customCarbs) : plan.carbsTarget,
        customFatTarget: enableCustomOverrides ? Number(customFat) : plan.fatTarget,
        customWaterTargetMl: enableCustomOverrides ? Number(customWater) : plan.waterTargetMl
      });

      onAssigned(assignment);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to assign nutrition plan.');
    } finally {
      setAssigning(false);
    }
  };

  if (!plan) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-card border border-border rounded-xl w-full max-w-lg p-6 space-y-5 shadow-2xl relative my-8">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h3 className="text-lg font-bold font-display text-foreground flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Assign Nutrition Plan
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Plan: <strong className="text-foreground">{plan.name}</strong>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-muted-foreground hover:text-foreground rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive text-xs p-3 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleAssign} className="space-y-4">
          {/* Client Selection */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Select Client *</label>
            {loadingClients ? (
              <div className="h-10 bg-accent/40 rounded-lg animate-pulse" />
            ) : clients.length === 0 ? (
              <p className="text-xs text-muted-foreground bg-accent/20 p-3 rounded-lg border border-border">
                No clients found in gym roster. Add clients in the Clients tab first.
              </p>
            ) : (
              <select
                id="select-assign-client"
                required
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary font-medium"
              >
                {clients.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.email ? `(${c.email})` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Schedule Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Start Date *</label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">End Date (Optional)</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* Custom Calorie & Macro Target Overrides */}
          <div className="bg-accent/20 border border-border rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-primary" />
                <span className="text-xs font-semibold text-foreground">Custom Target Overrides</span>
              </div>
              <button
                type="button"
                onClick={() => setEnableCustomOverrides(!enableCustomOverrides)}
                className={`text-xs px-2.5 py-1 rounded-md font-medium transition ${
                  enableCustomOverrides 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-background border border-border text-muted-foreground'
                }`}
              >
                {enableCustomOverrides ? 'Overrides Enabled' : 'Use Base Targets'}
              </button>
            </div>

            {enableCustomOverrides ? (
              <div className="space-y-3 pt-2 border-t border-border/50">
                <div className="grid grid-cols-4 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground font-medium">Calories</label>
                    <input
                      type="number"
                      min="500"
                      value={customCalories}
                      onChange={(e) => setCustomCalories(Number(e.target.value))}
                      className="w-full bg-background border border-border rounded px-2 py-1 text-xs text-center font-bold text-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground font-medium">Protein (g)</label>
                    <input
                      type="number"
                      min="0"
                      value={customProtein}
                      onChange={(e) => setCustomProtein(Number(e.target.value))}
                      className="w-full bg-background border border-border rounded px-2 py-1 text-xs text-center font-bold text-foreground"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground font-medium">Carbs (g)</label>
                    <input
                      type="number"
                      min="0"
                      value={customCarbs}
                      onChange={(e) => setCustomCarbs(Number(e.target.value))}
                      className="w-full bg-background border border-border rounded px-2 py-1 text-xs text-center font-bold text-emerald-400"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground font-medium">Fat (g)</label>
                    <input
                      type="number"
                      min="0"
                      value={customFat}
                      onChange={(e) => setCustomFat(Number(e.target.value))}
                      className="w-full bg-background border border-border rounded px-2 py-1 text-xs text-center font-bold text-amber-400"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground font-medium">Daily Water Target (ml)</label>
                  <input
                    type="number"
                    min="500"
                    step="100"
                    value={customWater}
                    onChange={(e) => setCustomWater(Number(e.target.value))}
                    className="w-full bg-background border border-border rounded px-2 py-1 text-xs font-semibold text-blue-400"
                  />
                </div>
              </div>
            ) : (
              <div className="text-xs text-muted-foreground flex items-center justify-between">
                <span>Targets from plan:</span>
                <span className="font-semibold text-foreground">
                  {plan.dailyCalorieTarget} kcal | P: {plan.proteinTarget}g C: {plan.carbsTarget}g F: {plan.fatTarget}g
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={assigning || clients.length === 0}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-5 py-2 rounded-lg text-sm transition shadow-sm disabled:opacity-50 flex items-center gap-1.5"
            >
              {assigning ? 'Assigning...' : 'Confirm Assignment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
