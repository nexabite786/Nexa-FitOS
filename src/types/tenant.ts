export interface BrandingSettings {
  businessName?: string;
  displayName?: string;
  logoUrl?: string;
  faviconUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  backgroundColor?: string;
  cardColor?: string;
  textColor?: string;
  headingFont?: string;
  bodyFont?: string;
  borderRadius?: string;
  emailSenderName?: string;
  supportEmail?: string;
  website?: string;
  phone?: string;
  address?: string;
}

export interface LocalizationSettings {
  timezone?: string;
  defaultLanguage?: string;
  defaultCurrency?: string;
  measurementSystem?: 'metric' | 'imperial';
  dateFormat?: string;
  timeFormat?: '12h' | '24h';
}

export interface DomainConfig {
  id: string;
  domain: string;
  tenantId: string;
  status: 'PENDING' | 'VERIFYING' | 'ACTIVE' | 'FAILED' | 'DISABLED';
  verificationMethod: string;
  verificationTxtRecord?: string;
  createdAt: string;
  updatedAt: string;
}