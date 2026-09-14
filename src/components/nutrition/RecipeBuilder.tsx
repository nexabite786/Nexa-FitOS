import React, { useState, useEffect } from 'react';
import { 
  Utensils, 
  Plus, 
  Search, 
  Trash2, 
  Clock, 
  Flame, 
  ChevronRight, 
  X, 
  ArrowLeft,
  Check,
  Edit2,
  Archive,
  BookOpen
} from 'lucide-react';
import { Recipe, RecipeIngredient, Food, MacroNutrients } from '../../types/nutrition';
import { 
  fetchRecipes, 
  createRecipe, 
  updateRecipe, 
  archiveRecipe,
  calculateItemNutrition,
  calculateRecipeNutrition 
} from '../../lib/nutritionService';
import { FoodLibraryView } from './FoodLibraryView';

interface RecipeBuilderProps {
  tenantId: string;
  isOwnerOrTrainer?: boolean;
}

export function RecipeBuilder({
  tenantId,
  isOwnerOrTrainer = true
}: RecipeBuilderProps) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Editing state
  const [isEditing, setIsEditing] = useState(false);
  const [currentRecipeId, setCurrentRecipeId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [servings, setServings] = useState(2);
  const [prepTimeMinutes, setPrepTimeMinutes] = useState(10);
  const [cookTimeMinutes, setCookTimeMinutes] = useState(20);
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);
  const [instructions, setInstructions] = useState<string[]>(['']);
  const [saving, setSaving] = useState(false);
  const [showFoodPicker, setShowFoodPicker] = useState(false);

  // Details modal
  const [selectedRecipeDetails, setSelectedRecipeDetails] = useState<Recipe | null>(null);

  const loadRecipes = async () => {
    setLoading(true);
    try {
      const data = await fetchRecipes(tenantId, { search: searchQuery });
      setRecipes(data);
    } catch (err) {
      console.error('Failed to load recipes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecipes();
  }, [tenantId, searchQuery]);

  const handleOpenCreate = () => {
    setCurrentRecipeId(null);
    setName('');
    setDescription('');
    setServings(2);
    setPrepTimeMinutes(10);
    setCookTimeMinutes(15);
    setIngredients([]);
    setInstructions(['']);
    setIsEditing(true);
  };

  const handleOpenEdit = (recipe: Recipe) => {
    setCurrentRecipeId(recipe.id);
    setName(recipe.name);
    setDescription(recipe.description || '');
    setServings(recipe.servings || 1);
    setPrepTimeMinutes(recipe.prepTimeMinutes || 0);
    setCookTimeMinutes(recipe.cookTimeMinutes || 0);
    setIngredients(recipe.ingredients || []);
    setInstructions(recipe.instructions && recipe.instructions.length > 0 ? recipe.instructions : ['']);
    setIsEditing(true);
  };

  const handleAddIngredientFood = (food: Food) => {
    const qty = food.servingSize || 100;
    const unit = food.servingUnit || 'g';
    const computed = calculateItemNutrition(food, qty, unit);

    const newIng: RecipeIngredient = {
      foodId: food.id,
      foodName: food.name,
      quantity: qty,
      unit,
      calories: computed.calories,
      protein: computed.protein,
      carbs: computed.carbs,
      fat: computed.fat,
      fiber: computed.fiber
    };

    setIngredients([...ingredients, newIng]);
    setShowFoodPicker(false);
  };

  const handleUpdateIngredientQty = (index: number, newQty: number) => {
    const safeQty = Math.max(0, newQty);
    const updated = [...ingredients];
    const ing = updated[index];
    const ratio = ing.quantity > 0 ? safeQty / ing.quantity : 1;

    ing.quantity = safeQty;
    ing.calories = Math.round(ing.calories * ratio);
    ing.protein = Math.round(ing.protein * ratio * 10) / 10;
    ing.carbs = Math.round(ing.carbs * ratio * 10) / 10;
    ing.fat = Math.round(ing.fat * ratio * 10) / 10;

    setIngredients(updated);
  };

  const handleRemoveIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const handleInstructionChange = (index: number, val: string) => {
    const updated = [...instructions];
    updated[index] = val;
    setInstructions(updated);
  };

  const handleAddInstructionStep = () => {
    setInstructions([...instructions, '']);
  };

  const handleRemoveInstructionStep = (index: number) => {
    if (instructions.length <= 1) {
      setInstructions(['']);
      return;
    }
    setInstructions(instructions.filter((_, i) => i !== index));
  };

  const { totalNutrition, perServingNutrition } = calculateRecipeNutrition(ingredients, servings);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Please enter a recipe title.');
      return;
    }
    if (ingredients.length === 0) {
      alert('Please add at least one ingredient to the recipe.');
      return;
    }

    setSaving(true);
    try {
      const validInstructions = instructions.filter(i => i.trim().length > 0);

      if (currentRecipeId) {
        await updateRecipe(tenantId, currentRecipeId, {
          name: name.trim(),
          description,
          servings: Number(servings),
          prepTimeMinutes: Number(prepTimeMinutes),
          cookTimeMinutes: Number(cookTimeMinutes),
          ingredients,
          instructions: validInstructions
        });
      } else {
        await createRecipe(tenantId, {
          name: name.trim(),
          description,
          servings: Number(servings),
          prepTimeMinutes: Number(prepTimeMinutes),
          cookTimeMinutes: Number(cookTimeMinutes),
          ingredients,
          instructions: validInstructions
        });
      }

      setIsEditing(false);
      loadRecipes();
    } catch (err: any) {
      alert(err.message || 'Failed to save recipe.');
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (recipe: Recipe) => {
    if (window.confirm(`Archive recipe "${recipe.name}"?`)) {
      try {
        await archiveRecipe(tenantId, recipe.id, true);
        loadRecipes();
      } catch (err) {
        console.error('Failed to archive recipe:', err);
      }
    }
  };

  return (
    <div className="space-y-6">
      {!isEditing ? (
        <>
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-display font-bold tracking-tight flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                Recipe & Meal Engine
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Build reusable ingredient-based recipes with automated per-serving macro splits.
              </p>
            </div>

            {isOwnerOrTrainer && (
              <button
                onClick={handleOpenCreate}
                className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-4 py-2.5 rounded-lg transition text-sm shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Create Recipe
              </button>
            )}
          </div>

          {/* Search */}
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="relative">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search recipes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-background border border-border rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* Recipes List */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-card border border-border rounded-xl p-5 animate-pulse space-y-3">
                  <div className="h-5 bg-accent/60 rounded w-2/3" />
                  <div className="h-4 bg-accent/40 rounded w-1/3" />
                  <div className="h-10 bg-accent/30 rounded w-full" />
                </div>
              ))}
            </div>
          ) : recipes.length === 0 ? (
            <div className="bg-card border border-border border-dashed rounded-xl p-12 text-center space-y-3">
              <BookOpen className="w-10 h-10 text-muted-foreground/40 mx-auto" />
              <h3 className="text-base font-semibold">No recipes crafted yet</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Combine raw ingredients from your food library into reusable recipes for meal plans.
              </p>
              {isOwnerOrTrainer && (
                <button
                  onClick={handleOpenCreate}
                  className="inline-flex items-center gap-2 text-primary text-sm font-medium hover:underline pt-2"
                >
                  <Plus className="w-4 h-4" />
                  Craft a recipe now
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recipes.map((recipe) => (
                <div
                  key={recipe.id}
                  className="bg-card border border-border rounded-xl p-5 flex flex-col justify-between hover:border-primary/40 transition space-y-3 cursor-pointer group"
                  onClick={() => setSelectedRecipeDetails(recipe)}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-base font-bold font-display text-foreground group-hover:text-primary transition line-clamp-1">
                          {recipe.name}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {recipe.servings} {recipe.servings === 1 ? 'serving' : 'servings'} • {(recipe.prepTimeMinutes || 0) + (recipe.cookTimeMinutes || 0)} min
                        </p>
                      </div>

                      {isOwnerOrTrainer && (
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleOpenEdit(recipe)}
                            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition"
                            title="Edit Recipe"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleArchive(recipe)}
                            className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition"
                            title="Archive Recipe"
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {recipe.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{recipe.description}</p>
                    )}

                    {/* Per Serving Box */}
                    <div className="bg-background/80 border border-border rounded-lg p-2.5 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Per Serving</span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-lg font-bold font-display text-primary">{recipe.perServingNutrition?.calories || 0}</span>
                          <span className="text-[10px] text-muted-foreground">kcal</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-foreground">P: <strong>{recipe.perServingNutrition?.protein || 0}g</strong></span>
                        <span className="text-emerald-400">C: <strong>{recipe.perServingNutrition?.carbs || 0}g</strong></span>
                        <span className="text-amber-400">F: <strong>{recipe.perServingNutrition?.fat || 0}g</strong></span>
                      </div>
                    </div>

                    <p className="text-[11px] text-muted-foreground">
                      {recipe.ingredients?.length || 0} ingredients
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        /* Recipe Editor View */
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsEditing(false)}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-lg font-bold font-display text-foreground">
                  {currentRecipeId ? 'Edit Recipe' : 'Craft New Recipe'}
                </h2>
                <p className="text-xs text-muted-foreground">
                  Define ingredients, portions, instructions, and macro calculations.
                </p>
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-5 py-2 rounded-lg text-sm transition shadow-sm disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Recipe'}
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            {/* Primary info */}
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Recipe Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. High-Protein Blueberry Oatmeal"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Description</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Nutrient-dense complex breakfast carbohydrate with clean isolate protein."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Servings Yield *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={servings}
                    onChange={(e) => setServings(Number(e.target.value))}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Prep Time (Min)</label>
                  <input
                    type="number"
                    min="0"
                    value={prepTimeMinutes}
                    onChange={(e) => setPrepTimeMinutes(Number(e.target.value))}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Cook Time (Min)</label>
                  <input
                    type="number"
                    min="0"
                    value={cookTimeMinutes}
                    onChange={(e) => setCookTimeMinutes(Number(e.target.value))}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
            </div>

            {/* Ingredients Section */}
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Ingredients & Portions</h3>
                  <p className="text-xs text-muted-foreground">Select foods from library to build the recipe.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowFoodPicker(true)}
                  className="flex items-center gap-1.5 bg-accent hover:bg-accent/80 text-foreground font-medium px-3 py-1.5 rounded-lg text-xs transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Ingredient
                </button>
              </div>

              {ingredients.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted-foreground border border-dashed border-border rounded-lg">
                  No ingredients added yet. Click &quot;Add Ingredient&quot; above to select foods.
                </div>
              ) : (
                <div className="space-y-2">
                  {ingredients.map((ing, idx) => (
                    <div
                      key={idx}
                      className="bg-background border border-border rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <span className="font-semibold text-foreground truncate">{ing.foodName}</span>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 bg-card border border-border px-2 py-1 rounded">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={ing.quantity}
                            onChange={(e) => handleUpdateIngredientQty(idx, Number(e.target.value))}
                            className="w-14 bg-transparent text-center font-bold text-foreground focus:outline-none"
                          />
                          <span className="text-muted-foreground text-[10px]">{ing.unit}</span>
                        </div>

                        <div className="flex items-center gap-2 text-[11px]">
                          <span className="font-bold text-primary">{ing.calories} kcal</span>
                          <span className="text-muted-foreground">P: {ing.protein}g</span>
                          <span className="text-muted-foreground">C: {ing.carbs}g</span>
                          <span className="text-muted-foreground">F: {ing.fat}g</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveIngredient(idx)}
                          className="p-1 text-muted-foreground hover:text-destructive transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Live Computed Totals vs Per Serving */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-border">
                <div className="bg-background border border-border rounded-lg p-3 space-y-1">
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase">Total Batch Yield ({servings} Servings)</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-bold font-display text-foreground">{totalNutrition.calories} kcal</span>
                    <span className="text-xs text-muted-foreground">
                      P: {totalNutrition.protein}g | C: {totalNutrition.carbs}g | F: {totalNutrition.fat}g
                    </span>
                  </div>
                </div>

                <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 space-y-1">
                  <span className="text-[10px] text-primary font-semibold uppercase">Per Individual Serving</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-bold font-display text-primary">{perServingNutrition.calories} kcal</span>
                    <span className="text-xs text-foreground font-medium">
                      P: {perServingNutrition.protein}g | C: {perServingNutrition.carbs}g | F: {perServingNutrition.fat}g
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Preparation Steps */}
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Preparation & Cooking Steps</h3>
                  <p className="text-xs text-muted-foreground">Clear culinary instructions for clients.</p>
                </div>
                <button
                  type="button"
                  onClick={handleAddInstructionStep}
                  className="flex items-center gap-1.5 bg-accent hover:bg-accent/80 text-foreground font-medium px-3 py-1.5 rounded-lg text-xs transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Step
                </button>
              </div>

              <div className="space-y-2">
                {instructions.map((step, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="w-6 text-xs font-bold text-muted-foreground text-right">{idx + 1}.</span>
                    <input
                      type="text"
                      placeholder={`Step ${idx + 1} instructions...`}
                      value={step}
                      onChange={(e) => handleInstructionChange(idx, e.target.value)}
                      className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveInstructionStep(idx)}
                      className="p-1.5 text-muted-foreground hover:text-destructive transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </form>

          {/* Food Picker Modal */}
          {showFoodPicker && (
            <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-card border border-border rounded-xl w-full max-w-4xl max-h-[85vh] p-6 space-y-4 shadow-2xl relative flex flex-col">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <h3 className="text-base font-bold font-display text-foreground flex items-center gap-2">
                    <Utensils className="w-4 h-4 text-primary" />
                    Select Ingredient from Library
                  </h3>
                  <button
                    onClick={() => setShowFoodPicker(false)}
                    className="p-1 text-muted-foreground hover:text-foreground rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="overflow-y-auto flex-1 pr-1">
                  <FoodLibraryView
                    tenantId={tenantId}
                    isOwnerOrTrainer={false}
                    selectionMode={true}
                    onSelectFood={handleAddIngredientFood}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recipe Details View Modal */}
      {selectedRecipeDetails && !isEditing && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-lg p-6 space-y-5 shadow-2xl relative animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedRecipeDetails(null)}
              className="absolute right-4 top-4 p-1 text-muted-foreground hover:text-foreground rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <h3 className="text-lg font-bold font-display text-foreground">{selectedRecipeDetails.name}</h3>
              <p className="text-xs text-muted-foreground">
                {selectedRecipeDetails.servings} Servings • Prep: {selectedRecipeDetails.prepTimeMinutes || 0}m • Cook: {selectedRecipeDetails.cookTimeMinutes || 0}m
              </p>
            </div>

            {selectedRecipeDetails.description && (
              <p className="text-xs text-muted-foreground">{selectedRecipeDetails.description}</p>
            )}

            {/* Per Serving Box */}
            <div className="bg-accent/30 border border-border rounded-xl p-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-muted-foreground uppercase font-semibold">Per Serving</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold font-display text-primary">{selectedRecipeDetails.perServingNutrition?.calories}</span>
                  <span className="text-xs text-muted-foreground">kcal</span>
                </div>
              </div>
              <div className="text-right text-xs space-y-0.5">
                <p>Protein: <strong className="text-foreground">{selectedRecipeDetails.perServingNutrition?.protein}g</strong></p>
                <p>Carbs: <strong className="text-emerald-400">{selectedRecipeDetails.perServingNutrition?.carbs}g</strong></p>
                <p>Fat: <strong className="text-amber-400">{selectedRecipeDetails.perServingNutrition?.fat}g</strong></p>
              </div>
            </div>

            {/* Ingredients */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ingredients</h4>
              <div className="space-y-1 text-xs">
                {selectedRecipeDetails.ingredients?.map((ing, i) => (
                  <div key={i} className="flex items-center justify-between py-1 border-b border-border/50">
                    <span className="text-foreground">{ing.foodName}</span>
                    <span className="font-semibold text-muted-foreground">{ing.quantity} {ing.unit}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Instructions */}
            {selectedRecipeDetails.instructions && selectedRecipeDetails.instructions.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Directions</h4>
                <ol className="space-y-1.5 text-xs text-muted-foreground list-decimal pl-4">
                  {selectedRecipeDetails.instructions.map((inst, i) => (
                    <li key={i} className="leading-relaxed">{inst}</li>
                  ))}
                </ol>
              </div>
            )}

            <div className="flex items-center gap-2 pt-2 border-t border-border">
              {isOwnerOrTrainer && (
                <button
                  onClick={() => {
                    const r = selectedRecipeDetails;
                    setSelectedRecipeDetails(null);
                    handleOpenEdit(r);
                  }}
                  className="flex-1 bg-accent hover:bg-accent/80 text-foreground py-2 rounded-lg text-xs font-semibold transition"
                >
                  Edit Recipe
                </button>
              )}
              <button
                onClick={() => setSelectedRecipeDetails(null)}
                className="flex-1 bg-card border border-border hover:bg-accent text-muted-foreground py-2 rounded-lg text-xs font-medium transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
