import React, { useState } from 'react';
import { X, Bookmark, Check, AlertCircle } from 'lucide-react';
import { Workout } from '../../types/program';
import { saveWorkoutAsTemplate } from '../../lib/templateService';

interface SaveWorkoutTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  workout: Workout | null;
  tenantId: string;
  userId?: string;
  onSuccess?: () => void;
  onSaved?: (tpl?: any) => void;
}

export function SaveWorkoutTemplateModal({
  isOpen,
  onClose,
  workout,
  tenantId,
  userId = 'system',
  onSuccess,
  onSaved
}: SaveWorkoutTemplateModalProps) {
  const [templateName, setTemplateName] = useState(workout ? `${workout.name} Template` : '');
  const [description, setDescription] = useState(workout?.description || '');
  const [category, setCategory] = useState('Strength');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !workout) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateName.trim()) {
      setError('Please provide a name for this template.');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await saveWorkoutAsTemplate(
        tenantId,
        userId,
        workout,
        templateName.trim(),
        description.trim(),
        category
      );
      if (onSuccess) onSuccess();
      if (onSaved) onSaved();
      onClose();
    } catch (err: any) {
      console.error('Failed to save template:', err);
      setError(err.message || 'Failed to save workout template.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-zinc-800 flex items-start justify-between bg-zinc-900/50">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-amber-400 font-bold uppercase tracking-wider mb-1">
              <Bookmark className="w-3.5 h-3.5" />
              <span>Gym Template Library</span>
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              Save as Workout Template
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Turn "{workout.name}" into a reusable template for future programs.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
              Template Name *
            </label>
            <input
              type="text"
              value={templateName}
              onChange={e => setTemplateName(e.target.value)}
              placeholder="e.g. Upper Body Push Heavy"
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 focus:border-amber-400 focus:outline-none text-xs text-white placeholder-zinc-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
              Category
            </label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 focus:border-amber-400 focus:outline-none text-xs text-white"
            >
              <option value="Strength">Strength</option>
              <option value="Hypertrophy">Hypertrophy</option>
              <option value="Conditioning">Conditioning</option>
              <option value="Mobility">Mobility & Recovery</option>
              <option value="General">General Fitness</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
              Description / Coaching Notes
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              placeholder="Brief summary of intent, rest recommendations, target stimulus..."
              className="w-full px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 focus:border-amber-400 focus:outline-none text-xs text-white placeholder-zinc-500 resize-none"
            />
          </div>

          <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 text-xs text-zinc-400">
            <span className="font-semibold text-zinc-300 block mb-1">Preserved Specifications:</span>
            {workout.exercises?.length || 0} Prescribed movements with sets, reps, weight units, rest intervals, and exercise references.
          </div>

          <div className="pt-3 border-t border-zinc-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-xl text-xs font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-sm"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{saving ? 'Saving...' : 'Save Template'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
