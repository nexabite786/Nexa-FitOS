/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Trophy,
  Award,
  Lock,
  CheckCircle2,
  Sparkles,
  Flame,
  ShieldAlert,
  Dumbbell
} from 'lucide-react';
import { MilestoneEntry, MilestoneCategory } from '../../types/progress';

interface MilestoneGridProps {
  milestones: MilestoneEntry[];
  isCoachView?: boolean;
}

const TIER_COLORS: Record<MilestoneEntry['tier'], { bg: string; text: string; border: string; glow: string }> = {
  BRONZE: {
    bg: 'bg-amber-900/20',
    text: 'text-amber-500',
    border: 'border-amber-700/40',
    glow: 'shadow-amber-900/10'
  },
  SILVER: {
    bg: 'bg-slate-400/10',
    text: 'text-slate-300',
    border: 'border-slate-400/30',
    glow: 'shadow-slate-400/10'
  },
  GOLD: {
    bg: 'bg-yellow-500/15',
    text: 'text-yellow-400',
    border: 'border-yellow-500/40',
    glow: 'shadow-yellow-500/20'
  },
  PLATINUM: {
    bg: 'bg-cyan-500/15',
    text: 'text-cyan-300',
    border: 'border-cyan-500/40',
    glow: 'shadow-cyan-500/20'
  },
  DIAMOND: {
    bg: 'bg-purple-500/20',
    text: 'text-purple-300',
    border: 'border-purple-500/50',
    glow: 'shadow-purple-500/30'
  }
};

export const MilestoneGrid: React.FC<MilestoneGridProps> = ({ milestones }) => {
  const [filter, setFilter] = useState<'ALL' | 'UNLOCKED' | 'LOCKED'>('ALL');

  const unlockedCount = useMemo(() => milestones.filter(m => m.unlocked).length, [milestones]);
  const totalCount = milestones.length;
  const progressPercent = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

  const filteredMilestones = useMemo(() => {
    if (filter === 'UNLOCKED') return milestones.filter(m => m.unlocked);
    if (filter === 'LOCKED') return milestones.filter(m => !m.unlocked);
    return milestones;
  }, [milestones, filter]);

  return (
    <div className="space-y-6">
      {/* Trophy Cabinet Banner */}
      <div className="bg-gradient-to-r from-yellow-950/30 via-card/60 to-card/60 p-6 rounded-2xl border border-yellow-500/30 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center text-3xl shadow-lg shadow-yellow-500/10">
            🏆
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-foreground">Hall of Achievements</h2>
              <span className="px-2.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 text-xs font-bold">
                {unlockedCount} / {totalCount} Unlocked
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Badges programmatically validated against real workout logs, PRs, and consistency
            </p>
          </div>
        </div>

        {/* Global Level Progress Bar */}
        <div className="md:w-64 space-y-2 bg-card/60 p-3.5 rounded-xl border border-border/40">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-medium">Cabinet Completion</span>
            <span className="font-bold text-yellow-400">{progressPercent}%</span>
          </div>
          <div className="w-full h-2 bg-muted/40 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-yellow-500 to-amber-400 rounded-full transition-all duration-700"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 bg-muted/40 p-1 rounded-xl border border-border/30 w-fit">
        {(['ALL', 'UNLOCKED', 'LOCKED'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filter === tab
                ? 'bg-yellow-500 text-black shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab === 'ALL'
              ? `All Badges (${totalCount})`
              : tab === 'UNLOCKED'
              ? `Unlocked (${unlockedCount})`
              : `Locked (${totalCount - unlockedCount})`}
          </button>
        ))}
      </div>

      {/* Milestone Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMilestones.map(m => {
          const tierStyle = TIER_COLORS[m.tier];
          const pct = Math.min(100, Math.round((m.progressValue / m.targetValue) * 100));

          return (
            <div
              key={m.id}
              className={`p-5 rounded-2xl border transition-all relative overflow-hidden flex flex-col justify-between ${
                m.unlocked
                  ? `${tierStyle.bg} ${tierStyle.border} ${tierStyle.glow} shadow-md`
                  : 'bg-card/30 border-border/30 opacity-75'
              }`}
            >
              {/* Top: Icon & Tier */}
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl border ${
                      m.unlocked
                        ? `${tierStyle.border} bg-background/50`
                        : 'border-border/40 bg-muted/20 grayscale opacity-60'
                    }`}
                  >
                    {m.icon}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md border ${tierStyle.text} ${tierStyle.border} bg-black/40`}
                    >
                      {m.tier}
                    </span>

                    {m.unlocked ? (
                      <span className="text-emerald-400">
                        <CheckCircle2 className="w-4 h-4" />
                      </span>
                    ) : (
                      <span className="text-muted-foreground">
                        <Lock className="w-4 h-4" />
                      </span>
                    )}
                  </div>
                </div>

                {/* Title & Description */}
                <div>
                  <h3 className="text-base font-bold text-foreground flex items-center gap-1.5">
                    {m.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {m.description}
                  </p>
                </div>
              </div>

              {/* Bottom: Progress Bar / Unlock Date */}
              <div className="pt-4 mt-4 border-t border-border/20 space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">
                    {m.unlocked ? (
                      <span className="text-emerald-400 font-semibold flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Unlocked
                      </span>
                    ) : (
                      <span>
                        Progress: <strong className="text-foreground">{m.progressValue}</strong> / {m.targetValue} {m.metricLabel}
                      </span>
                    )}
                  </span>
                  <span className="font-bold text-foreground">{pct}%</span>
                </div>

                <div className="w-full h-1.5 bg-muted/40 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      m.unlocked ? 'bg-yellow-400' : 'bg-muted-foreground/50'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
