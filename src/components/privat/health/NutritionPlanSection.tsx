import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Plus, Trash2, Check, UtensilsCrossed, Coffee, Sun, Moon, Cookie, ListChecks, ChefHat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { de } from 'date-fns/locale';

interface NutritionRule {
  id: string;
  title: string;
  description: string | null;
  frequency_type: 'daily' | 'weekly';
  target_count: number;
  is_active: boolean;
}

interface Recipe {
  id: string;
  name: string;
  category: string | null;
}

interface RecipeNutritionRule {
  recipe_id: string;
  rule_id: string;
}

interface MealLog {
  id: string;
  recipe_id: string;
  meal_type: string;
  meal_date: string;
}

interface NutritionPlanSectionProps {
  onBack: () => void;
}

const MEAL_TYPES = [
  { id: 'breakfast', label: 'Frühstück', icon: Coffee },
  { id: 'lunch', label: 'Mittagessen', icon: Sun },
  { id: 'dinner', label: 'Abendessen', icon: Moon },
  { id: 'snack', label: 'Snack', icon: Cookie },
];

export function NutritionPlanSection({ onBack }: NutritionPlanSectionProps) {
  const { user } = useAuth();
  const [rules, setRules] = useState<NutritionRule[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [recipeRules, setRecipeRules] = useState<RecipeNutritionRule[]>([]);
  const [mealLog, setMealLog] = useState<MealLog[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [mealDialogOpen, setMealDialogOpen] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState<string>('lunch');
  
  const [newRuleTitle, setNewRuleTitle] = useState('');
  const [newRuleFrequency, setNewRuleFrequency] = useState<'daily' | 'weekly'>('daily');
  const [newRuleTarget, setNewRuleTarget] = useState('1');

  const [activeTab, setActiveTab] = useState<'today' | 'rules'>('today');

  const today = format(new Date(), 'yyyy-MM-dd');
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    const [rulesRes, recipesRes, recipeRulesRes, mealLogRes] = await Promise.all([
      supabase
        .from('nutrition_rules')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('order_index'),
      supabase
        .from('recipes')
        .select('id, name, category')
        .eq('user_id', user.id),
      supabase
        .from('recipe_nutrition_rules')
        .select('recipe_id, rule_id')
        .eq('user_id', user.id),
      supabase
        .from('meal_log')
        .select('*')
        .eq('user_id', user.id)
        .gte('meal_date', weekStart)
        .lte('meal_date', weekEnd),
    ]);

    if (rulesRes.data) setRules(rulesRes.data as NutritionRule[]);
    if (recipesRes.data) setRecipes(recipesRes.data);
    if (recipeRulesRes.data) setRecipeRules(recipeRulesRes.data);
    if (mealLogRes.data) setMealLog(mealLogRes.data);
    setLoading(false);
  };

  // Berechne welche Regeln heute/diese Woche bereits erfüllt sind
  const ruleProgress = useMemo(() => {
    const progress: Record<string, { current: number; target: number; fulfilled: boolean }> = {};
    
    rules.forEach(rule => {
      const relevantMeals = mealLog.filter(m => 
        rule.frequency_type === 'daily' 
          ? m.meal_date === today 
          : true // weekly: alle Meals der Woche
      );
      
      // Zähle wie oft diese Regel durch gegessene Rezepte erfüllt wurde
      let count = 0;
      relevantMeals.forEach(meal => {
        const recipeHasRule = recipeRules.some(
          rr => rr.recipe_id === meal.recipe_id && rr.rule_id === rule.id
        );
        if (recipeHasRule) count++;
      });
      
      progress[rule.id] = {
        current: count,
        target: rule.target_count,
        fulfilled: count >= rule.target_count,
      };
    });
    
    return progress;
  }, [rules, mealLog, recipeRules, today]);

  // Vorgeschlagene Rezepte: Nur solche, die unerfüllte Regeln abdecken
  const suggestedRecipes = useMemo(() => {
    const unfulfilledRuleIds = rules
      .filter(r => !ruleProgress[r.id]?.fulfilled)
      .map(r => r.id);
    
    if (unfulfilledRuleIds.length === 0) return recipes;
    
    // Rezepte die mindestens eine unerfüllte Regel abdecken
    const suggested = recipes.filter(recipe => 
      recipeRules.some(rr => 
        rr.recipe_id === recipe.id && unfulfilledRuleIds.includes(rr.rule_id)
      )
    );
    
    // Fallback: Alle Rezepte wenn keine Vorschläge
    return suggested.length > 0 ? suggested : recipes;
  }, [recipes, rules, ruleProgress, recipeRules]);

  // Heute gegessene Mahlzeiten
  const todayMeals = mealLog.filter(m => m.meal_date === today);

  const handleAddRule = async () => {
    if (!user || !newRuleTitle.trim()) return;
    
    await supabase.from('nutrition_rules').insert({
      user_id: user.id,
      title: newRuleTitle.trim(),
      frequency_type: newRuleFrequency,
      target_count: parseInt(newRuleTarget) || 1,
      order_index: rules.length,
    });
    
    setNewRuleTitle('');
    setNewRuleTarget('1');
    setRuleDialogOpen(false);
    fetchData();
  };

  const handleDeleteRule = async (id: string) => {
    await supabase.from('nutrition_rules').delete().eq('id', id);
    fetchData();
  };

  const handleAddMeal = async (recipeId: string) => {
    if (!user) return;
    
    await supabase.from('meal_log').insert({
      user_id: user.id,
      recipe_id: recipeId,
      meal_type: selectedMealType,
      meal_date: today,
    });
    
    setMealDialogOpen(false);
    fetchData();
  };

  const handleRemoveMeal = async (mealId: string) => {
    await supabase.from('meal_log').delete().eq('id', mealId);
    fetchData();
  };

  const getRecipeName = (recipeId: string) => {
    return recipes.find(r => r.id === recipeId)?.name || 'Unbekannt';
  };

  // Gesamtfortschritt berechnen
  const totalProgress = useMemo(() => {
    const dailyRules = rules.filter(r => r.frequency_type === 'daily');
    if (dailyRules.length === 0) return 0;
    const fulfilled = dailyRules.filter(r => ruleProgress[r.id]?.fulfilled).length;
    return Math.round((fulfilled / dailyRules.length) * 100);
  }, [rules, ruleProgress]);

  if (loading) return null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0 h-8 w-8">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg border-2 border-orange-500 bg-transparent">
            <UtensilsCrossed className="w-4 h-4 text-orange-500" />
          </div>
          <h1 className="text-lg font-bold">Ernährungsplan</h1>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="p-4 rounded-xl bg-card border border-border/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">Täglicher Fortschritt</span>
          <span className="text-lg font-bold text-orange-500">{totalProgress}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-orange-500 transition-all duration-500"
            style={{ width: `${totalProgress}%` }}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('today')}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'today'
              ? 'bg-orange-500 text-white'
              : 'bg-muted text-muted-foreground'
          }`}
        >
          Heute
        </button>
        <button
          onClick={() => setActiveTab('rules')}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'rules'
              ? 'bg-orange-500 text-white'
              : 'bg-muted text-muted-foreground'
          }`}
        >
          Regeln
        </button>
      </div>

      {activeTab === 'today' ? (
        <div className="space-y-4">
          {/* Mahlzeiten heute */}
          {MEAL_TYPES.map(mealType => {
            const meals = todayMeals.filter(m => m.meal_type === mealType.id);
            const Icon = mealType.icon;
            
            return (
              <div key={mealType.id} className="p-3 rounded-xl bg-card border border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-orange-500" />
                    <span className="font-medium text-sm">{mealType.label}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => {
                      setSelectedMealType(mealType.id);
                      setMealDialogOpen(true);
                    }}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                
                {meals.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Noch nichts eingetragen</p>
                ) : (
                  <div className="space-y-1">
                    {meals.map(meal => (
                      <div key={meal.id} className="flex items-center justify-between py-1 px-2 rounded bg-muted/50">
                        <span className="text-sm">{getRecipeName(meal.recipe_id)}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemoveMeal(meal.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Regelstatus */}
          {rules.length > 0 && (
            <div className="p-3 rounded-xl bg-card border border-border/50">
              <div className="flex items-center gap-2 mb-3">
                <ListChecks className="w-4 h-4 text-orange-500" />
                <span className="font-medium text-sm">Regelstatus</span>
              </div>
              <div className="space-y-2">
                {rules.map(rule => {
                  const progress = ruleProgress[rule.id];
                  const isFulfilled = progress?.fulfilled;
                  
                  return (
                    <div 
                      key={rule.id} 
                      className={`flex items-center gap-2 py-1.5 px-2 rounded ${
                        isFulfilled ? 'bg-green-500/10' : 'bg-muted/50'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        isFulfilled 
                          ? 'bg-green-500 border-green-500 text-white'
                          : 'border-muted-foreground/30'
                      }`}>
                        {isFulfilled && <Check className="w-2.5 h-2.5" />}
                      </div>
                      <span className={`text-sm flex-1 ${isFulfilled ? 'line-through text-muted-foreground' : ''}`}>
                        {rule.title}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {progress?.current || 0}/{progress?.target || 1}
                        {rule.frequency_type === 'weekly' && '/Woche'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {/* Regeln verwalten */}
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full"
            onClick={() => setRuleDialogOpen(true)}
          >
            <Plus className="w-4 h-4 mr-1" />
            Neue Regel
          </Button>

          {rules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ListChecks className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Noch keine Regeln erstellt</p>
              <p className="text-xs mt-1">z.B. "Täglich Gemüse" oder "2x Fisch pro Woche"</p>
            </div>
          ) : (
            rules.map(rule => (
              <div 
                key={rule.id}
                className="p-3 rounded-xl bg-card border border-border/50"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-sm">{rule.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {rule.target_count}x {rule.frequency_type === 'daily' ? 'täglich' : 'pro Woche'}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDeleteRule(rule.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Regel hinzufügen Dialog */}
      <Dialog open={ruleDialogOpen} onOpenChange={setRuleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neue Ernährungsregel</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="z.B. Gemüse essen"
              value={newRuleTitle}
              onChange={(e) => setNewRuleTitle(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-3">
              <Select value={newRuleFrequency} onValueChange={(v) => setNewRuleFrequency(v as 'daily' | 'weekly')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Täglich</SelectItem>
                  <SelectItem value="weekly">Wöchentlich</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="number"
                min={1}
                value={newRuleTarget}
                onChange={(e) => setNewRuleTarget(e.target.value)}
                placeholder="Anzahl"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setRuleDialogOpen(false)}>
                Abbrechen
              </Button>
              <Button className="flex-1" onClick={handleAddRule} disabled={!newRuleTitle.trim()}>
                Speichern
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Mahlzeit hinzufügen Dialog */}
      <Dialog open={mealDialogOpen} onOpenChange={setMealDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {MEAL_TYPES.find(m => m.id === selectedMealType)?.label} hinzufügen
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {suggestedRecipes.length > 0 && rules.some(r => !ruleProgress[r.id]?.fulfilled) && (
              <p className="text-xs text-muted-foreground mb-2">
                Vorschläge basierend auf unerfüllten Regeln:
              </p>
            )}
            {suggestedRecipes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ChefHat className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Noch keine Rezepte vorhanden</p>
              </div>
            ) : (
              suggestedRecipes.map(recipe => {
                const recipeRuleIds = recipeRules
                  .filter(rr => rr.recipe_id === recipe.id)
                  .map(rr => rr.rule_id);
                const matchingRules = rules.filter(r => 
                  recipeRuleIds.includes(r.id) && !ruleProgress[r.id]?.fulfilled
                );
                
                return (
                  <button
                    key={recipe.id}
                    onClick={() => handleAddMeal(recipe.id)}
                    className="w-full p-3 rounded-lg bg-muted/50 hover:bg-muted text-left transition-colors"
                  >
                    <p className="font-medium text-sm">{recipe.name}</p>
                    {matchingRules.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {matchingRules.map(rule => (
                          <span 
                            key={rule.id}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-600"
                          >
                            {rule.title}
                          </span>
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