import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Dumbbell, 
  Calendar, 
  Users, 
  Layers, 
  Edit3, 
  Copy, 
  Archive, 
  Eye, 
  Bookmark, 
  Plus, 
  Check, 
  Clock, 
  Sparkles,
  Trash2,
  AlertCircle,
  FolderOpen,
  UserPlus,
  ShieldAlert,
  Pause,
  Play,
  XCircle,
  CheckCircle2,
  AlertTriangle,
  User
} from 'lucide-react';
import { useTenantStore } from '../../store/tenantStore';
import { useAuthStore } from '../../store/authStore';
import { 
  Program, 
  ProgramWeek, 
  ProgramScheduleItem, 
  Workout,
  WorkoutTemplate
} from '../../types/program';
import { ProgramAssignment } from '../../types/assignment';
import { 
  fetchProgramWithWorkouts, 
  duplicateProgram, 
  archiveProgram, 
  publishProgram,
  duplicateWorkoutInProgram
} from '../../lib/programService';
import { fetchProgramWeeksAndSchedule } from '../../lib/scheduleService';
import { 
  fetchProgramAssignments, 
  pauseProgramAssignment, 
  resumeProgramAssignment, 
  cancelProgramAssignment,
  formatReadableDate
} from '../../lib/assignmentService';
import { TrainingScheduleView } from '../../components/programs/TrainingScheduleView';
import { ProgramPreviewModal } from '../../components/programs/ProgramPreviewModal';
import { WorkoutDetailModal } from '../../components/programs/WorkoutDetailModal';
import { WorkoutTemplatesModal } from '../../components/programs/WorkoutTemplatesModal';
import { SaveWorkoutTemplateModal } from '../../components/programs/SaveWorkoutTemplateModal';
import { AssignProgramModal } from '../../components/programs/AssignProgramModal';

