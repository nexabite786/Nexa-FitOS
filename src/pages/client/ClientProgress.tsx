/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  Award,
  Flame,
  Calendar as CalendarIcon,
  Dumbbell,
  CheckCircle2,
  Clock,
  ChevronRight,
  Filter,
  BarChart3,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Trophy,
  Sparkles,
  Info,
  CalendarDays,
  Target,
  Scale,
  Ruler,
  Camera,
  History
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { useAuthStore } from '../../store/authStore';
import { useTenantStore } from '../../store/tenantStore';
import { Button } from '../../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import {
  fetchClientComprehensiveAnalytics,
  TimeRange,
  ClientComprehensiveAnalytics,
  ExerciseProgressSummary
} from '../../lib/analyticsService';
import { fetchClientAllScheduledWorkouts } from '../../lib/workoutSessionService';
import { ClientScheduledWorkoutItem } from '../../types/workoutSession';
import {
  fetchClientWeightLogs,
  logBodyWeightEntry,
  updateBodyWeightEntry,
  deleteBodyWeightEntry,
  fetchClientMeasurements,
  logBodyMeasurementEntry,
  updateBodyMeasurementEntry,
  deleteBodyMeasurementEntry,
  fetchClientProgressPhotos,
  logProgressPhotoEntry,
  updateProgressPhotoEntry,
  deleteProgressPhotoEntry,
  fetchClientGoals,
  createGoalEntry,
  updateGoalEntry,
  deleteGoalEntry,
  fetchClientMilestones,
  fetchClientTransformationTimeline,
  calculateProgressSummary
} from '../../lib/progressService';
import { fetchAllExercises } from '../../lib/exerciseService';
import {
  BodyWeightEntry,
  BodyMeasurementEntry,
  ProgressPhotoEntry,
  GoalEntry,
  MilestoneEntry,
  TimelineEventItem,
  ProgressTransformationSummary
} from '../../types/progress';
import { Exercise } from '../../types/exercise';
import { WeightTracker } from '../../components/progress/WeightTracker';
import { MeasurementTracker } from '../../components/progress/MeasurementTracker';
import { ProgressPhotoGallery } from '../../components/progress/ProgressPhotoGallery';
import { GoalTracker } from '../../components/progress/GoalTracker';
import { MilestoneGrid } from '../../components/progress/MilestoneGrid';
import { ProgressTimeline } from '../../components/progress/ProgressTimeline';

type ClientTabType =
  | 'overview'
  | 'weight'
  | 'measurements'
  | 'photos'
  | 'goals'
  | 'milestones'
  | 'timeline'
  | 'exercises'
  | 'prs'
  | 'calendar';

