import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  increment
} from 'firebase/firestore';
import { db } from './firebase';
import { handleFirestoreError, OperationType } from './firestoreError';
import { Program, ProgramWeek, ProgramScheduleItem, Workout, DayOfWeek } from '../types/program';
import {
  ProgramAssignment,
  AssignmentStatus,
  ProgramSnapshot,
  WeekSchedulePreview,
  DaySchedulePreview
} from '../types/assignment';

/**
 * Parses a YYYY-MM-DD string into a safe local Date (midnight)
 */
export function parseDateString(dateStr: string): Date {
  const parts = dateStr.split('-').map(Number);
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

/**
 * Formats a Date into YYYY-MM-DD
 */
export function formatDateToYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Formats a date string into readable text (e.g. September 15, 2026)
 * Supports timezone parameter if provided
 */
export function formatReadableDate(dateStr: string, timezone?: string): string {
  if (!dateStr) return '';
  const date = parseDateString(dateStr);
  const options: Intl.DateTimeFormatOptions = {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  };
  if (timezone) {
    try {
      options.timeZone = timezone;
    } catch {
      // Fall back to default
    }
  }
  return date.toLocaleDateString('en-US', options);
}

/**
 * Calculates the program's inclusive end date given start date and duration weeks.
 * Example: 12 weeks starting Sep 15, 2026 ends Dec 7, 2026 (84 days total: Day 1 Sep 15, Day 84 Dec 7).
 */
export function calculateProgramEndDate(
  startDateStr: string,
  durationWeeks: number,
  timezone?: string
): { endDateStr: string; formattedStart: string; formattedEnd: string } {
  const startDate = parseDateString(startDateStr);
  const weeks = Math.max(1, durationWeeks || 1);
  const totalDays = weeks * 7;
  
  // Inclusive final day of the program: startDate + (totalDays - 1)
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + (totalDays - 1));

  const endDateStr = formatDateToYMD(endDate);
  const formattedStart = formatReadableDate(startDateStr, timezone);
  const formattedEnd = formatReadableDate(endDateStr, timezone);

  return { endDateStr, formattedStart, formattedEnd };
}

/**
 * Builds week-by-week calendar schedule preview from the selected start date.
 */
export function buildSchedulePreview(
  startDateStr: string,
  durationWeeks: number,
  weeks: ProgramWeek[],
  scheduleItems: ProgramScheduleItem[],
  workouts: Workout[],
  timezone?: string
): WeekSchedulePreview[] {
  const startDate = parseDateString(startDateStr);
  const totalWeeks = Math.max(1, durationWeeks || 1);
  const preview: WeekSchedulePreview[] = [];

  const workoutMap = new Map<string, Workout>();
  workouts.forEach(w => workoutMap.set(w.id, w));

  for (let w = 0; w < totalWeeks; w++) {
    const weekNumber = w + 1;
    const weekStart = new Date(startDate);
    weekStart.setDate(weekStart.getDate() + (w * 7));

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const weekConfig = weeks.find(item => item.weekNumber === weekNumber);
    const weekName = weekConfig?.name || `Week ${weekNumber}`;
    const weekFocus = weekConfig?.focus || '';

    const days: DaySchedulePreview[] = [];

    for (let d = 0; d < 7; d++) {
      const currentDay = new Date(weekStart);
      currentDay.setDate(currentDay.getDate() + d);

      const isoDate = formatDateToYMD(currentDay);
      const dayOfWeek = currentDay.toLocaleDateString('en-US', { weekday: 'long', timeZone: timezone }) as DayOfWeek;
      const calendarDate = currentDay.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        timeZone: timezone
      });

      // Find schedule item for this weekNumber and dayOfWeek
      const scheduleItem = scheduleItems.find(
        s => s.weekNumber === weekNumber && s.dayOfWeek === dayOfWeek
      );

      let type: 'WORKOUT' | 'REST' | 'OPTIONAL' = scheduleItem?.type || 'REST';
      let workoutName = 'Rest Day';
      let workoutId: string | null = scheduleItem?.workoutId || null;
      let exerciseCount = 0;
      let isOptional = scheduleItem?.isOptional || false;
      let notes = scheduleItem?.notes;

      if (workoutId && workoutMap.has(workoutId)) {
        const wk = workoutMap.get(workoutId)!;
        workoutName = wk.name;
        exerciseCount = wk.exerciseCount || 0;
        if (!scheduleItem) {
          type = 'WORKOUT';
        }
      } else if (scheduleItem?.type === 'WORKOUT') {
        workoutName = 'Scheduled Workout';
      }

      days.push({
        dayIndex: d,
        dayOfWeek,
        calendarDate,
        isoDate,
        type,
        workoutId,
        workoutName,
        isOptional,
        exerciseCount,
        notes
      });
    }

    preview.push({
      weekNumber,
      name: weekName,
      focus: weekFocus,
      startDateFormatted: formatReadableDate(formatDateToYMD(weekStart), timezone),
      endDateFormatted: formatReadableDate(formatDateToYMD(weekEnd), timezone),
      days
    });
  }

  return preview;
}

