import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuthStore } from '../../store/authStore';
import { useTenantStore } from '../../store/tenantStore';
import { useEntitlements } from '../../lib/entitlements';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Search, Plus, UserSquare2, ArrowRight, Lock } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../../components/ui/card';

export function Trainers() {
  const { user } = useAuthStore();
  const { tenantId } = useTenantStore();
  const { canAddTrainer, currentPlanId, getMaxTrainers } = useEntitlements();
  const navigate = useNavigate();
  
  const [trainers, setTrainers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  
  const [isAdding, setIsAdding] = useState(false);
  const [newTrainerEmail, setNewTrainerEmail] = useState('');
  const [newTrainerFirstName, setNewTrainerFirstName] = useState('');
  const [newTrainerLastName, setNewTrainerLastName] = useState('');
  const [newTrainerSpecialization, setNewTrainerSpecialization] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');

  const loadTrainers = async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const trainersRef = collection(db, 'tenants', tenantId, 'trainers');
      const q = statusFilter === 'ALL' 
        ? query(trainersRef, where('status', '!=', 'ARCHIVED'))
        : query(trainersRef, where('status', '==', statusFilter));
        
      const snap = await getDocs(q);
      
      const trainersData = await Promise.all(snap.docs.map(async (d) => {
        const data = d.data();
        const clientsQuery = query(
          collection(db, 'tenants', tenantId as string, 'clients'),
          where('trainerId', '==', d.id),
          where('status', '!=', 'ARCHIVED')
        );
        const clientsSnap = await getDocs(clientsQuery);
        return { 
          id: d.id, 
          ...data,
          activeClientCount: clientsSnap.size
        };
      }));

      setTrainers(trainersData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrainers();
  }, [tenantId, statusFilter]);

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId || !user) return;
    
    if (!canAddTrainer(trainers.length)) {
      setAddError(`Trainer limit reached for ${currentPlanId} plan (${getMaxTrainers()} max). Upgrade your plan in Settings > Billing.`);
      return;
    }
    
    setAddLoading(true);
    setAddError('');
    try {
      const trainerId = Date.now().toString(); 
      await setDoc(doc(db, 'tenants', tenantId, 'trainers', trainerId), {
        email: newTrainerEmail,
        firstName: newTrainerFirstName,
        lastName: newTrainerLastName,
        specialization: newTrainerSpecialization,
        status: 'INVITED',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      await setDoc(doc(collection(db, 'tenants', tenantId, 'auditLogs'), Date.now().toString()), {
        action: 'TRAINER_CREATED',
        performedBy: user.uid,
        targetId: trainerId,
        timestamp: new Date().toISOString()
      });

      setIsAdding(false);
      setNewTrainerEmail('');
      setNewTrainerFirstName('');
      setNewTrainerLastName('');
      setNewTrainerSpecialization('');
      loadTrainers();
    } catch (err: any) {
      console.error(err);
      setAddError('Failed to add trainer. Please try again.');
    } finally {
      setAddLoading(false);
    }
  };

  const filteredTrainers = trainers.filter(t => {
    const search = searchQuery.toLowerCase();
    return (
      (t.firstName?.toLowerCase().includes(search)) ||
      (t.lastName?.toLowerCase().includes(search)) ||
      (t.email?.toLowerCase().includes(search)) ||
      (t.specialization?.toLowerCase().includes(search))
    );
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-4xl font-display font-semibold tracking-tight text-foreground">Coaches</h1>
          <p className="text-muted-foreground mt-2 text-lg">Manage your coaching team and their assignments.</p>
        </div>
        <Button 
          onClick={() => {
            if (!canAddTrainer(trainers.length)) {
              alert(`Trainer limit reached for ${currentPlanId} plan. Upgrade in Billing.`);
              return;
            }
            setIsAdding(true);
          }} 
          className="w-full md:w-auto h-11 px-6"
          disabled={!loading && !canAddTrainer(trainers.length)}
        >
          {!loading && !canAddTrainer(trainers.length) ? (
            <><Lock className="h-4 w-4 mr-2" /> Upgrade to Add</>
          ) : (
            <><Plus className="h-4 w-4 mr-2" /> Add Coach</>
          )}
        </Button>
      </div>

      {isAdding && (
        <Card className="border-primary/50 shadow-lg bg-card/50 backdrop-blur">
          <CardContent className="p-6">
            <h3 className="text-lg font-display font-semibold mb-4 text-foreground">Quick Add Coach</h3>
            <form onSubmit={handleQuickAdd} className="space-y-4">
              {addError && <div className="text-sm text-red-400 p-2 bg-red-950/30 border border-red-900/50 rounded-md">{addError}</div>}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Input 
                  placeholder="First Name" 
                  required 
                  value={newTrainerFirstName}
                  onChange={e => setNewTrainerFirstName(e.target.value)}
                  className="bg-input/50"
                />
                <Input 
                  placeholder="Last Name" 
                  required 
                  value={newTrainerLastName}
                  onChange={e => setNewTrainerLastName(e.target.value)}
                  className="bg-input/50"
                />
                <Input 
                  type="email" 
                  placeholder="Email Address" 
                  required 
                  value={newTrainerEmail}
                  onChange={e => setNewTrainerEmail(e.target.value)}
                  className="bg-input/50"
                />
                <Input 
                  placeholder="Specialization (e.g. Strength)" 
                  value={newTrainerSpecialization}
                  onChange={e => setNewTrainerSpecialization(e.target.value)}
                  className="bg-input/50"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="ghost" type="button" onClick={() => setIsAdding(false)}>Cancel</Button>
                <Button type="submit" disabled={addLoading}>{addLoading ? 'Adding...' : 'Add Coach'}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-card p-4 rounded-xl border border-border/50">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search coaches..." 
            className="pl-9 bg-input/50 border-none h-11"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <select 
            className="h-11 rounded-md border border-border/50 bg-input/50 px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INVITED">Invited</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-40 rounded-xl bg-accent/50 animate-pulse border border-border/50"></div>
          ))}
        </div>
      ) : filteredTrainers.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center rounded-xl border border-border border-dashed bg-card/20">
          <div className="h-16 w-16 rounded-full bg-accent flex items-center justify-center mb-6">
            <UserSquare2 className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-display font-semibold text-foreground mb-2">No coaches found</h3>
          <p className="text-muted-foreground mb-6 max-w-md">Scale your business by adding your first coach.</p>
          <Button onClick={() => setIsAdding(true)} variant="outline" className="h-11">
            <Plus className="h-4 w-4 mr-2" /> Add Coach
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTrainers.map(trainer => (
            <Card 
              key={trainer.id} 
              className="overflow-hidden hover:border-primary/50 transition-colors cursor-pointer bg-card/50 backdrop-blur group"
              onClick={() => navigate(`/owner/trainers/${trainer.id}`)}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="h-14 w-14 rounded-full bg-accent flex flex-shrink-0 items-center justify-center font-display font-semibold text-primary text-xl">
                      {trainer.firstName?.[0]}{trainer.lastName?.[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-foreground truncate text-lg">{trainer.firstName} {trainer.lastName}</div>
                      <div className="text-sm text-muted-foreground truncate">{trainer.specialization || 'General Fitness'}</div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-sm text-[10px] font-bold tracking-wider uppercase ${
                      trainer.status === 'ACTIVE' ? 'bg-green-500/10 text-green-400' :
                      trainer.status === 'INVITED' ? 'bg-blue-500/10 text-blue-400' :
                      trainer.status === 'INACTIVE' ? 'bg-accent text-muted-foreground' :
                      'bg-accent text-muted-foreground'
                    }`}>
                      {trainer.status || 'Active'}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      <strong className="text-foreground">{trainer.activeClientCount}</strong> Clients
                    </span>
                  </div>
                  
                  <div className="text-xs text-muted-foreground flex items-center group-hover:text-primary transition-colors">
                    View <ArrowRight className="h-3 w-3 ml-1" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
