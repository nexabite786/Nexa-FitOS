import React, { useState, useEffect } from 'react';
import { 
  Utensils, 
  Plus, 
  Search, 
  X, 
  Flame, 
  AlertCircle, 
  Check, 
  Clock,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { 
  MealType, 
  Food, 
  ServingUnit, 
  FoodLogEntry 
} from '../../types/nutrition';
import { 
  fetchFoodLibrary, 
  calculateItemNutrition, 
  logFoodEntry, 
  updateFoodLogEntry 
} from '../../lib/nutritionService';

interface FoodLogModalProps {
  tenantId: string;
  clientId: string;
  dateStr: string; // YYYY-MM-DD
  initialMealType?: MealType;
  editingEntry?: FoodLogEntry | null;
  onClose: () => void;
  onLogged: (entry: FoodLogEntry) => void;
}

const MEAL_OPTIONS: { type: MealType; label: string }[] = [
  { type: 'BREAKFAST', label: 'Breakfast' },
  { type: 'MORNING_SNACK', label: 'Morning Snack' },
  { type: 'LUNCH', label: 'Lunch' },
  { type: 'AFTERNOON_SNACK', label: 'Afternoon Snack' },
  { type: 'DINNER', label: 'Dinner' },
  { type: 'POST_WORKOUT', label: 'Post-Workout Fuel' },
  { type: 'PRE_WORKOUT', label: 'Pre-Workout Snack' },
  { type: 'SNACK', label: 'General Snack' },
  { type: 'CUSTOM', label: 'Custom Meal' }
];

export function FoodLogModal({
  tenantId,
  clientId,
  dateStr,
  initialMealType = 'BREAKFAST',
  editingEntry = null,
  onClose,
  onLogged
}: FoodLogModalProps) {
  const [mealType, setMealType] = useState<MealType>(editingEntry?.mealType || initialMealType);
  const [mealCustomName, setMealCustomName] = useState(editingEntry?.mealCustomName || '');
  
  // Selected Food
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [foodNameInput, setFoodNameInput] = useState(editingEntry?.foodNameSnapshot || '');
  const [quantity, setQuantity] = useState<number>(editingEntry?.quantity || 100);
  const [servingUnit, setServingUnit] = useState<ServingUnit | string>(editingEntry?.unit || 'g');
  
  // Calculated / Direct Macros
  const [calories, setCalories] = useState<number>(editingEntry?.calories || 0);
  const [protein, setProtein] = useState<number>(editingEntry?.protein || 0);
  const [carbs, setCarbs] = useState<number>(editingEntry?.carbs || 0);
  const [fat, setFat] = useState<number>(editingEntry?.fat || 0);
  const [fiber, setFiber] = useState<number>(editingEntry?.fiber || 0);
  const [notes, setNotes] = useState(editingEntry?.notes || '');

  // Search autocomplete
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Food[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Live food search
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const list = await fetchFoodLibrary(tenantId, {
          search: searchQuery,
          maxResults: 8
        });
        setSearchResults(list);
        setShowSearchDropdown(true);
      } catch (err) {
        console.error('Food search error:', err);
      } finally {
        setSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery, tenantId]);

  // When a food item is picked from autocomplete
  const handleSelectFood = (food: Food) => {
    setSelectedFood(food);
    setFoodNameInput(food.name);
    setServingUnit(food.servingUnit || 'g');
    const defaultQty = food.servingSize || 100;
    setQuantity(defaultQty);

    const computed = calculateItemNutrition(food, defaultQty, food.servingUnit || 'g');
    setCalories(computed.calories);
    setProtein(computed.protein);
    setCarbs(computed.carbs);
    setFat(computed.fat);
    setFiber(computed.fiber || 0);

    setShowSearchDropdown(false);
    setSearchQuery('');
  };

  // When quantity is changed with a known food
  const handleQuantityChange = (newQty: number) => {
    const safeQty = Math.max(0, newQty);
    setQuantity(safeQty);

    if (selectedFood) {
      const computed = calculateItemNutrition(selectedFood, safeQty, servingUnit);
      setCalories(computed.calories);
      setProtein(computed.protein);
      setCarbs(computed.carbs);
      setFat(computed.fat);
      setFiber(computed.fiber || 0);
    } else if (editingEntry && editingEntry.quantity > 0) {
      const ratio = safeQty / editingEntry.quantity;
      setCalories(Math.round(editingEntry.calories * ratio));
      setProtein(Math.round(editingEntry.protein * ratio * 10) / 10);
      setCarbs(Math.round(editingEntry.carbs * ratio * 10) / 10);
      setFat(Math.round(editingEntry.fat * ratio * 10) / 10);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!foodNameInput.trim()) {
      setError('Food name is required.');
      return;
    }
    if (quantity <= 0) {
      setError('Quantity must be greater than zero.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      if (editingEntry) {
        await updateFoodLogEntry(tenantId, clientId, editingEntry.id, {
          mealType,
          mealCustomName,
          foodNameSnapshot: foodNameInput.trim(),
          quantity: Number(quantity),
          unit: servingUnit,
          calories: Number(calories),
          protein: Number(protein),
          carbs: Number(carbs),
          fat: Number(fat),
          fiber: Number(fiber),
          notes
        });
        onLogged({
          ...editingEntry,
          mealType,
          mealCustomName,
          foodNameSnapshot: foodNameInput.trim(),
          quantity: Number(quantity),
          unit: servingUnit,
          calories: Number(calories),
          protein: Number(protein),
          carbs: Number(carbs),
          fat: Number(fat),
          fiber: Number(fiber),
          notes
        });
      } else {
        const created = await logFoodEntry(tenantId, clientId, {
          date: dateStr,
          mealType,
          mealCustomName,
          foodId: selectedFood?.id,
          foodNameSnapshot: foodNameInput.trim(),
          quantity: Number(quantity),
          unit: servingUnit,
          calories: Number(calories),
          protein: Number(protein),
          carbs: Number(carbs),
          fat: Number(fat),
          fiber: Number(fiber),
          notes
        });
        onLogged(created);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to log food entry.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-card border border-border rounded-xl w-full max-w-lg p-6 space-y-5 shadow-2xl relative my-8">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h3 className="text-lg font-bold font-display text-foreground flex items-center gap-2">
              <Utensils className="w-5 h-5 text-primary" />
              {editingEntry ? 'Edit Food Log' : 'Log Food Intake'}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Date: <strong className="text-foreground">{dateStr}</strong>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-muted-foreground hover:text-foreground rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive text-xs p-3 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Meal Type Selection */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Target Meal *</label>
            <div className="grid grid-cols-3 gap-1.5">
              {MEAL_OPTIONS.slice(0, 6).map((m) => (
                <button
                  type="button"
                  key={m.type}
                  onClick={() => setMealType(m.type)}
                  className={`py-1.5 px-2 rounded-lg text-xs font-medium transition text-center truncate ${
                    mealType === m.type
                      ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                      : 'bg-background border border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Food Search Autocomplete */}
          <div className="space-y-1 relative">
            <label className="text-xs font-semibold text-muted-foreground">Search Food Library *</label>
            <div className="relative">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Type to search (e.g. Chicken breast, oats, yogurt)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => { if (searchResults.length > 0) setShowSearchDropdown(true); }}
                className="w-full bg-background border border-border rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
              {searching && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground animate-pulse">
                  Searching...
                </span>
              )}
            </div>

            {/* Search Dropdown */}
            {showSearchDropdown && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-xl z-20 max-h-56 overflow-y-auto divide-y divide-border">
                {searchResults.map((f) => (
                  <div
                    key={f.id}
                    onClick={() => handleSelectFood(f)}
                    className="p-3 hover:bg-accent cursor-pointer flex items-center justify-between text-xs transition"
                  >
                    <div>
                      <p className="font-semibold text-foreground">{f.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {f.calories} kcal • P: {f.protein}g C: {f.carbs}g F: {f.fat}g (per {f.servingSize}{f.servingUnit})
                      </p>
                    </div>
                    <span className="text-[10px] text-primary font-medium bg-primary/10 px-2 py-0.5 rounded">
                      Select
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Selected / Custom Food Name Display */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Food Name Snapshot *</label>
            <input
              type="text"
              required
              placeholder="e.g. Grilled Salmon with Lemon"
              value={foodNameInput}
              onChange={(e) => setFoodNameInput(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Portion Quantity & Unit */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Quantity *</label>
              <input
                type="number"
                min="0.1"
                step="any"
                required
                value={quantity}
                onChange={(e) => handleQuantityChange(Number(e.target.value))}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Serving Unit *</label>
              <select
                value={servingUnit}
                onChange={(e) => setServingUnit(e.target.value as ServingUnit)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary font-medium"
              >
                <option value="g">grams (g)</option>
                <option value="ml">milliliters (ml)</option>
                <option value="oz">ounces (oz)</option>
                <option value="piece">piece</option>
                <option value="scoop">scoop</option>
                <option value="serving">serving</option>
                <option value="tbsp">tablespoon (tbsp)</option>
                <option value="tsp">teaspoon (tsp)</option>
                <option value="cup">cup</option>
              </select>
            </div>
          </div>

          {/* Computed Nutritional Snapshot */}
          <div className="bg-accent/20 border border-border rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-primary" />
                Intake Nutrition Snapshot
              </span>
              <span className="text-[10px] text-muted-foreground">Stored immutably</span>
            </div>

            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="bg-background border border-border rounded-lg p-2">
                <label className="text-[10px] text-muted-foreground block">Calories</label>
                <input
                  type="number"
                  min="0"
                  value={calories}
                  onChange={(e) => setCalories(Number(e.target.value))}
                  className="w-full bg-transparent text-center font-bold text-sm text-primary focus:outline-none"
                />
              </div>
              <div className="bg-background border border-border rounded-lg p-2">
                <label className="text-[10px] text-muted-foreground block">Protein</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={protein}
                  onChange={(e) => setProtein(Number(e.target.value))}
                  className="w-full bg-transparent text-center font-bold text-sm text-foreground focus:outline-none"
                />
              </div>
              <div className="bg-background border border-border rounded-lg p-2">
                <label className="text-[10px] text-muted-foreground block">Carbs</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={carbs}
                  onChange={(e) => setCarbs(Number(e.target.value))}
                  className="w-full bg-transparent text-center font-bold text-sm text-emerald-400 focus:outline-none"
                />
              </div>
              <div className="bg-background border border-border rounded-lg p-2">
                <label className="text-[10px] text-muted-foreground block">Fat</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={fat}
                  onChange={(e) => setFat(Number(e.target.value))}
                  className="w-full bg-transparent text-center font-bold text-sm text-amber-400 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Notes (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Pre-workout fueling, extra seasoning"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-5 py-2 rounded-lg text-sm transition shadow-sm disabled:opacity-50"
            >
              {saving ? 'Logging...' : editingEntry ? 'Update Entry' : 'Log Food Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
