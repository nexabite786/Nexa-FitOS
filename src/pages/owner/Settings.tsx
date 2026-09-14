import React, { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuthStore } from '../../store/authStore';
import { useTenantStore } from '../../store/tenantStore';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Save } from 'lucide-react';

export function Settings() {
  const { user } = useAuthStore();
  const { tenantId, tenantData, memberData, setTenant } = useTenantStore();
  
  const [formData, setFormData] = useState({
    businessName: '',
    country: '',
    currency: '',
    timezone: '',
    supportEmail: '',
    supportPhone: ''
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!tenantId) return;
    
    const loadSettings = async () => {
      try {
        const settingsRef = doc(db, 'tenants', tenantId as string, 'settings', 'business');
        const settingsSnap = await getDoc(settingsRef);
        
        const tenantRef = doc(db, 'tenants', tenantId as string);
        const tenantSnap = await getDoc(tenantRef);
        
        let data = {
          businessName: tenantSnap.exists() ? tenantSnap.data().name : '',
          country: 'US',
          currency: 'USD',
          timezone: 'America/New_York',
          supportEmail: '',
          supportPhone: ''
        };
        
        if (settingsSnap.exists()) {
          data = { ...data, ...settingsSnap.data() };
        }
        
        setFormData(data as any);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    loadSettings();
  }, [tenantId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId || !user) return;
    
    setSaving(true);
    setSuccess(false);
    setError('');
    
    try {
      // Update tenant name
      const tenantRef = doc(db, 'tenants', tenantId as string);
      await updateDoc(tenantRef, {
        name: formData.businessName
      });
      
      // Update business settings
      const settingsRef = doc(db, 'tenants', tenantId as string, 'settings', 'business');
      await setDoc(settingsRef, {
        ...formData,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      setTenant(tenantId, { ...tenantData, name: formData.businessName }, memberData);
      setSuccess(true);
      
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error(err);
      setError('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-pulse text-muted-foreground tracking-widest uppercase text-sm">Loading Settings...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-4xl pb-12">
      <div>
        <h1 className="text-4xl font-display font-semibold tracking-tight text-foreground">Business Settings</h1>
        <p className="text-muted-foreground mt-2 text-lg">Manage your organization's core configuration.</p>
      </div>

      <Card className="border-border/50 bg-card/50 backdrop-blur shadow-none">
        <form onSubmit={handleSubmit}>
          <CardHeader className="border-b border-border/50 pb-6">
            <CardTitle className="text-xl font-display">General Information</CardTitle>
            <CardDescription>This information is used across your platform.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8 pt-8">
            {error && (
              <div className="p-4 bg-red-950/30 border border-red-900/50 rounded-md">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}
            
            {success && (
              <div className="p-4 bg-green-500/10 border border-green-500/20 text-green-400 rounded-md text-sm flex items-center animate-in fade-in">
                Settings saved successfully.
              </div>
            )}

            <div className="space-y-3">
              <Label htmlFor="businessName" className="text-muted-foreground uppercase text-xs tracking-wider">Business Name</Label>
              <Input 
                id="businessName" 
                required 
                value={formData.businessName} 
                onChange={(e) => setFormData({...formData, businessName: e.target.value})} 
                className="h-11 bg-input/50 max-w-md"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-border/50">
              <div className="space-y-3">
                <Label htmlFor="country" className="text-muted-foreground uppercase text-xs tracking-wider">Country</Label>
                <div className="relative">
                  <select 
                    id="country"
                    className="flex w-full appearance-none h-11 rounded-md border border-border bg-input/50 px-3 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={formData.country}
                    onChange={(e) => setFormData({...formData, country: e.target.value})}
                  >
                    <option value="US">United States</option>
                    <option value="UK">United Kingdom</option>
                    <option value="CA">Canada</option>
                    <option value="AU">Australia</option>
                    <option value="AE">United Arab Emirates</option>
                    <option value="EU">European Union</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <Label htmlFor="currency" className="text-muted-foreground uppercase text-xs tracking-wider">Currency</Label>
                <div className="relative">
                  <select 
                    id="currency"
                    className="flex w-full appearance-none h-11 rounded-md border border-border bg-input/50 px-3 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={formData.currency}
                    onChange={(e) => setFormData({...formData, currency: e.target.value})}
                  >
                    <option value="USD">USD ($)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="CAD">CAD ($)</option>
                    <option value="AUD">AUD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="AED">AED (د.إ)</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="timezone" className="text-muted-foreground uppercase text-xs tracking-wider">Default Timezone</Label>
              <div className="relative max-w-md">
                <select 
                  id="timezone"
                  className="flex w-full appearance-none h-11 rounded-md border border-border bg-input/50 px-3 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={formData.timezone}
                  onChange={(e) => setFormData({...formData, timezone: e.target.value})}
                >
                  <option value="America/New_York">Eastern Time (ET)</option>
                  <option value="America/Chicago">Central Time (CT)</option>
                  <option value="America/Denver">Mountain Time (MT)</option>
                  <option value="America/Los_Angeles">Pacific Time (PT)</option>
                  <option value="Europe/London">London (GMT/BST)</option>
                  <option value="Asia/Dubai">Gulf Standard Time (GST)</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-border/50">
              <div className="space-y-3">
                <Label htmlFor="supportEmail" className="text-muted-foreground uppercase text-xs tracking-wider">Support Email</Label>
                <Input 
                  id="supportEmail" 
                  type="email"
                  placeholder="support@yourbusiness.com"
                  value={formData.supportEmail} 
                  onChange={(e) => setFormData({...formData, supportEmail: e.target.value})} 
                  className="h-11 bg-input/50"
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="supportPhone" className="text-muted-foreground uppercase text-xs tracking-wider">Support Phone</Label>
                <Input 
                  id="supportPhone" 
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  value={formData.supportPhone} 
                  onChange={(e) => setFormData({...formData, supportPhone: e.target.value})} 
                  className="h-11 bg-input/50"
                />
              </div>
            </div>
            
          </CardContent>
          <CardFooter className="flex justify-end border-t border-border/50 p-6 bg-card">
            <Button type="submit" disabled={saving} className="h-11 px-6">
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
