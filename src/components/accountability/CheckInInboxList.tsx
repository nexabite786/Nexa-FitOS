import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Inbox,
  AlertCircle,
  CheckCircle2,
  Clock,
  ChevronRight,
  Search,
  Filter,
  Calendar,
  Scale,
  Dumbbell,
  Apple,
  MessageSquare
} from 'lucide-react';
import { CheckInRecord, CheckInStatus } from '../../types/accountability';
import { Button } from '../ui/button';
import { formatReadableDate } from '../../lib/assignmentService';

interface CheckInInboxListProps {
  checkIns: CheckInRecord[];
  loading: boolean;
  onRefresh: () => void;
  onOpenAssignModal: () => void;
}

export function CheckInInboxList({
  checkIns,
  loading,
  onRefresh,
  onOpenAssignModal
}: CheckInInboxListProps) {
  const navigate = useNavigate();
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCheckIns = checkIns.filter(item => {
    // Status filter
    if (filterStatus === 'SUBMITTED' && item.status !== 'SUBMITTED') return false;
    if (filterStatus === 'OVERDUE' && item.status !== 'OVERDUE') return false;
    if (filterStatus === 'REVIEWED' && item.status !== 'REVIEWED') return false;
    if (filterStatus === 'DUE' && item.status !== 'DUE' && item.status !== 'DRAFT') return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchClient = (item.clientName || '').toLowerCase().includes(q);
      const matchTemplate = (item.templateName || '').toLowerCase().includes(q);
      return matchClient || matchTemplate;
    }

    return true;
  });

  const submittedCount = checkIns.filter(c => c.status === 'SUBMITTED').length;
  const overdueCount = checkIns.filter(c => c.status === 'OVERDUE').length;

  return (
    <div className="space-y-4">
      {/* Top Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs">
          <button
            onClick={() => setFilterStatus('ALL')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              filterStatus === 'ALL'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            All ({checkIns.length})
          </button>
          <button
            onClick={() => setFilterStatus('SUBMITTED')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
              filterStatus === 'SUBMITTED'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Needs Review</span>
            {submittedCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-white text-amber-600 text-[10px] font-bold flex items-center justify-center">
                {submittedCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setFilterStatus('OVERDUE')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
              filterStatus === 'OVERDUE'
                ? 'bg-red-500 text-white shadow-xs'
                : 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Overdue</span>
            {overdueCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-white text-red-600 text-[10px] font-bold flex items-center justify-center">
                {overdueCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setFilterStatus('REVIEWED')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
              filterStatus === 'REVIEWED'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Reviewed</span>
          </button>
          <button
            onClick={() => setFilterStatus('DUE')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              filterStatus === 'DUE'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            Upcoming / Due
          </button>
        </div>

        {/* Search */}
        <div className="relative min-w-[220px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search athlete or check-in..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Check-ins List */}
      {loading ? (
        <div className="py-16 text-center text-sm text-muted-foreground animate-pulse">
          Loading check-in inbox...
        </div>
      ) : filteredCheckIns.length === 0 ? (
        <div className="py-16 text-center bg-card rounded-xl border border-dashed border-border p-8 space-y-3">
          <Inbox className="w-10 h-10 text-muted-foreground mx-auto opacity-40" />
          <h3 className="text-base font-semibold text-foreground">No Check-Ins in this View</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {filterStatus === 'SUBMITTED'
              ? 'Great job! All submitted client check-ins have been reviewed.'
              : filterStatus === 'OVERDUE'
              ? 'No overdue check-ins found.'
              : 'Assign a check-in template to your athletes to start receiving accountability logs.'}
          </p>
          {checkIns.length === 0 && (
            <Button onClick={onOpenAssignModal} size="sm" className="mt-2">
              Assign First Check-In
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredCheckIns.map(item => {
            const isSubmitted = item.status === 'SUBMITTED';
            const isOverdue = item.status === 'OVERDUE';
            const isReviewed = item.status === 'REVIEWED';
            const isDue = item.status === 'DUE' || item.status === 'DRAFT';

            const initials = (item.clientName || 'A')
              .split(' ')
              .map(n => n[0])
              .join('')
              .toUpperCase()
              .substring(0, 2);

            return (
              <div
                key={item.id}
                onClick={() => navigate(`/owner/check-ins/${item.id}`)}
                className={`p-4 rounded-xl border bg-card transition-all cursor-pointer hover:border-primary/50 hover:shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  isSubmitted
                    ? 'border-amber-500/40 bg-amber-500/[0.02]'
                    : isOverdue
                    ? 'border-red-500/40 bg-red-500/[0.02]'
                    : 'border-border'
                }`}
              >
                {/* Left: Client & Meta */}
                <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center font-bold text-sm text-primary shrink-0">
                    {initials}
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-foreground text-sm hover:underline truncate">
                        {item.clientName || 'Athlete'}
                      </span>
                      
                      {/* Status Badge */}
                      {isSubmitted && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 text-[11px] font-semibold">
                          <Clock className="w-3 h-3" />
                          Needs Review
                        </span>
                      )}
                      {isOverdue && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 text-[11px] font-semibold">
                          <AlertCircle className="w-3 h-3" />
                          Overdue
                        </span>
                      )}
                      {isReviewed && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[11px] font-semibold">
                          <CheckCircle2 className="w-3 h-3" />
                          Reviewed
                        </span>
                      )}
                      {isDue && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[11px] font-medium">
                          Due {item.dueDate}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground/80">{item.templateName}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        Due: {formatReadableDate(item.dueDate)}
                      </span>
                      {item.submittedAt && (
                        <>
                          <span>•</span>
                          <span>Submitted {new Date(item.submittedAt).toLocaleDateString()}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Center / Right: Adherence Highlights & Actions */}
                <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-border/50">
                  {/* Snapshot Metric Pills */}
                  {item.adherenceSnapshot && (
                    <div className="flex items-center gap-2">
                      {item.adherenceSnapshot.workoutAdherencePercent !== null && (
                        <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-muted/60 text-[11px]" title="Workout Compliance">
                          <Dumbbell className="w-3 h-3 text-primary" />
                          <span className="font-semibold text-foreground">
                            {item.adherenceSnapshot.workoutAdherencePercent}%
                          </span>
                        </div>
                      )}

                      {item.adherenceSnapshot.weightLogged && (
                        <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-muted/60 text-[11px]" title="Body Weight">
                          <Scale className="w-3 h-3 text-emerald-500" />
                          <span className="font-semibold text-foreground">
                            {item.adherenceSnapshot.weightLogged.weight} {item.adherenceSnapshot.weightLogged.unit}
                          </span>
                          {item.adherenceSnapshot.weightLogged.delta !== undefined && (
                            <span className={`text-[10px] ${item.adherenceSnapshot.weightLogged.delta > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                              ({item.adherenceSnapshot.weightLogged.delta > 0 ? `+${item.adherenceSnapshot.weightLogged.delta}` : item.adherenceSnapshot.weightLogged.delta})
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Coach Note Indicator */}
                  {item.coachNote && (
                    <div className="text-primary text-xs flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10">
                      <MessageSquare className="w-3 h-3" />
                      <span className="hidden lg:inline text-[11px] font-medium">Feedback Sent</span>
                    </div>
                  )}

                  <Button
                    size="sm"
                    variant={isSubmitted ? 'default' : 'outline'}
                    className="gap-1 text-xs h-8 px-3"
                  >
                    <span>{isSubmitted ? 'Review & Feedback' : 'View Check-In'}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
