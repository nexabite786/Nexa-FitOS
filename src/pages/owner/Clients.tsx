import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuthStore } from '../../store/authStore';
import { useTenantStore } from '../../store/tenantStore';
import { useEntitlements } from '../../lib/entitlements';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Search, Plus, User, ArrowRight, Lock } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../../components/ui/card';

export function Clients() {
  const { user } = useAuthStore();
  const { tenantId } = useTenantStore();
  const { canAddClient, currentPlanId, getMaxClients } = useEntitlements();
  const navigate = useNavigate();
  
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  
  // Quick Add State
  const [isAdding, setIsAdding] = useState(false);
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientFirstName, setNewClientFirstName] = useState('');
  const [newClientLastName, setNewClientLastName] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');

  const loadClients = async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const clientsRef = collection(db, 'tenants', tenantId, 'clients');
      const q = statusFilter === 'ALL' 
        ? query(clientsRef, where('status', '!=', 'ARCHIVED'))
        : query(clientsRef, where('status', '==', statusFilter));
        
      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setClients(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, [tenantId, statusFilter]);

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId || !user) return;
    
    if (!canAddClient(clients.length)) {
      setAddError(`Client limit reached for ${currentPlanId} plan (${getMaxClients()} max). Upgrade your plan in Settings > Billing.`);
      return;
    }
    
    setAddLoading(true);
    setAddError('');
    try {
      const clientId = Date.now().toString(); // simple ID gen for now
      await setDoc(doc(db, 'tenants', tenantId, 'clients', clientId), {
        email: newClientEmail,
        firstName: newClientFirstName,
        lastName: newClientLastName,
        status: 'INVITED',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      // Audit Log
      await setDoc(doc(collection(db, 'tenants', tenantId, 'auditLogs'), Date.now().toString()), {
        action: 'CLIENT_CREATED',
        performedBy: user.uid,
        targetId: clientId,
        timestamp: new Date().toISOString()
      });

      setIsAdding(false);
      setNewClientEmail('');
      setNewClientFirstName('');
      setNewClientLastName('');
      loadClients();
    } catch (err: any) {
      console.error(err);
      setAddError('Failed to add client. Please try again.');
    } finally {
      setAddLoading(false);
    }
  };

  const filteredClients = clients.filter(c => {
    const search = searchQuery.toLowerCase();
    return (
      (c.firstName?.toLowerCase().includes(search)) ||
      (c.lastName?.toLowerCase().includes(search)) ||
      (c.email?.toLowerCase().includes(search))
    );
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-4xl font-display font-semibold tracking-tight text-foreground">Clients</h1>
          <p className="text-muted-foreground mt-2 text-lg">Manage your members and their fitness journey.</p>
        </div>
        <Button 
          onClick={() => {
            if (!canAddClient(clients.length)) {
              alert(`Client limit reached for ${currentPlanId} plan. Upgrade in Billing.`);
              return;
            }
            setIsAdding(true);
          }} 
          className="w-full md:w-auto h-11 px-6"
          disabled={!loading && !canAddClient(clients.length)}
        >
          {!loading && !canAddClient(clients.length) ? (
            <><Lock className="h-4 w-4 mr-2" /> Upgrade to Add</>
          ) : (
            <><Plus className="h-4 w-4 mr-2" /> Add Client</>
          )}
        </Button>
      </div>

      {isAdding && (
        <Card className="border-primary/50 shadow-lg bg-card/50 backdrop-blur">
          <CardContent className="p-6">
            <h3 className="text-lg font-display font-semibold mb-4 text-foreground">Quick Add Client</h3>
            <form onSubmit={handleQuickAdd} className="space-y-4">
              {addError && <div className="text-sm text-red-400 p-2 bg-red-950/30 border border-red-900/50 rounded-md">{addError}</div>}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input 
                  placeholder="First Name" 
                  required 
                  value={newClientFirstName}
                  onChange={e => setNewClientFirstName(e.target.value)}
                  className="bg-input/50"
                />
                <Input 
                  placeholder="Last Name" 
                  required 
                  value={newClientLastName}
                  onChange={e => setNewClientLastName(e.target.value)}
                  className="bg-input/50"
                />
                <Input 
                  type="email" 
                  placeholder="Email Address" 
                  required 
                  value={newClientEmail}
                  onChange={e => setNewClientEmail(e.target.value)}
                  className="bg-input/50"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="ghost" type="button" onClick={() => setIsAdding(false)}>Cancel</Button>
                <Button type="submit" disabled={addLoading}>{addLoading ? 'Adding...' : 'Add Client'}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-card p-4 rounded-xl border border-border/50">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search clients..." 
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
            <option value="ALL">All Active & Invited</option>
            <option value="ACTIVE">Active Only</option>
            <option value="INVITED">Invited Only</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 rounded-xl bg-accent/50 animate-pulse border border-border/50"></div>
          ))}
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center rounded-xl border border-border border-dashed bg-card/20">
          <div className="h-16 w-16 rounded-full bg-accent flex items-center justify-center mb-6">
            <User className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-display font-semibold text-foreground mb-2">No clients found</h3>
          <p className="text-muted-foreground mb-6 max-w-md">Build your coaching community by adding your first client.</p>
          <Button onClick={() => setIsAdding(true)} variant="outline" className="h-11">
            <Plus className="h-4 w-4 mr-2" /> Add Client
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredClients.map(client => (
            <Card 
              key={client.id} 
              className="overflow-hidden hover:border-primary/50 transition-colors cursor-pointer bg-card/50 backdrop-blur group"
              onClick={() => navigate(`/owner/clients/${client.id}`)}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="h-12 w-12 rounded-full bg-accent flex flex-shrink-0 items-center justify-center font-display font-semibold text-primary text-lg">
                      {client.firstName?.[0]}{client.lastName?.[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-foreground truncate text-lg">{client.firstName} {client.lastName}</div>
                      <div className="text-sm text-muted-foreground truncate">{client.email}</div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 flex items-center justify-between">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-sm text-xs font-medium tracking-wide uppercase ${
                    client.status === 'ACTIVE' ? 'bg-green-500/10 text-green-400' :
                    client.status === 'INVITED' ? 'bg-blue-500/10 text-blue-400' :
                    'bg-accent text-muted-foreground'
                  }`}>
                    {client.status || 'Active'}
                  </span>
                  
                  <div className="text-xs text-muted-foreground flex items-center group-hover:text-primary transition-colors">
                    View Profile <ArrowRight className="h-3 w-3 ml-1" />
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