export function ProgramDetail() {
  const { programId } = useParams<{ programId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { tenantId } = useTenantStore();
  const userId = user?.uid || '';

  const [loading, setLoading] = useState(true);
  const [program, setProgram] = useState<Program | null>(null);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [weeks, setWeeks] = useState<ProgramWeek[]>([]);
  const [scheduleItems, setScheduleItems] = useState<ProgramScheduleItem[]>([]);
  const [assignments, setAssignments] = useState<ProgramAssignment[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Active view tab: 'SCHEDULE' | 'WORKOUTS' | 'CLIENTS'
  const [activeTab, setActiveTab] = useState<'SCHEDULE' | 'WORKOUTS' | 'CLIENTS'>('SCHEDULE');

  // Modals state
  const [showProgramPreview, setShowProgramPreview] = useState(false);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [selectedWorkoutForDetail, setSelectedWorkoutForDetail] = useState<string | null>(null);
  const [workoutToSaveAsTemplate, setWorkoutToSaveAsTemplate] = useState<Workout | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  // Status modal confirmations
  const [assignmentToPause, setAssignmentToPause] = useState<ProgramAssignment | null>(null);
  const [assignmentToCancel, setAssignmentToCancel] = useState<ProgramAssignment | null>(null);
  const [assignmentActionLoading, setAssignmentActionLoading] = useState(false);

  // Action states
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const loadAllData = useCallback(async () => {
    if (!tenantId || !programId) return;

    try {
      setError(null);
      const [progData, scheduleData, assignmentList] = await Promise.all([
        fetchProgramWithWorkouts(tenantId, programId),
        fetchProgramWeeksAndSchedule(tenantId, programId),
        fetchProgramAssignments(tenantId, programId)
      ]);

      setProgram(progData.program);
      setWorkouts(progData.workouts);
      setWeeks(scheduleData.weeks);
      setScheduleItems(scheduleData.scheduleItems);
      setAssignments(assignmentList);
    } catch (err: any) {
      console.error('Failed to load program data:', err);
      setError(err.message || 'Failed to load program schedule.');
    } finally {
      setLoading(false);
    }
  }, [tenantId, programId]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const handleAssignClick = () => {
    if (!program) return;
    if (program.status === 'DRAFT') {
      setStatusNotice('Publish this program before assigning it to a client.');
      setTimeout(() => setStatusNotice(null), 5000);
      return;
    }
    if (program.status === 'ARCHIVED') {
      setStatusNotice('This program is archived and cannot be newly assigned.');
      setTimeout(() => setStatusNotice(null), 5000);
      return;
    }
    setShowAssignModal(true);
  };

  const handlePauseAssignment = async () => {
    if (!tenantId || !assignmentToPause || !user) return;
    try {
      setAssignmentActionLoading(true);
      await pauseProgramAssignment(tenantId, assignmentToPause.id, user.uid, {
        programId: program?.id,
        clientId: assignmentToPause.clientId,
        programName: program?.name,
        clientName: assignmentToPause.clientName
      });
      setAssignmentToPause(null);
      await loadAllData();
    } catch (err: any) {
      console.error('Failed to pause assignment:', err);
      alert('Failed to pause assignment.');
    } finally {
      setAssignmentActionLoading(false);
    }
  };

  const handleResumeAssignment = async (assign: ProgramAssignment) => {
    if (!tenantId || !user) return;
    try {
      setAssignmentActionLoading(true);
      await resumeProgramAssignment(tenantId, assign.id, user.uid, {
        programId: program?.id,
        clientId: assign.clientId,
        programName: program?.name,
        clientName: assign.clientName
      });
      await loadAllData();
    } catch (err: any) {
      console.error('Failed to resume assignment:', err);
      alert('Failed to resume assignment.');
    } finally {
      setAssignmentActionLoading(false);
    }
  };

  const handleCancelAssignment = async () => {
    if (!tenantId || !assignmentToCancel || !user) return;
    try {
      setAssignmentActionLoading(true);
      await cancelProgramAssignment(tenantId, assignmentToCancel.id, user.uid, {
        programId: program?.id,
        clientId: assignmentToCancel.clientId,
        programName: program?.name,
        clientName: assignmentToCancel.clientName,
        wasActive: assignmentToCancel.status === 'ACTIVE' || assignmentToCancel.status === 'PAUSED'
      });
      setAssignmentToCancel(null);
      await loadAllData();
    } catch (err: any) {
      console.error('Failed to cancel assignment:', err);
      alert('Failed to cancel assignment.');
    } finally {
      setAssignmentActionLoading(false);
    }
  };

  const handleDuplicateProgram = async () => {
    if (!program) return;
    try {
      setIsDuplicating(true);
      const newId = await duplicateProgram(tenantId, userId, program.id);
      navigate(`/owner/programs/${newId}`);
    } catch (err: any) {
      console.error('Failed to duplicate program:', err);
      alert(err.message || 'Failed to duplicate program.');
    } finally {
      setIsDuplicating(false);
    }
  };

  const handleTogglePublish = async () => {
    if (!program) return;
    try {
      setIsPublishing(true);
      if (program.status === 'DRAFT') {
        await publishProgram(tenantId, program.id, userId, workouts);
      } else {
        await archiveProgram(tenantId, userId, program.id);
      }
      await loadAllData();
    } catch (err: any) {
      console.error('Failed to change program status:', err);
      alert(err.message || 'Failed to update program status.');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleDuplicateWorkout = async (wId: string) => {
    if (!program) return;
    try {
      await duplicateWorkoutInProgram(tenantId, program.id, wId);
      await loadAllData();
      alert('Workout duplicated successfully.');
    } catch (err: any) {
      console.error('Failed to duplicate workout:', err);
      alert(err.message || 'Failed to duplicate workout.');
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6 animate-pulse">
        <div className="h-6 w-32 bg-zinc-800 rounded-lg" />
        <div className="h-24 bg-zinc-900 rounded-2xl border border-zinc-800" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-20 bg-zinc-900/60 rounded-xl border border-zinc-800/60" />
          ))}
        </div>
        <div className="h-96 bg-zinc-900/40 rounded-2xl border border-zinc-800" />
      </div>
    );
  }

  if (error || !program) {
    return (
      <div className="p-6 max-w-2xl mx-auto py-16 text-center">
        <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Program Not Found</h2>
        <p className="text-xs text-zinc-400 mb-6">
          {error || "The program you are trying to view does not exist or you don't have permission."}
        </p>
        <Link
          to="/owner/programs"
          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-xl inline-flex items-center gap-2 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Programs</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Back Navigation Bar */}
      <div className="flex items-center justify-between">
        <Link
          to="/owner/programs"
          className="text-xs text-zinc-400 hover:text-white flex items-center gap-1.5 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
          <span>Back to Programs</span>
        </Link>

        {/* Status Pill */}
        <div className="flex items-center gap-2">
          {program.status === 'ACTIVE' && (
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Published Active
            </span>
          )}
          {program.status === 'DRAFT' && (
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              Draft Program
            </span>
          )}
          {program.status === 'ARCHIVED' && (
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-800 text-zinc-400 border border-zinc-700 flex items-center gap-1.5">
              Archived
            </span>
          )}
        </div>
      </div>

      {/* Program Hero Header */}
      <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs">
            <span className="px-2.5 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
              {program.goal === 'Custom' && program.customGoal ? program.customGoal : program.goal}
            </span>
            <span className="px-2.5 py-0.5 rounded-md bg-zinc-800 text-zinc-300 font-medium border border-zinc-700/50">
              {program.difficulty}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            {program.name}
          </h1>

          {program.description && (
            <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl leading-relaxed">
              {program.description}
            </p>
          )}
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleAssignClick}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm ${
              program.status === 'ACTIVE'
                ? 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950'
                : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-700/60'
            }`}
            title={program.status === 'ACTIVE' ? 'Assign program to a client' : 'Publish program to assign'}
          >
            <UserPlus className="w-4 h-4" />
            <span>Assign to Client</span>
          </button>

          <button
            onClick={() => navigate(`/owner/programs/${program.id}/builder`)}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm"
          >
            <Edit3 className="w-4 h-4" />
            <span>Open Workout Builder</span>
          </button>

          <button
            onClick={() => setShowProgramPreview(true)}
            className="px-3.5 py-2.5 bg-zinc-800/90 hover:bg-zinc-800 text-zinc-200 hover:text-white rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5 border border-zinc-700/60"
            title="Preview entire program"
          >
            <Eye className="w-4 h-4 text-blue-400" />
            <span className="hidden sm:inline">Preview Outline</span>
          </button>

          <button
            onClick={() => setShowTemplatesModal(true)}
            className="px-3.5 py-2.5 bg-zinc-800/90 hover:bg-zinc-800 text-zinc-200 hover:text-white rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5 border border-zinc-700/60"
            title="Gym Template Library"
          >
            <Bookmark className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Gym Templates</span>
          </button>

          <button
            onClick={handleDuplicateProgram}
            disabled={isDuplicating}
            className="p-2.5 bg-zinc-800/90 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-xl text-xs transition-colors border border-zinc-700/60"
            title="Duplicate entire program"
          >
            <Copy className="w-4 h-4" />
          </button>

          <button
            onClick={handleTogglePublish}
            disabled={isPublishing}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-medium transition-colors border ${
              program.status === 'DRAFT'
                ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20'
                : 'bg-zinc-800/90 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border-zinc-700/60'
            }`}
          >
            {program.status === 'DRAFT' ? 'Publish Program' : 'Archive'}
          </button>
        </div>
      </div>

      {/* Notice Banner */}
      {statusNotice && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 flex-shrink-0 text-amber-400" />
          <div className="flex-1 font-semibold">{statusNotice}</div>
          <button
            onClick={() => setStatusNotice(null)}
            className="text-zinc-400 hover:text-white text-xs px-2 py-1 rounded bg-zinc-900 border border-zinc-800"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Program KPI Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80">
          <span className="block text-zinc-500 text-[10px] uppercase font-bold tracking-wider">
            Total Duration
          </span>
          <span className="text-lg font-bold text-white mt-1 block">
            {weeks.length || program.durationWeeks} Weeks
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80">
          <span className="block text-zinc-500 text-[10px] uppercase font-bold tracking-wider">
            Prescribed Workouts
          </span>
          <span className="text-lg font-bold text-white mt-1 block">
            {workouts.length} Sessions
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80">
          <span className="block text-zinc-500 text-[10px] uppercase font-bold tracking-wider">
            Scheduled Sessions
          </span>
          <span className="text-lg font-bold text-white mt-1 block">
            {scheduleItems.filter(i => i.type !== 'REST').length} Active
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80">
          <span className="block text-zinc-500 text-[10px] uppercase font-bold tracking-wider">
            Enrolled Clients
          </span>
          <span className="text-lg font-bold text-white mt-1 block">
            {program.assignedClientCount || 0} Clients
          </span>
        </div>
      </div>

      {/* Tab Switcher: Training Schedule vs. All Workouts */}
      <div className="border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-6 text-sm">
          <button
            onClick={() => setActiveTab('SCHEDULE')}
            className={`py-3 font-semibold relative transition-colors ${
              activeTab === 'SCHEDULE'
                ? 'text-amber-400'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>Training Schedule</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-mono">
                {weeks.length} Wks
              </span>
            </div>
            {activeTab === 'SCHEDULE' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-400 rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('WORKOUTS')}
            className={`py-3 font-semibold relative transition-colors ${
              activeTab === 'WORKOUTS'
                ? 'text-amber-400'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <Dumbbell className="w-4 h-4" />
              <span>Workout Sessions</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-mono">
                {workouts.length}
              </span>
            </div>
            {activeTab === 'WORKOUTS' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-400 rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('CLIENTS')}
            className={`py-3 font-semibold relative transition-colors ${
              activeTab === 'CLIENTS'
                ? 'text-amber-400'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>Assigned Clients</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-mono">
                {assignments.length}
              </span>
            </div>
            {activeTab === 'CLIENTS' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-400 rounded-full" />
            )}
          </button>
        </div>

        {/* Right Tab Context Action */}
        {activeTab === 'WORKOUTS' && (
          <button
            onClick={() => navigate(`/owner/programs/${program.id}/builder`)}
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Workout</span>
          </button>
        )}

        {activeTab === 'CLIENTS' && (
          <button
            onClick={handleAssignClick}
            className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Assign Client</span>
          </button>
        )}
      </div>

      {/* Main Tab Views */}
      {activeTab === 'SCHEDULE' && (
        <TrainingScheduleView
          program={program}
          tenantId={tenantId}
          userId={userId}
          weeks={weeks}
          scheduleItems={scheduleItems}
          workouts={workouts}
          onDataChanged={loadAllData}
          onOpenWorkoutBuilder={(wId) => {
            navigate(`/owner/programs/${program.id}/builder${wId ? `?workoutId=${wId}` : ''}`);
          }}
          onSaveWorkoutAsTemplate={(w) => {
            setWorkoutToSaveAsTemplate(w);
          }}
        />
      )}

      {activeTab === 'WORKOUTS' && (
        /* Workouts List Tab */
        <div className="space-y-4">
          {workouts.length === 0 ? (
            <div className="py-16 text-center bg-zinc-900/40 rounded-2xl border border-zinc-800 p-8">
              <Dumbbell className="w-10 h-10 mx-auto text-amber-400 opacity-60 mb-3" />
              <h3 className="text-base font-bold text-white mb-1">No Workouts Created Yet</h3>
              <p className="text-xs text-zinc-400 max-w-md mx-auto mb-5">
                Start prescribing workout sessions, exercises, sets, reps, and tempos using the Workout Builder.
              </p>
              <button
                onClick={() => navigate(`/owner/programs/${program.id}/builder`)}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-xl text-xs font-bold inline-flex items-center gap-2 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Open Workout Builder</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {workouts.map((w, idx) => (
                <div
                  key={w.id || idx}
                  className="group p-5 rounded-2xl bg-zinc-900/60 hover:bg-zinc-900/90 border border-zinc-800/80 hover:border-zinc-700/80 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        {w.dayOfWeek || `Workout ${idx + 1}`}
                      </span>
                      <span className="text-xs text-zinc-500">
                        Week {w.weekNumber || 1}
                      </span>
                    </div>

                    <h3 
                      onClick={() => setSelectedWorkoutForDetail(w.id)}
                      className="text-base font-bold text-zinc-100 hover:text-amber-400 cursor-pointer transition-colors line-clamp-1"
                    >
                      {w.name}
                    </h3>

                    {w.description && (
                      <p className="text-xs text-zinc-400 line-clamp-2 mt-1 leading-relaxed">
                        {w.description}
                      </p>
                    )}

                    <div className="flex items-center gap-4 mt-3 text-xs text-zinc-400">
                      <span className="flex items-center gap-1.5">
                        <Dumbbell className="w-3.5 h-3.5 text-amber-400" />
                        <strong>{w.exerciseCount || w.exercises?.length || 0}</strong> Movements
                      </span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-zinc-800/80 mt-4 flex items-center justify-between gap-2">
                    <button
                      onClick={() => navigate(`/owner/programs/${program.id}/builder?workoutId=${w.id}`)}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-sm"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setSelectedWorkoutForDetail(w.id)}
                        className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                        title="Preview workout details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => setWorkoutToSaveAsTemplate(w)}
                        className="p-1.5 text-zinc-400 hover:text-amber-400 hover:bg-zinc-800 rounded-lg transition-colors"
                        title="Save as Gym Template"
                      >
                        <Bookmark className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDuplicateWorkout(w.id)}
                        className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
                        title="Duplicate Workout"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'CLIENTS' && (
        /* Assigned Clients Tab */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Assigned Clients</h2>
              <p className="text-xs text-zinc-400">
                Athletes currently enrolled or historically assigned to {program.name}.
              </p>
            </div>
            {program.status === 'ACTIVE' && (
              <button
                onClick={handleAssignClick}
                className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-xl text-xs inline-flex items-center gap-1.5 transition-all shadow-sm"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Assign to Client</span>
              </button>
            )}
          </div>

          {assignments.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-zinc-900/40 border border-zinc-800/80 space-y-4">
              <div className="w-12 h-12 rounded-full bg-zinc-800/80 text-zinc-400 flex items-center justify-center mx-auto">
                <Users className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white">No Clients Currently Assigned</h3>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                  {program.status === 'ACTIVE'
                    ? 'Assign this program to any gym client to schedule their workouts automatically.'
                    : 'Publish this program to enable client enrollment and assignment.'}
                </p>
              </div>
              {program.status === 'ACTIVE' && (
                <button
                  onClick={handleAssignClick}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-xl text-xs inline-flex items-center gap-2 shadow-sm"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Assign to Client</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {assignments.map((assign) => {
                const initials = assign.clientName
                  ? assign.clientName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
                  : 'C';

                return (
                  <div
                    key={assign.id}
                    className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 flex flex-col justify-between hover:border-zinc-700/80 transition-all space-y-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-zinc-800 text-zinc-200 font-bold text-xs flex items-center justify-center border border-zinc-700/60">
                          {initials}
                        </div>
                        <div>
                          <Link
                            to={`/owner/clients/${assign.clientId}`}
                            className="text-sm font-bold text-white hover:text-amber-400 transition-colors flex items-center gap-1 group"
                          >
                            <span>{assign.clientName}</span>
                          </Link>
                          <div className="text-xs text-zinc-400">{assign.clientEmail}</div>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div>
                        {assign.status === 'ACTIVE' && (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Active</span>
                          </span>
                        )}
                        {assign.status === 'PAUSED' && (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1.5">
                            <Pause className="w-3.5 h-3.5" />
                            <span>Paused</span>
                          </span>
                        )}
                        {assign.status === 'COMPLETED' && (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Completed</span>
                          </span>
                        )}
                        {assign.status === 'CANCELLED' && (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-zinc-800 text-zinc-400 border border-zinc-700 flex items-center gap-1.5">
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Cancelled</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Timeline & Coach details */}
                    <div className="grid grid-cols-2 gap-2 text-xs p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
                      <div>
                        <span className="text-[10px] text-zinc-500 block uppercase font-bold">Schedule</span>
                        <span className="text-zinc-300 font-medium">
                          Started {formatReadableDate(assign.startDate)}
                        </span>
                        <span className="text-zinc-500 block text-[11px]">
                          until {formatReadableDate(assign.endDate)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-500 block uppercase font-bold">Coach</span>
                        <span className="text-zinc-300 font-medium truncate block">
                          {assign.trainerName || 'Unassigned'}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between gap-2">
                      <Link
                        to={`/owner/clients/${assign.clientId}`}
                        className="text-xs font-semibold text-zinc-300 hover:text-white flex items-center gap-1 transition-colors"
                      >
                        <User className="w-3.5 h-3.5" />
                        <span>View Client</span>
                      </Link>

                      <div className="flex items-center gap-2">
                        {assign.status === 'ACTIVE' && (
                          <button
                            type="button"
                            onClick={() => setAssignmentToPause(assign)}
                            disabled={assignmentActionLoading}
                            className="px-2.5 py-1 text-xs font-medium rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors flex items-center gap-1"
                          >
                            <Pause className="w-3 h-3" />
                            <span>Pause</span>
                          </button>
                        )}

                        {assign.status === 'PAUSED' && (
                          <button
                            type="button"
                            onClick={() => handleResumeAssignment(assign)}
                            disabled={assignmentActionLoading}
                            className="px-2.5 py-1 text-xs font-medium rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition-colors flex items-center gap-1"
                          >
                            <Play className="w-3 h-3" />
                            <span>Resume</span>
                          </button>
                        )}

                        {assign.status !== 'CANCELLED' && assign.status !== 'COMPLETED' && (
                          <button
                            type="button"
                            onClick={() => setAssignmentToCancel(assign)}
                            disabled={assignmentActionLoading}
                            className="px-2.5 py-1 text-xs font-medium rounded-lg bg-zinc-800 hover:bg-red-500/10 text-zinc-400 hover:text-red-400 transition-colors flex items-center gap-1"
                          >
                            <XCircle className="w-3 h-3" />
                            <span>Cancel</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal: Full Program Outline Preview */}
      <ProgramPreviewModal
        isOpen={showProgramPreview}
        onClose={() => setShowProgramPreview(false)}
        programId={program.id}
        tenantId={tenantId}
        onOpenBuilder={() => {
          setShowProgramPreview(false);
          navigate(`/owner/programs/${program.id}/builder`);
        }}
      />

      {/* Modal: Single Workout Preview */}
      <WorkoutDetailModal
        isOpen={!!selectedWorkoutForDetail}
        onClose={() => setSelectedWorkoutForDetail(null)}
        workoutId={selectedWorkoutForDetail}
        programId={program.id}
        tenantId={tenantId}
        onEditInBuilder={(wId) => {
          setSelectedWorkoutForDetail(null);
          navigate(`/owner/programs/${program.id}/builder?workoutId=${wId}`);
        }}
        onDuplicate={handleDuplicateWorkout}
        onSaveAsTemplate={(w) => {
          setWorkoutToSaveAsTemplate(w);
        }}
      />

      {/* Modal: Gym Workout Templates Library */}
      <WorkoutTemplatesModal
        isOpen={showTemplatesModal}
        onClose={() => setShowTemplatesModal(false)}
        tenantId={tenantId}
      />

      {/* Modal: Save as Template */}
      <SaveWorkoutTemplateModal
        isOpen={!!workoutToSaveAsTemplate}
        onClose={() => setWorkoutToSaveAsTemplate(null)}
        workout={workoutToSaveAsTemplate}
        tenantId={tenantId}
        userId={userId}
        onSuccess={() => {
          alert('Template saved to Gym Template Library!');
        }}
      />

      {/* Modal: Assign Program to Client */}
      <AssignProgramModal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        programId={program.id}
        onAssigned={() => {
          loadAllData();
        }}
      />

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
                This will pause the current program schedule for <strong className="text-zinc-200">{assignmentToPause.clientName}</strong>. You can resume their schedule at any time.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setAssignmentToPause(null)}
                className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePauseAssignment}
                disabled={assignmentActionLoading}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl text-xs transition-colors"
              >
                {assignmentActionLoading ? 'Pausing...' : 'Confirm Pause'}
              </button>
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
                Are you sure you want to cancel the assignment of <strong className="text-zinc-200">{program.name}</strong> for <strong className="text-zinc-200">{assignmentToCancel.clientName}</strong>? The assignment will be marked as Cancelled in the client's history.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setAssignmentToCancel(null)}
                className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
              >
                Keep Active
              </button>
              <button
                type="button"
                onClick={handleCancelAssignment}
                disabled={assignmentActionLoading}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs transition-colors"
              >
                {assignmentActionLoading ? 'Cancelling...' : 'Confirm Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
