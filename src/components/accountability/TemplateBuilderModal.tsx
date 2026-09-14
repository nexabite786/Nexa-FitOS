import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Scale,
  Ruler,
  Star,
  CheckSquare,
  AlignLeft,
  FileText,
  Sparkles,
  Layers,
  HelpCircle
} from 'lucide-react';
import { Button } from '../ui/button';
import {
  CheckInTemplate,
  CheckInQuestion,
  CheckInQuestionType,
  CheckInFrequency,
  MeasurementTarget
} from '../../types/accountability';
import { createCheckInTemplate, updateCheckInTemplate } from '../../lib/accountabilityService';
import { useAuthStore } from '../../store/authStore';

interface TemplateBuilderModalProps {
  tenantId: string;
  templateToEdit?: CheckInTemplate | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (template: CheckInTemplate) => void;
}

const QUESTION_TYPES: Array<{
  type: CheckInQuestionType;
  label: string;
  icon: any;
  desc: string;
}> = [
  { type: 'SHORT_TEXT', label: 'Short Text', icon: FileText, desc: 'Single line text answer' },
  { type: 'LONG_TEXT', label: 'Long Text', icon: AlignLeft, desc: 'Multi-line reflections and comments' },
  { type: 'RATING', label: 'Rating Scale', icon: Star, desc: '1 to 5 or 1 to 10 numerical score' },
  { type: 'YES_NO', label: 'Yes / No', icon: CheckSquare, desc: 'Binary boolean question' },
  { type: 'WEIGHT', label: 'Body Weight', icon: Scale, desc: 'Logs weight and syncs to Progress tracker' },
  { type: 'MEASUREMENT', label: 'Body Tape Measurement', icon: Ruler, desc: 'Logs circumference and syncs to Progress' },
  { type: 'NUMBER', label: 'Number / Count', icon: FileText, desc: 'Generic numerical quantity or hours' },
  { type: 'SINGLE_SELECT', label: 'Single Choice', icon: CheckSquare, desc: 'Pick one option from a list' },
  { type: 'MULTIPLE_SELECT', label: 'Multiple Choice', icon: CheckSquare, desc: 'Pick one or more options' }
];

const MEASUREMENT_TARGETS: Array<{ value: MeasurementTarget; label: string }> = [
  { value: 'waist', label: 'Waist (Navel)' },
  { value: 'chest', label: 'Chest' },
  { value: 'hips', label: 'Hips / Glutes' },
  { value: 'leftArm', label: 'Left Arm' },
  { value: 'rightArm', label: 'Right Arm' },
  { value: 'leftThigh', label: 'Left Thigh' },
  { value: 'rightThigh', label: 'Right Thigh' },
  { value: 'shoulders', label: 'Shoulders' },
  { value: 'calves', label: 'Calves' },
  { value: 'neck', label: 'Neck' }
];

