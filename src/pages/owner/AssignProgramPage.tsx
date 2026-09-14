import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
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
  ArrowLeft,
  Calendar,
  User,
  Search,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Clock,
  Layers,
  ShieldAlert,
  ChevronRight,
  Info,
  Check
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

export function AssignProgramPage() {
  const { programId } = useParams<{ programId: string }>();
  const [searchParams] = useSearchParams();
  const initialClientId = searchParams.get('clientId') || '';

  const { user } = useAuthStore();
  const { tenantId, memberData, tenantData } = useTenantStore();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [program, setProgram] = useState<Program | null>(null);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [weeks, setWeeks] = useState<ProgramWeek[]>([]);
  const [scheduleItems, setScheduleItems] = useState<ProgramScheduleItem[]>([]);

  const [clients, setClients] = useState<ClientOption[]>([]);
  const [trainers, setTrainers] = useState<TrainerOption[]>([]);

  // Selection & form
  const [selectedClientId, setSelectedClientId] = useState<string>(initialClientId);
  const [clientSearch, setClientSearch] = useState('');
  const [startDate, setStartDate] = useState<string>(() => formatDateToYMD(new Date()));
  const [notes, setNotes] = useState('');
  const [activeWeekIndex, setActiveWeekIndex] = useState(0);

  // Validation & status
  const [hasExistingActive, setHasExistingActive] = useState(false);
  const [allowDuplicateOverride, setAllowDuplicateOverride] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successAssignmentId, setSuccessAssignmentId] = useState<string | null>(null);

  const tenantTimezone = tenantData?.timezone || 'America/New_York';

  useEffect(() => {
    if (!tenantId || !programId) return;

    let isMounted = true;
    const loadAll = async () => {
      setLoading(true);
      setErrorMessage(null);
      try {
        const [progRes, scheduleRes, clientsSnap, trainersSnap] = await Promise.all([
          fetchProgramWithWorkouts(tenantId, programId),
          fetchProgramWeeksAndSchedule(tenantId, programId),
          getDocs(collection(db, 'tenants', tenantId, 'clients')),
          getDocs(collection(db, 'tenants', tenantId, 'trainers'))
        ]);

        if (!isMounted) return;

        setProgram(progRes.program);
        setWorkouts(progRes.workouts);
        setWeeks(scheduleRes.weeks);
        setScheduleItems(scheduleRes.scheduleItems);

        const trainerList: TrainerOption[] = trainersSnap.docs.map(d => ({
          id: d.id,
          firstName: d.data().firstName || '',
          lastName: d.data().lastName || '',
          email: d.data().email || ''
        }));
        setTrainers(trainerList);

        let clientList: ClientOption[] = clientsSnap.docs
          .map(d => {
            const data = d.data();
            const matched = trainerList.find(t => t.id === data.trainerId);
            return {
              id: d.id,
              firstName: data.firstName || '',
              lastName: data.lastName || '',
              email: data.email || '',
              status: data.status || 'ACTIVE',
              trainerId: data.trainerId || '',
              trainerName: matched ? `${matched.firstName} ${matched.lastName}`.trim() : undefined
            };
          })
          .filter(c => c.status !== 'ARCHIVED');

        // Role check
        if (memberData?.role === 'TRAINER') {
          const currentTrainer = trainerList.find(
            t => t.email.toLowerCase() === user?.email?.toLowerCase() || t.id === user?.uid
          );
          if (currentTrainer) {
            clientList = clientList.filter(c => c.trainerId === currentTrainer.id);
          }
        }

        setClients(clientList);

        if (initialClientId && clientList.some(c => c.id === initialClientId)) {
          setSelectedClientId(initialClientId);
        }
      } catch (err: any) {
        console.error('Failed to load assign program page:', err);
        if (isMounted) setErrorMessage(err.message || 'Failed to load assignment page.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadAll();
    return () => {
      isMounted = false;
    };
  }, [tenantId, programId, initialClientId, memberData, user]);

  // Check duplicate active assignment
  useEffect(() => {
    if (!tenantId || !programId || !selectedClientId) {
      setHasExistingActive(false);
      return;
    }

    let isMounted = true;
    const checkDuplicate = async () => {
      try {
        const res = await checkExistingActiveAssignment(tenantId, selectedClientId, programId);
        if (isMounted) {
          setHasExistingActive(res.hasActive);
        }
      } catch (err) {
        console.error(err);
      }
    };

    checkDuplicate();
    return () => {
      isMounted = false;
    };
  }, [tenantId, programId, selectedClientId]);

  const selectedClient = useMemo(() => {
    return clients.find(c => c.id === selectedClientId) || null;
  }, [clients, selectedClientId]);

  const filteredClients = useMemo(() => {
    if (!clientSearch.trim()) return clients;
    const q = clientSearch.toLowerCase().trim();
    return clients.filter(c => {
      const full = `${c.firstName} ${c.lastName}`.toLowerCase();
      return (
        full.includes(q) ||
        c.firstName.toLowerCase().includes(q) ||
        c.lastName.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q)
      );
    });
  }, [clients, clientSearch]);

  const dateCalculation = useMemo(() => {
    if (!startDate || !program) {
      return { endDateStr: '', formattedStart: '', formattedEnd: '' };
    }
    return calculateProgramEndDate(startDate, program.durationWeeks || 1, tenantTimezone);
  }, [startDate, program, tenantTimezone]);

  const schedulePreview = useMemo(() => {
    if (!startDate || !program) return [];
    return buildSchedulePreview(
      startDate,
      program.durationWeeks || 1,
      weeks,
      scheduleItems,
      workouts,
      tenantTimezone
    );
  }, [startDate, program, weeks, scheduleItems, workouts, tenantTimezone]);

  const activeWeek = schedulePreview[activeWeekIndex] || schedulePreview[0];

  const handleAssign = async () => {
    if (!tenantId || !user || !program || !selectedClient) {
      setErrorMessage('Please select a client.');
      return;
    }

    if (program.status === 'DRAFT') {
      setErrorMessage('Publish this program before assigning it to a client.');
      return;
    }
    if (program.status === 'ARCHIVED') {
      setErrorMessage('This program is archived and cannot be newly assigned.');
      return;
    }

    if (hasExistingActive && !allowDuplicateOverride) {
      setErrorMessage('This client already has this program assigned. Confirm to assign anyway.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const assignId = await createProgramAssignment(tenantId, {
        program,
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

      setSuccessAssignmentId(assignId);
    } catch (err: any) {
      console.error('Failed to assign program:', err);
      setErrorMessage(err.message || 'Failed to assign program.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-6xl mx-auto space-y-6 animate-pulse">
        <div className="h-6 w-36 bg-zinc-800 rounded" />
        <div className="h-28 bg-zinc-900 rounded-2xl border border-zinc-800" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-80 bg-zinc-900 rounded-2xl border border-zinc-800" />
          <div className="h-80 bg-zinc-900 rounded-2xl border border-zinc-800" />
        </div>
      </div>
    );
  }

  if (!program) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-white">Program Not Found</h2>
        <p className="text-xs text-zinc-400">The training program you are trying to assign does not exist.</p>
        <Link
          to="/owner/programs"
          className="px-4 py-2 bg-zinc-800 text-zinc-200 text-xs font-semibold rounded-xl inline-flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Programs</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6 text-zinc-100">
      {/* Back button */}
      <div className="flex items-center justify-between">
        <Link
          to={`/owner/programs/${program.id}`}
          className="text-xs text-zinc-400 hover:text-white flex items-center gap-1.5 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
          <span>Back to Program Details</span>
        </Link>

        <span className="text-xs text-zinc-500">
          Tenant Timezone: <strong className="text-zinc-300">{tenantTimezone}</strong>
        </span>
      </div>

      {/* Hero Program Summary */}
      <div className="p-6 rounded-3xl bg-zinc-900/70 border border-zinc-800/90 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs">
            <span className="px-2.5 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
              {program.goal}
            </span>
            <span className="px-2.5 py-0.5 rounded-md bg-zinc-800 text-zinc-300 font-medium border border-zinc-700/50">
              {program.difficulty}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase ${
              program.status === 'ACTIVE'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : program.status === 'DRAFT'
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
            }`}>
              {program.status}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Assign {program.name}
          </h1>
          <p className="text-xs text-zinc-400 max-w-2xl leading-relaxed">
            {program.description || 'Assign this published curriculum to an active athlete with automatic calendar synchronization.'}
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs bg-zinc-950/60 p-4 rounded-2xl border border-zinc-800">
          <div>
            <div className="text-[10px] uppercase font-bold text-zinc-500">Duration</div>
            <div className="text-base font-bold text-white">{program.durationWeeks} Weeks</div>
          </div>
          <div className="w-px h-8 bg-zinc-800" />
          <div>
            <div className="text-[10px] uppercase font-bold text-zinc-500">Workouts</div>
            <div className="text-base font-bold text-amber-400">{workouts.length} Prescribed</div>
          </div>
        </div>
      </div>

      {/* Success View */}
      {successAssignmentId ? (
        <div className="p-8 md:p-12 rounded-3xl bg-zinc-900/60 border border-zinc-800 text-center space-y-6 max-w-xl mx-auto">
          <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white">Program Assigned Successfully</h2>
            <p className="text-xs text-zinc-400 leading-relaxed">
              <strong className="text-white">{selectedClient?.firstName} {selectedClient?.lastName}</strong> is now enrolled in <strong className="text-amber-400">{program.name}</strong> from <strong className="text-white">{dateCalculation.formattedStart}</strong> to <strong className="text-white">{dateCalculation.formattedEnd}</strong>.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 text-left text-xs space-y-2">
            <div className="flex justify-between py-1 border-b border-zinc-800">
              <span className="text-zinc-400">Assigned Client:</span>
              <span className="font-semibold text-zinc-200">{selectedClient?.firstName} {selectedClient?.lastName} ({selectedClient?.email})</span>
            </div>
            <div className="flex justify-between py-1 border-b border-zinc-800">
              <span className="text-zinc-400">Assigned Coach:</span>
              <span className="text-zinc-200">{selectedClient?.trainerName || 'Unassigned'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-zinc-800">
              <span className="text-zinc-400">Active Schedule:</span>
              <span className="text-zinc-200">{dateCalculation.formattedStart} – {dateCalculation.formattedEnd}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-zinc-400">Assignment ID:</span>
              <span className="font-mono text-zinc-400 text-[11px]">{successAssignmentId}</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            {selectedClient && (
              <button
                onClick={() => navigate(`/owner/clients/${selectedClient.id}`)}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-xl transition-colors inline-flex items-center gap-2"
              >
                <User className="w-4 h-4" />
                <span>Go to Client Profile</span>
              </button>
            )}
            <button
              onClick={() => navigate(`/owner/programs/${program.id}`)}
              className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs rounded-xl transition-colors"
            >
              Return to Program
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Client Selection & Start Date */}
          <div className="lg:col-span-2 space-y-6">
            {/* Status alerts */}
            {program.status === 'DRAFT' && (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs flex items-center gap-3">
                <ShieldAlert className="w-5 h-5 flex-shrink-0" />
                <div>
                  <strong className="block font-bold">Draft Program</strong>
                  Publish this program before assigning it to a client.
                </div>
              </div>
            )}

            {program.status === 'ARCHIVED' && (
              <div className="p-4 rounded-2xl bg-zinc-800/80 border border-zinc-700 text-zinc-400 text-xs flex items-center gap-3">
                <Info className="w-5 h-5 flex-shrink-0" />
                <div>This program is archived and cannot be newly assigned.</div>
              </div>
            )}

            {errorMessage && (
              <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div className="flex-1 leading-relaxed">{errorMessage}</div>
              </div>
            )}

            {/* Client Picker */}
            <div className="p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800/80 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    1. Select Client
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Search and pick an active gym member for this training assignment.
                  </p>
                </div>
                {selectedClient && (
                  <span className="text-xs text-emerald-400 flex items-center gap-1 font-semibold">
                    <Check className="w-4 h-4" /> Selected
                  </span>
                )}
              </div>

              {clients.length === 0 ? (
                <div className="p-8 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 text-center space-y-3">
                  <p className="text-xs text-zinc-400">No active clients available in your tenant.</p>
                  <button
                    onClick={() => navigate('/owner/clients')}
                    className="px-4 py-2 bg-amber-500 text-zinc-950 text-xs font-bold rounded-xl"
                  >
                    Add Client
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      placeholder="Search clients by first name, last name, or email..."
                      value={clientSearch}
                      onChange={e => setClientSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-2xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500/60"
                    />
                  </div>

                  {/* Client Cards Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
                    {filteredClients.map(c => {
                      const isSelected = c.id === selectedClientId;
                      return (
                        <div
                          key={c.id}
                          onClick={() => setSelectedClientId(c.id)}
                          className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 ${
                            isSelected
                              ? 'bg-amber-500/10 border-amber-500/40 shadow-sm'
                              : 'bg-zinc-950/60 border-zinc-800/80 hover:border-zinc-700'
                          }`}
                        >
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold uppercase flex-shrink-0 ${
                            isSelected ? 'bg-amber-500 text-zinc-950' : 'bg-zinc-800 text-zinc-300'
                          }`}>
                            {c.firstName?.[0] || 'C'}{c.lastName?.[0] || ''}
                          </div>
                          <div className="min-w-0 flex-1 text-left">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-bold text-white truncate">
                                {c.firstName} {c.lastName}
                              </h4>
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                                {c.status}
                              </span>
                            </div>
                            <p className="text-[11px] text-zinc-400 truncate">{c.email}</p>
                            <div className="text-[10px] text-zinc-500 truncate mt-0.5">
                              Trainer: {c.trainerName || 'Unassigned'}
                            </div>
                          </div>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-amber-400 flex-shrink-0" />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Duplicate Active Assignment Warning */}
              {hasExistingActive && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold text-amber-400">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>This client already has this program assigned.</span>
                  </div>
                  <p className="text-[11px] text-amber-300/80 leading-relaxed">
                    The athlete currently possesses an ongoing assignment for {program.name}. You may cancel or proceed to assign an additional cycle.
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

            {/* Start Date & Timeline Calculation */}
            <div className="p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800/80 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  2. Start Date & Timeline
                </h3>
                <p className="text-xs text-zinc-400">
                  Week 1 begins on the selected start date and continues through the total prescribed weeks.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-1.5">
                  <span className="text-[10px] uppercase font-bold text-zinc-500 block">
                    Program Start Date
                  </span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500/60"
                  />
                  <span className="text-[10px] text-zinc-400 block truncate">
                    {dateCalculation.formattedStart || 'Select date'}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-1.5">
                  <span className="text-[10px] uppercase font-bold text-zinc-500 block">
                    Program Duration
                  </span>
                  <div className="text-base font-bold text-white mt-1">
                    {program.durationWeeks} Weeks
                  </div>
                  <span className="text-[10px] text-zinc-400 block">
                    {program.durationWeeks * 7} Calendar Days
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-1.5">
                  <span className="text-[10px] uppercase font-bold text-zinc-500 block">
                    Expected End Date
                  </span>
                  <div className="text-base font-bold text-amber-400 mt-1 truncate">
                    {dateCalculation.formattedEnd || '—'}
                  </div>
                  <span className="text-[10px] text-zinc-500 block truncate">
                    Inclusive program completion
                  </span>
                </div>
              </div>
            </div>

            {/* Optional Notes */}
            <div className="p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800/80 space-y-3">
              <label className="text-xs font-bold text-white uppercase tracking-wider block">
                3. Assignment Notes (Optional)
              </label>
              <textarea
                placeholder="E.g., Focus on strict eccentric tempo during Week 1–4; deload target on Week 8."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
                className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-2xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500/60"
              />
            </div>
          </div>

          {/* Right Col: Schedule Preview & Confirmation Summary */}
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800/80 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Schedule Preview
              </h3>

              {schedulePreview.length === 0 ? (
                <p className="text-xs text-zinc-500">Pick a start date to calculate schedule dates.</p>
              ) : (
                <div className="space-y-3">
                  {/* Week Tabs */}
                  <div className="flex items-center gap-1 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                    {schedulePreview.map((w, idx) => (
                      <button
                        key={w.weekNumber}
                        type="button"
                        onClick={() => setActiveWeekIndex(idx)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors flex-shrink-0 ${
                          activeWeekIndex === idx
                            ? 'bg-amber-500 text-zinc-950 font-bold'
                            : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                        }`}
                      >
                        W{w.weekNumber}
                      </button>
                    ))}
                  </div>

                  {activeWeek && (
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between text-[11px] text-zinc-400 pb-1 border-b border-zinc-800">
                        <span className="font-bold text-white">{activeWeek.name}</span>
                        <span>{activeWeek.startDateFormatted} – {activeWeek.endDateFormatted}</span>
                      </div>

                      <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                        {activeWeek.days.map((d, dIdx) => (
                          <div
                            key={dIdx}
                            className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                              d.type === 'REST'
                                ? 'bg-zinc-950/40 border-zinc-800/50 text-zinc-500'
                                : 'bg-zinc-950 border-zinc-800 text-zinc-200'
                            }`}
                          >
                            <div className="min-w-0 pr-2">
                              <div className="flex items-center gap-1.5 text-[10px] font-bold">
                                <span className={d.type === 'REST' ? 'text-zinc-500' : 'text-amber-400'}>
                                  {d.dayOfWeek}
                                </span>
                                <span className="text-zinc-500 font-mono text-[9px]">({d.calendarDate})</span>
                              </div>
                              <div className="font-semibold text-zinc-200 truncate mt-0.5">
                                {d.workoutName}
                              </div>
                            </div>
                            <span className="text-[10px] text-zinc-500 whitespace-nowrap">
                              {d.type === 'REST' ? 'Rest' : `${d.exerciseCount || 0} Ex.`}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Assignment Review Box */}
            <div className="p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800/80 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Review & Confirm
              </h3>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1.5 border-b border-zinc-800">
                  <span className="text-zinc-400">Program:</span>
                  <span className="font-bold text-white">{program.name}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-zinc-800">
                  <span className="text-zinc-400">Client:</span>
                  <span className="font-bold text-zinc-200">
                    {selectedClient ? `${selectedClient.firstName} ${selectedClient.lastName}` : 'None Selected'}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-zinc-800">
                  <span className="text-zinc-400">Coach:</span>
                  <span className="text-zinc-300">{selectedClient?.trainerName || 'Unassigned'}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-zinc-800">
                  <span className="text-zinc-400">Start Date:</span>
                  <span className="text-zinc-200">{dateCalculation.formattedStart || '—'}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-zinc-400">End Date:</span>
                  <span className="font-bold text-amber-400">{dateCalculation.formattedEnd || '—'}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleAssign}
                disabled={
                  submitting ||
                  !selectedClientId ||
                  program.status !== 'ACTIVE' ||
                  (hasExistingActive && !allowDuplicateOverride)
                }
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-2xl text-xs font-bold transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 shadow-sm"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                    <span>Assigning Program...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Assign Program to Client</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
