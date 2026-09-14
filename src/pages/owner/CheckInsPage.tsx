import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardCheck,
  Plus,
  Inbox,
  Layers,
  Calendar,
  Target,
  AlertCircle,
  Clock,
  CheckCircle2,
  Copy,
  Edit2,
  Trash2,
  Archive,
  RefreshCw,
  Sparkles,
  User,
  ChevronRight
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { useTenantStore } from '../../store/tenantStore';
import { useAuthStore } from '../../store/authStore';
import {
  CheckInTemplate,
  CheckInAssignment,
  CheckInRecord,
  Habit
} from '../../types/accountability';
import {
  fetchCheckInTemplates,
  fetchCheckInAssignments,
  fetchCoachCheckInInbox,
  fetchCoachAccountabilityInsights,
  duplicateCheckInTemplate,
  updateCheckInTemplate,
  updateCheckInAssignmentStatus,
  AccountabilityAttentionInsight
} from '../../lib/accountabilityService';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { CheckInInboxList } from '../../components/accountability/CheckInInboxList';
import { HabitsMonitoringGrid } from '../../components/accountability/HabitsMonitoringGrid';
import { TemplateBuilderModal } from '../../components/accountability/TemplateBuilderModal';
import { AssignCheckInModal } from '../../components/accountability/AssignCheckInModal';
import { AssignHabitModal } from '../../components/accountability/AssignHabitModal';
import { formatReadableDate } from '../../lib/assignmentService';

