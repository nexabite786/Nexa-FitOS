import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Dumbbell, 
  Filter, 
  Layers, 
  CheckCircle2, 
  Clock, 
  Archive, 
  AlertCircle,
  Copy,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { useTenantStore } from '../../store/tenantStore';
import { useAuthStore } from '../../store/authStore';
import { Program, PROGRAM_GOALS, PROGRAM_DIFFICULTIES } from '../../types/program';
import { 
  fetchPrograms, 
  duplicateProgram, 
  archiveProgram 
} from '../../lib/programService';
import { ProgramCard } from '../../components/programs/ProgramCard';
import { ProgramPreviewModal } from '../../components/programs/ProgramPreviewModal';
import { DeleteProgramModal } from '../../components/programs/DeleteProgramModal';

export function Programs() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { tenantId } = useTenantStore();

  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'DRAFT' | 'ARCHIVED'>('ALL');
  const [goalFilter, setGoalFilter] = useState<string>('ALL');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('ALL');

  // Modal States
  const [previewProgramId, setPreviewProgramId] = useState<string | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<Program | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const loadPrograms = async (isManualRefresh = false) => {
    if (!tenantId) return;
    try {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const list = await fetchPrograms(tenantId);
      setPrograms(list);
    } catch (err: any) {
      console.error('Failed to load programs:', err);
      setError(err.message || 'Failed to load workout programs.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadPrograms();
  }, [tenantId]);

  const showNotification = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 3500);
  };

  // Actions
  const handleViewSchedule = (programId: string) => {
    navigate(`/owner/programs/${programId}`);
  };

  const handleOpenBuilder = (programId: string) => {
    navigate(`/owner/programs/${programId}/builder`);
  };

  const handlePreview = (programId: string) => {
    setPreviewProgramId(programId);
  };

  const handleDuplicate = async (programId: string) => {
    if (!tenantId || !user) return;
    try {
      setActionNotice('Duplicating program and workouts...');
      const newId = await duplicateProgram(tenantId, user.uid, programId);
      showNotification('Program duplicated successfully.');
      await loadPrograms(true);
    } catch (err: any) {
      setError(err.message || 'Failed to duplicate program.');
    }
  };

  const handleArchive = async (programId: string) => {
    if (!tenantId || !user) return;
    try {
      await archiveProgram(tenantId, user.uid, programId);
      showNotification('Program moved to archive.');
      await loadPrograms(true);
    } catch (err: any) {
      setError(err.message || 'Failed to archive program.');
    }
  };

  const handleDeleteDraft = (program: Program) => {
    setDeleteCandidate(program);
  };

  // Metrics
  const stats = useMemo(() => {
    const total = programs.length;
    const active = programs.filter(p => p.status === 'ACTIVE').length;
    const drafts = programs.filter(p => p.status === 'DRAFT').length;
    const archived = programs.filter(p => p.status === 'ARCHIVED').length;
    return { total, active, drafts, archived };
  }, [programs]);

  // Filtering
  const filteredPrograms = useMemo(() => {
    return programs.filter(p => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = p.name.toLowerCase().includes(q);
        const matchGoal = p.goal.toLowerCase().includes(q);
        const matchDesc = p.description?.toLowerCase().includes(q);
        if (!matchName && !matchGoal && !matchDesc) return false;
      }
      // Status
      if (statusFilter !== 'ALL' && p.status !== statusFilter) {
        return false;
      }
      // Goal
      if (goalFilter !== 'ALL' && p.goal !== goalFilter) {
        return false;
      }
      // Difficulty
      if (difficultyFilter !== 'ALL' && p.difficulty !== difficultyFilter) {
        return false;
      }
      return true;
    });
  }, [programs, searchQuery, statusFilter, goalFilter, difficultyFilter]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Toast / Action Notice */}
      {actionNotice && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-400 flex items-center justify-between animate-in fade-in duration-150">
          <span>{actionNotice}</span>
          <button onClick={() => setActionNotice(null)} className="text-amber-400 hover:text-amber-300">
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-300 underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
            Programs
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Create structured training plans for your clients.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => loadPrograms(true)}
            disabled={refreshing || loading}
            className="p-2.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 rounded-xl text-xs font-medium transition-colors"
            title="Refresh programs"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-amber-400' : ''}`} />
          </button>

          <button
            onClick={() => navigate('/owner/programs/new')}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Create Program</span>
          </button>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800/80">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500 font-medium">Total Programs</span>
            <Layers className="w-4 h-4 text-zinc-600" />
          </div>
          <p className="text-2xl font-bold text-zinc-100 mt-1.5">{stats.total}</p>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800/80">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500 font-medium">Active Plans</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-emerald-400 mt-1.5">{stats.active}</p>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800/80">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500 font-medium">In Draft</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-amber-400 mt-1.5">{stats.drafts}</p>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800/80">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500 font-medium">Archived</span>
            <Archive className="w-4 h-4 text-zinc-600" />
          </div>
          <p className="text-2xl font-bold text-zinc-400 mt-1.5">{stats.archived}</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-zinc-900/50 border border-zinc-800/80 rounded-2xl space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search programs by title, goal, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20"
            />
          </div>

          {/* Status Tabs */}
          <div className="flex items-center bg-zinc-950 p-1 rounded-xl border border-zinc-800 shrink-0 text-xs">
            {(['ALL', 'ACTIVE', 'DRAFT', 'ARCHIVED'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  statusFilter === tab
                    ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {tab === 'ALL' ? 'All' : tab.charAt(0) + tab.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Secondary Select Filters */}
        <div className="flex flex-wrap items-center gap-2.5 pt-1 text-xs">
          <div className="flex items-center gap-1.5 text-zinc-400">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter by:</span>
          </div>

          {/* Goal Filter */}
          <select
            value={goalFilter}
            onChange={(e) => setGoalFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-300 focus:border-amber-500/50 focus:outline-none"
          >
            <option value="ALL">All Goals</option>
            {PROGRAM_GOALS.map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>

          {/* Difficulty Filter */}
          <select
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-300 focus:border-amber-500/50 focus:outline-none"
          >
            <option value="ALL">All Difficulties</option>
            {PROGRAM_DIFFICULTIES.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          {(searchQuery || statusFilter !== 'ALL' || goalFilter !== 'ALL' || difficultyFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('ALL');
                setGoalFilter('ALL');
                setDifficultyFilter('ALL');
              }}
              className="text-amber-400 hover:text-amber-300 text-xs underline underline-offset-2 ml-auto"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Program Grid or Empty State */}
      {loading ? (
        <div className="py-24 text-center text-zinc-500 text-sm">
          Loading programs...
        </div>
      ) : filteredPrograms.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-zinc-900/30 border border-zinc-800/80 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mx-auto">
            <Dumbbell className="w-6 h-6" />
          </div>

          <div>
            <h3 className="text-base font-semibold text-zinc-200">
              {programs.length === 0 ? 'No programs yet.' : 'No matching programs found.'}
            </h3>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto mt-1">
              {programs.length === 0 
                ? 'Create structured training plans for your clients with tailored workouts, sets, and exercises.' 
                : 'Try adjusting your search query or reset active filters to see more programs.'}
            </p>
          </div>

          {programs.length === 0 && (
            <button
              onClick={() => navigate('/owner/programs/new')}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-xl text-xs font-semibold inline-flex items-center gap-2 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Create Program</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPrograms.map((program) => (
            <ProgramCard
              key={program.id}
              program={program}
              onViewSchedule={handleViewSchedule}
              onOpenBuilder={handleOpenBuilder}
              onPreview={handlePreview}
              onDuplicate={handleDuplicate}
              onArchive={handleArchive}
              onDeleteDraft={handleDeleteDraft}
            />
          ))}
        </div>
      )}

      {/* Program Preview Modal */}
      {previewProgramId && tenantId && (
        <ProgramPreviewModal
          isOpen={Boolean(previewProgramId)}
          onClose={() => setPreviewProgramId(null)}
          programId={previewProgramId}
          tenantId={tenantId}
          onOpenBuilder={handleOpenBuilder}
        />
      )}

      {/* Delete Draft Modal */}
      {deleteCandidate && tenantId && user && (
        <DeleteProgramModal
          isOpen={Boolean(deleteCandidate)}
          onClose={() => setDeleteCandidate(null)}
          program={deleteCandidate}
          tenantId={tenantId}
          userId={user.uid}
          onDeleted={() => {
            showNotification(`Draft program "${deleteCandidate.name}" deleted.`);
            loadPrograms(true);
          }}
        />
      )}

    </div>
  );
}
