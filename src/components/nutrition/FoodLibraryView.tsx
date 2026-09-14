import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Filter, 
  Utensils, 
  Sparkles, 
  ShieldCheck, 
  Edit2, 
  Archive, 
  Trash2, 
  ChevronRight, 
  Info, 
  AlertCircle,
  CheckCircle2,
  X,
  Flame,
  Scale
} from 'lucide-react';
import { Food, FoodCategory, FoodType, ServingUnit } from '../../types/nutrition';
import { 
  fetchFoodLibrary, 
  createCustomFood, 
  updateCustomFood, 
  archiveCustomFood 
} from '../../lib/nutritionService';

interface FoodLibraryViewProps {
  tenantId: string;
  isOwnerOrTrainer?: boolean;
  onSelectFood?: (food: Food) => void;
  selectionMode?: boolean;
}

const CATEGORIES: { label: string; value: FoodCategory | 'ALL' }[] = [
  { label: 'All Categories', value: 'ALL' },
  { label: 'Protein', value: 'PROTEIN' },
  { label: 'Carbs', value: 'CARBS' },
  { label: 'Fats', value: 'FATS' },
  { label: 'Dairy', value: 'DAIRY' },
  { label: 'Vegetables', value: 'VEGETABLES' },
  { label: 'Fruits', value: 'FRUITS' },
  { label: 'Grains', value: 'GRAINS' },
  { label: 'Beverages', value: 'BEVERAGES' },
  { label: 'Snacks', value: 'SNACKS' },
  { label: 'Supplements', value: 'SUPPLEMENTS' },
  { label: 'Other', value: 'OTHER' }
];

