import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ClipboardCheck,
  CheckCircle2,
  Scale,
  Ruler,
  Star,
  Sparkles,
  AlertCircle,
  Save,
  Send,
  HelpCircle
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { useAuthStore } from '../../store/authStore';
import { useTenantStore } from '../../store/tenantStore';
import {
  CheckInRecord,
  CheckInAnswer,
  CheckInQuestion
} from '../../types/accountability';
import {
  getCheckInRecord,
  submitCheckIn,
  saveCheckInDraft
} from '../../lib/accountabilityService';
import { formatReadableDate } from '../../lib/assignmentService';

export default function ClientCheckInForm() {
  const { checkInId } = useParams<{ checkInId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const previewClientId = searchParams.get('asClientId');
  const clientQueryParam = previewClientId ? `?asClientId=${previewClientId}` : '';

  const { user, profile } = useAuthStore();
  const { tenantId, memberData } = useTenantStore();
  const effectiveClientId = previewClientId || memberData?.clientId || profile?.clientId || user?.uid;

  const [checkIn, setCheckIn] = useState<CheckInRecord | null>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [savingDraft, setSavingDraft] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  useEffect(() => {
    async function loadCheckIn() {
      if (!tenantId || !checkInId) return;
      setLoading(true);
      try {
        const record = await getCheckInRecord(tenantId, checkInId);
        if (record) {
          setCheckIn(record);

          // Populate existing answers if any
          const answerMap: Record<string, any> = {};
          (record.answers || []).forEach(a => {
            answerMap[a.questionId] = a.answer;
          });
          setAnswers(answerMap);
        }
      } catch (err) {
        console.error('Failed to load check-in form:', err);
      } finally {
        setLoading(false);
      }
    }
    loadCheckIn();
  }, [tenantId, checkInId]);

  const handleAnswerChange = (questionId: string, value: any) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const handleSaveDraft = async () => {
    if (!tenantId || !checkInId || !checkIn) return;
    setSavingDraft(true);
    try {
      const formattedAnswers: CheckInAnswer[] = (checkIn.questionsSnapshot || []).map(q => {
        const rawAns = answers[q.id];
        return {
          questionId: q.id,
          questionType: q.type,
          questionLabelSnapshot: q.label,
          questionDescriptionSnapshot: q.description,
          answer: rawAns !== undefined ? rawAns : '',
          numericValue:
            q.type === 'WEIGHT' || q.type === 'MEASUREMENT' || q.type === 'NUMBER' || q.type === 'RATING'
              ? Number(rawAns) || undefined
              : undefined,
          unit: q.unit,
          measurementTarget: q.measurementTarget
        };
      });

      await saveCheckInDraft(tenantId, checkInId, formattedAnswers);
      alert('Draft saved successfully.');
    } catch (e: any) {
      console.error('Failed to save draft:', e);
      alert('Error saving draft: ' + (e.message || 'Unknown error'));
    } finally {
      setSavingDraft(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId || !checkInId || !checkIn || !effectiveClientId) return;

    setErrorMsg(null);

    // Validate required questions
    const missingQuestions = (checkIn.questionsSnapshot || []).filter(q => {
      if (!q.required) return false;
      const ans = answers[q.id];
      if (ans === undefined || ans === null || ans === '') return true;
      if (Array.isArray(ans) && ans.length === 0) return true;
      return false;
    });

    if (missingQuestions.length > 0) {
      setErrorMsg(`Please answer all required questions before submitting: "${missingQuestions[0].label}"`);
      return;
    }

    setIsSubmitting(true);
    try {
      const formattedAnswers: CheckInAnswer[] = (checkIn.questionsSnapshot || []).map(q => {
        const rawAns = answers[q.id];
        return {
          questionId: q.id,
          questionType: q.type,
          questionLabelSnapshot: q.label,
          questionDescriptionSnapshot: q.description,
          answer: rawAns !== undefined ? rawAns : '',
          numericValue:
            q.type === 'WEIGHT' || q.type === 'MEASUREMENT' || q.type === 'NUMBER' || q.type === 'RATING'
              ? Number(rawAns) || undefined
              : undefined,
          unit: q.unit,
          measurementTarget: q.measurementTarget
        };
      });

      await submitCheckIn(tenantId, checkInId, formattedAnswers, effectiveClientId);
      setSubmittedSuccess(true);
    } catch (err: any) {
      console.error('Failed to submit check-in:', err);
      setErrorMsg('Error submitting check-in: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-3">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
        <p className="text-sm text-muted-foreground">Loading check-in questionnaire...</p>
      </div>
    );
  }

  if (!checkIn) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto opacity-50" />
        <h2 className="text-lg font-semibold text-foreground">Check-in not found</h2>
        <Button variant="outline" onClick={() => navigate(`/client/accountability${clientQueryParam}`)}>
          Back to Habits & Check-Ins
        </Button>
      </div>
    );
  }

  if (submittedSuccess) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center bg-card rounded-2xl border border-border p-8 space-y-5 shadow-lg">
        <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <div className="space-y-1">
          <h2 className="text-2xl font-bold font-display text-foreground">
            Check-In Submitted!
          </h2>
          <p className="text-sm text-muted-foreground">
            Your accountability check-in has been sent to your coach. Your body weight and measurements have been automatically logged to your progress tracking charts.
          </p>
        </div>
        <Button
          onClick={() => navigate(`/client/accountability${clientQueryParam}`)}
          className="w-full max-w-xs mx-auto"
        >
          Return to Dashboard
        </Button>
      </div>
    );
  }

  const questions = checkIn.questionsSnapshot || [];

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-16">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(`/client/accountability${clientQueryParam}`)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Habits & Check-Ins</span>
        </button>

        <span className="text-xs text-muted-foreground font-medium">
          Due: {formatReadableDate(checkIn.dueDate)}
        </span>
      </div>

      {/* Questionnaire Header Card */}
      <div className="p-6 rounded-2xl bg-card border border-border space-y-2 shadow-xs">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-primary/10 text-primary">
            <ClipboardCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">
              {checkIn.templateName}
            </h1>
            <p className="text-xs text-muted-foreground">
              {questions.length} Questions • Please answer honestly and thoroughly
            </p>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Question Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {questions.map((q, idx) => {
          const currentVal = answers[q.id];

          return (
            <div
              key={q.id || idx}
              className="p-5 rounded-xl bg-card border border-border shadow-xs space-y-3"
            >
              {/* Question Header */}
              <div className="space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <label className="text-sm font-semibold text-foreground leading-snug">
                    <span className="text-primary font-bold mr-1.5">{idx + 1}.</span>
                    {q.label}
                    {q.required && <span className="text-red-400 ml-1">*</span>}
                  </label>
                  {q.type === 'WEIGHT' && (
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500">
                      Auto-syncs
                    </span>
                  )}
                </div>

                {q.description && (
                  <p className="text-xs text-muted-foreground">{q.description}</p>
                )}
              </div>

              {/* Render by Type */}
              <div className="pt-1">
                {/* SHORT TEXT */}
                {q.type === 'SHORT_TEXT' && (
                  <input
                    type="text"
                    required={q.required}
                    value={currentVal || ''}
                    onChange={e => handleAnswerChange(q.id, e.target.value)}
                    placeholder="Your answer..."
                    className="w-full px-3.5 py-2.5 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                )}

                {/* LONG TEXT */}
                {q.type === 'LONG_TEXT' && (
                  <textarea
                    rows={4}
                    required={q.required}
                    value={currentVal || ''}
                    onChange={e => handleAnswerChange(q.id, e.target.value)}
                    placeholder="Provide your reflections, wins, or questions for your coach..."
                    className="w-full px-3.5 py-2.5 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed"
                  />
                )}

                {/* BODY WEIGHT */}
                {q.type === 'WEIGHT' && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 max-w-xs">
                      <div className="relative flex-1">
                        <Scale className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input
                          type="number"
                          step="0.1"
                          min={20}
                          max={300}
                          required={q.required}
                          value={currentVal || ''}
                          onChange={e => handleAnswerChange(q.id, e.target.value)}
                          placeholder="e.g. 78.5"
                          className="w-full pl-9 pr-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                      <span className="px-3 py-2 rounded-lg bg-muted border border-border text-xs font-bold text-foreground">
                        {q.unit || 'kg'}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-emerald-500" />
                      <span>This weight entry will automatically sync to your Body Weight progress chart.</span>
                    </p>
                  </div>
                )}

                {/* BODY MEASUREMENT */}
                {q.type === 'MEASUREMENT' && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 max-w-xs">
                      <div className="relative flex-1">
                        <Ruler className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input
                          type="number"
                          step="0.1"
                          min={10}
                          max={300}
                          required={q.required}
                          value={currentVal || ''}
                          onChange={e => handleAnswerChange(q.id, e.target.value)}
                          placeholder="e.g. 84.0"
                          className="w-full pl-9 pr-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                      <span className="px-3 py-2 rounded-lg bg-muted border border-border text-xs font-bold text-foreground">
                        {q.unit || 'cm'}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Target site: <strong className="text-foreground">{q.measurementTarget || 'Waist'}</strong>. Automatically recorded to measurements history.
                    </p>
                  </div>
                )}

                {/* RATING SCALE */}
                {q.type === 'RATING' && (
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {Array.from({ length: q.maxRating || 10 }, (_, i) => i + 1).map(n => {
                        const isSelected = currentVal === n;
                        return (
                          <button
                            key={n}
                            type="button"
                            onClick={() => handleAnswerChange(q.id, n)}
                            className={`w-10 h-10 rounded-xl border text-sm font-bold transition-all flex items-center justify-center ${
                              isSelected
                                ? 'bg-primary text-primary-foreground border-primary shadow-xs scale-105'
                                : 'bg-card border-border text-foreground hover:bg-accent'
                            }`}
                          >
                            {n}
                          </button>
                        );
                      })}
                    </div>
                    {q.ratingLabels && (
                      <div className="flex justify-between text-[11px] text-muted-foreground px-1">
                        <span>{q.ratingLabels.min}</span>
                        <span>{q.ratingLabels.max}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* YES / NO */}
                {q.type === 'YES_NO' && (
                  <div className="flex gap-3 max-w-xs">
                    <button
                      type="button"
                      onClick={() => handleAnswerChange(q.id, true)}
                      className={`flex-1 py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                        currentVal === true
                          ? 'bg-emerald-500 text-white border-emerald-500 shadow-xs'
                          : 'bg-card border-border text-foreground hover:bg-accent'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Yes</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAnswerChange(q.id, false)}
                      className={`flex-1 py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                        currentVal === false
                          ? 'bg-red-500 text-white border-red-500 shadow-xs'
                          : 'bg-card border-border text-foreground hover:bg-accent'
                      }`}
                    >
                      <span>No</span>
                    </button>
                  </div>
                )}

                {/* SINGLE SELECT */}
                {q.type === 'SINGLE_SELECT' && (
                  <div className="space-y-1.5">
                    {(q.options || []).map((opt, i) => {
                      const isSelected = currentVal === opt;
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleAnswerChange(q.id, opt)}
                          className={`w-full text-left p-3 rounded-lg border text-xs font-medium transition-all flex items-center justify-between ${
                            isSelected
                              ? 'bg-primary/10 border-primary text-primary font-semibold'
                              : 'bg-card border-border text-foreground hover:bg-accent'
                          }`}
                        >
                          <span>{opt}</span>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-primary" />}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* NUMBER */}
                {q.type === 'NUMBER' && (
                  <div className="flex items-center gap-2 max-w-xs">
                    <input
                      type="number"
                      required={q.required}
                      value={currentVal || ''}
                      onChange={e => handleAnswerChange(q.id, e.target.value)}
                      placeholder="Enter number..."
                      className="w-full px-3.5 py-2.5 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    {q.unit && (
                      <span className="px-3 py-2.5 rounded-lg bg-muted border border-border text-xs font-bold text-foreground">
                        {q.unit}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={handleSaveDraft}
            disabled={savingDraft || isSubmitting}
            className="gap-2 text-xs h-10"
          >
            <Save className="w-4 h-4" />
            <span>{savingDraft ? 'Saving Draft...' : 'Save Draft'}</span>
          </Button>

          <Button
            type="submit"
            disabled={isSubmitting || savingDraft}
            className="gap-2 font-semibold h-10 px-6"
          >
            <Send className="w-4 h-4" />
            <span>{isSubmitting ? 'Submitting Check-In...' : 'Submit Check-In'}</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
