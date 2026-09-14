import React from 'react';
import { Exercise } from '../../types/exercise';
import { Card, CardContent } from '../ui/card';
import { Dumbbell, Sparkles, Shield, ArrowRight, Edit, Trash2, Copy, Flame } from 'lucide-react';

interface ExerciseCardProps {
  key?: React.Key;
  exercise: Exercise;
  onView: (exercise: Exercise) => void;
  onEdit?: (exercise: Exercise) => void;
  onDelete?: (exercise: Exercise) => void;
  onDuplicate?: (exercise: Exercise) => void;
}

export const ExerciseCard: React.FC<ExerciseCardProps> = ({
  exercise,
  onView,
  onEdit,
  onDelete,
  onDuplicate,
}) => {
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
    <Card 
      className="group relative overflow-hidden bg-card/60 backdrop-blur border border-border/60 hover:border-primary/50 transition-all duration-300 hover:shadow-lg flex flex-col justify-between"
      onClick={() => onView(exercise)}
    >
      <CardContent className="p-5 flex flex-col h-full justify-between gap-4 cursor-pointer">
        <div>
          {/* Header row: Source & Difficulty */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-1.5">
              {exercise.isCustom ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold tracking-wider uppercase bg-primary/15 text-primary border border-primary/30">
                  <Sparkles className="h-3 w-3" />
                  Custom
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold tracking-wider uppercase bg-accent text-muted-foreground border border-border/60">
                  <Shield className="h-3 w-3" />
                  System
                </span>
              )}
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${getDifficultyColor(exercise.difficulty)}`}>
                {exercise.difficulty}
              </span>
            </div>

            <span className="text-[11px] text-muted-foreground/80 font-mono tracking-wider uppercase">
              {exercise.movementPattern}
            </span>
          </div>

          {/* Exercise Title */}
          <h3 className="font-display font-semibold text-lg text-foreground group-hover:text-primary transition-colors line-clamp-1">
            {exercise.name}
          </h3>

          {/* Target Muscle & Equipment */}
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md bg-accent/70 text-foreground">
              <Flame className="h-3 w-3 text-primary" />
              {exercise.targetMuscleGroup}
            </span>
            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-card border border-border/60 text-muted-foreground">
              <Dumbbell className="h-3 w-3" />
              {exercise.equipment}
            </span>
            {exercise.secondaryMuscles && exercise.secondaryMuscles.length > 0 && (
              <span className="text-[11px] text-muted-foreground/70">
                +{exercise.secondaryMuscles.length} secondary
              </span>
            )}
          </div>

          {/* Snippet from instructions */}
          {exercise.instructions && exercise.instructions.length > 0 && (
            <p className="mt-3 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              {exercise.instructions[0]}
            </p>
          )}
        </div>

        {/* Footer / Quick Actions */}
        <div className="pt-3 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground" onClick={e => e.stopPropagation()}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onView(exercise);
            }}
            className="inline-flex items-center gap-1 text-xs font-medium text-foreground hover:text-primary transition-colors"
          >
            Details <ArrowRight className="h-3 w-3" />
          </button>

          <div className="flex items-center gap-1">
            {exercise.isCustom ? (
              <>
                {onEdit && (
                  <button
                    type="button"
                    title="Edit custom exercise"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(exercise);
                    }}
                    className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </button>
                )}
                {onDelete && (
                  <button
                    type="button"
                    title="Delete custom exercise"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(exercise);
                    }}
                    className="p-1.5 rounded-md hover:bg-rose-950/40 text-muted-foreground hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </>
            ) : (
              onDuplicate && (
                <button
                  type="button"
                  title="Customize this exercise"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDuplicate(exercise);
                  }}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] text-muted-foreground hover:text-primary hover:bg-accent transition-colors"
                >
                  <Copy className="h-3 w-3" /> Duplicate
                </button>
              )
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
