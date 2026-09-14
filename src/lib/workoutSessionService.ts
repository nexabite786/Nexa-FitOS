import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from './firebase';
import { handleFirestoreError, OperationType } from './firestoreError';
import {
  WorkoutSession,
  WorkoutSetLog,
  TodayWorkoutState,
  ClientScheduledWorkoutItem,
  CompletedSetSummaryItem,
  PersonalRecord,
  ConsistencyStats
} from '../types/workoutSession';
import { ProgramAssignment, DaySchedulePreview } from '../types/assignment';
import { Workout, WorkoutExercisePrescription, Exercise } from '../types/program';
import {
  fetchClientAssignments,
  formatDateToYMD,
  formatReadableDate,
  parseDateString
} from './assignmentService';
import { fetchProgramWeeksAndSchedule } from './scheduleService';

// ----------------------------------------------------------------------
// TODAY'S WORKOUT CALCULATION
// ----------------------------------------------------------------------

/**
 * Calculates today's workout state for a client based on their active program assignment.
 * Accurately determines if today is a workout, rest, or optional day using the start date & timezone.
 */
export async function getClientTodayWorkout(
  tenantId: string,
  clientId: string,
  timezone?: string
): Promise<TodayWorkoutState> {
  const assignments = await fetchClientAssignments(tenantId, clientId);
  const activeAssignment = assignments.find(a => a.status === 'ACTIVE');

  if (!activeAssignment) {
    return {
      hasActiveProgram: false,
      isRestDay: false
    };
  }

  // Calculate today's date in YYYY-MM-DD
  const now = new Date();
  const todayYMD = formatDateToYMD(now);

  // Fetch program schedule and workouts
  const { weeks, scheduleItems, workouts } = await fetchProgramWeeksAndSchedule(
    tenantId,
    activeAssignment.programId
  );

  const workoutMap = new Map<string, Workout>();
  workouts.forEach(w => workoutMap.set(w.id, w));

  // Determine elapsed days since program start
  const startDate = parseDateString(activeAssignment.startDate);
  const todayDate = parseDateString(todayYMD);

  // Difference in calendar days
  const diffTime = todayDate.getTime() - startDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const totalDays = (activeAssignment.programDurationWeeks || 1) * 7;

  // Day of week for today
  const todayDayOfWeek = todayDate.toLocaleDateString('en-US', {
    weekday: 'long',
    timeZone: timezone
  });

  // Check if today falls before program start
  if (diffDays < 0) {
    // Program starts in the future, find first scheduled workout
    const nextWorkout = findNextScheduledWorkout(
      activeAssignment.startDate,
      weeks,
      scheduleItems,
      workoutMap,
      0,
      totalDays,
      timezone
    );

    return {
      hasActiveProgram: true,
      isRestDay: true,
      programName: activeAssignment.programName,
      programId: activeAssignment.programId,
      assignmentId: activeAssignment.id,
      scheduledDate: todayYMD,
      nextScheduledWorkout: nextWorkout
    };
  }

  // Check if program duration has passed
  if (diffDays >= totalDays) {
    return {
      hasActiveProgram: true,
      isRestDay: true,
      programName: activeAssignment.programName,
      programId: activeAssignment.programId,
      assignmentId: activeAssignment.id,
      scheduledDate: todayYMD,
      nextScheduledWorkout: null
    };
  }

  // Current week number (1-indexed)
  const currentWeekNumber = Math.floor(diffDays / 7) + 1;

  // Find schedule item for this week and day of week
  const scheduleItem = scheduleItems.find(
    s => s.weekNumber === currentWeekNumber && s.dayOfWeek === todayDayOfWeek
  );

  const nextWorkout = findNextScheduledWorkout(
    activeAssignment.startDate,
    weeks,
    scheduleItems,
    workoutMap,
    diffDays + 1,
    totalDays,
    timezone
  );

  // If no schedule item or type is REST
  if (!scheduleItem || scheduleItem.type === 'REST' || !scheduleItem.workoutId) {
    return {
      hasActiveProgram: true,
      isRestDay: true,
      programName: activeAssignment.programName,
      programId: activeAssignment.programId,
      assignmentId: activeAssignment.id,
      scheduledDate: todayYMD,
      nextScheduledWorkout: nextWorkout
    };
  }

  // It is a workout day!
  const workout = workoutMap.get(scheduleItem.workoutId);
  const workoutName = workout?.name || (scheduleItem as any).workoutName || 'Scheduled Workout';
  const isOptional = scheduleItem.type === 'OPTIONAL' || scheduleItem.isOptional === true;

  // Check if session already started or completed today
  const existingSession = await findSessionByDate(
    tenantId,
    clientId,
    scheduleItem.workoutId,
    todayYMD
  );

  let sessionStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' = 'NOT_STARTED';
  if (existingSession) {
    if (existingSession.status === 'COMPLETED') {
      sessionStatus = 'COMPLETED';
    } else if (existingSession.status === 'IN_PROGRESS') {
      sessionStatus = 'IN_PROGRESS';
    }
  }

  // Target muscles from workout if available
  const targetMuscles = workout?.exercises
    ? Array.from(new Set(workout.exercises.map(e => (e as any).targetMuscleGroup).filter(Boolean)))
    : [];

  return {
    hasActiveProgram: true,
    isRestDay: false,
    programName: activeAssignment.programName,
    programId: activeAssignment.programId,
    assignmentId: activeAssignment.id,
    workoutId: scheduleItem.workoutId,
    workoutName,
    workoutDescription: workout?.description || '',
    isOptional,
    scheduledDate: todayYMD,
    exerciseCount: workout?.exerciseCount || workout?.exercises?.length || 0,
    totalSets: workout?.exercises?.reduce((sum, e) => sum + (Number(e.sets) || 3), 0) || 0,
    targetMuscles,
    sessionStatus,
    existingSessionId: existingSession?.id,
    nextScheduledWorkout: nextWorkout
  };
}

