/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Ruler,
  Plus,
  TrendingDown,
  TrendingUp,
  Minus,
  Calendar,
  Trash2,
  Edit2,
  AlertCircle
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { BodyMeasurementEntry, MeasurementUnit } from '../../types/progress';

interface MeasurementTrackerProps {
  measurements: BodyMeasurementEntry[];
  onAddMeasurement: (data: Omit<BodyMeasurementEntry, 'id' | 'tenantId' | 'clientId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onUpdateMeasurement?: (id: string, data: Partial<BodyMeasurementEntry>) => Promise<void>;
  onDeleteMeasurement?: (id: string) => Promise<void>;
  isCoachView?: boolean;
}

type MetricKey = 'waist' | 'chest' | 'hips' | 'leftArm' | 'rightArm' | 'leftThigh' | 'rightThigh' | 'shoulders' | 'neck' | 'calves';

const METRIC_LABELS: Record<MetricKey, string> = {
  waist: 'Waist Circumference',
  chest: 'Chest / Bust',
  hips: 'Hips / Glutes',
  leftArm: 'Left Bicep',
  rightArm: 'Right Bicep',
  leftThigh: 'Left Thigh',
  rightThigh: 'Right Thigh',
  shoulders: 'Shoulder Width',
  neck: 'Neck',
  calves: 'Calves'
};

export const MeasurementTracker: React.FC<MeasurementTrackerProps> = ({
  measurements,
  onAddMeasurement,
  onUpdateMeasurement,
  onDeleteMeasurement,
  isCoachView = false
}) => {
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>('waist');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);

