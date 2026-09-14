import { 
  collection, 
  getDocs, 
  doc, 
  getDoc,
  setDoc, 
  deleteDoc, 
  query, 
  orderBy,
  writeBatch
} from 'firebase/firestore';
import { db } from './firebase';
import { 
  Program, 
  Workout, 
  WorkoutExercisePrescription, 
  ValidationIssue 
} from '../types/program';
import { handleFirestoreError, OperationType } from './firestoreError';

// ----------------------------------------------------------------------
// READ OPERATIONS
// ----------------------------------------------------------------------

export async function fetchPrograms(tenantId: string): Promise<Program[]> {
  const programsPath = `tenants/${tenantId}/programs`;
  try {
    const q = query(collection(db, 'tenants', tenantId, 'programs'), orderBy('updatedAt', 'desc'));
    const snap = await getDocs(q);
    const list: Program[] = [];
    snap.forEach(d => {
      list.push({
        id: d.id,
        ...d.data()
      } as Program);
    });
    return list;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, programsPath);
  }
}

export async function fetchProgramWithWorkouts(
  tenantId: string, 
  programId: string
): Promise<{ program: Program; workouts: Workout[] }> {
  const programPath = `tenants/${tenantId}/programs/${programId}`;
  try {
    const progDoc = await getDoc(doc(db, 'tenants', tenantId, 'programs', programId));
    if (!progDoc.exists()) {
      throw new Error(`Program not found`);
    }

    const program = { id: progDoc.id, ...progDoc.data() } as Program;

    // Fetch workouts subcollection
    const workoutsRef = collection(db, 'tenants', tenantId, 'programs', programId, 'workouts');
    const workoutSnap = await getDocs(query(workoutsRef, orderBy('order', 'asc')));

    const workouts: Workout[] = [];
    for (const wDoc of workoutSnap.docs) {
      const wData = wDoc.data() as Omit<Workout, 'id'>;
      const workoutId = wDoc.id;

      // Fetch exercises for this workout
      const exRef = collection(db, 'tenants', tenantId, 'programs', programId, 'workouts', workoutId, 'exercises');
      const exSnap = await getDocs(query(exRef, orderBy('order', 'asc')));

      const exercises: WorkoutExercisePrescription[] = [];
      exSnap.forEach(eDoc => {
        exercises.push({
          id: eDoc.id,
          ...eDoc.data()
        } as WorkoutExercisePrescription);
      });

      workouts.push({
        id: workoutId,
        ...wData,
        blocks: (wData as any).blocks || [],
        exercises
      });
    }

    return { program, workouts };
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, programPath);
  }
}

// ----------------------------------------------------------------------
// WRITE & MUTATION OPERATIONS
// ----------------------------------------------------------------------

