import { SetType, BlockType } from './program';

export type WorkoutSessionStatus = 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';

export type PRType = 'HEAVIEST_WEIGHT' | 'BEST_REPS' | 'HIGHEST_VOLUME' | 'LONGEST_DURATION';

export interface PersonalRecord {
  id: string; // e.g. `${exerciseId}_${type}`
  tenantId: string;
  clientId: string;
  exerciseId: string;
  exerciseName: string;
  type: PRType;
  value: number; // e.g., 100 (kg/lbs) or 15 (reps) or 1200 (volume) or 90 (seconds)
  unit?: string; // lbs, kg, reps, sec
  achievedAt: string; // ISO
  sessionId: string;
  workoutName: string;
  reps?: number;
  weight?: number;
  durationSeconds?: number;
  previousValue?: number;
}

export interface CompletedSetSummaryItem {
  exerciseId: string;
  exerciseName?: string;
  setNumber: number;
  setType?: string;
  weight?: number;
  weightUnit?: string;
  reps?: number;
  durationSeconds?: number;
  rpe?: number;
  rir?: number;
  tempo?: string;
  isPR?: boolean;
}

export interface WorkoutSession {
  id: string;
  sessionId: string;
  tenantId: string;
  clientId: string;
  assignmentId: string;
  programId: string;
  workoutId: string;
  workoutName: string;
  scheduledDate: string; // YYYY-MM-DD
  startedAt: string;     // ISO
  completedAt?: string | null;
  status: WorkoutSessionStatus;
  totalExercises: number;
  completedExercises: number;
  totalSets: number;
  completedSets: number;
  durationMinutes?: number;
  totalVolumeKg?: number;
  totalVolumeLbs?: number;
  personalRecordsAchieved?: PersonalRecord[];
  clientNotes?: string;
  completedSetsSummary?: CompletedSetSummaryItem[];
  createdAt: string;
  updatedAt: string;
}

export interface WorkoutSetLog {
  id: string;
  sessionId: string;
  exerciseId: string;
  exerciseName?: string;
  setNumber: number;
  setType: SetType | string;
  blockId?: string;
  blockType?: BlockType;
  roundNumber?: number;
  parentSetNumber?: number;
  isDrop?: boolean;
  dropIndex?: number;
  weight?: number;
  weightUnit?: 'lbs' | 'kg';
  reps?: number;
  targetReps?: string;
  durationSeconds?: number;
  targetDurationSeconds?: number;
  rpe?: number;
  rir?: number;
  tempo?: string;
  notes?: string;
  completed: boolean;
  completedAt: string;
  isPR?: boolean;
  prTypes?: PRType[];
}

export interface ClientScheduledWorkoutItem {
  workoutId: string;
  workoutName: string;
  scheduledDate: string; // YYYY-MM-DD
  formattedDate: string;
  dayOfWeek: string;
  weekNumber: number;
  isOptional: boolean;
  exerciseCount: number;
  totalSets: number;
  targetMuscles: string[];
  status: 'TODAY' | 'UPCOMING' | 'COMPLETED' | 'MISSED';
  sessionId?: string;
}

export interface ConsistencyStats {
  totalWorkoutsCompleted: number;
  workoutsCompletedThisWeek: number;
  weeklyTarget: number;
  workoutsCompletedThisMonth: number;
  currentStreakWeeks: number;
  longestStreakWeeks: number;
  totalVolumeLiftedKg: number;
  totalVolumeLiftedLbs: number;
  totalTrainingMinutes: number;
}

export interface TodayWorkoutState {
  hasActiveProgram: boolean;
  isRestDay: boolean;
  programName?: string;
  programId?: string;
  assignmentId?: string;
  workoutId?: string;
  workoutName?: string;
  workoutDescription?: string;
  isOptional?: boolean;
  scheduledDate?: string;
  exerciseCount?: number;
  totalSets?: number;
  targetMuscles?: string[];
  sessionStatus?: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  existingSessionId?: string;
  nextScheduledWorkout?: {
    name: string;
    dateFormatted: string;
    dayOfWeek: string;
    isoDate: string;
    workoutId: string;
    exerciseCount: number;
  } | null;
}
