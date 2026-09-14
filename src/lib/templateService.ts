import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  query,
  orderBy
} from 'firebase/firestore';
import { db } from './firebase';
import {
  WorkoutTemplate,
  Workout,
  WorkoutExercisePrescription,
  Program
} from '../types/program';
import { handleFirestoreError, OperationType } from './firestoreError';
import { CURATED_SYSTEM_EXERCISES } from '../data/curatedExercises';

// ----------------------------------------------------------------------
// TEMPLATE SEEDING (DEFAULT GYM TEMPLATES)
// ----------------------------------------------------------------------
const DEFAULT_SEED_TEMPLATES = [
  {
    name: 'Upper Body Hypertrophy (Push Focus)',
    description: 'Foundational chest, shoulders, and triceps hypertrophy builder with progressive overload structure.',
    category: 'Hypertrophy',
    exercises: [
      { exerciseName: 'Barbell Bench Press', sets: 4, reps: '8-10', restSeconds: 90, rpe: 8, notes: 'Focus on controlled eccentric phase' },
      { exerciseName: 'Incline Dumbbell Press', sets: 3, reps: '10-12', restSeconds: 75, rpe: 8, notes: 'Full clavicular stretch at bottom' },
      { exerciseName: 'Dumbbell Lateral Raise', sets: 4, reps: '12-15', restSeconds: 60, rpe: 9, notes: 'Slight forward lean, lead with elbows' },
      { exerciseName: 'Overhead Triceps Extension', sets: 3, reps: '10-12', restSeconds: 60, rpe: 8, notes: 'Keep elbows tucked' }
    ]
  },
  {
    name: 'Posterior Chain & Pull Foundations',
    description: 'Upper and lower posterior chain development targeting lats, rhomboids, glutes, and hamstrings.',
    category: 'Strength',
    exercises: [
      { exerciseName: 'Romanian Deadlift (RDL)', sets: 4, reps: '6-8', restSeconds: 120, rpe: 8, notes: 'Hip hinge emphasis, soft knees' },
      { exerciseName: 'Bent-Over Barbell Row', sets: 4, reps: '8-10', restSeconds: 90, rpe: 8, notes: 'Pull toward lower ribcage' },
      { exerciseName: 'Lat Pulldown', sets: 3, reps: '10-12', restSeconds: 75, rpe: 8, notes: 'Drive elbows down to hips' },
      { exerciseName: 'Incline Dumbbell Curl', sets: 3, reps: '10-12', restSeconds: 60, rpe: 8, notes: 'Supinate at top of movement' }
    ]
  },
  {
    name: 'Lower Body Strength (Quad & Glute Focus)',
    description: 'Compound leg strength session featuring unilateral knee stability and deep squats.',
    category: 'Strength',
    exercises: [
      { exerciseName: 'Barbell Back Squat', sets: 4, reps: '5-6', restSeconds: 150, rpe: 8, notes: 'Hit parallel with neutral spine' },
      { exerciseName: 'Bulgarian Split Squat', sets: 3, reps: '8-10', restSeconds: 90, rpe: 8, notes: 'Elevate rear foot, descend with control' },
      { exerciseName: 'Leg Press', sets: 3, reps: '10-12', restSeconds: 75, rpe: 8, notes: 'Maintain lower back contact with pad' },
      { exerciseName: 'Standing Calf Raise', sets: 4, reps: '12-15', restSeconds: 45, rpe: 9, notes: '2-second pause at full stretch' }
    ]
  }
];

// ----------------------------------------------------------------------
// READ OPERATIONS
// ----------------------------------------------------------------------

