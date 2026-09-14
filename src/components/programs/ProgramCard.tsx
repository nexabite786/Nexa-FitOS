import { useState } from 'react';
import { 
  Dumbbell, 
  Calendar, 
  Users, 
  MoreVertical, 
  Copy, 
  Archive, 
  Trash2, 
  Eye, 
  Edit3,
  Clock,
  Sparkles
} from 'lucide-react';
import { Program } from '../../types/program';

interface ProgramCardProps {
  key?: string;
  program: Program;
  onOpenBuilder: (programId: string) => void;
  onViewSchedule?: (programId: string) => void;
  onPreview: (programId: string) => void;
  onDuplicate: (programId: string) => void;
  onArchive: (programId: string) => void;
  onDeleteDraft?: (program: Program) => void;
}

export function ProgramCard({
  program,
  onOpenBuilder,
  onViewSchedule,
  onPreview,
  onDuplicate,
  onArchive,
  onDeleteDraft
}: ProgramCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  const handlePrimaryClick = () => {
    if (onViewSchedule) {
      onViewSchedule(program.id);
    } else {
      onOpenBuilder(program.id);
    }
  };

  const getStatusBadge = (status: Program['status']) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Active
          </span>
        );
      case 'DRAFT':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            Draft
          </span>
        );
      case 'ARCHIVED':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-800 text-zinc-400 border border-zinc-700/60 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
            Archived
          </span>
        );
    }
  };

  return (
    <div className="group relative bg-zinc-900/60 hover:bg-zinc-900/90 border border-zinc-800/80 hover:border-zinc-700/80 rounded-2xl p-5 transition-all duration-200 flex flex-col justify-between shadow-sm hover:shadow-lg">
      
      {/* Top Bar */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            {getStatusBadge(program.status)}
            <span className="text-xs px-2.5 py-1 rounded-lg bg-zinc-800/80 text-zinc-300 border border-zinc-700/50 font-medium">
              {program.difficulty}
            </span>
          </div>

          {/* Context Menu Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMenu && (
              <>
                <div 
                  className="fixed inset-0 z-20" 
                  onClick={() => setShowMenu(false)} 
                />
                <div className="absolute right-0 mt-1 w-44 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl py-1.5 z-30 text-xs">
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      if (onViewSchedule) onViewSchedule(program.id);
                      else onOpenBuilder(program.id);
                    }}
                    className="w-full px-3 py-2 text-left text-zinc-200 hover:bg-zinc-800 flex items-center gap-2"
                  >
                    <Calendar className="w-3.5 h-3.5 text-amber-400" />
                    <span>View Schedule</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onOpenBuilder(program.id);
                    }}
                    className="w-full px-3 py-2 text-left text-zinc-200 hover:bg-zinc-800 flex items-center gap-2"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Open Builder</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onPreview(program.id);
                    }}
                    className="w-full px-3 py-2 text-left text-zinc-200 hover:bg-zinc-800 flex items-center gap-2"
                  >
                    <Eye className="w-3.5 h-3.5 text-blue-400" />
                    <span>Preview Program</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onDuplicate(program.id);
                    }}
                    className="w-full px-3 py-2 text-left text-zinc-200 hover:bg-zinc-800 flex items-center gap-2"
                  >
                    <Copy className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Duplicate Program</span>
                  </button>

                  {program.status !== 'ARCHIVED' ? (
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        onArchive(program.id);
                      }}
                      className="w-full px-3 py-2 text-left text-zinc-300 hover:bg-zinc-800 flex items-center gap-2"
                    >
                      <Archive className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Archive</span>
                    </button>
                  ) : null}

                  {program.status === 'DRAFT' && onDeleteDraft && (
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        onDeleteDraft(program);
                      }}
                      className="w-full px-3 py-2 text-left text-red-400 hover:bg-red-500/10 flex items-center gap-2 border-t border-zinc-800 mt-1 pt-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      <span>Delete Draft</span>
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Title & Goal */}
        <h3 
          onClick={handlePrimaryClick}
          className="text-base font-semibold text-zinc-100 hover:text-amber-400 cursor-pointer transition-colors line-clamp-1 mb-1 tracking-tight"
        >
          {program.name}
        </h3>

        <div className="flex items-center gap-2 text-xs text-amber-400/90 font-medium mb-3">
          <span>{program.goal === 'Custom' && program.customGoal ? program.customGoal : program.goal}</span>
        </div>

        {program.description && (
          <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed mb-4">
            {program.description}
          </p>
        )}
      </div>

      {/* Stats Footer */}
      <div className="pt-4 border-t border-zinc-800/60 mt-2">
        <div className="grid grid-cols-3 gap-2 text-center text-xs mb-4">
          <div className="p-2 rounded-xl bg-zinc-950/60 border border-zinc-800/60">
            <span className="block text-zinc-500 text-[10px] uppercase tracking-wider font-semibold">Duration</span>
            <span className="font-semibold text-zinc-200 mt-0.5 block">
              {program.durationWeeks} {program.durationWeeks === 1 ? 'Wk' : 'Wks'}
            </span>
          </div>

          <div className="p-2 rounded-xl bg-zinc-950/60 border border-zinc-800/60">
            <span className="block text-zinc-500 text-[10px] uppercase tracking-wider font-semibold">Workouts</span>
            <span className="font-semibold text-zinc-200 mt-0.5 block">
              {program.workoutCount || 0}
            </span>
          </div>

          <div className="p-2 rounded-xl bg-zinc-950/60 border border-zinc-800/60">
            <span className="block text-zinc-500 text-[10px] uppercase tracking-wider font-semibold">Assigned</span>
            <span className="font-semibold text-zinc-200 mt-0.5 block">
              {program.assignedClientCount || 0}
            </span>
          </div>
        </div>

        {/* Bottom CTA Row */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrimaryClick}
            className="flex-1 py-2 px-3 bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shadow-sm"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Schedule & Plan</span>
          </button>

          <button
            onClick={() => onOpenBuilder(program.id)}
            className="p-2 bg-zinc-800/90 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-xl text-xs transition-colors"
            title="Open Workout Builder"
          >
            <Edit3 className="w-4 h-4" />
          </button>

          <button
            onClick={() => onPreview(program.id)}
            className="p-2 bg-zinc-800/90 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-xl text-xs transition-colors"
            title="Preview Program Outline"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
      </div>

    </div>
  );
}
