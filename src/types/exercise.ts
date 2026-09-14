export type MuscleGroup =
  | 'Chest'
  | 'Back'
  | 'Shoulders'
  | 'Quads'
  | 'Hamstrings'
  | 'Glutes'
  | 'Calves'
  | 'Biceps'
  | 'Triceps'
  | 'Core'
  | 'Forearms'
  | 'Full Body';

export type EquipmentType =
  | 'Barbell'
  | 'Dumbbell'
  | 'Kettlebell'
  | 'Cable'
  | 'Machine'
  | 'Bodyweight'
  | 'Bands'
  | 'Trap Bar'
  | 'EZ Bar'
  | 'Other';

export type MovementPattern =
  | 'Push'
  | 'Pull'
  | 'Hinge'
  | 'Squat'
  | 'Lunge'
  | 'Carry'
  | 'Rotation'
  | 'Isolation'
  | 'Other';

export type ExerciseType =
  | 'Strength'
  | 'Hypertrophy'
  | 'Endurance'
  | 'Mobility'
  | 'Power'
  | 'Cardio';

export type DifficultyLevel = 'Beginner' | 'Intermediate' | 'Advanced';

export interface Exercise {
  id: string;
  name: string;
  targetMuscleGroup: MuscleGroup;
  secondaryMuscles?: string[];
  equipment: EquipmentType;
  movementPattern: MovementPattern;
  exerciseType: ExerciseType;
  difficulty: DifficultyLevel;
  instructions: string[];
  tips?: string[];
  videoUrl?: string;
  thumbnailUrl?: string;
  isCustom: boolean;
  tenantId?: string | null;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExerciseFilterState {
  searchQuery: string;
  source: 'ALL' | 'SYSTEM' | 'CUSTOM';
  muscleGroup: string;
  equipment: string;
  movementPattern: string;
  exerciseType: string;
  difficulty: string;
}
