import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, collection, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuthStore } from '../../store/authStore';
import { useTenantStore } from '../../store/tenantStore';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { ArrowLeft, Save } from 'lucide-react';

export function EditTrainer() {
  const { user } = useAuthStore();
  const { tenantId } = useTenantStore();
  const { trainerId } = useParams();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    specialization: '',
    status: 'ACTIVE'
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorState, setErrorState] = useState<'not-found' | 'permission-denied' | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!tenantId || !trainerId) return;
    loadData();
  }, [tenantId, trainerId]);

  const loadData = async () => {
    setLoading(true);
    setErrorState(null);
    try {
      const trainerRef = doc(db, 'tenants', tenantId as string, 'trainers', trainerId as string);
      const trainerSnap = await getDoc(trainerRef);
      
      if (trainerSnap.exists()) {
        const data = trainerSnap.data();
        setFormData({
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          email: data.email || '',
          phone: data.phone || '',
          specialization: data.specialization || '',
          status: data.status || 'ACTIVE'
        });
      } else {
        setErrorState('not-found');
      }
    } catch (err: any) {
      console.error(err);
      if (err?.code === 'permission-denied') {
        setErrorState('permission-denied');
      } else {
        setErrorState('not-found');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId || !trainerId || !user) return;
    
    setSaving(true);
    setSuccess(false);
    
    try {
      const trainerRef = doc(db, 'tenants', tenantId, 'trainers', trainerId);
      await updateDoc(trainerRef, {
        ...formData,
        updatedAt: new Date().toISOString()
      });

      // Audit Log
      await setDoc(doc(collection(db, 'tenants', tenantId, 'auditLogs'), Date.now().toString()), {
        action: 'TRAINER_UPDATED',
        performedBy: user.uid,
        targetId: trainerId,
        timestamp: new Date().toISOString()
      });

      setSuccess(true);
      
      setTimeout(() => {
        navigate(`/owner/trainers/${trainerId}`);
      }, 1500);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-pulse text-muted-foreground tracking-widest uppercase text-sm">Loading Coach Data...</div>
      </div>
    );
  }

  if (errorState === 'permission-denied') {
    return (
      <div className="text-center py-20 bg-card rounded-xl border border-border/50 mt-8">
        <h2 className="text-2xl font-display font-semibold text-foreground">Access Denied</h2>
        <p className="text-muted-foreground mt-2 mb-6">You don't have permission to edit this coach.</p>
        <Button onClick={() => navigate('/owner/trainers')} className="h-11">
          Return to Coaches
        </Button>
      </div>
    );
  }

  if (errorState === 'not-found' || (!formData.firstName && errorState !== null)) {
    return (
      <div className="text-center py-20 bg-card rounded-xl border border-border/50 mt-8">
        <h2 className="text-2xl font-display font-semibold text-foreground">Coach Not Found</h2>
        <p className="text-muted-foreground mt-2 mb-6">The coach profile you're looking for doesn't exist.</p>
        <Button onClick={() => navigate('/owner/trainers')} className="h-11">
          Return to Coaches
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12 animate-in fade-in duration-500">
      <div className="flex items-center gap-2 mb-2">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/owner/trainers/${trainerId}`)} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Profile
        </Button>
      </div>

      <Card className="border-border/50 bg-card/50 backdrop-blur shadow-none">
        <CardHeader className="border-b border-border/50 pb-6">
          <CardTitle className="text-2xl font-display">Edit Coach Profile</CardTitle>
          <CardDescription>Update coaching team member details.</CardDescription>
        </CardHeader>
        
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-8 pt-8">
            
            {success && (
              <div className="p-4 bg-green-500/10 border border-green-500/20 text-green-400 rounded-md text-sm flex items-center justify-between animate-in fade-in">
                Profile updated successfully. Redirecting...
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <Label htmlFor="firstName" className="text-muted-foreground uppercase text-xs tracking-wider">First Name</Label>
                <Input 
                  id="firstName" 
                  required 
                  value={formData.firstName} 
                  onChange={(e) => setFormData({...formData, firstName: e.target.value})} 
                  className="h-11 bg-input/50"
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="lastName" className="text-muted-foreground uppercase text-xs tracking-wider">Last Name</Label>
                <Input 
                  id="lastName" 
                  required 
                  value={formData.lastName} 
                  onChange={(e) => setFormData({...formData, lastName: e.target.value})} 
                  className="h-11 bg-input/50"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <Label htmlFor="email" className="text-muted-foreground uppercase text-xs tracking-wider">Email Address</Label>
                <Input 
                  id="email" 
                  type="email"
                  required 
                  value={formData.email} 
                  onChange={(e) => setFormData({...formData, email: e.target.value})} 
                  className="h-11 bg-input/50"
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="phone" className="text-muted-foreground uppercase text-xs tracking-wider">Phone Number (Optional)</Label>
                <Input 
                  id="phone" 
                  type="tel"
                  value={formData.phone} 
                  onChange={(e) => setFormData({...formData, phone: e.target.value})} 
                  className="h-11 bg-input/50"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-border/50">
              <div className="space-y-3">
                <Label htmlFor="specialization" className="text-muted-foreground uppercase text-xs tracking-wider">Specialization</Label>
                <Input 
                  id="specialization" 
                  value={formData.specialization} 
                  placeholder="e.g. Olympic Weightlifting"
                  onChange={(e) => setFormData({...formData, specialization: e.target.value})} 
                  className="h-11 bg-input/50"
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="status" className="text-muted-foreground uppercase text-xs tracking-wider">Account Status</Label>
                <div className="relative">
                  <select 
                    id="status"
                    className="flex w-full appearance-none h-11 rounded-md border border-border bg-input/50 px-3 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INVITED">Invited</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
              </div>
            </div>
            
          </CardContent>
          <CardFooter className="flex justify-end gap-3 border-t border-border/50 p-6 bg-card">
            <Button variant="ghost" type="button" onClick={() => navigate(`/owner/trainers/${trainerId}`)} className="h-11 px-6">
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="h-11 px-6">
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
