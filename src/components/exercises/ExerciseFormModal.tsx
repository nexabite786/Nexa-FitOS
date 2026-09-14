import React, { useState, useEffect } from 'react';
import { Exercise, MuscleGroup, EquipmentType, MovementPattern, ExerciseType, DifficultyLevel } from '../../types/exercise';
import { 
  MUSCLE_GROUPS, 
  EQUIPMENT_LIST, 
  MOVEMENT_PATTERNS, 
  EXERCISE_TYPES, 
  DIFFICULTY_LEVELS 
} from '../../data/curatedExercises';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { X, Plus, Trash2, Sparkles, Dumbbell } from 'lucide-react';

interface ExerciseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<Exercise, 'id' | 'isCustom' | 'tenantId' | 'createdAt' | 'updatedAt' | 'createdBy'>, existingId?: string) => Promise<void>;
  initialData?: Exercise | null;
  isDuplicate?: boolean;
}

export function ExerciseFormModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  isDuplicate = false,
}: ExerciseFormModalProps) {
  const [name, setName] = useState('');
  const [targetMuscleGroup, setTargetMuscleGroup] = useState<MuscleGroup>('Chest');
  const [secondaryMuscles, setSecondaryMuscles] = useState<string[]>([]);
  const [equipment, setEquipment] = useState<EquipmentType>('Barbell');
  const [movementPattern, setMovementPattern] = useState<MovementPattern>('Push');
  const [exerciseType, setExerciseType] = useState<ExerciseType>('Strength');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('Beginner');
  const [instructions, setInstructions] = useState<string[]>(['']);
  const [tips, setTips] = useState<string[]>(['']);
  const [videoUrl, setVideoUrl] = useState('');
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialData) {
      setName(isDuplicate ? `${initialData.name} (Custom)` : initialData.name);
      setTargetMuscleGroup(initialData.targetMuscleGroup);
      setSecondaryMuscles(initialData.secondaryMuscles || []);
      setEquipment(initialData.equipment);
      setMovementPattern(initialData.movementPattern);
      setExerciseType(initialData.exerciseType);
      setDifficulty(initialData.difficulty);
      setInstructions(initialData.instructions && initialData.instructions.length > 0 ? [...initialData.instructions] : ['']);
      setTips(initialData.tips && initialData.tips.length > 0 ? [...initialData.tips] : ['']);
      setVideoUrl(initialData.videoUrl || '');
    } else {
      setName('');
      setTargetMuscleGroup('Chest');
      setSecondaryMuscles([]);
      setEquipment('Barbell');
      setMovementPattern('Push');
      setExerciseType('Strength');
      setDifficulty('Beginner');
      setInstructions(['Set up in good position and brace core.']);
      setTips(['Focus on controlled tempo and full range of motion.']);
      setVideoUrl('');
    }
    setError('');
  }, [initialData, isDuplicate, isOpen]);

  if (!isOpen) return null;

  const handleAddInstruction = () => {
    setInstructions([...instructions, '']);
  };

  const handleInstructionChange = (index: number, val: string) => {
    const updated = [...instructions];
    updated[index] = val;
    setInstructions(updated);
  };

  const handleRemoveInstruction = (index: number) => {
    if (instructions.length <= 1) {
      setInstructions(['']);
    } else {
      setInstructions(instructions.filter((_, i) => i !== index));
    }
  };

  const handleAddTip = () => {
    setTips([...tips, '']);
  };

  const handleTipChange = (index: number, val: string) => {
    const updated = [...tips];
    updated[index] = val;
    setTips(updated);
  };

  const handleRemoveTip = (index: number) => {
    if (tips.length <= 1) {
      setTips(['']);
    } else {
      setTips(tips.filter((_, i) => i !== index));
    }
  };

  const toggleSecondaryMuscle = (muscle: string) => {
    if (muscle === targetMuscleGroup) return;
    if (secondaryMuscles.includes(muscle)) {
      setSecondaryMuscles(secondaryMuscles.filter(m => m !== muscle));
    } else {
      setSecondaryMuscles([...secondaryMuscles, muscle]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide an exercise name.');
      return;
    }

    const cleanInstructions = instructions.map(s => s.trim()).filter(Boolean);
    if (cleanInstructions.length === 0) {
      setError('Please provide at least one execution instruction step.');
      return;
    }

    const cleanTips = tips.map(t => t.trim()).filter(Boolean);

    setSaving(true);
    setError('');

    try {
      await onSave({
        name: name.trim(),
        targetMuscleGroup,
        secondaryMuscles,
        equipment,
        movementPattern,
        exerciseType,
        difficulty,
        instructions: cleanInstructions,
        tips: cleanTips,
        videoUrl: videoUrl.trim() || undefined,
      }, isDuplicate ? undefined : (initialData?.isCustom ? initialData.id : undefined));
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Failed to save custom exercise. Please verify inputs.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-2xl max-h-[92vh] flex flex-col bg-card border border-border rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-border bg-card/90">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-semibold tracking-wider uppercase bg-primary/15 text-primary border border-primary/30">
                <Sparkles className="h-3 w-3" /> Custom Exercise
              </span>
            </div>
            <h2 className="text-xl font-display font-semibold tracking-tight text-foreground mt-1">
              {initialData && !isDuplicate ? 'Edit Custom Exercise' : isDuplicate ? 'Duplicate & Customize Exercise' : 'Create Custom Exercise'}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Available exclusively to coaches and clients in your gym tenant.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {error && (
              <div className="p-3 text-xs bg-rose-950/30 border border-rose-900/50 text-rose-400 rounded-md">
                {error}
              </div>
            )}

            {/* Exercise Name */}
            <div className="space-y-2">
              <Label htmlFor="ex-name" className="text-sm font-medium">Exercise Name *</Label>
              <Input
                id="ex-name"
                placeholder="e.g., Incline Dumbbell Hammer Curl"
                value={name}
                onChange={e => setName(e.target.value)}
                maxLength={120}
                required
                className="bg-input/50"
              />
            </div>

            {/* 2x2 Grid for Categorization */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Primary Target Muscle *</Label>
                <select
                  value={targetMuscleGroup}
                  onChange={e => {
                    const newPrimary = e.target.value as MuscleGroup;
                    setTargetMuscleGroup(newPrimary);
                    setSecondaryMuscles(secondaryMuscles.filter(m => m !== newPrimary));
                  }}
                  className="w-full h-10 rounded-md border border-border/60 bg-input/50 px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {MUSCLE_GROUPS.map(mg => (
                    <option key={mg} value={mg}>{mg}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Equipment *</Label>
                <select
                  value={equipment}
                  onChange={e => setEquipment(e.target.value as EquipmentType)}
                  className="w-full h-10 rounded-md border border-border/60 bg-input/50 px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {EQUIPMENT_LIST.map(eq => (
                    <option key={eq} value={eq}>{eq}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Movement Pattern *</Label>
                <select
                  value={movementPattern}
                  onChange={e => setMovementPattern(e.target.value as MovementPattern)}
                  className="w-full h-10 rounded-md border border-border/60 bg-input/50 px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {MOVEMENT_PATTERNS.map(mp => (
                    <option key={mp} value={mp}>{mp}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Exercise Type *</Label>
                <select
                  value={exerciseType}
                  onChange={e => setExerciseType(e.target.value as ExerciseType)}
                  className="w-full h-10 rounded-md border border-border/60 bg-input/50 px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {EXERCISE_TYPES.map(et => (
                    <option key={et} value={et}>{et}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Difficulty Level Segment */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Difficulty Level</Label>
              <div className="grid grid-cols-3 gap-2">
                {DIFFICULTY_LEVELS.map(lvl => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setDifficulty(lvl)}
                    className={`py-2 px-3 text-xs font-semibold rounded-md border transition-all ${
                      difficulty === lvl
                        ? lvl === 'Beginner'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                          : lvl === 'Intermediate'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                          : 'bg-rose-500/20 text-rose-300 border-rose-500/50'
                        : 'bg-input/30 text-muted-foreground border-border/50 hover:bg-input/60'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            {/* Secondary Muscles Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Secondary Muscles (Optional)</Label>
              <p className="text-xs text-muted-foreground">Select muscles that provide auxiliary support or stabilization:</p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {MUSCLE_GROUPS.filter(m => m !== targetMuscleGroup).map(muscle => {
                  const isSelected = secondaryMuscles.includes(muscle);
                  return (
                    <button
                      key={muscle}
                      type="button"
                      onClick={() => toggleSecondaryMuscle(muscle)}
                      className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
                        isSelected 
                          ? 'bg-primary/20 text-primary border-primary/40 font-medium'
                          : 'bg-input/30 text-muted-foreground border-border/50 hover:text-foreground'
                      }`}
                    >
                      {isSelected ? `✓ ${muscle}` : `+ ${muscle}`}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step-by-Step Instructions */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Execution Steps *</Label>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleAddInstruction}
                  className="h-8 text-xs text-primary hover:text-primary"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Step
                </Button>
              </div>

              <div className="space-y-2">
                {instructions.map((step, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="h-7 w-7 rounded-full bg-accent text-muted-foreground text-xs font-semibold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <Input
                      placeholder={`Step ${idx + 1} technique description...`}
                      value={step}
                      onChange={e => handleInstructionChange(idx, e.target.value)}
                      className="bg-input/50"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveInstruction(idx)}
                      className="p-2 text-muted-foreground hover:text-rose-400 transition-colors"
                      title="Remove step"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Coaching Cues & Tips */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Coach Cues & Tips (Optional)</Label>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleAddTip}
                  className="h-8 text-xs text-primary hover:text-primary"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Cue
                </Button>
              </div>

              <div className="space-y-2">
                {tips.map((tip, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0 mx-2.5"></span>
                    <Input
                      placeholder="e.g. Keep chest high and don't let knees collapse..."
                      value={tip}
                      onChange={e => handleTipChange(idx, e.target.value)}
                      className="bg-input/50"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveTip(idx)}
                      className="p-2 text-muted-foreground hover:text-rose-400 transition-colors"
                      title="Remove cue"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Video Demo Link */}
            <div className="space-y-2">
              <Label htmlFor="ex-video" className="text-sm font-medium">Video Demonstration URL (Optional)</Label>
              <Input
                id="ex-video"
                type="url"
                placeholder="https://youtube.com/watch?v=..."
                value={videoUrl}
                onChange={e => setVideoUrl(e.target.value)}
                className="bg-input/50"
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div className="p-4 bg-card/95 border-t border-border flex items-center justify-end gap-3">
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : initialData && !isDuplicate ? 'Update Exercise' : 'Save Custom Exercise'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
