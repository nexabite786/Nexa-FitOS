/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type WeightUnit = 'kg' | 'lbs';
export type MeasurementUnit = 'cm' | 'in';

export interface BodyWeightEntry {
  id: string;
  tenantId: string;
  clientId: string;
  weight: number;
  unit: WeightUnit;
  recordedAt: string; // ISO String or YYYY-MM-DD
  notes?: string;
  source?: 'CLIENT_MANUAL' | 'COACH_MANUAL' | 'DEVICE';
  createdAt: string;
  updatedAt?: string;
}

export interface BodyMeasurementEntry {
  id: string;
  tenantId: string;
  clientId: string;
  recordedAt: string; // ISO String or YYYY-MM-DD
  unit: MeasurementUnit;
  chest?: number;
  waist?: number;
  hips?: number;
  neck?: number;
  leftArm?: number;
  rightArm?: number;
  leftThigh?: number;
  rightThigh?: number;
  shoulders?: number;
  calves?: number;
  custom?: Array<{ name: string; value: number }>;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export type PhotoCategory = 'FRONT' | 'SIDE' | 'BACK' | 'CUSTOM';
export type PhotoVisibility = 'CLIENT_ONLY' | 'TRAINER_AND_OWNER';

export interface ProgressPhotoEntry {
  id: string;
  tenantId: string;
  clientId: string;
  photoUrl: string; // Storage URL or base64 data
  thumbnailUrl?: string;
  storagePath?: string;
  category: PhotoCategory;
  customTag?: string;
  visibility: PhotoVisibility;
  recordedAt: string; // ISO date
  weightSnapshot?: number;
  weightUnit?: WeightUnit;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export type GoalType = 'BODY_WEIGHT' | 'STRENGTH' | 'CONSISTENCY' | 'CUSTOM';
export type GoalStatus = 'ACTIVE' | 'COMPLETED' | 'PAUSED' | 'CANCELLED';

export interface GoalEntry {
  id: string;
  tenantId: string;
  clientId: string;
  type: GoalType;
  title: string;
  description?: string;
  targetValue: number;
  startValue: number;
  currentValue?: number;
  unit?: string;
  // Strength Goal specifics
  exerciseId?: string;
  exerciseName?: string;
  targetReps?: number;
  // Consistency Goal specifics
  weeklyTarget?: number; // e.g. 4 workouts per week
  // Dates
  startDate: string;
  targetDate?: string;
  status: GoalStatus;
  completedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export type MilestoneCategory =
  | 'WORKOUT_COUNT'
  | 'STREAK'
  | 'VOLUME'
  | 'PR_COUNT'
  | 'WEIGHT_DELTA'
  | 'CONSISTENCY'
  | 'TRANSFORMATION'
  | 'CUSTOM';

export interface MilestoneEntry {
  id: string;
  tenantId: string;
  clientId: string;
  category: MilestoneCategory;
  title: string;
  description: string;
  icon: string;
  tier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND';
  unlocked: boolean;
  unlockedAt?: string;
  progressValue: number;
  targetValue: number;
  metricLabel: string;
  createdAt?: string;
}

export interface ProgressSummaryStats {
  startingWeight?: { value: number; unit: WeightUnit; date: string };
  currentWeight?: { value: number; unit: WeightUnit; date: string };
  lowestWeight?: { value: number; unit: WeightUnit; date: string };
  highestWeight?: { value: number; unit: WeightUnit; date: string };
  totalWeightDelta: number; // positive = gain, negative = loss
  totalWeightDeltaPercent: number;
  recentWeightTrend: 'LOSING' | 'GAINING' | 'STABLE';
  trendRatePerWeek?: number;
  totalPhotosCount: number;
  activeGoalsCount: number;
  completedGoalsCount: number;
  unlockedMilestonesCount: number;
  totalMilestonesCount: number;
  latestMeasurement?: BodyMeasurementEntry;
}

export type ProgressTransformationSummary = ProgressSummaryStats;

export interface TimelineEventItem {
  id: string;
  type: 'WEIGHT' | 'MEASUREMENT' | 'PHOTO' | 'GOAL_COMPLETED' | 'MILESTONE_UNLOCKED' | 'WORKOUT_PR' | 'WORKOUT_COMPLETED';
  date: string;
  title: string;
  subtitle: string;
  details?: any;
  iconName: string;
  badgeColor?: string;
  actionUrl?: string;
}
