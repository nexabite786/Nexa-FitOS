/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Award,
  Flame,
  Calendar as CalendarIcon,
  Dumbbell,
  CheckCircle2,
  Clock,
  ChevronRight,
  BarChart3,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Trophy,
  Sparkles,
  CalendarDays,
  Scale,
  Ruler,
  Camera,
  Target,
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
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
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
import { WeightTracker } from '../progress/WeightTracker';
import { MeasurementTracker } from '../progress/MeasurementTracker';
import { ProgressPhotoGallery } from '../progress/ProgressPhotoGallery';
import { GoalTracker } from '../progress/GoalTracker';
import { MilestoneGrid } from '../progress/MilestoneGrid';
import { ProgressTimeline } from '../progress/ProgressTimeline';

interface ClientProgressViewProps {
  tenantId: string;
  clientId: string;
  clientName?: string;
  isCoachView?: boolean;
}

type TabType =
  | 'overview'
  | 'exercises'
  | 'prs'
  | 'weight'
  | 'measurements'
  | 'photos'
  | 'goals'
  | 'milestones'
  | 'timeline'
  | 'calendar';

export function ClientProgressView({
  tenantId,
  clientId,
  clientName = 'Athlete',
  isCoachView = true
}: ClientProgressViewProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('30D');
  const [unit, setUnit] = useState<'kg' | 'lbs'>('kg');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Analytics & Scheduled
  const [data, setData] = useState<ClientComprehensiveAnalytics | null>(null);
  const [scheduledCalendarWorkouts, setScheduledCalendarWorkouts] = useState<ClientScheduledWorkoutItem[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<ExerciseProgressSummary | null>(null);

  // Phase 8 Progress State
  const [weightLogs, setWeightLogs] = useState<BodyWeightEntry[]>([]);
  const [measurements, setMeasurements] = useState<BodyMeasurementEntry[]>([]);
  const [photos, setPhotos] = useState<ProgressPhotoEntry[]>([]);
  const [goals, setGoals] = useState<GoalEntry[]>([]);
  const [milestones, setMilestones] = useState<MilestoneEntry[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEventItem[]>([]);
  const [progressSummary, setProgressSummary] = useState<ProgressTransformationSummary | null>(null);
  const [exerciseList, setExerciseList] = useState<Exercise[]>([]);

  const loadAllProgressData = async () => {
    if (!tenantId || !clientId) return;
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
        fetchClientComprehensiveAnalytics(tenantId, clientId, timeRange),
        fetchClientAllScheduledWorkouts(tenantId, clientId),
        fetchClientWeightLogs(tenantId, clientId),
        fetchClientMeasurements(tenantId, clientId),
        fetchClientProgressPhotos(tenantId, clientId, isCoachView),
        fetchClientGoals(tenantId, clientId),
        fetchClientMilestones(tenantId, clientId),
        fetchClientTransformationTimeline(tenantId, clientId),
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
      console.error('Error loading client analytics & progress:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllProgressData();
  }, [tenantId, clientId, timeRange, isCoachView]);

  // Handler helpers for weight
  const handleAddWeight = async (payload: any) => {
    if (!tenantId || !clientId) return;
    await logBodyWeightEntry(tenantId, clientId, payload);
    const updated = await fetchClientWeightLogs(tenantId, clientId);
    setWeightLogs(updated);
    const tl = await fetchClientTransformationTimeline(tenantId, clientId);
    setTimelineEvents(tl);
  };

  const handleUpdateWeight = async (id: string, payload: any) => {
    if (!tenantId || !clientId) return;
    await updateBodyWeightEntry(tenantId, clientId, id, payload);
    const updated = await fetchClientWeightLogs(tenantId, clientId);
    setWeightLogs(updated);
  };

  const handleDeleteWeight = async (id: string) => {
    if (!tenantId || !clientId) return;
    await deleteBodyWeightEntry(tenantId, clientId, id);
    const updated = await fetchClientWeightLogs(tenantId, clientId);
    setWeightLogs(updated);
  };

  // Handler helpers for measurements
  const handleAddMeasurement = async (payload: any) => {
    if (!tenantId || !clientId) return;
    await logBodyMeasurementEntry(tenantId, clientId, payload);
    const updated = await fetchClientMeasurements(tenantId, clientId);
    setMeasurements(updated);
    const tl = await fetchClientTransformationTimeline(tenantId, clientId);
    setTimelineEvents(tl);
  };

  const handleUpdateMeasurement = async (id: string, payload: any) => {
    if (!tenantId || !clientId) return;
    await updateBodyMeasurementEntry(tenantId, clientId, id, payload);
    const updated = await fetchClientMeasurements(tenantId, clientId);
    setMeasurements(updated);
  };

  const handleDeleteMeasurement = async (id: string) => {
    if (!tenantId || !clientId) return;
    await deleteBodyMeasurementEntry(tenantId, clientId, id);
    const updated = await fetchClientMeasurements(tenantId, clientId);
    setMeasurements(updated);
  };

  // Handler helpers for photos
  const handleAddPhoto = async (payload: any) => {
    if (!tenantId || !clientId) return;
    await logProgressPhotoEntry(tenantId, clientId, payload);
    const updated = await fetchClientProgressPhotos(tenantId, clientId, isCoachView);
    setPhotos(updated);
    const tl = await fetchClientTransformationTimeline(tenantId, clientId);
    setTimelineEvents(tl);
  };

  const handleUpdatePhoto = async (id: string, payload: any) => {
    if (!tenantId || !clientId) return;
    await updateProgressPhotoEntry(tenantId, clientId, id, payload);
    const updated = await fetchClientProgressPhotos(tenantId, clientId, isCoachView);
    setPhotos(updated);
  };

  const handleDeletePhoto = async (id: string) => {
    if (!tenantId || !clientId) return;
    await deleteProgressPhotoEntry(tenantId, clientId, id);
    const updated = await fetchClientProgressPhotos(tenantId, clientId, isCoachView);
    setPhotos(updated);
  };

  // Handler helpers for goals
  const handleAddGoal = async (payload: any) => {
    if (!tenantId || !clientId) return;
    await createGoalEntry(tenantId, clientId, payload);
    const updated = await fetchClientGoals(tenantId, clientId);
    setGoals(updated);
  };

  const handleUpdateGoal = async (id: string, payload: any) => {
    if (!tenantId || !clientId) return;
    await updateGoalEntry(tenantId, clientId, id, payload);
    const updated = await fetchClientGoals(tenantId, clientId);
    setGoals(updated);
  };

  const handleDeleteGoal = async (id: string) => {
    if (!tenantId || !clientId) return;
    await deleteGoalEntry(tenantId, clientId, id);
    const updated = await fetchClientGoals(tenantId, clientId);
    setGoals(updated);
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
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
      <div className="p-8 text-center rounded-2xl bg-card border border-border/50">
        <p className="text-sm text-muted-foreground">No training analytics available for this athlete yet.</p>
      </div>
    );
  }

  const latestWeightNum = weightLogs[weightLogs.length - 1]?.weight;

  return (
    <div className="space-y-6">
      {/* Top Filter & Navigation Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
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

        {/* Tab Selector Buttons */}
        <div className="flex items-center gap-1.5 border-b sm:border-b-0 border-border/40 pb-2 sm:pb-0 overflow-x-auto">
          {[
            { id: 'overview', label: 'Workout Overview', icon: TrendingUp },
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
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  isSel
                    ? 'bg-primary text-primary-foreground font-bold shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/20'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: WORKOUT OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* KPI Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
            <Card className="bg-card/70 border-border/60">
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

            <Card className="bg-card/70 border-border/60">
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

            <Card className="bg-card/70 border-border/60">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center justify-between text-muted-foreground mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Volume</span>
                  <Dumbbell className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-2xl sm:text-3xl font-bold font-display text-foreground">
                  {unit === 'kg' ? data.totalVolumeKg.toLocaleString() : data.totalVolumeLbs.toLocaleString()}
                  <span className="text-xs font-normal text-muted-foreground ml-1">{unit}</span>
                </div>
                <div className="text-[11px] text-muted-foreground mt-1">
                  total weighted load
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/70 border-border/60">
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

            <Card className="bg-card/70 border-border/60 col-span-2 md:col-span-1">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center justify-between text-muted-foreground mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Records</span>
                  <Trophy className="w-4 h-4 text-yellow-400" />
                </div>
                <div className="text-2xl sm:text-3xl font-bold font-display text-foreground">
                  {data.totalPRsCount}
                </div>
                <div className="text-[11px] text-muted-foreground mt-1">
                  PRs verified
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Consistency Matrix */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              data.consistency.thisWeek,
              data.consistency.thisMonth,
              data.consistency.last30Days,
              data.consistency.last90Days
            ].map(item => (
              <div
                key={item.periodKey}
                className="p-4 rounded-2xl bg-card border border-border/50 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {item.periodName}
                  </span>
                  {item.hasSchedule && item.completionRate !== null && (
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        item.completionRate >= 80
                          ? 'bg-green-500/10 text-green-400'
                          : item.completionRate >= 50
                          ? 'bg-amber-500/10 text-amber-400'
                          : 'bg-red-500/10 text-red-400'
                      }`}
                    >
                      {item.completionRate}%
                    </span>
                  )}
                </div>

                <div className="text-lg font-bold font-display text-foreground">
                  {item.completedCount} <span className="text-xs font-normal text-muted-foreground">completed</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {item.hasSchedule ? `${item.scheduledCount} scheduled` : 'No scheduled workouts'}
                </div>
              </div>
            ))}
          </div>

          {/* Volume Chart */}
          <Card className="bg-card border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold font-display text-foreground">
                Volume Over Time ({unit})
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {data.volumeOverTime.length < 2 ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  Complete more workouts to see training trends for this athlete.
                </div>
              ) : (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={data.volumeOverTime}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="volGradView" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#E5A93C" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#E5A93C" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                      <XAxis dataKey="label" stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#18181b',
                          borderColor: '#27272a',
                          borderRadius: '0.75rem',
                          color: '#fff',
                          fontSize: '12px'
                        }}
                        formatter={(val: any) => [`${Number(val).toLocaleString()} ${unit}`, 'Volume']}
                      />
                      <Area
                        type="monotone"
                        dataKey={unit === 'kg' ? 'volumeKg' : 'volumeLbs'}
                        stroke="#E5A93C"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#volGradView)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB: BODY WEIGHT TRACKER */}
      {activeTab === 'weight' && (
        <WeightTracker
          weights={weightLogs}
          onAddWeight={handleAddWeight}
          onUpdateWeight={handleUpdateWeight}
          onDeleteWeight={handleDeleteWeight}
          isCoachView={isCoachView}
        />
      )}

      {/* TAB: MEASUREMENTS TRACKER */}
      {activeTab === 'measurements' && (
        <MeasurementTracker
          measurements={measurements}
          onAddMeasurement={handleAddMeasurement}
          onUpdateMeasurement={handleUpdateMeasurement}
          onDeleteMeasurement={handleDeleteMeasurement}
          isCoachView={isCoachView}
        />
      )}

      {/* TAB: PROGRESS PHOTOS */}
      {activeTab === 'photos' && (
        <ProgressPhotoGallery
          photos={photos}
          onAddPhoto={handleAddPhoto}
          onUpdatePhoto={handleUpdatePhoto}
          onDeletePhoto={handleDeletePhoto}
          latestWeight={latestWeightNum}
          isCoachView={isCoachView}
        />
      )}

      {/* TAB: GOAL TRACKER */}
      {activeTab === 'goals' && (
        <GoalTracker
          goals={goals}
          exercises={exerciseList.map(e => ({ id: e.id, name: e.name }))}
          currentWeight={latestWeightNum}
          onAddGoal={handleAddGoal}
          onUpdateGoal={handleUpdateGoal}
          onDeleteGoal={handleDeleteGoal}
          isCoachView={isCoachView}
        />
      )}

      {/* TAB: ACHIEVEMENTS & MILESTONES */}
      {activeTab === 'milestones' && (
        <MilestoneGrid milestones={milestones} isCoachView={isCoachView} />
      )}

      {/* TAB: TRANSFORMATION TIMELINE */}
      {activeTab === 'timeline' && (
        <ProgressTimeline events={timelineEvents} isCoachView={isCoachView} />
      )}

      {/* TAB: EXERCISES */}
      {activeTab === 'exercises' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.exerciseProgressList.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-card border border-border/50 text-xs text-muted-foreground col-span-2">
              No exercise progression records found.
            </div>
          ) : (
            data.exerciseProgressList.map(ex => (
              <div
                key={ex.exerciseId}
                onClick={() => setSelectedExercise(ex)}
                className="p-4 rounded-2xl bg-card border border-border/60 hover:border-border transition-all cursor-pointer space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-foreground">{ex.exerciseName}</h4>
                    <span className="text-[10px] text-muted-foreground">{ex.totalSessions} sessions</span>
                  </div>
                  <span className="text-xs font-bold text-amber-400">
                    {ex.latestFormatted}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs pt-1 border-t border-border/30">
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Previous</span>
                    <span className="text-foreground">{ex.previousFormatted || '—'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Latest</span>
                    <span className="text-primary font-bold">{ex.latestFormatted}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Best</span>
                    <span className="text-yellow-400 font-bold">{ex.bestFormatted}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB: PRs */}
      {activeTab === 'prs' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {data.personalRecords.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-card border border-border/50 text-xs text-muted-foreground col-span-full">
              No personal records established yet.
            </div>
          ) : (
            data.personalRecords.map(pr => (
              <div
                key={pr.id}
                className="p-4 rounded-2xl bg-card border border-border/60 space-y-2"
              >
                <div className="flex items-start justify-between">
                  <span className="text-lg">🏆</span>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-accent text-foreground">
                    {pr.type.replace('_', ' ')}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-foreground">{pr.exerciseName}</h4>
                <div className="text-lg font-bold text-yellow-400">
                  {pr.value} {pr.unit || ''}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB: CALENDAR */}
      {activeTab === 'calendar' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {scheduledCalendarWorkouts.map((item, idx) => (
            <div
              key={`${item.workoutId}_${item.scheduledDate}_${idx}`}
              className={`p-3.5 rounded-2xl border text-xs space-y-1 ${
                item.status === 'COMPLETED'
                  ? 'bg-green-500/5 border-green-500/30'
                  : item.status === 'TODAY'
                  ? 'bg-primary/10 border-primary/40'
                  : item.status === 'MISSED'
                  ? 'bg-red-500/5 border-red-500/30'
                  : 'bg-card border-border/50'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>{item.dayOfWeek}, {item.formattedDate}</span>
                <span className="font-bold uppercase">{item.status}</span>
              </div>
              <h4 className="text-sm font-bold text-foreground">{item.workoutName}</h4>
            </div>
          ))}
        </div>
      )}

      {/* Drill-down modal for exercise detail */}
      {selectedExercise && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-primary">Exercise Progression</span>
                <h3 className="text-lg font-bold text-white">{selectedExercise.exerciseName}</h3>
              </div>
              <button
                onClick={() => setSelectedExercise(null)}
                className="text-zinc-400 hover:text-white text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 text-amber-300 text-xs">
              {selectedExercise.insightText}
            </div>

            <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
              {selectedExercise.history.map((h, i) => (
                <div
                  key={i}
                  className="p-2.5 rounded-xl bg-zinc-800/40 border border-zinc-800 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-semibold text-white block">{h.workoutName}</span>
                    <span className="text-[10px] text-zinc-400">{h.formattedDate}</span>
                  </div>
                  <span className="font-bold text-amber-400">{h.bestMetricFormatted}</span>
                </div>
              ))}
            </div>

            <Button
              className="w-full bg-zinc-800 text-white text-xs h-9"
              onClick={() => setSelectedExercise(null)}
            >
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
