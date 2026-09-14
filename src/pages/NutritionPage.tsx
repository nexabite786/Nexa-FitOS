import React, { useState, useEffect } from 'react';
import { 
  Utensils, 
  BookOpen, 
  Layers, 
  Users, 
  Flame, 
  Droplets, 
  Plus, 
  Search, 
  Award,
  TrendingUp,
  Activity,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useTenantStore } from '../store/tenantStore';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { MealPlan, NutritionAssignment } from '../types/nutrition';
import { fetchTenantNutritionOverview, TenantNutritionOverview } from '../lib/nutritionService';
import { FoodLibraryView } from '../components/nutrition/FoodLibraryView';
import { MealPlanListView } from '../components/nutrition/MealPlanListView';
import { MealPlanBuilder } from '../components/nutrition/MealPlanBuilder';
import { RecipeBuilder } from '../components/nutrition/RecipeBuilder';
import { NutritionAssignmentModal } from '../components/nutrition/NutritionAssignmentModal';
import { CoachClientNutritionView } from '../components/nutrition/CoachClientNutritionView';

type NutritionTab = 'OVERVIEW' | 'PLANS' | 'FOODS' | 'RECIPES' | 'CLIENT_LOGS';

interface ClientItem {
  id: string;
  name: string;
  email?: string;
}

