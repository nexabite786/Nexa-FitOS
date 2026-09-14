import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, doc, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

export function Onboarding() {
  const { user, profile } = useAuthStore();
  const [step, setStep] = useState(1);
  const totalSteps = 4;

  // Step 1: Name
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  // Step 2: Business
  const [businessName, setBusinessName] = useState('');
  // Step 3: Location
  const [country, setCountry] = useState('US');
  // Step 4: Preferences
  const [currency, setCurrency] = useState('USD');
  const [timezone, setTimezone] = useState('America/New_York');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/login');
    } else if (profile?.onboardingComplete) {
      navigate('/owner/dashboard');
    } else if (profile) {
      setFirstName(profile.firstName || '');
      setLastName(profile.lastName || '');
    }
  }, [user, profile, navigate]);

  const handleNext = () => {
    if (step < totalSteps) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleCreateBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setError('');
    setLoading(true);
    
    try {
      const batch = writeBatch(db);
      
      // 1. Create Tenant
      const tenantRef = doc(collection(db, 'tenants'));
      batch.set(tenantRef, {
        name: businessName,
        createdAt: new Date().toISOString(),
        ownerId: user.uid,
      });

      // 2. Create Owner Membership
      const memberRef = doc(db, 'tenants', tenantRef.id, 'members', user.uid);
      batch.set(memberRef, {
        role: 'GYM_OWNER',
        joinedAt: new Date().toISOString(),
      });

      // 3. Create Tenant Settings
      const settingsRef = doc(db, 'tenants', tenantRef.id, 'settings', 'business');
      batch.set(settingsRef, {
        businessName,
        country,
        currency,
        timezone,
        updatedAt: new Date().toISOString(),
      });
      
      const brandingRef = doc(db, 'tenants', tenantRef.id, 'settings', 'branding');
      batch.set(brandingRef, {
        primaryColor: '#C8A97E',
        secondaryColor: '#121212',
        theme: 'dark',
      });

      // 4. Update User Profile
      const userRef = doc(db, 'users', user.uid);
      batch.update(userRef, {
        firstName,
        lastName,
        currentTenantId: tenantRef.id,
        onboardingComplete: true,
      });

      // 5. Audit Log
      const auditRef = doc(collection(db, 'tenants', tenantRef.id, 'auditLogs'), Date.now().toString());
      batch.set(auditRef, {
        action: 'TENANT_CREATED',
        performedBy: user.uid,
        timestamp: new Date().toISOString(),
      });

      await batch.commit();
      window.location.href = '/owner/dashboard';
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to setup business. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!user || profile?.onboardingComplete) return null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 lg:p-8">
      
      {/* Branding */}
      <div className="absolute top-8 left-8 flex items-baseline gap-2">
        <h1 className="text-xl font-display font-bold tracking-tight text-foreground">NEXA FITOS</h1>
        <div className="h-1 w-1 rounded-full bg-primary"></div>
      </div>

      <div className="w-full max-w-lg">
        {/* Progress indicator */}
        <div className="flex items-center gap-2 mb-12">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex-1 h-1 rounded-full overflow-hidden bg-border relative">
              <div 
                className={`absolute inset-0 bg-primary transition-all duration-500 ease-in-out ${i <= step ? 'translate-x-0' : '-translate-x-full'}`}
              ></div>
            </div>
          ))}
        </div>

        <form onSubmit={step === totalSteps ? handleCreateBusiness : (e) => { e.preventDefault(); handleNext(); }}>
          
          <div className="min-h-[300px]">
            {step === 1 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div>
                  <h2 className="text-3xl font-display font-semibold text-foreground">Tell us about you.</h2>
                  <p className="text-muted-foreground mt-2">Let's start with your name.</p>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input 
                      id="firstName" 
                      required 
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="h-12 text-lg bg-input/50"
                      autoFocus
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input 
                      id="lastName" 
                      required 
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="h-12 text-lg bg-input/50"
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div>
                  <h2 className="text-3xl font-display font-semibold text-foreground">Build your fitness business.</h2>
                  <p className="text-muted-foreground mt-2">What is the name of your organization?</p>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="businessName">Business Name</Label>
                    <Input 
                      id="businessName" 
                      required 
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      className="h-12 text-lg bg-input/50"
                      placeholder="e.g. Lycan Strength"
                      autoFocus
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div>
                  <h2 className="text-3xl font-display font-semibold text-foreground">Where are you based?</h2>
                  <p className="text-muted-foreground mt-2">Set your operational country.</p>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <div className="relative">
                      <select 
                        id="country"
                        className="flex w-full appearance-none rounded-md border border-border bg-input/50 px-4 py-3 text-lg text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        autoFocus
                      >
                        <option value="US">United States</option>
                        <option value="UK">United Kingdom</option>
                        <option value="CA">Canada</option>
                        <option value="AU">Australia</option>
                        <option value="AE">United Arab Emirates</option>
                        <option value="EU">European Union</option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-muted-foreground">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div>
                  <h2 className="text-3xl font-display font-semibold text-foreground">Set your preferences.</h2>
                  <p className="text-muted-foreground mt-2">Configure default regional settings.</p>
                </div>
                
                {error && (
                  <div className="p-3 bg-red-950/30 border border-red-900/50 rounded-md">
                    <p className="text-sm text-red-400">{error}</p>
                  </div>
                )}

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currency">Currency</Label>
                    <div className="relative">
                      <select 
                        id="currency"
                        className="flex w-full appearance-none rounded-md border border-border bg-input/50 px-4 py-3 text-lg text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                      >
                        <option value="USD">USD ($)</option>
                        <option value="GBP">GBP (£)</option>
                        <option value="CAD">CAD ($)</option>
                        <option value="AUD">AUD ($)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="AED">AED (د.إ)</option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-muted-foreground">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <div className="relative">
                      <select 
                        id="timezone"
                        className="flex w-full appearance-none rounded-md border border-border bg-input/50 px-4 py-3 text-lg text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        value={timezone}
                        onChange={(e) => setTimezone(e.target.value)}
                      >
                        <option value="America/New_York">Eastern Time (ET)</option>
                        <option value="America/Chicago">Central Time (CT)</option>
                        <option value="America/Denver">Mountain Time (MT)</option>
                        <option value="America/Los_Angeles">Pacific Time (PT)</option>
                        <option value="Europe/London">London (GMT/BST)</option>
                        <option value="Asia/Dubai">Gulf Standard Time (GST)</option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-muted-foreground">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-4 mt-8 pt-8 border-t border-border/50">
            {step > 1 && (
              <Button type="button" variant="outline" onClick={handleBack} className="h-12 px-6" disabled={loading}>
                Back
              </Button>
            )}
            <Button type="submit" className="h-12 flex-1 text-base font-semibold" disabled={loading}>
              {step === totalSteps ? (loading ? 'Creating...' : 'Complete Setup →') : 'Continue →'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
