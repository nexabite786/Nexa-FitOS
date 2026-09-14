import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy
} from 'firebase/firestore';
import { db } from './firebase';
import { handleFirestoreError, OperationType } from './firestoreError';
import {
  WorkoutSession,
  WorkoutSetLog,
  PersonalRecord,
  PRType
} from '../types/workoutSession';
import {
  fetchCompletedClientSessions,
  fetchSessionSets,
  fetchClientPersonalRecords,
  fetchClientAllScheduledWorkouts
} from './workoutSessionService';
import {
  fetchClientAssignments,
  formatDateToYMD,
  formatReadableDate,
  parseDateString
} from './assignmentService';
import { fetchProgramWeeksAndSchedule } from './scheduleService';

export type TimeRange = '7D' | '30D' | '90D' | '1Y' | 'ALL';

export interface ConsistencyMetric {
  periodKey: string;
  periodName: string;
  scheduledCount: number;
  completedCount: number;
  completionRate: number | null; // percentage (0-100) or null if 0 scheduled
  hasSchedule: boolean;
}

export interface VolumeDataPoint {
  date: string;
  label: string;
  volumeKg: number;
  volumeLbs: number;
  reps: number;
  durationMinutes: number;
  setsCount: number;
  workoutCount: number;
  workoutNames: string[];
}

export interface WeeklyFrequencyDataPoint {
  weekLabel: string;
  startDate: string;
  completedCount: number;
  scheduledCount: number;
}

export interface ExerciseProgressSummary {
  exerciseId: string;
  exerciseName: string;
  category: string;
  measurementType: 'STRENGTH' | 'BODYWEIGHT_REPS' | 'TIMED' | 'AMRAP';
  unit: string;
  totalSessions: number;
  latestValue: number;
  latestFormatted: string;
  latestDate: string;
  previousValue?: number;
  previousFormatted?: string;
  bestValue: number;
  bestFormatted: string;
  bestDate: string;
  trend: 'INCREASING' | 'MAINTAINING' | 'DECREASING' | 'NEW';
  trendPercentage?: number;
  insightText: string;
  history: Array<{
    date: string;
    formattedDate: string;
    workoutName: string;
    bestMetric: number;
    bestMetricFormatted: string;
    volumeKg?: number;
    setsCount: number;
  }>;
}

export interface ClientComprehensiveAnalytics {
  timeRange: TimeRange;
  // Primary KPI Counters
  totalWorkouts: number;
  totalSets: number;
  totalVolumeKg: number;
  totalVolumeLbs: number;
  totalTrainingMinutes: number;
  totalPRsCount: number;
  activeTrainingDaysCount: number;

  // Streaks (in calendar days)
  currentStreakDays: number;
  longestStreakDays: number;

  // Consistency & Adherence Breakdown
  consistency: {
    thisWeek: ConsistencyMetric;
    thisMonth: ConsistencyMetric;
    last30Days: ConsistencyMetric;
    last90Days: ConsistencyMetric;
  };

  // Charts data
  volumeOverTime: VolumeDataPoint[];
  weeklyFrequency: WeeklyFrequencyDataPoint[];

  // Personal Records
  personalRecords: PersonalRecord[];

  // Exercise Performance Progression
  exerciseProgressList: ExerciseProgressSummary[];

  // Filtered Sessions
  filteredSessions: WorkoutSession[];
}

export interface CoachAttentionInsight {
  id: string;
  type: 'INACTIVITY' | 'HIGH_ADHERENCE' | 'NEW_PR' | 'VOLUME_PROGRESSION' | 'WORKOUT_COMPLETED';
  severity: 'critical' | 'warning' | 'positive' | 'info';
  clientId: string;
  clientName: string;
  trainerId?: string;
  trainerName?: string;
  title: string;
  description: string;
  metricValue?: string;
  timestamp: string;
}

export interface TrainerRosterClientSummary {
  clientId: string;
  clientName: string;
  email: string;
  avatarInitials: string;
  status: string;
  currentProgramName?: string;
  lastWorkoutDate?: string;
  lastWorkoutName?: string;
  daysSinceLastWorkout?: number;
  completionRate7D: number | null;
  completionRate30D: number | null;
  totalWorkoutsCompleted: number;
  totalVolumeKg: number;
  recentPRCount: number;
  activityTag: 'ON_TRACK' | 'NEEDS_ATTENTION' | 'INACTIVE' | 'HIGH_PERFORMER';
}

export interface TrainerAnalyticsData {
  trainerId: string;
  trainerName: string;
  assignedClientsCount: number;
  activeClientsCount: number;
  totalWorkoutsCompleted: number;
  averageCompletionRate: number | null; // null if no scheduled workouts
  roster: TrainerRosterClientSummary[];
  insights: CoachAttentionInsight[];
}

export interface GymOwnerOverviewAnalytics {
  totalClients: number;
  activeClients: number;
  totalTrainers: number;
  workoutsThisWeek: number;
  workoutsThisMonth: number;
  totalWorkoutsAllTime: number;
  gymWideCompletionRate: number | null;
  volumeOverTime: VolumeDataPoint[];
  insights: CoachAttentionInsight[];
  recentWorkouts: Array<{
    id: string;
    clientId: string;
    clientName: string;
    workoutName: string;
    completedAt: string;
    durationMinutes: number;
    volumeKg: number;
    prsCount: number;
  }>;
}