export default function CheckInsPage() {
  const navigate = useNavigate();
  const { tenantId } = useTenantStore();
  const { user, profile } = useAuthStore();

  const [activeTab, setActiveTab] = useState<'INBOX' | 'TEMPLATES' | 'ASSIGNMENTS' | 'HABITS'>('INBOX');
  const [checkIns, setCheckIns] = useState<CheckInRecord[]>([]);
  const [templates, setTemplates] = useState<CheckInTemplate[]>([]);
  const [assignments, setAssignments] = useState<CheckInAssignment[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([]);
  const [insights, setInsights] = useState<AccountabilityAttentionInsight[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [templateToEdit, setTemplateToEdit] = useState<CheckInTemplate | null>(null);

  const [isAssignCheckInModalOpen, setIsAssignCheckInModalOpen] = useState(false);
  const [preselectedTemplateId, setPreselectedTemplateId] = useState<string | undefined>(undefined);

  const [isAssignHabitModalOpen, setIsAssignHabitModalOpen] = useState(false);
  const [habitToEdit, setHabitToEdit] = useState<Habit | null>(null);

  const loadAllData = async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const [inboxList, tmplList, assignList, habitsSnap, clientsSnap, insightList] = await Promise.all([
        fetchCoachCheckInInbox(tenantId),
        fetchCheckInTemplates(tenantId),
        fetchCheckInAssignments(tenantId),
        getDocs(collection(db, 'tenants', tenantId, 'habits')),
        getDocs(query(collection(db, 'tenants', tenantId, 'clients'), where('status', '==', 'ACTIVE'))),
        fetchCoachAccountabilityInsights(tenantId)
      ]);

      setCheckIns(inboxList);
      setTemplates(tmplList);
      setAssignments(assignList);
      setHabits(habitsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Habit)));
      setClients(clientsSnap.docs.map(d => {
        const dt = d.data();
        return { id: d.id, name: `${dt.firstName || ''} ${dt.lastName || ''}`.trim() || 'Client' };
      }));
      setInsights(insightList);
    } catch (err) {
      console.error('Failed to load accountability data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [tenantId]);

  const handleDuplicateTemplate = async (templateId: string) => {
    if (!tenantId) return;
    try {
      const coachName = profile ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim() : 'Coach';
      await duplicateCheckInTemplate(tenantId, templateId, user?.uid || 'coach', coachName);
      loadAllData();
    } catch (e) {
      console.error('Failed to duplicate template:', e);
    }
  };

  const handleArchiveTemplate = async (templateId: string) => {
    if (!tenantId || !confirm('Are you sure you want to archive this template?')) return;
    try {
      await updateCheckInTemplate(tenantId, templateId, { status: 'ARCHIVED' });
      loadAllData();
    } catch (e) {
      console.error('Failed to archive template:', e);
    }
  };

  const handleToggleAssignmentStatus = async (assignmentId: string, currentStatus: string) => {
    if (!tenantId) return;
    const newStatus = currentStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    try {
      await updateCheckInAssignmentStatus(tenantId, assignmentId, newStatus as any);
      loadAllData();
    } catch (e) {
      console.error('Failed to update assignment status:', e);
    }
  };

  const pendingReviewCount = checkIns.filter(c => c.status === 'SUBMITTED').length;
  const overdueCount = checkIns.filter(c => c.status === 'OVERDUE').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold font-display tracking-tight text-foreground">
              Check-Ins & Accountability
            </h1>
            <div className="h-2 w-2 rounded-full bg-primary" />
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Client questionnaires, recurring check-in schedules, daily habits, and coach reviews
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={loadAllData}
            className="gap-1.5 text-xs h-9"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>

          <Button
            size="sm"
            onClick={() => {
              setTemplateToEdit(null);
              setIsTemplateModalOpen(true);
            }}
            variant="outline"
            className="gap-1.5 text-xs h-9"
          >
            <Layers className="w-3.5 h-3.5 text-primary" />
            <span>New Template</span>
          </Button>

          <Button
            size="sm"
            onClick={() => {
              setPreselectedTemplateId(undefined);
              setIsAssignCheckInModalOpen(true);
            }}
            className="gap-1.5 text-xs h-9"
          >
            <ClipboardCheck className="w-3.5 h-3.5" />
            <span>Assign Check-In</span>
          </Button>
        </div>
      </div>

      {/* Attention Insights / Alerts Strip */}
      {insights.length > 0 && (
        <div className="p-4 rounded-xl bg-card border border-border space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                Accountability Insights & Action Items ({insights.length})
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {insights.slice(0, 3).map(ins => (
              <div
                key={ins.id}
                onClick={() => {
                  if (ins.actionUrl) navigate(ins.actionUrl);
                }}
                className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 transition-all cursor-pointer hover:border-primary/50 ${
                  ins.severity === 'critical'
                    ? 'border-red-500/30 bg-red-500/5'
                    : ins.severity === 'warning'
                    ? 'border-amber-500/30 bg-amber-500/5'
                    : 'border-primary/30 bg-primary/5'
                }`}
              >
                {ins.severity === 'critical' ? (
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                ) : ins.severity === 'warning' ? (
                  <Clock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                )}
                <div className="min-w-0 space-y-0.5">
                  <span className="font-semibold text-foreground block truncate">
                    {ins.title}
                  </span>
                  <p className="text-muted-foreground line-clamp-2 text-[11px]">
                    {ins.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex border-b border-border space-x-6 text-sm font-medium">
        <button
          onClick={() => setActiveTab('INBOX')}
          className={`pb-3 flex items-center gap-2 transition-all relative ${
            activeTab === 'INBOX'
              ? 'text-primary border-b-2 border-primary font-semibold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Inbox className="w-4 h-4" />
          <span>Coach Inbox</span>
          {pendingReviewCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px] font-bold">
              {pendingReviewCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('TEMPLATES')}
          className={`pb-3 flex items-center gap-2 transition-all relative ${
            activeTab === 'TEMPLATES'
              ? 'text-primary border-b-2 border-primary font-semibold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Questionnaire Templates ({templates.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('ASSIGNMENTS')}
          className={`pb-3 flex items-center gap-2 transition-all relative ${
            activeTab === 'ASSIGNMENTS'
              ? 'text-primary border-b-2 border-primary font-semibold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Active Schedules ({assignments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('HABITS')}
          className={`pb-3 flex items-center gap-2 transition-all relative ${
            activeTab === 'HABITS'
              ? 'text-primary border-b-2 border-primary font-semibold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Target className="w-4 h-4" />
          <span>Habits Tracker ({habits.length})</span>
        </button>
      </div>

      {/* TAB CONTENT: INBOX */}
      {activeTab === 'INBOX' && (
        <CheckInInboxList
          checkIns={checkIns}
          loading={loading}
          onRefresh={loadAllData}
          onOpenAssignModal={() => setIsAssignCheckInModalOpen(true)}
        />
      )}

      {/* TAB CONTENT: TEMPLATES */}
      {activeTab === 'TEMPLATES' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-foreground">
                Questionnaire Templates
              </h3>
              <p className="text-xs text-muted-foreground">
                Standard and custom questionnaires that can be scheduled to athletes
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setTemplateToEdit(null);
                setIsTemplateModalOpen(true);
              }}
              className="gap-1.5 text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Template</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map(tmpl => (
              <div
                key={tmpl.id}
                className="p-5 rounded-xl bg-card border border-border hover:border-primary/40 transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase">
                      {tmpl.frequency}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDuplicateTemplate(tmpl.id)}
                        className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
                        title="Duplicate Template"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setTemplateToEdit(tmpl);
                          setIsTemplateModalOpen(true);
                        }}
                        className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
                        title="Edit Template"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleArchiveTemplate(tmpl.id)}
                        className="p-1 rounded text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                        title="Archive Template"
                      >
                        <Archive className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h4 className="text-base font-semibold text-foreground mt-2">
                    {tmpl.name}
                  </h4>
                  {tmpl.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                      {tmpl.description}
                    </p>
                  )}

                  {/* Questions breakdown */}
                  <div className="mt-4 pt-3 border-t border-border space-y-1.5">
                    <span className="text-xs font-medium text-foreground">
                      {tmpl.questions.length} Questions included:
                    </span>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      {tmpl.questions.slice(0, 3).map((q, idx) => (
                        <li key={idx} className="flex items-center gap-1.5 truncate">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                          <span className="truncate">{q.label}</span>
                        </li>
                      ))}
                      {tmpl.questions.length > 3 && (
                        <li className="text-[11px] text-muted-foreground font-medium pl-3">
                          +{tmpl.questions.length - 3} more questions
                        </li>
                      )}
                    </ul>
                  </div>
                </div>

                <div className="pt-3 border-t border-border flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">
                    {tmpl.assignedClientCount || 0} Clients active
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setPreselectedTemplateId(tmpl.id);
                      setIsAssignCheckInModalOpen(true);
                    }}
                    className="h-7 text-xs px-2.5"
                  >
                    Assign to Client
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT: ASSIGNMENTS */}
      {activeTab === 'ASSIGNMENTS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-foreground">
                Active Check-In Schedules
              </h3>
              <p className="text-xs text-muted-foreground">
                Automated recurring check-ins assigned to individual athletes
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setPreselectedTemplateId(undefined);
                setIsAssignCheckInModalOpen(true);
              }}
              className="gap-1.5 text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Assign Check-In</span>
            </Button>
          </div>

          {assignments.length === 0 ? (
            <div className="py-16 text-center bg-card rounded-xl border border-dashed border-border p-8 space-y-3">
              <Calendar className="w-10 h-10 text-muted-foreground mx-auto opacity-40" />
              <h3 className="text-base font-semibold text-foreground">No Active Check-In Schedules</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Set up automated weekly or monthly check-in cadences for your athletes.
              </p>
              <Button onClick={() => setIsAssignCheckInModalOpen(true)} size="sm" className="mt-2">
                Assign First Schedule
              </Button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {assignments.map(item => (
                <div
                  key={item.id}
                  className="p-4 rounded-xl bg-card border border-border flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center font-bold text-sm text-primary">
                      {(item.clientName || 'A')[0]}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-foreground">
                          {item.clientName || 'Athlete'}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          item.status === 'ACTIVE'
                            ? 'bg-emerald-500/10 text-emerald-500'
                            : 'bg-amber-500/10 text-amber-500'
                        }`}>
                          {item.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        <span className="font-medium text-foreground/80">{item.templateName}</span>
                        <span>•</span>
                        <span>Every {item.frequency === 'WEEKLY' ? `${item.dayOfWeek || 'Sunday'}` : item.frequency.toLowerCase()}</span>
                        <span>•</span>
                        <span>Started {formatReadableDate(item.startDate)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-auto">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleToggleAssignmentStatus(item.id, item.status)}
                      className="h-8 text-xs px-3"
                    >
                      {item.status === 'ACTIVE' ? 'Pause Schedule' : 'Resume Schedule'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: HABITS */}
      {activeTab === 'HABITS' && (
        <HabitsMonitoringGrid
          tenantId={tenantId!}
          habits={habits}
          clients={clients}
          loading={loading}
          onOpenAssignModal={cId => {
            setHabitToEdit(null);
            setIsAssignHabitModalOpen(true);
          }}
          onEditHabit={h => {
            setHabitToEdit(h);
            setIsAssignHabitModalOpen(true);
          }}
          onRefresh={loadAllData}
        />
      )}

      {/* Template Builder Modal */}
      {tenantId && (
        <TemplateBuilderModal
          tenantId={tenantId}
          templateToEdit={templateToEdit}
          isOpen={isTemplateModalOpen}
          onClose={() => setIsTemplateModalOpen(false)}
          onSaved={() => {
            setIsTemplateModalOpen(false);
            loadAllData();
          }}
        />
      )}

      {/* Assign Check-In Modal */}
      {tenantId && (
        <AssignCheckInModal
          tenantId={tenantId}
          isOpen={isAssignCheckInModalOpen}
          preselectedTemplateId={preselectedTemplateId}
          onClose={() => setIsAssignCheckInModalOpen(false)}
          onAssigned={() => {
            setIsAssignCheckInModalOpen(false);
            loadAllData();
          }}
        />
      )}

      {/* Assign Habit Modal */}
      {tenantId && (
        <AssignHabitModal
          tenantId={tenantId}
          isOpen={isAssignHabitModalOpen}
          habitToEdit={habitToEdit}
          onClose={() => setIsAssignHabitModalOpen(false)}
          onSaved={() => {
            setIsAssignHabitModalOpen(false);
            loadAllData();
          }}
        />
      )}
    </div>
  );
}
