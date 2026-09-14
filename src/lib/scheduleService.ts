import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  writeBatch
} from 'firebase/firestore';
import { db } from './firebase';
import {
  ProgramWeek,
  ProgramScheduleItem,
  DayOfWeek,
  ScheduleItemType,
  Workout,
  Program
} from '../types/program';
import { handleFirestoreError, OperationType } from './firestoreError';

// ----------------------------------------------------------------------
// READ: WEEKS & SCHEDULE
// ----------------------------------------------------------------------

export async function fetchProgramWeeksAndSchedule(
  tenantId: string,
  programId: string
): Promise<{
  weeks: ProgramWeek[];
  scheduleItems: ProgramScheduleItem[];
  workouts: Workout[];
}> {
  const basePath = `tenants/${tenantId}/programs/${programId}`;
  try {
    // 1. Fetch Program metadata
    const progDoc = await getDoc(doc(db, 'tenants', tenantId, 'programs', programId));
    const durationWeeks = progDoc.exists() ? (progDoc.data() as Program).durationWeeks || 4 : 4;

    // 2. Fetch Workouts
    const workoutsRef = collection(db, 'tenants', tenantId, 'programs', programId, 'workouts');
    const workoutSnap = await getDocs(query(workoutsRef, orderBy('order', 'asc')));
    const workouts: Workout[] = [];
    const workoutMap: Record<string, Workout> = {};
    workoutSnap.forEach(d => {
      const w = { id: d.id, ...d.data() } as Workout;
      workouts.push(w);
      workoutMap[w.id] = w;
    });

    // 3. Fetch Weeks
    const weeksRef = collection(db, 'tenants', tenantId, 'programs', programId, 'weeks');
    const weekSnap = await getDocs(query(weeksRef, orderBy('order', 'asc')));
    let weeks: ProgramWeek[] = [];

    if (weekSnap.empty) {
      // Auto-bootstrap initial weeks based on program durationWeeks or existing workout weeks
      const initialWeekCount = Math.max(
        durationWeeks,
        ...workouts.map(w => w.weekNumber || 1),
        1
      );

      for (let i = 1; i <= initialWeekCount; i++) {
        const weekId = `week-${i}`;
        const newWeek: ProgramWeek = {
          id: weekId,
          programId,
          tenantId,
          weekNumber: i,
          name: `Week ${i}`,
          order: i,
          focus: i === 1 ? 'Foundational / Adaptation' : undefined,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await setDoc(doc(db, 'tenants', tenantId, 'programs', programId, 'weeks', weekId), newWeek);
        weeks.push(newWeek);
      }
    } else {
      weekSnap.forEach(d => {
        weeks.push({ id: d.id, ...d.data() } as ProgramWeek);
      });
    }

    // 4. Fetch Schedule Items
    const schedRef = collection(db, 'tenants', tenantId, 'programs', programId, 'schedule');
    const schedSnap = await getDocs(query(schedRef, orderBy('order', 'asc')));
    const scheduleItems: ProgramScheduleItem[] = [];

    schedSnap.forEach(d => {
      const item = { id: d.id, ...d.data() } as ProgramScheduleItem;
      if (item.workoutId && workoutMap[item.workoutId]) {
        item.workoutDetails = workoutMap[item.workoutId];
      }
      scheduleItems.push(item);
    });

    return { weeks, scheduleItems, workouts };
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, basePath);
  }
}

// ----------------------------------------------------------------------
// WEEK MANAGEMENT
// ----------------------------------------------------------------------