// ----------------------------------------------------------------------
// HELPER: DATE BOUNDS & TIMEZONE UTILS
// ----------------------------------------------------------------------

export function getDateRangeStart(range: TimeRange, timezone?: string): string {
  if (range === 'ALL') return '2000-01-01';
  const now = new Date();
  const todayYMD = formatDateToYMD(now);
  const date = parseDateString(todayYMD);

  if (range === '7D') {
    date.setDate(date.getDate() - 7);
  } else if (range === '30D') {
    date.setDate(date.getDate() - 30);
  } else if (range === '90D') {
    date.setDate(date.getDate() - 90);
  } else if (range === '1Y') {
    date.setDate(date.getDate() - 365);
  }

  return formatDateToYMD(date);
}

/**
 * Calculates current and longest streak in consecutive calendar days.
 * Strictly guarantees that multiple workouts on the same day count as 1 active day.
 */
export function calculateCalendarDayStreaks(
  completedDates: string[],
  todayYMD: string
): { currentStreakDays: number; longestStreakDays: number } {
  if (!completedDates || completedDates.length === 0) {
    return { currentStreakDays: 0, longestStreakDays: 0 };
  }

  // Deduplicate and sort dates ascending
  const uniqueDates = Array.from(new Set(completedDates)).sort();
  if (uniqueDates.length === 0) {
    return { currentStreakDays: 0, longestStreakDays: 0 };
  }

  const uniqueDateSet = new Set(uniqueDates);

  // 1. Calculate Longest Streak
  let longestStreakDays = 1;
  let currentRun = 1;

  for (let i = 1; i < uniqueDates.length; i++) {
    const prev = parseDateString(uniqueDates[i - 1]);
    const curr = parseDateString(uniqueDates[i]);
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      currentRun++;
      if (currentRun > longestStreakDays) {
        longestStreakDays = currentRun;
      }
    } else {
      currentRun = 1;
    }
  }

  // 2. Calculate Current Streak (looking back from today or yesterday)
  let currentStreakDays = 0;
  const today = parseDateString(todayYMD);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yesterdayYMD = formatDateToYMD(yesterday);

  let cursor: Date;
  if (uniqueDateSet.has(todayYMD)) {
    cursor = new Date(today);
  } else if (uniqueDateSet.has(yesterdayYMD)) {
    cursor = new Date(yesterday);
  } else {
    // Neither today nor yesterday had a completed workout => current streak is 0
    return { currentStreakDays: 0, longestStreakDays };
  }

  while (true) {
    const cursorYMD = formatDateToYMD(cursor);
    if (uniqueDateSet.has(cursorYMD)) {
      currentStreakDays++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }

  return {
    currentStreakDays,
    longestStreakDays: Math.max(longestStreakDays, currentStreakDays)
  };
}

// ----------------------------------------------------------------------
// CLIENT ANALYTICS ENGINE
// ----------------------------------------------------------------------

export async function fetchClientComprehensiveAnalytics(
  tenantId: string,
  clientId: string,
  timeRange: TimeRange = '30D',
  timezone?: string
): Promise<ClientComprehensiveAnalytics> {
  const now = new Date();
  const todayYMD = formatDateToYMD(now);
  const startDateBound = getDateRangeStart(timeRange, timezone);

  // 1. Fetch completed workout sessions
  const allSessions = await fetchCompletedClientSessions(tenantId, clientId);

  // 2. Filter sessions by date range
  const filteredSessions = allSessions.filter(s => {
    const sessDate = s.scheduledDate || (s.completedAt ? formatDateToYMD(new Date(s.completedAt)) : null);
    if (!sessDate) return false;
    return sessDate >= startDateBound && sessDate <= todayYMD;
  });

  // 3. Fetch Personal Records
  const allPRs = await fetchClientPersonalRecords(tenantId, clientId);

  // 4. Calculate KPI totals from filtered sessions
  let totalSets = 0;
  let totalVolumeKg = 0;
  let totalVolumeLbs = 0;
  let totalTrainingMinutes = 0;
  const completedDatesSet = new Set<string>();

  for (const s of filteredSessions) {
    totalSets += s.completedSets || 0;
    totalVolumeKg += s.totalVolumeKg || 0;
    totalVolumeLbs += s.totalVolumeLbs || 0;
    totalTrainingMinutes += s.durationMinutes || 0;

    const dateStr = s.scheduledDate || (s.completedAt ? formatDateToYMD(new Date(s.completedAt)) : null);
    if (dateStr) {
      completedDatesSet.add(dateStr);
    }
  }

  // All-time completed dates for streaks
  const allCompletedDates = allSessions
    .map(s => s.scheduledDate || (s.completedAt ? formatDateToYMD(new Date(s.completedAt)) : null))
    .filter(Boolean) as string[];

  const { currentStreakDays, longestStreakDays } = calculateCalendarDayStreaks(
    allCompletedDates,
    todayYMD
  );

  // 5. Calculate Consistency & Adherence over specific windows
  const consistency = await calculateClientAdherenceBreakdown(
    tenantId,
    clientId,
    allSessions,
    todayYMD,
    timezone
  );

  // 6. Generate Volume Over Time Chart Data
  const volumeOverTime = buildVolumeOverTimeData(filteredSessions, timeRange, todayYMD, timezone);

  // 7. Generate Weekly Frequency Chart Data
  const weeklyFrequency = buildWeeklyFrequencyData(allSessions, todayYMD, timezone);

  // 8. Generate Exercise Progression Summaries
  const exerciseProgressList = await buildExerciseProgressSummaries(tenantId, clientId, allSessions, allPRs);

  return {
    timeRange,
    totalWorkouts: filteredSessions.length,
    totalSets,
    totalVolumeKg: Math.round(totalVolumeKg * 10) / 10,
    totalVolumeLbs: Math.round(totalVolumeLbs * 10) / 10,
    totalTrainingMinutes,
    totalPRsCount: allPRs.length,
    activeTrainingDaysCount: completedDatesSet.size,
    currentStreakDays,
    longestStreakDays,
    consistency,
    volumeOverTime,
    weeklyFrequency,
    personalRecords: allPRs,
    exerciseProgressList,
    filteredSessions
  };
}

