export type AssignmentStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';

export interface ProgramSnapshotWeek {
  weekNumber: number;
  name: string;
  focus?: string;
}

export interface ProgramSnapshotScheduleItem {
  weekNumber: number;
  dayOfWeek: string;
  type: 'WORKOUT' | 'REST' | 'OPTIONAL';
  workoutId?: string | null;
  workoutName?: string;
  isOptional: boolean;
  notes?: string;
}

export interface ProgramSnapshot {
  id: string;
  name: string;
  description?: string;
  durationWeeks: number;
  difficulty: string;
  goal: string;
  version: number;
  workoutCount: number;
  weeks?: ProgramSnapshotWeek[];
  scheduleSummary?: ProgramSnapshotScheduleItem[];
}

export interface ProgramAssignment {
  id: string;
  tenantId: string;
  programId: string;
  clientId: string;
  assignedBy: string;
  trainerId?: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  status: AssignmentStatus;
  programVersion: number;
  programSnapshotId?: string;
  programName: string;
  programDurationWeeks: number;
  clientName: string;
  clientEmail: string;
  trainerName?: string;
  programSnapshot?: ProgramSnapshot;
  createdAt: string;
  updatedAt: string;
  pausedAt?: string | null;
  resumedAt?: string | null;
  cancelledAt?: string | null;
  completedAt?: string | null;
  notes?: string;
}

export interface DaySchedulePreview {
  dayIndex: number; // 0 to 6
  dayOfWeek: string;
  calendarDate: string; // formatted date string
  isoDate: string;
  type: 'WORKOUT' | 'REST' | 'OPTIONAL';
  workoutId?: string | null;
  workoutName: string;
  isOptional: boolean;
  exerciseCount?: number;
  notes?: string;
}

export interface WeekSchedulePreview {
  weekNumber: number;
  name: string;
  focus?: string;
  startDateFormatted: string;
  endDateFormatted: string;
  days: DaySchedulePreview[];
}
