/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from './firebase';
import { handleFirestoreError, OperationType } from './firestoreError';
import {
  CheckInTemplate,
  CheckInAssignment,
  CheckInRecord,
  CheckInQuestion,
  CheckInAnswer,
  CheckInStatus,
  CheckInAdherenceSnapshot,
  Habit,
  HabitLog,
  HabitStats,
  ClientHabitsOverview,
  MeasurementTarget
} from '../types/accountability';
import { addClientWeightLog, addClientMeasurement, fetchClientWeightLogs } from './progressService';
import { fetchCompletedClientSessions, fetchClientAllScheduledWorkouts } from './workoutSessionService';
import { fetchClientFoodLogsRange } from './nutritionService';
import { formatDateToYMD, parseDateString } from './assignmentService';

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

// -------------------------------------------------------------
// 1. CHECK-IN TEMPLATES
// -------------------------------------------------------------

export async function fetchCheckInTemplates(tenantId: string): Promise<CheckInTemplate[]> {
  const path = `tenants/${tenantId}/checkInTemplates`;
  try {
    const colRef = collection(db, 'tenants', tenantId, 'checkInTemplates');
    const snap = await getDocs(colRef);
    const templates = snap.docs.map(d => ({ id: d.id, ...d.data() } as CheckInTemplate));
    // Sort active first, then by createdAt desc
    return templates.sort((a, b) => {
      if (a.status === 'ACTIVE' && b.status !== 'ACTIVE') return -1;
      if (a.status !== 'ACTIVE' && b.status === 'ACTIVE') return 1;
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function createCheckInTemplate(
  tenantId: string,
  templateData: Omit<CheckInTemplate, 'id' | 'tenantId' | 'createdAt' | 'updatedAt' | 'version' | 'createdBy'>,
  createdBy: string,
  createdByName?: string
): Promise<CheckInTemplate> {
  const id = generateId('tmpl');
  const path = `tenants/${tenantId}/checkInTemplates/${id}`;
  try {
    const docRef = doc(db, 'tenants', tenantId, 'checkInTemplates', id);
    const now = new Date().toISOString();
    const newTemplate: CheckInTemplate = {
      ...templateData,
      id,
      tenantId,
      version: 1,
      createdBy,
      createdByName,
      createdAt: now,
      updatedAt: now
    };
    await setDoc(docRef, newTemplate);
    return newTemplate;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateCheckInTemplate(
  tenantId: string,
  templateId: string,
  updates: Partial<CheckInTemplate>
): Promise<void> {
  const path = `tenants/${tenantId}/checkInTemplates/${templateId}`;
  try {
    const docRef = doc(db, 'tenants', tenantId, 'checkInTemplates', templateId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function duplicateCheckInTemplate(
  tenantId: string,
  templateId: string,
  createdBy: string,
  createdByName?: string
): Promise<CheckInTemplate> {
  const path = `tenants/${tenantId}/checkInTemplates/${templateId}`;
  try {
    const docRef = doc(db, 'tenants', tenantId, 'checkInTemplates', templateId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error('Template not found');
    const original = snap.data() as CheckInTemplate;

    return await createCheckInTemplate(
      tenantId,
      {
        name: `${original.name} (Copy)`,
        description: original.description || '',
        frequency: original.frequency,
        customDaysInterval: original.customDaysInterval,
        questions: original.questions.map(q => ({ ...q, id: generateId('q') })),
        status: 'DRAFT',
        assignedClientCount: 0
      },
      createdBy,
      createdByName
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

// -------------------------------------------------------------
// 2. CHECK-IN ASSIGNMENTS & SCHEDULING
// -------------------------------------------------------------

export async function fetchCheckInAssignments(
  tenantId: string,
  clientId?: string
): Promise<CheckInAssignment[]> {
  const path = `tenants/${tenantId}/checkInAssignments`;
  try {
    const colRef = collection(db, 'tenants', tenantId, 'checkInAssignments');
    let q = query(colRef);
    if (clientId) {
      q = query(colRef, where('clientId', '==', clientId));
    }
    const snap = await getDocs(q);
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as CheckInAssignment));
    return list.sort((a, b) => (b.assignedAt || '').localeCompare(a.assignedAt || ''));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function assignCheckInTemplate(
  tenantId: string,
  assignmentData: {
    templateId: string;
    templateName: string;
    templateVersion: number;
    clientId: string;
    clientName: string;
    clientEmail?: string;
    trainerId?: string;
    frequency: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'CUSTOM';
    customDaysInterval?: number;
    startDate: string; // YYYY-MM-DD
    endDate?: string;
    dayOfWeek?: string;
    questionsSnapshot: CheckInQuestion[];
  },
  assignedBy: string,
  assignedByName?: string
): Promise<{ assignment: CheckInAssignment; initialCheckIn: CheckInRecord }> {
  const assignmentId = generateId('cia');
  const path = `tenants/${tenantId}/checkInAssignments/${assignmentId}`;
  try {
    const now = new Date().toISOString();
    const assignmentDocRef = doc(db, 'tenants', tenantId, 'checkInAssignments', assignmentId);
    
    const newAssignment: CheckInAssignment = {
      id: assignmentId,
      tenantId,
      templateId: assignmentData.templateId,
      templateName: assignmentData.templateName,
      templateVersion: assignmentData.templateVersion || 1,
      clientId: assignmentData.clientId,
      clientName: assignmentData.clientName,
      clientEmail: assignmentData.clientEmail,
      trainerId: assignmentData.trainerId,
      frequency: assignmentData.frequency,
      customDaysInterval: assignmentData.customDaysInterval,
      startDate: assignmentData.startDate,
      endDate: assignmentData.endDate,
      dayOfWeek: assignmentData.dayOfWeek || 'Sunday',
      status: 'ACTIVE',
      assignedBy,
      assignedByName,
      assignedAt: now,
      updatedAt: now
    };

    await setDoc(assignmentDocRef, newAssignment);

    // Increment template assignedClientCount
    try {
      const tmplRef = doc(db, 'tenants', tenantId, 'checkInTemplates', assignmentData.templateId);
      const tmplSnap = await getDoc(tmplRef);
      if (tmplSnap.exists()) {
        const count = (tmplSnap.data().assignedClientCount || 0) + 1;
        await updateDoc(tmplRef, { assignedClientCount: count });
      }
    } catch (e) {
      console.warn('Could not update template assignedClientCount', e);
    }

    // Generate First Check-in Record
    const checkInId = generateId('chk');
    const checkInDocRef = doc(db, 'tenants', tenantId, 'checkIns', checkInId);

    // Determine initial due date
    let dueDate = assignmentData.startDate;
    const startD = parseDateString(assignmentData.startDate);
    const today = parseDateString(formatDateToYMD(new Date()));
    
    // If startDate is in the past, or if we need weekly schedule, align to first check-in window
    if (startD.getTime() <= today.getTime()) {
      dueDate = formatDateToYMD(today);
    }

    const initialCheckIn: CheckInRecord = {
      id: checkInId,
      tenantId,
      assignmentId,
      templateId: assignmentData.templateId,
      templateName: assignmentData.templateName,
      templateVersion: assignmentData.templateVersion || 1,
      clientId: assignmentData.clientId,
      clientName: assignmentData.clientName,
      clientEmail: assignmentData.clientEmail,
      trainerId: assignmentData.trainerId,
      dueDate,
      scheduledDate: dueDate,
      status: 'DUE',
      questionsSnapshot: assignmentData.questionsSnapshot,
      answers: [],
      createdAt: now,
      updatedAt: now
    };

    await setDoc(checkInDocRef, initialCheckIn);

    return { assignment: newAssignment, initialCheckIn };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateCheckInAssignmentStatus(
  tenantId: string,
  assignmentId: string,
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED'
): Promise<void> {
  const path = `tenants/${tenantId}/checkInAssignments/${assignmentId}`;
  try {
    const docRef = doc(db, 'tenants', tenantId, 'checkInAssignments', assignmentId);
    await updateDoc(docRef, {
      status,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// -------------------------------------------------------------
// 3. CHECK-IN RECORDS, SUBMISSIONS & REVIEW
// -------------------------------------------------------------

export async function fetchClientCheckIns(
  tenantId: string,
  clientId: string
): Promise<CheckInRecord[]> {
  const path = `tenants/${tenantId}/checkIns`;
  try {
    const colRef = collection(db, 'tenants', tenantId, 'checkIns');
    const q = query(colRef, where('clientId', '==', clientId));
    const snap = await getDocs(q);
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as CheckInRecord));
    
    // Update overdue status dynamically if due in the past and still DUE/DRAFT
    const todayYMD = formatDateToYMD(new Date());
    list.forEach(item => {
      if ((item.status === 'DUE' || item.status === 'DRAFT') && item.dueDate < todayYMD) {
        item.status = 'OVERDUE';
      }
    });

    return list.sort((a, b) => (b.dueDate || '').localeCompare(a.dueDate || ''));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function fetchCoachCheckInInbox(
  tenantId: string,
  filters?: {
    trainerId?: string;
    clientId?: string;
    status?: CheckInStatus | 'ALL';
  }
): Promise<CheckInRecord[]> {
  const path = `tenants/${tenantId}/checkIns`;
  try {
    const colRef = collection(db, 'tenants', tenantId, 'checkIns');
    const snap = await getDocs(colRef);
    let list = snap.docs.map(d => ({ id: d.id, ...d.data() } as CheckInRecord));

    const todayYMD = formatDateToYMD(new Date());

    list = list.map(item => {
      if ((item.status === 'DUE' || item.status === 'DRAFT') && item.dueDate < todayYMD) {
        return { ...item, status: 'OVERDUE' };
      }
      return item;
    });

    if (filters?.clientId) {
      list = list.filter(c => c.clientId === filters.clientId);
    }
    if (filters?.trainerId) {
      list = list.filter(c => c.trainerId === filters.trainerId);
    }
    if (filters?.status && filters.status !== 'ALL') {
      list = list.filter(c => c.status === filters.status);
    }

    // Sort: SUBMITTED first (needs review), then OVERDUE, then DUE, then REVIEWED, then by dueDate desc
    const priorityWeight = (s: CheckInStatus) => {
      switch (s) {
        case 'SUBMITTED': return 1;
        case 'OVERDUE': return 2;
        case 'DUE': return 3;
        case 'DRAFT': return 4;
        case 'REVIEWED': return 5;
        default: return 6;
      }
    };

    return list.sort((a, b) => {
      const pA = priorityWeight(a.status);
      const pB = priorityWeight(b.status);
      if (pA !== pB) return pA - pB;
      return (b.submittedAt || b.dueDate || '').localeCompare(a.submittedAt || a.dueDate || '');
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function getCheckInRecord(
  tenantId: string,
  checkInId: string
): Promise<CheckInRecord | null> {
  const path = `tenants/${tenantId}/checkIns/${checkInId}`;
  try {
    const docRef = doc(db, 'tenants', tenantId, 'checkIns', checkInId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    const data = { id: snap.id, ...snap.data() } as CheckInRecord;
    const todayYMD = formatDateToYMD(new Date());
    if ((data.status === 'DUE' || data.status === 'DRAFT') && data.dueDate < todayYMD) {
      data.status = 'OVERDUE';
    }
    return data;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function saveCheckInDraft(
  tenantId: string,
  checkInId: string,
  answers: CheckInAnswer[]
): Promise<void> {
  const path = `tenants/${tenantId}/checkIns/${checkInId}`;
  try {
    const docRef = doc(db, 'tenants', tenantId, 'checkIns', checkInId);
    await updateDoc(docRef, {
      answers,
      status: 'DRAFT',
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function submitCheckIn(
  tenantId: string,
  checkInId: string,
  answers: CheckInAnswer[],
  submittedBy: string
): Promise<CheckInRecord> {
  const path = `tenants/${tenantId}/checkIns/${checkInId}`;
  try {
    const docRef = doc(db, 'tenants', tenantId, 'checkIns', checkInId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error('Check-in record not found');
    const existing = snap.data() as CheckInRecord;

    const now = new Date().toISOString();
    const todayYMD = formatDateToYMD(new Date());

    // 1. Calculate Adherence Snapshot
    const adherenceSnapshot: CheckInAdherenceSnapshot = {
      workoutAdherencePercent: null,
      workoutsCompleted: 0,
      workoutsScheduled: 0,
      nutritionAdherencePercent: null,
      nutritionDaysLogged: 0,
      habitAdherencePercent: null,
      habitsCompletedDays: 0,
      habitsExpectedDays: 0
    };

    try {
      // Workout adherence over last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const sevenDaysAgoYMD = formatDateToYMD(sevenDaysAgo);

      const [completedSessions, scheduledData, weightLogs] = await Promise.all([
        fetchCompletedClientSessions(tenantId, existing.clientId),
        fetchClientAllScheduledWorkouts(tenantId, existing.clientId).catch(() => ({ workouts: [] })),
        fetchClientWeightLogs(tenantId, existing.clientId)
      ]);

      const workoutsCompleted7D = completedSessions.filter(s => {
        const d = s.scheduledDate || (s.completedAt ? formatDateToYMD(new Date(s.completedAt)) : '');
        return d >= sevenDaysAgoYMD && d <= todayYMD;
      }).length;

      const workoutsScheduled7D = (scheduledData.workouts || []).filter(w => {
        return w.scheduledDate >= sevenDaysAgoYMD && w.scheduledDate <= todayYMD;
      }).length;

      adherenceSnapshot.workoutsCompleted = workoutsCompleted7D;
      adherenceSnapshot.workoutsScheduled = workoutsScheduled7D;
      if (workoutsScheduled7D > 0) {
        adherenceSnapshot.workoutAdherencePercent = Math.min(
          100,
          Math.round((workoutsCompleted7D / workoutsScheduled7D) * 100)
        );
      }

      // Check for weight answers
      const weightAnswer = answers.find(a => a.questionType === 'WEIGHT' && a.numericValue);
      if (weightAnswer && weightAnswer.numericValue) {
        const unit = (weightAnswer.unit as any) || 'kg';
        const currentWt = weightAnswer.numericValue;
        
        let prevWt: number | undefined = undefined;
        let delta: number | undefined = undefined;
        if (weightLogs.length > 0) {
          const sorted = [...weightLogs].sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
          prevWt = sorted[0]?.weight;
          if (prevWt !== undefined) {
            delta = Math.round((currentWt - prevWt) * 10) / 10;
          }
        }

        adherenceSnapshot.weightLogged = {
          weight: currentWt,
          unit,
          previousWeight: prevWt,
          delta
        };

        // Auto-log to Progress Weight Tracker!
        await addClientWeightLog(tenantId, existing.clientId, {
          weight: currentWt,
          unit: unit === 'lbs' ? 'lbs' : 'kg',
          recordedAt: todayYMD,
          notes: `Logged via Check-in: ${existing.templateName}`
        });
      }

      // Check for Measurement answers
      const measurementAnswers = answers.filter(a => a.questionType === 'MEASUREMENT' && a.numericValue);
      if (measurementAnswers.length > 0) {
        const measEntry: Record<string, any> = {
          recordedAt: todayYMD,
          unit: (measurementAnswers[0].unit as any) || 'cm',
          notes: `Logged via Check-in: ${existing.templateName}`
        };

        const measLoggedList: Array<{ target: MeasurementTarget; targetLabel: string; value: number; unit: string }> = [];

        measurementAnswers.forEach(ans => {
          if (ans.measurementTarget && ans.numericValue) {
            measEntry[ans.measurementTarget] = ans.numericValue;
            measLoggedList.push({
              target: ans.measurementTarget,
              targetLabel: ans.questionLabelSnapshot || ans.measurementTarget,
              value: ans.numericValue,
              unit: ans.unit || 'cm'
            });
          }
        });

        adherenceSnapshot.measurementsLogged = measLoggedList;

        // Auto-log to Progress Measurements!
        await addClientMeasurement(tenantId, existing.clientId, measEntry as any);
      }
    } catch (metricErr) {
      console.warn('Could not compile complete adherence snapshot for check-in:', metricErr);
    }

    const updatedCheckIn: CheckInRecord = {
      ...existing,
      answers,
      status: 'SUBMITTED',
      submittedAt: now,
      submittedBy,
      adherenceSnapshot,
      updatedAt: now
    };

    await updateDoc(docRef, updatedCheckIn as any);

    // Schedule next recurring check-in if part of an active assignment
    if (existing.assignmentId) {
      try {
        await scheduleNextRecurringCheckIn(tenantId, existing);
      } catch (schErr) {
        console.warn('Could not schedule next checkin automatically:', schErr);
      }
    }

    return updatedCheckIn;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

async function scheduleNextRecurringCheckIn(
  tenantId: string,
  submittedCheckIn: CheckInRecord
): Promise<void> {
  if (!submittedCheckIn.assignmentId) return;

  const assignRef = doc(db, 'tenants', tenantId, 'checkInAssignments', submittedCheckIn.assignmentId);
  const assignSnap = await getDoc(assignRef);
  if (!assignSnap.exists()) return;
  const assignment = assignSnap.data() as CheckInAssignment;

  if (assignment.status !== 'ACTIVE') return;

  // Calculate next due date
  const lastDueDate = parseDateString(submittedCheckIn.dueDate || formatDateToYMD(new Date()));
  let daysToAdd = 7; // default weekly

  if (assignment.frequency === 'WEEKLY') {
    daysToAdd = 7;
  } else if (assignment.frequency === 'BIWEEKLY') {
    daysToAdd = 14;
  } else if (assignment.frequency === 'MONTHLY') {
    daysToAdd = 30;
  } else if (assignment.frequency === 'CUSTOM' && assignment.customDaysInterval) {
    daysToAdd = assignment.customDaysInterval;
  }

  const nextDueDateObj = new Date(lastDueDate);
  nextDueDateObj.setDate(lastDueDate.getDate() + daysToAdd);
  const nextDueDateYMD = formatDateToYMD(nextDueDateObj);

  // If assignment has an endDate and nextDueDate exceeds it, don't schedule
  if (assignment.endDate && nextDueDateYMD > assignment.endDate) {
    await updateDoc(assignRef, { status: 'COMPLETED' });
    return;
  }

  // Create next check-in
  const nextId = generateId('chk');
  const nextDocRef = doc(db, 'tenants', tenantId, 'checkIns', nextId);
  const now = new Date().toISOString();

  const nextCheckIn: CheckInRecord = {
    id: nextId,
    tenantId,
    assignmentId: assignment.id,
    templateId: assignment.templateId,
    templateName: assignment.templateName,
    templateVersion: assignment.templateVersion,
    clientId: assignment.clientId,
    clientName: assignment.clientName,
    clientEmail: assignment.clientEmail,
    trainerId: assignment.trainerId,
    dueDate: nextDueDateYMD,
    scheduledDate: nextDueDateYMD,
    status: 'DUE',
    questionsSnapshot: submittedCheckIn.questionsSnapshot,
    answers: [],
    createdAt: now,
    updatedAt: now
  };

  await setDoc(nextDocRef, nextCheckIn);
}

export async function reviewCheckIn(
  tenantId: string,
  checkInId: string,
  coachNote: string,
  reviewedBy: string,
  reviewedByName?: string
): Promise<void> {
  const path = `tenants/${tenantId}/checkIns/${checkInId}`;
  try {
    const docRef = doc(db, 'tenants', tenantId, 'checkIns', checkInId);
    const now = new Date().toISOString();
    await updateDoc(docRef, {
      coachNote: coachNote.trim(),
      coachNoteCreatedAt: now,
      coachNoteCreatedBy: reviewedBy,
      coachNoteCreatedByName: reviewedByName,
      reviewedAt: now,
      reviewedBy,
      reviewedByName,
      status: 'REVIEWED',
      updatedAt: now
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function createDirectCheckIn(
  tenantId: string,
  clientId: string,
  clientName: string,
  template: CheckInTemplate,
  dueDate: string,
  trainerId?: string
): Promise<CheckInRecord> {
  const id = generateId('chk');
  const path = `tenants/${tenantId}/checkIns/${id}`;
  try {
    const docRef = doc(db, 'tenants', tenantId, 'checkIns', id);
    const now = new Date().toISOString();

    const record: CheckInRecord = {
      id,
      tenantId,
      templateId: template.id,
      templateName: template.name,
      templateVersion: template.version || 1,
      clientId,
      clientName,
      trainerId,
      dueDate,
      scheduledDate: dueDate,
      status: 'DUE',
      questionsSnapshot: template.questions,
      answers: [],
      createdAt: now,
      updatedAt: now
    };

    await setDoc(docRef, record);
    return record;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

// -------------------------------------------------------------
// 4. HABITS ENGINE OPERATIONS
// -------------------------------------------------------------

export async function fetchClientHabits(
  tenantId: string,
  clientId: string
): Promise<Habit[]> {
  const path = `tenants/${tenantId}/habits`;
  try {
    const colRef = collection(db, 'tenants', tenantId, 'habits');
    const q = query(colRef, where('clientId', '==', clientId));
    const snap = await getDocs(q);
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Habit));
    
    // Sort active first, then created desc
    return list.sort((a, b) => {
      if (a.status === 'ACTIVE' && b.status !== 'ACTIVE') return -1;
      if (a.status !== 'ACTIVE' && b.status === 'ACTIVE') return 1;
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function createHabit(
  tenantId: string,
  habitData: Omit<Habit, 'id' | 'tenantId' | 'createdAt' | 'updatedAt' | 'createdBy'>,
  createdBy: string,
  createdByName?: string
): Promise<Habit> {
  const id = generateId('hbt');
  const path = `tenants/${tenantId}/habits/${id}`;
  try {
    const docRef = doc(db, 'tenants', tenantId, 'habits', id);
    const now = new Date().toISOString();
    const newHabit: Habit = {
      ...habitData,
      id,
      tenantId,
      createdBy,
      createdByName,
      createdAt: now,
      updatedAt: now
    };
    await setDoc(docRef, newHabit);
    return newHabit;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateHabit(
  tenantId: string,
  habitId: string,
  updates: Partial<Habit>
): Promise<void> {
  const path = `tenants/${tenantId}/habits/${habitId}`;
  try {
    const docRef = doc(db, 'tenants', tenantId, 'habits', habitId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function archiveHabit(
  tenantId: string,
  habitId: string
): Promise<void> {
  return updateHabit(tenantId, habitId, { status: 'ARCHIVED' });
}

export async function fetchHabitLogsForRange(
  tenantId: string,
  clientId: string,
  startDate: string,
  endDate: string
): Promise<HabitLog[]> {
  const path = `tenants/${tenantId}/habitLogs`;
  try {
    const colRef = collection(db, 'tenants', tenantId, 'habitLogs');
    const q = query(
      colRef,
      where('clientId', '==', clientId),
      where('date', '>=', startDate),
      where('date', '<=', endDate)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as HabitLog));
  } catch (error) {
    // If range query needs composite index or fails, fall back to clientId query
    try {
      const colRef = collection(db, 'tenants', tenantId, 'habitLogs');
      const q = query(colRef, where('clientId', '==', clientId));
      const snap = await getDocs(q);
      return snap.docs
        .map(d => ({ id: d.id, ...d.data() } as HabitLog))
        .filter(l => l.date >= startDate && l.date <= endDate);
    } catch (fallbackErr) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  }
}

export async function logHabitProgress(
  tenantId: string,
  clientId: string,
  habitId: string,
  date: string,
  value: number,
  target: number,
  completed: boolean,
  unit?: string,
  notes?: string
): Promise<HabitLog> {
  const logId = `${habitId}_${date}`;
  const path = `tenants/${tenantId}/habitLogs/${logId}`;
  try {
    const docRef = doc(db, 'tenants', tenantId, 'habitLogs', logId);
    const now = new Date().toISOString();
    const habitLog: HabitLog = {
      id: logId,
      habitId,
      clientId,
      tenantId,
      date,
      value,
      target,
      completed,
      unit,
      notes: notes?.trim() || '',
      createdAt: now,
      updatedAt: now
    };
    await setDoc(docRef, habitLog);
    return habitLog;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function toggleHabitCompletion(
  tenantId: string,
  clientId: string,
  habit: Habit,
  date: string,
  existingLog?: HabitLog
): Promise<HabitLog> {
  const isCurrentlyCompleted = existingLog ? existingLog.completed : false;
  const newCompleted = !isCurrentlyCompleted;
  const newValue = newCompleted ? habit.target : 0;

  return logHabitProgress(
    tenantId,
    clientId,
    habit.id,
    date,
    newValue,
    habit.target,
    newCompleted,
    habit.unit
  );
}

export async function fetchHabitLogsForDate(
  tenantId: string,
  clientId: string,
  date: string
): Promise<HabitLog[]> {
  return fetchHabitLogsForRange(tenantId, clientId, date, date);
}

export async function logHabitEntry(
  tenantId: string,
  habitId: string,
  clientId: string,
  date: string,
  value: number,
  completed: boolean,
  notes?: string
): Promise<HabitLog> {
  return logHabitProgress(tenantId, clientId, habitId, date, value, value, completed, undefined, notes);
}

export async function calculateHabitStreak(
  tenantId: string,
  habitId: string,
  clientId: string
): Promise<{ currentStreak: number; longestStreak: number }> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 60);
  const startYMD = formatDateToYMD(thirtyDaysAgo);
  const todayYMD = formatDateToYMD(new Date());

  const logs = await fetchHabitLogsForRange(tenantId, clientId, startYMD, todayYMD);
  const habitLogs = logs.filter(l => l.habitId === habitId && l.completed);
  const completedDates = new Set(habitLogs.map(l => l.date));

  let currentStreak = 0;
  const checkDate = new Date();
  
  const todayStr = formatDateToYMD(checkDate);
  if (!completedDates.has(todayStr)) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  while (completedDates.has(formatDateToYMD(checkDate))) {
    currentStreak++;
    checkDate.setDate(checkDate.getDate() - 1);
  }

  return { currentStreak, longestStreak: currentStreak };
}

export async function calculateClientHabitsOverview(
  tenantId: string,
  clientId: string,
  selectedDate?: string
): Promise<ClientHabitsOverview> {
  const dateStr = selectedDate || formatDateToYMD(new Date());
  
  // 1. Fetch habits
  const habits = await fetchClientHabits(tenantId, clientId);
  const activeHabits = habits.filter(h => h.status === 'ACTIVE');

  // 2. Fetch logs for last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoYMD = formatDateToYMD(thirtyDaysAgo);

  const logs = await fetchHabitLogsForRange(tenantId, clientId, thirtyDaysAgoYMD, dateStr);
  
  const logsToday: Record<string, HabitLog> = {};
  const logsByHabit: Record<string, HabitLog[]> = {};

  logs.forEach(log => {
    if (log.date === dateStr) {
      logsToday[log.habitId] = log;
    }
    if (!logsByHabit[log.habitId]) {
      logsByHabit[log.habitId] = [];
    }
    logsByHabit[log.habitId].push(log);
  });

  // Calculate 7-day bounds
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoYMD = formatDateToYMD(sevenDaysAgo);

  const stats: Record<string, HabitStats> = {};
  let total7DCompletions = 0;
  let total7DExpected = 0;
  let total30DCompletions = 0;
  let total30DExpected = 0;

  for (const habit of habits) {
    const habitLogs = logsByHabit[habit.id] || [];
    const historyMap: Record<string, HabitLog> = {};
    habitLogs.forEach(l => {
      historyMap[l.date] = l;
    });

    // Calculate streaks
    const completedDates = habitLogs.filter(l => l.completed).map(l => l.date).sort();
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    const completedSet = new Set(completedDates);

    // Current streak (looking back from today or yesterday)
    const today = parseDateString(dateStr);
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayYMD = formatDateToYMD(yesterday);

    let cursor: Date | null = null;
    if (completedSet.has(dateStr)) {
      cursor = new Date(today);
    } else if (completedSet.has(yesterdayYMD)) {
      cursor = new Date(yesterday);
    }

    if (cursor) {
      while (true) {
        const cYMD = formatDateToYMD(cursor);
        if (completedSet.has(cYMD)) {
          currentStreak++;
          cursor.setDate(cursor.getDate() - 1);
        } else {
          break;
        }
      }
    }

    // Longest streak
    for (let i = 0; i < completedDates.length; i++) {
      if (i === 0) {
        tempStreak = 1;
      } else {
        const prevD = parseDateString(completedDates[i - 1]);
        const currD = parseDateString(completedDates[i]);
        const diff = Math.round((currD.getTime() - prevD.getTime()) / (1000 * 60 * 60 * 24));
        if (diff === 1) {
          tempStreak++;
        } else {
          tempStreak = 1;
        }
      }
      if (tempStreak > longestStreak) longestStreak = tempStreak;
    }
    longestStreak = Math.max(longestStreak, currentStreak);

    // 7D & 30D Adherence
    const completed7D = habitLogs.filter(l => l.completed && l.date >= sevenDaysAgoYMD && l.date <= dateStr).length;
    const completed30D = habitLogs.filter(l => l.completed && l.date >= thirtyDaysAgoYMD && l.date <= dateStr).length;

    const adherence7D = Math.min(100, Math.round((completed7D / 7) * 100));
    const adherence30D = Math.min(100, Math.round((completed30D / 30) * 100));

    if (habit.status === 'ACTIVE') {
      total7DCompletions += completed7D;
      total7DExpected += 7;
      total30DCompletions += completed30D;
      total30DExpected += 30;
    }

    stats[habit.id] = {
      habitId: habit.id,
      currentStreakDays: currentStreak,
      longestStreakDays: longestStreak,
      totalCompletions: completedDates.length,
      adherence7D,
      adherence30D,
      historyMap
    };
  }

  const completedTodayCount = activeHabits.filter(h => logsToday[h.id]?.completed).length;

  const overallAdherence7D = total7DExpected > 0
    ? Math.min(100, Math.round((total7DCompletions / total7DExpected) * 100))
    : 0;

  const overallAdherence30D = total30DExpected > 0
    ? Math.min(100, Math.round((total30DCompletions / total30DExpected) * 100))
    : 0;

  return {
    habits,
    logsToday,
    stats,
    overallAdherence7D,
    overallAdherence30D,
    completedTodayCount,
    totalActiveTodayCount: activeHabits.length
  };
}

// -------------------------------------------------------------
// 5. ACCOUNTABILITY ATTENTION INSIGHTS & SUMMARY
// -------------------------------------------------------------

export interface AccountabilityAttentionInsight {
  id: string;
  type: 'CHECKIN_OVERDUE' | 'CHECKIN_SUBMITTED' | 'HABIT_ADHERENCE_LOW' | 'HABIT_STREAK' | 'WEIGHT_CHANGE';
  severity: 'critical' | 'warning' | 'positive' | 'info';
  clientId: string;
  clientName: string;
  title: string;
  description: string;
  metricValue?: string;
  actionUrl?: string;
  timestamp: string;
}

export async function fetchCoachAccountabilityInsights(
  tenantId: string,
  trainerId?: string
): Promise<AccountabilityAttentionInsight[]> {
  const insights: AccountabilityAttentionInsight[] = [];
  const todayYMD = formatDateToYMD(new Date());

  try {
    // 1. Fetch check-in records
    const checkIns = await fetchCoachCheckInInbox(tenantId, { trainerId, status: 'ALL' });

    // Submitted check-ins awaiting coach review
    const submitted = checkIns.filter(c => c.status === 'SUBMITTED');
    submitted.slice(0, 8).forEach(c => {
      insights.push({
        id: `submitted_${c.id}`,
        type: 'CHECKIN_SUBMITTED',
        severity: 'info',
        clientId: c.clientId,
        clientName: c.clientName || 'Athlete',
        title: 'Check-in Awaiting Review',
        description: `${c.clientName || 'Athlete'} submitted "${c.templateName}". Ready for review and feedback.`,
        metricValue: 'Submitted',
        actionUrl: `/owner/check-ins/${c.id}`,
        timestamp: c.submittedAt || c.updatedAt
      });
    });

    // Overdue check-ins
    const overdue = checkIns.filter(c => c.status === 'OVERDUE' || (c.status === 'DUE' && c.dueDate < todayYMD));
    overdue.slice(0, 8).forEach(c => {
      const dDue = parseDateString(c.dueDate);
      const dToday = parseDateString(todayYMD);
      const daysOverdue = Math.max(1, Math.floor((dToday.getTime() - dDue.getTime()) / (1000 * 60 * 60 * 24)));

      insights.push({
        id: `overdue_${c.id}`,
        type: 'CHECKIN_OVERDUE',
        severity: daysOverdue >= 3 ? 'critical' : 'warning',
        clientId: c.clientId,
        clientName: c.clientName || 'Athlete',
        title: `Check-in ${daysOverdue} Day${daysOverdue > 1 ? 's' : ''} Overdue`,
        description: `${c.clientName || 'Athlete'} has not submitted "${c.templateName}" (due ${c.dueDate}).`,
        metricValue: `${daysOverdue}d overdue`,
        timestamp: c.dueDate
      });
    });

    // 2. Fetch habits
    const habitsSnap = await getDocs(collection(db, 'tenants', tenantId, 'habits'));
    const allHabits = habitsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Habit));
    
    // Group active habits by client
    const clientHabitsMap = new Map<string, Habit[]>();
    allHabits.filter(h => h.status === 'ACTIVE').forEach(h => {
      const list = clientHabitsMap.get(h.clientId) || [];
      list.push(h);
      clientHabitsMap.set(h.clientId, list);
    });

  } catch (err) {
    console.warn('Could not compile accountability insights:', err);
  }

  return insights;
}