  // Form State
  const [unit, setUnit] = useState<MeasurementUnit>('cm');
  const [recordedAt, setRecordedAt] = useState<string>(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState<string>('');
  const [metricsForm, setMetricsForm] = useState<Partial<Record<MetricKey, string>>>({
    waist: '',
    chest: '',
    hips: '',
    leftArm: '',
    rightArm: '',
    leftThigh: '',
    rightThigh: '',
    shoulders: '',
    neck: '',
    calves: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Sort measurements chronologically (oldest to newest for charts)
  const sortedAsc = useMemo(() => {
    return [...measurements].sort(
      (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
    );
  }, [measurements]);

  // Baseline and Latest
  const baseline = sortedAsc[0];
  const latest = sortedAsc[sortedAsc.length - 1];

  // Prepare chart data for selected metric
  const chartData = useMemo(() => {
    return sortedAsc
      .filter(m => m[selectedMetric] !== undefined && m[selectedMetric] !== null)
      .map(m => ({
        date: new Date(m.recordedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        fullDate: m.recordedAt,
        value: m[selectedMetric],
        unit: m.unit
      }));
  }, [sortedAsc, selectedMetric]);

  const handleOpenAdd = () => {
    setIsEditing(null);
    setUnit(latest?.unit || 'cm');
    setRecordedAt(new Date().toISOString().split('T')[0]);
    setNotes('');
    setMetricsForm({
      waist: latest?.waist ? String(latest.waist) : '',
      chest: latest?.chest ? String(latest.chest) : '',
      hips: latest?.hips ? String(latest.hips) : '',
      leftArm: latest?.leftArm ? String(latest.leftArm) : '',
      rightArm: latest?.rightArm ? String(latest.rightArm) : '',
      leftThigh: latest?.leftThigh ? String(latest.leftThigh) : '',
      rightThigh: latest?.rightThigh ? String(latest.rightThigh) : '',
      shoulders: latest?.shoulders ? String(latest.shoulders) : '',
      neck: latest?.neck ? String(latest.neck) : '',
      calves: latest?.calves ? String(latest.calves) : ''
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (entry: BodyMeasurementEntry) => {
    setIsEditing(entry.id);
    setUnit(entry.unit);
    setRecordedAt(entry.recordedAt.split('T')[0]);
    setNotes(entry.notes || '');
    setMetricsForm({
      waist: entry.waist ? String(entry.waist) : '',
      chest: entry.chest ? String(entry.chest) : '',
      hips: entry.hips ? String(entry.hips) : '',
      leftArm: entry.leftArm ? String(entry.leftArm) : '',
      rightArm: entry.rightArm ? String(entry.rightArm) : '',
      leftThigh: entry.leftThigh ? String(entry.leftThigh) : '',
      rightThigh: entry.rightThigh ? String(entry.rightThigh) : '',
      shoulders: entry.shoulders ? String(entry.shoulders) : '',
      neck: entry.neck ? String(entry.neck) : '',
      calves: entry.calves ? String(entry.calves) : ''
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {
      recordedAt,
      unit,
      notes: notes.trim()
    };

    let hasAnyValue = false;
    (Object.keys(metricsForm) as MetricKey[]).forEach(k => {
      const v = metricsForm[k];
      if (v && v.trim() !== '') {
        const num = parseFloat(v);
        if (!isNaN(num) && num > 0) {
          payload[k] = num;
          hasAnyValue = true;
        }
      }
    });

    if (!hasAnyValue) {
      setFormError('Please enter at least one body measurement.');
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError(null);
      if (isEditing && onUpdateMeasurement) {
        await onUpdateMeasurement(isEditing, payload);
      } else {
        await onAddMeasurement(payload);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Failed to save measurements.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!onDeleteMeasurement) return;
    if (window.confirm('Delete this measurement entry?')) {
      try {
        await onDeleteMeasurement(id);
      } catch (err: any) {
        console.error('Delete measurement failed:', err);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card/60 backdrop-blur-md p-6 rounded-2xl border border-border/40 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Ruler className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Circumference & Tape Metrics</h2>
            <p className="text-sm text-muted-foreground">
              Monitor muscle growth, waist reduction, and anatomical proportions
            </p>
          </div>
        </div>

        <button
          id="btn-log-measurement"
          onClick={handleOpenAdd}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 text-white font-semibold hover:bg-blue-400 transition-all shadow-md shadow-blue-500/20 text-sm"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          Log Measurements
        </button>
      </div>

      {/* Metric Selector & Delta Comparison Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Metric List / Cards */}
        <div className="lg:col-span-1 space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1 pb-1">
            Body Landmarks
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
            {(Object.keys(METRIC_LABELS) as MetricKey[]).map(key => {
              const baseVal = baseline?.[key];
              const latestVal = latest?.[key];
              const hasData = latestVal !== undefined;
              const delta = hasData && baseVal !== undefined ? Number((latestVal - baseVal).toFixed(1)) : null;
              const isSelected = selectedMetric === key;

              return (
                <button
                  key={key}
                  onClick={() => setSelectedMetric(key)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center justify-between ${
                    isSelected
                      ? 'bg-blue-500/10 border-blue-500/40 text-foreground'
                      : 'bg-card/40 border-border/30 hover:border-border/60 text-muted-foreground'
                  }`}
                >
                  <div>
                    <div className="text-xs font-medium text-muted-foreground">{METRIC_LABELS[key]}</div>
                    <div className="text-base font-bold text-foreground mt-0.5">
                      {hasData ? `${latestVal} ${latest?.unit}` : '—'}
                    </div>
                  </div>

                  {delta !== null && delta !== 0 && (
                    <div
                      className={`text-xs font-semibold px-2 py-0.5 rounded-md flex items-center gap-0.5 ${
                        delta > 0
                          ? 'bg-amber-500/10 text-amber-400'
                          : 'bg-emerald-500/10 text-emerald-400'
                      }`}
                    >
                      {delta > 0 ? `+${delta}` : delta} {latest?.unit}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Progression Chart for Selected Landmark */}
        <div className="lg:col-span-2 space-y-4 bg-card/40 backdrop-blur-sm p-6 rounded-2xl border border-border/40">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-foreground">
                {METRIC_LABELS[selectedMetric]} Trajectory
              </h3>
              <p className="text-xs text-muted-foreground">Historical changes across recorded tape logs</p>
            </div>
            {latest?.[selectedMetric] && (
              <div className="text-right">
                <span className="text-xs text-muted-foreground">Current:</span>
                <div className="text-lg font-bold text-blue-400">
                  {latest[selectedMetric]} {latest.unit}
                </div>
              </div>
            )}
          </div>

          {chartData.length > 0 ? (
            <div className="h-[260px] w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                        const d = payload[0].payload;
                        return (
                          <div className="bg-card border border-border p-3 rounded-xl shadow-xl">
                            <div className="text-xs text-muted-foreground">{d.fullDate}</div>
                            <div className="text-base font-bold text-blue-400 mt-0.5">
                              {d.value} {d.unit}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={{ fill: '#3b82f6', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="py-16 text-center text-muted-foreground text-sm">
              No entries recorded for {METRIC_LABELS[selectedMetric]} yet.
            </div>
          )}
        </div>
      </div>

      {/* History Log Table */}
      <div className="bg-card/40 backdrop-blur-sm rounded-2xl border border-border/40 overflow-hidden">
        <div className="p-4 border-b border-border/30">
          <h3 className="text-sm font-semibold text-foreground">Measurement Logs</h3>
          <p className="text-xs text-muted-foreground">{measurements.length} complete check-in records</p>
        </div>

        {measurements.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/20 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Waist</th>
                  <th className="px-4 py-3">Chest</th>
                  <th className="px-4 py-3">Hips</th>
                  <th className="px-4 py-3">Arms (L/R)</th>
                  <th className="px-4 py-3">Thighs (L/R)</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {[...measurements].map(entry => (
                  <tr key={entry.id} className="hover:bg-muted/10 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap font-medium text-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                        {entry.recordedAt.split('T')[0]}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-foreground">
                      {entry.waist ? `${entry.waist} ${entry.unit}` : '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-foreground">
                      {entry.chest ? `${entry.chest} ${entry.unit}` : '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-foreground">
                      {entry.hips ? `${entry.hips} ${entry.unit}` : '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-foreground">
                      {entry.leftArm || entry.rightArm
                        ? `${entry.leftArm || '—'} / ${entry.rightArm || '—'} ${entry.unit}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-foreground">
                      {entry.leftThigh || entry.rightThigh
                        ? `${entry.leftThigh || '—'} / ${entry.rightThigh || '—'} ${entry.unit}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1">
                        {onUpdateMeasurement && (
                          <button
                            onClick={() => handleOpenEdit(entry)}
                            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {onDeleteMeasurement && (
                          <button
                            onClick={() => handleDelete(entry.id)}
                            className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
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
            No measurements recorded yet.
          </div>
        )}
      </div>

      {/* Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-border w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-border/40">
              <h3 className="text-lg font-bold text-foreground">
                {isEditing ? 'Edit Measurements' : 'Log Body Measurements'}
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
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Date of Measurement</label>
                  <input
                    type="date"
                    value={recordedAt}
                    onChange={e => setRecordedAt(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Unit</label>
                  <select
                    value={unit}
                    onChange={e => setUnit(e.target.value as MeasurementUnit)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm font-semibold"
                  >
                    <option value="cm">Centimeters (cm)</option>
                    <option value="in">Inches (in)</option>
                  </select>
                </div>
              </div>

              {/* Landmark Inputs */}
              <div className="space-y-2 pt-2">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Landmark Values ({unit})
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {(Object.keys(METRIC_LABELS) as MetricKey[]).map(key => (
                    <div key={key} className="space-y-1">
                      <label className="text-xs text-muted-foreground truncate block">
                        {METRIC_LABELS[key]}
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="0.0"
                        value={metricsForm[key] || ''}
                        onChange={e =>
                          setMetricsForm(prev => ({ ...prev, [key]: e.target.value }))
                        }
                        className="w-full px-3 py-2 rounded-xl bg-background border border-border text-foreground text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Measured in morning before breakfast"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  maxLength={150}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm"
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
                  className="px-5 py-2 rounded-xl text-sm font-semibold bg-blue-500 text-white hover:bg-blue-400 disabled:opacity-50 transition-all shadow-md shadow-blue-500/20"
                >
                  {isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Save Measurements'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
