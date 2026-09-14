import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuthStore } from '../../store/authStore';
import { useTenantStore } from '../../store/tenantStore';
import { Program, ProgramWeek, ProgramScheduleItem, Workout } from '../../types/program';
import {
  calculateProgramEndDate,
  buildSchedulePreview,
  checkExistingActiveAssignment,
  createProgramAssignment,
  formatDateToYMD
} from '../../lib/assignmentService';
import { fetchProgramWithWorkouts } from '../../lib/programService';
import { fetchProgramWeeksAndSchedule } from '../../lib/scheduleService';
import {
  X,
  Calendar,
  User,
  Search,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Clock,
  Dumbbell,
  ChevronRight,
  ChevronDown,
  Layers,
  Sparkles,
  Info,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';

interface ClientOption {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
  trainerId?: string;
  trainerName?: string;
}

interface TrainerOption {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface AssignProgramModalProps {
  isOpen: boolean;
  onClose: () => void;
  programId?: string;
  clientId?: string;
  onAssigned?: (assignmentId: string) => void;
}

export function AssignProgramModal({
  isOpen,
  onClose,
  programId: initialProgramId,
  clientId: initialClientId,
  onAssigned
}: AssignProgramModalProps) {
  const { user } = useAuthStore();
  const { tenantId, memberData, tenantData } = useTenantStore();
  const navigate = useNavigate();

  // Selected entities
  const [selectedProgramId, setSelectedProgramId] = useState<string>(initialProgramId || '');
  const [selectedClientId, setSelectedClientId] = useState<string>(initialClientId || '');

  // Data lists
  const [availablePrograms, setAvailablePrograms] = useState<Program[]>([]);
  const [availableClients, setAvailableClients] = useState<ClientOption[]>([]);
  const [trainers, setTrainers] = useState<TrainerOption[]>([]);

  // Detailed program data for schedule preview & snapshots
  const [programData, setProgramData] = useState<Program | null>(null);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [weeks, setWeeks] = useState<ProgramWeek[]>([]);
  const [scheduleItems, setScheduleItems] = useState<ProgramScheduleItem[]>([]);

  // Form State
  const [startDate, setStartDate] = useState<string>(() => {
    // Default to today
    return formatDateToYMD(new Date());
  });
  const [notes, setNotes] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeWeekPreviewIndex, setActiveWeekPreviewIndex] = useState<number>(0);
  const [allowDuplicateOverride, setAllowDuplicateOverride] = useState<boolean>(false);

  // Status & loading
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingProgramDetails, setLoadingProgramDetails] = useState(false);
  const [hasExistingActive, setHasExistingActive] = useState(false);
  const [existingAssignmentId, setExistingAssignmentId] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successAssignmentId, setSuccessAssignmentId] = useState<string | null>(null);

  // Timezone resolution
  const tenantTimezone = tenantData?.timezone || 'America/New_York';

  // Sync initial props
  useEffect(() => {
    if (initialProgramId) setSelectedProgramId(initialProgramId);
    if (initialClientId) setSelectedClientId(initialClientId);
  }, [initialProgramId, initialClientId, isOpen]);

  // Load programs, clients, and trainers when modal opens
  useEffect(() => {
    if (!isOpen || !tenantId) return;

    let isMounted = true;
    const loadData = async () => {
      setLoadingInitial(true);
      setErrorMessage(null);
      setSuccessAssignmentId(null);
      setAllowDuplicateOverride(false);

      try {
        // 1. Fetch active programs
        const programsRef = collection(db, 'tenants', tenantId, 'programs');
        const progSnap = await getDocs(programsRef);
        const allProgs = progSnap.docs.map(d => ({ id: d.id, ...d.data() } as Program));
        
        // 2. Fetch trainers for lookup
        const trainersRef = collection(db, 'tenants', tenantId, 'trainers');
        const trainerSnap = await getDocs(trainersRef);
        const trainersList: TrainerOption[] = trainerSnap.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            email: data.email || ''
          };
        });

        // 3. Fetch clients (excluding ARCHIVED)
        const clientsRef = collection(db, 'tenants', tenantId, 'clients');
        const clientsSnap = await getDocs(clientsRef);
        let clientList: ClientOption[] = clientsSnap.docs
          .map(d => {
            const data = d.data();
            const matchedTrainer = trainersList.find(t => t.id === data.trainerId);
            return {
              id: d.id,
              firstName: data.firstName || '',
              lastName: data.lastName || '',
              email: data.email || '',
              status: data.status || 'ACTIVE',
              trainerId: data.trainerId || '',
              trainerName: matchedTrainer ? `${matchedTrainer.firstName} ${matchedTrainer.lastName}`.trim() : undefined
            };
          })
          .filter(c => c.status !== 'ARCHIVED');

        // Role restriction: If member is TRAINER, restrict to clients assigned to them
        if (memberData?.role === 'TRAINER') {
          const currentTrainer = trainersList.find(
            t => t.email.toLowerCase() === user?.email?.toLowerCase() || t.id === user?.uid
          );
          if (currentTrainer) {
            clientList = clientList.filter(c => c.trainerId === currentTrainer.id);
          }
        }

        if (isMounted) {
          setAvailablePrograms(allProgs);
          setTrainers(trainersList);
          setAvailableClients(clientList);

          // If no program selected and only one active exists, select it
          if (!selectedProgramId && allProgs.length > 0) {
            const firstActive = allProgs.find(p => p.status === 'ACTIVE');
            if (firstActive) setSelectedProgramId(firstActive.id);
          }
        }
      } catch (err: any) {
        console.error('Failed to load assignment data:', err);
        if (isMounted) setErrorMessage(err.message || 'Failed to load clients and programs.');
      } finally {
        if (isMounted) setLoadingInitial(false);
      }
    };

    loadData();
    return () => {
      isMounted = false;
    };
  }, [isOpen, tenantId, user, memberData]);

  // Load detailed program information whenever selectedProgramId changes
  useEffect(() => {
    if (!isOpen || !tenantId || !selectedProgramId) {
      setProgramData(null);
      setWorkouts([]);
      setWeeks([]);
      setScheduleItems([]);
      return;
    }

    let isMounted = true;
    const loadProgramDetails = async () => {
      setLoadingProgramDetails(true);
      setErrorMessage(null);
      try {
        const [progRes, scheduleRes] = await Promise.all([
          fetchProgramWithWorkouts(tenantId, selectedProgramId),
          fetchProgramWeeksAndSchedule(tenantId, selectedProgramId)
        ]);

        if (isMounted) {
          setProgramData(progRes.program);
          setWorkouts(progRes.workouts);
          setWeeks(scheduleRes.weeks);
          setScheduleItems(scheduleRes.scheduleItems);
        }
      } catch (err: any) {
        console.error('Failed to load program details for assignment:', err);
        if (isMounted) setErrorMessage(err.message || 'Could not load program details.');
      } finally {
        if (isMounted) setLoadingProgramDetails(false);
      }
    };

    loadProgramDetails();
    return () => {
      isMounted = false;
    };
  }, [isOpen, tenantId, selectedProgramId]);

  // Check for duplicate active assignment whenever selectedClientId or selectedProgramId changes
  useEffect(() => {
    if (!isOpen || !tenantId || !selectedClientId || !selectedProgramId) {
      setHasExistingActive(false);
      setExistingAssignmentId(undefined);
      return;
    }

    let isMounted = true;
    const checkDuplicate = async () => {
      try {
        const res = await checkExistingActiveAssignment(tenantId, selectedClientId, selectedProgramId);
        if (isMounted) {
          setHasExistingActive(res.hasActive);
          setExistingAssignmentId(res.assignmentId);
        }
      } catch (err) {
        console.error('Failed to check duplicate assignment:', err);
      }
    };

    checkDuplicate();
    return () => {
      isMounted = false;
    };
  }, [isOpen, tenantId, selectedClientId, selectedProgramId]);

  // Selected client record
  const selectedClient = useMemo(() => {
    return availableClients.find(c => c.id === selectedClientId) || null;
  }, [availableClients, selectedClientId]);

  // Filtered clients list for searching
  const filteredClients = useMemo(() => {
    if (!searchQuery.trim()) return availableClients;
    const q = searchQuery.toLowerCase().trim();
    return availableClients.filter(c => {
      const fullName = `${c.firstName} ${c.lastName}`.toLowerCase();
      return (
        fullName.includes(q) ||
        c.firstName.toLowerCase().includes(q) ||
        c.lastName.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q)
      );
    });
  }, [availableClients, searchQuery]);

  // End Date calculation
  const dateCalculation = useMemo(() => {
    if (!startDate || !programData) {
      return { endDateStr: '', formattedStart: '', formattedEnd: '' };
    }
    return calculateProgramEndDate(startDate, programData.durationWeeks || 1, tenantTimezone);
  }, [startDate, programData, tenantTimezone]);

  // Schedule Preview
  const schedulePreview = useMemo(() => {
    if (!startDate || !programData) return [];
    return buildSchedulePreview(
      startDate,
      programData.durationWeeks || 1,
      weeks,
      scheduleItems,
      workouts,
      tenantTimezone
    );
  }, [startDate, programData, weeks, scheduleItems, workouts, tenantTimezone]);

  const activeWeekPreview = schedulePreview[activeWeekPreviewIndex] || schedulePreview[0];

  // Submission handler
  const handleAssign = async () => {
    if (!tenantId || !user || !programData || !selectedClient) {
      setErrorMessage('Please select both a program and a client.');
      return;
    }

    // Rule: Only ACTIVE/PUBLISHED programs can be assigned
    if (programData.status === 'DRAFT') {
      setErrorMessage('Publish this program before assigning it to a client.');
      return;
    }
    if (programData.status === 'ARCHIVED') {
      setErrorMessage('This program is archived and cannot be newly assigned.');
      return;
    }

    // Duplicate check confirmation
    if (hasExistingActive && !allowDuplicateOverride) {
      setErrorMessage('This client already has this program assigned. Confirm to assign anyway.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const newAssignmentId = await createProgramAssignment(tenantId, {
        program: programData,
        client: selectedClient,
        startDate,
        assignedBy: user.uid,
        trainerName: selectedClient.trainerName || 'Unassigned',
        weeks,
        scheduleItems,
        workouts,
        notes,
        timezone: tenantTimezone
      });

      setSuccessAssignmentId(newAssignmentId);
      if (onAssigned) {
        onAssigned(newAssignmentId);
      }
    } catch (err: any) {
      console.error('Failed to create assignment:', err);
      setErrorMessage(err.message || 'Failed to assign program. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden my-auto text-zinc-100">
        {/* Modal Top Header */}
        <div className="px-6 py-5 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <span>Assign Training Program</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-medium border border-zinc-700/60">
                  NEXA FITOS
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Enroll client, configure start date, and verify automated training schedule.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Success Notification View */}
          {successAssignmentId ? (
            <div className="py-12 px-6 text-center space-y-6 max-w-lg mx-auto">
              <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto animate-in zoom-in-90 duration-300">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-white tracking-tight">Program Assigned Successfully</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  <strong className="text-white">{selectedClient?.firstName} {selectedClient?.lastName}</strong> has been enrolled into <strong className="text-amber-400">{programData?.name}</strong> starting <strong className="text-white">{dateCalculation.formattedStart}</strong> through <strong className="text-white">{dateCalculation.formattedEnd}</strong>.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 text-left space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-zinc-800">
                  <span className="text-zinc-400">Client:</span>
                  <span className="font-semibold text-zinc-200">{selectedClient?.firstName} {selectedClient?.lastName}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-800">
                  <span className="text-zinc-400">Program:</span>
                  <span className="font-semibold text-amber-400">{programData?.name}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-800">
                  <span className="text-zinc-400">Schedule Duration:</span>
                  <span className="text-zinc-200">{programData?.durationWeeks} Weeks ({dateCalculation.formattedStart} – {dateCalculation.formattedEnd})</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-zinc-400">Assignment ID:</span>
                  <span className="font-mono text-[11px] text-zinc-400">{successAssignmentId}</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
                <button
                  onClick={() => {
                    onClose();
                    if (selectedClient) navigate(`/owner/clients/${selectedClient.id}`);
                  }}
                  className="w-full sm:w-auto px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <User className="w-4 h-4" />
                  <span>View Client Profile</span>
                </button>
                <button
                  onClick={() => {
                    onClose();
                    if (programData) navigate(`/owner/programs/${programData.id}`);
                  }}
                  className="w-full sm:w-auto px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 border border-zinc-700/60"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>View Program Details</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Error Notification Banner */}
              {errorMessage && (
                <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-3 animate-in fade-in">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 leading-relaxed">{errorMessage}</div>
                </div>
              )}

              {/* 1. PROGRAM SELECTION / DISPLAY */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center justify-between">
                  <span>1. Select Program</span>
                  {programData && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                      programData.status === 'ACTIVE'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : programData.status === 'DRAFT'
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                    }`}>
                      {programData.status}
                    </span>
                  )}
                </label>

                {availablePrograms.length === 0 && !loadingInitial ? (
                  <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-400 text-center">
                    No programs found. Create and publish a program first.
                  </div>
                ) : (
                  <div className="relative">
                    <select
                      value={selectedProgramId}
                      onChange={e => setSelectedProgramId(e.target.value)}
                      className="w-full px-4 py-3 bg-zinc-900/90 border border-zinc-800 rounded-2xl text-xs text-white focus:outline-none focus:border-amber-500/60 appearance-none pr-10 transition-colors"
                    >
                      <option value="" disabled>Select a training program...</option>
                      {availablePrograms.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.durationWeeks} Weeks — {p.status})
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-zinc-400 absolute right-3.5 top-3.5 pointer-events-none" />
                  </div>
                )}

                {/* Validation Notice if DRAFT or ARCHIVED */}
                {programData && programData.status === 'DRAFT' && (
                  <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs flex items-center gap-2.5">
                    <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                    <span>Publish this program before assigning it to a client.</span>
                  </div>
                )}
                {programData && programData.status === 'ARCHIVED' && (
                  <div className="p-3.5 rounded-xl bg-zinc-800/80 border border-zinc-700/60 text-zinc-400 text-xs flex items-center gap-2.5">
                    <Info className="w-4 h-4 flex-shrink-0" />
                    <span>This program is archived and cannot be newly assigned.</span>
                  </div>
                )}
              </div>

              {/* 2. CLIENT SELECTION */}
              <div className="space-y-3 pt-2">
                <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center justify-between">
                  <span>2. Select Client</span>
                  {selectedClient && (
                    <span className="text-[11px] text-zinc-400 font-normal">
                      Assigned Coach: <strong className="text-zinc-200">{selectedClient.trainerName || 'Unassigned'}</strong>
                    </span>
                  )}
                </label>

                {availableClients.length === 0 && !loadingInitial ? (
                  <div className="p-6 rounded-2xl bg-zinc-900/80 border border-zinc-800 text-center space-y-3">
                    <p className="text-xs text-zinc-400">No active clients available.</p>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        navigate('/owner/clients');
                      }}
                      className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-xl transition-colors inline-flex items-center gap-2"
                    >
                      <span>Add Client</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Search Input */}
                    <div className="relative">
                      <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        placeholder="Search clients by name or email..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800/90 rounded-2xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500/60 transition-colors"
                      />
                    </div>

                    {/* Clients List Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                      {filteredClients.map(c => {
                        const isSelected = c.id === selectedClientId;
                        return (
                          <div
                            key={c.id}
                            onClick={() => setSelectedClientId(c.id)}
                            className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 ${
                              isSelected
                                ? 'bg-amber-500/10 border-amber-500/40 shadow-sm'
                                : 'bg-zinc-900/60 border-zinc-800/80 hover:bg-zinc-900 hover:border-zinc-700'
                            }`}
                          >
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold uppercase flex-shrink-0 ${
                              isSelected ? 'bg-amber-500 text-zinc-950' : 'bg-zinc-800 text-zinc-300'
                            }`}>
                              {c.firstName?.[0] || 'C'}{c.lastName?.[0] || ''}
                            </div>
                            <div className="min-w-0 flex-1 text-left">
                              <div className="flex items-center justify-between gap-1">
                                <h4 className="text-xs font-bold text-white truncate">
                                  {c.firstName} {c.lastName}
                                </h4>
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                                  {c.status}
                                </span>
                              </div>
                              <p className="text-[11px] text-zinc-400 truncate mt-0.5">{c.email}</p>
                              <div className="text-[10px] text-zinc-500 truncate mt-0.5">
                                Trainer: {c.trainerName || 'Unassigned'}
                              </div>
                            </div>
                            {isSelected && (
                              <CheckCircle2 className="w-4 h-4 text-amber-400 flex-shrink-0" />
                            )}
                          </div>
                        );
                      })}
                      {filteredClients.length === 0 && (
                        <div className="col-span-2 py-4 text-center text-xs text-zinc-500">
                          No matching clients found.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Duplicate Active Assignment Warning */}
                {hasExistingActive && (
                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs space-y-2 animate-in fade-in">
                    <div className="flex items-center gap-2 font-bold text-amber-400">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                      <span>This client already has this program assigned.</span>
                    </div>
                    <p className="text-[11px] text-amber-300/80 leading-relaxed">
                      Mohammed Usman currently has an active or paused assignment for this program. Assigning again will register a second concurrent assignment.
                    </p>
                    <label className="flex items-center gap-2 pt-1 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={allowDuplicateOverride}
                        onChange={e => setAllowDuplicateOverride(e.target.checked)}
                        className="rounded border-zinc-700 bg-zinc-900 text-amber-500 focus:ring-amber-500/20"
                      />
                      <span className="text-xs font-medium text-amber-200">
                        I understand, assign anyway
                      </span>
                    </label>
                  </div>
                )}
              </div>

              {/* 3. START DATE & DURATION CALCULATION */}
              <div className="space-y-3 pt-2">
                <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block">
                  3. Program Start Date & Duration
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Start Date Picker */}
                  <div className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-zinc-500 block">
                      Program Start Date
                    </span>
                    <input
                      type="date"
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500/60"
                    />
                    <span className="text-[10px] text-zinc-400 block truncate">
                      {dateCalculation.formattedStart || 'Select a date'}
                    </span>
                  </div>

                  {/* Program Duration */}
                  <div className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-zinc-500 block">
                      Total Duration
                    </span>
                    <div className="text-sm font-bold text-white mt-1">
                      {programData?.durationWeeks || 0} Weeks
                    </div>
                    <span className="text-[10px] text-zinc-400 block">
                      {(programData?.durationWeeks || 0) * 7} Calendar Days
                    </span>
                  </div>

                  {/* Calculated Expected End Date */}
                  <div className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-zinc-500 block">
                      Expected End Date
                    </span>
                    <div className="text-sm font-bold text-amber-400 mt-1 truncate">
                      {dateCalculation.formattedEnd || '—'}
                    </div>
                    <span className="text-[10px] text-zinc-500 block truncate">
                      Timezone: {tenantTimezone}
                    </span>
                  </div>
                </div>
              </div>

              {/* 4. SCHEDULE REVIEW / PREVIEW */}
              {schedulePreview.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                      4. Schedule Preview
                    </label>
                    <span className="text-[11px] text-zinc-500">
                      Week 1 begins on {dateCalculation.formattedStart}
                    </span>
                  </div>

                  {/* Week Selector Chips */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                    {schedulePreview.map((w, idx) => (
                      <button
                        key={w.weekNumber}
                        type="button"
                        onClick={() => setActiveWeekPreviewIndex(idx)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors flex-shrink-0 ${
                          activeWeekPreviewIndex === idx
                            ? 'bg-amber-500 text-zinc-950 font-bold'
                            : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                        }`}
                      >
                        Week {w.weekNumber}
                      </button>
                    ))}
                  </div>

                  {/* Active Week Day-by-Day Grid */}
                  {activeWeekPreview && (
                    <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-3">
                      <div className="flex items-center justify-between text-xs pb-2 border-b border-zinc-800">
                        <div className="flex items-center gap-2 font-bold text-white">
                          <Layers className="w-4 h-4 text-amber-400" />
                          <span>{activeWeekPreview.name}</span>
                          {activeWeekPreview.focus && (
                            <span className="text-zinc-400 font-normal">
                              — {activeWeekPreview.focus}
                            </span>
                          )}
                        </div>
                        <span className="text-zinc-400 text-[11px]">
                          {activeWeekPreview.startDateFormatted} – {activeWeekPreview.endDateFormatted}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                        {activeWeekPreview.days.map((day, dIdx) => (
                          <div
                            key={dIdx}
                            className={`p-3 rounded-xl border text-xs space-y-1 ${
                              day.type === 'REST'
                                ? 'bg-zinc-950/40 border-zinc-800/60 text-zinc-500'
                                : 'bg-zinc-900 border-zinc-700/80 text-zinc-200 shadow-sm'
                            }`}
                          >
                            <div className="flex items-center justify-between text-[10px] font-bold">
                              <span className={day.type === 'REST' ? 'text-zinc-500' : 'text-amber-400'}>
                                {day.dayOfWeek}
                              </span>
                              <span className="text-zinc-500 font-mono text-[9px]">{day.calendarDate}</span>
                            </div>
                            <div className="font-semibold truncate text-zinc-200">
                              {day.workoutName}
                            </div>
                            <div className="text-[10px] text-zinc-500">
                              {day.type === 'REST' ? (
                                'Recovery / Off Day'
                              ) : (
                                <span>{day.exerciseCount || 0} Prescribed Exercises</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 5. OPTIONAL ASSIGNMENT NOTES */}
              <div className="space-y-2 pt-2">
                <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block">
                  5. Client Assignment Notes (Optional)
                </label>
                <textarea
                  placeholder="Special instructions, initial load targets, or program adaptation focus..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-2xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500/60 transition-colors"
                />
              </div>
            </>
          )}
        </div>

        {/* Modal Bottom Footer Actions */}
        {!successAssignmentId && (
          <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-900/70 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleAssign}
              disabled={
                submitting ||
                !selectedProgramId ||
                !selectedClientId ||
                programData?.status !== 'ACTIVE' ||
                (hasExistingActive && !allowDuplicateOverride)
              }
              className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-xl text-xs font-bold transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2 shadow-sm"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                  <span>Assigning Program...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm & Assign Program</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