export async function createProgram(
  tenantId: string,
  userId: string,
  data: {
    name: string;
    description?: string;
    durationWeeks: number;
    difficulty: Program['difficulty'];
    goal: Program['goal'];
    customGoal?: string;
  }
): Promise<string> {
  const programId = `prog-${Date.now()}`;
  const now = new Date().toISOString();
  const path = `tenants/${tenantId}/programs/${programId}`;

  const payload: Program = {
    id: programId,
    tenantId,
    name: data.name.trim(),
    description: data.description?.trim() || '',
    durationWeeks: Number(data.durationWeeks) || 4,
    difficulty: data.difficulty,
    goal: data.goal,
    customGoal: data.customGoal?.trim() || '',
    status: 'DRAFT',
    workoutCount: 0,
    assignedClientCount: 0,
    createdBy: userId,
    createdAt: now,
    updatedAt: now,
  };

  try {
    await setDoc(doc(db, 'tenants', tenantId, 'programs', programId), payload);

    // Initial starter workout for convenience
    const firstWorkoutId = `wout-${Date.now()}-1`;
    const firstWorkout: Workout = {
      id: firstWorkoutId,
      programId,
      tenantId,
      name: 'Day 1 — Full Body / Push',
      description: 'Initial training session',
      weekNumber: 1,
      dayOfWeek: 'Monday',
      order: 1,
      exerciseCount: 0,
      createdAt: now,
      updatedAt: now
    };
    await setDoc(doc(db, 'tenants', tenantId, 'programs', programId, 'workouts', firstWorkoutId), firstWorkout);
    
    // Update program workout count to 1
    await setDoc(doc(db, 'tenants', tenantId, 'programs', programId), {
      workoutCount: 1,
      updatedAt: now
    }, { merge: true });

    // Audit Log
    try {
      await setDoc(doc(collection(db, 'tenants', tenantId, 'auditLogs'), `log-${Date.now()}`), {
        action: 'PROGRAM_CREATED',
        performedBy: userId,
        targetId: programId,
        programName: payload.name,
        timestamp: now
      });
    } catch {
      // Non-blocking
    }

    return programId;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function updateProgramMetadata(
  tenantId: string,
  programId: string,
  userId: string,
  updates: Partial<Pick<Program, 'name' | 'description' | 'durationWeeks' | 'difficulty' | 'goal' | 'customGoal'>>
): Promise<void> {
  const path = `tenants/${tenantId}/programs/${programId}`;
  const now = new Date().toISOString();
  try {
    await setDoc(doc(db, 'tenants', tenantId, 'programs', programId), {
      ...updates,
      updatedAt: now
    }, { merge: true });

    // Audit Log
    try {
      await setDoc(doc(collection(db, 'tenants', tenantId, 'auditLogs'), `log-${Date.now()}`), {
        action: 'PROGRAM_METADATA_UPDATED',
        performedBy: userId,
        targetId: programId,
        timestamp: now
      });
    } catch {
      // Non-blocking
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

/**
 * Persists the entire workouts and exercises tree for a program in the builder.
 */
export async function saveProgramWorkoutsHierarchy(
  tenantId: string,
  programId: string,
  userId: string,
  workouts: Workout[]
): Promise<void> {
  const programPath = `tenants/${tenantId}/programs/${programId}`;
  const now = new Date().toISOString();

  try {
    // 1. Fetch current existing workout IDs to detect removed/deleted draft workouts
    const existingWorkoutsSnap = await getDocs(
      collection(db, 'tenants', tenantId, 'programs', programId, 'workouts')
    );
    const incomingWorkoutIds = new Set(workouts.map(w => w.id));

    // Delete workouts no longer present in incoming list
    for (const docSnap of existingWorkoutsSnap.docs) {
      if (!incomingWorkoutIds.has(docSnap.id)) {
        // Delete child exercises first
        const exSnap = await getDocs(
          collection(db, 'tenants', tenantId, 'programs', programId, 'workouts', docSnap.id, 'exercises')
        );
        for (const exDoc of exSnap.docs) {
          await deleteDoc(exDoc.ref);
        }
        await deleteDoc(docSnap.ref);
      }
    }

    // 2. Write/update each workout and its exercises
    let totalExerciseCount = 0;
    for (let wIndex = 0; wIndex < workouts.length; wIndex++) {
      const workout = workouts[wIndex];
      const workoutId = workout.id;
      const workoutRef = doc(db, 'tenants', tenantId, 'programs', programId, 'workouts', workoutId);

      const exercises = workout.exercises || [];
      totalExerciseCount += exercises.length;

      const workoutPayload: Omit<Workout, 'exercises'> = {
        id: workoutId,
        programId,
        tenantId,
        name: workout.name.trim() || `Workout ${wIndex + 1}`,
        description: workout.description?.trim() || '',
        weekNumber: workout.weekNumber || 1,
        dayOfWeek: workout.dayOfWeek || 'Day 1',
        order: wIndex + 1,
        exerciseCount: exercises.length,
        blocks: workout.blocks || [],
        isArchived: workout.isArchived || false,
        createdAt: workout.createdAt || now,
        updatedAt: now
      };

      await setDoc(workoutRef, workoutPayload, { merge: true });

      // Clean up removed exercises inside this workout
      const existingExSnap = await getDocs(
        collection(db, 'tenants', tenantId, 'programs', programId, 'workouts', workoutId, 'exercises')
      );
      const incomingExIds = new Set(exercises.map(e => e.id));
      for (const exDoc of existingExSnap.docs) {
        if (!incomingExIds.has(exDoc.id)) {
          await deleteDoc(exDoc.ref);
        }
      }

      // Write each exercise prescription
      for (let eIndex = 0; eIndex < exercises.length; eIndex++) {
        const ex = exercises[eIndex];
        const exRef = doc(
          db, 
          'tenants', 
          tenantId, 
          'programs', 
          programId, 
          'workouts', 
          workoutId, 
          'exercises', 
          ex.id
        );

        const exPayload: Omit<WorkoutExercisePrescription, 'exerciseDetails'> = {
          id: ex.id,
          workoutId,
          programId,
          tenantId,
          exerciseId: ex.exerciseId,
          order: eIndex + 1,
          setType: ex.setType || 'NORMAL',
          blockId: ex.blockId || '',
          blockType: ex.blockType || 'SINGLE',
          sets: Number(ex.sets) > 0 ? Number(ex.sets) : 3,
          reps: String(ex.reps || '10').trim(),
          weight: ex.weight !== undefined && ex.weight !== null ? Number(ex.weight) : null,
          weightUnit: ex.weightUnit || 'lbs',
          restSeconds: Math.max(0, Number(ex.restSeconds) || 60),
          durationSeconds: ex.durationSeconds ? Number(ex.durationSeconds) : null,
          tempo: ex.tempo?.trim() || '',
          rpe: ex.rpe !== undefined && ex.rpe !== null && ex.rpe !== ('' as any) ? Number(ex.rpe) : null,
          rir: ex.rir !== undefined && ex.rir !== null && ex.rir !== ('' as any) ? Number(ex.rir) : null,
          notes: ex.notes?.trim() || '',
          dropSets: ex.dropSets || [],
          emomMinutes: ex.emomMinutes ? Number(ex.emomMinutes) : null,
          emomRepsPerMinute: ex.emomRepsPerMinute ? Number(ex.emomRepsPerMinute) : null,
          targetDurationSeconds: ex.targetDurationSeconds ? Number(ex.targetDurationSeconds) : null,
        };

        await setDoc(exRef, exPayload, { merge: true });
      }
    }

    // 3. Update program doc workout count & timestamp
    await setDoc(doc(db, 'tenants', tenantId, 'programs', programId), {
      workoutCount: workouts.length,
      updatedAt: now
    }, { merge: true });

  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, programPath);
  }
}

// ----------------------------------------------------------------------
// VALIDATION & PUBLISH
// ----------------------------------------------------------------------

export function validateProgramForPublish(
  program: Program, 
  workouts: Workout[]
): { isValid: boolean; issues: ValidationIssue[] } {
  const issues: ValidationIssue[] = [];

  if (!program.name || !program.name.trim()) {
    issues.push({ field: 'name', message: 'Program must have a name.' });
  }

  if (workouts.length === 0) {
    issues.push({ field: 'workouts', message: 'Program must contain at least one workout.' });
  }

  workouts.forEach((w, wIdx) => {
    const wTitle = w.name?.trim() || `Workout #${wIdx + 1}`;
    if (!w.name || !w.name.trim()) {
      issues.push({ 
        field: `workout-${w.id}-name`, 
        message: `Workout #${wIdx + 1} requires a name.`,
        workoutId: w.id,
        workoutName: wTitle
      });
    }

    const exList = w.exercises || [];
    if (exList.length === 0) {
      issues.push({ 
        field: `workout-${w.id}-exercises`, 
        message: `"${wTitle}" contains no exercises. Add at least one exercise.`,
        workoutId: w.id,
        workoutName: wTitle
      });
    } else {
      exList.forEach((ex, exIdx) => {
        const exOrder = exIdx + 1;
        if (!ex.exerciseId) {
          issues.push({
            field: `workout-${w.id}-ex-${ex.id}-ref`,
            message: `Exercise #${exOrder} in "${wTitle}" has an invalid exercise reference.`,
            workoutId: w.id,
            workoutName: wTitle
          });
        }
        if (!ex.sets || ex.sets < 1) {
          issues.push({
            field: `workout-${w.id}-ex-${ex.id}-sets`,
            message: `Exercise #${exOrder} in "${wTitle}" must have at least 1 set.`,
            workoutId: w.id,
            workoutName: wTitle
          });
        }
        if (ex.restSeconds < 0) {
          issues.push({
            field: `workout-${w.id}-ex-${ex.id}-rest`,
            message: `Exercise #${exOrder} in "${wTitle}" cannot have negative rest time.`,
            workoutId: w.id,
            workoutName: wTitle
          });
        }
      });
    }
  });

  return {
    isValid: issues.length === 0,
    issues
  };
}

export async function publishProgram(
  tenantId: string, 
  programId: string, 
  userId: string,
  workouts: Workout[]
): Promise<void> {
  const progDoc = await getDoc(doc(db, 'tenants', tenantId, 'programs', programId));
  if (!progDoc.exists()) throw new Error('Program not found');
  const program = { id: progDoc.id, ...progDoc.data() } as Program;

  const { isValid, issues } = validateProgramForPublish(program, workouts);
  if (!isValid) {
    const errorMsg = issues.map(i => i.message).join(' | ');
    throw new Error(`Validation failed: ${errorMsg}`);
  }

  // First ensure workouts are saved
  await saveProgramWorkoutsHierarchy(tenantId, programId, userId, workouts);

  const now = new Date().toISOString();
  await setDoc(doc(db, 'tenants', tenantId, 'programs', programId), {
    status: 'ACTIVE',
    updatedAt: now
  }, { merge: true });

  // Audit Log
  try {
    await setDoc(doc(collection(db, 'tenants', tenantId, 'auditLogs'), `log-${Date.now()}`), {
      action: 'PROGRAM_PUBLISHED',
      performedBy: userId,
      targetId: programId,
      programName: program.name,
      timestamp: now
    });
  } catch {
    // Non-blocking
  }
}

// ----------------------------------------------------------------------
// DUPLICATE & ARCHIVE & DELETE
// ----------------------------------------------------------------------

export async function duplicateProgram(
  tenantId: string,
  userId: string,
  sourceProgramId: string
): Promise<string> {
  const { program: source, workouts: sourceWorkouts } = await fetchProgramWithWorkouts(tenantId, sourceProgramId);
  const newProgramId = `prog-${Date.now()}`;
  const now = new Date().toISOString();

  const newProgramPayload: Program = {
    ...source,
    id: newProgramId,
    name: `${source.name} — Copy`,
    status: 'DRAFT',
    assignedClientCount: 0,
    createdBy: userId,
    createdAt: now,
    updatedAt: now,
  };

  const path = `tenants/${tenantId}/programs/${newProgramId}`;

  try {
    await setDoc(doc(db, 'tenants', tenantId, 'programs', newProgramId), newProgramPayload);

    // Clone all workouts and exercises with fresh IDs
    const clonedWorkouts: Workout[] = sourceWorkouts.map((w, wIdx) => {
      const newWorkoutId = `wout-${Date.now()}-${wIdx + 1}`;
      const clonedExercises: WorkoutExercisePrescription[] = (w.exercises || []).map((ex, eIdx) => ({
        ...ex,
        id: `wex-${Date.now()}-${wIdx + 1}-${eIdx + 1}`,
        workoutId: newWorkoutId,
        programId: newProgramId,
        tenantId,
      }));

      return {
        ...w,
        id: newWorkoutId,
        programId: newProgramId,
        tenantId,
        createdAt: now,
        updatedAt: now,
        exercises: clonedExercises
      };
    });

    await saveProgramWorkoutsHierarchy(tenantId, newProgramId, userId, clonedWorkouts);

    // Audit Log
    try {
      await setDoc(doc(collection(db, 'tenants', tenantId, 'auditLogs'), `log-${Date.now()}`), {
        action: 'PROGRAM_DUPLICATED',
        performedBy: userId,
        targetId: newProgramId,
        sourceProgramId,
        programName: newProgramPayload.name,
        timestamp: now
      });
    } catch {
      // Non-blocking
    }

    return newProgramId;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function archiveProgram(
  tenantId: string,
  userId: string,
  programId: string
): Promise<void> {
  const path = `tenants/${tenantId}/programs/${programId}`;
  const now = new Date().toISOString();
  try {
    await setDoc(doc(db, 'tenants', tenantId, 'programs', programId), {
      status: 'ARCHIVED',
      updatedAt: now
    }, { merge: true });

    // Audit Log
    try {
      await setDoc(doc(collection(db, 'tenants', tenantId, 'auditLogs'), `log-${Date.now()}`), {
        action: 'PROGRAM_ARCHIVED',
        performedBy: userId,
        targetId: programId,
        timestamp: now
      });
    } catch {
      // Non-blocking
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function deleteDraftProgram(
  tenantId: string,
  userId: string,
  programId: string,
  programName?: string
): Promise<void> {
  const path = `tenants/${tenantId}/programs/${programId}`;
  try {
    // 1. Check status is DRAFT and not assigned
    const progDoc = await getDoc(doc(db, 'tenants', tenantId, 'programs', programId));
    if (progDoc.exists()) {
      const data = progDoc.data() as Program;
      if (data.status !== 'DRAFT') {
        throw new Error('Only draft programs can be permanently deleted. Active or archived programs must remain archived.');
      }
      if (data.assignedClientCount > 0) {
        throw new Error('Cannot delete a program that has assigned clients.');
      }
    }

    // 2. Delete workouts & exercises
    const workoutsSnap = await getDocs(collection(db, 'tenants', tenantId, 'programs', programId, 'workouts'));
    for (const wDoc of workoutsSnap.docs) {
      const exSnap = await getDocs(
        collection(db, 'tenants', tenantId, 'programs', programId, 'workouts', wDoc.id, 'exercises')
      );
      for (const exDoc of exSnap.docs) {
        await deleteDoc(exDoc.ref);
      }
      await deleteDoc(wDoc.ref);
    }

    // 3. Delete program document
    await deleteDoc(doc(db, 'tenants', tenantId, 'programs', programId));

    // Audit Log
    try {
      await setDoc(doc(collection(db, 'tenants', tenantId, 'auditLogs'), `log-${Date.now()}`), {
        action: 'DRAFT_PROGRAM_DELETED',
        performedBy: userId,
        targetId: programId,
        programName: programName || '',
        timestamp: new Date().toISOString()
      });
    } catch {
      // Non-blocking
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

/**
 * Duplicates a single workout within a program.
 * Preserves exercise references, exercise order, sets, reps, rest, notes.
 * Does NOT copy future workout logs, completion data, or client progress.
 */
export async function duplicateWorkoutInProgram(
  tenantId: string,
  programId: string,
  sourceWorkoutId: string,
  customName?: string
): Promise<Workout> {
  const path = `tenants/${tenantId}/programs/${programId}/workouts/${sourceWorkoutId}`;
  const now = new Date().toISOString();

  try {
    const srcDoc = await getDoc(doc(db, 'tenants', tenantId, 'programs', programId, 'workouts', sourceWorkoutId));
    if (!srcDoc.exists()) {
      throw new Error('Source workout not found');
    }
    const srcData = srcDoc.data() as Workout;

    // Fetch child exercises
    const exRef = collection(db, 'tenants', tenantId, 'programs', programId, 'workouts', sourceWorkoutId, 'exercises');
    const exSnap = await getDocs(query(exRef, orderBy('order', 'asc')));

    const newWorkoutId = `wout-${Date.now()}`;
    const newWorkoutName = customName || `${srcData.name} (Copy)`;

    const newWorkout: Workout = {
      ...srcData,
      id: newWorkoutId,
      name: newWorkoutName,
      createdAt: now,
      updatedAt: now
    };

    // Save cloned workout document
    await setDoc(doc(db, 'tenants', tenantId, 'programs', programId, 'workouts', newWorkoutId), newWorkout);

    // Save cloned exercises with new stable IDs
    const clonedExercises: WorkoutExercisePrescription[] = [];
    for (let i = 0; i < exSnap.docs.length; i++) {
      const eDoc = exSnap.docs[i];
      const eData = eDoc.data() as WorkoutExercisePrescription;
      const newExId = `wex-${Date.now()}-${i + 1}`;
      const clonedEx: WorkoutExercisePrescription = {
        id: newExId,
        workoutId: newWorkoutId,
        programId,
        tenantId,
        exerciseId: eData.exerciseId,
        order: eData.order || i + 1,
        setType: eData.setType || 'NORMAL',
        sets: eData.sets || 3,
        reps: eData.reps || '10',
        weight: eData.weight ?? null,
        weightUnit: eData.weightUnit || 'lbs',
        restSeconds: eData.restSeconds ?? 60,
        durationSeconds: eData.durationSeconds ?? null,
        tempo: eData.tempo || '',
        rpe: eData.rpe ?? null,
        rir: eData.rir ?? null,
        notes: eData.notes || '',
      };

      await setDoc(
        doc(db, 'tenants', tenantId, 'programs', programId, 'workouts', newWorkoutId, 'exercises', newExId),
        clonedEx
      );
      clonedExercises.push(clonedEx);
    }

    // Increment program workoutCount
    const progDoc = await getDoc(doc(db, 'tenants', tenantId, 'programs', programId));
    if (progDoc.exists()) {
      const currentCount = (progDoc.data() as Program).workoutCount || 0;
      await setDoc(doc(db, 'tenants', tenantId, 'programs', programId), {
        workoutCount: currentCount + 1,
        updatedAt: now
      }, { merge: true });
    }

    return {
      ...newWorkout,
      exercises: clonedExercises
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

/**
 * Fetches a single workout with its exercises
 */
export async function fetchSingleWorkout(
  tenantId: string,
  programId: string,
  workoutId: string
): Promise<Workout> {
  const path = `tenants/${tenantId}/programs/${programId}/workouts/${workoutId}`;
  try {
    const wDoc = await getDoc(doc(db, 'tenants', tenantId, 'programs', programId, 'workouts', workoutId));
    if (!wDoc.exists()) throw new Error('Workout not found');
    const workout = { id: wDoc.id, ...wDoc.data() } as Workout;

    const exRef = collection(db, 'tenants', tenantId, 'programs', programId, 'workouts', workoutId, 'exercises');
    const exSnap = await getDocs(query(exRef, orderBy('order', 'asc')));

    const exercises: WorkoutExercisePrescription[] = [];
    exSnap.forEach(eDoc => {
      exercises.push({ id: eDoc.id, ...eDoc.data() } as WorkoutExercisePrescription);
    });

    return {
      ...workout,
      exercises
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }
}

