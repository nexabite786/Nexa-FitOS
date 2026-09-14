import React from 'react';
import { AlertTriangle, X, ArrowRight, CheckCircle2 } from 'lucide-react';
import { ValidationIssue } from '../../types/program';

interface ValidationModalProps {
  isOpen: boolean;
  onClose: () => void;
  issues: ValidationIssue[];
  onFocusWorkout?: (workoutId: string) => void;
}

export function ValidationModal({
  isOpen,
  onClose,
  issues,
  onFocusWorkout
}: ValidationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
      />

      <div className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl p-6 z-10 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-zinc-100">
                Program Cannot Be Published Yet
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Resolve the following requirements before making this program active
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="my-4 max-h-72 overflow-y-auto space-y-2.5 pr-1">
          {issues.map((issue, idx) => (
            <div
              key={idx}
              className="p-3 bg-zinc-900/90 border border-zinc-800/80 rounded-xl flex items-start justify-between gap-3"
            >
              <div className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2 shrink-0" />
                <div>
                  <p className="text-xs text-zinc-200 font-medium">
                    {issue.message}
                  </p>
                  {issue.workoutName && (
                    <span className="inline-block mt-1 text-[11px] text-zinc-500">
                      Location: {issue.workoutName}
                    </span>
                  )}
                </div>
              </div>

              {issue.workoutId && onFocusWorkout && (
                <button
                  onClick={() => {
                    onFocusWorkout(issue.workoutId!);
                    onClose();
                  }}
                  className="shrink-0 px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-amber-400 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
                >
                  <span>Fix</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-zinc-800/80">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-medium transition-colors"
          >
            Understood, Return to Builder
          </button>
        </div>
      </div>
    </div>
  );
}
