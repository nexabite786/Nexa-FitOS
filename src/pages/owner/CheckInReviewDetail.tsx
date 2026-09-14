import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Dumbbell,
  Scale,
  Ruler,
  Star,
  MessageSquare,
  User,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  Save,
  Send
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { useTenantStore } from '../../store/tenantStore';
import { useAuthStore } from '../../store/authStore';
import { CheckInRecord } from '../../types/accountability';
import { getCheckInRecord, reviewCheckIn } from '../../lib/accountabilityService';
import { formatReadableDate } from '../../lib/assignmentService';

const QUICK_FEEDBACK_SNIPPETS = [
  'Fantastic work this week! Your consistency and effort really show.',
  'Great adherence to your workout routine. Let’s focus on hitting water targets next week.',
  'Noticed energy was a bit low—make sure you prioritize 7-8 hours of quality sleep this weekend.',
  'Weight and measurements are tracking right on target! Keep up the momentum.',
  'Good job navigating this week’s challenges. Let’s dial in meal prep for the upcoming days.'
];

export default function CheckInReviewDetail() {
  const { checkInId } = useParams<{ checkInId: string }>();
  const navigate = useNavigate();
  const { tenantId } = useTenantStore();
  const { user, profile } = useAuthStore();

  const [checkIn, setCheckIn] = useState<CheckInRecord | null>(null);
  const [coachNote, setCoachNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    async function loadCheckIn() {
      if (!tenantId || !checkInId) return;
      setLoading(true);
      try {
        const record = await getCheckInRecord(tenantId, checkInId);
        if (record) {
          setCheckIn(record);
          setCoachNote(record.coachNote || '');
        }
      } catch (err) {
        console.error('Failed to load check-in detail:', err);
      } finally {
        setLoading(false);
      }
    }
    loadCheckIn();
  }, [tenantId, checkInId]);

  const handleSaveReview = async () => {
    if (!tenantId || !checkInId) return;
    setSaving(true);
    try {
      const coachName = profile
        ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim()
        : 'Coach';
      await reviewCheckIn(
        tenantId,
        checkInId,
        coachNote,
        user?.uid || 'coach',
        coachName
      );

      setSavedSuccess(true);
      if (checkIn) {
        setCheckIn({
          ...checkIn,
          status: 'REVIEWED',
          coachNote,
          reviewedAt: new Date().toISOString(),
          reviewedByName: coachName
        });
      }
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (err: any) {
      console.error('Failed to save review:', err);
      alert('Error saving review: ' + (err.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center space-y-3">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
        <p className="text-sm text-muted-foreground">Loading check-in submission...</p>
      </div>
    );
  }

  if (!checkIn) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto opacity-50" />
        <h2 className="text-lg font-semibold text-foreground">Check-in not found</h2>
        <Button variant="outline" onClick={() => navigate('/owner/check-ins')}>
          Back to Check-Ins Inbox
        </Button>
      </div>
    );
  }

  const isReviewed = checkIn.status === 'REVIEWED';
  const isSubmitted = checkIn.status === 'SUBMITTED';

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/owner/check-ins')}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Check-Ins Inbox</span>
        </button>

        <div className="flex items-center gap-2">
          {isReviewed && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Reviewed by {checkIn.reviewedByName || 'Coach'}
            </span>
          )}
          {isSubmitted && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 text-xs font-semibold">
              <Clock className="w-3.5 h-3.5" />
              Awaiting Coach Review
            </span>
          )}
        </div>
      </div>

      {/* Main Client & Check-In Summary Header Card */}
      <div className="p-6 rounded-xl bg-card border border-border space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center font-bold text-base text-primary">
              {(checkIn.clientName || 'A')[0]}
            </div>
            <div>
              <h1 className="text-xl font-bold font-display text-foreground">
                {checkIn.clientName || 'Athlete'}
              </h1>
              <p className="text-xs text-muted-foreground">
                {checkIn.templateName} • Due: {formatReadableDate(checkIn.dueDate)}
              </p>
            </div>
          </div>

          <div className="text-right text-xs text-muted-foreground">
            {checkIn.submittedAt ? (
              <p>
                Submitted on{' '}
                <strong className="text-foreground font-medium">
                  {new Date(checkIn.submittedAt).toLocaleDateString()} at{' '}
                  {new Date(checkIn.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </strong>
              </p>
            ) : (
              <p>Not submitted yet (Status: {checkIn.status})</p>
            )}
          </div>
        </div>

        {/* Adherence Snapshot Bar */}
        {checkIn.adherenceSnapshot && (
          <div className="pt-4 border-t border-border grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Workout Adherence */}
            <div className="p-3 rounded-lg bg-background border border-border space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Dumbbell className="w-3.5 h-3.5 text-primary" />
                <span>Workouts (7d)</span>
              </div>
              <p className="text-base font-bold text-foreground">
                {checkIn.adherenceSnapshot.workoutAdherencePercent !== null
                  ? `${checkIn.adherenceSnapshot.workoutAdherencePercent}%`
                  : `${checkIn.adherenceSnapshot.workoutsCompleted} completed`}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {checkIn.adherenceSnapshot.workoutsCompleted} of {checkIn.adherenceSnapshot.workoutsScheduled} done
              </p>
            </div>

            {/* Body Weight Logged */}
            {checkIn.adherenceSnapshot.weightLogged && (
              <div className="p-3 rounded-lg bg-background border border-border space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Scale className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Check-In Weight</span>
                </div>
                <p className="text-base font-bold text-foreground">
                  {checkIn.adherenceSnapshot.weightLogged.weight} {checkIn.adherenceSnapshot.weightLogged.unit}
                </p>
                {checkIn.adherenceSnapshot.weightLogged.delta !== undefined && (
                  <p className={`text-[11px] font-medium ${
                    checkIn.adherenceSnapshot.weightLogged.delta > 0 ? 'text-amber-400' : 'text-emerald-400'
                  }`}>
                    {checkIn.adherenceSnapshot.weightLogged.delta > 0 ? `+${checkIn.adherenceSnapshot.weightLogged.delta}` : checkIn.adherenceSnapshot.weightLogged.delta} {checkIn.adherenceSnapshot.weightLogged.unit} vs last
                  </p>
                )}
              </div>
            )}

            {/* Measurements Logged */}
            {checkIn.adherenceSnapshot.measurementsLogged && checkIn.adherenceSnapshot.measurementsLogged.length > 0 && (
              <div className="p-3 rounded-lg bg-background border border-border space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Ruler className="w-3.5 h-3.5 text-sky-500" />
                  <span>Measurements</span>
                </div>
                <p className="text-base font-bold text-foreground">
                  {checkIn.adherenceSnapshot.measurementsLogged[0].value} {checkIn.adherenceSnapshot.measurementsLogged[0].unit}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {checkIn.adherenceSnapshot.measurementsLogged[0].targetLabel}
                </p>
              </div>
            )}

            {/* Auto sync confirmation */}
            <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-emerald-500 font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Auto-Synced</span>
              </div>
              <p className="text-[11px] text-muted-foreground pt-1">
                Metrics automatically synced to client progress charts.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Questionnaire Responses Section */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
          <span>Client Responses</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
            {checkIn.answers.length} Answered
          </span>
        </h2>

        {checkIn.answers.length === 0 ? (
          <div className="p-8 text-center bg-card rounded-xl border border-dashed border-border text-sm text-muted-foreground">
            No answers recorded for this check-in yet.
          </div>
        ) : (
          <div className="space-y-3">
            {checkIn.answers.map((ans, idx) => (
              <div
                key={ans.questionId || idx}
                className="p-5 rounded-xl bg-card border border-border space-y-2.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-primary mr-2">Q{idx + 1}</span>
                    <span className="text-sm font-semibold text-foreground">
                      {ans.questionLabelSnapshot}
                    </span>
                    {ans.questionDescriptionSnapshot && (
                      <p className="text-xs text-muted-foreground">
                        {ans.questionDescriptionSnapshot}
                      </p>
                    )}
                  </div>
                  <span className="text-[10px] uppercase px-2 py-0.5 rounded bg-muted text-muted-foreground font-semibold shrink-0">
                    {ans.questionType.replace('_', ' ')}
                  </span>
                </div>

                {/* Formatted Answer Rendering */}
                <div className="pt-2">
                  {ans.questionType === 'RATING' && (
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold text-base">
                        {ans.answer}
                      </div>
                      <span className="text-xs text-muted-foreground">out of 10</span>
                    </div>
                  )}

                  {ans.questionType === 'WEIGHT' && (
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-sm font-bold">
                      <Scale className="w-4 h-4" />
                      <span>{ans.numericValue} {ans.unit || 'kg'}</span>
                    </div>
                  )}

                  {ans.questionType === 'MEASUREMENT' && (
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-500 text-sm font-bold">
                      <Ruler className="w-4 h-4" />
                      <span>{ans.numericValue} {ans.unit || 'cm'}</span>
                      {ans.measurementTarget && (
                        <span className="text-xs font-normal text-muted-foreground">({ans.measurementTarget})</span>
                      )}
                    </div>
                  )}

                  {ans.questionType === 'YES_NO' && (
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                      ans.answer === true || ans.answer === 'Yes'
                        ? 'bg-emerald-500/10 text-emerald-500'
                        : 'bg-red-500/10 text-red-500'
                    }`}>
                      {ans.answer === true || ans.answer === 'Yes' ? 'Yes' : 'No'}
                    </span>
                  )}

                  {(ans.questionType === 'SHORT_TEXT' || ans.questionType === 'LONG_TEXT') && (
                    <div className="p-3.5 rounded-lg bg-background border border-border text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                      {ans.answer ? String(ans.answer) : <em className="text-muted-foreground">No response provided</em>}
                    </div>
                  )}

                  {ans.questionType === 'SINGLE_SELECT' && (
                    <span className="px-3 py-1 rounded-lg bg-accent text-accent-foreground text-xs font-medium">
                      {String(ans.answer)}
                    </span>
                  )}

                  {ans.questionType === 'MULTIPLE_SELECT' && (
                    <div className="flex flex-wrap gap-1.5">
                      {Array.isArray(ans.answer) ? (
                        ans.answer.map((item, i) => (
                          <span key={i} className="px-2.5 py-1 rounded-md bg-accent text-accent-foreground text-xs font-medium">
                            {item}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-foreground">{String(ans.answer)}</span>
                      )}
                    </div>
                  )}

                  {ans.questionType === 'NUMBER' && (
                    <span className="text-base font-bold text-foreground">
                      {ans.numericValue ?? ans.answer} {ans.unit || ''}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Coach Feedback & Review Section */}
      <div className="p-6 rounded-xl bg-card border border-primary/30 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            <h3 className="text-base font-semibold text-foreground">
              Coach Review & Athlete Feedback
            </h3>
          </div>
          {savedSuccess && (
            <span className="text-xs text-emerald-500 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Feedback Saved & Sent!
            </span>
          )}
        </div>

        {/* Quick Feedback Presets */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase">
            Quick Feedback Suggestions:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_FEEDBACK_SNIPPETS.map((snippet, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCoachNote(prev => prev ? `${prev}\n\n${snippet}` : snippet)}
                className="text-left px-2.5 py-1 rounded-md bg-muted/60 hover:bg-accent border border-border text-[11px] text-muted-foreground hover:text-foreground transition-all"
              >
                + {snippet.substring(0, 45)}...
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Coach Feedback Message (Visible to Client in their App)
          </label>
          <textarea
            rows={5}
            value={coachNote}
            onChange={e => setCoachNote(e.target.value)}
            placeholder="Write constructive coaching notes, celebrate weekly wins, adjust training volume or calorie targets..."
            className="w-full px-3.5 py-2.5 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed"
          />
        </div>

        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            {checkIn.reviewedAt
              ? `Last updated: ${new Date(checkIn.reviewedAt).toLocaleDateString()}`
              : 'Submitting feedback marks this check-in as Reviewed.'}
          </p>

          <Button
            onClick={handleSaveReview}
            disabled={saving || !coachNote.trim()}
            className="gap-2 text-xs"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{saving ? 'Saving...' : 'Send Coach Feedback'}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
