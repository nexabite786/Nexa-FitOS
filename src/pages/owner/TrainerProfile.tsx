import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuthStore } from '../../store/authStore';
import { useTenantStore } from '../../store/tenantStore';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { ArrowLeft, Edit, Mail, Phone, Calendar, User, Users, Activity, Target, ArrowRight } from 'lucide-react';
import { TrainerAnalyticsView } from '../../components/analytics/TrainerAnalyticsView';

export function TrainerProfile() {
  const { user } = useAuthStore();
  const { tenantId } = useTenantStore();
  const { trainerId } = useParams();
  const navigate = useNavigate();
  
  const [trainer, setTrainer] = useState<any>(null);
  const [assignedClients, setAssignedClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState<'not-found' | 'permission-denied' | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);

  useEffect(() => {
    if (!tenantId || !trainerId) return;
    loadTrainerAndClients();
  }, [tenantId, trainerId]);

  const loadTrainerAndClients = async () => {
    setLoading(true);
    setErrorState(null);
    try {
      const trainerRef = doc(db, 'tenants', tenantId as string, 'trainers', trainerId as string);
      const trainerSnap = await getDoc(trainerRef);
      
      if (trainerSnap.exists()) {
        const trainerData = trainerSnap.data();
        setTrainer({ id: trainerSnap.id, ...trainerData });
        
        // Fetch assigned clients
        const clientsQuery = query(
          collection(db, 'tenants', tenantId as string, 'clients'),
          where('trainerId', '==', trainerId)
        );
        const clientsSnap = await getDocs(clientsQuery);
        setAssignedClients(clientsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
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

  const handleDeactivate = async () => {
    if (!tenantId || !trainerId || !trainer || !user) return;
    
    setIsDeactivating(true);
    try {
      const trainerRef = doc(db, 'tenants', tenantId, 'trainers', trainerId);
      await updateDoc(trainerRef, {
        status: 'INACTIVE'
      });

      // Audit Log
      await setDoc(doc(collection(db, 'tenants', tenantId, 'auditLogs'), Date.now().toString()), {
        action: 'TRAINER_DEACTIVATED',
        performedBy: user.uid,
        targetId: trainerId,
        timestamp: new Date().toISOString()
      });

      setTrainer({ ...trainer, status: 'INACTIVE' });
      setShowDeactivateConfirm(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeactivating(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto animate-pulse">
        <div className="h-8 w-32 bg-accent/50 rounded"></div>
        <div className="bg-card/50 rounded-xl border border-border/50 p-8 flex items-start gap-6">
          <div className="w-24 h-24 bg-accent/50 rounded-full"></div>
          <div className="space-y-4 flex-1">
            <div className="h-8 bg-accent/50 rounded w-1/3"></div>
            <div className="h-4 bg-accent/50 rounded w-1/4"></div>
            <div className="h-4 bg-accent/50 rounded w-1/5"></div>
          </div>
        </div>
      </div>
    );
  }

  if (errorState === 'permission-denied') {
    return (
      <div className="text-center py-20 bg-card rounded-xl border border-border/50 mt-8">
        <h2 className="text-2xl font-display font-semibold text-foreground">Access Denied</h2>
        <p className="text-muted-foreground mt-2 mb-6">You don't have permission to view this coach.</p>
        <Button onClick={() => navigate('/owner/trainers')} className="h-11">
          Return to Coaches
        </Button>
      </div>
    );
  }

  if (errorState === 'not-found' || !trainer) {
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

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Target },
    { id: 'analytics', label: 'Client Analytics & Insights', icon: Activity },
    { id: 'clients', label: 'Assigned Clients', icon: Users },
    { id: 'profile', label: 'Profile', icon: User }
  ];

  const activeClientCount = assignedClients.filter(c => c.status !== 'ARCHIVED').length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 animate-in fade-in duration-500">
      <div className="flex items-center gap-2 mb-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/owner/trainers')} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Coaches
        </Button>
      </div>

      {/* Header Profile Card */}
      <div className="bg-card/80 backdrop-blur rounded-xl border border-border/50 p-6 md:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 w-full md:w-auto min-w-0">
            <div className="h-16 w-16 sm:h-20 sm:w-20 md:h-24 md:w-24 rounded-full bg-accent flex items-center justify-center text-2xl md:text-3xl font-display font-semibold text-primary flex-shrink-0">
              {trainer.firstName?.[0]}{trainer.lastName?.[0]}
            </div>
            <div className="min-w-0 w-full">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-1">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-foreground truncate">{trainer.firstName} {trainer.lastName}</h1>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-sm text-[10px] font-bold tracking-wider uppercase ${
                  trainer.status === 'ACTIVE' ? 'bg-green-500/10 text-green-400' :
                  trainer.status === 'INVITED' ? 'bg-blue-500/10 text-blue-400' :
                  'bg-accent text-muted-foreground'
                }`}>
                  {trainer.status || 'active'}
                </span>
              </div>
              <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6 text-sm text-muted-foreground mt-3 min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <Mail className="h-4 w-4 flex-shrink-0 text-muted-foreground/70" />
                  <span className="truncate">{trainer.email || 'No email provided'}</span>
                </div>
                {trainer.phone && (
                  <div className="flex items-center gap-2 min-w-0">
                    <Phone className="h-4 w-4 flex-shrink-0 text-muted-foreground/70" />
                    <span className="truncate">{trainer.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 whitespace-nowrap">
                  <Calendar className="h-4 w-4 flex-shrink-0 text-muted-foreground/70" />
                  <span>Joined {new Date(trainer.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-row items-center gap-3 w-full md:w-auto mt-4 md:mt-0 pt-4 md:pt-0 border-t border-border/50 md:border-0">
            <Button variant="outline" className="flex-1 md:flex-none h-10 border-border/50 bg-background/50 hover:bg-accent" onClick={() => navigate(`/owner/trainers/${trainer.id}/edit`)}>
              <Edit className="h-4 w-4 mr-2" /> Edit Coach
            </Button>
            {trainer.status !== 'INACTIVE' && (
              <Button variant="outline" className="flex-1 md:flex-none h-10 border-red-900/30 text-red-400 hover:bg-red-950/20 hover:text-red-400" onClick={() => setShowDeactivateConfirm(true)}>
                Deactivate
              </Button>
            )}
          </div>
        </div>
      </div>

      {showDeactivateConfirm && (
        <Card className="border-red-900/50 bg-red-950/10 shadow-none">
          <CardContent className="pt-6">
            <h3 className="text-lg font-display font-semibold text-red-400 mb-2">Deactivate this coach?</h3>
            <p className="text-red-400/80 text-sm mb-6 max-w-2xl">
              Existing client records and historical data will be preserved. This coach will no longer be active in the team lists or able to log in.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="border-red-900/30 bg-transparent text-foreground hover:bg-red-950/20" onClick={() => setShowDeactivateConfirm(false)} disabled={isDeactivating}>Cancel</Button>
              <Button variant="destructive" className="bg-red-500 hover:bg-red-600 text-white" onClick={handleDeactivate} disabled={isDeactivating}>
                {isDeactivating ? 'Deactivating...' : 'Deactivate Coach'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <div className="w-full">
        <div className="border-b border-border/50 overflow-x-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <nav className="flex space-x-8 min-w-max px-2" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 py-4 px-1 border-b-2 text-sm font-medium whitespace-nowrap transition-colors
                    ${activeTab === tab.id 
                      ? 'border-primary text-primary' 
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                    }
                  `}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="pt-4">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-6">
              <Card className="border-border/50 bg-card/50 backdrop-blur shadow-none">
                <CardHeader className="pb-3 border-b border-border/50">
                  <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Coach Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5 pt-5">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Status</div>
                    <div className="font-medium text-foreground capitalize">{trainer.status?.toLowerCase() || 'Active'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Specialization</div>
                    <div className="font-medium text-foreground">
                      {trainer.specialization || 'General Fitness'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Active Roster</div>
                    <div className="font-medium text-foreground">{activeClientCount} Clients</div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="lg:col-span-2">
              <Card className="h-full border-dashed border-2 border-border/50 bg-transparent shadow-none">
                <CardContent className="flex flex-col items-center justify-center h-full min-h-[350px] text-center p-6 md:p-12">
                  <div className="h-20 w-20 rounded-full bg-accent flex items-center justify-center mb-6">
                    <Activity className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-display font-semibold text-foreground mb-3">Coach Performance Analytics</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Client retention, program delivery stats, and performance metrics will populate here automatically.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && tenantId && trainer && (
          <TrainerAnalyticsView tenantId={tenantId} trainerId={trainer.id} />
        )}

        {activeTab === 'clients' && (
          <div className="space-y-4">
            {assignedClients.length === 0 ? (
              <Card className="border-dashed border-2 border-border/50 bg-transparent shadow-none">
                <CardContent className="flex flex-col items-center justify-center min-h-[400px] text-center p-6 md:p-12">
                  <div className="h-20 w-20 rounded-full bg-accent flex items-center justify-center mb-6">
                    <Users className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <h3 className="text-2xl font-display font-semibold text-foreground mb-3">No Active Assignments</h3>
                  <p className="text-muted-foreground max-w-md mx-auto mb-6">
                    This coach currently has no clients on their roster. Assign clients from the client management panel.
                  </p>
                  <Button variant="outline" onClick={() => navigate('/owner/clients')} className="h-11">
                    Manage Clients
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {assignedClients.map(client => (
                  <Card 
                    key={client.id}
                    className="overflow-hidden hover:border-primary/50 transition-colors cursor-pointer bg-card/50 backdrop-blur group"
                    onClick={() => navigate(`/owner/clients/${client.id}`)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4 mb-4 min-w-0">
                        <div className="h-12 w-12 rounded-full bg-accent flex flex-shrink-0 items-center justify-center font-display font-semibold text-primary text-lg">
                          {client.firstName?.[0]}{client.lastName?.[0]}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-foreground truncate text-lg">{client.firstName} {client.lastName}</div>
                          <div className="text-sm text-muted-foreground truncate">{client.email}</div>
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-sm pt-4 border-t border-border/50">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-sm text-[10px] font-bold uppercase tracking-wider ${
                          client.status === 'ACTIVE' ? 'bg-green-500/10 text-green-400' :
                          client.status === 'INVITED' ? 'bg-blue-500/10 text-blue-400' :
                          'bg-accent text-muted-foreground'
                        }`}>
                          {client.status || 'active'}
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
        )}

        {activeTab === 'profile' && (
          <Card className="border-border/50 bg-card/50 backdrop-blur shadow-none">
            <CardHeader className="border-b border-border/50">
              <CardTitle className="font-display">Coach Information</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-8">
                <div>
                  <dt className="text-sm font-medium text-muted-foreground mb-1">First Name</dt>
                  <dd className="text-lg text-foreground break-words">{trainer.firstName}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground mb-1">Last Name</dt>
                  <dd className="text-lg text-foreground break-words">{trainer.lastName}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground mb-1">Email Address</dt>
                  <dd className="text-lg text-foreground break-words">{trainer.email}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground mb-1">Phone Number</dt>
                  <dd className="text-lg text-foreground break-words">{trainer.phone || <span className="text-muted-foreground/50 italic">Not provided</span>}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-muted-foreground mb-1">Specialization</dt>
                  <dd className="text-lg text-foreground break-words">{trainer.specialization || <span className="text-muted-foreground/50 italic">Not specified</span>}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
