import { useState, useEffect } from 'react';
import { Plus, Trash2, Soup, UtensilsCrossed, Cake, Coffee, ChefHat, Star, TrendingUp, Cookie, Salad } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useAuth, getSupabase } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Ingredient {
  id?: string;
  name: string;
  amount: string;
  unit: string;
}

interface Step {
  id?: string;
  instruction: string;
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

interface EditRecipeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipe: Recipe;
  onSuccess: () => void;
}

const units = ['g', 'kg', 'ml', 'l', 'TL', 'EL', 'Stück', 'Prise', 'Tasse', 'Packung', 'Scheibe', 'Dose'];

const categories = [
  { value: 'hauptspeise', label: 'Hauptgericht', icon: UtensilsCrossed, color: 'from-orange-500 to-red-600' },
  { value: 'vorspeise', label: 'Vorspeise', icon: Soup, color: 'from-cyan-500 to-teal-600' },
  { value: 'nachspeise', label: 'Nachspeise', icon: Cake, color: 'from-pink-500 to-rose-600' },
  { value: 'getraenk', label: 'Getränk', icon: Coffee, color: 'from-amber-500 to-yellow-600' },
  { value: 'suesswaren', label: 'Süßwaren', icon: Cookie, color: 'from-purple-500 to-pink-600' },
  { value: 'beilagen', label: 'Beilagen', icon: Salad, color: 'from-green-500 to-emerald-600' },
];

