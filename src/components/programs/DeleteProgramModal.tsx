import { useState } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { Program } from '../../types/program';
import { deleteDraftProgram } from '../../lib/programService';

interface DeleteProgramModalProps {
  isOpen: boolean;
  onClose: () => void;
  program: Program | null;
  tenantId: string;
  userId: string;
  onDeleted: () => void;
}

export function DeleteProgramModal({
  isOpen,
  onClose,
  program,
  tenantId,
  userId,
  onDeleted
}: DeleteProgramModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !program) return null;

  const handleDelete = async () => {
    try {
      setLoading(true);
      setError(null);
      await deleteDraftProgram(tenantId, userId, program.id, program.name);
      onDeleted();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to delete draft program');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
      />

      <div className="relative w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl p-6 z-10 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-zinc-100">
                Delete Draft Program
              </h3>
              <p className="text-xs text-zinc-400">
                This action cannot be undone
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

        <div className="py-2 text-sm text-zinc-300">
          <p>
            Are you sure you want to permanently delete draft program{' '}
            <strong className="text-zinc-100 font-semibold">"{program.name}"</strong> and all of its associated workouts?
          </p>
        </div>

        {error && (
          <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-zinc-800/80">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-medium transition-colors flex items-center gap-2"
          >
            {loading ? (
              <span>Deleting...</span>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Draft</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
