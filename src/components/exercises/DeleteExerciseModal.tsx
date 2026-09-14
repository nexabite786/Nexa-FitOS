import React, { useState } from 'react';
import { Exercise } from '../../types/exercise';
import { Button } from '../ui/button';
import { AlertTriangle, X, Trash2 } from 'lucide-react';

interface DeleteExerciseModalProps {
  isOpen: boolean;
  exercise: Exercise | null;
  onClose: () => void;
  onConfirm: (exercise: Exercise) => Promise<void>;
}

export function DeleteExerciseModal({
  isOpen,
  exercise,
  onClose,
  onConfirm,
}: DeleteExerciseModalProps) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !exercise) return null;

  const handleConfirm = async () => {
    setDeleting(true);
    setError('');
    try {
      await onConfirm(exercise);
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Failed to delete exercise.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-md bg-card border border-border rounded-xl shadow-2xl overflow-hidden p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          <div className="h-10 w-10 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
            <AlertTriangle className="h-5 w-5" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-display font-semibold text-foreground">
              Delete Custom Exercise
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Are you sure you want to remove <strong className="text-foreground">"{exercise.name}"</strong>? This will remove it from your gym's custom exercise catalog.
            </p>

            {error && (
              <p className="mt-2 text-xs text-rose-400 p-2 bg-rose-950/30 border border-rose-900/50 rounded">
                {error}
              </p>
            )}

            <div className="mt-6 flex items-center justify-end gap-3">
              <Button variant="ghost" size="sm" onClick={onClose} disabled={deleting}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                size="sm"
                onClick={handleConfirm}
                disabled={deleting}
                className="bg-rose-600 hover:bg-rose-700 text-white"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                {deleting ? 'Deleting...' : 'Delete Exercise'}
              </Button>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