const PRESET_TEMPLATES = [
  {
    name: 'Weekly Coach Check-In (Standard)',
    description: 'Weekly accountability check-in covering body weight, workout adherence, nutrition compliance, sleep, and reflections.',
    frequency: 'WEEKLY' as CheckInFrequency,
    questions: [
      {
        id: 'q1',
        type: 'WEIGHT' as CheckInQuestionType,
        label: 'Current Morning Body Weight',
        description: 'Weigh in first thing in the morning after using the restroom and before eating/drinking.',
        required: true,
        unit: 'kg',
        order: 1
      },
      {
        id: 'q2',
        type: 'RATING' as CheckInQuestionType,
        label: 'Overall Energy & Recovery this week (1 - 10)',
        description: 'How energized did you feel throughout training and daily life?',
        required: true,
        minRating: 1,
        maxRating: 10,
        ratingLabels: { min: 'Completely Drained', max: 'Peak Energy' },
        order: 2
      },
      {
        id: 'q3',
        type: 'RATING' as CheckInQuestionType,
        label: 'Nutrition & Diet Adherence (1 - 10)',
        description: 'How closely did you stick to your macro/meal targets?',
        required: true,
        minRating: 1,
        maxRating: 10,
        ratingLabels: { min: 'Off Track', max: '100% On Plan' },
        order: 3
      },
      {
        id: 'q4',
        type: 'YES_NO' as CheckInQuestionType,
        label: 'Did you complete all scheduled training sessions?',
        description: 'Select No if you missed or had to cut workouts short.',
        required: true,
        order: 4
      },
      {
        id: 'q5',
        type: 'LONG_TEXT' as CheckInQuestionType,
        label: 'Weekly Wins & Highlights',
        description: 'What went particularly well this week? (Strength PRs, consistent habits, improved mindset, etc.)',
        required: false,
        order: 5
      },
      {
        id: 'q6',
        type: 'LONG_TEXT' as CheckInQuestionType,
        label: 'Challenges & Questions for your Coach',
        description: 'Any hurdles, soreness, travel upcoming, or exercise form questions?',
        required: false,
        order: 6
      }
    ]
  },
  {
    name: 'Monthly Body Composition & Circumference Check',
    description: 'Comprehensive monthly check-in tracking tape measurements and visual progress.',
    frequency: 'MONTHLY' as CheckInFrequency,
    questions: [
      {
        id: 'm1',
        type: 'WEIGHT' as CheckInQuestionType,
        label: 'Morning Body Weight',
        required: true,
        unit: 'kg',
        order: 1
      },
      {
        id: 'm2',
        type: 'MEASUREMENT' as CheckInQuestionType,
        label: 'Waist Circumference (at narrowest point / navel)',
        measurementTarget: 'waist' as MeasurementTarget,
        unit: 'cm',
        required: true,
        order: 2
      },
      {
        id: 'm3',
        type: 'MEASUREMENT' as CheckInQuestionType,
        label: 'Chest Circumference',
        measurementTarget: 'chest' as MeasurementTarget,
        unit: 'cm',
        required: false,
        order: 3
      },
      {
        id: 'm4',
        type: 'MEASUREMENT' as CheckInQuestionType,
        label: 'Hips / Glutes Circumference',
        measurementTarget: 'hips' as MeasurementTarget,
        unit: 'cm',
        required: false,
        order: 4
      },
      {
        id: 'm5',
        type: 'LONG_TEXT' as CheckInQuestionType,
        label: 'Monthly Reflection & Next Month Goals',
        description: 'How do you feel your physique and conditioning evolved over the past 30 days?',
        required: true,
        order: 5
      }
    ]
  }
];

