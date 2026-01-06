import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Heart, Plus, Trash2, Check, ChefHat, UtensilsCrossed, Coffee, Sun, Moon, Cookie, ListChecks, Clock, Users, Star, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { RecipeDetailView } from '@/components/privat/recipes/RecipeDetailView';
import { AddRecipeDialog } from '@/components/privat/recipes/AddRecipeDialog';

interface HealthItem {
  id: string;
  title: string;
  description: string | null;
  category: string;
  is_active: boolean;
  order_index: number;
}

interface NutritionRule {
  id: string;
  title: string;
  description: string | null;
  frequency_type: 'daily' | 'weekly';
  target_count: number;
  rule_type?: 'min' | 'max' | null;
  is_active: boolean;
}

interface Recipe {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  servings: number | null;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  taste_rating: number | null;
  health_rating: number | null;
}

interface MealLog {
  id: string;
  recipe_id: string;
  meal_type: string;
  meal_date: string;
}

interface RecipeNutritionRule {
  recipe_id: string;
  rule_id: string;
}

interface HealthCompletion {
  health_item_id: string;
}

interface UnifiedHealthSectionProps {
  onBack: () => void;
}

type ActiveView = 'main' | 'recipe-detail';
type ActiveTab = 'routine' | 'nutrition' | 'recipes';

const MEAL_TYPES = [
  { id: 'breakfast', label: 'Frühstück', icon: Coffee },
  { id: 'lunch', label: 'Mittagessen', icon: Sun },
  { id: 'dinner', label: 'Abendessen', icon: Moon },
  { id: 'snack', label: 'Snack', icon: Cookie },
];

const HEALTH_CATEGORIES = [
  { id: 'daily_routine', label: 'Tägliche Routine', color: '#22c55e' },
  { id: 'weekly_meals', label: 'Wöchentliche Gerichte', color: '#f59e0b' },
  { id: 'general', label: 'Allgemeine Tipps', color: '#8b5cf6' },
];

const RECIPE_CATEGORIES: Record<string, { label: string; color: string }> = {
  vorspeise: { label: 'Vorspeisen', color: 'bg-cyan-500' },
  hauptspeise: { label: 'Hauptgerichte', color: 'bg-orange-500' },
  nachspeise: { label: 'Nachspeisen', color: 'bg-pink-500' },
  getraenk: { label: 'Getränke', color: 'bg-amber-500' },
  suesswaren: { label: 'Süßwaren', color: 'bg-purple-500' },
  beilagen: { label: 'Beilagen', color: 'bg-green-500' },
};

