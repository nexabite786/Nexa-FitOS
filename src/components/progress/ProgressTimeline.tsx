/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Calendar,
  Scale,
  Ruler,
  Camera,
  Target,
  Trophy,
  Dumbbell,
  Filter,
  ChevronRight
} from 'lucide-react';
import { TimelineEventItem } from '../../types/progress';

interface ProgressTimelineProps {
  events: TimelineEventItem[];
  onSelectPhoto?: (photo: any) => void;
  isCoachView?: boolean;
}

export const ProgressTimeline: React.FC<ProgressTimelineProps> = ({
  events,
  onSelectPhoto
}) => {
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  const filteredEvents = typeFilter === 'ALL'
    ? events
    : events.filter(e => e.type === typeFilter);

  const getEventIcon = (type: TimelineEventItem['type']) => {
    switch (type) {
      case 'WEIGHT':
        return <Scale className="w-4 h-4 text-amber-400" />;
      case 'MEASUREMENT':
        return <Ruler className="w-4 h-4 text-blue-400" />;
      case 'PHOTO':
        return <Camera className="w-4 h-4 text-purple-400" />;
      case 'GOAL_COMPLETED':
        return <Target className="w-4 h-4 text-emerald-400" />;
      case 'WORKOUT_PR':
        return <Trophy className="w-4 h-4 text-yellow-400" />;
      case 'WORKOUT_COMPLETED':
      default:
        return <Dumbbell className="w-4 h-4 text-indigo-400" />;
    }
  };

  const getBadgeStyle = (type: TimelineEventItem['type']) => {
    switch (type) {
      case 'WEIGHT':
        return 'bg-amber-500/10 border-amber-500/30 text-amber-400';
      case 'MEASUREMENT':
        return 'bg-blue-500/10 border-blue-500/30 text-blue-400';
      case 'PHOTO':
        return 'bg-purple-500/10 border-purple-500/30 text-purple-400';
      case 'GOAL_COMPLETED':
        return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400';
      case 'WORKOUT_PR':
        return 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400';
      case 'WORKOUT_COMPLETED':
      default:
        return 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card/40 backdrop-blur-md p-4 rounded-2xl border border-border/40">
        <div>
          <h2 className="text-base font-bold text-foreground">Transformation History Feed</h2>
          <p className="text-xs text-muted-foreground">
            Chronological stream of workouts, body check-ins, PRs, and milestones
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'ALL', label: 'All Events' },
            { id: 'WEIGHT', label: 'Weight' },
            { id: 'MEASUREMENT', label: 'Landmarks' },
            { id: 'PHOTO', label: 'Photos' },
            { id: 'WORKOUT_PR', label: 'PRs' },
            { id: 'WORKOUT_COMPLETED', label: 'Workouts' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setTypeFilter(f.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                typeFilter === f.id
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/20'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Vertical Timeline Tree */}
      {filteredEvents.length > 0 ? (
        <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-[2px] before:bg-border/60">
          {filteredEvents.map(event => (
            <div key={event.id} className="relative group">
              {/* Timeline Pin Node */}
              <div
                className={`absolute -left-6 sm:-left-8 top-1.5 w-6 h-6 sm:w-8 sm:h-8 rounded-xl border flex items-center justify-center bg-card shadow-md transition-transform group-hover:scale-110 ${getBadgeStyle(
                  event.type
                )}`}
              >
                {getEventIcon(event.type)}
              </div>

              {/* Event Content Box */}
              <div className="bg-card/40 hover:bg-card/70 border border-border/40 hover:border-border/80 transition-all p-4 rounded-2xl shadow-sm space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${getBadgeStyle(
                        event.type
                      )}`}
                    >
                      {event.type.replace('_', ' ')}
                    </span>
                    <h4 className="text-sm font-bold text-foreground">{event.title}</h4>
                  </div>
                  <span className="text-xs text-muted-foreground flex items-center gap-1 font-medium">
                    <Calendar className="w-3.5 h-3.5" />
                    {event.date.split('T')[0]}
                  </span>
                </div>

                <p className="text-xs text-muted-foreground">{event.subtitle}</p>

                {/* Photo Preview if photo event */}
                {event.type === 'PHOTO' && event.details?.photoUrl && (
                  <div
                    onClick={() => onSelectPhoto && onSelectPhoto(event.details)}
                    className="mt-2 cursor-pointer w-24 h-32 rounded-xl overflow-hidden border border-border/40 hover:border-purple-500/60 transition-all"
                  >
                    <img
                      src={event.details.photoUrl}
                      alt="Thumbnail"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-16 text-center text-muted-foreground text-sm bg-card/20 rounded-2xl border border-dashed border-border/40">
          No transformation records found for this category.
        </div>
      )}
    </div>
  );
};
