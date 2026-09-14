import { useTenantStore } from '../store/tenantStore';

export type PlanId = 'free' | 'essential' | 'pro' | 'elite';
export type FeatureId = 'custom_branding' | 'api_access' | 'advanced_analytics' | 'unlimited_clients' | 'ai_coach';

interface EntitlementsConfig {
  [key: string]: {
    maxClients: number;
    maxTrainers: number;
    features: FeatureId[];
  };
}

export const PLAN_CONFIGS: EntitlementsConfig = {
  free: {
    maxClients: 5,
    maxTrainers: 1,
    features: []
  },
  essential: {
    maxClients: 50,
    maxTrainers: 5,
    features: []
  },
  pro: {
    maxClients: 500,
    maxTrainers: 20,
    features: ['custom_branding', 'advanced_analytics', 'ai_coach']
  },
  elite: {
    maxClients: 999999,
    maxTrainers: 999999,
    features: ['custom_branding', 'advanced_analytics', 'api_access', 'unlimited_clients', 'ai_coach']
  }
};

export const useEntitlements = () => {
  const { tenantData } = useTenantStore();
  
  // Safely get plan id from backend source of truth, fallback to free
  // We assume tenantData will include subscription state synced from Stripe
  const currentPlanId: PlanId = (tenantData?.planId as PlanId) || 'free';
  const subscriptionStatus = tenantData?.status || 'INACTIVE';
  
  // If subscription is not active or trialing, downgrade to free entitlements
  const effectivePlanId: PlanId = (subscriptionStatus === 'ACTIVE' || subscriptionStatus === 'TRIALING') ? currentPlanId : 'free';
  
  const config = PLAN_CONFIGS[effectivePlanId];

  return {
    currentPlanId: effectivePlanId,
    subscriptionStatus,
    
    canAddClient: (currentClientCount: number) => {
      return currentClientCount < config.maxClients;
    },
    
    canAddTrainer: (currentTrainerCount: number) => {
      return currentTrainerCount < config.maxTrainers;
    },
    
    hasFeature: (featureId: FeatureId) => {
      return config.features.includes(featureId);
    },
    
    getMaxClients: () => config.maxClients,
    getMaxTrainers: () => config.maxTrainers
  };
};