export function UnifiedHealthSection({ onBack }: UnifiedHealthSectionProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('routine');
  const [activeView, setActiveView] = useState<ActiveView>('main');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  
  // Health items state
  const [healthItems, setHealthItems] = useState<HealthItem[]>([]);
  const [healthCompletions, setHealthCompletions] = useState<HealthCompletion[]>([]);
  const [healthDialogOpen, setHealthDialogOpen] = useState(false);
  const [editingHealthItem, setEditingHealthItem] = useState<HealthItem | null>(null);
  const [healthCategory, setHealthCategory] = useState<string>('daily_routine');
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState('daily_routine');
  
  // Nutrition state
  const [nutritionRules, setNutritionRules] = useState<NutritionRule[]>([]);
  const [mealLog, setMealLog] = useState<MealLog[]>([]);
  const [recipeRules, setRecipeRules] = useState<RecipeNutritionRule[]>([]);
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [mealDialogOpen, setMealDialogOpen] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState<string>('lunch');
  const [newRuleTitle, setNewRuleTitle] = useState('');
  const [newRuleFrequency, setNewRuleFrequency] = useState<'daily' | 'weekly'>('weekly');
  const [newRuleTarget, setNewRuleTarget] = useState('1');
  const [newRuleType, setNewRuleType] = useState<'min' | 'max'>('min');
  
  // Recipes state
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [recipeDialogOpen, setRecipeDialogOpen] = useState(false);
  
  const [loading, setLoading] = useState(true);

  const today = format(new Date(), 'yyyy-MM-dd');
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');

  useEffect(() => {
    if (user) fetchAllData();
  }, [user]);

  const fetchAllData = async () => {
    if (!user) return;
    setLoading(true);

    const [
      healthItemsRes,
      healthCompletionsRes,
      nutritionRulesRes,
      recipesRes,
      recipeRulesRes,
      mealLogRes,
    ] = await Promise.all([
      supabase.from('health_items').select('*').eq('user_id', user.id).eq('is_active', true).order('order_index'),
      supabase.from('health_completions').select('health_item_id').eq('user_id', user.id).eq('completed_date', today),
      supabase.from('nutrition_rules').select('*').eq('user_id', user.id).eq('is_active', true).order('order_index'),
      supabase.from('recipes').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('recipe_nutrition_rules').select('recipe_id, rule_id').eq('user_id', user.id),
      supabase.from('meal_log').select('*').eq('user_id', user.id).gte('meal_date', weekStart).lte('meal_date', weekEnd),
    ]);

    if (healthItemsRes.data) setHealthItems(healthItemsRes.data);
    if (healthCompletionsRes.data) setHealthCompletions(healthCompletionsRes.data);
    if (nutritionRulesRes.data) setNutritionRules(nutritionRulesRes.data as NutritionRule[]);
    if (recipesRes.data) setRecipes(recipesRes.data);
    if (recipeRulesRes.data) setRecipeRules(recipeRulesRes.data);
    if (mealLogRes.data) setMealLog(mealLogRes.data);
    setLoading(false);
  };

  // Health progress (daily routine only)
  const dailyItems = healthItems.filter(item => item.category === 'daily_routine');
  const dailyCompletedCount = dailyItems.filter(item => 
    healthCompletions.some(c => c.health_item_id === item.id)
  ).length;
  const dailyProgressPercent = dailyItems.length > 0 ? Math.round((dailyCompletedCount / dailyItems.length) * 100) : 0;

  // Nutrition rule progress
  const ruleProgress = useMemo(() => {
    const progress: Record<string, { current: number; target: number; fulfilled: boolean; ruleType: 'min' | 'max'; exceeded: boolean }> = {};
    nutritionRules.forEach(rule => {
      const relevantMeals = mealLog.filter(m => 
        rule.frequency_type === 'daily' ? m.meal_date === today : true
      );
      let count = 0;
      relevantMeals.forEach(meal => {
        if (recipeRules.some(rr => rr.recipe_id === meal.recipe_id && rr.rule_id === rule.id)) count++;
      });
      const ruleType = rule.rule_type || 'min';
      const fulfilled = ruleType === 'min' ? count >= rule.target_count : count <= rule.target_count;
      const exceeded = ruleType === 'max' && count > rule.target_count;
      progress[rule.id] = { current: count, target: rule.target_count, fulfilled, ruleType, exceeded };
    });
    return progress;
  }, [nutritionRules, mealLog, recipeRules, today]);

  const suggestedRecipes = useMemo(() => {
    // Get min-rules that are not yet fulfilled
    const unfulfilledMinRuleIds = nutritionRules
      .filter(r => (r.rule_type || 'min') === 'min' && !ruleProgress[r.id]?.fulfilled)
      .map(r => r.id);
    // Get max-rules that are exceeded (avoid these recipes)
    const exceededMaxRuleIds = nutritionRules
      .filter(r => r.rule_type === 'max' && ruleProgress[r.id]?.exceeded)
      .map(r => r.id);
    
    // Filter out recipes that would exceed max rules
    const safeRecipes = recipes.filter(recipe => {
      const recipeRuleIds = recipeRules.filter(rr => rr.recipe_id === recipe.id).map(rr => rr.rule_id);
      return !recipeRuleIds.some(rid => exceededMaxRuleIds.includes(rid));
    });
    
    if (unfulfilledMinRuleIds.length === 0) return safeRecipes;
    
    // Prioritize recipes that fulfill unfulfilled min-rules
    const suggested = safeRecipes.filter(recipe => 
      recipeRules.some(rr => rr.recipe_id === recipe.id && unfulfilledMinRuleIds.includes(rr.rule_id))
    );
    return suggested.length > 0 ? suggested : safeRecipes;
  }, [recipes, nutritionRules, ruleProgress, recipeRules]);

  const todayMeals = mealLog.filter(m => m.meal_date === today);

  // Handlers
  const handleToggleHealthCompletion = async (itemId: string) => {
    if (!user) return;
    const isCompleted = healthCompletions.some(c => c.health_item_id === itemId);
    if (isCompleted) {
      await supabase.from('health_completions').delete().eq('health_item_id', itemId).eq('completed_date', today);
    } else {
      await supabase.from('health_completions').insert({ user_id: user.id, health_item_id: itemId, completed_date: today });
    }
    fetchAllData();
  };

  const handleSaveHealthItem = async () => {
    if (!user || !formTitle.trim()) return;
    if (editingHealthItem) {
      await supabase.from('health_items').update({ title: formTitle.trim(), description: formDescription.trim() || null, category: formCategory }).eq('id', editingHealthItem.id);
    } else {
      await supabase.from('health_items').insert({ user_id: user.id, title: formTitle.trim(), description: formDescription.trim() || null, category: formCategory, order_index: healthItems.length });
    }
    resetHealthForm();
    fetchAllData();
  };

  const handleDeleteHealthItem = async (id: string) => {
    await supabase.from('health_items').delete().eq('id', id);
    fetchAllData();
  };

  const resetHealthForm = () => {
    setFormTitle('');
    setFormDescription('');
    setFormCategory('daily_routine');
    setEditingHealthItem(null);
    setHealthDialogOpen(false);
  };

  const handleAddNutritionRule = async () => {
    if (!user || !newRuleTitle.trim()) return;
    await supabase.from('nutrition_rules').insert({ 
      user_id: user.id, 
      title: newRuleTitle.trim(), 
      frequency_type: newRuleFrequency, 
      target_count: parseInt(newRuleTarget) || 1, 
      rule_type: newRuleType,
      order_index: nutritionRules.length 
    });
    setNewRuleTitle('');
    setNewRuleTarget('1');
    setNewRuleType('min');
    setRuleDialogOpen(false);
    fetchAllData();
  };

  const handleDeleteNutritionRule = async (id: string) => {
    await supabase.from('nutrition_rules').delete().eq('id', id);
    fetchAllData();
  };

  const handleAddMeal = async (recipeId: string) => {
    if (!user) return;
    await supabase.from('meal_log').insert({ user_id: user.id, recipe_id: recipeId, meal_type: selectedMealType, meal_date: today });
    setMealDialogOpen(false);
    fetchAllData();
  };

  const handleRemoveMeal = async (mealId: string) => {
    await supabase.from('meal_log').delete().eq('id', mealId);
    fetchAllData();
  };

  const getRecipeName = (recipeId: string) => recipes.find(r => r.id === recipeId)?.name || 'Unbekannt';

  // Recipe detail view
  if (activeView === 'recipe-detail' && selectedRecipe) {
    return (
      <RecipeDetailView
        recipe={selectedRecipe}
        onBack={() => { setActiveView('main'); setSelectedRecipe(null); }}
        onUpdate={fetchAllData}
      />
    );
  }

  const filteredHealthItems = healthItems.filter(item => item.category === healthCategory);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0 h-8 w-8">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg border-2 border-rose-500 bg-transparent">
            <Heart className="w-4 h-4 text-rose-500" />
          </div>
          <h1 className="text-lg font-bold">Gesundheit</h1>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="p-3 rounded-xl bg-card border border-border/50">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-muted-foreground">Tägliche Routine</span>
          <span className="text-sm font-bold text-rose-500">{dailyProgressPercent}%</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-rose-500 transition-all duration-500" style={{ width: `${dailyProgressPercent}%` }} />
        </div>
      </div>

      {/* Main Tabs */}
      <div className="flex gap-1 p-1 bg-muted rounded-lg">
        {[
          { id: 'routine' as const, label: 'Routine', icon: Heart },
          { id: 'nutrition' as const, label: 'Ernährung', icon: UtensilsCrossed },
          { id: 'recipes' as const, label: 'Rezepte', icon: ChefHat },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium transition-all ${
              activeTab === tab.id ? 'bg-background shadow-sm' : 'text-muted-foreground'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Routine Tab */}
      {activeTab === 'routine' && (
        <div className="space-y-3">
          {/* Category selector */}
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {HEALTH_CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setHealthCategory(cat.id)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                  healthCategory === cat.id ? 'text-white' : 'bg-muted text-muted-foreground'
                }`}
                style={{ backgroundColor: healthCategory === cat.id ? cat.color : undefined }}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Items */}
          <div className="space-y-1.5">
            {filteredHealthItems.map(item => {
              const isCompleted = healthCompletions.some(c => c.health_item_id === item.id);
              return (
                <div key={item.id} className={`p-2.5 rounded-lg border transition-all ${isCompleted ? 'bg-rose-500/10 border-rose-500/30' : 'bg-card border-border/50'}`}>
                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={() => handleToggleHealthCompletion(item.id)}
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${isCompleted ? 'bg-rose-500 border-rose-500 text-white' : 'border-muted-foreground/30'}`}
                    >
                      {isCompleted && <Check className="w-3 h-3" />}
                    </button>
                    <div className="flex-1 min-w-0" onClick={() => { setEditingHealthItem(item); setFormTitle(item.title); setFormDescription(item.description || ''); setFormCategory(item.category); setHealthDialogOpen(true); }}>
                      <p className={`text-sm font-medium ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>{item.title}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteHealthItem(item.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          <Button variant="outline" size="sm" className="w-full" onClick={() => { resetHealthForm(); setFormCategory(healthCategory); setHealthDialogOpen(true); }}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Hinzufügen
          </Button>
        </div>
      )}

      {/* Nutrition Tab */}
      {activeTab === 'nutrition' && (
        <div className="space-y-3">
          {/* Today's meals */}
          {MEAL_TYPES.map(mealType => {
            const meals = todayMeals.filter(m => m.meal_type === mealType.id);
            const Icon = mealType.icon;
            return (
              <div key={mealType.id} className="p-2.5 rounded-lg bg-card border border-border/50">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <Icon className="w-3.5 h-3.5 text-orange-500" />
                    <span className="text-xs font-medium">{mealType.label}</span>
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setSelectedMealType(mealType.id); setMealDialogOpen(true); }}>
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </div>
                {meals.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground">-</p>
                ) : (
                  <div className="space-y-1">
                    {meals.map(meal => (
                      <div key={meal.id} className="flex items-center justify-between py-0.5 px-1.5 rounded bg-muted/50">
                        <span className="text-xs">{getRecipeName(meal.recipe_id)}</span>
                        <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-destructive" onClick={() => handleRemoveMeal(meal.id)}>
                          <Trash2 className="w-2.5 h-2.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Rules status */}
          {nutritionRules.length > 0 && (
            <div className="p-2.5 rounded-lg bg-card border border-border/50">
              <div className="flex items-center gap-1.5 mb-2">
                <ListChecks className="w-3.5 h-3.5 text-orange-500" />
                <span className="text-xs font-medium">Regeln</span>
                <Button variant="ghost" size="icon" className="h-5 w-5 ml-auto" onClick={() => setRuleDialogOpen(true)}>
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
              <div className="space-y-1">
                {nutritionRules.map(rule => {
                  const progress = ruleProgress[rule.id];
                  const isFulfilled = progress?.fulfilled;
                  const isMax = progress?.ruleType === 'max';
                  const isExceeded = progress?.exceeded;
                  return (
                    <div key={rule.id} className={`flex items-center gap-1.5 py-1 px-1.5 rounded text-xs ${
                      isExceeded ? 'bg-rose-500/10' : isFulfilled ? 'bg-green-500/10' : 'bg-muted/50'
                    }`}>
                      <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                        isExceeded ? 'bg-rose-500 border-rose-500 text-white' : 
                        isFulfilled ? 'bg-green-500 border-green-500 text-white' : 'border-muted-foreground/30'
                      }`}>
                        {(isFulfilled || isExceeded) && <Check className="w-2 h-2" />}
                      </div>
                      <span className={`flex-1 ${isFulfilled && !isExceeded ? 'line-through text-muted-foreground' : ''}`}>
                        {isMax ? 'Max' : 'Min'} {rule.title}
                      </span>
                      <span className={isExceeded ? 'text-rose-500' : 'text-muted-foreground'}>
                        {progress?.current || 0}/{progress?.target}
                      </span>
                      <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteNutritionRule(rule.id)}>
                        <Trash2 className="w-2.5 h-2.5" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {nutritionRules.length === 0 && (
            <Button variant="outline" size="sm" className="w-full" onClick={() => setRuleDialogOpen(true)}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Ernährungsregel
            </Button>
          )}
        </div>
      )}

      {/* Recipes Tab */}
      {activeTab === 'recipes' && (
        <div className="space-y-2">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setRecipeDialogOpen(true)}>
              <Plus className="w-3 h-3 mr-1" /> Rezept
            </Button>
          </div>
          <AddRecipeDialog open={recipeDialogOpen} onOpenChange={setRecipeDialogOpen} onSuccess={fetchAllData} />
          
          {recipes.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <ChefHat className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Noch keine Rezepte</p>
              <Button size="sm" className="mt-2" onClick={() => setRecipeDialogOpen(true)}>
                <Plus className="w-3 h-3 mr-1" /> Rezept erstellen
              </Button>
            </div>
          ) : (
            recipes.map(recipe => {
              const config = recipe.category ? RECIPE_CATEGORIES[recipe.category] : null;
              const totalTime = (recipe.prep_time_minutes || 0) + (recipe.cook_time_minutes || 0);
              return (
                <div
                  key={recipe.id}
                  className="flex items-center gap-2.5 p-2 rounded-lg border bg-card border-border/50 cursor-pointer hover:border-primary/30 transition-all"
                  onClick={() => { setSelectedRecipe(recipe); setActiveView('recipe-detail'); }}
                >
                  <div className={`w-1 h-10 rounded-full ${config?.color || 'bg-zinc-500'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{recipe.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {totalTime > 0 && <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" /> {totalTime}m</span>}
                      {recipe.taste_rating && <span className="text-[10px] text-amber-500 flex items-center gap-0.5"><Star className="w-2.5 h-2.5" /> {recipe.taste_rating}</span>}
                      {recipe.health_rating && <span className="text-[10px] text-green-500 flex items-center gap-0.5"><TrendingUp className="w-2.5 h-2.5" /> {recipe.health_rating}</span>}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Health Item Dialog */}
      <Dialog open={healthDialogOpen} onOpenChange={setHealthDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingHealthItem ? 'Bearbeiten' : 'Neues Item'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Titel" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} />
            <Textarea placeholder="Beschreibung (optional)" value={formDescription} onChange={(e) => setFormDescription(e.target.value)} rows={2} />
            <Select value={formCategory} onValueChange={setFormCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {HEALTH_CATEGORIES.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={resetHealthForm}>Abbrechen</Button>
              <Button className="flex-1" onClick={handleSaveHealthItem} disabled={!formTitle.trim()}>Speichern</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Nutrition Rule Dialog */}
      <Dialog open={ruleDialogOpen} onOpenChange={setRuleDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Neue Ernährungsregel</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="z.B. Fleisch, Gemüse, Zucker..." value={newRuleTitle} onChange={(e) => setNewRuleTitle(e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <Select value={newRuleType} onValueChange={(v) => setNewRuleType(v as 'min' | 'max')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="min">Mindestens</SelectItem>
                  <SelectItem value="max">Maximal</SelectItem>
                </SelectContent>
              </Select>
              <Input type="number" min={1} value={newRuleTarget} onChange={(e) => setNewRuleTarget(e.target.value)} placeholder="Anzahl" />
            </div>
            <Select value={newRuleFrequency} onValueChange={(v) => setNewRuleFrequency(v as 'daily' | 'weekly')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">pro Tag</SelectItem>
                <SelectItem value="weekly">pro Woche</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setRuleDialogOpen(false)}>Abbrechen</Button>
              <Button className="flex-1" onClick={handleAddNutritionRule} disabled={!newRuleTitle.trim()}>Speichern</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Meal Selection Dialog */}
      <Dialog open={mealDialogOpen} onOpenChange={setMealDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{MEAL_TYPES.find(m => m.id === selectedMealType)?.label}</DialogTitle></DialogHeader>
          <div className="space-y-1.5 max-h-[60vh] overflow-y-auto">
            {suggestedRecipes.length === 0 ? (
              <p className="text-center py-6 text-sm text-muted-foreground">Keine Rezepte</p>
            ) : (
              suggestedRecipes.map(recipe => {
                const matchingRuleIds = recipeRules.filter(rr => rr.recipe_id === recipe.id).map(rr => rr.rule_id);
                const matchingRules = nutritionRules.filter(r => matchingRuleIds.includes(r.id) && !ruleProgress[r.id]?.fulfilled);
                return (
                  <button
                    key={recipe.id}
                    onClick={() => handleAddMeal(recipe.id)}
                    className="w-full p-2.5 rounded-lg bg-muted/50 hover:bg-muted text-left transition-all"
                  >
                    <p className="text-sm font-medium">{recipe.name}</p>
                    {matchingRules.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {matchingRules.map(r => (
                          <span key={r.id} className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-600">{r.title}</span>
                        ))}
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