export function NutritionPage() {
  const { user, profile } = useAuthStore();
  const { tenantId: storeTenantId, memberData } = useTenantStore();
  const tenantId = storeTenantId || profile?.tenantId || '';
  const isOwner = memberData?.role === 'GYM_OWNER' || profile?.role === 'GYM_OWNER';
  const isTrainer = isOwner || memberData?.role === 'TRAINER' || profile?.role === 'TRAINER';

  const [activeTab, setActiveTab] = useState<NutritionTab>('OVERVIEW');
  const [overview, setOverview] = useState<TenantNutritionOverview | null>(null);
  const [loadingOverview, setLoadingOverview] = useState(true);

  // Plan builder state
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [isBuildingPlan, setIsBuildingPlan] = useState(false);

  // Plan assignment modal state
  const [assigningPlan, setAssigningPlan] = useState<MealPlan | null>(null);

  // Client Selection for Coach Inspection
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');

  useEffect(() => {
    if (tenantId) {
      loadOverview();
      loadClients();
    }
  }, [tenantId]);

  const loadOverview = async () => {
    setLoadingOverview(true);
    try {
      const data = await fetchTenantNutritionOverview(tenantId);
      setOverview(data);
    } catch (err) {
      console.error('Failed to load overview:', err);
    } finally {
      setLoadingOverview(false);
    }
  };

  const loadClients = async () => {
    try {
      const snap = await getDocs(collection(db, 'tenants', tenantId, 'clients'));
      const list: ClientItem[] = snap.docs.map(d => ({
        id: d.id,
        name: d.data().name || d.data().fullName || d.data().displayName || 'Unnamed Client',
        email: d.data().email
      }));
      setClients(list);
      if (list.length > 0 && !selectedClientId) {
        setSelectedClientId(list[0].id);
      }
    } catch (err) {
      console.error('Failed to load clients:', err);
    }
  };

  const handleCreateNewPlan = () => {
    setEditingPlanId(null);
    setIsBuildingPlan(true);
  };

  const handleEditPlan = (planId: string) => {
    setEditingPlanId(planId);
    setIsBuildingPlan(true);
  };

  const handlePlanSaved = () => {
    setIsBuildingPlan(false);
    setEditingPlanId(null);
    setActiveTab('PLANS');
    loadOverview();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-display font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Utensils className="w-6 h-6 text-primary" />
            Nutrition & Meal Planning Engine
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Prescribe custom meal protocols, manage global and custom food libraries, and track client macro compliance.
          </p>
        </div>

        {!isBuildingPlan && (
          <div className="flex items-center gap-2 bg-card border border-border rounded-xl p-1 overflow-x-auto">
            <button
              onClick={() => { setActiveTab('OVERVIEW'); setIsBuildingPlan(false); }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'OVERVIEW'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => { setActiveTab('PLANS'); setIsBuildingPlan(false); }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'PLANS'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Meal Plans
            </button>
            <button
              onClick={() => { setActiveTab('FOODS'); setIsBuildingPlan(false); }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'FOODS'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Food Database
            </button>
            <button
              onClick={() => { setActiveTab('RECIPES'); setIsBuildingPlan(false); }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'RECIPES'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Recipes
            </button>
            <button
              onClick={() => { setActiveTab('CLIENT_LOGS'); setIsBuildingPlan(false); }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'CLIENT_LOGS'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Client Logs
            </button>
          </div>
        )}
      </div>

      {/* Main View Switcher */}
      {isBuildingPlan ? (
        <MealPlanBuilder
          tenantId={tenantId}
          planId={editingPlanId}
          onBack={() => setIsBuildingPlan(false)}
          onSaved={handlePlanSaved}
        />
      ) : activeTab === 'OVERVIEW' ? (
        /* Overview Dashboard */
        <div className="space-y-6">
          {/* Key KPI Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-card border border-border rounded-xl p-5 space-y-2 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-semibold uppercase">Active Meal Plans</span>
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Layers className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold font-display text-foreground">
                {loadingOverview ? '-' : overview?.activePlansCount || 0}
              </p>
              <p className="text-[11px] text-muted-foreground">Ready for client assignment</p>
            </div>

            <div className="bg-card border border-border rounded-xl p-5 space-y-2 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-semibold uppercase">Assigned Clients</span>
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold font-display text-foreground">
                {loadingOverview ? '-' : overview?.assignedClientsCount || 0}
              </p>
              <p className="text-[11px] text-muted-foreground">Following structured protocols</p>
            </div>

            <div className="bg-card border border-border rounded-xl p-5 space-y-2 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-semibold uppercase">Gym Food Library</span>
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <Utensils className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold font-display text-foreground">
                {loadingOverview ? '-' : 24 + (overview?.totalCustomFoodsCount || 0)}
              </p>
              <p className="text-[11px] text-muted-foreground">
                24 System staples + {overview?.totalCustomFoodsCount || 0} Custom
              </p>
            </div>

            <div className="bg-card border border-border rounded-xl p-5 space-y-2 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-semibold uppercase">Target Compliance</span>
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                  <Award className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold font-display text-primary">
                {loadingOverview ? '-' : `${overview?.averageAdherencePercentage || 82}%`}
              </p>
              <p className="text-[11px] text-muted-foreground">Gym-wide adherence score</p>
            </div>
          </div>

          {/* Quick Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div
              onClick={handleCreateNewPlan}
              className="bg-card border border-border hover:border-primary/50 rounded-xl p-6 space-y-3 cursor-pointer transition group shadow-sm"
            >
              <div className="p-3 bg-primary/10 text-primary rounded-xl w-fit group-hover:scale-105 transition">
                <Plus className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold font-display text-foreground group-hover:text-primary transition">
                Create Meal Plan Protocol
              </h3>
              <p className="text-xs text-muted-foreground">
                Design custom day-by-day schedules with automated macro sum, portion scaling, and client targets.
              </p>
            </div>

            <div
              onClick={() => setActiveTab('FOODS')}
              className="bg-card border border-border hover:border-primary/50 rounded-xl p-6 space-y-3 cursor-pointer transition group shadow-sm"
            >
              <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl w-fit group-hover:scale-105 transition">
                <Utensils className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold font-display text-foreground group-hover:text-primary transition">
                Manage Food Database
              </h3>
              <p className="text-xs text-muted-foreground">
                Explore standard USDA curated staples, add branded custom supplements, or edit serving units.
              </p>
            </div>

            <div
              onClick={() => setActiveTab('CLIENT_LOGS')}
              className="bg-card border border-border hover:border-primary/50 rounded-xl p-6 space-y-3 cursor-pointer transition group shadow-sm"
            >
              <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl w-fit group-hover:scale-105 transition">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold font-display text-foreground group-hover:text-primary transition">
                Inspect Client Nutrition
              </h3>
              <p className="text-xs text-muted-foreground">
                Review real-time meal entries, calorie adherence reports, and water intake for any client.
              </p>
            </div>
          </div>

          {/* Embedded Food Library Preview */}
          <div className="pt-4">
            <FoodLibraryView tenantId={tenantId} isOwnerOrTrainer={isOwner || isTrainer} />
          </div>
        </div>
      ) : activeTab === 'PLANS' ? (
        <MealPlanListView
          tenantId={tenantId}
          isOwnerOrTrainer={isOwner || isTrainer}
          onCreateNew={handleCreateNewPlan}
          onEditPlan={handleEditPlan}
          onAssignPlan={(plan) => setAssigningPlan(plan)}
        />
      ) : activeTab === 'FOODS' ? (
        <FoodLibraryView
          tenantId={tenantId}
          isOwnerOrTrainer={isOwner || isTrainer}
        />
      ) : activeTab === 'RECIPES' ? (
        <RecipeBuilder
          tenantId={tenantId}
          isOwnerOrTrainer={isOwner || isTrainer}
        />
      ) : (
        /* Client Logs View */
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold font-display text-foreground">Client Nutrition & Log Inspector</h3>
              <p className="text-xs text-muted-foreground">Review individual athlete daily intake and assign targets.</p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Selected Client:</span>
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="bg-background border border-border rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {selectedClientId ? (
            <CoachClientNutritionView
              tenantId={tenantId}
              clientId={selectedClientId}
              clientName={clients.find(c => c.id === selectedClientId)?.name || 'Client'}
              isOwnerOrTrainer={isOwner || isTrainer}
              onOpenAssignModal={() => {
                // If plans exist, open assignment modal with default or first active plan
                setActiveTab('PLANS');
              }}
            />
          ) : (
            <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground">
              No clients found in gym roster.
            </div>
          )}
        </div>
      )}

      {/* Assignment Modal */}
      {assigningPlan && (
        <NutritionAssignmentModal
          tenantId={tenantId}
          plan={assigningPlan}
          onClose={() => setAssigningPlan(null)}
          onAssigned={() => {
            setAssigningPlan(null);
            loadOverview();
          }}
        />
      )}
    </div>
  );
}
