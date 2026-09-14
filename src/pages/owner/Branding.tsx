import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuthStore } from '../../store/authStore';
import { useTenantStore } from '../../store/tenantStore';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Save, Palette, Image as ImageIcon, Globe, Phone, Mail, Building, Upload } from 'lucide-react';
import { BrandingSettings } from '../../types/tenant';
import { uploadTenantAsset } from '../../lib/tenantSettingsService';

export function Branding() {
  const { user } = useAuthStore();
  const { tenantId, tenantData, setTenant } = useTenantStore();
  
  const [formData, setFormData] = useState<BrandingSettings>({
    businessName: tenantData?.name || '',
    primaryColor: '#C8A97E',
    secondaryColor: '#121212',
    accentColor: '#1C1C1C',
    backgroundColor: '#0A0A0A',
    cardColor: '#121212',
    textColor: '#F8FAFC',
    headingFont: 'Playfair Display',
    bodyFont: 'Inter',
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [faviconFile, setFaviconFile] = useState<File | null>(null);

  useEffect(() => {
    if (!tenantId) return;
    
    const loadBranding = async () => {
      try {
        const brandingRef = doc(db, 'tenants', tenantId as string, 'settings', 'branding');
        const snap = await getDoc(brandingRef);
        
        if (snap.exists()) {
          setFormData(snap.data() as BrandingSettings);
        } else if (tenantData?.branding) {
           setFormData(tenantData.branding);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    loadBranding();
  }, [tenantId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId || !user) return;
    
    setSaving(true);
    setSuccess(false);
    setError('');
    
    try {
      let finalData = { ...formData };
      
      if (logoFile) {
        const logoUrl = await uploadTenantAsset(tenantId, logoFile, 'logo');
        finalData.logoUrl = logoUrl;
      }
      
      if (faviconFile) {
        const faviconUrl = await uploadTenantAsset(tenantId, faviconFile, 'favicon');
        finalData.faviconUrl = faviconUrl;
      }

      const brandingRef = doc(db, 'tenants', tenantId as string, 'settings', 'branding');
      await setDoc(brandingRef, {
        ...finalData,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      // Update tenant store so it applies immediately
      setTenant(tenantId, { ...tenantData, branding: finalData }, null);

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error(err);
      setError('Failed to save branding. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-pulse text-muted-foreground tracking-widest uppercase text-sm">Loading Branding...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl pb-12">
      <div>
        <h1 className="text-4xl font-display font-semibold tracking-tight text-foreground">White-Label & Branding</h1>
        <p className="text-muted-foreground mt-2 text-lg">Customize your visual identity across the platform.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border/50 bg-card/50 backdrop-blur shadow-none">
            <form onSubmit={handleSubmit}>
              <CardHeader className="border-b border-border/50 pb-6">
                <CardTitle className="text-xl font-display flex items-center gap-2">
                  <Building className="h-5 w-5 text-primary" /> Business Details
                </CardTitle>
                <CardDescription>Your business identity will replace NEXA FITOS branding for your clients.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label>Business Name</Label>
                    <Input 
                      value={formData.businessName || ''} 
                      onChange={e => setFormData({...formData, businessName: e.target.value})} 
                      placeholder="e.g. Gold's Gym"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label>Support Email</Label>
                    <Input 
                      type="email"
                      value={formData.supportEmail || ''} 
                      onChange={e => setFormData({...formData, supportEmail: e.target.value})} 
                      placeholder="support@yourgym.com"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label>Website</Label>
                    <Input 
                      value={formData.website || ''} 
                      onChange={e => setFormData({...formData, website: e.target.value})} 
                      placeholder="https://yourgym.com"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label>Phone Number</Label>
                    <Input 
                      value={formData.phone || ''} 
                      onChange={e => setFormData({...formData, phone: e.target.value})} 
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>
                </div>
              </CardContent>

              <CardHeader className="border-b border-t border-border/50 py-6">
                <CardTitle className="text-xl font-display flex items-center gap-2">
                  <ImageIcon className="h-5 w-5 text-primary" /> Logos & Media
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label>Primary Logo</Label>
                    <div className="flex items-center gap-4">
                      {formData.logoUrl && !logoFile && (
                        <div className="h-12 w-12 rounded bg-accent/50 flex items-center justify-center p-1">
                          <img src={formData.logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
                        </div>
                      )}
                      <div className="flex-1">
                         <Input type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files?.[0] || null)} />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label>Favicon</Label>
                    <div className="flex items-center gap-4">
                      {formData.faviconUrl && !faviconFile && (
                        <div className="h-8 w-8 rounded bg-accent/50 flex items-center justify-center p-1">
                          <img src={formData.faviconUrl} alt="Favicon" className="max-h-full max-w-full object-contain" />
                        </div>
                      )}
                      <div className="flex-1">
                         <Input type="file" accept="image/*" onChange={(e) => setFaviconFile(e.target.files?.[0] || null)} />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>

              <CardHeader className="border-b border-t border-border/50 py-6">
                <CardTitle className="text-xl font-display flex items-center gap-2">
                  <Palette className="h-5 w-5 text-primary" /> Visual Theme
                </CardTitle>
                <CardDescription>Colors and typography for your tenant environment.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8 pt-8">
                {error && (
                  <div className="p-4 bg-red-950/30 border border-red-900/50 rounded-md">
                    <p className="text-sm text-red-400">{error}</p>
                  </div>
                )}
                
                {success && (
                  <div className="p-4 bg-green-500/10 border border-green-500/20 text-green-400 rounded-md text-sm flex items-center animate-in fade-in">
                    Branding settings saved successfully.
                  </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Primary Accent</Label>
                    <div className="flex gap-2">
                      <Input type="color" value={formData.primaryColor || '#C8A97E'} onChange={(e) => setFormData({...formData, primaryColor: e.target.value})} className="h-10 w-12 p-1 cursor-pointer" />
                      <Input type="text" value={formData.primaryColor || '#C8A97E'} onChange={(e) => setFormData({...formData, primaryColor: e.target.value})} className="h-10 font-mono text-xs uppercase" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Background</Label>
                    <div className="flex gap-2">
                      <Input type="color" value={formData.backgroundColor || '#0A0A0A'} onChange={(e) => setFormData({...formData, backgroundColor: e.target.value})} className="h-10 w-12 p-1 cursor-pointer" />
                      <Input type="text" value={formData.backgroundColor || '#0A0A0A'} onChange={(e) => setFormData({...formData, backgroundColor: e.target.value})} className="h-10 font-mono text-xs uppercase" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Card / Surface</Label>
                    <div className="flex gap-2">
                      <Input type="color" value={formData.cardColor || '#121212'} onChange={(e) => setFormData({...formData, cardColor: e.target.value})} className="h-10 w-12 p-1 cursor-pointer" />
                      <Input type="text" value={formData.cardColor || '#121212'} onChange={(e) => setFormData({...formData, cardColor: e.target.value})} className="h-10 font-mono text-xs uppercase" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Text Color</Label>
                    <div className="flex gap-2">
                      <Input type="color" value={formData.textColor || '#F8FAFC'} onChange={(e) => setFormData({...formData, textColor: e.target.value})} className="h-10 w-12 p-1 cursor-pointer" />
                      <Input type="text" value={formData.textColor || '#F8FAFC'} onChange={(e) => setFormData({...formData, textColor: e.target.value})} className="h-10 font-mono text-xs uppercase" />
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-border/50">
                  <div className="space-y-3">
                     <Label>Heading Font Family</Label>
                     <Input 
                       value={formData.headingFont || 'Playfair Display'} 
                       onChange={e => setFormData({...formData, headingFont: e.target.value})} 
                       placeholder="Playfair Display"
                     />
                  </div>
                  <div className="space-y-3">
                     <Label>Body Font Family</Label>
                     <Input 
                       value={formData.bodyFont || 'Inter'} 
                       onChange={e => setFormData({...formData, bodyFont: e.target.value})} 
                       placeholder="Inter"
                     />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end border-t border-border/50 p-6 bg-card rounded-b-xl">
                <Button type="submit" disabled={saving} className="h-11 px-6">
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Branding'}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>

        {/* Live Preview Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <div className="sticky top-8">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Live Preview</h3>
            
            {/* The preview applies the form's CSS variables to itself via style prop */}
            <div 
              className="border border-border/50 rounded-xl overflow-hidden shadow-2xl flex flex-col"
              style={{
                backgroundColor: formData.backgroundColor,
                color: formData.textColor,
                '--color-primary': formData.primaryColor,
                '--color-card': formData.cardColor,
                fontFamily: formData.bodyFont,
                minHeight: '600px'
              } as React.CSSProperties}
            >
              {/* Preview Header */}
              <div className="h-14 border-b border-white/10 flex items-center px-4 justify-between" style={{ backgroundColor: formData.cardColor }}>
                <div className="flex items-center gap-2">
                  {formData.logoUrl || logoFile ? (
                     <div className="h-6 w-6 bg-white/10 rounded flex items-center justify-center overflow-hidden">
                       <img src={logoFile ? URL.createObjectURL(logoFile) : formData.logoUrl} className="h-full object-contain" />
                     </div>
                  ) : (
                     <div className="h-6 w-6 rounded-full" style={{ backgroundColor: formData.primaryColor }} />
                  )}
                  <span className="font-bold text-sm" style={{ fontFamily: formData.headingFont }}>{formData.businessName || 'Business Name'}</span>
                </div>
                <div className="h-6 w-6 rounded-full bg-white/10" />
              </div>
              
              {/* Preview Content */}
              <div className="p-4 space-y-4 flex-1">
                <h2 className="text-xl font-bold" style={{ fontFamily: formData.headingFont }}>Welcome Back</h2>
                
                <div className="p-4 rounded-lg border border-white/5 space-y-3" style={{ backgroundColor: formData.cardColor }}>
                   <div className="h-4 w-1/3 bg-white/10 rounded" />
                   <div className="h-10 w-full rounded flex items-center px-3 text-sm opacity-80 border border-white/10">Input field</div>
                   <button className="h-10 w-full rounded text-sm font-medium flex items-center justify-center transition-opacity hover:opacity-90" style={{ backgroundColor: formData.primaryColor, color: '#000' }}>
                     Primary Button
                   </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg border border-white/5" style={{ backgroundColor: formData.cardColor }}>
                    <div className="h-8 w-8 rounded-full mb-2 flex items-center justify-center" style={{ backgroundColor: `${formData.primaryColor}20`, color: formData.primaryColor }}>
                       <Globe className="h-4 w-4" />
                    </div>
                    <div className="text-xs font-semibold">Active Clients</div>
                  </div>
                  <div className="p-3 rounded-lg border border-white/5" style={{ backgroundColor: formData.cardColor }}>
                    <div className="h-8 w-8 rounded-full mb-2 flex items-center justify-center" style={{ backgroundColor: `${formData.primaryColor}20`, color: formData.primaryColor }}>
                       <Building className="h-4 w-4" />
                    </div>
                    <div className="text-xs font-semibold">Revenue</div>
                  </div>
                </div>
              </div>

              {/* Preview Nav */}
              <div className="h-12 border-t border-white/10 flex justify-around items-center" style={{ backgroundColor: formData.cardColor }}>
                <div className="h-5 w-5" style={{ color: formData.primaryColor }}><Building className="h-full w-full"/></div>
                <div className="h-5 w-5 opacity-40"><Globe className="h-full w-full"/></div>
                <div className="h-5 w-5 opacity-40"><Phone className="h-full w-full"/></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