export async function fetchWorkoutTemplates(tenantId: string): Promise<WorkoutTemplate[]> {
  const path = `tenants/${tenantId}/workoutTemplates`;
  try {
    const tRef = collection(db, 'tenants', tenantId, 'workoutTemplates');
    const snap = await getDocs(query(tRef, orderBy('createdAt', 'desc')));

    if (snap.empty) {
      // Seed default curated gym templates for this tenant
      const seededTemplates: WorkoutTemplate[] = [];
      const now = new Date().toISOString();

      for (let i = 0; i < DEFAULT_SEED_TEMPLATES.length; i++) {
        const item = DEFAULT_SEED_TEMPLATES[i];
        const templateId = `wtpl-seed-${i + 1}`;
        const templateDocRef = doc(db, 'tenants', tenantId, 'workoutTemplates', templateId);

        const templatePayload: Omit<WorkoutTemplate, 'exercises'> = {
          id: templateId,
          tenantId,
          name: item.name,
          description: item.description,
          category: item.category,
          exerciseCount: item.exercises.length,
          createdBy: 'System Curated',
          createdAt: now,
          updatedAt: now
        };

        await setDoc(templateDocRef, templatePayload);

        // Map exercise items
        const exercisesList: WorkoutExercisePrescription[] = [];
        for (let j = 0; j < item.exercises.length; j++) {
          const exPreset = item.exercises[j];
          const matchedCurated = CURATED_SYSTEM_EXERCISES.find(c => 
            c.name.toLowerCase().includes(exPreset.exerciseName.toLowerCase())
          ) || CURATED_SYSTEM_EXERCISES[j % CURATED_SYSTEM_EXERCISES.length];

          const exId = `wte-${i + 1}-${j + 1}`;
          const exPayload: WorkoutExercisePrescription = {
            id: exId,
            workoutId: templateId,
            programId: 'template',
            tenantId,
            exerciseId: matchedCurated.id,
            order: j + 1,
            setType: 'NORMAL',
            sets: exPreset.sets,
            reps: exPreset.reps,
            weight: null,
            weightUnit: 'lbs',
            restSeconds: exPreset.restSeconds,
            durationSeconds: null,
            tempo: '',
            rpe: exPreset.rpe,
            rir: null,
            notes: exPreset.notes
          };

          await setDoc(
            doc(db, 'tenants', tenantId, 'workoutTemplates', templateId, 'exercises', exId),
            exPayload
          );
          exercisesList.push(exPayload);
        }

        seededTemplates.push({
          ...templatePayload,
          exercises: exercisesList
        });
      }

      return seededTemplates;
    }

    const templates: WorkoutTemplate[] = [];
    for (const d of snap.docs) {
      const tData = d.data() as WorkoutTemplate;
      const tId = d.id;

      // Fetch exercises for this template
      const exRef = collection(db, 'tenants', tenantId, 'workoutTemplates', tId, 'exercises');
      const exSnap = await getDocs(query(exRef, orderBy('order', 'asc')));
      const exercises: WorkoutExercisePrescription[] = [];
      exSnap.forEach(ed => {
        exercises.push({ id: ed.id, ...ed.data() } as WorkoutExercisePrescription);
      });

      templates.push({
        ...tData,
        id: tId,
        exercises
      });
    }

    return templates;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

// ----------------------------------------------------------------------
// WRITE OPERATIONS
// ----------------------------------------------------------------------

export async function saveWorkoutAsTemplate(
  tenantId: string,
  userId: string,
  workout: Workout,
  templateName?: string,
  description?: string,
  category?: string
): Promise<WorkoutTemplate> {
  const templateId = `wtpl-${Date.now()}`;
  const now = new Date().toISOString();
  const path = `tenants/${tenantId}/workoutTemplates/${templateId}`;

  const finalName = templateName?.trim() || `${workout.name} (Template)`;
  const finalDesc = description?.trim() || workout.description || 'Custom template saved from workout builder.';
  const exercises = workout.exercises || [];

  const templatePayload: WorkoutTemplate = {
    id: templateId,
    tenantId,
    name: finalName,
    description: finalDesc,
    category: category || 'General',
    exerciseCount: exercises.length,
    createdBy: userId,
    createdAt: now,
    updatedAt: now
  };

  try {
    await setDoc(doc(db, 'tenants', tenantId, 'workoutTemplates', templateId), templatePayload);

    // Save stripped exercise prescriptions
    const savedExercises: WorkoutExercisePrescription[] = [];
    for (let i = 0; i < exercises.length; i++) {
      const ex = exercises[i];
      const exId = `wte-${Date.now()}-${i + 1}`;
      const exPayload: WorkoutExercisePrescription = {
        id: exId,
        workoutId: templateId,
        programId: 'template',
        tenantId,
        exerciseId: ex.exerciseId,
        order: i + 1,
        setType: ex.setType || 'NORMAL',
        sets: Number(ex.sets) || 3,
        reps: String(ex.reps || '10').trim(),
        weight: ex.weight !== undefined && ex.weight !== null ? Number(ex.weight) : null,
        weightUnit: ex.weightUnit || 'lbs',
        restSeconds: Number(ex.restSeconds) || 60,
        durationSeconds: ex.durationSeconds ? Number(ex.durationSeconds) : null,
        tempo: ex.tempo?.trim() || '',
        rpe: ex.rpe !== undefined && ex.rpe !== null ? Number(ex.rpe) : null,
        rir: ex.rir !== undefined && ex.rir !== null ? Number(ex.rir) : null,
        notes: ex.notes?.trim() || ''
      };

      await setDoc(
        doc(db, 'tenants', tenantId, 'workoutTemplates', templateId, 'exercises', exId),
        exPayload
      );
      savedExercises.push(exPayload);
    }

    return {
      ...templatePayload,
      exercises: savedExercises
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function createWorkoutFromTemplate(
  tenantId: string,
  programId: string,
  template: WorkoutTemplate,
  targetWeekNumber: number = 1,
  targetDayOfWeek: string = 'Monday',
  customWorkoutName?: string
): Promise<Workout> {
  const workoutId = `wout-${Date.now()}`;
  const now = new Date().toISOString();
  const path = `tenants/${tenantId}/programs/${programId}/workouts/${workoutId}`;

  const workoutPayload: Workout = {
    id: workoutId,
    programId,
    tenantId,
    name: customWorkoutName?.trim() || template.name,
    description: template.description || '',
    weekNumber: targetWeekNumber,
    dayOfWeek: targetDayOfWeek,
    order: 99,
    exerciseCount: template.exercises?.length || 0,
    isArchived: false,
    createdAt: now,
    updatedAt: now
  };

  try {
    await setDoc(doc(db, 'tenants', tenantId, 'programs', programId, 'workouts', workoutId), workoutPayload);

    // Save cloned exercises referencing stable exerciseId
    const clonedExercises: WorkoutExercisePrescription[] = [];
    const templateExercises = template.exercises || [];

    for (let i = 0; i < templateExercises.length; i++) {
      const ex = templateExercises[i];
      const newExId = `wex-${Date.now()}-${i + 1}`;
      const clonedEx: WorkoutExercisePrescription = {
        id: newExId,
        workoutId,
        programId,
        tenantId,
        exerciseId: ex.exerciseId,
        order: i + 1,
        setType: ex.setType || 'NORMAL',
        sets: ex.sets || 3,
        reps: ex.reps || '10',
        weight: ex.weight ?? null,
        weightUnit: ex.weightUnit || 'lbs',
        restSeconds: ex.restSeconds ?? 60,
        durationSeconds: ex.durationSeconds ?? null,
        tempo: ex.tempo || '',
        rpe: ex.rpe ?? null,
        rir: ex.rir ?? null,
        notes: ex.notes || ''
      };

      await setDoc(
        doc(db, 'tenants', tenantId, 'programs', programId, 'workouts', workoutId, 'exercises', newExId),
        clonedEx
      );
      clonedExercises.push(clonedEx);
    }

    // Update program workoutCount
    const progDoc = await getDoc(doc(db, 'tenants', tenantId, 'programs', programId));
    if (progDoc.exists()) {
      const currentCount = (progDoc.data() as Program).workoutCount || 0;
      await setDoc(doc(db, 'tenants', tenantId, 'programs', programId), {
        workoutCount: currentCount + 1,
        updatedAt: now
      }, { merge: true });
    }

    return {
      ...workoutPayload,
      exercises: clonedExercises
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function deleteWorkoutTemplate(
  tenantId: string,
  templateId: string
): Promise<void> {
  const path = `tenants/${tenantId}/workoutTemplates/${templateId}`;
  try {
    const exRef = collection(db, 'tenants', tenantId, 'workoutTemplates', templateId, 'exercises');
    const snap = await getDocs(exRef);
    for (const d of snap.docs) {
      await deleteDoc(d.ref);
    }
    await deleteDoc(doc(db, 'tenants', tenantId, 'workoutTemplates', templateId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}
