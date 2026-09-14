import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  deleteDoc, 
  query
} from 'firebase/firestore';
import { db } from './firebase';
import { Exercise } from '../types/exercise';
import { CURATED_SYSTEM_EXERCISES } from '../data/curatedExercises';
import { handleFirestoreError, OperationType } from './firestoreError';

export async function fetchAllExercises(tenantId: string | null): Promise<Exercise[]> {
  const exercisesMap = new Map<string, Exercise>();

  // 1. Load curated system exercises as baseline
  for (const ex of CURATED_SYSTEM_EXERCISES) {
    exercisesMap.set(ex.id, ex);
  }

  // 2. Fetch custom Firestore system exercises if any
  try {
    const sysPath = 'systemExercises';
    const sysSnap = await getDocs(collection(db, sysPath));
    sysSnap.forEach(d => {
      const data = d.data() as Omit<Exercise, 'id'>;
      exercisesMap.set(d.id, {
        id: d.id,
        ...data,
        isCustom: false
      });
    });
  } catch (err) {
    // If not accessible or offline, gracefully continue with curated baseline
    console.warn('Could not fetch system exercises from Firestore, using curated library:', err);
  }

  // 3. Fetch tenant custom exercises if tenantId is available
  if (tenantId) {
    const tenantExPath = `tenants/${tenantId}/exercises`;
    try {
      const customSnap = await getDocs(collection(db, 'tenants', tenantId, 'exercises'));
      customSnap.forEach(d => {
        const data = d.data() as Omit<Exercise, 'id'>;
        exercisesMap.set(d.id, {
          id: d.id,
          ...data,
          isCustom: true,
          tenantId
        });
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, tenantExPath);
    }
  }

  return Array.from(exercisesMap.values());
}

export async function saveCustomExercise(
  tenantId: string,
  userId: string,
  exerciseData: Omit<Exercise, 'id' | 'isCustom' | 'tenantId' | 'createdAt' | 'updatedAt' | 'createdBy'>,
  existingId?: string
): Promise<string> {
  const id = existingId || `custom-${Date.now()}`;
  const now = new Date().toISOString();
  const path = `tenants/${tenantId}/exercises/${id}`;

  const payload: Exercise = {
    ...exerciseData,
    id,
    isCustom: true,
    tenantId,
    createdBy: userId,
    createdAt: now,
    updatedAt: now,
  };

  try {
    await setDoc(doc(db, 'tenants', tenantId, 'exercises', id), payload, { merge: true });

    // Audit Log
    try {
      await setDoc(doc(collection(db, 'tenants', tenantId, 'auditLogs'), `log-${Date.now()}`), {
        action: existingId ? 'EXERCISE_UPDATED' : 'EXERCISE_CREATED',
        performedBy: userId,
        targetId: id,
        exerciseName: exerciseData.name,
        timestamp: now
      });
    } catch {
      // Non-blocking for audit logs
    }

    return id;
  } catch (err) {
    handleFirestoreError(err, existingId ? OperationType.UPDATE : OperationType.CREATE, path);
  }
}

export async function deleteCustomExercise(
  tenantId: string,
  userId: string,
  exerciseId: string,
  exerciseName?: string
): Promise<void> {
  const path = `tenants/${tenantId}/exercises/${exerciseId}`;
  try {
    await deleteDoc(doc(db, 'tenants', tenantId, 'exercises', exerciseId));

    // Audit Log
    try {
      await setDoc(doc(collection(db, 'tenants', tenantId, 'auditLogs'), `log-${Date.now()}`), {
        action: 'EXERCISE_DELETED',
        performedBy: userId,
        targetId: exerciseId,
        exerciseName: exerciseName || '',
        timestamp: new Date().toISOString()
      });
    } catch {
      // Non-blocking
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}