export function FoodLibraryView({
  tenantId,
  isOwnerOrTrainer = true,
  onSelectFood,
  selectionMode = false
}: FoodLibraryViewProps) {
  const [foods, setFoods] = useState<Food[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<FoodCategory | 'ALL'>('ALL');
  const [selectedType, setSelectedType] = useState<FoodType | 'ALL'>('ALL');
  
  // Custom Food Modal
  const [showModal, setShowModal] = useState(false);
  const [editingFood, setEditingFood] = useState<Food | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    brand: string;
    category: FoodCategory;
    servingSize: number;
    servingUnit: ServingUnit;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sugar: number;
    sodium: number;
    barcode: string;
    notes: string;
  }>({
    name: '',
    brand: '',
    category: 'PROTEIN',
    servingSize: 100,
    servingUnit: 'g',
    calories: 100,
    protein: 10,
    carbs: 10,
    fat: 2,
    fiber: 0,
    sugar: 0,
    sodium: 0,
    barcode: '',
    notes: ''
  });

  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedFoodDetails, setSelectedFoodDetails] = useState<Food | null>(null);

  const loadFoods = async () => {
    setLoading(true);
    try {
      const data = await fetchFoodLibrary(tenantId, {
        search: searchQuery,
        category: selectedCategory,
        type: selectedType,
        maxResults: 150
      });
      setFoods(data);
    } catch (err) {
      console.error('Failed to load foods:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadFoods();
    }, 200);
    return () => clearTimeout(timer);
  }, [tenantId, searchQuery, selectedCategory, selectedType]);

  const handleOpenCreate = () => {
    setEditingFood(null);
    setFormData({
      name: '',
      brand: '',
      category: 'PROTEIN',
      servingSize: 100,
      servingUnit: 'g',
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      sugar: 0,
      sodium: 0,
      barcode: '',
      notes: ''
    });
    setFormError(null);
    setShowModal(true);
  };

  const handleOpenEdit = (food: Food) => {
    if (food.type === 'SYSTEM') return;
    setEditingFood(food);
    setFormData({
      name: food.name,
      brand: food.brand || '',
      category: food.category,
      servingSize: food.servingSize,
      servingUnit: food.servingUnit,
      calories: food.calories,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat,
      fiber: food.fiber || 0,
      sugar: food.sugar || 0,
      sodium: food.sodium || 0,
      barcode: food.barcode || '',
      notes: food.notes || ''
    });
    setFormError(null);
    setShowModal(true);
  };

  const handleSaveFood = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError('Food name is required.');
      return;
    }
    if (formData.servingSize <= 0) {
      setFormError('Serving size must be greater than zero.');
      return;
    }
    if (formData.calories < 0 || formData.protein < 0 || formData.carbs < 0 || formData.fat < 0) {
      setFormError('Calories and macronutrients cannot be negative.');
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      if (editingFood) {
        await updateCustomFood(tenantId, editingFood.id, {
          name: formData.name,
          brand: formData.brand,
          category: formData.category,
          servingSize: Number(formData.servingSize),
          servingUnit: formData.servingUnit,
          calories: Number(formData.calories),
          protein: Number(formData.protein),
          carbs: Number(formData.carbs),
          fat: Number(formData.fat),
          fiber: Number(formData.fiber),
          sugar: Number(formData.sugar),
          sodium: Number(formData.sodium),
          barcode: formData.barcode,
          notes: formData.notes
        });
      } else {
        await createCustomFood(tenantId, {
          name: formData.name,
          brand: formData.brand,
          category: formData.category,
          servingSize: Number(formData.servingSize),
          servingUnit: formData.servingUnit,
          calories: Number(formData.calories),
          protein: Number(formData.protein),
          carbs: Number(formData.carbs),
          fat: Number(formData.fat),
          fiber: Number(formData.fiber),
          sugar: Number(formData.sugar),
          sodium: Number(formData.sodium),
          barcode: formData.barcode,
          notes: formData.notes
        });
      }
      setShowModal(false);
      loadFoods();
    } catch (err: any) {
      setFormError(err.message || 'Unable to save custom food.');
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (food: Food) => {
    if (food.type === 'SYSTEM') return;
    if (window.confirm(`Are you sure you want to archive "${food.name}"?`)) {
      try {
        await archiveCustomFood(tenantId, food.id, true);
        loadFoods();
      } catch (err) {
        console.error('Failed to archive food:', err);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-display font-bold tracking-tight flex items-center gap-2">
            <Utensils className="w-5 h-5 text-primary" />
            Food Library
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Explore curated system nutrition staples or create custom tenant items.
          </p>
        </div>

        {isOwnerOrTrainer && !selectionMode && (
          <button
            id="btn-create-custom-food"
            onClick={handleOpenCreate}
            className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-4 py-2.5 rounded-lg transition text-sm shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Create Custom Food
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="input-food-search"
              type="text"
              placeholder="Search foods by name, brand, or barcode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-background border border-border rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-1.5 bg-background border border-border rounded-lg p-1">
            <button
              onClick={() => setSelectedType('ALL')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                selectedType === 'ALL' ? 'bg-accent text-primary font-semibold' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              All Types
            </button>
            <button
              onClick={() => setSelectedType('SYSTEM')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                selectedType === 'SYSTEM' ? 'bg-accent text-primary font-semibold' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              System
            </button>
            <button
              onClick={() => setSelectedType('CUSTOM')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                selectedType === 'CUSTOM' ? 'bg-accent text-primary font-semibold' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Custom
            </button>
          </div>
        </div>

        {/* Category Horizontal Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium transition shrink-0 ${
                selectedCategory === cat.value
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-background hover:bg-accent text-muted-foreground border border-border'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Food Grid / List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-5 animate-pulse space-y-3">
              <div className="h-4 bg-accent/60 rounded w-2/3" />
              <div className="h-3 bg-accent/40 rounded w-1/3" />
              <div className="h-8 bg-accent/30 rounded w-full" />
            </div>
          ))}
        </div>
      ) : foods.length === 0 ? (
        <div className="bg-card border border-border border-dashed rounded-xl p-12 text-center space-y-3">
          <Utensils className="w-10 h-10 text-muted-foreground/40 mx-auto" />
          <h3 className="text-base font-semibold">No foods found</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            {searchQuery 
              ? `No food items match "${searchQuery}". Try modifying filters or create a custom item.`
              : 'No foods available in this category.'}
          </p>
          {isOwnerOrTrainer && (
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 text-primary text-sm font-medium hover:underline pt-2"
            >
              <Plus className="w-4 h-4" />
              Create custom food now
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {foods.map((food) => (
            <div
              key={food.id}
              className={`bg-card border border-border rounded-xl p-4 flex flex-col justify-between hover:border-primary/40 transition group ${
                selectionMode ? 'cursor-pointer hover:shadow-md' : ''
              }`}
              onClick={() => {
                if (selectionMode && onSelectFood) {
                  onSelectFood(food);
                } else {
                  setSelectedFoodDetails(food);
                }
              }}
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        food.type === 'SYSTEM' 
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        {food.type === 'SYSTEM' ? 'System Standard' : 'Custom'}
                      </span>
                      <span className="text-[10px] text-muted-foreground bg-accent px-2 py-0.5 rounded-full">
                        {food.category}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold tracking-tight text-foreground group-hover:text-primary transition mt-1 line-clamp-1">
                      {food.name}
                    </h3>
                    {food.brand && (
                      <p className="text-xs text-muted-foreground truncate">{food.brand}</p>
                    )}
                  </div>

                  {/* Actions for owner/trainer if custom */}
                  {isOwnerOrTrainer && food.type === 'CUSTOM' && !selectionMode && (
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleOpenEdit(food)}
                        className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition"
                        title="Edit Custom Food"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleArchive(food)}
                        className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition"
                        title="Archive Food"
                      >
                        <Archive className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Serving & Calorie Badge */}
                <div className="flex items-baseline justify-between pt-1">
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-bold font-display text-foreground">{food.calories}</span>
                    <span className="text-xs text-muted-foreground">kcal</span>
                  </div>
                  <span className="text-xs text-muted-foreground bg-background px-2 py-1 rounded border border-border">
                    per {food.servingSize} {food.servingUnit}
                  </span>
                </div>

                {/* Macro Split Strip */}
                <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-border text-center text-xs">
                  <div className="bg-background/80 rounded py-1 px-1.5 border border-border/50">
                    <p className="text-[10px] text-muted-foreground">Protein</p>
                    <p className="font-semibold text-primary">{food.protein}g</p>
                  </div>
                  <div className="bg-background/80 rounded py-1 px-1.5 border border-border/50">
                    <p className="text-[10px] text-muted-foreground">Carbs</p>
                    <p className="font-semibold text-emerald-400">{food.carbs}g</p>
                  </div>
                  <div className="bg-background/80 rounded py-1 px-1.5 border border-border/50">
                    <p className="text-[10px] text-muted-foreground">Fat</p>
                    <p className="font-semibold text-amber-400">{food.fat}g</p>
                  </div>
                </div>
              </div>

              {selectionMode && (
                <div className="mt-3 pt-2 border-t border-border flex items-center justify-between text-xs text-primary font-medium">
                  <span>Click to select</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Food Details Modal */}
      {selectedFoodDetails && !selectionMode && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-md p-6 space-y-5 shadow-2xl relative animate-in fade-in zoom-in-95">
            <button
              onClick={() => setSelectedFoodDetails(null)}
              className="absolute right-4 top-4 p-1 text-muted-foreground hover:text-foreground rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                selectedFoodDetails.type === 'SYSTEM' 
                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              }`}>
                {selectedFoodDetails.type === 'SYSTEM' ? 'System Food' : 'Custom Gym Food'}
              </span>
              <h3 className="text-lg font-bold font-display text-foreground">{selectedFoodDetails.name}</h3>
              {selectedFoodDetails.brand && (
                <p className="text-xs text-muted-foreground">Brand: {selectedFoodDetails.brand}</p>
              )}
            </div>

            {/* Serving highlight */}
            <div className="bg-accent/40 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Energy Density</p>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-2xl font-bold font-display text-primary">{selectedFoodDetails.calories}</span>
                  <span className="text-xs text-muted-foreground">calories (kcal)</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Basis Serving</p>
                <p className="text-sm font-semibold text-foreground mt-0.5">
                  {selectedFoodDetails.servingSize} {selectedFoodDetails.servingUnit}
                </p>
              </div>
            </div>

            {/* Macros Breakdown */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Macronutrient Profile</h4>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-background border border-border rounded-lg p-3 text-center">
                  <span className="text-xs text-muted-foreground">Protein</span>
                  <p className="text-lg font-bold text-primary">{selectedFoodDetails.protein}g</p>
                </div>
                <div className="bg-background border border-border rounded-lg p-3 text-center">
                  <span className="text-xs text-muted-foreground">Carbohydrates</span>
                  <p className="text-lg font-bold text-emerald-400">{selectedFoodDetails.carbs}g</p>
                </div>
                <div className="bg-background border border-border rounded-lg p-3 text-center">
                  <span className="text-xs text-muted-foreground">Fats</span>
                  <p className="text-lg font-bold text-amber-400">{selectedFoodDetails.fat}g</p>
                </div>
              </div>
            </div>

            {/* Micronutrients */}
            <div className="space-y-2 pt-2 border-t border-border">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Additional Nutrition</h4>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="bg-background border border-border rounded p-2 text-center">
                  <span className="text-muted-foreground block text-[10px]">Dietary Fiber</span>
                  <span className="font-semibold">{selectedFoodDetails.fiber ?? 0}g</span>
                </div>
                <div className="bg-background border border-border rounded p-2 text-center">
                  <span className="text-muted-foreground block text-[10px]">Sugars</span>
                  <span className="font-semibold">{selectedFoodDetails.sugar ?? 0}g</span>
                </div>
                <div className="bg-background border border-border rounded p-2 text-center">
                  <span className="text-muted-foreground block text-[10px]">Sodium</span>
                  <span className="font-semibold">{selectedFoodDetails.sodium ?? 0}mg</span>
                </div>
              </div>
            </div>

            {selectedFoodDetails.notes && (
              <p className="text-xs text-muted-foreground bg-accent/20 p-2.5 rounded-lg border border-border/50">
                {selectedFoodDetails.notes}
              </p>
            )}

            <button
              onClick={() => setSelectedFoodDetails(null)}
              className="w-full bg-accent hover:bg-accent/80 text-foreground font-medium py-2 rounded-lg text-sm transition"
            >
              Close Details
            </button>
          </div>
        </div>
      )}

      {/* Create / Edit Custom Food Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-card border border-border rounded-xl w-full max-w-lg p-6 space-y-5 shadow-2xl relative my-8">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-lg font-bold font-display text-foreground flex items-center gap-2">
                <Plus className="w-5 h-5 text-primary" />
                {editingFood ? 'Edit Custom Food' : 'Create Custom Food'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 text-muted-foreground hover:text-foreground rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive text-xs p-3 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveFood} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Food Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Grass-Fed Whey Concentrate"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Brand / Manufacturer</label>
                  <input
                    type="text"
                    placeholder="e.g. Optimum / Local"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as FoodCategory })}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {CATEGORIES.filter(c => c.value !== 'ALL').map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Serving Size *</label>
                  <input
                    type="number"
                    min="0.1"
                    step="any"
                    required
                    value={formData.servingSize}
                    onChange={(e) => setFormData({ ...formData, servingSize: Number(e.target.value) })}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Serving Unit *</label>
                  <select
                    value={formData.servingUnit}
                    onChange={(e) => setFormData({ ...formData, servingUnit: e.target.value as ServingUnit })}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="g">grams (g)</option>
                    <option value="ml">milliliters (ml)</option>
                    <option value="oz">ounces (oz)</option>
                    <option value="scoop">scoop</option>
                    <option value="piece">piece</option>
                    <option value="serving">serving</option>
                    <option value="tbsp">tablespoon (tbsp)</option>
                    <option value="tsp">teaspoon (tsp)</option>
                    <option value="cup">cup</option>
                  </select>
                </div>
              </div>

              {/* Nutrition Inputs */}
              <div className="p-3 bg-accent/20 rounded-xl border border-border space-y-3">
                <p className="text-xs font-semibold text-foreground">Nutritional Profile (per serving)</p>
                <div className="grid grid-cols-4 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground font-medium">Calories (kcal)</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      required
                      value={formData.calories}
                      onChange={(e) => setFormData({ ...formData, calories: Number(e.target.value) })}
                      className="w-full bg-background border border-border rounded px-2 py-1.5 text-xs text-center font-bold text-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground font-medium">Protein (g)</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      required
                      value={formData.protein}
                      onChange={(e) => setFormData({ ...formData, protein: Number(e.target.value) })}
                      className="w-full bg-background border border-border rounded px-2 py-1.5 text-xs text-center font-bold text-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground font-medium">Carbs (g)</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      required
                      value={formData.carbs}
                      onChange={(e) => setFormData({ ...formData, carbs: Number(e.target.value) })}
                      className="w-full bg-background border border-border rounded px-2 py-1.5 text-xs text-center font-bold text-emerald-400 focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground font-medium">Fat (g)</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      required
                      value={formData.fat}
                      onChange={(e) => setFormData({ ...formData, fat: Number(e.target.value) })}
                      className="w-full bg-background border border-border rounded px-2 py-1.5 text-xs text-center font-bold text-amber-400 focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/50">
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground font-medium">Fiber (g)</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={formData.fiber}
                      onChange={(e) => setFormData({ ...formData, fiber: Number(e.target.value) })}
                      className="w-full bg-background border border-border rounded px-2 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground font-medium">Sugar (g)</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={formData.sugar}
                      onChange={(e) => setFormData({ ...formData, sugar: Number(e.target.value) })}
                      className="w-full bg-background border border-border rounded px-2 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground font-medium">Sodium (mg)</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={formData.sodium}
                      onChange={(e) => setFormData({ ...formData, sodium: Number(e.target.value) })}
                      className="w-full bg-background border border-border rounded px-2 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Barcode (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. 012345678905"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Notes (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Recommended for post-workout"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-5 py-2 rounded-lg text-sm transition shadow-sm disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingFood ? 'Save Changes' : 'Create Custom Food'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