/**
 * Calculates consistency & adherence across 4 windows:
 * - This Week
 * - This Month
 * - Last 30 Days
 * - Last 90 Days
 */
async function calculateClientAdherenceBreakdown(
  tenantId: string,
  clientId: string,
  allCompletedSessions: WorkoutSession[],
  todayYMD: string,
  timezone?: string
): Promise<{
  thisWeek: ConsistencyMetric;
  thisMonth: ConsistencyMetric;
  last30Days: ConsistencyMetric;
  last90Days: ConsistencyMetric;
}> {
  const completedDateMap = new Map<string, number>();
  allCompletedSessions.forEach(s => {
    const d = s.scheduledDate || (s.completedAt ? formatDateToYMD(new Date(s.completedAt)) : null);
    if (d) {
      completedDateMap.set(d, (completedDateMap.get(d) || 0) + 1);
    }
  });

  // Calculate Date Boundaries
  const today = parseDateString(todayYMD);

  // This Week (Mon-Sun)
  const dayOfWeekIndex = (today.getDay() + 6) % 7; // Monday = 0
  const thisWeekStart = new Date(today);
  thisWeekStart.setDate(today.getDate() - dayOfWeekIndex);
  const thisWeekStartYMD = formatDateToYMD(thisWeekStart);

  // This Month
  const thisMonthStartYMD = `${todayYMD.substring(0, 7)}-01`;

  // Last 30 Days
  const last30Start = new Date(today);
  last30Start.setDate(today.getDate() - 30);
  const last30StartYMD = formatDateToYMD(last30Start);

  // Last 90 Days
  const last90Start = new Date(today);
  last90Start.setDate(today.getDate() - 90);
  const last90StartYMD = formatDateToYMD(last90Start);

  // Count scheduled workouts in each period from active program schedule
  let scheduledWeek = 0;
  let scheduledMonth = 0;
  let scheduled30D = 0;
  let scheduled90D = 0;
  let hasActiveSchedule = false;

  try {
    const scheduledData = await fetchClientAllScheduledWorkouts(tenantId, clientId, timezone);
    if (scheduledData.workouts && scheduledData.workouts.length > 0) {
      hasActiveSchedule = true;
      for (const item of scheduledData.workouts) {
        const itemDate = item.scheduledDate;
        // Only count past/due or current scheduled workouts up to today
        if (itemDate <= todayYMD) {
          if (itemDate >= thisWeekStartYMD && itemDate <= todayYMD) scheduledWeek++;
          if (itemDate >= thisMonthStartYMD && itemDate <= todayYMD) scheduledMonth++;
          if (itemDate >= last30StartYMD && itemDate <= todayYMD) scheduled30D++;
          if (itemDate >= last90StartYMD && itemDate <= todayYMD) scheduled90D++;
        }
      }
    }
  } catch (err) {
    console.warn('Could not fetch schedule for adherence:', err);
  }

  // Count completed in each window
  let completedWeek = 0;
  let completedMonth = 0;
  let completed30D = 0;
  let completed90D = 0;

  for (const [dateStr, count] of completedDateMap.entries()) {
    if (dateStr >= thisWeekStartYMD && dateStr <= todayYMD) completedWeek += count;
    if (dateStr >= thisMonthStartYMD && dateStr <= todayYMD) completedMonth += count;
    if (dateStr >= last30StartYMD && dateStr <= todayYMD) completed30D += count;
    if (dateStr >= last90StartYMD && dateStr <= todayYMD) completed90D += count;
  }

  const buildMetric = (
    key: string,
    name: string,
    scheduled: number,
    completed: number
  ): ConsistencyMetric => {
    const hasScheduledData = scheduled > 0;
    return {
      periodKey: key,
      periodName: name,
      scheduledCount: scheduled,
      completedCount: completed,
      completionRate: hasScheduledData
        ? Math.min(100, Math.round((completed / scheduled) * 100))
        : null,
      hasSchedule: hasScheduledData
    };
  };

  return {
    thisWeek: buildMetric('thisWeek', 'This Week', scheduledWeek, completedWeek),
    thisMonth: buildMetric('thisMonth', 'This Month', scheduledMonth, completedMonth),
    last30Days: buildMetric('last30Days', 'Last 30 Days', scheduled30D, completed30D),
    last90Days: buildMetric('last90Days', 'Last 90 Days', scheduled90D, completed90D)
  };
}

/**
 * Builds time-series volume data points for Recharts.
 */
