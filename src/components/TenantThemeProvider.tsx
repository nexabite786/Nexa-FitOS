import React, { useEffect } from 'react';
import { useTenantStore } from '../store/tenantStore';
import { BrandingSettings } from '../types/tenant';

function hexToRgb(hex: string): string {
  // Extract RGB from hex for potential alpha usage, though simple hex works for v4 vars too
  return hex;
}

export function TenantThemeProvider({ children }: { children: React.ReactNode }) {
  const { tenantData } = useTenantStore();
  
  useEffect(() => {
    if (!tenantData?.branding) return;
    
    const branding: BrandingSettings = tenantData.branding;
    const root = document.documentElement;
    
    if (branding.primaryColor) {
      root.style.setProperty('--color-primary', branding.primaryColor);
      root.style.setProperty('--color-ring', branding.primaryColor);
    }
    
    if (branding.secondaryColor) {
      // We don't have a direct secondary in default, but we can set it if we add one
      root.style.setProperty('--color-secondary', branding.secondaryColor);
    }

    if (branding.backgroundColor) {
      root.style.setProperty('--color-background', branding.backgroundColor);
    }
    
    if (branding.cardColor) {
      root.style.setProperty('--color-card', branding.cardColor);
      root.style.setProperty('--color-popover', branding.cardColor);
    }

    if (branding.textColor) {
      root.style.setProperty('--color-foreground', branding.textColor);
      root.style.setProperty('--color-card-foreground', branding.textColor);
    }
    
    if (branding.accentColor) {
      root.style.setProperty('--color-accent', branding.accentColor);
    }
    
    // Change document title if branding is present
    if (branding.businessName) {
      document.title = branding.businessName;
    }
    
    // Favicon injection
    if (branding.faviconUrl) {
      let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = branding.faviconUrl;
    }

    // Cleanup on unmount or tenant change (optional, but good for local switching)
    return () => {
      root.style.removeProperty('--color-primary');
      root.style.removeProperty('--color-ring');
      root.style.removeProperty('--color-secondary');
      root.style.removeProperty('--color-background');
      root.style.removeProperty('--color-card');
      root.style.removeProperty('--color-popover');
      root.style.removeProperty('--color-foreground');
      root.style.removeProperty('--color-card-foreground');
      root.style.removeProperty('--color-accent');
      document.title = 'NEXA FITOS';
    };
  }, [tenantData?.branding]);

  return <>{children}</>;
}
