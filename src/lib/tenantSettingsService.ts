import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from './firebase';
import { BrandingSettings, LocalizationSettings, DomainConfig } from '../types/tenant';

export async function updateBrandingSettings(tenantId: string, settings: BrandingSettings): Promise<void> {
  const brandingRef = doc(db, 'tenants', tenantId, 'settings', 'branding');
  await setDoc(brandingRef, settings, { merge: true });
}

export async function getBrandingSettings(tenantId: string): Promise<BrandingSettings | null> {
  const brandingRef = doc(db, 'tenants', tenantId, 'settings', 'branding');
  const snap = await getDoc(brandingRef);
  return snap.exists() ? (snap.data() as BrandingSettings) : null;
}

export async function updateLocalizationSettings(tenantId: string, settings: LocalizationSettings): Promise<void> {
  const locRef = doc(db, 'tenants', tenantId, 'settings', 'localization');
  await setDoc(locRef, settings, { merge: true });
}

export async function getLocalizationSettings(tenantId: string): Promise<LocalizationSettings | null> {
  const locRef = doc(db, 'tenants', tenantId, 'settings', 'localization');
  const snap = await getDoc(locRef);
  return snap.exists() ? (snap.data() as LocalizationSettings) : null;
}

export async function uploadTenantAsset(tenantId: string, file: File, type: 'logo' | 'favicon'): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const filePath = `tenantAssets/${tenantId}/branding/${type}_${Date.now()}.${fileExt}`;
  const storageRef = ref(storage, filePath);
  
  await uploadBytes(storageRef, file);
  return await getDownloadURL(storageRef);
}
