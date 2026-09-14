import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, collection, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuthStore } from '../../store/authStore';
import { useTenantStore } from '../../store/tenantStore';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { 
  ArrowLeft, Edit, Mail, Phone, Calendar, User, 
  Activity, Dumbbell, Flame, LineChart, ClipboardCheck, 
  CheckCircle, MessageSquare, UserPlus, Pause, Play, 
  XCircle, CheckCircle2, AlertTriangle, ExternalLink, Clock
} from 'lucide-react';
import { ProgramAssignment } from '../../types/assignment';
import { 
  fetchClientAssignments, 
  pauseProgramAssignment, 
  resumeProgramAssignment, 
  cancelProgramAssignment,
  formatReadableDate 
} from '../../lib/assignmentService';
import { AssignProgramModal } from '../../components/programs/AssignProgramModal';
import { ClientProgressView } from '../../components/analytics/ClientProgressView';

export function ClientProfile() {
  const { user } = useAuthStore();
  const { tenantId } = useTenantStore();
  const { clientId } = useParams();
  const navigate = useNavigate();
  
  const [client, setClient] = useState<any>(null);
  const [trainer, setTrainer] = useState<any>(null);
  const [assignments, setAssignments] = useState<ProgramAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState<'not-found' | 'permission-denied' | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);

  // Assignment actions
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignmentToPause, setAssignmentToPause] = useState<ProgramAssignment | null>(null);
  const [assignmentToCancel, setAssignmentToCancel] = useState<ProgramAssignment | null>(null);
  const [assignmentActionLoading, setAssignmentActionLoading] = useState(false);

  useEffect(() => {
    if (!tenantId || !clientId) return;
    loadClientData();
  }, [tenantId, clientId]);

  const loadClientData = async () => {
    setLoading(true);
    setErrorState(null);
    try {
      const clientRef = doc(db, 'tenants', tenantId as string, 'clients', clientId as string);
      const [clientSnap, clientAssignments] = await Promise.all([
        getDoc(clientRef),
        fetchClientAssignments(tenantId as string, clientId as string)
      ]);
      
      if (clientSnap.exists()) {
        const clientData = clientSnap.data();
        setClient({ id: clientSnap.id, ...clientData });
        setAssignments(clientAssignments);
        
        if (clientData.trainerId) {
          const trainerRef = doc(db, 'tenants', tenantId as string, 'trainers', clientData.trainerId);
          const trainerSnap = await getDoc(trainerRef);
          if (trainerSnap.exists()) {
            setTrainer({ id: trainerSnap.id, ...trainerSnap.data() });
          }
        }
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

  const handlePauseAssignment = async () => {
    if (!tenantId || !assignmentToPause || !user) return;
    try {
      setAssignmentActionLoading(true);
      await pauseProgramAssignment(tenantId, assignmentToPause.id, user.uid, {
        programId: assignmentToPause.programId,
        clientId: client?.id,
        programName: assignmentToPause.programName,
        clientName: `${client?.firstName} ${client?.lastName}`
      });
      setAssignmentToPause(null);
      await loadClientData();
    } catch (err: any) {
      console.error('Failed to pause assignment:', err);
      alert('Failed to pause program assignment.');
    } finally {
      setAssignmentActionLoading(false);
    }
  };

  const handleResumeAssignment = async (assign: ProgramAssignment) => {
    if (!tenantId || !user) return;
    try {
      setAssignmentActionLoading(true);
      await resumeProgramAssignment(tenantId, assign.id, user.uid, {
        programId: assign.programId,
        clientId: client?.id,
        programName: assign.programName,
        clientName: `${client?.firstName} ${client?.lastName}`
      });
      await loadClientData();
    } catch (err: any) {
      console.error('Failed to resume assignment:', err);
      alert('Failed to resume program assignment.');
    } finally {
      setAssignmentActionLoading(false);
    }
  };

  const handleCancelAssignment = async () => {
    if (!tenantId || !assignmentToCancel || !user) return;
    try {
      setAssignmentActionLoading(true);
      await cancelProgramAssignment(tenantId, assignmentToCancel.id, user.uid, {
        programId: assignmentToCancel.programId,
        clientId: client?.id,
        programName: assignmentToCancel.programName,
        clientName: `${client?.firstName} ${client?.lastName}`,
        wasActive: assignmentToCancel.status === 'ACTIVE' || assignmentToCancel.status === 'PAUSED'
      });
      setAssignmentToCancel(null);
      await loadClientData();
    } catch (err: any) {
      console.error('Failed to cancel assignment:', err);
      alert('Failed to cancel program assignment.');
    } finally {
      setAssignmentActionLoading(false);
    }
  };

  const handleArchive = async () => {
    if (!tenantId || !clientId || !client || !user) return;
    
    setIsArchiving(true);
    try {
      const clientRef = doc(db, 'tenants', tenantId, 'clients', clientId);
      await updateDoc(clientRef, {
        status: 'ARCHIVED'
      });

      await setDoc(doc(collection(db, 'tenants', tenantId, 'auditLogs'), Date.now().toString()), {
        action: 'CLIENT_ARCHIVED',
        performedBy: user.uid,
        targetId: clientId,
        timestamp: new Date().toISOString()
      });

      setClient({ ...client, status: 'ARCHIVED' });
      setShowArchiveConfirm(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsArchiving(false);
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
        <p className="text-muted-foreground mt-2 mb-6">You don't have permission to view this client's profile.</p>
        <Button onClick={() => navigate('/owner/clients')} className="h-11">
          Return to Clients
        </Button>
      </div>
    );
  }

  if (errorState === 'not-found' || !client) {
    return (
      <div className="text-center py-20 bg-card rounded-xl border border-border/50 mt-8">
        <h2 className="text-2xl font-display font-semibold text-foreground">Client Not Found</h2>
        <p className="text-muted-foreground mt-2 mb-6">The client profile you're looking for doesn't exist.</p>
        <Button onClick={() => navigate('/owner/clients')} className="h-11">
          Return to Clients
        </Button>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'training', label: 'Training', icon: Dumbbell },
    { id: 'nutrition', label: 'Nutrition', icon: Flame },
    { id: 'progress', label: 'Progress', icon: LineChart },
    { id: 'checkins', label: 'Check-ins', icon: ClipboardCheck },
    { id: 'habits', label: 'Habits', icon: CheckCircle },
    { id: 'messages', label: 'Messages', icon: MessageSquare },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 animate-in fade-in duration-500">
      <div className="flex items-center gap-2 mb-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/owner/clients')} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Clients
        </Button>
      </div>

      {/* Header Profile Card */}
      <div className="bg-card/80 backdrop-blur rounded-xl border border-border/50 p-6 md:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 w-full md:w-auto min-w-0">
            <div className="h-16 w-16 sm:h-20 sm:w-20 md:h-24 md:w-24 rounded-full bg-accent flex items-center justify-center text-2xl md:text-3xl font-display font-semibold text-primary flex-shrink-0">
              {client.firstName?.[0]}{client.lastName?.[0]}
            </div>
            <div className="min-w-0 w-full">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-1">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-foreground truncate">{client.firstName} {client.lastName}</h1>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-sm text-[10px] font-bold tracking-wider uppercase ${
                  client.status === 'ACTIVE' ? 'bg-green-500/10 text-green-400' :
                  client.status === 'INVITED' ? 'bg-blue-500/10 text-blue-400' :
                  'bg-accent text-muted-foreground'
                }`}>
                  {client.status || 'Active'}
                </span>
              </div>
              <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6 text-sm text-muted-foreground mt-3 min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <Mail className="h-4 w-4 flex-shrink-0 text-muted-foreground/70" />
                  <span className="truncate">{client.email || 'No email provided'}</span>
                </div>
                {client.phone && (
                  <div className="flex items-center gap-2 min-w-0">
                    <Phone className="h-4 w-4 flex-shrink-0 text-muted-foreground/70" />
                    <span className="truncate">{client.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 whitespace-nowrap">
                  <Calendar className="h-4 w-4 flex-shrink-0 text-muted-foreground/70" />
                  <span>Joined {new Date(client.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-row items-center gap-3 w-full md:w-auto mt-4 md:mt-0 pt-4 md:pt-0 border-t border-border/50 md:border-0">
            {client.status !== 'ARCHIVED' && (
              <Button 
                className="flex-1 md:flex-none h-10 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold" 
                onClick={() => setShowAssignModal(true)}
              >
                <UserPlus className="h-4 w-4 mr-2" /> Assign Program
              </Button>
            )}
            <Button variant="outline" className="flex-1 md:flex-none h-10 border-border/50 bg-background/50 hover:bg-accent" onClick={() => navigate(`/owner/clients/${client.id}/edit`)}>
              <Edit className="h-4 w-4 mr-2" /> Edit Profile
            </Button>
            {client.status !== 'ARCHIVED' && (
              <Button variant="outline" className="flex-1 md:flex-none h-10 border-red-900/30 text-red-400 hover:bg-red-950/20 hover:text-red-400" onClick={() => setShowArchiveConfirm(true)}>
                Archive
              </Button>
            )}
          </div>
        </div>
      </div>

      {showArchiveConfirm && (
        <Card className="border-red-900/50 bg-red-950/10 shadow-none">
          <CardContent className="pt-6">
            <h3 className="text-lg font-display font-semibold text-red-400 mb-2">Archive this client?</h3>
            <p className="text-red-400/80 text-sm mb-6 max-w-2xl">
              This will remove the client from active lists but preserve their records. They will no longer be able to log in or receive new programs.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="border-red-900/30 bg-transparent text-foreground hover:bg-red-950/20" onClick={() => setShowArchiveConfirm(false)} disabled={isArchiving}>Cancel</Button>
              <Button variant="destructive" className="bg-red-500 hover:bg-red-600 text-white" onClick={handleArchive} disabled={isArchiving}>
                {isArchiving ? 'Archiving...' : 'Archive Client'}
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
                  <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Account Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5 pt-5">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Status</div>
                    <div className="font-medium text-foreground capitalize">{client.status?.toLowerCase() || 'Active'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Assigned Coach</div>
                    <div className="font-medium text-foreground flex items-center gap-2">
                      {trainer ? (
                        <>
                          <div className="h-6 w-6 rounded-full bg-accent flex items-center justify-center text-[10px] text-primary">
                            {trainer.firstName?.[0]}
                          </div>
                          {trainer.firstName} {trainer.lastName}
                        </>
                      ) : (
                        <span className="text-muted-foreground italic">Unassigned</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Timezone</div>
                    <div className="font-medium text-foreground">{client.timezone || 'Not set'}</div>
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
                  <h3 className="text-xl font-display font-semibold text-foreground mb-3">Client Analytics Overview</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Program compliance, vital metrics, and recent achievements will be visualized here as data is logged.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <Card className="border-border/50 bg-card/50 backdrop-blur shadow-none">
            <CardHeader className="border-b border-border/50">
              <CardTitle className="font-display">Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-8">
                <div>
                  <dt className="text-sm font-medium text-muted-foreground mb-1">First Name</dt>
                  <dd className="text-lg text-foreground break-words">{client.firstName}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground mb-1">Last Name</dt>
                  <dd className="text-lg text-foreground break-words">{client.lastName}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground mb-1">Email Address</dt>
                  <dd className="text-lg text-foreground break-words">{client.email}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground mb-1">Phone Number</dt>
                  <dd className="text-lg text-foreground break-words">{client.phone || <span className="text-muted-foreground/50 italic">Not provided</span>}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        )}

        {activeTab === 'training' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-display font-bold text-foreground">Training Programs</h2>
                <p className="text-xs text-muted-foreground">
                  Assigned training cycles, schedules, and periodization history for {client.firstName}.
                </p>
              </div>
              {client.status !== 'ARCHIVED' && (
                <Button
                  className="h-9 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs"
                  onClick={() => setShowAssignModal(true)}
                >
                  <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                  Assign Program
                </Button>
              )}
            </div>

            {/* Current Program Section */}
            {(() => {
              const activeAssignment = assignments.find(
                (a) => a.status === 'ACTIVE' || a.status === 'PAUSED'
              );
              const historyAssignments = assignments.filter(
                (a) => a.id !== activeAssignment?.id
              );

              return (
                <div className="space-y-6">
                  <div className="space-y-3">
                    <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <Dumbbell className="w-3.5 h-3.5 text-amber-400" />
                      <span>Current Program</span>
                    </div>

                    {activeAssignment ? (
                      <Card className="border border-border/60 bg-card/60 backdrop-blur p-6 rounded-2xl shadow-sm">
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-5 border-b border-border/50">
                          <div>
                            <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                              <h3
                                className="text-xl font-bold text-foreground hover:text-amber-400 transition-colors cursor-pointer"
                                onClick={() => navigate(`/owner/programs/${activeAssignment.programId}`)}
                              >
                                {activeAssignment.programName}
                              </h3>
                              {activeAssignment.status === 'ACTIVE' ? (
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Active</span>
                                </span>
                              ) : (
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1.5">
                                  <Pause className="w-3.5 h-3.5" />
                                  <span>Paused</span>
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground max-w-xl">
                              {activeAssignment.programSnapshot?.description || 'Custom structured periodization program.'}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/owner/programs/${activeAssignment.programId}`)}
                              className="h-8 text-xs border-border/70 bg-card/80 text-foreground hover:bg-accent"
                            >
                              <ExternalLink className="w-3.5 h-3.5 mr-1" />
                              View Program
                            </Button>

                            {activeAssignment.status === 'ACTIVE' ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setAssignmentToPause(activeAssignment)}
                                disabled={assignmentActionLoading}
                                className="h-8 text-xs border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                              >
                                <Pause className="w-3.5 h-3.5 mr-1" />
                                Pause
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleResumeAssignment(activeAssignment)}
                                disabled={assignmentActionLoading}
                                className="h-8 text-xs border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                              >
                                <Play className="w-3.5 h-3.5 mr-1" />
                                Resume
                              </Button>
                            )}

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setAssignmentToCancel(activeAssignment)}
                              disabled={assignmentActionLoading}
                              className="h-8 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10"
                            >
                              <XCircle className="w-3.5 h-3.5 mr-1" />
                              Cancel
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-5">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-muted-foreground block">Start Date</span>
                            <span className="text-sm font-semibold text-foreground flex items-center gap-1.5 mt-0.5">
                              <Calendar className="w-3.5 h-3.5 text-amber-400" />
                              {formatReadableDate(activeAssignment.startDate)}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-muted-foreground block">Expected End</span>
                            <span className="text-sm font-semibold text-foreground flex items-center gap-1.5 mt-0.5">
                              <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                              {formatReadableDate(activeAssignment.endDate)}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-muted-foreground block">Duration</span>
                            <span className="text-sm font-semibold text-foreground flex items-center gap-1.5 mt-0.5">
                              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                              {activeAssignment.programSnapshot?.durationWeeks || 0} Weeks ({activeAssignment.programSnapshot?.workoutCount || 0} Workouts)
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-muted-foreground block">Assigned Coach</span>
                            <span className="text-sm font-semibold text-foreground flex items-center gap-1.5 mt-0.5">
                              <User className="w-3.5 h-3.5 text-muted-foreground" />
                              {activeAssignment.trainerName || (trainer ? `${trainer.firstName} ${trainer.lastName}` : 'Unassigned')}
                            </span>
                          </div>
                        </div>
                      </Card>
                    ) : (
                      <div className="p-8 text-center rounded-2xl bg-card/40 border border-dashed border-border/60 space-y-3">
                        <div className="w-10 h-10 rounded-full bg-accent text-muted-foreground flex items-center justify-center mx-auto">
                          <Dumbbell className="w-5 h-5 text-amber-400" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-foreground">No Active Program Assigned</h4>
                          <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1">
                            {client.firstName} does not currently have an active training program. Assign a published program to organize their workouts into a calendar schedule.
                          </p>
                        </div>
                        {client.status !== 'ARCHIVED' && (
                          <Button
                            size="sm"
                            onClick={() => setShowAssignModal(true)}
                            className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs"
                          >
                            <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                            Assign Program
                          </Button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Program History Section */}
                  <div className="space-y-3 pt-2">
                    <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>Program History</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-accent text-foreground">
                        {historyAssignments.length}
                      </span>
                    </div>

                    {historyAssignments.length === 0 ? (
                      <div className="p-6 rounded-xl border border-border/50 bg-card/30 text-center text-xs text-muted-foreground">
                        No previous program history.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {historyAssignments.map((h) => (
                          <div
                            key={h.id}
                            className="p-4 rounded-xl border border-border/60 bg-card/50 flex flex-col justify-between space-y-3 hover:border-border transition-colors"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h4 className="text-sm font-bold text-foreground">{h.programName}</h4>
                                <div className="text-xs text-muted-foreground mt-0.5">
                                  {formatReadableDate(h.startDate)} → {formatReadableDate(h.endDate)}
                                </div>
                              </div>
                              <div>
                                {h.status === 'COMPLETED' && (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                    Completed
                                  </span>
                                )}
                                {h.status === 'CANCELLED' && (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-800 text-zinc-400 border border-zinc-700">
                                    Cancelled
                                  </span>
                                )}
                                {h.status === 'PAUSED' && (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                    Paused
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center justify-between text-xs pt-2 border-t border-border/50">
                              <span className="text-muted-foreground">
                                Coach: <strong className="text-foreground font-medium">{h.trainerName || 'Unassigned'}</strong>
                              </span>
                              <button
                                type="button"
                                onClick={() => navigate(`/owner/programs/${h.programId}`)}
                                className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1"
                              >
                                <span>View Program</span>
                                <ExternalLink className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {activeTab === 'progress' && tenantId && client && (
          <ClientProgressView
            tenantId={tenantId}
            clientId={client.id}
            clientName={`${client.firstName || ''} ${client.lastName || ''}`.trim()}
          />
        )}

        {['nutrition', 'checkins', 'habits', 'messages'].includes(activeTab) && (
          <Card className="border-dashed border-2 border-border/50 bg-transparent shadow-none">
            <CardContent className="flex flex-col items-center justify-center min-h-[400px] text-center p-6 md:p-12">
              <div className="h-20 w-20 bg-accent rounded-full flex items-center justify-center mb-6">
                {activeTab === 'nutrition' && <Flame className="h-10 w-10 text-muted-foreground" />}
                {activeTab === 'messages' && <MessageSquare className="h-10 w-10 text-muted-foreground" />}
                {['progress', 'checkins', 'habits'].includes(activeTab) && <LineChart className="h-10 w-10 text-muted-foreground" />}
              </div>
              <h3 className="text-2xl font-display font-semibold text-foreground capitalize mb-3">{activeTab} Module</h3>
              <p className="text-muted-foreground max-w-md mx-auto leading-relaxed">
                This feature is part of the premium suite rollout. 
                Configure advanced {activeTab} settings and workflows here when available.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Confirmation Modal: Pause Assignment */}
      {assignmentToPause && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl max-w-md w-full space-y-4 shadow-xl">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Pause className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">Pause Program Assignment?</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                This will pause the current program schedule for <strong className="text-zinc-200">{client.firstName} {client.lastName}</strong>. You can resume their schedule at any time.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAssignmentToPause(null)}
                className="text-xs font-semibold text-zinc-400 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handlePauseAssignment}
                disabled={assignmentActionLoading}
                className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs"
              >
                {assignmentActionLoading ? 'Pausing...' : 'Confirm Pause'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Cancel Assignment */}
      {assignmentToCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl max-w-md w-full space-y-4 shadow-xl">
            <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">Cancel Program Assignment?</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Are you sure you want to cancel the assignment of <strong className="text-zinc-200">{assignmentToCancel.programName}</strong> for <strong className="text-zinc-200">{client.firstName} {client.lastName}</strong>? The assignment will be marked as Cancelled in the client's history.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAssignmentToCancel(null)}
                className="text-xs font-semibold text-zinc-400 hover:text-white"
              >
                Keep Active
              </Button>
              <Button
                size="sm"
                onClick={handleCancelAssignment}
                disabled={assignmentActionLoading}
                className="bg-red-600 hover:bg-red-500 text-white font-bold text-xs"
              >
                {assignmentActionLoading ? 'Cancelling...' : 'Confirm Cancel'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Assign Program to Client */}
      <AssignProgramModal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        clientId={client.id}
        onAssigned={loadClientData}
      />
    </div>
  );
}