export function TemplateBuilderModal({
  tenantId,
  templateToEdit,
  isOpen,
  onClose,
  onSaved
}: TemplateBuilderModalProps) {
  const { user, profile } = useAuthStore();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [frequency, setFrequency] = useState<CheckInFrequency>('WEEKLY');
  const [customDaysInterval, setCustomDaysInterval] = useState(7);
  const [questions, setQuestions] = useState<CheckInQuestion[]>([]);
  const [status, setStatus] = useState<'ACTIVE' | 'DRAFT'>('ACTIVE');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'BUILD' | 'PREVIEW'>('BUILD');

  useEffect(() => {
    if (templateToEdit) {
      setName(templateToEdit.name || '');
      setDescription(templateToEdit.description || '');
      setFrequency(templateToEdit.frequency || 'WEEKLY');
      setCustomDaysInterval(templateToEdit.customDaysInterval || 7);
      setQuestions(templateToEdit.questions || []);
      setStatus(templateToEdit.status === 'ACTIVE' ? 'ACTIVE' : 'DRAFT');
    } else {
      // Load default standard template
      const preset = PRESET_TEMPLATES[0];
      setName('');
      setDescription('');
      setFrequency('WEEKLY');
      setQuestions(preset.questions.map(q => ({ ...q, id: `q_${Date.now()}_${Math.random().toString(36).substr(2, 4)}` })));
      setStatus('ACTIVE');
    }
  }, [templateToEdit, isOpen]);

  if (!isOpen) return null;

  const handleApplyPreset = (preset: typeof PRESET_TEMPLATES[0]) => {
    setName(preset.name);
    setDescription(preset.description);
    setFrequency(preset.frequency);
    setQuestions(
      preset.questions.map((q, idx) => ({
        ...q,
        id: `q_${Date.now()}_${idx}`,
        order: idx + 1
      }))
    );
  };

  const handleAddQuestion = (type: CheckInQuestionType) => {
    const newQ: CheckInQuestion = {
      id: `q_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      type,
      label:
        type === 'WEIGHT'
          ? 'Morning Body Weight'
          : type === 'MEASUREMENT'
          ? 'Waist Circumference'
          : type === 'RATING'
          ? 'Rate your energy / adherence (1 - 10)'
          : type === 'YES_NO'
          ? 'Did you hit your targets this week?'
          : 'New Question',
      description: '',
      required: true,
      unit: type === 'WEIGHT' ? 'kg' : type === 'MEASUREMENT' ? 'cm' : undefined,
      measurementTarget: type === 'MEASUREMENT' ? 'waist' : undefined,
      minRating: type === 'RATING' ? 1 : undefined,
      maxRating: type === 'RATING' ? 10 : undefined,
      options: type === 'SINGLE_SELECT' || type === 'MULTIPLE_SELECT' ? ['Option 1', 'Option 2', 'Option 3'] : undefined,
      order: questions.length + 1
    };

    setQuestions([...questions, newQ]);
  };

  const handleUpdateQuestion = (index: number, updates: Partial<CheckInQuestion>) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], ...updates };
    setQuestions(updated);
  };

  const handleDeleteQuestion = (index: number) => {
    const updated = questions.filter((_, i) => i !== index).map((q, idx) => ({ ...q, order: idx + 1 }));
    setQuestions(updated);
  };

  const handleMoveQuestion = (index: number, direction: 'UP' | 'DOWN') => {
    if ((direction === 'UP' && index === 0) || (direction === 'DOWN' && index === questions.length - 1)) return;
    const targetIdx = direction === 'UP' ? index - 1 : index + 1;
    const updated = [...questions];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIdx, 0, moved);
    setQuestions(updated.map((q, idx) => ({ ...q, order: idx + 1 })));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (questions.length === 0) {
      alert('Please add at least one question to this check-in template.');
      return;
    }

    setIsSubmitting(true);
    try {
      const coachName = profile ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim() : 'Coach';
      const templateData = {
        name: name.trim(),
        description: description.trim(),
        frequency,
        customDaysInterval: frequency === 'CUSTOM' ? Number(customDaysInterval) || 7 : undefined,
        questions: questions.map((q, idx) => ({ ...q, order: idx + 1 })),
        status: status as any
      };

      if (templateToEdit) {
        await updateCheckInTemplate(tenantId, templateToEdit.id, templateData);
        onSaved({ ...templateToEdit, ...templateData, updatedAt: new Date().toISOString() });
      } else {
        const created = await createCheckInTemplate(
          tenantId,
          templateData,
          user?.uid || 'coach',
          coachName
        );
        onSaved(created);
      }
      onClose();
    } catch (err: any) {
      console.error('Failed to save check-in template:', err);
      alert('Error saving template: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-4xl my-8 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {templateToEdit ? 'Edit Check-In Template' : 'Create Check-In Template'}
              </h2>
              <p className="text-xs text-muted-foreground">
                Design questionnaires to track client progress, mindset, and adherence
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-muted rounded-lg p-0.5 text-xs font-medium mr-2">
              <button
                type="button"
                onClick={() => setActiveTab('BUILD')}
                className={`px-3 py-1 rounded-md transition-all ${
                  activeTab === 'BUILD' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Builder
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('PREVIEW')}
                className={`px-3 py-1 rounded-md transition-all ${
                  activeTab === 'PREVIEW' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Client Preview
              </button>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'BUILD' ? (
            <>
              {/* Presets quick-load for new templates */}
              {!templateToEdit && (
                <div className="p-4 rounded-xl bg-accent/40 border border-border/80">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                      Quick Start Presets
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {PRESET_TEMPLATES.map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleApplyPreset(p)}
                        className="text-left p-2.5 rounded-lg bg-card/80 hover:bg-card border border-border text-xs transition-all hover:border-primary/50 flex flex-col justify-between"
                      >
                        <span className="font-semibold text-foreground">{p.name}</span>
                        <span className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                          {p.description}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Basic Meta Form */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Template Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Weekly Accountability & Nutrition Check-in"
                    className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Schedule Frequency
                  </label>
                  <select
                    value={frequency}
                    onChange={e => setFrequency(e.target.value as CheckInFrequency)}
                    className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="WEEKLY">Weekly (Every 7 Days)</option>
                    <option value="BIWEEKLY">Bi-Weekly (Every 14 Days)</option>
                    <option value="MONTHLY">Monthly (Every 30 Days)</option>
                    <option value="CUSTOM">Custom Interval</option>
                  </select>
                </div>

                {frequency === 'CUSTOM' && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Interval (Days)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={90}
                      value={customDaysInterval}
                      onChange={e => setCustomDaysInterval(parseInt(e.target.value) || 7)}
                      className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                )}

                <div className="md:col-span-3 space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Description & Instructions for Clients
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Provide guidance on when and how to complete this check-in..."
                    className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Add Questions Action Bar */}
              <div className="space-y-3 pt-4 border-t border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-foreground">
                      Check-In Questions ({questions.length})
                    </h3>
                    <span className="text-xs text-muted-foreground">
                      Drag or use arrows to reorder
                    </span>
                  </div>
                </div>

                {/* Quick Add Question Type Chips */}
                <div className="flex flex-wrap gap-1.5 p-3 rounded-xl bg-muted/40 border border-border/60">
                  <span className="text-xs font-medium text-muted-foreground mr-1 flex items-center">
                    + Add Field:
                  </span>
                  {QUESTION_TYPES.map(qt => {
                    const Icon = qt.icon;
                    return (
                      <button
                        key={qt.type}
                        type="button"
                        onClick={() => handleAddQuestion(qt.type)}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-card hover:bg-accent border border-border text-xs text-foreground transition-all hover:border-primary/40 shadow-xs"
                        title={qt.desc}
                      >
                        <Icon className="w-3.5 h-3.5 text-primary" />
                        <span>{qt.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Questions List */}
                <div className="space-y-3">
                  {questions.length === 0 ? (
                    <div className="p-8 text-center border-2 border-dashed border-border rounded-xl">
                      <HelpCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                      <p className="text-sm text-muted-foreground">
                        No questions in this template yet. Click the buttons above to add fields.
                      </p>
                    </div>
                  ) : (
                    questions.map((q, idx) => (
                      <div
                        key={q.id || idx}
                        className="p-4 rounded-xl bg-card border border-border shadow-xs space-y-3 transition-all"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-accent flex items-center justify-center text-xs font-bold text-primary">
                              {idx + 1}
                            </span>
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase">
                              {q.type.replace('_', ' ')}
                            </span>
                            {q.type === 'WEIGHT' && (
                              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-medium">
                                Auto-syncs to Weight Tracker
                              </span>
                            )}
                            {q.type === 'MEASUREMENT' && (
                              <span className="text-[11px] px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-500 font-medium">
                                Auto-syncs to Body Measurements
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleMoveQuestion(idx, 'UP')}
                              disabled={idx === 0}
                              className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-30"
                              title="Move Up"
                            >
                              <ChevronUp className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveQuestion(idx, 'DOWN')}
                              disabled={idx === questions.length - 1}
                              className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-30"
                              title="Move Down"
                            >
                              <ChevronDown className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteQuestion(idx)}
                              className="p-1 rounded text-red-500 hover:text-red-400 hover:bg-red-500/10 ml-2"
                              title="Delete Question"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Question Label & Description */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-muted-foreground uppercase">
                              Question Prompt *
                            </label>
                            <input
                              type="text"
                              value={q.label}
                              onChange={e => handleUpdateQuestion(idx, { label: e.target.value })}
                              placeholder="e.g. Rate your energy levels this week"
                              className="w-full px-3 py-1.5 rounded-lg bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-muted-foreground uppercase">
                              Help Text / Hint (Optional)
                            </label>
                            <input
                              type="text"
                              value={q.description || ''}
                              onChange={e => handleUpdateQuestion(idx, { description: e.target.value })}
                              placeholder="e.g. Take measurements first thing in the morning"
                              className="w-full px-3 py-1.5 rounded-lg bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                          </div>
                        </div>

                        {/* Type Specific Configurations */}
                        <div className="flex flex-wrap items-center gap-4 pt-1">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={q.required}
                              onChange={e => handleUpdateQuestion(idx, { required: e.target.checked })}
                              className="rounded border-border text-primary focus:ring-primary"
                            />
                            <span className="text-xs text-foreground font-medium">Required field</span>
                          </label>

                          {q.type === 'WEIGHT' && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">Default Unit:</span>
                              <select
                                value={q.unit || 'kg'}
                                onChange={e => handleUpdateQuestion(idx, { unit: e.target.value })}
                                className="px-2 py-1 rounded bg-background border border-border text-xs"
                              >
                                <option value="kg">kg (Kilograms)</option>
                                <option value="lbs">lbs (Pounds)</option>
                              </select>
                            </div>
                          )}

                          {q.type === 'MEASUREMENT' && (
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs text-muted-foreground">Target Body Site:</span>
                                <select
                                  value={q.measurementTarget || 'waist'}
                                  onChange={e =>
                                    handleUpdateQuestion(idx, {
                                      measurementTarget: e.target.value as MeasurementTarget,
                                      label: q.label === 'Waist Circumference' || q.label === 'New Question'
                                        ? `${MEASUREMENT_TARGETS.find(m => m.value === e.target.value)?.label || ''} Circumference`
                                        : q.label
                                    })
                                  }
                                  className="px-2 py-1 rounded bg-background border border-border text-xs"
                                >
                                  {MEASUREMENT_TARGETS.map(m => (
                                    <option key={m.value} value={m.value}>
                                      {m.label}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <span className="text-xs text-muted-foreground">Unit:</span>
                                <select
                                  value={q.unit || 'cm'}
                                  onChange={e => handleUpdateQuestion(idx, { unit: e.target.value })}
                                  className="px-2 py-1 rounded bg-background border border-border text-xs"
                                >
                                  <option value="cm">cm</option>
                                  <option value="in">in</option>
                                </select>
                              </div>
                            </div>
                          )}

                          {q.type === 'RATING' && (
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-muted-foreground">Scale Range:</span>
                              <select
                                value={q.maxRating || 10}
                                onChange={e => handleUpdateQuestion(idx, { maxRating: parseInt(e.target.value) || 10 })}
                                className="px-2 py-1 rounded bg-background border border-border text-xs"
                              >
                                <option value="5">1 to 5</option>
                                <option value="10">1 to 10</option>
                              </select>
                            </div>
                          )}

                          {(q.type === 'SINGLE_SELECT' || q.type === 'MULTIPLE_SELECT') && (
                            <div className="w-full space-y-1.5 pt-2">
                              <span className="text-xs text-muted-foreground">
                                Options (comma-separated):
                              </span>
                              <input
                                type="text"
                                value={(q.options || []).join(', ')}
                                onChange={e =>
                                  handleUpdateQuestion(idx, {
                                    options: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                                  })
                                }
                                placeholder="Option 1, Option 2, Option 3"
                                className="w-full px-3 py-1 rounded bg-background border border-border text-xs"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          ) : (
            /* PREVIEW MODE */
            <div className="max-w-2xl mx-auto space-y-6 bg-card/60 p-6 rounded-xl border border-border">
              <div>
                <span className="text-[11px] uppercase font-bold tracking-wider text-primary">
                  Client View Preview
                </span>
                <h3 className="text-xl font-bold text-foreground mt-1">
                  {name || 'Untitled Check-In'}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {description || 'No description provided.'}
                </p>
              </div>

              <div className="space-y-5 pt-4 border-t border-border">
                {questions.map((q, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-background border border-border space-y-2">
                    <div className="flex items-baseline justify-between">
                      <label className="text-sm font-semibold text-foreground">
                        {idx + 1}. {q.label} {q.required && <span className="text-red-400">*</span>}
                      </label>
                      <span className="text-[10px] text-muted-foreground uppercase">{q.type}</span>
                    </div>
                    {q.description && (
                      <p className="text-xs text-muted-foreground">{q.description}</p>
                    )}

                    {/* Mock interactive preview controls */}
                    {q.type === 'SHORT_TEXT' && (
                      <input
                        type="text"
                        disabled
                        placeholder="Client single-line response..."
                        className="w-full px-3 py-2 rounded-lg bg-card border border-border text-xs opacity-75"
                      />
                    )}
                    {q.type === 'LONG_TEXT' && (
                      <textarea
                        rows={3}
                        disabled
                        placeholder="Client detailed response..."
                        className="w-full px-3 py-2 rounded-lg bg-card border border-border text-xs opacity-75"
                      />
                    )}
                    {q.type === 'WEIGHT' && (
                      <div className="flex items-center gap-2 max-w-xs">
                        <input
                          type="number"
                          disabled
                          placeholder="e.g. 78.5"
                          className="w-full px-3 py-2 rounded-lg bg-card border border-border text-xs opacity-75"
                        />
                        <span className="text-xs font-semibold px-3 py-2 rounded-lg bg-muted text-foreground">
                          {q.unit || 'kg'}
                        </span>
                      </div>
                    )}
                    {q.type === 'MEASUREMENT' && (
                      <div className="flex items-center gap-2 max-w-xs">
                        <input
                          type="number"
                          disabled
                          placeholder="e.g. 84.0"
                          className="w-full px-3 py-2 rounded-lg bg-card border border-border text-xs opacity-75"
                        />
                        <span className="text-xs font-semibold px-3 py-2 rounded-lg bg-muted text-foreground">
                          {q.unit || 'cm'}
                        </span>
                      </div>
                    )}
                    {q.type === 'RATING' && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {Array.from({ length: q.maxRating || 10 }, (_, i) => i + 1).map(n => (
                          <div
                            key={n}
                            className="w-8 h-8 rounded-lg border border-border bg-card flex items-center justify-center text-xs font-bold text-muted-foreground"
                          >
                            {n}
                          </div>
                        ))}
                      </div>
                    )}
                    {q.type === 'YES_NO' && (
                      <div className="flex gap-2">
                        <div className="px-4 py-2 rounded-lg border border-border bg-card text-xs font-semibold text-muted-foreground">
                          Yes
                        </div>
                        <div className="px-4 py-2 rounded-lg border border-border bg-card text-xs font-semibold text-muted-foreground">
                          No
                        </div>
                      </div>
                    )}
                    {(q.type === 'SINGLE_SELECT' || q.type === 'MULTIPLE_SELECT') && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {(q.options || ['Option A', 'Option B']).map((opt, i) => (
                          <div
                            key={i}
                            className="px-3 py-1.5 rounded-lg border border-border bg-card text-xs text-muted-foreground"
                          >
                            {opt}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-card">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Status:</span>
            <select
              value={status}
              onChange={e => setStatus(e.target.value as any)}
              className="px-2.5 py-1 rounded-md bg-muted border border-border text-xs font-medium text-foreground"
            >
              <option value="ACTIVE">Active (Available for Assignment)</option>
              <option value="DRAFT">Draft (Hidden)</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting || !name.trim()}>
              {isSubmitting ? 'Saving...' : templateToEdit ? 'Update Template' : 'Save & Publish Template'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
