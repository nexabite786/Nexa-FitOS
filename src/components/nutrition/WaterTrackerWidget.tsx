import React, { useState, useEffect } from 'react';
import { 
  Droplets, 
  Plus, 
  Check, 
  RotateCcw,
  Sparkles 
} from 'lucide-react';
import { WaterLogEntry } from '../../types/nutrition';
import { logWaterEntry, fetchClientWaterLogsForDate } from '../../lib/nutritionService';

interface WaterTrackerWidgetProps {
  tenantId: string;
  clientId: string;
  dateStr: string; // YYYY-MM-DD
  waterTargetMl?: number;
  onWaterUpdated?: (newTotal: number) => void;
}

export function WaterTrackerWidget({
  tenantId,
  clientId,
  dateStr,
  waterTargetMl = 2500,
  onWaterUpdated
}: WaterTrackerWidgetProps) {
  const [waterLogs, setWaterLogs] = useState<WaterLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [logging, setLogging] = useState(false);
  const [customAmount, setCustomAmount] = useState<number>(250);
  const [showCustomInput, setShowCustomInput] = useState(false);

  const loadWaterLogs = async () => {
    setLoading(true);
    try {
      const logs = await fetchClientWaterLogsForDate(tenantId, clientId, dateStr);
      setWaterLogs(logs);
      const total = logs.reduce((sum, w) => sum + (w.amountMl || 0), 0);
      if (onWaterUpdated) onWaterUpdated(total);
    } catch (err) {
      console.error('Failed to load water logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWaterLogs();
  }, [tenantId, clientId, dateStr]);

  const totalWaterMl = waterLogs.reduce((sum, w) => sum + (w.amountMl || 0), 0);
  const progressPercent = Math.min(100, Math.round((totalWaterMl / Math.max(1, waterTargetMl)) * 100));

  const handleAddWater = async (amount: number) => {
    if (amount <= 0) return;
    setLogging(true);
    try {
      const newEntry = await logWaterEntry(tenantId, clientId, amount, dateStr);
      const updated = [...waterLogs, newEntry];
      setWaterLogs(updated);
      const newTotal = updated.reduce((sum, w) => sum + (w.amountMl || 0), 0);
      if (onWaterUpdated) onWaterUpdated(newTotal);
      setShowCustomInput(false);
    } catch (err) {
      console.error('Failed to log water:', err);
    } finally {
      setLogging(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
            <Droplets className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold font-display text-foreground">Hydration Tracker</h3>
            <p className="text-xs text-muted-foreground">Daily Water Intake</p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-lg font-bold font-display text-blue-400">{totalWaterMl}</span>
          <span className="text-xs text-muted-foreground"> / {waterTargetMl} ml</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5">
        <div className="h-3 w-full bg-background rounded-full overflow-hidden border border-border">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>{progressPercent}% of target</span>
          {progressPercent >= 100 ? (
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <Check className="w-3 h-3" /> Target Reached
            </span>
          ) : (
            <span>{Math.max(0, waterTargetMl - totalWaterMl)} ml remaining</span>
          )}
        </div>
      </div>

      {/* Quick Add Presets */}
      <div className="grid grid-cols-4 gap-2">
        <button
          onClick={() => handleAddWater(250)}
          disabled={logging}
          className="py-2 bg-background hover:bg-accent border border-border hover:border-blue-400/40 text-foreground text-xs font-semibold rounded-lg transition disabled:opacity-50"
        >
          +250ml
          <span className="block text-[9px] text-muted-foreground font-normal">Cup</span>
        </button>

        <button
          onClick={() => handleAddWater(500)}
          disabled={logging}
          className="py-2 bg-background hover:bg-accent border border-border hover:border-blue-400/40 text-foreground text-xs font-semibold rounded-lg transition disabled:opacity-50"
        >
          +500ml
          <span className="block text-[9px] text-muted-foreground font-normal">Bottle</span>
        </button>

        <button
          onClick={() => handleAddWater(750)}
          disabled={logging}
          className="py-2 bg-background hover:bg-accent border border-border hover:border-blue-400/40 text-foreground text-xs font-semibold rounded-lg transition disabled:opacity-50"
        >
          +750ml
          <span className="block text-[9px] text-muted-foreground font-normal">Shaker</span>
        </button>

        <button
          onClick={() => handleAddWater(1000)}
          disabled={logging}
          className="py-2 bg-background hover:bg-accent border border-border hover:border-blue-400/40 text-foreground text-xs font-semibold rounded-lg transition disabled:opacity-50"
        >
          +1.0L
          <span className="block text-[9px] text-muted-foreground font-normal">Jug</span>
        </button>
      </div>

      {/* Custom Amount Toggle */}
      {!showCustomInput ? (
        <button
          onClick={() => setShowCustomInput(true)}
          className="w-full text-center text-xs text-muted-foreground hover:text-foreground py-1 transition"
        >
          + Custom amount...
        </button>
      ) : (
        <div className="flex items-center gap-2 pt-2 border-t border-border">
          <input
            type="number"
            min="50"
            step="50"
            value={customAmount}
            onChange={(e) => setCustomAmount(Number(e.target.value))}
            className="w-24 bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-center font-bold focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <span className="text-xs text-muted-foreground">ml</span>
          <button
            onClick={() => handleAddWater(customAmount)}
            disabled={logging}
            className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold py-1.5 rounded-lg transition"
          >
            Add Water
          </button>
          <button
            onClick={() => setShowCustomInput(false)}
            className="px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground rounded-lg"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