function buildVolumeOverTimeData(
  sessions: WorkoutSession[],
  range: TimeRange,
  todayYMD: string,
  timezone?: string
): VolumeDataPoint[] {
  // Map sessions by date
  const dayMap = new Map<string, {
    volumeKg: number;
    volumeLbs: number;
    reps: number;
    durationMinutes: number;
    setsCount: number;
    workoutNames: string[];
  }>();

  sessions.forEach(s => {
    const dateStr = s.scheduledDate || (s.completedAt ? formatDateToYMD(new Date(s.completedAt)) : null);
    if (!dateStr) return;

    const existing = dayMap.get(dateStr) || {
      volumeKg: 0,
      volumeLbs: 0,
      reps: 0,
      durationMinutes: 0,
      setsCount: 0,
      workoutNames: []
    };

    let repsInSession = 0;
    if (s.completedSetsSummary) {
      s.completedSetsSummary.forEach(set => {
        repsInSession += set.reps || 0;
      });
    }

    existing.volumeKg += s.totalVolumeKg || 0;
    existing.volumeLbs += s.totalVolumeLbs || 0;
    existing.reps += repsInSession;
    existing.durationMinutes += s.durationMinutes || 0;
    existing.setsCount += s.completedSets || 0;
    if (s.workoutName && !existing.workoutNames.includes(s.workoutName)) {
      existing.workoutNames.push(s.workoutName);
    }

    dayMap.set(dateStr, existing);
  });

  // Sort dates
  const sortedDates = Array.from(dayMap.keys()).sort();

  return sortedDates.map(dateStr => {
    const entry = dayMap.get(dateStr)!;
    const readable = formatReadableDate(dateStr, timezone);
    return {
      date: dateStr,
      label: readable,
      volumeKg: Math.round(entry.volumeKg * 10) / 10,
      volumeLbs: Math.round(entry.volumeLbs * 10) / 10,
      reps: entry.reps,
      durationMinutes: entry.durationMinutes,
      setsCount: entry.setsCount,
      workoutCount: entry.workoutNames.length,
      workoutNames: entry.workoutNames
    };
  });
}

/**
 * Builds weekly completed workouts frequency data.
 */
