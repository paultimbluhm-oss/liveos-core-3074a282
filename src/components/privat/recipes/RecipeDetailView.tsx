import { useState, useEffect } from 'react';
import { ArrowLeft, Trash2, Clock, Users, Minus, Plus, Soup, UtensilsCrossed, Cake, Coffee, ChefHat, Star, TrendingUp, Timer, Pencil, Cookie, Salad } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getSupabase } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { EditRecipeDialog } from './EditRecipeDialog';

const categoryConfig: Record<string, { label: string; icon: typeof Soup; color: string }> = {
  vorspeise: { label: 'Vorspeise', icon: Soup, color: 'from-cyan-500 to-teal-600' },
  hauptspeise: { label: 'Hauptgericht', icon: UtensilsCrossed, color: 'from-orange-500 to-red-600' },
  nachspeise: { label: 'Nachspeise', icon: Cake, color: 'from-pink-500 to-rose-600' },
  getraenk: { label: 'Getränk', icon: Coffee, color: 'from-amber-500 to-yellow-600' },
  suesswaren: { label: 'Süßwaren', icon: Cookie, color: 'from-purple-500 to-pink-600' },
  beilagen: { label: 'Beilagen', icon: Salad, color: 'from-green-500 to-emerald-600' },
};

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

interface Ingredient {
  id: string;
  name: string;
  amount: number | null;
  unit: string | null;
  order_index: number | null;
}

interface Step {
  id: string;
  step_number: number;
  instruction: string;
}

interface RecipeDetailViewProps {
  recipe: Recipe;
  onBack: () => void;
  onUpdate: () => void;
}

