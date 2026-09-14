import React from 'react';
import { Exercise } from '../../types/exercise';
import { Button } from '../ui/button';
import { 
  X, 
  Dumbbell, 
  Sparkles, 
  Shield, 
  CheckCircle2, 
  Lightbulb, 
  Flame, 
  Activity, 
  Copy, 
  Edit, 
  Trash2, 
  ExternalLink 
} from 'lucide-react';

interface ExerciseDetailModalProps {
  exercise: Exercise | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (exercise: Exercise) => void;
  onDelete?: (exercise: Exercise) => void;
  onDuplicate?: (exercise: Exercise) => void;
}

export function ExerciseDetailModal({
  exercise,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onDuplicate,
}: ExerciseDetailModalProps) {
  if (!isOpen || !exercise) return null;

  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case 'Beginner':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'Intermediate':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'Advanced':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      default:
        return 'bg-accent text-muted-foreground border-border/50';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-card border border-border rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between p-6 border-b border-border/70 bg-card/90">
          <div className="pr-6">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {exercise.isCustom ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-semibold tracking-wider uppercase bg-primary/15 text-primary border border-primary/30">
                  <Sparkles className="h-3 w-3" />
                  Custom Gym Exercise
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-semibold tracking-wider uppercase bg-accent text-muted-foreground border border-border/60">
                  <Shield className="h-3 w-3" />
                  System Curated
                </span>
              )}

              <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-[11px] font-medium border ${getDifficultyColor(exercise.difficulty)}`}>
                {exercise.difficulty}
              </span>

              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono uppercase bg-accent/40 text-muted-foreground border border-border/40">
                {exercise.exerciseType}
              </span>
            </div>

            <h2 className="text-2xl font-display font-semibold tracking-tight text-foreground">
              {exercise.name}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Anatomical & Spec Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-accent/40 border border-border/50">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1">
                <Flame className="h-3 w-3 text-primary" /> Primary Muscle
              </span>
              <p className="text-sm font-medium text-foreground mt-1">{exercise.targetMuscleGroup}</p>
            </div>

            <div className="p-3 rounded-lg bg-accent/40 border border-border/50">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1">
                <Dumbbell className="h-3 w-3 text-primary" /> Equipment
              </span>
              <p className="text-sm font-medium text-foreground mt-1">{exercise.equipment}</p>
            </div>

            <div className="p-3 rounded-lg bg-accent/40 border border-border/50">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1">
                <Activity className="h-3 w-3 text-primary" /> Movement Pattern
              </span>
              <p className="text-sm font-medium text-foreground mt-1">{exercise.movementPattern}</p>
            </div>

            <div className="p-3 rounded-lg bg-accent/40 border border-border/50">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                Secondary
              </span>
              <p className="text-sm font-medium text-foreground mt-1 truncate">
                {exercise.secondaryMuscles && exercise.secondaryMuscles.length > 0
                  ? exercise.secondaryMuscles.join(', ')
                  : 'None'}
              </p>
            </div>
          </div>

          {/* Step-by-Step Instructions */}
          <div>
            <h3 className="text-sm font-display font-semibold uppercase tracking-wider text-foreground mb-3 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" /> Execution Technique
            </h3>
            <div className="space-y-2.5">
              {exercise.instructions && exercise.instructions.length > 0 ? (
                exercise.instructions.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-3 text-sm text-muted-foreground bg-accent/20 p-3 rounded-md border border-border/30">
                    <span className="h-5 w-5 rounded-full bg-primary/20 text-primary text-xs font-semibold flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <p className="leading-relaxed text-foreground/90">{step}</p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground italic">No written steps provided.</p>
              )}
            </div>
          </div>

          {/* Coaching Cues & Tips */}
          {exercise.tips && exercise.tips.length > 0 && (
            <div className="p-4 rounded-lg bg-amber-500/5 border border-amber-500/20">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-400 mb-2 flex items-center gap-1.5">
                <Lightbulb className="h-4 w-4" /> Coach Notes & Common Mistakes
              </h3>
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                {exercise.tips.map((tip, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0 mt-1.5"></span>
                    <span className="leading-relaxed">{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Video / Demonstration link if present */}
          {exercise.videoUrl && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-accent/40 border border-border/50 text-xs">
              <span className="text-muted-foreground font-medium">Video Demonstration Reference:</span>
              <a 
                href={exercise.videoUrl} 
                target="_blank" 
                rel="noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1 font-semibold"
              >
                Watch Video <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-card/95 border-t border-border/70 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground">
            {exercise.isCustom ? 'Tenant Custom Variation' : 'NEXA FITOS Standard Library'}
          </div>

          <div className="flex items-center gap-2">
            {exercise.isCustom ? (
              <>
                {onEdit && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      onClose();
                      onEdit(exercise);
                    }}
                  >
                    <Edit className="h-3.5 w-3.5 mr-1.5" /> Edit
                  </Button>
                )}
                {onDelete && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-rose-400 hover:text-rose-300 hover:bg-rose-950/30"
                    onClick={() => {
                      onClose();
                      onDelete(exercise);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete
                  </Button>
                )}
              </>
            ) : (
              onDuplicate && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    onClose();
                    onDuplicate(exercise);
                  }}
                >
                  <Copy className="h-3.5 w-3.5 mr-1.5" /> Duplicate as Custom
                </Button>
              )
            )}
            <Button size="sm" onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