function buildWeeklyFrequencyData(
  allSessions: WorkoutSession[],
  todayYMD: string,
  timezone?: string
): WeeklyFrequencyDataPoint[] {
  if (!allSessions || allSessions.length === 0) return [];

  const today = parseDateString(todayYMD);
  // Generate last 6 weeks
  const weeks: WeeklyFrequencyDataPoint[] = [];

  for (let w = 5; w >= 0; w--) {
    const weekEndDate = new Date(today);
    weekEndDate.setDate(today.getDate() - (w * 7));
    
    // Day of week index (Monday = 0)
    const dIdx = (weekEndDate.getDay() + 6) % 7;
    const weekStartDate = new Date(weekEndDate);
    weekStartDate.setDate(weekEndDate.getDate() - dIdx);
    
    const weekSundayDate = new Date(weekStartDate);
    weekSundayDate.setDate(weekStartDate.getDate() + 6);

    const startYMD = formatDateToYMD(weekStartDate);
    const endYMD = formatDateToYMD(weekSundayDate);

    // Count sessions in this range
    const completedCount = allSessions.filter(s => {
      const d = s.scheduledDate || (s.completedAt ? formatDateToYMD(new Date(s.completedAt)) : null);
      return d && d >= startYMD && d <= endYMD;
    }).length;

    const label = `${weekStartDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekSundayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

    weeks.push({
      weekLabel: label,
      startDate: startYMD,
      completedCount,
      scheduledCount: 0
    });
  }

  return weeks;
}

/**
 * Builds exercise progress cards comparing previous, latest, and best performances.
 */
async function buildExerciseProgressSummaries(
  tenantId: string,
  clientId: string,
  sessions: WorkoutSession[],
  prs: PersonalRecord[]
): Promise<ExerciseProgressSummary[]> {
  const prMap = new Map<string, PersonalRecord>();
  prs.forEach(pr => prMap.set(`${pr.exerciseId}_${pr.type}`, pr));

  // Collect all sets grouped by exerciseId across completed sessions
  // Sort sessions ascending by date
  const sortedSessions = [...sessions].sort((a, b) => {
    const dA = a.scheduledDate || a.completedAt || '';
    const dB = b.scheduledDate || b.completedAt || '';
    return dA.localeCompare(dB);
  });

  const exerciseMap = new Map<string, {
    exerciseName: string;
    entries: Array<{
      sessionId: string;
      workoutName: string;
      date: string;
      sets: any[];
      maxWeight?: number;
      maxReps?: number;
      maxDuration?: number;
      volume?: number;
      weightUnit?: string;
    }>;
  }>();

  for (const s of sortedSessions) {
    if (!s.completedSetsSummary || s.completedSetsSummary.length === 0) continue;
    const sessionDate = s.scheduledDate || (s.completedAt ? formatDateToYMD(new Date(s.completedAt)) : '2026-01-01');

    // Group sets in this session by exercise
    const setsByEx = new Map<string, any[]>();
    for (const item of s.completedSetsSummary) {
      const list = setsByEx.get(item.exerciseId) || [];
      list.push(item);
      setsByEx.set(item.exerciseId, list);
    }

    for (const [exId, sets] of setsByEx.entries()) {
      const exName = sets[0]?.exerciseName || 'Exercise';
      const existing = exerciseMap.get(exId) || { exerciseName: exName, entries: [] };

      let maxWeight = 0;
      let maxReps = 0;
      let maxDuration = 0;
      let volume = 0;
      let weightUnit = 'kg';

      sets.forEach(set => {
        if (set.weight && set.weight > maxWeight) maxWeight = set.weight;
        if (set.reps && set.reps > maxReps) maxReps = set.reps;
        if (set.durationSeconds && set.durationSeconds > maxDuration) maxDuration = set.durationSeconds;
        if (set.weight && set.reps) volume += set.weight * set.reps;
        if (set.weightUnit) weightUnit = set.weightUnit;
      });

      existing.entries.push({
        sessionId: s.id,
        workoutName: s.workoutName,
        date: sessionDate,
        sets,
        maxWeight: maxWeight > 0 ? maxWeight : undefined,
        maxReps: maxReps > 0 ? maxReps : undefined,
        maxDuration: maxDuration > 0 ? maxDuration : undefined,
        volume: volume > 0 ? Math.round(volume * 10) / 10 : undefined,
        weightUnit
      });

      exerciseMap.set(exId, existing);
    }
  }

  const summaries: ExerciseProgressSummary[] = [];

  for (const [exerciseId, data] of exerciseMap.entries()) {
    if (data.entries.length === 0) continue;

    const entries = data.entries;
    const totalSessions = entries.length;
    const latestEntry = entries[entries.length - 1];
    const previousEntry = entries.length >= 2 ? entries[entries.length - 2] : undefined;

    // Determine primary measurement type
    const hasWeights = entries.some(e => e.maxWeight && e.maxWeight > 0);
    const hasDurations = entries.some(e => e.maxDuration && e.maxDuration > 0);

    let measurementType: 'STRENGTH' | 'BODYWEIGHT_REPS' | 'TIMED' | 'AMRAP' = 'STRENGTH';
    let unit = 'kg';

    if (hasWeights) {
      measurementType = 'STRENGTH';
      unit = latestEntry.weightUnit || 'kg';
    } else if (hasDurations) {
      measurementType = 'TIMED';
      unit = 'sec';
    } else {
      measurementType = 'BODYWEIGHT_REPS';
      unit = 'reps';
    }

    // Extract latest, previous, and best values
    let latestVal = 0;
    let latestFormatted = '';
    let previousVal: number | undefined = undefined;
    let previousFormatted: string | undefined = undefined;
    let bestVal = 0;
    let bestFormatted = '';
    let bestDate = latestEntry.date;

    if (measurementType === 'STRENGTH') {
      latestVal = latestEntry.maxWeight || 0;
      latestFormatted = `${latestVal} ${unit} × ${latestEntry.sets[0]?.reps || 0} reps`;

      if (previousEntry && previousEntry.maxWeight) {
        previousVal = previousEntry.maxWeight;
        previousFormatted = `${previousVal} ${previousEntry.weightUnit || unit} × ${previousEntry.sets[0]?.reps || 0} reps`;
      }

      // Best across all entries
      for (const e of entries) {
        if (e.maxWeight && e.maxWeight >= bestVal) {
          bestVal = e.maxWeight;
          bestFormatted = `${bestVal} ${e.weightUnit || unit} × ${e.sets[0]?.reps || 0} reps`;
          bestDate = e.date;
        }
      }
    } else if (measurementType === 'TIMED') {
      latestVal = latestEntry.maxDuration || 0;
      const mins = Math.floor(latestVal / 60);
      const secs = latestVal % 60;
      latestFormatted = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

      if (previousEntry && previousEntry.maxDuration) {
        previousVal = previousEntry.maxDuration;
        const pM = Math.floor(previousVal / 60);
        const pS = previousVal % 60;
        previousFormatted = pM > 0 ? `${pM}m ${pS}s` : `${pS}s`;
      }

      for (const e of entries) {
        if (e.maxDuration && e.maxDuration >= bestVal) {
          bestVal = e.maxDuration;
          const bM = Math.floor(bestVal / 60);
          const bS = bestVal % 60;
          bestFormatted = bM > 0 ? `${bM}m ${bS}s` : `${bS}s`;
          bestDate = e.date;
        }
      }
    } else {
      // Reps
      latestVal = latestEntry.maxReps || 0;
      latestFormatted = `${latestVal} reps`;

      if (previousEntry && previousEntry.maxReps) {
        previousVal = previousEntry.maxReps;
        previousFormatted = `${previousVal} reps`;
      }

      for (const e of entries) {
        if (e.maxReps && e.maxReps >= bestVal) {
          bestVal = e.maxReps;
          bestFormatted = `${bestVal} reps`;
          bestDate = e.date;
        }
      }
    }

    // Determine trend
    let trend: 'INCREASING' | 'MAINTAINING' | 'DECREASING' | 'NEW' = 'NEW';
    let trendPercentage: number | undefined = undefined;
    let insightText = `Logged in ${totalSessions} training session${totalSessions === 1 ? '' : 's'}.`;

    if (previousVal !== undefined && previousVal > 0) {
      const diff = latestVal - previousVal;
      trendPercentage = Math.round((diff / previousVal) * 100);
      if (diff > 0) {
        trend = 'INCREASING';
        insightText = `Recent performance is +${trendPercentage}% higher than previous session.`;
      } else if (diff === 0) {
        trend = 'MAINTAINING';
        insightText = 'Performance held steady with previous workout.';
      } else {
        trend = 'DECREASING';
        insightText = `Performance slightly adjusted by ${trendPercentage}% from previous session.`;
      }
    } else {
      insightText = 'Initial performance baseline established.';
    }

    const history = entries.map(e => ({
      date: e.date,
      formattedDate: formatReadableDate(e.date),
      workoutName: e.workoutName,
      bestMetric: measurementType === 'STRENGTH' ? (e.maxWeight || 0) : measurementType === 'TIMED' ? (e.maxDuration || 0) : (e.maxReps || 0),
      bestMetricFormatted: measurementType === 'STRENGTH' ? `${e.maxWeight || 0} ${e.weightUnit || unit}` : measurementType === 'TIMED' ? `${e.maxDuration || 0}s` : `${e.maxReps || 0} reps`,
      volumeKg: e.volume,
      setsCount: e.sets.length
    }));

    summaries.push({
      exerciseId,
      exerciseName: data.exerciseName,
      category: 'Strength',
      measurementType,
      unit,
      totalSessions,
      latestValue: latestVal,
      latestFormatted,
      latestDate: latestEntry.date,
      previousValue: previousVal,
      previousFormatted,
      bestValue: bestVal,
      bestFormatted,
      bestDate,
      trend,
      trendPercentage,
      insightText,
      history
    });
  }

  // Sort summaries by totalSessions descending
  summaries.sort((a, b) => b.totalSessions - a.totalSessions);
  return summaries;
}

// ----------------------------------------------------------------------
// TRAINER & OWNER ANALYTICS
// ----------------------------------------------------------------------

/**
 * Fetches trainer performance and client engagement analytics.
 */
export async function fetchTrainerAnalytics(
  tenantId: string,
  trainerId: string,
  timeRange: TimeRange = '30D',
  timezone?: string
): Promise<TrainerAnalyticsData> {
  const now = new Date();
  const todayYMD = formatDateToYMD(now);

  // 1. Fetch trainer document
  let trainerName = 'Coach';
  try {
    const trSnap = await getDoc(doc(db, 'tenants', tenantId, 'trainers', trainerId));
    if (trSnap.exists()) {
      const d = trSnap.data();
      trainerName = `${d.firstName || ''} ${d.lastName || ''}`.trim() || 'Coach';
    }
  } catch (e) {
    console.warn('Could not load trainer doc:', e);
  }

  // 2. Fetch assigned clients
  const clientsSnap = await getDocs(
    query(collection(db, 'tenants', tenantId, 'clients'), where('trainerId', '==', trainerId))
  );

  const clientsList = clientsSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
  const activeClients = clientsList.filter(c => c.status === 'ACTIVE');

  // 3. For each client, fetch completed sessions and active assignment
  const roster: TrainerRosterClientSummary[] = [];
  const insights: CoachAttentionInsight[] = [];
  let totalWorkoutsCompleted = 0;
  let totalAdherenceSum = 0;
  let clientsWithAdherence = 0;

  for (const client of clientsList) {
    const clientFullName = `${client.firstName || ''} ${client.lastName || ''}`.trim() || 'Athlete';
    const initials = `${(client.firstName || 'A')[0]}${(client.lastName || '')[0] || ''}`.toUpperCase();

    // Fetch client sessions
    const sessions = await fetchCompletedClientSessions(tenantId, client.id);
    totalWorkoutsCompleted += sessions.length;

    // Latest workout
    const latestSession = sessions[0] || null;
    const lastWorkoutDate = latestSession ? (latestSession.scheduledDate || (latestSession.completedAt ? formatDateToYMD(new Date(latestSession.completedAt)) : undefined)) : undefined;

    let daysSinceLastWorkout: number | undefined = undefined;
    if (lastWorkoutDate) {
      const dLast = parseDateString(lastWorkoutDate);
      const dToday = parseDateString(todayYMD);
      daysSinceLastWorkout = Math.max(0, Math.floor((dToday.getTime() - dLast.getTime()) / (1000 * 60 * 60 * 24)));
    }

    // Check active assignment
    const assignments = await fetchClientAssignments(tenantId, client.id);
    const activeAssignment = assignments.find(a => a.status === 'ACTIVE');

    // Calculate adherence
    let completionRate7D: number | null = null;
    let completionRate30D: number | null = null;

    if (activeAssignment) {
      try {
        const scheduledData = await fetchClientAllScheduledWorkouts(tenantId, client.id, timezone);
        if (scheduledData.workouts.length > 0) {
          const sevenDaysAgo = getDateRangeStart('7D', timezone);
          const thirtyDaysAgo = getDateRangeStart('30D', timezone);

          const scheduled7 = scheduledData.workouts.filter(w => w.scheduledDate >= sevenDaysAgo && w.scheduledDate <= todayYMD).length;
          const completed7 = sessions.filter(s => {
            const d = s.scheduledDate || (s.completedAt ? formatDateToYMD(new Date(s.completedAt)) : '');
            return d >= sevenDaysAgo && d <= todayYMD;
          }).length;

          if (scheduled7 > 0) {
            completionRate7D = Math.min(100, Math.round((completed7 / scheduled7) * 100));
          }

          const scheduled30 = scheduledData.workouts.filter(w => w.scheduledDate >= thirtyDaysAgo && w.scheduledDate <= todayYMD).length;
          const completed30 = sessions.filter(s => {
            const d = s.scheduledDate || (s.completedAt ? formatDateToYMD(new Date(s.completedAt)) : '');
            return d >= thirtyDaysAgo && d <= todayYMD;
          }).length;

          if (scheduled30 > 0) {
            completionRate30D = Math.min(100, Math.round((completed30 / scheduled30) * 100));
            totalAdherenceSum += completionRate30D;
            clientsWithAdherence++;
          }
        }
      } catch (err) {
        console.warn(`Could not compute adherence for client ${client.id}:`, err);
      }
    }

    // PRs
    const prs = await fetchClientPersonalRecords(tenantId, client.id);

    // Activity Tag & Attention Insights
    let activityTag: 'ON_TRACK' | 'NEEDS_ATTENTION' | 'INACTIVE' | 'HIGH_PERFORMER' = 'ON_TRACK';

    // Inactivity Rule: Active program but no completed workout for >= 7 days
    if (activeAssignment && (daysSinceLastWorkout === undefined || daysSinceLastWorkout >= 7)) {
      activityTag = 'INACTIVE';
      insights.push({
        id: `inactivity_${client.id}`,
        type: 'INACTIVITY',
        severity: 'critical',
        clientId: client.id,
        clientName: clientFullName,
        trainerId,
        trainerName,
        title: 'Training activity has dropped recently',
        description: `${clientFullName} has an active program (${activeAssignment.programName}) but hasn't logged a workout in ${daysSinceLastWorkout !== undefined ? `${daysSinceLastWorkout} days` : 'this program'}.`,
        metricValue: daysSinceLastWorkout !== undefined ? `${daysSinceLastWorkout}d inactive` : 'No logs',
        timestamp: new Date().toISOString()
      });
    } else if (completionRate7D !== null && completionRate7D < 50) {
      activityTag = 'NEEDS_ATTENTION';
      insights.push({
        id: `adherence_${client.id}`,
        type: 'INACTIVITY',
        severity: 'warning',
        clientId: client.id,
        clientName: clientFullName,
        trainerId,
        trainerName,
        title: 'Adherence below target',
        description: `${clientFullName} has completed ${completionRate7D}% of scheduled workouts this week.`,
        metricValue: `${completionRate7D}% adherence`,
        timestamp: new Date().toISOString()
      });
    } else if (completionRate7D !== null && completionRate7D === 100) {
      activityTag = 'HIGH_PERFORMER';
      insights.push({
        id: `streak_${client.id}`,
        type: 'HIGH_ADHERENCE',
        severity: 'positive',
        clientId: client.id,
        clientName: clientFullName,
        trainerId,
        trainerName,
        title: '100% Weekly Adherence',
        description: `${clientFullName} completed all scheduled workouts this week with perfect consistency.`,
        metricValue: '100% 7-day rate',
        timestamp: new Date().toISOString()
      });
    }

    // Recent PR Rule (within last 7 days)
    const sevenDaysAgo = getDateRangeStart('7D', timezone);
    const recentPR = prs.find(p => p.achievedAt && p.achievedAt >= sevenDaysAgo);
    if (recentPR) {
      insights.push({
        id: `pr_${client.id}_${recentPR.id}`,
        type: 'NEW_PR',
        severity: 'positive',
        clientId: client.id,
        clientName: clientFullName,
        trainerId,
        trainerName,
        title: 'New Personal Record Achieved',
        description: `${clientFullName} set a new ${recentPR.type.replace('_', ' ').toLowerCase()} PR in ${recentPR.exerciseName} (${recentPR.value} ${recentPR.unit || ''}).`,
        metricValue: `🏆 ${recentPR.value} ${recentPR.unit || ''}`,
        timestamp: recentPR.achievedAt
      });
    }

    // Total volume
    const totalVolumeKg = sessions.reduce((sum, s) => sum + (s.totalVolumeKg || 0), 0);

    roster.push({
      clientId: client.id,
      clientName: clientFullName,
      email: client.email || '',
      avatarInitials: initials,
      status: client.status || 'ACTIVE',
      currentProgramName: activeAssignment?.programName,
      lastWorkoutDate: lastWorkoutDate ? formatReadableDate(lastWorkoutDate, timezone) : undefined,
      lastWorkoutName: latestSession?.workoutName,
      daysSinceLastWorkout,
      completionRate7D,
      completionRate30D,
      totalWorkoutsCompleted: sessions.length,
      totalVolumeKg: Math.round(totalVolumeKg),
      recentPRCount: prs.length,
      activityTag
    });
  }

  const averageCompletionRate = clientsWithAdherence > 0
    ? Math.round(totalAdherenceSum / clientsWithAdherence)
    : null;

  return {
    trainerId,
    trainerName,
    assignedClientsCount: clientsList.length,
    activeClientsCount: activeClients.length,
    totalWorkoutsCompleted,
    averageCompletionRate,
    roster,
    insights
  };
}

