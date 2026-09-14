import { Exercise } from './exercise';
export type { Exercise };

export type ProgramStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';

export type ProgramDifficulty = 'Beginner' | 'Intermediate' | 'Advanced';

export type ProgramGoal = 
  | 'Strength'
  | 'Muscle Gain'
  | 'Fat Loss'
  | 'General Fitness'
  | 'Endurance'
  | 'Mobility'
  | 'Sport Performance'
  | 'Custom';

export const PROGRAM_GOALS: ProgramGoal[] = [
  'Strength',
  'Muscle Gain',
  'Fat Loss',
  'General Fitness',
  'Endurance',
  'Mobility',
  'Sport Performance',
  'Custom',
];

export const PROGRAM_DIFFICULTIES: ProgramDifficulty[] = [
  'Beginner',
  'Intermediate',
  'Advanced',
];

export type SetType = 
  | 'NORMAL'
  | 'WARMUP'
  | 'DROP_SET'
  | 'FAILURE'
  | 'AMRAP'
  | 'TIMED'
  | 'EMOM'
  | 'CIRCUIT'
  | 'SUPERSET';

export interface SetTypeConfig {
  type: SetType;
  label: string;
  isSupported: boolean;
  badge?: string;
  description: string;
}

export const SET_TYPE_CONFIGS: SetTypeConfig[] = [
  { type: 'NORMAL', label: 'Normal Working Set', isSupported: true, description: 'Standard resistance training working set with target reps and load' },
  { type: 'WARMUP', label: 'Warmup Set', isSupported: true, description: 'Sub-maximal preparatory set prior to heavy working load' },
  { type: 'DROP_SET', label: 'Drop Set', isSupported: true, description: 'Immediate load reduction upon failure without rest' },
  { type: 'FAILURE', label: 'To Failure', isSupported: true, description: 'Perform reps to momentary technical failure' },
  { type: 'AMRAP', label: 'AMRAP', isSupported: true, description: 'As many reps as possible within target time window' },
  { type: 'TIMED', label: 'Timed Interval', isSupported: true, description: 'Target duration work interval with countdown timer' },
  { type: 'EMOM', label: 'EMOM', isSupported: true, description: 'Every minute on the minute protocol with minute transitions' },
  { type: 'SUPERSET', label: 'Superset', isSupported: true, description: 'Paired opposing or compound movements executed back-to-back' },
  { type: 'CIRCUIT', label: 'Circuit', isSupported: true, description: 'Continuous sequence across 3+ movement stations across rounds' },
];

export type BlockType = 'SINGLE' | 'SUPERSET' | 'CIRCUIT';

export interface WorkoutBlock {
  id: string;
  workoutId: string;
  type: BlockType;
  order: number;
  name?: string;
  rounds?: number;
  restSeconds?: number;
  exerciseIds: string[];
}

export interface DropSetPrescription {
  dropIndex: number;
  weight?: number | null;
  reps?: string;
  isFailure?: boolean;
}

export interface WorkoutExercisePrescription {
  id: string; // Stable ID
  workoutId: string;
  programId: string;
  tenantId: string;
  exerciseId: string; // references Exercise.id
  order: number;
  setType: SetType;
  blockId?: string;
  blockType?: BlockType;
  blockRound?: number;
  sets: number;
  reps: string;
  weight?: number | null;
  weightUnit: 'lbs' | 'kg';
  restSeconds: number;
  durationSeconds?: number | null;
  tempo?: string; // e.g. "3-1-1-0" or "3-0-1-0"
  rpe?: number | null; // Rate of Perceived Exertion 1-10
  rir?: number | null; // Reps in Reserve 0-5
  notes?: string;
  
  // Phase 7G specific fields
  dropSets?: DropSetPrescription[];
  emomMinutes?: number;
  emomRepsPerMinute?: number;
  targetDurationSeconds?: number;
  
  // Resolved at display time (cached in client state from exercise map)
  exerciseDetails?: Exercise;
}

export interface Workout {
  id: string;
  programId: string;
  tenantId: string;
  name: string;
  description?: string;
  weekNumber: number;
  dayOfWeek?: string;
  order: number;
  exerciseCount: number;
  isArchived?: boolean;
  createdAt: string;
  updatedAt: string;
  
  // Exercises and Blocks in memory during builder editing
  exercises?: WorkoutExercisePrescription[];
  blocks?: WorkoutBlock[];
}

export type DayOfWeek = 
  | 'Monday' 
  | 'Tuesday' 
  | 'Wednesday' 
  | 'Thursday' 
  | 'Friday' 
  | 'Saturday' 
  | 'Sunday';

export const DAYS_OF_WEEK: DayOfWeek[] = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday'
];

export type ScheduleItemType = 'WORKOUT' | 'REST' | 'OPTIONAL';

export interface ProgramScheduleItem {
  id: string;
  programId: string;
  tenantId: string;
  weekId: string;
  weekNumber: number;
  dayOfWeek: DayOfWeek;
  type: ScheduleItemType;
  workoutId?: string | null;
  isOptional: boolean;
  order: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;

  // Resolved at display time
  workoutDetails?: Workout;
}

export interface ProgramWeek {
  id?: string;
  programId?: string;
  tenantId?: string;
  weekNumber: number;
  name: string;
  order: number;
  focus?: string;
  createdAt?: string;
  updatedAt?: string;
  workouts?: Workout[];
  scheduleItems?: ProgramScheduleItem[];
}

export interface WorkoutTemplate {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  category?: string;
  exerciseCount: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  exercises?: WorkoutExercisePrescription[];
}

export interface Program {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  durationWeeks: number;
  difficulty: ProgramDifficulty;
  goal: ProgramGoal;
  customGoal?: string;
  status: ProgramStatus;
  workoutCount: number;
  assignedClientCount: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  
  // Denormalized/loaded in builder & overview
  workouts?: Workout[];
  weeks?: ProgramWeek[];
  schedule?: ProgramScheduleItem[];
}

export interface ValidationIssue {
  field: string;
  message: string;
  workoutId?: string;
  workoutName?: string;
}