/**
 * Checks if a client already has an active assignment for this specific program.
 */
export async function checkExistingActiveAssignment(
  tenantId: string,
  clientId: string,
  programId: string
): Promise<{ hasActive: boolean; assignmentId?: string }> {
  try {
    const assignmentsRef = collection(db, 'tenants', tenantId, 'assignments');
    const q = query(
      assignmentsRef,
      where('clientId', '==', clientId)
    );
    const snap = await getDocs(q);
    const existing = snap.docs.find(d => {
      const data = d.data();
      return data.programId === programId && (data.status === 'ACTIVE' || data.status === 'PAUSED');
    });

    if (existing) {
      return { hasActive: true, assignmentId: existing.id };
    }
    return { hasActive: false };
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, `tenants/${tenantId}/assignments`);
    return { hasActive: false };
  }
}

/**
 * Creates a Program Assignment with immutable snapshot metadata and audit logging.
 */
export async function createProgramAssignment(
  tenantId: string,
  params: {
    program: Program;
    client: { id: string; firstName: string; lastName: string; email: string; trainerId?: string };
    startDate: string; // YYYY-MM-DD
    assignedBy: string; // user uid
    trainerName?: string;
    weeks?: ProgramWeek[];
    scheduleItems?: ProgramScheduleItem[];
    workouts?: Workout[];
    notes?: string;
    timezone?: string;
  }
): Promise<string> {
  const { program, client, startDate, assignedBy, trainerName, weeks = [], scheduleItems = [], workouts = [], notes, timezone } = params;

  // Validate Program Status
  if (program.status === 'DRAFT') {
    throw new Error('Publish this program before assigning it to a client.');
  }
  if (program.status === 'ARCHIVED') {
    throw new Error('Archived programs cannot be newly assigned.');
  }

  const { endDateStr } = calculateProgramEndDate(startDate, program.durationWeeks, timezone);

  // Generate unique assignment ID
  const assignmentId = `assign_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const assignmentRef = doc(db, 'tenants', tenantId, 'assignments', assignmentId);

  const workoutMap = new Map<string, Workout>();
  workouts.forEach(w => workoutMap.set(w.id, w));

  // Build immutable snapshot of program
  const programSnapshot: ProgramSnapshot = {
    id: program.id,
    name: program.name,
    description: program.description || '',
    durationWeeks: program.durationWeeks,
    difficulty: program.difficulty,
    goal: program.goal,
    version: 1,
    workoutCount: workouts.length,
    weeks: weeks.map(w => ({
      weekNumber: w.weekNumber,
      name: w.name,
      focus: w.focus || ''
    })),
    scheduleSummary: scheduleItems.map(s => ({
      weekNumber: s.weekNumber,
      dayOfWeek: s.dayOfWeek,
      type: s.type,
      workoutId: s.workoutId || null,
      workoutName: s.workoutId && workoutMap.has(s.workoutId) 
        ? workoutMap.get(s.workoutId)!.name 
        : (s.type === 'REST' ? 'Rest Day' : 'Session'),
      isOptional: s.isOptional || false,
      notes: s.notes || ''
    }))
  };

  const clientFullName = `${client.firstName || ''} ${client.lastName || ''}`.trim() || 'Client';

  const assignmentData: ProgramAssignment = {
    id: assignmentId,
    tenantId,
    programId: program.id,
    clientId: client.id,
    assignedBy,
    trainerId: client.trainerId || '',
    startDate,
    endDate: endDateStr,
    status: 'ACTIVE',
    programVersion: 1,
    programSnapshotId: `${program.id}_v1`,
    programName: program.name,
    programDurationWeeks: program.durationWeeks,
    clientName: clientFullName,
    clientEmail: client.email || '',
    trainerName: trainerName || 'Unassigned',
    programSnapshot,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    notes: notes || ''
  };

  try {
    await setDoc(assignmentRef, assignmentData);

    // Update program assignedClientCount
    const programRef = doc(db, 'tenants', tenantId, 'programs', program.id);
    await updateDoc(programRef, {
      assignedClientCount: increment(1),
      updatedAt: new Date().toISOString()
    }).catch(err => {
      console.warn('Could not increment program.assignedClientCount:', err);
    });

    // Write Audit Log
    const auditLogRef = doc(collection(db, 'tenants', tenantId, 'auditLogs'), `log_${Date.now()}`);
    await setDoc(auditLogRef, {
      action: 'PROGRAM_ASSIGNED',
      performedBy: assignedBy,
      targetId: assignmentId,
      details: {
        programId: program.id,
        programName: program.name,
        clientId: client.id,
        clientName: clientFullName,
        startDate,
        endDate: endDateStr
      },
      timestamp: new Date().toISOString()
    }).catch(err => {
      console.warn('Could not write audit log:', err);
    });

    return assignmentId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `tenants/${tenantId}/assignments/${assignmentId}`);
    throw error;
  }
}

/**
 * Pauses an active program assignment.
 */
export async function pauseProgramAssignment(
  tenantId: string,
  assignmentId: string,
  performedBy: string,
  meta?: { programId?: string; clientId?: string; programName?: string; clientName?: string }
): Promise<void> {
  const assignmentRef = doc(db, 'tenants', tenantId, 'assignments', assignmentId);
  try {
    await updateDoc(assignmentRef, {
      status: 'PAUSED',
      pausedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // Audit Log
    const auditLogRef = doc(collection(db, 'tenants', tenantId, 'auditLogs'), `log_${Date.now()}`);
    await setDoc(auditLogRef, {
      action: 'PROGRAM_PAUSED',
      performedBy,
      targetId: assignmentId,
      details: meta || {},
      timestamp: new Date().toISOString()
    }).catch(console.warn);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `tenants/${tenantId}/assignments/${assignmentId}`);
  }
}

/**
 * Resumes a paused program assignment.
 */
export async function resumeProgramAssignment(
  tenantId: string,
  assignmentId: string,
  performedBy: string,
  meta?: { programId?: string; clientId?: string; programName?: string; clientName?: string }
): Promise<void> {
  const assignmentRef = doc(db, 'tenants', tenantId, 'assignments', assignmentId);
  try {
    await updateDoc(assignmentRef, {
      status: 'ACTIVE',
      resumedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // Audit Log
    const auditLogRef = doc(collection(db, 'tenants', tenantId, 'auditLogs'), `log_${Date.now()}`);
    await setDoc(auditLogRef, {
      action: 'PROGRAM_RESUMED',
      performedBy,
      targetId: assignmentId,
      details: meta || {},
      timestamp: new Date().toISOString()
    }).catch(console.warn);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `tenants/${tenantId}/assignments/${assignmentId}`);
  }
}

/**
 * Cancels a program assignment (preserves record, does not delete).
 */
export async function cancelProgramAssignment(
  tenantId: string,
  assignmentId: string,
  performedBy: string,
  meta?: { programId?: string; clientId?: string; programName?: string; clientName?: string; wasActive?: boolean }
): Promise<void> {
  const assignmentRef = doc(db, 'tenants', tenantId, 'assignments', assignmentId);
  try {
    await updateDoc(assignmentRef, {
      status: 'CANCELLED',
      cancelledAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // Decrement program active count if it was previously active/paused
    if (meta?.programId && meta.wasActive !== false) {
      const programRef = doc(db, 'tenants', tenantId, 'programs', meta.programId);
      await updateDoc(programRef, {
        assignedClientCount: increment(-1),
        updatedAt: new Date().toISOString()
      }).catch(console.warn);
    }

    // Audit Log
    const auditLogRef = doc(collection(db, 'tenants', tenantId, 'auditLogs'), `log_${Date.now()}`);
    await setDoc(auditLogRef, {
      action: 'PROGRAM_CANCELLED',
      performedBy,
      targetId: assignmentId,
      details: meta || {},
      timestamp: new Date().toISOString()
    }).catch(console.warn);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `tenants/${tenantId}/assignments/${assignmentId}`);
  }
}

/**
 * Fetches all assignments for a specific client.
 */
export async function fetchClientAssignments(
  tenantId: string,
  clientId: string
): Promise<ProgramAssignment[]> {
  try {
    const assignmentsRef = collection(db, 'tenants', tenantId, 'assignments');
    const q = query(assignmentsRef, where('clientId', '==', clientId));
    const snap = await getDocs(q);

    const list: ProgramAssignment[] = snap.docs.map(d => ({
      id: d.id,
      ...(d.data() as Omit<ProgramAssignment, 'id'>)
    }));

    // Sort: ACTIVE/PAUSED first, then by createdAt desc
    list.sort((a, b) => {
      const statusWeight: Record<AssignmentStatus, number> = {
        ACTIVE: 1,
        PAUSED: 2,
        COMPLETED: 3,
        CANCELLED: 4
      };
      if (statusWeight[a.status] !== statusWeight[b.status]) {
        return statusWeight[a.status] - statusWeight[b.status];
      }
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });

    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, `tenants/${tenantId}/assignments`);
    return [];
  }
}

/**
 * Fetches all assignments for a specific program.
 */
export async function fetchProgramAssignments(
  tenantId: string,
  programId: string
): Promise<ProgramAssignment[]> {
  try {
    const assignmentsRef = collection(db, 'tenants', tenantId, 'assignments');
    const q = query(assignmentsRef, where('programId', '==', programId));
    const snap = await getDocs(q);

    const list: ProgramAssignment[] = snap.docs.map(d => ({
      id: d.id,
      ...(d.data() as Omit<ProgramAssignment, 'id'>)
    }));

    list.sort((a, b) => {
      const statusWeight: Record<AssignmentStatus, number> = {
        ACTIVE: 1,
        PAUSED: 2,
        COMPLETED: 3,
        CANCELLED: 4
      };
      if (statusWeight[a.status] !== statusWeight[b.status]) {
        return statusWeight[a.status] - statusWeight[b.status];
      }
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });

    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, `tenants/${tenantId}/assignments`);
    return [];
  }
}