/**
 * Fetches gym-wide overview training analytics for the gym owner dashboard.
 */
export async function fetchGymOwnerOverviewAnalytics(
  tenantId: string,
  timeRange: TimeRange = '30D',
  timezone?: string
): Promise<GymOwnerOverviewAnalytics> {
  const now = new Date();
  const todayYMD = formatDateToYMD(now);
  const startBound = getDateRangeStart(timeRange, timezone);

  // 1. Fetch counts
  const [clientsSnap, trainersSnap, allSessionsSnap] = await Promise.all([
    getDocs(collection(db, 'tenants', tenantId, 'clients')),
    getDocs(collection(db, 'tenants', tenantId, 'trainers')),
    getDocs(
      query(
        collection(db, 'tenants', tenantId, 'workoutSessions'),
        where('status', '==', 'COMPLETED')
      )
    )
  ]);

  const totalClients = clientsSnap.docs.filter(d => d.data().status !== 'ARCHIVED').length;
  const activeClients = clientsSnap.docs.filter(d => d.data().status === 'ACTIVE').length;
  const totalTrainers = trainersSnap.docs.filter(d => d.data().status !== 'INACTIVE').length;

  const clientMap = new Map<string, string>();
  clientsSnap.docs.forEach(d => {
    const data = d.data();
    clientMap.set(d.id, `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Athlete');
  });

  const allSessions = allSessionsSnap.docs.map(d => ({ id: d.id, ...d.data() } as WorkoutSession));

  // Sort sessions by completedAt desc
  allSessions.sort((a, b) => {
    const tA = new Date(a.completedAt || a.updatedAt || 0).getTime();
    const tB = new Date(b.completedAt || b.updatedAt || 0).getTime();
    return tB - tA;
  });

  // Calculate This Week & This Month completed workouts
  const dayOfWeekIndex = (now.getDay() + 6) % 7;
  const thisWeekStart = new Date(now);
  thisWeekStart.setDate(now.getDate() - dayOfWeekIndex);
  const thisWeekStartYMD = formatDateToYMD(thisWeekStart);
  const thisMonthStartYMD = `${todayYMD.substring(0, 7)}-01`;

  let workoutsThisWeek = 0;
  let workoutsThisMonth = 0;

  allSessions.forEach(s => {
    const d = s.scheduledDate || (s.completedAt ? formatDateToYMD(new Date(s.completedAt)) : '');
    if (d >= thisWeekStartYMD && d <= todayYMD) workoutsThisWeek++;
    if (d >= thisMonthStartYMD && d <= todayYMD) workoutsThisMonth++;
  });

  // Filter sessions for chart
  const filteredSessions = allSessions.filter(s => {
    const d = s.scheduledDate || (s.completedAt ? formatDateToYMD(new Date(s.completedAt)) : '');
    return d >= startBound && d <= todayYMD;
  });

  const volumeOverTime = buildVolumeOverTimeData(filteredSessions, timeRange, todayYMD, timezone);

  // Recent Workouts Feed
  const recentWorkouts = allSessions.slice(0, 10).map(s => ({
    id: s.id,
    clientId: s.clientId,
    clientName: clientMap.get(s.clientId) || 'Gym Member',
    workoutName: s.workoutName || 'Workout Session',
    completedAt: s.completedAt || s.updatedAt || new Date().toISOString(),
    durationMinutes: s.durationMinutes || 45,
    volumeKg: s.totalVolumeKg || 0,
    prsCount: s.personalRecordsAchieved?.length || 0
  }));

  // Gym-wide attention insights
  const insights: CoachAttentionInsight[] = [];

  // Look for clients needing attention or high performers
  const clientLastSessionMap = new Map<string, string>();
  allSessions.forEach(s => {
    if (!clientLastSessionMap.has(s.clientId)) {
      clientLastSessionMap.set(s.clientId, s.scheduledDate || s.completedAt || '');
    }
  });

  // Check active clients inactivity
  for (const docSnap of clientsSnap.docs) {
    const cData = docSnap.data();
    if (cData.status === 'ACTIVE') {
      const lastDate = clientLastSessionMap.get(docSnap.id);
      const cName = `${cData.firstName || ''} ${cData.lastName || ''}`.trim() || 'Athlete';

      if (!lastDate) {
        insights.push({
          id: `no_workouts_${docSnap.id}`,
          type: 'INACTIVITY',
          severity: 'warning',
          clientId: docSnap.id,
          clientName: cName,
          title: 'Active client with no logged workouts',
          description: `${cName} is an active member but has not logged any workouts yet.`,
          timestamp: new Date().toISOString()
        });
      } else {
        const dLast = parseDateString(lastDate);
        const dToday = parseDateString(todayYMD);
        const days = Math.floor((dToday.getTime() - dLast.getTime()) / (1000 * 60 * 60 * 24));
        if (days >= 7) {
          insights.push({
            id: `inactive_${docSnap.id}`,
            type: 'INACTIVITY',
            severity: 'critical',
            clientId: docSnap.id,
            clientName: cName,
            title: 'Training lapse detected',
            description: `${cName} has not logged a workout in ${days} days.`,
            metricValue: `${days} days inactive`,
            timestamp: new Date().toISOString()
          });
        }
      }
    }
  }

  // Recent gym PRs
  allSessions.forEach(s => {
    if (s.personalRecordsAchieved && s.personalRecordsAchieved.length > 0) {
      s.personalRecordsAchieved.forEach(pr => {
        if (pr.achievedAt && pr.achievedAt >= getDateRangeStart('7D', timezone)) {
          insights.push({
            id: `pr_${pr.id}`,
            type: 'NEW_PR',
            severity: 'positive',
            clientId: s.clientId,
            clientName: clientMap.get(s.clientId) || 'Gym Member',
            title: 'New Gym Record',
            description: `${clientMap.get(s.clientId) || 'A member'} set a new PR in ${pr.exerciseName}: ${pr.value} ${pr.unit || ''}.`,
            metricValue: `🏆 ${pr.value} ${pr.unit || ''}`,
            timestamp: pr.achievedAt
          });
        }
      });
    }
  });

  return {
    totalClients,
    activeClients,
    totalTrainers,
    workoutsThisWeek,
    workoutsThisMonth,
    totalWorkoutsAllTime: allSessions.length,
    gymWideCompletionRate: null,
    volumeOverTime,
    insights: insights.slice(0, 15),
    recentWorkouts
  };
}