export function RecipeDetailView({ recipe, onBack, onUpdate }: RecipeDetailViewProps) {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [steps, setSteps] = useState<Step[]>([]);
  const [desiredServings, setDesiredServings] = useState(recipe.servings || 4);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const baseServings = recipe.servings || 4;

  useEffect(() => {
    fetchDetails();
  }, [recipe.id]);

  const fetchDetails = async () => {
    const supabase = getSupabase();
    const [ingredientsRes, stepsRes] = await Promise.all([
      supabase
        .from('recipe_ingredients')
        .select('*')
        .eq('recipe_id', recipe.id)
        .order('order_index'),
      supabase
        .from('recipe_steps')
        .select('*')
        .eq('recipe_id', recipe.id)
        .order('step_number'),
    ]);

    if (ingredientsRes.data) setIngredients(ingredientsRes.data);
    if (stepsRes.data) setSteps(stepsRes.data);
  };

  const handleDelete = async () => {
    const supabase = getSupabase();
    const { error } = await supabase.from('recipes').delete().eq('id', recipe.id);
    if (error) {
      toast.error('Fehler beim Loschen');
      return;
    }
    toast.success('Rezept geloscht');
    onUpdate();
    onBack();
  };

  const adjustServings = (delta: number) => {
    const newServings = desiredServings + delta;
    if (newServings >= 1 && newServings <= 50) {
      setDesiredServings(newServings);
    }
  };

  // Calculate scaled amount based on desired servings
  const calculateAmount = (originalAmount: number | null) => {
    if (!originalAmount) return null;
    const scaleFactor = desiredServings / baseServings;
    const adjusted = originalAmount * scaleFactor;
    
    // Format nicely
    if (adjusted % 1 === 0) {
      return adjusted.toString();
    } else if (adjusted < 1) {
      // Handle fractions nicely
      const decimal = adjusted;
      if (Math.abs(decimal - 0.25) < 0.01) return '1/4';
      if (Math.abs(decimal - 0.33) < 0.02) return '1/3';
      if (Math.abs(decimal - 0.5) < 0.01) return '1/2';
      if (Math.abs(decimal - 0.66) < 0.02) return '2/3';
      if (Math.abs(decimal - 0.75) < 0.01) return '3/4';
      return adjusted.toFixed(1);
    } else {
      return adjusted.toFixed(1).replace(/\.0$/, '');
    }
  };

  const totalTime = (recipe.prep_time_minutes || 0) + (recipe.cook_time_minutes || 0);
  const config = recipe.category ? categoryConfig[recipe.category] : null;
  const CategoryIcon = config?.icon || ChefHat;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" className="shrink-0" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-bold truncate">{recipe.name}</h1>
            {config && (
              <div className="flex items-center gap-2 mt-1">
                <div className={`p-1 rounded bg-gradient-to-br ${config.color}`}>
                  <CategoryIcon className="w-3 h-3 text-white" />
                </div>
                <span className="text-sm text-muted-foreground">{config.label}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="icon" onClick={() => setEditDialogOpen(true)}>
            <Pencil className="w-5 h-5" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="text-destructive">
                <Trash2 className="w-5 h-5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Rezept löschen?</AlertDialogTitle>
                <AlertDialogDescription>
                  Diese Aktion kann nicht rückgängig gemacht werden.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                  Löschen
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <EditRecipeDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        recipe={recipe}
        onSuccess={() => {
          onUpdate();
          onBack();
        }}
      />

      {recipe.description && (
        <p className="text-muted-foreground">{recipe.description}</p>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {totalTime > 0 && (
          <Card className="border-border/50">
            <CardContent className="p-3 flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <Clock className="w-4 h-4 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Gesamtzeit</p>
                <p className="font-semibold">{totalTime} Min</p>
              </div>
            </CardContent>
          </Card>
        )}
        {recipe.prep_time_minutes && (
          <Card className="border-border/50">
            <CardContent className="p-3 flex items-center gap-2">
              <div className="p-2 rounded-lg bg-cyan-500/20">
                <Timer className="w-4 h-4 text-cyan-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Vorbereitung</p>
                <p className="font-semibold">{recipe.prep_time_minutes} Min</p>
              </div>
            </CardContent>
          </Card>
        )}
        {recipe.taste_rating && (
          <Card className="border-border/50">
            <CardContent className="p-3 flex items-center gap-2">
              <div className="p-2 rounded-lg bg-amber-500/20">
                <Star className="w-4 h-4 text-amber-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Geschmack</p>
                <p className="font-semibold">{recipe.taste_rating}/5</p>
              </div>
            </CardContent>
          </Card>
        )}
        {recipe.health_rating && (
          <Card className="border-border/50">
            <CardContent className="p-3 flex items-center gap-2">
              <div className="p-2 rounded-lg bg-green-500/20">
                <TrendingUp className="w-4 h-4 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Gesundheit</p>
                <p className="font-semibold">{recipe.health_rating}/5</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Portion Calculator */}
      <Card className="border-border/50 bg-gradient-to-br from-card to-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            Portionen anpassen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                Original: {baseServings} {baseServings === 1 ? 'Portion' : 'Portionen'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10"
                onClick={() => adjustServings(-1)}
                disabled={desiredServings <= 1}
              >
                <Minus className="w-4 h-4" />
              </Button>
              <div className="text-center min-w-[60px]">
                <span className="text-2xl font-bold text-primary">{desiredServings}</span>
                <p className="text-xs text-muted-foreground">Portionen</p>
              </div>
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10"
                onClick={() => adjustServings(1)}
                disabled={desiredServings >= 50}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
          {desiredServings !== baseServings && (
            <div className="mt-3 pt-3 border-t border-border/50">
              <p className="text-sm text-primary font-medium">
                Mengen fur {desiredServings} Portionen berechnet (x{(desiredServings / baseServings).toFixed(2)})
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ingredients */}
      {ingredients.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Zutaten</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {ingredients.map((ing) => (
                <li key={ing.id} className="flex items-center gap-3 py-2 border-b border-border/30 last:border-0">
                  <div className="w-20 text-right shrink-0">
                    <span className="font-mono font-medium text-primary">
                      {calculateAmount(ing.amount)}
                    </span>
                    <span className="text-muted-foreground ml-1 text-sm">
                      {ing.unit}
                    </span>
                  </div>
                  <span className="flex-1">{ing.name}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Steps */}
      {steps.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-lg">Zubereitung</h2>
          <div className="space-y-3">
            {steps.map((step) => (
              <Card key={step.id} className="border-border/50 overflow-hidden">
                <div className="flex">
                  <div className="w-12 bg-gradient-to-b from-primary/20 to-primary/10 flex items-start justify-center pt-4">
                    <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                      {step.step_number}
                    </span>
                  </div>
                  <CardContent className="flex-1 p-4">
                    <p className="text-sm md:text-base">{step.instruction}</p>
                  </CardContent>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
