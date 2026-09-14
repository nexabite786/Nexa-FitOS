import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Dumbbell, 
  Calendar, 
  Target, 
  Check, 
  AlertCircle,
  Sparkles,
  Layers
} from 'lucide-react';
import { useTenantStore } from '../../store/tenantStore';
import { useAuthStore } from '../../store/authStore';
import { 
  PROGRAM_GOALS, 
  PROGRAM_DIFFICULTIES, 
  ProgramGoal, 
  ProgramDifficulty 
} from '../../types/program';
import { createProgram } from '../../lib/programService';

export function NewProgram() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { tenantId } = useTenantStore();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [goal, setGoal] = useState<ProgramGoal>('Strength');
  const [customGoal, setCustomGoal] = useState('');
  const [difficulty, setDifficulty] = useState<ProgramDifficulty>('Intermediate');
  const [durationWeeks, setDurationWeeks] = useState<number>(8);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId || !user) return;

    if (!name.trim()) {
      setError('Please provide a program name.');
      return;
    }

    if (durationWeeks < 1 || durationWeeks > 52) {
      setError('Program duration must be between 1 and 52 weeks.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const programId = await createProgram(tenantId, user.uid, {
        name: name.trim(),
        description: description.trim(),
        durationWeeks,
        difficulty,
        goal,
        customGoal: goal === 'Custom' ? customGoal.trim() : undefined
      });

      // Navigate straight into the visual workout builder
      navigate(`/owner/programs/${programId}/builder`);
    } catch (err: any) {
      console.error('Failed to create program:', err);
      setError(err.message || 'Failed to create program.');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      
      {/* Back button */}
      <button
        onClick={() => navigate('/owner/programs')}
        className="inline-flex items-center gap-2 text-xs font-medium text-zinc-400 hover:text-zinc-100 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Programs</span>
      </button>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
          Create Training Program
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Set up foundational program parameters. You'll build workouts and prescribe exercises in the next step.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Form Card */}
      <form onSubmit={handleSubmit} className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-6 shadow-sm">
        
        {/* Name */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300">
            Program Name <span className="text-amber-400">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="e.g. 12-Week Hypertrophy & Density, Athletic Conditioning..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20"
          />
        </div>

        {/* Goal & Custom Goal */}
        <div className="space-y-3">
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300">
            Primary Training Goal
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {PROGRAM_GOALS.map((g) => (
              <button
                type="button"
                key={g}
                onClick={() => setGoal(g)}
                className={`px-3 py-2.5 rounded-xl text-xs font-medium border text-center transition-all ${
                  goal === g
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-400 shadow-sm'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                }`}
              >
                {g}
              </button>
            ))}
          </div>

          {goal === 'Custom' && (
            <input
              type="text"
              placeholder="Specify custom focus or specialty target..."
              value={customGoal}
              onChange={(e) => setCustomGoal(e.target.value)}
              className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500/50"
            />
          )}
        </div>

        {/* Difficulty & Duration */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          
          {/* Difficulty */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300">
              Target Experience Level
            </label>
            <div className="grid grid-cols-3 gap-2">
              {PROGRAM_DIFFICULTIES.map((d) => (
                <button
                  type="button"
                  key={d}
                  onClick={() => setDifficulty(d)}
                  className={`py-2 rounded-xl text-xs font-medium border text-center transition-all ${
                    difficulty === d
                      ? 'bg-zinc-800 border-zinc-600 text-zinc-100 font-semibold'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Duration in Weeks */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300">
              Program Duration (Weeks)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={1}
                max={52}
                value={durationWeeks}
                onChange={(e) => setDurationWeeks(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-24 px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-sm font-semibold text-zinc-100 focus:outline-none focus:border-amber-500/50 text-center"
              />
              <span className="text-xs text-zinc-500">
                Typical plans span 4 to 12 weeks
              </span>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300">
            Program Description & Coaching Notes <span className="text-zinc-500 font-normal lowercase">(optional)</span>
          </label>
          <textarea
            rows={4}
            placeholder="Outline the training methodology, periodization model, target demographic, or recovery guidelines..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 leading-relaxed"
          />
        </div>

        {/* Submit Actions */}
        <div className="pt-4 border-t border-zinc-800 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/owner/programs')}
            className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-medium transition-colors"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-sm disabled:opacity-50"
          >
            {loading ? (
              <span>Creating Program...</span>
            ) : (
              <>
                <span>Create & Open Builder</span>
                <Dumbbell className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
}
