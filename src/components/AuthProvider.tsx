import React, { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { useAuthStore } from '../store/authStore';
import { useTenantStore } from '../store/tenantStore';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setProfile, setLoading: setAuthLoading } = useAuthStore();
  const { setTenant, setLoading: setTenantLoading } = useTenantStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        try {
          // Fetch user profile
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            setProfile(userDoc.data());
          }

          // Fetch tenant memberships
          // Note: In a production app, a user might belong to multiple tenants.
          // For NEXA FITOS, we assume they have a primary tenant stored in their profile or we query it.
          // Let's use a query to find the first tenant member doc for this user.
          // Wait, Firestore doesn't easily let us query across subcollections without collectionGroup.
          // A better structure is to store the currentTenantId on the user's profile.
          
          let tenantId = userDoc.data()?.currentTenantId;
          
          if (tenantId) {
            const tenantDoc = await getDoc(doc(db, 'tenants', tenantId));
            const memberDoc = await getDoc(doc(db, 'tenants', tenantId, 'members', firebaseUser.uid));
            
            if (tenantDoc.exists() && memberDoc.exists()) {
              const baseTenantData = tenantDoc.data();
              let billingData = {};
              
              try {
                // Safely fetch billing info
                const billingSnap = await getDocs(query(collection(db, 'tenants', tenantId, 'billing')));
                if (!billingSnap.empty) {
                  // Usually the document is 'subscription'
                  const subDoc = billingSnap.docs.find(d => d.id === 'subscription') || billingSnap.docs[0];
                  billingData = subDoc.data();
                }
              } catch(e) {
                console.error("Failed to load billing details", e);
              }

              let brandingData = {};
              let localizationData = {};
              try {
                const brandingDoc = await getDoc(doc(db, 'tenants', tenantId, 'settings', 'branding'));
                if (brandingDoc.exists()) {
                  brandingData = brandingDoc.data();
                }
                const locDoc = await getDoc(doc(db, 'tenants', tenantId, 'settings', 'localization'));
                if (locDoc.exists()) {
                  localizationData = locDoc.data();
                }
              } catch (e) {
                console.error("Failed to load tenant settings", e);
              }
              
              setTenant(tenantId, { 
                ...baseTenantData, 
                ...billingData, 
                branding: brandingData, 
                localization: localizationData 
              }, memberDoc.data());
            } else {
              setTenant(null, null, null);
            }
          } else {
            setTenant(null, null, null);
          }
        } catch (error) {
          console.error("Error fetching user/tenant data:", error);
          setTenant(null, null, null);
        }
      } else {
        setProfile(null);
        setTenant(null, null, null);
      }
      
      setAuthLoading(false);
      setTenantLoading(false);
    });

    return () => unsubscribe();
  }, [setUser, setProfile, setAuthLoading, setTenant, setTenantLoading]);

  return <>{children}</>;
}
