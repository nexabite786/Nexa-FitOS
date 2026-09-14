export type CheckInFrequency = 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'CUSTOM';

export type CheckInQuestionType =
  | 'SHORT_TEXT'
  | 'LONG_TEXT'
  | 'NUMBER'
  | 'YES_NO'
  | 'RATING'
  | 'SINGLE_SELECT'
  | 'MULTIPLE_SELECT'
  | 'WEIGHT'
  | 'MEASUREMENT';

export type MeasurementTarget =
  | 'waist'
  | 'chest'
  | 'hips'
  | 'leftArm'
  | 'rightArm'
  | 'leftThigh'
  | 'rightThigh'
  | 'shoulders'
  | 'calves'
  | 'neck';

export interface CheckInQuestion {
  id: string;
  type: CheckInQuestionType;
  label: string;
  description?: string;
  required: boolean;
  options?: string[]; // for SINGLE_SELECT, MULTIPLE_SELECT
  minRating?: number; // default 1
  maxRating?: number; // default 5 or 10
  ratingLabels?: { min?: string; max?: string };
  unit?: string; // for NUMBER, WEIGHT (kg/lbs), MEASUREMENT (cm/in)
  measurementTarget?: MeasurementTarget;
  order: number;
}

export type TemplateStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';

export interface CheckInTemplate {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  frequency: CheckInFrequency;
  customDaysInterval?: number;
  questions: CheckInQuestion[];
  status: TemplateStatus;
  version: number;
  assignedClientCount?: number;
  createdBy: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
}

export type AssignmentStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';

export interface CheckInAssignment {
  id: string;
  tenantId: string;
  templateId: string;
  templateName: string;
  templateVersion: number;
  clientId: string;
  clientName?: string;
  clientEmail?: string;
  trainerId?: string;
  frequency: CheckInFrequency;
  customDaysInterval?: number;
  startDate: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  dayOfWeek?: string; // e.g. "Sunday", "Monday", "Friday"
  status: AssignmentStatus;
  assignedBy: string;
  assignedByName?: string;
  assignedAt: string;
  updatedAt: string;
}

export type CheckInStatus = 'DRAFT' | 'DUE' | 'SUBMITTED' | 'REVIEWED' | 'OVERDUE' | 'CANCELLED';

export interface CheckInAnswer {
  questionId: string;
  questionType: CheckInQuestionType;
  questionLabelSnapshot: string;
  questionDescriptionSnapshot?: string;
  answer: string | string[] | boolean | number | null;
  numericValue?: number;
  unit?: string;
  measurementTarget?: MeasurementTarget;
}

export interface CheckInAdherenceSnapshot {
  workoutAdherencePercent: number | null;
  workoutsCompleted: number;
  workoutsScheduled: number;
  nutritionAdherencePercent: number | null;
  nutritionDaysLogged: number;
  habitAdherencePercent: number | null;
  habitsCompletedDays: number;
  habitsExpectedDays: number;
  weightLogged?: {
    weight: number;
    unit: string;
    previousWeight?: number;
    delta?: number;
  };
  measurementsLogged?: Array<{
    target: MeasurementTarget;
    targetLabel: string;
    value: number;
    unit: string;
  }>;
}

export interface CheckInRecord {
  id: string;
  tenantId: string;
  assignmentId?: string;
  templateId: string;
  templateName: string;
  templateVersion: number;
  clientId: string;
  clientName?: string;
  clientEmail?: string;
  trainerId?: string;
  dueDate: string; // YYYY-MM-DD
  scheduledDate: string; // YYYY-MM-DD
  status: CheckInStatus;
  questionsSnapshot: CheckInQuestion[]; // Immutable snapshot of questions at assignment/creation
  answers: CheckInAnswer[];
  submittedAt?: string;
  submittedBy?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewedByName?: string;
  coachNote?: string;
  coachNoteCreatedAt?: string;
  coachNoteCreatedBy?: string;
  coachNoteCreatedByName?: string;
  adherenceSnapshot?: CheckInAdherenceSnapshot;
  createdAt: string;
  updatedAt: string;
}

// ----------------------------------------------------------------------
// HABITS ENGINE
// ----------------------------------------------------------------------

export type HabitType = 'BOOLEAN' | 'COUNT' | 'DURATION' | 'QUANTITY';
export type HabitFrequency = 'DAILY' | 'SPECIFIC_DAYS' | 'WEEKLY_TARGET';
export type HabitOwnership = 'COACH_ASSIGNED' | 'CLIENT_PERSONAL';
export type HabitStatus = 'ACTIVE' | 'PAUSED' | 'ARCHIVED' | 'COMPLETED';

export interface Habit {
  id: string;
  tenantId: string;
  clientId: string;
  clientName?: string;
  name: string;
  description?: string;
  type: HabitType;
  target: number; // 1 for boolean, e.g. 8000 for steps, 30 for min, 3 for liters
  unit?: string; // 'steps', 'min', 'L', 'glasses', 'servings', 'times', etc.
  frequency: HabitFrequency;
  weekdays?: number[]; // [0,1,2,3,4,5,6] (0 = Sunday, 1 = Mon...)
  weeklyTargetDays?: number; // e.g. 5 days a week
  startDate: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  status: HabitStatus;
  ownership: HabitOwnership;
  icon?: string;
  color?: string; // Tailwind color token or hex
  category?: 'HYDRATION' | 'SLEEP' | 'ACTIVITY' | 'MINDFULNESS' | 'NUTRITION' | 'GENERAL';
  createdBy: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface HabitLog {
  id: string; // habitId_YYYY-MM-DD
  habitId: string;
  clientId: string;
  tenantId: string;
  date: string; // YYYY-MM-DD
  value: number;
  target: number;
  completed: boolean;
  unit?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface HabitStats {
  habitId: string;
  currentStreakDays: number;
  longestStreakDays: number;
  totalCompletions: number;
  adherence7D: number; // 0 - 100
  adherence30D: number; // 0 - 100
  historyMap: Record<string, HabitLog>; // date -> log
}

export interface ClientHabitsOverview {
  habits: Habit[];
  logsToday: Record<string, HabitLog>;
  stats: Record<string, HabitStats>;
  overallAdherence7D: number;
  overallAdherence30D: number;
  completedTodayCount: number;
  totalActiveTodayCount: number;
}