export async function createProgramWeek(
  tenantId: string,
  programId: string,
  weekNumber: number,
  name?: string,
  focus?: string
): Promise<ProgramWeek> {
  const weekId = `week-${Date.now()}`;
  const now = new Date().toISOString();
  const path = `tenants/${tenantId}/programs/${programId}/weeks/${weekId}`;

  const newWeek: ProgramWeek = {
    id: weekId,
    programId,
    tenantId,
    weekNumber,
    name: name?.trim() || `Week ${weekNumber}`,
    order: weekNumber,
    focus: focus?.trim() || '',
    createdAt: now,
    updatedAt: now
  };

  try {
    await setDoc(doc(db, 'tenants', tenantId, 'programs', programId, 'weeks', weekId), newWeek);

    // Update program durationWeeks if needed
    const progDoc = await getDoc(doc(db, 'tenants', tenantId, 'programs', programId));
    if (progDoc.exists()) {
      const currentWeeks = (progDoc.data() as Program).durationWeeks || 0;
      if (weekNumber > currentWeeks) {
        await setDoc(doc(db, 'tenants', tenantId, 'programs', programId), {
          durationWeeks: weekNumber,
          updatedAt: now
        }, { merge: true });
      }
    }

    return newWeek;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function updateProgramWeek(
  tenantId: string,
  programId: string,
  weekId: string,
  updates: { name?: string; focus?: string }
): Promise<void> {
  const path = `tenants/${tenantId}/programs/${programId}/weeks/${weekId}`;
  try {
    await setDoc(
      doc(db, 'tenants', tenantId, 'programs', programId, 'weeks', weekId),
      {
        ...updates,
        updatedAt: new Date().toISOString()
      },
      { merge: true }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function deleteProgramWeek(
  tenantId: string,
  programId: string,
  weekId: string
): Promise<void> {
  const path = `tenants/${tenantId}/programs/${programId}/weeks/${weekId}`;
  try {
    // Delete associated schedule items
    const schedRef = collection(db, 'tenants', tenantId, 'programs', programId, 'schedule');
    const snap = await getDocs(query(schedRef, where('weekId', '==', weekId)));
    for (const d of snap.docs) {
      await deleteDoc(d.ref);
    }

    // Delete week doc
    await deleteDoc(doc(db, 'tenants', tenantId, 'programs', programId, 'weeks', weekId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function duplicateProgramWeek(
  tenantId: string,
  programId: string,
  sourceWeek: ProgramWeek,
  newWeekNumber: number,
  newWeekName?: string
): Promise<{ newWeek: ProgramWeek; duplicatedScheduleItems: ProgramScheduleItem[] }> {
  const newWeekId = `week-${Date.now()}`;
  const now = new Date().toISOString();
  const path = `tenants/${tenantId}/programs/${programId}/weeks/${newWeekId}`;

  const newWeek: ProgramWeek = {
    id: newWeekId,
    programId,
    tenantId,
    weekNumber: newWeekNumber,
    name: newWeekName || `${sourceWeek.name} (Copy)`,
    order: newWeekNumber,
    focus: sourceWeek.focus || '',
    createdAt: now,
    updatedAt: now
  };

  try {
    await setDoc(doc(db, 'tenants', tenantId, 'programs', programId, 'weeks', newWeekId), newWeek);

    // Fetch and duplicate all schedule items for this source week
    const schedRef = collection(db, 'tenants', tenantId, 'programs', programId, 'schedule');
    const snap = await getDocs(query(schedRef, where('weekId', '==', sourceWeek.id)));

    const duplicatedScheduleItems: ProgramScheduleItem[] = [];
    let orderCounter = 1;

    for (const d of snap.docs) {
      const srcItem = d.data() as ProgramScheduleItem;
      const newSchedId = `sched-${Date.now()}-${orderCounter++}`;
      const clonedItem: ProgramScheduleItem = {
        id: newSchedId,
        programId,
        tenantId,
        weekId: newWeekId,
        weekNumber: newWeekNumber,
        dayOfWeek: srcItem.dayOfWeek,
        type: srcItem.type,
        workoutId: srcItem.workoutId || null,
        isOptional: !!srcItem.isOptional,
        order: srcItem.order || orderCounter,
        notes: srcItem.notes || '',
        createdAt: now,
        updatedAt: now
      };

      await setDoc(
        doc(db, 'tenants', tenantId, 'programs', programId, 'schedule', newSchedId),
        clonedItem
      );
      duplicatedScheduleItems.push(clonedItem);
    }

    // Update durationWeeks if newWeekNumber > current
    const progDoc = await getDoc(doc(db, 'tenants', tenantId, 'programs', programId));
    if (progDoc.exists()) {
      const currentWeeks = (progDoc.data() as Program).durationWeeks || 0;
      if (newWeekNumber > currentWeeks) {
        await setDoc(doc(db, 'tenants', tenantId, 'programs', programId), {
          durationWeeks: newWeekNumber,
          updatedAt: now
        }, { merge: true });
      }
    }

    return { newWeek, duplicatedScheduleItems };
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function reorderProgramWeeks(
  tenantId: string,
  programId: string,
  reorderedWeeks: ProgramWeek[]
): Promise<void> {
  const path = `tenants/${tenantId}/programs/${programId}/weeks`;
  const now = new Date().toISOString();

  try {
    for (let i = 0; i < reorderedWeeks.length; i++) {
      const w = reorderedWeeks[i];
      const newOrder = i + 1;
      const newWeekNumber = i + 1;

      await setDoc(
        doc(db, 'tenants', tenantId, 'programs', programId, 'weeks', w.id!),
        {
          order: newOrder,
          weekNumber: newWeekNumber,
          updatedAt: now
        },
        { merge: true }
      );

      // Also update weekNumber on any schedule items for this week
      const schedRef = collection(db, 'tenants', tenantId, 'programs', programId, 'schedule');
      const snap = await getDocs(query(schedRef, where('weekId', '==', w.id)));
      for (const d of snap.docs) {
        await setDoc(d.ref, { weekNumber: newWeekNumber, updatedAt: now }, { merge: true });
      }
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

// ----------------------------------------------------------------------
// SCHEDULE ITEM OPERATIONS
// ----------------------------------------------------------------------

export async function saveScheduleItem(
  tenantId: string,
  programId: string,
  item: Omit<ProgramScheduleItem, 'createdAt' | 'updatedAt' | 'tenantId' | 'programId'> & { 
    tenantId?: string; 
    programId?: string; 
    createdAt?: string; 
  }
): Promise<ProgramScheduleItem> {
  const itemId = item.id || `sched-${Date.now()}`;
  const now = new Date().toISOString();
  const path = `tenants/${tenantId}/programs/${programId}/schedule/${itemId}`;

  const payload: ProgramScheduleItem = {
    id: itemId,
    programId,
    tenantId,
    weekId: item.weekId,
    weekNumber: item.weekNumber,
    dayOfWeek: item.dayOfWeek,
    type: item.type,
    workoutId: item.type === 'REST' ? null : (item.workoutId || null),
    isOptional: item.type === 'OPTIONAL' || !!item.isOptional,
    order: item.order || 1,
    notes: item.notes?.trim() || '',
    createdAt: item.createdAt || now,
    updatedAt: now
  };

  try {
    await setDoc(doc(db, 'tenants', tenantId, 'programs', programId, 'schedule', itemId), payload);
    return payload;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteScheduleItem(
  tenantId: string,
  programId: string,
  scheduleItemId: string
): Promise<void> {
  const path = `tenants/${tenantId}/programs/${programId}/schedule/${scheduleItemId}`;
  try {
    await deleteDoc(doc(db, 'tenants', tenantId, 'programs', programId, 'schedule', scheduleItemId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function reorderScheduleItems(
  tenantId: string,
  programId: string,
  items: ProgramScheduleItem[]
): Promise<void> {
  const path = `tenants/${tenantId}/programs/${programId}/schedule`;
  const now = new Date().toISOString();
  try {
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      await setDoc(
        doc(db, 'tenants', tenantId, 'programs', programId, 'schedule', it.id),
        {
          order: i + 1,
          updatedAt: now
        },
        { merge: true }
      );
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}