/**
 * Scans forward in the schedule from startOffsetDays to find the next scheduled workout.
 */
function findNextScheduledWorkout(
  startDateStr: string,
  weeks: any[],
  scheduleItems: any[],
  workoutMap: Map<string, Workout>,
  startOffsetDays: number,
  totalDays: number,
  timezone?: string
): {
  name: string;
  dateFormatted: string;
  dayOfWeek: string;
  isoDate: string;
  workoutId: string;
  exerciseCount: number;
} | null {
  const startDate = parseDateString(startDateStr);

  for (let offset = Math.max(0, startOffsetDays); offset < totalDays; offset++) {
    const targetDate = new Date(startDate);
    targetDate.setDate(targetDate.getDate() + offset);

    const weekNumber = Math.floor(offset / 7) + 1;
    const dayOfWeek = targetDate.toLocaleDateString('en-US', {
      weekday: 'long',
      timeZone: timezone
    });

    const item = scheduleItems.find(
      s => s.weekNumber === weekNumber && s.dayOfWeek === dayOfWeek
    );

    if (item && item.type !== 'REST' && item.workoutId) {
      const wk = workoutMap.get(item.workoutId);
      const isoDate = formatDateToYMD(targetDate);
      const dateFormatted = formatReadableDate(isoDate, timezone);

      return {
        name: wk?.name || item.workoutName || 'Upcoming Workout',
        dateFormatted,
        dayOfWeek,
        isoDate,
        workoutId: item.workoutId,
        exerciseCount: wk?.exerciseCount || wk?.exercises?.length || 0
      };
    }
  }

  return null;
}

// ----------------------------------------------------------------------
// WORKOUT SESSIONS & HISTORY
// ----------------------------------------------------------------------

/**
 * Finds an existing workout session for a given client, workout, and scheduled date.
 */
export async function findSessionByDate(
  tenantId: string,
  clientId: string,
  workoutId: string,
  scheduledDate: string
): Promise<WorkoutSession | null> {
  const basePath = `tenants/${tenantId}/workoutSessions`;
  try {
    const q = query(
      collection(db, 'tenants', tenantId, 'workoutSessions'),
      where('clientId', '==', clientId),
      where('scheduledDate', '==', scheduledDate)
    );
    const snap = await getDocs(q);
    const match = snap.docs.find(d => d.data().workoutId === workoutId);
    if (!match) return null;
    return { id: match.id, ...match.data() } as WorkoutSession;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, basePath);
    return null;
  }
}

/**
 * Gets or creates a workout session.
 * If an active/in-progress or completed session already exists, it returns it to prevent duplicates.
 */
