/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Scale,
  Plus,
  TrendingDown,
  TrendingUp,
  Minus,
  Calendar,
  Trash2,
  Edit2,
  Info,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine
} from 'recharts';
import { BodyWeightEntry, WeightUnit, GoalEntry } from '../../types/progress';

interface WeightTrackerProps {
  weights: BodyWeightEntry[];
  goals?: GoalEntry[];
  onAddWeight: (data: { weight: number; unit: WeightUnit; recordedAt: string; notes?: string }) => Promise<void>;
  onUpdateWeight?: (id: string, data: Partial<BodyWeightEntry>) => Promise<void>;
  onDeleteWeight?: (id: string) => Promise<void>;
  isCoachView?: boolean;
}

type DateRange = '7D' | '30D' | '90D' | '6M' | '1Y' | 'ALL';

export const WeightTracker: React.FC<WeightTrackerProps> = ({
  weights,
  goals = [],
  onAddWeight,
  onUpdateWeight,
  onDeleteWeight,
  isCoachView = false
}) => {
  const [selectedRange, setSelectedRange] = useState<DateRange>('90D');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  
  // Form State
  const [weightValue, setWeightValue] = useState<string>('');
  const [weightUnit, setWeightUnit] = useState<WeightUnit>('kg');
  const [recordDate, setRecordDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Active weight goal
  const activeWeightGoal = useMemo(() => {
    return goals.find(g => g.type === 'BODY_WEIGHT' && g.status === 'ACTIVE');
  }, [goals]);

  // Sort weights chronologically
  const sortedWeights = useMemo(() => {
    return [...weights].sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());
  }, [weights]);

  // Filter weights based on selected range
  const filteredWeights = useMemo(() => {
    if (sortedWeights.length === 0) return [];
    if (selectedRange === 'ALL') return sortedWeights;

    const now = new Date().getTime();
    let daysToSubtract = 90;
    if (selectedRange === '7D') daysToSubtract = 7;
    if (selectedRange === '30D') daysToSubtract = 30;
    if (selectedRange === '90D') daysToSubtract = 90;
    if (selectedRange === '6M') daysToSubtract = 180;
    if (selectedRange === '1Y') daysToSubtract = 365;

    const cutoff = now - daysToSubtract * 24 * 60 * 60 * 1000;
    const subset = sortedWeights.filter(w => new Date(w.recordedAt).getTime() >= cutoff);
    return subset.length > 0 ? subset : sortedWeights.slice(-5);
  }, [sortedWeights, selectedRange]);

  // Metric computations
  const stats = useMemo(() => {
    if (sortedWeights.length === 0) return null;
    const start = sortedWeights[0];
    const current = sortedWeights[sortedWeights.length - 1];
    const diff = Number((current.weight - start.weight).toFixed(1));
    const percent = start.weight > 0 ? Number(((diff / start.weight) * 100).toFixed(1)) : 0;
    
    let minW = sortedWeights[0].weight;
    let maxW = sortedWeights[0].weight;
    sortedWeights.forEach(w => {
      if (w.weight < minW) minW = w.weight;
      if (w.weight > maxW) maxW = w.weight;
    });

    // Rate per week (last 30 days or available)
    let ratePerWeek = 0;
    if (sortedWeights.length >= 2) {
      const recent = sortedWeights.slice(-4);
      const first = recent[0];
      const last = recent[recent.length - 1];
      const days = Math.max(1, (new Date(last.recordedAt).getTime() - new Date(first.recordedAt).getTime()) / (1000 * 3600 * 24));
      ratePerWeek = Number(((last.weight - first.weight) / (days / 7)).toFixed(2));
    }

    return {
      startWeight: start.weight,
      currentWeight: current.weight,
      unit: current.unit,
      diff,
      percent,
      minW,
      maxW,
      ratePerWeek
    };
  }, [sortedWeights]);

  // Prepare chart data
  const chartData = useMemo(() => {
    return filteredWeights.map(w => ({
      date: new Date(w.recordedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      fullDate: w.recordedAt,
      weight: w.weight,
      unit: w.unit,
      notes: w.notes
    }));
  }, [filteredWeights]);

  const handleOpenAdd = () => {
    setIsEditing(null);
    setWeightValue(stats?.currentWeight ? String(stats.currentWeight) : '');
    setWeightUnit(stats?.unit || 'kg');
    setRecordDate(new Date().toISOString().split('T')[0]);
    setNotes('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (entry: BodyWeightEntry) => {
    setIsEditing(entry.id);
    setWeightValue(String(entry.weight));
    setWeightUnit(entry.unit);
    setRecordDate(entry.recordedAt.split('T')[0]);
    setNotes(entry.notes || '');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(weightValue);
    if (isNaN(val) || val <= 0 || val > 500) {
      setFormError('Please enter a valid weight between 1 and 500.');
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError(null);
      if (isEditing && onUpdateWeight) {
        await onUpdateWeight(isEditing, {
          weight: val,
          unit: weightUnit,
          recordedAt: recordDate,
          notes
        });
      } else {
        await onAddWeight({
          weight: val,
          unit: weightUnit,
          recordedAt: recordDate,
          notes
        });
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Failed to save weight entry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!onDeleteWeight) return;
    if (window.confirm('Are you sure you want to delete this weight log?')) {
      try {
        await onDeleteWeight(id);
      } catch (err: any) {
        console.error('Delete failed:', err);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card/60 backdrop-blur-md p-6 rounded-2xl border border-border/40 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Scale className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Body Weight Dynamics</h2>
            <p className="text-sm text-muted-foreground">
              Precision transformation tracking with trend analysis and goal indicators
            </p>
          </div>
        </div>

        <button
          id="btn-log-weight"
          onClick={handleOpenAdd}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 text-black font-semibold hover:bg-amber-400 transition-all shadow-md shadow-amber-500/20 text-sm"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          Log Weight Entry
        </button>
      </div>

      {/* KPI Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card/40 p-4 rounded-xl border border-border/30">
            <span className="text-xs font-medium text-muted-foreground">Current Weight</span>
            <div className="text-2xl font-bold text-foreground mt-1">
              {stats.currentWeight} <span className="text-sm font-normal text-muted-foreground">{stats.unit}</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Started at {stats.startWeight} {stats.unit}
            </div>
          </div>

          <div className="bg-card/40 p-4 rounded-xl border border-border/30">
            <span className="text-xs font-medium text-muted-foreground">Net Change</span>
            <div className="flex items-center gap-1.5 text-2xl font-bold mt-1">
              {stats.diff < 0 ? (
                <span className="text-emerald-400 flex items-center">
                  <TrendingDown className="w-5 h-5 mr-1" />
                  {Math.abs(stats.diff)} {stats.unit}
                </span>
              ) : stats.diff > 0 ? (
                <span className="text-amber-400 flex items-center">
                  <TrendingUp className="w-5 h-5 mr-1" />
                  +{stats.diff} {stats.unit}
                </span>
              ) : (
                <span className="text-muted-foreground flex items-center">
                  <Minus className="w-5 h-5 mr-1" />
                  0 {stats.unit}
                </span>
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {stats.percent > 0 ? `+${stats.percent}%` : `${stats.percent}%`} overall
            </div>
          </div>

          <div className="bg-card/40 p-4 rounded-xl border border-border/30">
            <span className="text-xs font-medium text-muted-foreground">Recent Pace</span>
            <div className="text-2xl font-bold text-foreground mt-1">
              {stats.ratePerWeek > 0 ? `+${stats.ratePerWeek}` : stats.ratePerWeek} <span className="text-sm font-normal text-muted-foreground">{stats.unit}/wk</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Estimated 7-day velocity
            </div>
          </div>

          <div className="bg-card/40 p-4 rounded-xl border border-border/30">
            <span className="text-xs font-medium text-muted-foreground">Target Goal</span>
            <div className="text-2xl font-bold text-foreground mt-1">
              {activeWeightGoal ? (
                <span>
                  {activeWeightGoal.targetValue} <span className="text-sm font-normal text-muted-foreground">{activeWeightGoal.unit || stats.unit}</span>
                </span>
              ) : (
                <span className="text-sm font-normal text-muted-foreground">No goal set</span>
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-1 truncate">
              {activeWeightGoal
                ? `${Math.abs(Number((stats.currentWeight - activeWeightGoal.targetValue).toFixed(1)))} ${stats.unit} remaining`
                : 'Set a goal in Goals tab'}
            </div>
          </div>
        </div>
      )}

      {/* Chart Section */}
      <div className="bg-card/40 backdrop-blur-sm p-6 rounded-2xl border border-border/40 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-foreground">Progression Curve</h3>
            <p className="text-xs text-muted-foreground">Historical body weight trajectory over time</p>
          </div>

          {/* Time range filters */}
          <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-xl border border-border/20 self-start">
            {(['7D', '30D', '90D', '6M', '1Y', 'ALL'] as DateRange[]).map(range => (
              <button
                key={range}
                onClick={() => setSelectedRange(range)}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all ${
                  selectedRange === range
                    ? 'bg-amber-500 text-black font-semibold shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>

        {/* Chart Canvas */}
        {chartData.length > 0 ? (
          <div className="h-[280px] w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="weightAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                <XAxis
                  dataKey="date"
                  stroke="#737373"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#262626' }}
                />
                <YAxis
                  stroke="#737373"
                  fontSize={11}
                  domain={['dataMin - 1', 'dataMax + 1']}
                  tickLine={false}
                  axisLine={{ stroke: '#262626' }}
                  tickFormatter={val => `${val}`}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-card border border-border p-3 rounded-xl shadow-xl">
                          <div className="text-xs text-muted-foreground">{data.fullDate}</div>
                          <div className="text-base font-bold text-amber-400 mt-0.5">
                            {data.weight} {data.unit}
                          </div>
                          {data.notes && (
                            <div className="text-xs text-foreground/80 mt-1 italic max-w-xs">
                              "{data.notes}"
                            </div>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                {activeWeightGoal && (
                  <ReferenceLine
                    y={activeWeightGoal.targetValue}
                    stroke="#10b981"
                    strokeDasharray="4 4"
                    label={{
                      value: `Goal: ${activeWeightGoal.targetValue} ${activeWeightGoal.unit || 'kg'}`,
                      fill: '#10b981',
                      fontSize: 10,
                      position: 'top'
                    }}
                  />
                )}
                <Area
                  type="monotone"
                  dataKey="weight"
                  stroke="#f59e0b"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#weightAreaGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="py-12 text-center text-muted-foreground text-sm">
            No weight entries found in this timeframe. Log your first check-in above!
          </div>
        )}
      </div>

      {/* History Table */}
      <div className="bg-card/40 backdrop-blur-sm rounded-2xl border border-border/40 overflow-hidden">
        <div className="p-4 border-b border-border/30 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Log History</h3>
            <p className="text-xs text-muted-foreground">{sortedWeights.length} total check-in records</p>
          </div>
        </div>

        {sortedWeights.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/20 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Weight</th>
                  <th className="px-4 py-3">Notes</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {[...sortedWeights].reverse().map(entry => (
                  <tr key={entry.id} className="hover:bg-muted/10 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap font-medium text-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                        {entry.recordedAt.split('T')[0]}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-bold text-amber-400">{entry.weight}</span>{' '}
                      <span className="text-xs text-muted-foreground">{entry.unit}</span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">
                      {entry.notes || '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1">
                        {onUpdateWeight && (
                          <button
                            onClick={() => handleOpenEdit(entry)}
                            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                            title="Edit entry"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {onDeleteWeight && (
                          <button
                            onClick={() => handleDelete(entry.id)}
                            className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
                            title="Delete entry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground text-sm">
            No entries recorded yet.
          </div>
        )}
      </div>

      {/* Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-border w-full max-w-md rounded-2xl shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border/40">
              <h3 className="text-lg font-bold text-foreground">
                {isEditing ? 'Edit Weight Log' : 'Log Body Weight'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Weight Value</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 78.5"
                    value={weightValue}
                    onChange={e => setWeightValue(e.target.value)}
                    required
                    autoFocus
                    className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:border-amber-500 text-sm font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Unit</label>
                  <select
                    value={weightUnit}
                    onChange={e => setWeightUnit(e.target.value as WeightUnit)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:border-amber-500 text-sm font-semibold"
                  >
                    <option value="kg">kg</option>
                    <option value="lbs">lbs</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Date of Weigh-In</label>
                <input
                  type="date"
                  value={recordDate}
                  onChange={e => setRecordDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:border-amber-500 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Fasted morning weigh-in, post water"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  maxLength={150}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:border-amber-500 text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/20"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl text-sm font-semibold bg-amber-500 text-black hover:bg-amber-400 disabled:opacity-50 transition-all shadow-md shadow-amber-500/20"
                >
                  {isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Log Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
