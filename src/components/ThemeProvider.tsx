import React, { useEffect } from 'react';
import { useTenantStore } from '../store/tenantStore';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { tenantData } = useTenantStore();

  useEffect(() => {
    if (tenantData?.branding) {
      const { branding } = tenantData;
      const root = document.documentElement;

      if (branding.primaryColor) {
        root.style.setProperty('--color-primary', branding.primaryColor);
        // We could also calculate a hover color dynamically, or let CSS handles it
        // For simplicity, we just set the exact color
        root.style.setProperty('--color-ring', branding.primaryColor);
      } else {
        root.style.removeProperty('--color-primary');
        root.style.removeProperty('--color-ring');
      }

      if (branding.backgroundColor) {
        root.style.setProperty('--color-background', branding.backgroundColor);
      } else {
        root.style.removeProperty('--color-background');
      }

      if (branding.cardColor) {
        root.style.setProperty('--color-card', branding.cardColor);
        root.style.setProperty('--color-popover', branding.cardColor);
      } else {
        root.style.removeProperty('--color-card');
        root.style.removeProperty('--color-popover');
      }

      if (branding.textColor) {
        root.style.setProperty('--color-foreground', branding.textColor);
      } else {
        root.style.removeProperty('--color-foreground');
      }

      // Font mapping - Assuming we might load Google Fonts dynamically, but for now we just set the CSS variable
      if (branding.headingFont) {
        root.style.setProperty('--font-display', `"${branding.headingFont}", serif`);
      } else {
        root.style.removeProperty('--font-display');
      }

      if (branding.bodyFont) {
        root.style.setProperty('--font-sans', `"${branding.bodyFont}", sans-serif`);
      } else {
        root.style.removeProperty('--font-sans');
      }
      
      // Document title and favicon
      if (branding.businessName) {
        document.title = branding.businessName;
      }
      
      if (branding.faviconUrl) {
        let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
        if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          document.head.appendChild(link);
        }
        link.href = branding.faviconUrl;
      }
    }
  }, [tenantData?.branding]);

  return <>{children}</>;}
