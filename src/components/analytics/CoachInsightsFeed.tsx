import React from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Award,
  Flame,
  CheckCircle2,
  TrendingUp,
  Clock,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { CoachAttentionInsight } from '../../lib/analyticsService';

interface CoachInsightsFeedProps {
  insights: CoachAttentionInsight[];
  title?: string;
  description?: string;
  emptyMessage?: string;
}

export function CoachInsightsFeed({
  insights,
  title = 'Coach Attention & Insights',
  description = 'Automated, rule-based training notifications and adherence alerts.',
  emptyMessage = 'All clients are currently on track with their training schedules.'
}: CoachInsightsFeedProps) {
  if (insights.length === 0) {
    return (
      <div className="p-6 rounded-2xl bg-card border border-border/50 text-center space-y-2">
        <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto" />
        <h4 className="text-sm font-bold text-foreground">No Attention Alerts</h4>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
          {emptyMessage}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {title && (
        <div>
          <h3 className="text-base font-bold font-display text-foreground flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            {title}
          </h3>
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
      )}

      <div className="space-y-2.5">
        {insights.map(item => {
          const isCritical = item.severity === 'critical';
          const isWarning = item.severity === 'warning';
          const isPositive = item.severity === 'positive';

          return (
            <div
              key={item.id}
              className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                isCritical
                  ? 'bg-red-500/5 border-red-500/30 text-foreground'
                  : isWarning
                  ? 'bg-amber-500/5 border-amber-500/30 text-foreground'
                  : isPositive
                  ? 'bg-green-500/5 border-green-500/30 text-foreground'
                  : 'bg-card border-border/50 text-foreground'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    isCritical
                      ? 'bg-red-500/10 text-red-400'
                      : isWarning
                      ? 'bg-amber-500/10 text-amber-400'
                      : isPositive
                      ? 'bg-green-500/10 text-green-400'
                      : 'bg-accent text-muted-foreground'
                  }`}
                >
                  {isCritical || isWarning ? (
                    <AlertTriangle className="w-4 h-4" />
                  ) : item.type === 'NEW_PR' ? (
                    <Award className="w-4 h-4 text-yellow-400" />
                  ) : item.type === 'HIGH_ADHERENCE' ? (
                    <Flame className="w-4 h-4 text-orange-400" />
                  ) : (
                    <TrendingUp className="w-4 h-4" />
                  )}
                </div>

                <div className="space-y-0.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-foreground">
                      {item.title}
                    </span>
                    {item.metricValue && (
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                          isCritical
                            ? 'bg-red-500/20 text-red-300'
                            : isWarning
                            ? 'bg-amber-500/20 text-amber-300'
                            : isPositive
                            ? 'bg-green-500/20 text-green-300'
                            : 'bg-accent text-foreground'
                        }`}
                      >
                        {item.metricValue}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>

              {item.clientId && (
                <Link
                  to={`/owner/clients/${item.clientId}`}
                  className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 self-end sm:self-auto flex-shrink-0"
                >
                  View Athlete <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