export function EditRecipeDialog({ open, onOpenChange, recipe, onSuccess }: EditRecipeDialogProps) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('hauptspeise');
  const [servings, setServings] = useState('4');
  const [prepTime, setPrepTime] = useState('');
  const [cookTime, setCookTime] = useState('');
  const [tasteRating, setTasteRating] = useState('');
  const [healthRating, setHealthRating] = useState('');
  const [ingredients, setIngredients] = useState<Ingredient[]>([{ name: '', amount: '', unit: 'g' }]);
  const [steps, setSteps] = useState<Step[]>([{ instruction: '' }]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && recipe) {
      loadRecipeData();
    }
  }, [open, recipe]);

  const loadRecipeData = async () => {
    setLoading(true);
    const supabase = getSupabase();

    // Set basic recipe data
    setName(recipe.name);
    setDescription(recipe.description || '');
    setCategory(recipe.category || 'hauptspeise');
    setServings(recipe.servings?.toString() || '4');
    setPrepTime(recipe.prep_time_minutes?.toString() || '');
    setCookTime(recipe.cook_time_minutes?.toString() || '');
    setTasteRating(recipe.taste_rating?.toString() || '');
    setHealthRating(recipe.health_rating?.toString() || '');

    // Load ingredients and steps
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

    if (ingredientsRes.data && ingredientsRes.data.length > 0) {
      setIngredients(ingredientsRes.data.map(ing => ({
        id: ing.id,
        name: ing.name,
        amount: ing.amount?.toString() || '',
        unit: ing.unit || 'g',
      })));
    } else {
      setIngredients([{ name: '', amount: '', unit: 'g' }]);
    }

    if (stepsRes.data && stepsRes.data.length > 0) {
      setSteps(stepsRes.data.map(step => ({
        id: step.id,
        instruction: step.instruction,
      })));
    } else {
      setSteps([{ instruction: '' }]);
    }

    setLoading(false);
  };

  const addIngredient = () => {
    setIngredients([...ingredients, { name: '', amount: '', unit: 'g' }]);
  };

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const updateIngredient = (index: number, field: keyof Ingredient, value: string) => {
    const updated = [...ingredients];
    (updated[index] as any)[field] = value;
    setIngredients(updated);
  };

  const addStep = () => {
    setSteps([...steps, { instruction: '' }]);
  };

  const removeStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index));
  };

  const updateStep = (index: number, value: string) => {
    const updated = [...steps];
    updated[index].instruction = value;
    setSteps(updated);
  };

  const handleSubmit = async () => {
    if (!name.trim() || !user) return;
    setSaving(true);
    const supabase = getSupabase();

    try {
      // Update recipe
      const { error: recipeError } = await supabase
        .from('recipes')
        .update({
          name: name.trim(),
          description: description.trim() || null,
          category,
          servings: parseInt(servings) || 4,
          prep_time_minutes: prepTime ? parseInt(prepTime) : null,
          cook_time_minutes: cookTime ? parseInt(cookTime) : null,
          taste_rating: tasteRating ? parseInt(tasteRating) : null,
          health_rating: healthRating ? parseInt(healthRating) : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', recipe.id);

      if (recipeError) throw recipeError;

      // Delete old ingredients and steps
      await Promise.all([
        supabase.from('recipe_ingredients').delete().eq('recipe_id', recipe.id),
        supabase.from('recipe_steps').delete().eq('recipe_id', recipe.id),
      ]);

      // Add new ingredients
      const validIngredients = ingredients.filter(i => i.name.trim());
      if (validIngredients.length > 0) {
        const { error: ingredientsError } = await supabase
          .from('recipe_ingredients')
          .insert(
            validIngredients.map((ing, index) => ({
              recipe_id: recipe.id,
              user_id: user.id,
              name: ing.name.trim(),
              amount: ing.amount ? parseFloat(ing.amount) : null,
              unit: ing.unit || null,
              order_index: index,
            }))
          );
        if (ingredientsError) throw ingredientsError;
      }

      // Add new steps
      const validSteps = steps.filter(s => s.instruction.trim());
      if (validSteps.length > 0) {
        const { error: stepsError } = await supabase
          .from('recipe_steps')
          .insert(
            validSteps.map((step, index) => ({
              recipe_id: recipe.id,
              user_id: user.id,
              step_number: index + 1,
              instruction: step.instruction.trim(),
            }))
          );
        if (stepsError) throw stepsError;
      }

      toast.success('Rezept aktualisiert!');
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      toast.error('Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Rezept bearbeiten</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="py-8 text-center text-muted-foreground">Laden...</div>
        ) : (
          <div className="space-y-6 pt-4">
            {/* Basic Info */}
            <div className="space-y-4">
              <div>
                <Label>Rezeptname *</Label>
                <Input
                  placeholder="z.B. Spaghetti Carbonara"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Beschreibung (optional)</Label>
                <Textarea
                  placeholder="Kurze Beschreibung des Rezepts..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="mt-1"
                />
              </div>
            </div>

            {/* Category Selection */}
            <div>
              <Label className="mb-3 block">Kategorie</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {categories.map(cat => {
                  const Icon = cat.icon;
                  const isSelected = category === cat.value;
                  return (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setCategory(cat.value)}
                      className={`p-3 rounded-xl border-2 transition-all text-center ${
                        isSelected 
                          ? 'border-primary bg-primary/10' 
                          : 'border-border/50 hover:border-primary/30'
                      }`}
                    >
                      <div className={`w-10 h-10 mx-auto rounded-lg bg-gradient-to-br ${cat.color} flex items-center justify-center mb-2`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-xs font-medium">{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time & Servings */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Portionen</Label>
                <Input
                  type="number"
                  value={servings}
                  onChange={(e) => setServings(e.target.value)}
                  min={1}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Vorbereitung (Min)</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={prepTime}
                  onChange={(e) => setPrepTime(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Kochzeit (Min)</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={cookTime}
                  onChange={(e) => setCookTime(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            {/* Ratings */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-500" />
                  Geschmack
                </Label>
                <Select value={tasteRating} onValueChange={setTasteRating}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Bewertung" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map(n => (
                      <SelectItem key={n} value={n.toString()}>{n}/5</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  Gesundheit
                </Label>
                <Select value={healthRating} onValueChange={setHealthRating}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Bewertung" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map(n => (
                      <SelectItem key={n} value={n.toString()}>{n}/5</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Ingredients */}
            <div className="space-y-3">
              <Label className="font-medium">Zutaten</Label>
              {ingredients.map((ing, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder="Menge"
                    value={ing.amount}
                    onChange={(e) => updateIngredient(index, 'amount', e.target.value)}
                    className="w-20"
                  />
                  <Select
                    value={ing.unit}
                    onValueChange={(v) => updateIngredient(index, 'unit', v)}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {units.map(u => (
                        <SelectItem key={u} value={u}>{u}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Zutat"
                    value={ing.name}
                    onChange={(e) => updateIngredient(index, 'name', e.target.value)}
                    className="flex-1"
                  />
                  {ingredients.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeIngredient(index)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addIngredient}>
                <Plus className="w-4 h-4 mr-1" /> Zutat hinzufügen
              </Button>
            </div>

            {/* Steps */}
            <div className="space-y-3">
              <Label className="font-medium">Zubereitungsschritte</Label>
              {steps.map((step, index) => (
                <div key={index} className="flex gap-2 items-start">
                  <span className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/80 text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0 mt-2">
                    {index + 1}
                  </span>
                  <Textarea
                    placeholder={`Schritt ${index + 1} beschreiben...`}
                    value={step.instruction}
                    onChange={(e) => updateStep(index, e.target.value)}
                    rows={2}
                    className="flex-1"
                  />
                  {steps.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeStep(index)}
                      className="mt-2 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addStep}>
                <Plus className="w-4 h-4 mr-1" /> Schritt hinzufügen
              </Button>
            </div>

            <Button 
              onClick={handleSubmit} 
              className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700" 
              disabled={!name.trim() || saving}
            >
              {saving ? 'Speichern...' : 'Änderungen speichern'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
