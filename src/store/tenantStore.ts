import { create } from 'zustand';

interface TenantState {
  tenantId: string | null;
  tenantData: any | null;
  memberData: any | null;
  loading: boolean;
  setTenant: (tenantId: string | null, tenantData: any | null, memberData: any | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useTenantStore = create<TenantState>((set) => ({
  tenantId: null,
  tenantData: null,
  memberData: null,
  loading: true,
  setTenant: (tenantId, tenantData, memberData) => set({ tenantId, tenantData, memberData }),
  setLoading: (loading) => set({ loading }),
}));
