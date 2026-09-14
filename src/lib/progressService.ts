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
  orderBy,
  limit,
  where,
  serverTimestamp
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { handleFirestoreError, OperationType } from './firestoreError';
import {
  BodyWeightEntry,
  BodyMeasurementEntry,
  ProgressPhotoEntry,
  GoalEntry,
  MilestoneEntry,
  ProgressSummaryStats,
  TimelineEventItem,
  WeightUnit,
  PhotoCategory,
  PhotoVisibility,
  GoalType,
  GoalStatus
} from '../types/progress';

// Helper for unique ID generation
function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

// -------------------------------------------------------------
// 1. BODY WEIGHT OPERATIONS
// -------------------------------------------------------------

export async function fetchClientWeightLogs(
  tenantId: string,
  clientId: string
): Promise<BodyWeightEntry[]> {
  const path = `tenants/${tenantId}/clients/${clientId}/progressWeight`;
  try {
    const colRef = collection(db, 'tenants', tenantId, 'clients', clientId, 'progressWeight');
    const q = query(colRef, orderBy('recordedAt', 'asc'));
    const snap = await getDocs(q);
    
    return snap.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        tenantId,
        clientId,
        weight: Number(data.weight) || 0,
        unit: (data.unit as WeightUnit) || 'kg',
        recordedAt: data.recordedAt || new Date().toISOString(),
        notes: data.notes || '',
        source: data.source || 'CLIENT_MANUAL',
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function addClientWeightLog(
  tenantId: string,
  clientId: string,
  entry: {
    weight: number;
    unit: WeightUnit;
    recordedAt: string;
    notes?: string;
  }
): Promise<BodyWeightEntry> {
  const id = generateId('wt');
  const path = `tenants/${tenantId}/clients/${clientId}/progressWeight/${id}`;
  try {
    const docRef = doc(db, 'tenants', tenantId, 'clients', clientId, 'progressWeight', id);
    const now = new Date().toISOString();
    const newEntry: BodyWeightEntry = {
      id,
      tenantId,
      clientId,
      weight: Number(entry.weight),
      unit: entry.unit,
      recordedAt: entry.recordedAt,
      notes: entry.notes?.trim() || '',
      source: 'CLIENT_MANUAL',
      createdAt: now,
      updatedAt: now
    };
    await setDoc(docRef, newEntry);
    return newEntry;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateClientWeightLog(
  tenantId: string,
  clientId: string,
  logId: string,
  updates: Partial<Pick<BodyWeightEntry, 'weight' | 'unit' | 'recordedAt' | 'notes'>>
): Promise<void> {
  const path = `tenants/${tenantId}/clients/${clientId}/progressWeight/${logId}`;
  try {
    const docRef = doc(db, 'tenants', tenantId, 'clients', clientId, 'progressWeight', logId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteClientWeightLog(
  tenantId: string,
  clientId: string,
  logId: string
): Promise<void> {
  const path = `tenants/${tenantId}/clients/${clientId}/progressWeight/${logId}`;
  try {
    const docRef = doc(db, 'tenants', tenantId, 'clients', clientId, 'progressWeight', logId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// -------------------------------------------------------------
// 2. BODY MEASUREMENTS OPERATIONS
// -------------------------------------------------------------

export async function fetchClientMeasurements(
  tenantId: string,
  clientId: string
): Promise<BodyMeasurementEntry[]> {
  const path = `tenants/${tenantId}/clients/${clientId}/measurements`;
  try {
    const colRef = collection(db, 'tenants', tenantId, 'clients', clientId, 'measurements');
    const q = query(colRef, orderBy('recordedAt', 'desc'));
    const snap = await getDocs(q);

    return snap.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        tenantId,
        clientId,
        recordedAt: data.recordedAt || new Date().toISOString(),
        unit: data.unit || 'cm',
        chest: data.chest ? Number(data.chest) : undefined,
        waist: data.waist ? Number(data.waist) : undefined,
        hips: data.hips ? Number(data.hips) : undefined,
        neck: data.neck ? Number(data.neck) : undefined,
        leftArm: data.leftArm ? Number(data.leftArm) : undefined,
        rightArm: data.rightArm ? Number(data.rightArm) : undefined,
        leftThigh: data.leftThigh ? Number(data.leftThigh) : undefined,
        rightThigh: data.rightThigh ? Number(data.rightThigh) : undefined,
        shoulders: data.shoulders ? Number(data.shoulders) : undefined,
        calves: data.calves ? Number(data.calves) : undefined,
        custom: data.custom || [],
        notes: data.notes || '',
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function addClientMeasurement(
  tenantId: string,
  clientId: string,
  entry: Omit<BodyMeasurementEntry, 'id' | 'tenantId' | 'clientId' | 'createdAt' | 'updatedAt'>
): Promise<BodyMeasurementEntry> {
  const id = generateId('meas');
  const path = `tenants/${tenantId}/clients/${clientId}/measurements/${id}`;
  try {
    const docRef = doc(db, 'tenants', tenantId, 'clients', clientId, 'measurements', id);
    const now = new Date().toISOString();
    const newEntry: BodyMeasurementEntry = {
      ...entry,
      id,
      tenantId,
      clientId,
      createdAt: now,
      updatedAt: now
    };
    await setDoc(docRef, newEntry);
    return newEntry;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateClientMeasurement(
  tenantId: string,
  clientId: string,
  measurementId: string,
  updates: Partial<BodyMeasurementEntry>
): Promise<void> {
  const path = `tenants/${tenantId}/clients/${clientId}/measurements/${measurementId}`;
  try {
    const docRef = doc(db, 'tenants', tenantId, 'clients', clientId, 'measurements', measurementId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteClientMeasurement(
  tenantId: string,
  clientId: string,
  measurementId: string
): Promise<void> {
  const path = `tenants/${tenantId}/clients/${clientId}/measurements/${measurementId}`;
  try {
    const docRef = doc(db, 'tenants', tenantId, 'clients', clientId, 'measurements', measurementId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// -------------------------------------------------------------
// 3. PROGRESS PHOTOS OPERATIONS (PRIVACY GATED)
// -------------------------------------------------------------

export async function fetchClientPhotos(
  tenantId: string,
  clientId: string,
  viewerRole: 'CLIENT' | 'TRAINER' | 'GYM_OWNER' = 'CLIENT',
  viewerUserId?: string
): Promise<ProgressPhotoEntry[]> {
  const path = `tenants/${tenantId}/clients/${clientId}/progressPhotos`;
  try {
    const colRef = collection(db, 'tenants', tenantId, 'clients', clientId, 'progressPhotos');
    const q = query(colRef, orderBy('recordedAt', 'desc'));
    const snap = await getDocs(q);

    const photos = snap.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        tenantId,
        clientId,
        photoUrl: data.photoUrl || '',
        thumbnailUrl: data.thumbnailUrl || data.photoUrl || '',
        storagePath: data.storagePath || '',
        category: (data.category as PhotoCategory) || 'FRONT',
        customTag: data.customTag || '',
        visibility: (data.visibility as PhotoVisibility) || 'CLIENT_ONLY',
        recordedAt: data.recordedAt || new Date().toISOString(),
        weightSnapshot: data.weightSnapshot ? Number(data.weightSnapshot) : undefined,
        weightUnit: data.weightUnit as WeightUnit,
        notes: data.notes || '',
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt
      };
    });

    // Privacy Gating:
    // If the viewer is a coach or owner, only return photos where visibility is TRAINER_AND_OWNER
    if (viewerRole !== 'CLIENT') {
      return photos.filter(p => p.visibility === 'TRAINER_AND_OWNER');
    }

    return photos;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function addClientPhoto(
  tenantId: string,
  clientId: string,
  photo: Omit<ProgressPhotoEntry, 'id' | 'tenantId' | 'clientId' | 'createdAt' | 'updatedAt'>
): Promise<ProgressPhotoEntry> {
  const id = generateId('photo');
  const path = `tenants/${tenantId}/clients/${clientId}/progressPhotos/${id}`;
  try {
    const docRef = doc(db, 'tenants', tenantId, 'clients', clientId, 'progressPhotos', id);
    const now = new Date().toISOString();
    const newEntry: ProgressPhotoEntry = {
      ...photo,
      id,
      tenantId,
      clientId,
      createdAt: now,
      updatedAt: now
    };
    await setDoc(docRef, newEntry);
    return newEntry;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateClientPhoto(
  tenantId: string,
  clientId: string,
  photoId: string,
  updates: Partial<Pick<ProgressPhotoEntry, 'category' | 'visibility' | 'recordedAt' | 'notes' | 'customTag' | 'weightSnapshot' | 'weightUnit'>>
): Promise<void> {
  const path = `tenants/${tenantId}/clients/${clientId}/progressPhotos/${photoId}`;
  try {
    const docRef = doc(db, 'tenants', tenantId, 'clients', clientId, 'progressPhotos', photoId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteClientPhoto(
  tenantId: string,
  clientId: string,
  photoId: string
): Promise<void> {
  const path = `tenants/${tenantId}/clients/${clientId}/progressPhotos/${photoId}`;
  try {
    const docRef = doc(db, 'tenants', tenantId, 'clients', clientId, 'progressPhotos', photoId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// -------------------------------------------------------------
// 4. GOALS OPERATIONS
// -------------------------------------------------------------

export async function fetchClientGoals(
  tenantId: string,
  clientId: string
): Promise<GoalEntry[]> {
  const path = `tenants/${tenantId}/clients/${clientId}/goals`;
  try {
    const colRef = collection(db, 'tenants', tenantId, 'clients', clientId, 'goals');
    const q = query(colRef, orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);

    return snap.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        tenantId,
        clientId,
        type: (data.type as GoalType) || 'CUSTOM',
        title: data.title || 'Personal Goal',
        description: data.description || '',
        targetValue: Number(data.targetValue) || 0,
        startValue: Number(data.startValue) || 0,
        currentValue: data.currentValue !== undefined ? Number(data.currentValue) : undefined,
        unit: data.unit || '',
        exerciseId: data.exerciseId,
        exerciseName: data.exerciseName,
        targetReps: data.targetReps ? Number(data.targetReps) : undefined,
        weeklyTarget: data.weeklyTarget ? Number(data.weeklyTarget) : undefined,
        startDate: data.startDate || new Date().toISOString(),
        targetDate: data.targetDate,
        status: (data.status as GoalStatus) || 'ACTIVE',
        completedAt: data.completedAt,
        notes: data.notes || '',
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function addClientGoal(
  tenantId: string,
  clientId: string,
  goal: Omit<GoalEntry, 'id' | 'tenantId' | 'clientId' | 'createdAt' | 'updatedAt'>
): Promise<GoalEntry> {
  const id = generateId('goal');
  const path = `tenants/${tenantId}/clients/${clientId}/goals/${id}`;
  try {
    const docRef = doc(db, 'tenants', tenantId, 'clients', clientId, 'goals', id);
    const now = new Date().toISOString();
    const newEntry: GoalEntry = {
      ...goal,
      id,
      tenantId,
      clientId,
      createdAt: now,
      updatedAt: now
    };
    await setDoc(docRef, newEntry);
    return newEntry;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateClientGoal(
  tenantId: string,
  clientId: string,
  goalId: string,
  updates: Partial<GoalEntry>
): Promise<void> {
  const path = `tenants/${tenantId}/clients/${clientId}/goals/${goalId}`;
  try {
    const docRef = doc(db, 'tenants', tenantId, 'clients', clientId, 'goals', goalId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteClientGoal(
  tenantId: string,
  clientId: string,
  goalId: string
): Promise<void> {
  const path = `tenants/${tenantId}/clients/${clientId}/goals/${goalId}`;
  try {
    const docRef = doc(db, 'tenants', tenantId, 'clients', clientId, 'goals', goalId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// -------------------------------------------------------------
// 5. MILESTONE DERIVATION & EVALUATION (REAL-DATA BASED)
// -------------------------------------------------------------

export function evaluateMilestones(params: {
  tenantId: string;
  clientId: string;
  totalWorkouts: number;
  streakDays: number;
  totalVolumeKg: number;
  totalPRs: number;
  weightLogs: BodyWeightEntry[];
  goals: GoalEntry[];
  photos: ProgressPhotoEntry[];
}): MilestoneEntry[] {
  const {
    tenantId,
    clientId,
    totalWorkouts,
    streakDays,
    totalVolumeKg,
    totalPRs,
    weightLogs,
    goals,
    photos
  } = params;

  // Weight delta calculation
  const startWeight = weightLogs.length > 0 ? weightLogs[0].weight : null;
  const latestWeight = weightLogs.length > 0 ? weightLogs[weightLogs.length - 1].weight : null;
  const weightChangeAbs = startWeight !== null && latestWeight !== null ? Math.abs(latestWeight - startWeight) : 0;
  const completedGoalsCount = goals.filter(g => g.status === 'COMPLETED').length;

  const definitions: Array<{
    id: string;
    category: MilestoneEntry['category'];
    title: string;
    description: string;
    icon: string;
    tier: MilestoneEntry['tier'];
    target: number;
    current: number;
    metricLabel: string;
  }> = [
    {
      id: 'first_workout',
      category: 'WORKOUT_COUNT',
      title: 'First Step Taken',
      description: 'Completed your very first logged workout session.',
      icon: '🏋️',
      tier: 'BRONZE',
      target: 1,
      current: totalWorkouts,
      metricLabel: 'workouts'
    },
    {
      id: 'ten_workouts',
      category: 'WORKOUT_COUNT',
      title: 'Building Momentum',
      description: 'Completed 10 training sessions in the gym.',
      icon: '⚡',
      tier: 'BRONZE',
      target: 10,
      current: totalWorkouts,
      metricLabel: 'workouts'
    },
    {
      id: 'twenty_five_workouts',
      category: 'WORKOUT_COUNT',
      title: 'Habit of Iron',
      description: 'Logged 25 complete training sessions.',
      icon: '🔥',
      tier: 'SILVER',
      target: 25,
      current: totalWorkouts,
      metricLabel: 'workouts'
    },
    {
      id: 'fifty_workouts',
      category: 'WORKOUT_COUNT',
      title: 'Dedication Master',
      description: 'Reached 50 completed workout sessions.',
      icon: '🛡️',
      tier: 'GOLD',
      target: 50,
      current: totalWorkouts,
      metricLabel: 'workouts'
    },
    {
      id: 'hundred_workouts',
      category: 'WORKOUT_COUNT',
      title: 'Century Club',
      description: 'Completed 100 workouts on NEXA FITOS.',
      icon: '👑',
      tier: 'DIAMOND',
      target: 100,
      current: totalWorkouts,
      metricLabel: 'workouts'
    },
    {
      id: 'first_pr',
      category: 'PR_COUNT',
      title: 'Breaking Barriers',
      description: 'Established your first Personal Record in any lift.',
      icon: '🏆',
      tier: 'BRONZE',
      target: 1,
      current: totalPRs,
      metricLabel: 'PRs'
    },
    {
      id: 'ten_prs',
      category: 'PR_COUNT',
      title: 'PR Crusher',
      description: 'Achieved 10 verified personal records.',
      icon: '🥇',
      tier: 'SILVER',
      target: 10,
      current: totalPRs,
      metricLabel: 'PRs'
    },
    {
      id: 'streak_7',
      category: 'STREAK',
      title: 'Unstoppable Week',
      description: 'Maintained a 7-day active workout streak.',
      icon: '🌟',
      tier: 'SILVER',
      target: 7,
      current: streakDays,
      metricLabel: 'day streak'
    },
    {
      id: 'streak_30',
      category: 'STREAK',
      title: 'Iron Discipline',
      description: 'Sustained a 30-day training streak.',
      icon: '💫',
      tier: 'GOLD',
      target: 30,
      current: streakDays,
      metricLabel: 'day streak'
    },
    {
      id: 'volume_10k',
      category: 'VOLUME',
      title: '10-Tonne Club',
      description: 'Lifted an accumulated 10,000 kg total workload.',
      icon: '🏗️',
      tier: 'BRONZE',
      target: 10000,
      current: totalVolumeKg,
      metricLabel: 'kg moved'
    },
    {
      id: 'volume_100k',
      category: 'VOLUME',
      title: '100-Tonne Titan',
      description: 'Lifted an accumulated 100,000 kg total workload.',
      icon: '🚀',
      tier: 'GOLD',
      target: 100000,
      current: totalVolumeKg,
      metricLabel: 'kg moved'
    },
    {
      id: 'photo_diary',
      category: 'TRANSFORMATION',
      title: 'Visual Journey',
      description: 'Logged at least 3 progress transformation photos.',
      icon: '📸',
      tier: 'BRONZE',
      target: 3,
      current: photos.length,
      metricLabel: 'photos'
    },
    {
      id: 'weight_milestone_3kg',
      category: 'WEIGHT_DELTA',
      title: 'Scale Shifter',
      description: 'Achieved 3 kg body transformation change.',
      icon: '⚖️',
      tier: 'SILVER',
      target: 3,
      current: weightChangeAbs,
      metricLabel: 'kg delta'
    },
    {
      id: 'first_goal_achieved',
      category: 'CUSTOM',
      title: 'Goal Getter',
      description: 'Marked your first training or physique goal complete.',
      icon: '🎯',
      tier: 'SILVER',
      target: 1,
      current: completedGoalsCount,
      metricLabel: 'goals'
    }
  ];

  return definitions.map(def => {
    const isUnlocked = def.current >= def.target;
    return {
      id: def.id,
      tenantId,
      clientId,
      category: def.category,
      title: def.title,
      description: def.description,
      icon: def.icon,
      tier: def.tier,
      unlocked: isUnlocked,
      unlockedAt: isUnlocked ? new Date().toISOString() : undefined,
      progressValue: Math.min(def.current, def.target),
      targetValue: def.target,
      metricLabel: def.metricLabel
    };
  });
}

// -------------------------------------------------------------
// 6. PROGRESS SUMMARY COMPUTATION
// -------------------------------------------------------------

export function calculateProgressSummary(
  weightLogs: BodyWeightEntry[],
  measurements: BodyMeasurementEntry[],
  photos: ProgressPhotoEntry[],
  goals: GoalEntry[],
  milestones: MilestoneEntry[]
): ProgressSummaryStats {
  const sortedWeights = [...weightLogs].sort(
    (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
  );

  const startEntry = sortedWeights[0];
  const latestEntry = sortedWeights[sortedWeights.length - 1];

  let lowestEntry = sortedWeights[0];
  let highestEntry = sortedWeights[0];

  for (const w of sortedWeights) {
    if (!lowestEntry || w.weight < lowestEntry.weight) lowestEntry = w;
    if (!highestEntry || w.weight > highestEntry.weight) highestEntry = w;
  }

  let totalWeightDelta = 0;
  let totalWeightDeltaPercent = 0;

  if (startEntry && latestEntry) {
    totalWeightDelta = Number((latestEntry.weight - startEntry.weight).toFixed(2));
    if (startEntry.weight > 0) {
      totalWeightDeltaPercent = Number(((totalWeightDelta / startEntry.weight) * 100).toFixed(1));
    }
  }

  // Recent Trend (last 4 entries or 30 days)
  let recentWeightTrend: 'LOSING' | 'GAINING' | 'STABLE' = 'STABLE';
  let trendRatePerWeek = 0;

  if (sortedWeights.length >= 2) {
    const recentSubset = sortedWeights.slice(-5);
    const firstRecent = recentSubset[0];
    const lastRecent = recentSubset[recentSubset.length - 1];
    const diff = lastRecent.weight - firstRecent.weight;
    const days = Math.max(
      1,
      Math.round(
        (new Date(lastRecent.recordedAt).getTime() - new Date(firstRecent.recordedAt).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    );
    const weeks = days / 7;
    trendRatePerWeek = weeks > 0 ? Number((diff / weeks).toFixed(2)) : 0;

    if (diff <= -0.5) recentWeightTrend = 'LOSING';
    else if (diff >= 0.5) recentWeightTrend = 'GAINING';
    else recentWeightTrend = 'STABLE';
  }

  const activeGoalsCount = goals.filter(g => g.status === 'ACTIVE').length;
  const completedGoalsCount = goals.filter(g => g.status === 'COMPLETED').length;
  const unlockedMilestonesCount = milestones.filter(m => m.unlocked).length;

  return {
    startingWeight: startEntry
      ? { value: startEntry.weight, unit: startEntry.unit, date: startEntry.recordedAt }
      : undefined,
    currentWeight: latestEntry
      ? { value: latestEntry.weight, unit: latestEntry.unit, date: latestEntry.recordedAt }
      : undefined,
    lowestWeight: lowestEntry
      ? { value: lowestEntry.weight, unit: lowestEntry.unit, date: lowestEntry.recordedAt }
      : undefined,
    highestWeight: highestEntry
      ? { value: highestEntry.weight, unit: highestEntry.unit, date: highestEntry.recordedAt }
      : undefined,
    totalWeightDelta,
    totalWeightDeltaPercent,
    recentWeightTrend,
    trendRatePerWeek,
    totalPhotosCount: photos.length,
    activeGoalsCount,
    completedGoalsCount,
    unlockedMilestonesCount,
    totalMilestonesCount: milestones.length,
    latestMeasurement: measurements[0]
  };
}

// -------------------------------------------------------------
// 7. COMBINED PROGRESS TIMELINE AGGREGATION
// -------------------------------------------------------------

export function buildProgressTimeline(params: {
  weights: BodyWeightEntry[];
  measurements: BodyMeasurementEntry[];
  photos: ProgressPhotoEntry[];
  goals: GoalEntry[];
  personalRecords?: Array<{ id: string; exerciseName: string; value: number; unit?: string; type: string; achievedAt: string; workoutName?: string }>;
  completedSessions?: Array<{ id: string; workoutName: string; completedAt: string; durationMinutes?: number; completedSets?: number }>;
}): TimelineEventItem[] {
  const events: TimelineEventItem[] = [];

  // 1. Weights
  params.weights.forEach(w => {
    events.push({
      id: `timeline_wt_${w.id}`,
      type: 'WEIGHT',
      date: w.recordedAt,
      title: `Logged Body Weight: ${w.weight} ${w.unit}`,
      subtitle: w.notes ? `"${w.notes}"` : 'Scale check-in recorded',
      details: w,
      iconName: 'Scale',
      badgeColor: 'amber'
    });
  });

  // 2. Measurements
  params.measurements.forEach(m => {
    const metrics: string[] = [];
    if (m.waist) metrics.push(`Waist: ${m.waist}${m.unit}`);
    if (m.chest) metrics.push(`Chest: ${m.chest}${m.unit}`);
    if (m.hips) metrics.push(`Hips: ${m.hips}${m.unit}`);
    if (m.leftArm) metrics.push(`Arm: ${m.leftArm}${m.unit}`);

    events.push({
      id: `timeline_meas_${m.id}`,
      type: 'MEASUREMENT',
      date: m.recordedAt,
      title: 'Tape Measurements Logged',
      subtitle: metrics.length > 0 ? metrics.join(' · ') : 'Body measurements recorded',
      details: m,
      iconName: 'Ruler',
      badgeColor: 'blue'
    });
  });

  // 3. Photos
  params.photos.forEach(p => {
    events.push({
      id: `timeline_photo_${p.id}`,
      type: 'PHOTO',
      date: p.recordedAt,
      title: `${p.category} Progress Photo`,
      subtitle: p.notes || (p.weightSnapshot ? `Snapped at ${p.weightSnapshot} ${p.weightUnit || 'kg'}` : 'Physique photo added'),
      details: p,
      iconName: 'Camera',
      badgeColor: 'purple'
    });
  });

  // 4. Completed Goals
  params.goals
    .filter(g => g.status === 'COMPLETED' && g.completedAt)
    .forEach(g => {
      events.push({
        id: `timeline_goal_${g.id}`,
        type: 'GOAL_COMPLETED',
        date: g.completedAt || g.updatedAt || g.createdAt,
        title: `Goal Achieved: ${g.title}`,
        subtitle: `Target of ${g.targetValue} ${g.unit || ''} completed!`,
        details: g,
        iconName: 'Target',
        badgeColor: 'emerald'
      });
    });

  // 5. Personal Records
  (params.personalRecords || []).forEach(pr => {
    events.push({
      id: `timeline_pr_${pr.id}`,
      type: 'WORKOUT_PR',
      date: pr.achievedAt,
      title: `New Personal Record: ${pr.exerciseName}`,
      subtitle: `${pr.value} ${pr.unit || ''} (${pr.type.replace('_', ' ')}) in ${pr.workoutName || 'Workout'}`,
      details: pr,
      iconName: 'Trophy',
      badgeColor: 'yellow'
    });
  });

  // 6. Completed Workouts
  (params.completedSessions || []).forEach(ws => {
    events.push({
      id: `timeline_session_${ws.id}`,
      type: 'WORKOUT_COMPLETED',
      date: ws.completedAt,
      title: `Finished ${ws.workoutName}`,
      subtitle: `${ws.completedSets || 0} sets completed ${ws.durationMinutes ? `in ${ws.durationMinutes} mins` : ''}`,
      details: ws,
      iconName: 'Dumbbell',
      badgeColor: 'primary'
    });
  });

  // Sort descending by date
  return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

// -------------------------------------------------------------
// 8. ASYNC COMPOSITE LOADERS & EXPORT ALIASES
// -------------------------------------------------------------

export const logBodyWeightEntry = addClientWeightLog;
export const updateBodyWeightEntry = updateClientWeightLog;
export const deleteBodyWeightEntry = deleteClientWeightLog;

export const logBodyMeasurementEntry = addClientMeasurement;
export const updateBodyMeasurementEntry = updateClientMeasurement;
export const deleteBodyMeasurementEntry = deleteClientMeasurement;

export async function fetchClientProgressPhotos(
  tenantId: string,
  clientId: string,
  isCoachView: boolean = false
): Promise<ProgressPhotoEntry[]> {
  return fetchClientPhotos(tenantId, clientId, isCoachView ? 'TRAINER' : 'CLIENT');
}

export const logProgressPhotoEntry = addClientPhoto;
export const updateProgressPhotoEntry = updateClientPhoto;
export const deleteProgressPhotoEntry = deleteClientPhoto;

export const createGoalEntry = addClientGoal;
export const updateGoalEntry = updateClientGoal;
export const deleteGoalEntry = deleteClientGoal;

export async function fetchClientMilestones(
  tenantId: string,
  clientId: string
): Promise<MilestoneEntry[]> {
  try {
    const [weights, goals, photos] = await Promise.all([
      fetchClientWeightLogs(tenantId, clientId),
      fetchClientGoals(tenantId, clientId),
      fetchClientPhotos(tenantId, clientId, 'CLIENT')
    ]);

    // Fetch workout stats from sessions
    const sessionsCol = collection(db, 'tenants', tenantId, 'clients', clientId, 'workoutSessions');
    const sessionsSnap = await getDocs(sessionsCol);
    
    let totalWorkouts = 0;
    let totalVolumeKg = 0;
    let totalPRs = 0;

    sessionsSnap.forEach(docSnap => {
      const s = docSnap.data();
      if (s.status === 'COMPLETED') {
        totalWorkouts++;
        totalVolumeKg += Number(s.totalVolumeKg) || 0;
        if (Array.isArray(s.prsAchieved)) {
          totalPRs += s.prsAchieved.length;
        }
      }
    });

    return evaluateMilestones({
      tenantId,
      clientId,
      totalWorkouts,
      streakDays: Math.min(totalWorkouts, 7),
      totalVolumeKg,
      totalPRs,
      weightLogs: weights,
      goals,
      photos
    });
  } catch (err) {
    console.error('Error in fetchClientMilestones:', err);
    return [];
  }
}

export async function fetchClientTransformationTimeline(
  tenantId: string,
  clientId: string
): Promise<TimelineEventItem[]> {
  try {
    const [weights, measurements, photos, goals] = await Promise.all([
      fetchClientWeightLogs(tenantId, clientId),
      fetchClientMeasurements(tenantId, clientId),
      fetchClientPhotos(tenantId, clientId, 'CLIENT'),
      fetchClientGoals(tenantId, clientId)
    ]);

    const sessionsCol = collection(db, 'tenants', tenantId, 'clients', clientId, 'workoutSessions');
    const sessionsSnap = await getDocs(sessionsCol);

    const completedSessions: Array<{ id: string; workoutName: string; completedAt: string; durationMinutes?: number; completedSets?: number }> = [];
    const personalRecords: Array<{ id: string; exerciseName: string; value: number; unit?: string; type: string; achievedAt: string; workoutName?: string }> = [];

    sessionsSnap.forEach(docSnap => {
      const s = docSnap.data();
      if (s.status === 'COMPLETED') {
        completedSessions.push({
          id: docSnap.id,
          workoutName: s.workoutName || 'Workout Session',
          completedAt: s.completedAt || s.startedAt || new Date().toISOString(),
          durationMinutes: s.durationMinutes ? Number(s.durationMinutes) : undefined,
          completedSets: s.completedSets ? Number(s.completedSets) : undefined
        });

        if (Array.isArray(s.prsAchieved)) {
          s.prsAchieved.forEach((pr: any, idx: number) => {
            personalRecords.push({
              id: `${docSnap.id}_pr_${idx}`,
              exerciseName: pr.exerciseName || 'Exercise',
              value: Number(pr.value) || 0,
              unit: pr.unit || '',
              type: pr.type || 'HEAVIEST_WEIGHT',
              achievedAt: s.completedAt || s.startedAt || new Date().toISOString(),
              workoutName: s.workoutName
            });
          });
        }
      }
    });

    return buildProgressTimeline({
      weights,
      measurements,
      photos,
      goals,
      personalRecords,
      completedSessions
    });
  } catch (err) {
    console.error('Error fetching client transformation timeline:', err);
    return [];
  }
}
