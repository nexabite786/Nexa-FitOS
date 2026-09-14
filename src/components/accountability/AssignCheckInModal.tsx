import React, { useState, useEffect } from 'react';
import { X, Calendar, User, ClipboardCheck, Sparkles, Check } from 'lucide-react';
import { Button } from '../ui/button';
import { CheckInTemplate, CheckInFrequency } from '../../types/accountability';
import { assignCheckInTemplate, fetchCheckInTemplates } from '../../lib/accountabilityService';
import { useAuthStore } from '../../store/authStore';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { formatDateToYMD } from '../../lib/assignmentService';

interface AssignCheckInModalProps {
  tenantId: string;
  isOpen: boolean;
  onClose: () => void;
  preselectedClientId?: string;
  preselectedTemplateId?: string;
  onAssigned: () => void;
}

const DAYS_OF_WEEK = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday'
];

export function AssignCheckInModal({
  tenantId,
  isOpen,
  onClose,
  preselectedClientId,
  preselectedTemplateId,
  onAssigned
}: AssignCheckInModalProps) {
  const { user, profile } = useAuthStore();
  const [clients, setClients] = useState<Array<{ id: string; name: string; email: string; trainerId?: string }>>([]);
  const [templates, setTemplates] = useState<CheckInTemplate[]>([]);
  const [selectedClientId, setSelectedClientId] = useState(preselectedClientId || '');
  const [selectedTemplateId, setSelectedTemplateId] = useState(preselectedTemplateId || '');
  const [frequency, setFrequency] = useState<CheckInFrequency>('WEEKLY');
  const [customDaysInterval, setCustomDaysInterval] = useState(7);
  const [startDate, setStartDate] = useState(formatDateToYMD(new Date()));
  const [dayOfWeek, setDayOfWeek] = useState('Sunday');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (!tenantId || !isOpen) return;
      setLoading(true);
      try {
        const [cSnap, tmpls] = await Promise.all([
          getDocs(query(collection(db, 'tenants', tenantId, 'clients'), where('status', '==', 'ACTIVE'))),
          fetchCheckInTemplates(tenantId)
        ]);

        const clientList = cSnap.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            name: `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Client',
            email: data.email || '',
            trainerId: data.trainerId
          };
        });

        setClients(clientList);
        setTemplates(tmpls.filter(t => t.status === 'ACTIVE'));

        if (!selectedClientId && clientList.length > 0) {
          setSelectedClientId(preselectedClientId || clientList[0].id);
        }
        if (!selectedTemplateId && tmpls.length > 0) {
          const defaultTmpl = preselectedTemplateId
            ? tmpls.find(t => t.id === preselectedTemplateId)
            : tmpls[0];
          if (defaultTmpl) {
            setSelectedTemplateId(defaultTmpl.id);
            setFrequency(defaultTmpl.frequency);
          }
        }
      } catch (err) {
        console.error('Failed to load assignment dialog data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [tenantId, isOpen, preselectedClientId, preselectedTemplateId]);

  // When template selection changes, default its frequency
  const handleTemplateChange = (tmplId: string) => {
    setSelectedTemplateId(tmplId);
    const tmpl = templates.find(t => t.id === tmplId);
    if (tmpl) {
      setFrequency(tmpl.frequency);
      if (tmpl.customDaysInterval) setCustomDaysInterval(tmpl.customDaysInterval);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId || !selectedTemplateId) return;

    const chosenClient = clients.find(c => c.id === selectedClientId);
    const chosenTemplate = templates.find(t => t.id === selectedTemplateId);

    if (!chosenClient || !chosenTemplate) return;

    setIsSubmitting(true);
    try {
      const coachName = profile ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim() : 'Coach';

      await assignCheckInTemplate(
        tenantId,
        {
          templateId: chosenTemplate.id,
          templateName: chosenTemplate.name,
          templateVersion: chosenTemplate.version || 1,
          clientId: chosenClient.id,
          clientName: chosenClient.name,
          clientEmail: chosenClient.email,
          trainerId: chosenClient.trainerId,
          frequency,
          customDaysInterval: frequency === 'CUSTOM' ? customDaysInterval : undefined,
          startDate,
          endDate: endDate.trim() ? endDate : undefined,
          dayOfWeek,
          questionsSnapshot: chosenTemplate.questions
        },
        user?.uid || 'coach',
        coachName
      );

      onAssigned();
      onClose();
    } catch (err: any) {
      console.error('Failed to assign check-in:', err);
      alert('Error assigning check-in: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedTmpl = templates.find(t => t.id === selectedTemplateId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg my-8 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Assign Check-In Schedule</h2>
              <p className="text-xs text-muted-foreground">
                Set recurring accountability check-ins for a client
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {loading ? (
            <div className="py-12 text-center text-sm text-muted-foreground animate-pulse">
              Loading clients & templates...
            </div>
          ) : (
            <>
              {/* Client Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Select Athlete / Client *
                </label>
                <select
                  required
                  value={selectedClientId}
                  onChange={e => setSelectedClientId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {clients.length === 0 ? (
                    <option value="">No active clients found</option>
                  ) : (
                    clients.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.email})
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Template Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Select Questionnaire Template *
                </label>
                <select
                  required
                  value={selectedTemplateId}
                  onChange={e => handleTemplateChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {templates.length === 0 ? (
                    <option value="">No active templates available (create one first)</option>
                  ) : (
                    templates.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.questions.length} questions • {t.frequency})
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Selected Template Highlights */}
              {selectedTmpl && (
                <div className="p-3 rounded-lg bg-muted/40 border border-border text-xs space-y-1">
                  <div className="flex items-center justify-between font-medium text-foreground">
                    <span>{selectedTmpl.questions.length} Questions</span>
                    <span className="text-primary uppercase font-bold">{frequency}</span>
                  </div>
                  <p className="text-muted-foreground line-clamp-2">
                    {selectedTmpl.description || 'Standard check-in form questions.'}
                  </p>
                </div>
              )}

              {/* Frequency & Cadence */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Frequency
                  </label>
                  <select
                    value={frequency}
                    onChange={e => setFrequency(e.target.value as CheckInFrequency)}
                    className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="WEEKLY">Weekly</option>
                    <option value="BIWEEKLY">Bi-Weekly (14 days)</option>
                    <option value="MONTHLY">Monthly</option>
                    <option value="CUSTOM">Custom Interval</option>
                  </select>
                </div>

                {frequency === 'WEEKLY' ? (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Check-In Day
                    </label>
                    <select
                      value={dayOfWeek}
                      onChange={e => setDayOfWeek(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      {DAYS_OF_WEEK.map(d => (
                        <option key={d} value={d}>
                          Every {d}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : frequency === 'CUSTOM' ? (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Days Interval
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
                ) : (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Target Window
                    </label>
                    <div className="px-3 py-2 rounded-lg bg-muted text-xs text-muted-foreground">
                      Every {frequency === 'BIWEEKLY' ? '14 Days' : 'Month'}
                    </div>
                  </div>
                )}
              </div>

              {/* Start & Optional End Date */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    First Check-In Due Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    End Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
            </>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Button variant="ghost" type="button" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || loading || !selectedClientId || !selectedTemplateId}>
              {isSubmitting ? 'Assigning...' : 'Assign Schedule'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