export function ClientProgress() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile } = useAuthStore();
  const { tenantId, memberData } = useTenantStore();

  const previewClientId = searchParams.get('asClientId');
  const effectiveClientId = previewClientId || memberData?.clientId || profile?.clientId;

  const [timeRange, setTimeRange] = useState<TimeRange>('30D');
  const [unit, setUnit] = useState<'kg' | 'lbs'>('kg');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ClientComprehensiveAnalytics | null>(null);
  const [scheduledCalendarWorkouts, setScheduledCalendarWorkouts] = useState<ClientScheduledWorkoutItem[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<ExerciseProgressSummary | null>(null);
  const [activeTab, setActiveTab] = useState<ClientTabType>('overview');

  // Phase 8 Progress Data
  const [weightLogs, setWeightLogs] = useState<BodyWeightEntry[]>([]);
  const [measurements, setMeasurements] = useState<BodyMeasurementEntry[]>([]);
  const [photos, setPhotos] = useState<ProgressPhotoEntry[]>([]);
  const [goals, setGoals] = useState<GoalEntry[]>([]);
  const [milestones, setMilestones] = useState<MilestoneEntry[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEventItem[]>([]);
  const [progressSummary, setProgressSummary] = useState<ProgressTransformationSummary | null>(null);
  const [exerciseList, setExerciseList] = useState<Exercise[]>([]);

  const loadAllData = async () => {
    if (!tenantId || !effectiveClientId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [
        analyticsRes,
        scheduledRes,
        weightsRes,
        measurementsRes,
        photosRes,
        goalsRes,
        milestonesRes,
        timelineRes,
        exercisesRes
      ] = await Promise.all([
        fetchClientComprehensiveAnalytics(tenantId, effectiveClientId, timeRange),
        fetchClientAllScheduledWorkouts(tenantId, effectiveClientId),
        fetchClientWeightLogs(tenantId, effectiveClientId),
        fetchClientMeasurements(tenantId, effectiveClientId),
        fetchClientProgressPhotos(tenantId, effectiveClientId, false),
        fetchClientGoals(tenantId, effectiveClientId),
        fetchClientMilestones(tenantId, effectiveClientId),
        fetchClientTransformationTimeline(tenantId, effectiveClientId),
        fetchAllExercises(tenantId)
      ]);

      setData(analyticsRes);
      setScheduledCalendarWorkouts(scheduledRes.workouts);
      setWeightLogs(weightsRes);
      setMeasurements(measurementsRes);
      setPhotos(photosRes);
      setGoals(goalsRes);
      setMilestones(milestonesRes);
      setTimelineEvents(timelineRes);
      setExerciseList(exercisesRes);

      const summary = calculateProgressSummary(weightsRes, measurementsRes, photosRes, goalsRes, milestonesRes);
      setProgressSummary(summary);
    } catch (err) {
      console.error('Error loading client analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [tenantId, effectiveClientId, timeRange]);

  // Handler helpers for weight
  const handleAddWeight = async (payload: any) => {
    if (!tenantId || !effectiveClientId) return;
    await logBodyWeightEntry(tenantId, effectiveClientId, payload);
    const updated = await fetchClientWeightLogs(tenantId, effectiveClientId);
    setWeightLogs(updated);
    const tl = await fetchClientTransformationTimeline(tenantId, effectiveClientId);
    setTimelineEvents(tl);
  };

  const handleUpdateWeight = async (id: string, payload: any) => {
    if (!tenantId || !effectiveClientId) return;
    await updateBodyWeightEntry(tenantId, effectiveClientId, id, payload);
    const updated = await fetchClientWeightLogs(tenantId, effectiveClientId);
    setWeightLogs(updated);
  };

  const handleDeleteWeight = async (id: string) => {
    if (!tenantId || !effectiveClientId) return;
    await deleteBodyWeightEntry(tenantId, effectiveClientId, id);
    const updated = await fetchClientWeightLogs(tenantId, effectiveClientId);
    setWeightLogs(updated);
  };

  // Handler helpers for measurements
  const handleAddMeasurement = async (payload: any) => {
    if (!tenantId || !effectiveClientId) return;
    await logBodyMeasurementEntry(tenantId, effectiveClientId, payload);
    const updated = await fetchClientMeasurements(tenantId, effectiveClientId);
    setMeasurements(updated);
    const tl = await fetchClientTransformationTimeline(tenantId, effectiveClientId);
    setTimelineEvents(tl);
  };

  const handleUpdateMeasurement = async (id: string, payload: any) => {
    if (!tenantId || !effectiveClientId) return;
    await updateBodyMeasurementEntry(tenantId, effectiveClientId, id, payload);
    const updated = await fetchClientMeasurements(tenantId, effectiveClientId);
    setMeasurements(updated);
  };

  const handleDeleteMeasurement = async (id: string) => {
    if (!tenantId || !effectiveClientId) return;
    await deleteBodyMeasurementEntry(tenantId, effectiveClientId, id);
    const updated = await fetchClientMeasurements(tenantId, effectiveClientId);
    setMeasurements(updated);
  };

  // Handler helpers for photos
  const handleAddPhoto = async (payload: any) => {
    if (!tenantId || !effectiveClientId) return;
    await logProgressPhotoEntry(tenantId, effectiveClientId, payload);
    const updated = await fetchClientProgressPhotos(tenantId, effectiveClientId, false);
    setPhotos(updated);
    const tl = await fetchClientTransformationTimeline(tenantId, effectiveClientId);
    setTimelineEvents(tl);
  };

  const handleUpdatePhoto = async (id: string, payload: any) => {
    if (!tenantId || !effectiveClientId) return;
    await updateProgressPhotoEntry(tenantId, effectiveClientId, id, payload);
    const updated = await fetchClientProgressPhotos(tenantId, effectiveClientId, false);
    setPhotos(updated);
  };

  const handleDeletePhoto = async (id: string) => {
    if (!tenantId || !effectiveClientId) return;
    await deleteProgressPhotoEntry(tenantId, effectiveClientId, id);
    const updated = await fetchClientProgressPhotos(tenantId, effectiveClientId, false);
    setPhotos(updated);
  };

  // Handler helpers for goals
  const handleAddGoal = async (payload: any) => {
    if (!tenantId || !effectiveClientId) return;
    await createGoalEntry(tenantId, effectiveClientId, payload);
    const updated = await fetchClientGoals(tenantId, effectiveClientId);
    setGoals(updated);
  };

  const handleUpdateGoal = async (id: string, payload: any) => {
    if (!tenantId || !effectiveClientId) return;
    await updateGoalEntry(tenantId, effectiveClientId, id, payload);
    const updated = await fetchClientGoals(tenantId, effectiveClientId);
    setGoals(updated);
  };

  const handleDeleteGoal = async (id: string) => {
    if (!tenantId || !effectiveClientId) return;
    await deleteGoalEntry(tenantId, effectiveClientId, id);
    const updated = await fetchClientGoals(tenantId, effectiveClientId);
    setGoals(updated);
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6 animate-pulse">
        <div className="h-12 w-64 bg-card rounded-xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-28 bg-card rounded-2xl border border-border/40" />
          ))}
        </div>
        <div className="h-72 bg-card rounded-2xl border border-border/40" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="w-14 h-14 rounded-2xl bg-muted text-muted-foreground mx-auto flex items-center justify-center mb-4">
          <TrendingUp className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold font-display text-foreground">No Analytics Available</h2>
        <p className="text-sm text-muted-foreground mt-2 mb-6">
          Complete your first workout to begin tracking volume, consistency, and personal records.
        </p>
        <Button onClick={() => navigate('/client/dashboard')}>
          Go to Today's Workout
        </Button>
      </div>
    );
  }

  const latestWeightNum = weightLogs[weightLogs.length - 1]?.weight;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 md:py-8 space-y-8 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display tracking-tight text-foreground">
            Progress & Transformation
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track body weight, tape measurements, progress photos, goals, and training consistency.
          </p>
        </div>

        {/* Global Controls: Time Range Filter & Unit Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Time Range Selector */}
          <div className="inline-flex p-1 rounded-xl bg-card border border-border/50 text-xs font-semibold">
            {(['7D', '30D', '90D', '1Y', 'ALL'] as TimeRange[]).map(r => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`px-2.5 py-1.5 rounded-lg transition-colors ${
                  timeRange === r
                    ? 'bg-primary text-primary-foreground font-bold shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {r === '1Y' ? '1 Year' : r === 'ALL' ? 'All Time' : r}
              </button>
            ))}
          </div>

          {/* Unit Toggle */}
          <div className="inline-flex p-1 rounded-xl bg-card border border-border/50 text-xs font-semibold">
            <button
              onClick={() => setUnit('kg')}
              className={`px-2.5 py-1.5 rounded-lg transition-colors ${
                unit === 'kg'
                  ? 'bg-accent text-foreground font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              KG
            </button>
            <button
              onClick={() => setUnit('lbs')}
              className={`px-2.5 py-1.5 rounded-lg transition-colors ${
                unit === 'lbs'
                  ? 'bg-accent text-foreground font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              LBS
            </button>
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs Bar */}
      <div className="border-b border-border/40 overflow-x-auto">
        <nav className="flex space-x-2 sm:space-x-4 pb-2">
          {[
            { id: 'overview', label: 'Workout Trends', icon: TrendingUp },
            { id: 'weight', label: `Weight (${weightLogs.length})`, icon: Scale },
            { id: 'measurements', label: `Landmarks (${measurements.length})`, icon: Ruler },
            { id: 'photos', label: `Photos (${photos.length})`, icon: Camera },
            { id: 'goals', label: `Goals (${goals.length})`, icon: Target },
            { id: 'milestones', label: `Badges (${milestones.filter(m => m.unlocked).length})`, icon: Trophy },
            { id: 'timeline', label: 'Timeline', icon: History },
            { id: 'exercises', label: `Exercises (${data.exerciseProgressList.length})`, icon: Dumbbell },
            { id: 'prs', label: `PRs (${data.personalRecords.length})`, icon: Award },
            { id: 'calendar', label: 'Calendar', icon: CalendarDays }
          ].map(tab => {
            const Icon = tab.icon;
            const isSel = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as ClientTabType)}
                className={`pb-2.5 px-2 text-xs sm:text-sm font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  isSel
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* TAB 1: WORKOUT OVERVIEW & TRENDS */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Primary KPI Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
            {/* Workouts */}
            <Card className="bg-card/70 border-border/60 backdrop-blur">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center justify-between text-muted-foreground mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Workouts</span>
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                </div>
                <div className="text-2xl sm:text-3xl font-bold font-display text-foreground">
                  {data.totalWorkouts}
                </div>
                <div className="text-[11px] text-muted-foreground mt-1">
                  {data.activeTrainingDaysCount} active days
                </div>
              </CardContent>
            </Card>

            {/* Total Sets */}
            <Card className="bg-card/70 border-border/60 backdrop-blur">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center justify-between text-muted-foreground mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Total Sets</span>
                  <Layers className="w-4 h-4 text-blue-400" />
                </div>
                <div className="text-2xl sm:text-3xl font-bold font-display text-foreground">
                  {data.totalSets}
                </div>
                <div className="text-[11px] text-muted-foreground mt-1">
                  completed sets
                </div>
              </CardContent>
            </Card>

            {/* Training Volume */}
            <Card className="bg-card/70 border-border/60 backdrop-blur">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center justify-between text-muted-foreground mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Total Volume</span>
                  <Dumbbell className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-2xl sm:text-3xl font-bold font-display text-foreground">
                  {unit === 'kg' ? data.totalVolumeKg.toLocaleString() : data.totalVolumeLbs.toLocaleString()}
                  <span className="text-xs font-normal text-muted-foreground ml-1">{unit}</span>
                </div>
                <div className="text-[11px] text-muted-foreground mt-1">
                  weighted load
                </div>
              </CardContent>
            </Card>

            {/* Streaks */}
            <Card className="bg-card/70 border-border/60 backdrop-blur">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center justify-between text-muted-foreground mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Streak</span>
                  <Flame className="w-4 h-4 text-orange-500" />
                </div>
                <div className="text-2xl sm:text-3xl font-bold font-display text-foreground">
                  {data.currentStreakDays} <span className="text-xs font-normal text-muted-foreground">days</span>
                </div>
                <div className="text-[11px] text-muted-foreground mt-1">
                  Best: {data.longestStreakDays} days
                </div>
              </CardContent>
            </Card>

            {/* PRs Achieved */}
            <Card className="bg-card/70 border-border/60 backdrop-blur col-span-2 md:col-span-1">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center justify-between text-muted-foreground mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Personal Records</span>
                  <Trophy className="w-4 h-4 text-yellow-400" />
                </div>
                <div className="text-2xl sm:text-3xl font-bold font-display text-foreground">
                  {data.totalPRsCount}
                </div>
                <div className="text-[11px] text-muted-foreground mt-1">
                  established records
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Consistency & Adherence Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold font-display text-foreground">
                  Workout Consistency & Adherence
                </h3>
                <p className="text-xs text-muted-foreground">
                  Scheduled versus completed training sessions.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                data.consistency.thisWeek,
                data.consistency.thisMonth,
                data.consistency.last30Days,
                data.consistency.last90Days
              ].map(item => {
                return (
                  <div
                    key={item.periodKey}
                    className="p-4 rounded-2xl bg-card border border-border/50 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        {item.periodName}
                      </span>
                      {item.hasSchedule && item.completionRate !== null && (
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            item.completionRate >= 80
                              ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                              : item.completionRate >= 50
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-red-500/10 text-red-400 border border-red-500/20'
                          }`}
                        >
                          {item.completionRate}%
                        </span>
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="text-lg font-bold font-display text-foreground">
                        {item.completedCount} <span className="text-xs font-normal text-muted-foreground">completed</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {item.hasSchedule ? (
                          <span>{item.scheduledCount} scheduled workouts</span>
                        ) : (
                          <span className="italic text-muted-foreground/80">No scheduled workouts yet.</span>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    {item.hasSchedule && item.completionRate !== null && (
                      <div className="w-full h-1.5 bg-accent/60 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-500"
                          style={{ width: `${item.completionRate}%` }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Volume Over Time Chart */}
          <Card className="bg-card border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-base font-bold font-display text-foreground">
                  Training Volume Over Time
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Total accumulated workload ({unit}) per training session.
                </p>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {data.volumeOverTime.length < 2 ? (
                <div className="py-16 text-center space-y-2">
                  <BarChart3 className="w-8 h-8 text-muted-foreground mx-auto" />
                  <p className="text-sm font-semibold text-foreground">
                    Complete more workouts to see your training trends.
                  </p>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    Once you log at least two workout sessions, your volume progression curve will render here automatically.
                  </p>
                </div>
              ) : (
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={data.volumeOverTime}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="volumeGradClient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#E5A93C" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#E5A93C" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                      <XAxis
                        dataKey="label"
                        stroke="#71717a"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke="#71717a"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={v => `${v >= 1000 ? `${Math.round(v / 1000)}k` : v}`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#18181b',
                          borderColor: '#27272a',
                          borderRadius: '0.75rem',
                          color: '#fff',
                          fontSize: '12px'
                        }}
                        formatter={(val: any) => [
                          `${Number(val).toLocaleString()} ${unit}`,
                          'Volume'
                        ]}
                        labelFormatter={(label, items) => {
                          const item = items?.[0]?.payload;
                          return `${label} ${item?.workoutNames?.length ? `· ${item.workoutNames.join(', ')}` : ''}`;
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey={unit === 'kg' ? 'volumeKg' : 'volumeLbs'}
                        stroke="#E5A93C"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#volumeGradClient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 2: WEIGHT TRACKER */}
      {activeTab === 'weight' && (
        <WeightTracker
          weights={weightLogs}
          onAddWeight={handleAddWeight}
          onUpdateWeight={handleUpdateWeight}
          onDeleteWeight={handleDeleteWeight}
          isCoachView={false}
        />
      )}

      {/* TAB 3: MEASUREMENTS */}
      {activeTab === 'measurements' && (
        <MeasurementTracker
          measurements={measurements}
          onAddMeasurement={handleAddMeasurement}
          onUpdateMeasurement={handleUpdateMeasurement}
          onDeleteMeasurement={handleDeleteMeasurement}
          isCoachView={false}
        />
      )}

      {/* TAB 4: PROGRESS PHOTOS */}
      {activeTab === 'photos' && (
        <ProgressPhotoGallery
          photos={photos}
          onAddPhoto={handleAddPhoto}
          onUpdatePhoto={handleUpdatePhoto}
          onDeletePhoto={handleDeletePhoto}
          latestWeight={latestWeightNum}
          isCoachView={false}
        />
      )}

      {/* TAB 5: GOALS */}
      {activeTab === 'goals' && (
        <GoalTracker
          goals={goals}
          exercises={exerciseList.map(e => ({ id: e.id, name: e.name }))}
          currentWeight={latestWeightNum}
          onAddGoal={handleAddGoal}
          onUpdateGoal={handleUpdateGoal}
          onDeleteGoal={handleDeleteGoal}
          isCoachView={false}
        />
      )}

      {/* TAB 6: BADGES & MILESTONES */}
      {activeTab === 'milestones' && (
        <MilestoneGrid milestones={milestones} isCoachView={false} />
      )}

      {/* TAB 7: TIMELINE */}
      {activeTab === 'timeline' && (
        <ProgressTimeline events={timelineEvents} isCoachView={false} />
      )}

      {/* TAB 8: EXERCISE PROGRESSION */}
      {activeTab === 'exercises' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold font-display text-foreground">
                Exercise Progression History
              </h3>
              <p className="text-xs text-muted-foreground">
                Historical performance comparisons for prescribed exercises.
              </p>
            </div>
          </div>

          {data.exerciseProgressList.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-card border border-border/50 space-y-3">
              <Dumbbell className="w-10 h-10 text-muted-foreground mx-auto" />
              <h4 className="text-base font-bold text-foreground">No Exercise History Yet</h4>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Completed sets and workouts will populate exercise performance comparisons here automatically.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.exerciseProgressList.map(ex => {
                return (
                  <div
                    key={ex.exerciseId}
                    onClick={() => setSelectedExercise(ex)}
                    className="p-5 rounded-2xl bg-card border border-border/60 hover:border-border transition-all cursor-pointer space-y-4 shadow-sm group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-bold text-foreground group-hover:text-primary transition-colors">
                            {ex.exerciseName}
                          </h4>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent text-muted-foreground font-semibold uppercase">
                            {ex.measurementType.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {ex.totalSessions} session{ex.totalSessions === 1 ? '' : 's'} recorded
                        </p>
                      </div>

                      {/* Trend Badge */}
                      {ex.trend === 'INCREASING' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-green-500/10 text-green-400 border border-green-500/20">
                          <ArrowUpRight className="w-3.5 h-3.5" />
                          {ex.trendPercentage ? `+${ex.trendPercentage}%` : 'Higher'}
                        </span>
                      ) : ex.trend === 'DECREASING' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <ArrowDownRight className="w-3.5 h-3.5" />
                          {ex.trendPercentage ? `${ex.trendPercentage}%` : 'Adjusted'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          <Minus className="w-3.5 h-3.5" /> Steady
                        </span>
                      )}
                    </div>

                    {/* Comparisons Grid */}
                    <div className="grid grid-cols-3 gap-2 pt-1">
                      <div className="p-2.5 rounded-xl bg-background/50 border border-border/40">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                          Previous
                        </span>
                        <span className="text-xs font-semibold text-foreground truncate block mt-0.5">
                          {ex.previousFormatted || '—'}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-background/50 border border-border/40">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                          Latest
                        </span>
                        <span className="text-xs font-bold text-primary truncate block mt-0.5">
                          {ex.latestFormatted}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-background/50 border border-border/40">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                          Best
                        </span>
                        <span className="text-xs font-bold text-yellow-400 truncate block mt-0.5">
                          {ex.bestFormatted}
                        </span>
                      </div>
                    </div>

                    {/* Insight text */}
                    <div className="text-xs text-muted-foreground flex items-center justify-between pt-1 border-t border-border/30">
                      <span className="truncate max-w-[85%]">{ex.insightText}</span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 9: PERSONAL RECORDS */}
      {activeTab === 'prs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold font-display text-foreground">
                Personal Records (PRs)
              </h3>
              <p className="text-xs text-muted-foreground">
                Verified milestones achieved during logged training sessions.
              </p>
            </div>
          </div>

          {data.personalRecords.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-card border border-border/50 space-y-3">
              <Trophy className="w-10 h-10 text-muted-foreground mx-auto" />
              <h4 className="text-base font-bold text-foreground">No Personal Records Yet</h4>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Log completed sets to establish personal records in Heaviest Weight, Best Reps, Highest Volume, and Longest Duration.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.personalRecords.map(pr => {
                const dateStr = pr.achievedAt
                  ? new Date(pr.achievedAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })
                  : 'Recent';

                return (
                  <div
                    key={pr.id}
                    className="p-5 rounded-2xl bg-card border border-border/60 space-y-3 shadow-sm hover:border-yellow-500/30 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="w-10 h-10 rounded-xl bg-yellow-500/10 text-yellow-400 flex items-center justify-center font-bold text-lg">
                        🏆
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-accent text-foreground">
                        {pr.type.replace('_', ' ')}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-base font-bold text-foreground">
                        {pr.exerciseName}
                      </h4>
                      <div className="text-xl font-bold font-display text-yellow-400 mt-1">
                        {pr.value} {pr.unit || ''}
                        {pr.reps && pr.type === 'HEAVIEST_WEIGHT' && (
                          <span className="text-xs font-normal text-muted-foreground ml-1.5">
                            × {pr.reps} reps
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-border/40 text-xs text-muted-foreground flex items-center justify-between">
                      <span>{pr.workoutName || 'Workout Session'}</span>
                      <span>{dateStr}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 10: TRAINING CALENDAR */}
      {activeTab === 'calendar' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold font-display text-foreground">
                Training Calendar History
              </h3>
              <p className="text-xs text-muted-foreground">
                Scheduled vs completed workouts across your active program schedule.
              </p>
            </div>
          </div>

          {scheduledCalendarWorkouts.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-card border border-border/50 space-y-3">
              <CalendarIcon className="w-10 h-10 text-muted-foreground mx-auto" />
              <h4 className="text-base font-bold text-foreground">No Program Schedule Found</h4>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Once assigned to an active training program, your calendar matrix of scheduled and completed workouts will render here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {scheduledCalendarWorkouts.map((item, idx) => {
                const isCompleted = item.status === 'COMPLETED';
                const isToday = item.status === 'TODAY';
                const isMissed = item.status === 'MISSED';

                return (
                  <div
                    key={`${item.workoutId}_${item.scheduledDate}_${idx}`}
                    className={`p-4 rounded-2xl border space-y-2 transition-all ${
                      isCompleted
                        ? 'bg-green-500/5 border-green-500/30'
                        : isToday
                        ? 'bg-primary/10 border-primary/40 ring-1 ring-primary/20'
                        : isMissed
                        ? 'bg-red-500/5 border-red-500/30'
                        : 'bg-card border-border/50'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-muted-foreground">
                        {item.dayOfWeek}, {item.formattedDate}
                      </span>
                      {isCompleted ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500/10 text-green-400 border border-green-500/20 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Completed
                        </span>
                      ) : isToday ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/20 text-primary border border-primary/30">
                          Today
                        </span>
                      ) : isMissed ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20">
                          Missed
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-accent text-muted-foreground">
                          Upcoming
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm font-bold text-foreground">
                      {item.workoutName}
                    </h4>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1 border-t border-border/30">
                      <span>{item.exerciseCount} exercises</span>
                      <span>·</span>
                      <span>{item.totalSets} sets</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Drill-Down Modal for Selected Exercise */}
      {selectedExercise && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl max-w-lg w-full space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                  Exercise Progression
                </span>
                <h3 className="text-xl font-bold font-display text-white">
                  {selectedExercise.exerciseName}
                </h3>
              </div>
              <button
                onClick={() => setSelectedExercise(null)}
                className="text-zinc-400 hover:text-white text-sm font-semibold p-1"
              >
                ✕
              </button>
            </div>

            {/* Performance Stats */}
            <div className="grid grid-cols-3 gap-2">
              <div className="p-3 rounded-xl bg-zinc-800/60 border border-zinc-700/50">
                <span className="text-[10px] uppercase font-bold text-zinc-400 block">Previous</span>
                <span className="text-xs font-semibold text-zinc-200 block mt-0.5">
                  {selectedExercise.previousFormatted || '—'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-800/60 border border-zinc-700/50">
                <span className="text-[10px] uppercase font-bold text-zinc-400 block">Latest</span>
                <span className="text-xs font-bold text-amber-400 block mt-0.5">
                  {selectedExercise.latestFormatted}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-800/60 border border-zinc-700/50">
                <span className="text-[10px] uppercase font-bold text-zinc-400 block">All-Time Best</span>
                <span className="text-xs font-bold text-yellow-400 block mt-0.5">
                  {selectedExercise.bestFormatted}
                </span>
              </div>
            </div>

            {/* Insight Note */}
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2">
              <Sparkles className="w-4 h-4 flex-shrink-0 text-amber-400" />
              <span>{selectedExercise.insightText}</span>
            </div>

            {/* Historical Session List */}
            <div className="space-y-2 pt-2">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Session History ({selectedExercise.history.length})
              </span>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {selectedExercise.history.map((h, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl bg-zinc-800/40 border border-zinc-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-semibold text-white block">{h.workoutName}</span>
                      <span className="text-[11px] text-zinc-400">{h.formattedDate}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-amber-400 block">{h.bestMetricFormatted}</span>
                      <span className="text-[11px] text-zinc-400">{h.setsCount} sets completed</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Button
              className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs h-10"
              onClick={() => setSelectedExercise(null)}
            >
              Close Details
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