export async function getOrCreateWorkoutSession(
  tenantId: string,
  params: {
    clientId: string;
    assignmentId: string;
    programId: string;
    workoutId: string;
    workoutName: string;
    scheduledDate: string;
    totalExercises: number;
    totalSets: number;
  }
): Promise<{ session: WorkoutSession; existingSets: WorkoutSetLog[] }> {
  const {
    clientId,
    assignmentId,
    programId,
    workoutId,
    workoutName,
    scheduledDate,
    totalExercises,
    totalSets
  } = params;

  // 1. Check for existing session on this scheduledDate
  const existing = await findSessionByDate(tenantId, clientId, workoutId, scheduledDate);

  if (existing) {
    const existingSets = await fetchSessionSets(tenantId, existing.id);
    return { session: existing, existingSets };
  }

  // 2. Create new session with IN_PROGRESS status
  const sessionId = `ws_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const sessionRef = doc(db, 'tenants', tenantId, 'workoutSessions', sessionId);
  const now = new Date().toISOString();

  const newSession: WorkoutSession = {
    id: sessionId,
    sessionId,
    tenantId,
    clientId,
    assignmentId,
    programId,
    workoutId,
    workoutName,
    scheduledDate,
    startedAt: now,
    completedAt: null,
    status: 'IN_PROGRESS',
    totalExercises,
    completedExercises: 0,
    totalSets,
    completedSets: 0,
    totalVolumeKg: 0,
    totalVolumeLbs: 0,
    personalRecordsAchieved: [],
    completedSetsSummary: [],
    createdAt: now,
    updatedAt: now
  };

  try {
    await setDoc(sessionRef, newSession);
    return { session: newSession, existingSets: [] };
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `tenants/${tenantId}/workoutSessions/${sessionId}`);
    throw err;
  }
}

/**
 * Calculates volume in kg and lbs for a list of set logs.
 */
export function calculateWorkoutVolume(sets: Array<{ weight?: number; weightUnit?: string; reps?: number }>): {
  volumeKg: number;
  volumeLbs: number;
} {
  let volumeKg = 0;
  let volumeLbs = 0;

  for (const s of sets) {
    const w = s.weight || 0;
    const r = s.reps || 0;
    if (w > 0 && r > 0) {
      if (s.weightUnit === 'lbs') {
        const lbs = w * r;
        volumeLbs += lbs;
        volumeKg += lbs * 0.45359237;
      } else {
        const kg = w * r;
        volumeKg += kg;
        volumeLbs += kg * 2.20462262;
      }
    }
  }

  return {
    volumeKg: Math.round(volumeKg * 10) / 10,
    volumeLbs: Math.round(volumeLbs * 10) / 10
  };
}

/**
 * Fetches all personal records for a client.
 */
export async function fetchClientPersonalRecords(
  tenantId: string,
  clientId: string
): Promise<PersonalRecord[]> {
  const path = `tenants/${tenantId}/clients/${clientId}/personalRecords`;
  try {
    const snap = await getDocs(collection(db, 'tenants', tenantId, 'clients', clientId, 'personalRecords'));
    const records: PersonalRecord[] = [];
    snap.forEach(d => {
      records.push({ id: d.id, ...d.data() } as PersonalRecord);
    });
    // Sort by achievedAt desc
    records.sort((a, b) => new Date(b.achievedAt || 0).getTime() - new Date(a.achievedAt || 0).getTime());
    return records;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
    return [];
  }
}

/**
 * Evaluates completed sets for PRs and saves any newly established records.
 */
export async function checkAndUpdatePersonalRecords(
  tenantId: string,
  clientId: string,
  sessionId: string,
  workoutName: string,
  sets: WorkoutSetLog[],
  exerciseNames?: Record<string, string>
): Promise<PersonalRecord[]> {
  if (!sets || sets.length === 0) return [];

  const existingPRs = await fetchClientPersonalRecords(tenantId, clientId);
  const prMap = new Map<string, PersonalRecord>();
  existingPRs.forEach(pr => prMap.set(`${pr.exerciseId}_${pr.type}`, pr));

  const newRecordsAchieved: PersonalRecord[] = [];
  const now = new Date().toISOString();

  // Group sets by exercise
  const setsByExercise = new Map<string, WorkoutSetLog[]>();
  sets.filter(s => s.completed).forEach(s => {
    const list = setsByExercise.get(s.exerciseId) || [];
    list.push(s);
    setsByExercise.set(s.exerciseId, list);
  });

  for (const [exerciseId, exerciseSets] of setsByExercise.entries()) {
    const exName = exerciseNames?.[exerciseId] || exerciseSets[0]?.exerciseName || 'Exercise';

    // 1. Heaviest Weight
    let maxWeightSet: WorkoutSetLog | null = null;
    let maxWeightKg = 0;

    for (const s of exerciseSets) {
      if (s.weight && s.weight > 0 && (s.reps || 0) > 0) {
        const weightKg = s.weightUnit === 'lbs' ? s.weight * 0.45359237 : s.weight;
        if (weightKg > maxWeightKg) {
          maxWeightKg = weightKg;
          maxWeightSet = s;
        }
      }
    }

    if (maxWeightSet && maxWeightSet.weight) {
      const prKey = `${exerciseId}_HEAVIEST_WEIGHT`;
      const existing = prMap.get(prKey);
      const existingValKg = existing
        ? existing.unit === 'lbs'
          ? existing.value * 0.45359237
          : existing.value
        : 0;

      if (!existing || maxWeightKg > existingValKg) {
        const record: PersonalRecord = {
          id: prKey,
          tenantId,
          clientId,
          exerciseId,
          exerciseName: exName,
          type: 'HEAVIEST_WEIGHT',
          value: maxWeightSet.weight,
          unit: maxWeightSet.weightUnit || 'kg',
          achievedAt: now,
          sessionId,
          workoutName,
          weight: maxWeightSet.weight,
          reps: maxWeightSet.reps,
          previousValue: existing?.value
        };
        newRecordsAchieved.push(record);
        prMap.set(prKey, record);
        try {
          await setDoc(doc(db, 'tenants', tenantId, 'clients', clientId, 'personalRecords', prKey), record);
        } catch (e) {
          console.warn('Failed saving PR Heaviest Weight:', e);
        }
      }
    }

    // 2. Best Reps (at heaviest weight or max reps overall)
    let maxRepsSet: WorkoutSetLog | null = null;
    let maxReps = 0;
    for (const s of exerciseSets) {
      if (s.reps && s.reps > maxReps) {
        maxReps = s.reps;
        maxRepsSet = s;
      }
    }

    if (maxRepsSet && maxReps > 0) {
      const prKey = `${exerciseId}_BEST_REPS`;
      const existing = prMap.get(prKey);
      if (!existing || maxReps > existing.value) {
        const record: PersonalRecord = {
          id: prKey,
          tenantId,
          clientId,
          exerciseId,
          exerciseName: exName,
          type: 'BEST_REPS',
          value: maxReps,
          unit: 'reps',
          achievedAt: now,
          sessionId,
          workoutName,
          reps: maxReps,
          weight: maxRepsSet.weight,
          previousValue: existing?.value
        };
        newRecordsAchieved.push(record);
        prMap.set(prKey, record);
        try {
          await setDoc(doc(db, 'tenants', tenantId, 'clients', clientId, 'personalRecords', prKey), record);
        } catch (e) {
          console.warn('Failed saving PR Best Reps:', e);
        }
      }
    }

    // 3. Highest Single-Set Volume
    let maxSetVolume = 0;
    let maxVolumeSet: WorkoutSetLog | null = null;
    for (const s of exerciseSets) {
      if (s.weight && s.reps && s.weight > 0 && s.reps > 0) {
        const vol = s.weight * s.reps;
        if (vol > maxSetVolume) {
          maxSetVolume = vol;
          maxVolumeSet = s;
        }
      }
    }

    if (maxVolumeSet && maxSetVolume > 0) {
      const prKey = `${exerciseId}_HIGHEST_VOLUME`;
      const existing = prMap.get(prKey);
      if (!existing || maxSetVolume > existing.value) {
        const record: PersonalRecord = {
          id: prKey,
          tenantId,
          clientId,
          exerciseId,
          exerciseName: exName,
          type: 'HIGHEST_VOLUME',
          value: maxSetVolume,
          unit: maxVolumeSet.weightUnit || 'kg',
          achievedAt: now,
          sessionId,
          workoutName,
          weight: maxVolumeSet.weight,
          reps: maxVolumeSet.reps,
          previousValue: existing?.value
        };
        newRecordsAchieved.push(record);
        prMap.set(prKey, record);
        try {
          await setDoc(doc(db, 'tenants', tenantId, 'clients', clientId, 'personalRecords', prKey), record);
        } catch (e) {
          console.warn('Failed saving PR Highest Volume:', e);
        }
      }
    }

    // 4. Longest Duration (timed exercises)
    let maxDuration = 0;
    let maxDurationSet: WorkoutSetLog | null = null;
    for (const s of exerciseSets) {
      if (s.durationSeconds && s.durationSeconds > maxDuration) {
        maxDuration = s.durationSeconds;
        maxDurationSet = s;
      }
    }

    if (maxDurationSet && maxDuration > 0) {
      const prKey = `${exerciseId}_LONGEST_DURATION`;
      const existing = prMap.get(prKey);
      if (!existing || maxDuration > existing.value) {
        const record: PersonalRecord = {
          id: prKey,
          tenantId,
          clientId,
          exerciseId,
          exerciseName: exName,
          type: 'LONGEST_DURATION',
          value: maxDuration,
          unit: 'sec',
          achievedAt: now,
          sessionId,
          workoutName,
          durationSeconds: maxDuration,
          previousValue: existing?.value
        };
        newRecordsAchieved.push(record);
        prMap.set(prKey, record);
        try {
          await setDoc(doc(db, 'tenants', tenantId, 'clients', clientId, 'personalRecords', prKey), record);
        } catch (e) {
          console.warn('Failed saving PR Longest Duration:', e);
        }
      }
    }
  }

  return newRecordsAchieved;
}

/**
 * Logs a completed set.
 * Uses a deterministic setId (`set_${sessionId}_${exerciseId}_${setNumber}`) to guarantee
 * that duplicate taps do not create duplicate records.
 */
export async function logWorkoutSet(
  tenantId: string,
  sessionId: string,
  setLog: {
    exerciseId: string;
    exerciseName?: string;
    setNumber: number;
    setType: string;
    blockId?: string;
    blockType?: any;
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
  }
): Promise<WorkoutSetLog> {
  // Input validation
  const weight = setLog.weight !== undefined ? Math.max(0, Number(setLog.weight)) : undefined;
  const reps = setLog.reps !== undefined ? Math.max(0, Math.floor(Number(setLog.reps))) : undefined;
  const durationSeconds =
    setLog.durationSeconds !== undefined ? Math.max(0, Math.floor(Number(setLog.durationSeconds))) : undefined;

  const setId = `set_${sessionId}_${setLog.exerciseId}_${setLog.setNumber}${setLog.dropIndex !== undefined ? `_drop${setLog.dropIndex}` : ''}`;
  const setRef = doc(db, 'tenants', tenantId, 'workoutSessions', sessionId, 'sets', setId);
  const now = new Date().toISOString();

  const payload: WorkoutSetLog = {
    id: setId,
    sessionId,
    exerciseId: setLog.exerciseId,
    exerciseName: setLog.exerciseName,
    setNumber: setLog.setNumber,
    setType: setLog.setType || 'NORMAL',
    blockId: setLog.blockId,
    blockType: setLog.blockType,
    roundNumber: setLog.roundNumber,
    parentSetNumber: setLog.parentSetNumber,
    isDrop: setLog.isDrop,
    dropIndex: setLog.dropIndex,
    weight,
    weightUnit: setLog.weightUnit || 'kg',
    reps,
    targetReps: setLog.targetReps,
    durationSeconds,
    targetDurationSeconds: setLog.targetDurationSeconds,
    rpe: setLog.rpe,
    rir: setLog.rir,
    tempo: setLog.tempo,
    notes: setLog.notes,
    completed: true,
    completedAt: now
  };

  try {
    // 1. Save set document
    await setDoc(setRef, payload);

    // 2. Read all sets for this session to update session summary and counter
    const allSets = await fetchSessionSets(tenantId, sessionId);
    const completedSetsCount = allSets.filter(s => s.completed).length;

    // Distinct completed exercises
    const distinctExercises = new Set(allSets.filter(s => s.completed).map(s => s.exerciseId));

    const summary: CompletedSetSummaryItem[] = allSets.map(s => ({
      exerciseId: s.exerciseId,
      exerciseName: s.exerciseName,
      setNumber: s.setNumber,
      setType: s.setType,
      weight: s.weight,
      weightUnit: s.weightUnit,
      reps: s.reps,
      durationSeconds: s.durationSeconds,
      rpe: s.rpe,
      rir: s.rir,
      tempo: s.tempo
    }));

    const vol = calculateWorkoutVolume(allSets);

    // Update session record
    const sessionRef = doc(db, 'tenants', tenantId, 'workoutSessions', sessionId);
    await updateDoc(sessionRef, {
      completedSets: completedSetsCount,
      completedExercises: distinctExercises.size,
      completedSetsSummary: summary,
      totalVolumeKg: vol.volumeKg,
      totalVolumeLbs: vol.volumeLbs,
      updatedAt: now
    });

    return payload;
  } catch (err) {
    handleFirestoreError(
      err,
      OperationType.WRITE,
      `tenants/${tenantId}/workoutSessions/${sessionId}/sets/${setId}`
    );
    throw err;
  }
}

/**
 * Fetches all set logs for a specific workout session.
 */
export async function fetchSessionSets(
  tenantId: string,
  sessionId: string
): Promise<WorkoutSetLog[]> {
  const path = `tenants/${tenantId}/workoutSessions/${sessionId}/sets`;
  try {
    const snap = await getDocs(collection(db, 'tenants', tenantId, 'workoutSessions', sessionId, 'sets'));
    const list: WorkoutSetLog[] = [];
    snap.forEach(d => {
      list.push({ id: d.id, ...d.data() } as WorkoutSetLog);
    });
    // Sort by setNumber and dropIndex
    list.sort((a, b) => {
      if (a.setNumber !== b.setNumber) return a.setNumber - b.setNumber;
      return (a.dropIndex || 0) - (b.dropIndex || 0);
    });
    return list;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
    return [];
  }
}

/**
 * Finalizes and completes a workout session.
 * Calculates duration, volume, PRs, and marks status as COMPLETED.
 */
export async function completeWorkoutSession(
  tenantId: string,
  sessionId: string,
  durationMinutes?: number,
  clientNotes?: string,
  exerciseNames?: Record<string, string>
): Promise<PersonalRecord[]> {
  const sessionRef = doc(db, 'tenants', tenantId, 'workoutSessions', sessionId);
  const now = new Date().toISOString();

  try {
    const currentSnap = await getDoc(sessionRef);
    if (!currentSnap.exists()) {
      throw new Error('Workout session not found');
    }

    const sessionData = currentSnap.data() as WorkoutSession;
    const sets = await fetchSessionSets(tenantId, sessionId);
    const volume = calculateWorkoutVolume(sets);

    // Evaluate PRs
    const prsAchieved = await checkAndUpdatePersonalRecords(
      tenantId,
      sessionData.clientId,
      sessionId,
      sessionData.workoutName,
      sets,
      exerciseNames
    );

    // Calculate duration from startedAt if durationMinutes not explicitly provided
    let calculatedDuration = durationMinutes;
    if (calculatedDuration === undefined && sessionData.startedAt) {
      const startTime = new Date(sessionData.startedAt).getTime();
      const endTime = new Date(now).getTime();
      calculatedDuration = Math.max(1, Math.round((endTime - startTime) / (1000 * 60)));
    }

    await updateDoc(sessionRef, {
      status: 'COMPLETED',
      completedAt: now,
      durationMinutes: calculatedDuration !== undefined ? Math.max(1, calculatedDuration) : 1,
      totalVolumeKg: volume.volumeKg,
      totalVolumeLbs: volume.volumeLbs,
      personalRecordsAchieved: prsAchieved,
      clientNotes: clientNotes || sessionData.clientNotes || '',
      updatedAt: now
    });

    return prsAchieved;
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `tenants/${tenantId}/workoutSessions/${sessionId}`);
    throw err;
  }
}

/**
 * Computes comprehensive consistency and training metrics for a client.
 */
export async function calculateClientConsistencyStats(
  tenantId: string,
  clientId: string,
  timezone?: string
): Promise<ConsistencyStats> {
  const sessions = await fetchCompletedClientSessions(tenantId, clientId);

  const now = new Date();
  const todayYMD = formatDateToYMD(now);
  const todayDate = parseDateString(todayYMD);

  // Determine current week Monday-Sunday
  const dayOfWeekIndex = (todayDate.getDay() + 6) % 7; // Monday = 0
  const mondayDate = new Date(todayDate);
  mondayDate.setDate(todayDate.getDate() - dayOfWeekIndex);
  const sundayDate = new Date(mondayDate);
  sundayDate.setDate(mondayDate.getDate() + 6);

  const mondayYMD = formatDateToYMD(mondayDate);
  const sundayYMD = formatDateToYMD(sundayDate);

  // Determine current month YYYY-MM
  const currentMonthStr = todayYMD.substring(0, 7);

  let workoutsCompletedThisWeek = 0;
  let workoutsCompletedThisMonth = 0;
  let totalVolumeLiftedKg = 0;
  let totalVolumeLiftedLbs = 0;
  let totalTrainingMinutes = 0;

  // Track unique calendar weeks with completed workouts: key = "YYYY-Wxx"
  const completedWeeksSet = new Set<string>();

  for (const s of sessions) {
    const sessionDate = s.scheduledDate || (s.completedAt ? formatDateToYMD(new Date(s.completedAt)) : null);
    if (!sessionDate) continue;

    // This week check
    if (sessionDate >= mondayYMD && sessionDate <= sundayYMD) {
      workoutsCompletedThisWeek++;
    }

    // This month check
    if (sessionDate.startsWith(currentMonthStr)) {
      workoutsCompletedThisMonth++;
    }

    // Volume and Duration
    totalVolumeLiftedKg += s.totalVolumeKg || 0;
    totalVolumeLiftedLbs += s.totalVolumeLbs || 0;
    totalTrainingMinutes += s.durationMinutes || 0;

    // Calendar week key calculation
    const sDate = parseDateString(sessionDate);
    const firstDayOfYear = new Date(sDate.getFullYear(), 0, 1);
    const pastDaysOfYear = (sDate.getTime() - firstDayOfYear.getTime()) / 86400000;
    const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
    completedWeeksSet.add(`${sDate.getFullYear()}-W${String(weekNum).padStart(2, '0')}`);
  }

  // Calculate current streak in weeks (consecutive weeks backwards)
  let currentStreakWeeks = 0;
  let cursor = new Date(todayDate);
  let checkedCurrentWeek = false;

  while (true) {
    const firstOfYear = new Date(cursor.getFullYear(), 0, 1);
    const pastDays = (cursor.getTime() - firstOfYear.getTime()) / 86400000;
    const wNum = Math.ceil((pastDays + firstOfYear.getDay() + 1) / 7);
    const key = `${cursor.getFullYear()}-W${String(wNum).padStart(2, '0')}`;

    if (completedWeeksSet.has(key)) {
      currentStreakWeeks++;
      checkedCurrentWeek = true;
      cursor.setDate(cursor.getDate() - 7);
    } else {
      // If current week hasn't had a workout yet, give grace period to check previous week
      if (!checkedCurrentWeek) {
        checkedCurrentWeek = true;
        cursor.setDate(cursor.getDate() - 7);
        continue;
      }
      break;
    }
    if (currentStreakWeeks > 52) break; // safety bound
  }

  // Longest streak
  const longestStreakWeeks = Math.max(currentStreakWeeks, completedWeeksSet.size > 0 ? 1 : 0);

  // Fetch active assignment for weekly target
  let weeklyTarget = 3;
  try {
    const assignments = await fetchClientAssignments(tenantId, clientId);
    const activeAssignment = assignments.find(a => a.status === 'ACTIVE');
    if (activeAssignment?.programId) {
      const { scheduleItems } = await fetchProgramWeeksAndSchedule(tenantId, activeAssignment.programId);
      const scheduledInWeek1 = scheduleItems.filter(s => s.weekNumber === 1 && s.type !== 'REST').length;
      if (scheduledInWeek1 > 0) weeklyTarget = scheduledInWeek1;
    }
  } catch (e) {
    console.warn('Could not compute program target:', e);
  }

  return {
    totalWorkoutsCompleted: sessions.length,
    workoutsCompletedThisWeek,
    weeklyTarget,
    workoutsCompletedThisMonth,
    currentStreakWeeks,
    longestStreakWeeks,
    totalVolumeLiftedKg: Math.round(totalVolumeLiftedKg * 10) / 10,
    totalVolumeLiftedLbs: Math.round(totalVolumeLiftedLbs * 10) / 10,
    totalTrainingMinutes
  };
}

/**
 * Fetches full session details including all logged sets and metadata.
 */
export async function fetchSessionDetails(
  tenantId: string,
  sessionId: string
): Promise<{ session: WorkoutSession; sets: WorkoutSetLog[] } | null> {
  const sessionRef = doc(db, 'tenants', tenantId, 'workoutSessions', sessionId);
  try {
    const snap = await getDoc(sessionRef);
    if (!snap.exists()) return null;
    const session = { id: snap.id, ...snap.data() } as WorkoutSession;
    const sets = await fetchSessionSets(tenantId, sessionId);
    return { session, sets };
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `tenants/${tenantId}/workoutSessions/${sessionId}`);
    return null;
  }
}

/**
 * Fetches all historical performances of a specific exercise for a client.
 */
export async function fetchExerciseHistory(
  tenantId: string,
  clientId: string,
  exerciseId: string
): Promise<Array<{
  sessionId: string;
  workoutName: string;
  date: string;
  completedAt: string;
  sets: WorkoutSetLog[];
  maxWeight?: number;
  maxReps?: number;
  volume?: number;
  weightUnit?: string;
}>> {
  const completedSessions = await fetchCompletedClientSessions(tenantId, clientId);
  const results: Array<{
    sessionId: string;
    workoutName: string;
    date: string;
    completedAt: string;
    sets: WorkoutSetLog[];
    maxWeight?: number;
    maxReps?: number;
    volume?: number;
    weightUnit?: string;
  }> = [];

  for (const sess of completedSessions) {
    const sets = await fetchSessionSets(tenantId, sess.id);
    const exerciseSets = sets.filter(s => s.exerciseId === exerciseId && s.completed);

    if (exerciseSets.length > 0) {
      let maxWeight = 0;
      let maxReps = 0;
      let volume = 0;
      let weightUnit = 'kg';

      exerciseSets.forEach(s => {
        if (s.weight && s.weight > maxWeight) maxWeight = s.weight;
        if (s.reps && s.reps > maxReps) maxReps = s.reps;
        if (s.weight && s.reps) volume += s.weight * s.reps;
        if (s.weightUnit) weightUnit = s.weightUnit;
      });

      results.push({
        sessionId: sess.id,
        workoutName: sess.workoutName,
        date: sess.scheduledDate,
        completedAt: sess.completedAt || sess.updatedAt,
        sets: exerciseSets,
        maxWeight: maxWeight > 0 ? maxWeight : undefined,
        maxReps: maxReps > 0 ? maxReps : undefined,
        volume: volume > 0 ? Math.round(volume * 10) / 10 : undefined,
        weightUnit
      });
    }
  }

  return results;
}

/**
 * Fetches previous performance for an exercise for a specific client.
 * Returns the latest completed set details if any exist, or null.
 */
export async function fetchPreviousExercisePerformance(
  tenantId: string,
  clientId: string,
  exerciseId: string,
  setNumber: number
): Promise<{ weight?: number; reps?: number; durationSeconds?: number; weightUnit?: string } | null> {
  try {
    // Find completed sessions for this client ordered by completedAt desc
    const q = query(
      collection(db, 'tenants', tenantId, 'workoutSessions'),
      where('clientId', '==', clientId),
      where('status', '==', 'COMPLETED'),
      orderBy('completedAt', 'desc'),
      limit(5)
    );

    const snap = await getDocs(q);
    for (const sessionDoc of snap.docs) {
      const data = sessionDoc.data() as WorkoutSession;
      if (data.completedSetsSummary && data.completedSetsSummary.length > 0) {
        // Look for exact setNumber match first
        const match = data.completedSetsSummary.find(
          s => s.exerciseId === exerciseId && s.setNumber === setNumber
        );
        if (match && (match.weight !== undefined || match.reps !== undefined || match.durationSeconds !== undefined)) {
          return {
            weight: match.weight,
            reps: match.reps,
            durationSeconds: match.durationSeconds,
            weightUnit: match.weightUnit || 'kg'
          };
        }

        // Fallback: any set for this exercise
        const anyMatch = data.completedSetsSummary.find(s => s.exerciseId === exerciseId);
        if (anyMatch) {
          return {
            weight: anyMatch.weight,
            reps: anyMatch.reps,
            durationSeconds: anyMatch.durationSeconds,
            weightUnit: anyMatch.weightUnit || 'kg'
          };
        }
      }
    }

    return null;
  } catch (err) {
    console.warn('Could not fetch previous performance:', err);
    return null;
  }
}

/**
 * Fetches all completed workout sessions for a client (chronological history).
 */
export async function fetchCompletedClientSessions(
  tenantId: string,
  clientId: string
): Promise<WorkoutSession[]> {
  const path = `tenants/${tenantId}/workoutSessions`;
  try {
    const q = query(
      collection(db, 'tenants', tenantId, 'workoutSessions'),
      where('clientId', '==', clientId),
      where('status', '==', 'COMPLETED')
    );
    const snap = await getDocs(q);
    const sessions: WorkoutSession[] = [];
    snap.forEach(d => sessions.push({ id: d.id, ...d.data() } as WorkoutSession));

    // Sort by completedAt descending
    sessions.sort((a, b) => {
      const tA = new Date(a.completedAt || a.updatedAt || 0).getTime();
      const tB = new Date(b.completedAt || b.updatedAt || 0).getTime();
      return tB - tA;
    });

    return sessions;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
    return [];
  }
}

/**
 * Fetches all scheduled workouts across the client's active program assignment,
 * mapping statuses to TODAY, UPCOMING, COMPLETED, or MISSED.
 */
export async function fetchClientAllScheduledWorkouts(
  tenantId: string,
  clientId: string,
  timezone?: string
): Promise<{
  program: ProgramAssignment | null;
  workouts: ClientScheduledWorkoutItem[];
  weeklyCompletedCount: number;
  weeklyScheduledCount: number;
}> {
  const assignments = await fetchClientAssignments(tenantId, clientId);
  const activeAssignment = assignments.find(a => a.status === 'ACTIVE');

  if (!activeAssignment) {
    return {
      program: null,
      workouts: [],
      weeklyCompletedCount: 0,
      weeklyScheduledCount: 0
    };
  }

  const { weeks, scheduleItems, workouts } = await fetchProgramWeeksAndSchedule(
    tenantId,
    activeAssignment.programId
  );

  const workoutMap = new Map<string, Workout>();
  workouts.forEach(w => workoutMap.set(w.id, w));

  // Fetch all completed sessions for this assignment/client
  const completedSessions = await fetchCompletedClientSessions(tenantId, clientId);
  const sessionMap = new Map<string, WorkoutSession>();
  completedSessions.forEach(s => {
    // Key by workoutId_scheduledDate
    sessionMap.set(`${s.workoutId}_${s.scheduledDate}`, s);
  });

  const now = new Date();
  const todayYMD = formatDateToYMD(now);
  const startDate = parseDateString(activeAssignment.startDate);
  const totalWeeks = activeAssignment.programDurationWeeks || 1;
  const totalDays = totalWeeks * 7;

  // Calculate current week bounds for weekly progress
  const diffTime = parseDateString(todayYMD).getTime() - startDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const currentWeekNumber = diffDays >= 0 && diffDays < totalDays ? Math.floor(diffDays / 7) + 1 : 1;

  let weeklyCompletedCount = 0;
  let weeklyScheduledCount = 0;

  const result: ClientScheduledWorkoutItem[] = [];

  for (let offset = 0; offset < totalDays; offset++) {
    const dayDate = new Date(startDate);
    dayDate.setDate(dayDate.getDate() + offset);

    const weekNumber = Math.floor(offset / 7) + 1;
    const dayOfWeek = dayDate.toLocaleDateString('en-US', {
      weekday: 'long',
      timeZone: timezone
    });
    const isoDate = formatDateToYMD(dayDate);
    const formattedDate = formatReadableDate(isoDate, timezone);

    const item = scheduleItems.find(
      s => s.weekNumber === weekNumber && s.dayOfWeek === dayOfWeek
    );

    if (item && item.type !== 'REST' && item.workoutId) {
      const wk = workoutMap.get(item.workoutId);
      const isCompleted = sessionMap.has(`${item.workoutId}_${isoDate}`);
      const session = sessionMap.get(`${item.workoutId}_${isoDate}`);

      // Count for weekly progress
      if (weekNumber === currentWeekNumber) {
        weeklyScheduledCount++;
        if (isCompleted) {
          weeklyCompletedCount++;
        }
      }

      let status: 'TODAY' | 'UPCOMING' | 'COMPLETED' | 'MISSED' = 'UPCOMING';
      if (isCompleted) {
        status = 'COMPLETED';
      } else if (isoDate === todayYMD) {
        status = 'TODAY';
      } else if (isoDate < todayYMD) {
        status = 'MISSED';
      } else {
        status = 'UPCOMING';
      }

      const targetMuscles = wk?.exercises
        ? Array.from(new Set(wk.exercises.map(e => (e as any).targetMuscleGroup).filter(Boolean)))
        : [];

      result.push({
        workoutId: item.workoutId,
        workoutName: wk?.name || (item as any).workoutName || 'Scheduled Workout',
        scheduledDate: isoDate,
        formattedDate,
        dayOfWeek,
        weekNumber,
        isOptional: item.isOptional || false,
        exerciseCount: wk?.exerciseCount || wk?.exercises?.length || 0,
        totalSets: wk?.exercises?.reduce((sum, e) => sum + (Number(e.sets) || 3), 0) || 0,
        targetMuscles,
        status,
        sessionId: session?.id
      });
    }
  }

  return {
    program: activeAssignment,
    workouts: result,
    weeklyCompletedCount,
    weeklyScheduledCount
  };
}

/**
 * Loads a single workout with its full exercise prescriptions and exercise metadata
 * for the workout player.
 */
export async function fetchWorkoutForPlayer(
  tenantId: string,
  programId: string,
  workoutId: string
): Promise<{
  workout: Workout;
  prescriptions: Array<
    WorkoutExercisePrescription & {
      exerciseDetails?: Exercise;
    }
  >;
}> {
  const workoutRef = doc(db, 'tenants', tenantId, 'programs', programId, 'workouts', workoutId);
  const workoutSnap = await getDoc(workoutRef);

  if (!workoutSnap.exists()) {
    throw new Error('Workout not found');
  }

  const workout = { id: workoutSnap.id, ...workoutSnap.data() } as Workout;

  // Fetch prescriptions subcollection
  const exRef = collection(
    db,
    'tenants',
    tenantId,
    'programs',
    programId,
    'workouts',
    workoutId,
    'exercises'
  );
  const exSnap = await getDocs(query(exRef, orderBy('order', 'asc')));

  const prescriptions: Array<WorkoutExercisePrescription & { exerciseDetails?: Exercise }> = [];

  for (const docItem of exSnap.docs) {
    const rx = { id: docItem.id, ...docItem.data() } as WorkoutExercisePrescription;
    let exerciseDetails: Exercise | undefined = undefined;

    // Fetch exercise details from systemExercises or custom exercises
    if (rx.exerciseId) {
      try {
        // Check systemExercises first
        const sysRef = doc(db, 'systemExercises', rx.exerciseId);
        const sysSnap = await getDoc(sysRef);
        if (sysSnap.exists()) {
          exerciseDetails = { id: sysSnap.id, ...sysSnap.data() } as Exercise;
        } else {
          // Check tenant custom exercises
          const customRef = doc(db, 'tenants', tenantId, 'exercises', rx.exerciseId);
          const customSnap = await getDoc(customRef);
          if (customSnap.exists()) {
            exerciseDetails = { id: customSnap.id, ...customSnap.data() } as Exercise;
          }
        }
      } catch (err) {
        console.warn(`Could not load exercise details for ${rx.exerciseId}`, err);
      }
    }

    prescriptions.push({
      ...rx,
      exerciseDetails
    });
  }

  return { workout, prescriptions };
}
