import { useState } from 'react';
import { Plus, Trash2, Soup, UtensilsCrossed, Cake, Coffee, Star, TrendingUp, Cookie, Salad } from 'lucide-react';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface Ingredient {
  name: string;
  amount: string;
  unit: string;
}

interface Step {
  instruction: string;
}

interface AddRecipeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const units = ['g', 'kg', 'ml', 'l', 'TL', 'EL', 'Stück', 'Prise', 'Tasse', 'Packung', 'Scheibe', 'Dose'];

const categories = [
  { value: 'hauptspeise', label: 'Hauptgericht', icon: UtensilsCrossed, color: 'bg-orange-500' },
  { value: 'vorspeise', label: 'Vorspeise', icon: Soup, color: 'bg-cyan-500' },
  { value: 'nachspeise', label: 'Nachspeise', icon: Cake, color: 'bg-pink-500' },
  { value: 'getraenk', label: 'Getränk', icon: Coffee, color: 'bg-amber-500' },
  { value: 'suesswaren', label: 'Süßwaren', icon: Cookie, color: 'bg-purple-500' },
  { value: 'beilagen', label: 'Beilagen', icon: Salad, color: 'bg-green-500' },
];

export function AddRecipeDialog({ open, onOpenChange, onSuccess }: AddRecipeDialogProps) {
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
  const [ingredientsOpen, setIngredientsOpen] = useState(false);
  const [stepsOpen, setStepsOpen] = useState(false);

  const addIngredient = () => {
    setIngredients([...ingredients, { name: '', amount: '', unit: 'g' }]);
  };

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const updateIngredient = (index: number, field: keyof Ingredient, value: string) => {
    const updated = [...ingredients];
    updated[index][field] = value;
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
      const { data: recipe, error: recipeError } = await supabase
        .from('recipes')
        .insert({
          user_id: user.id,
          name: name.trim(),
          description: description.trim() || null,
          category,
          servings: parseInt(servings) || 4,
          prep_time_minutes: prepTime ? parseInt(prepTime) : null,
          cook_time_minutes: cookTime ? parseInt(cookTime) : null,
          taste_rating: tasteRating ? parseInt(tasteRating) : null,
          health_rating: healthRating ? parseInt(healthRating) : null,
        })
        .select()
        .single();

      if (recipeError) throw recipeError;

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

      toast.success('Rezept erstellt!');
      resetForm();
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      toast.error('Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setCategory('hauptspeise');
    setServings('4');
    setPrepTime('');
    setCookTime('');
    setTasteRating('');
    setHealthRating('');
    setIngredients([{ name: '', amount: '', unit: 'g' }]);
    setSteps([{ instruction: '' }]);
    setIngredientsOpen(false);
    setStepsOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" className="hidden sm:flex h-7 text-xs">
          <Plus className="w-3 h-3 mr-1" />
          Neu
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">Neues Rezept</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          {/* Name */}
          <div className="space-y-1">
            <Label className="text-xs">Name *</Label>
            <Input
              placeholder="z.B. Spaghetti Carbonara"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-8 text-sm"
            />
          </div>

          {/* Category as Dropdown */}
          <div className="space-y-1">
            <Label className="text-xs">Kategorie</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map(cat => {
                  const Icon = cat.icon;
                  return (
                    <SelectItem key={cat.value} value={cat.value}>
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded ${cat.color} flex items-center justify-center`}>
                          <Icon className="w-2.5 h-2.5 text-white" />
                        </div>
                        {cat.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Time & Servings - Compact Grid */}
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Portionen</Label>
              <Input
                type="number"
                value={servings}
                onChange={(e) => setServings(e.target.value)}
                min={1}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Vorb. (Min)</Label>
              <Input
                type="number"
                placeholder="0"
                value={prepTime}
                onChange={(e) => setPrepTime(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Koch (Min)</Label>
              <Input
                type="number"
                placeholder="0"
                value={cookTime}
                onChange={(e) => setCookTime(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
          </div>

          {/* Ratings - Compact */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1">
                <Star className="w-3 h-3 text-amber-500" /> Geschmack
              </Label>
              <Select value={tasteRating} onValueChange={setTasteRating}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="-" />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map(n => (
                    <SelectItem key={n} value={n.toString()}>{n}/5</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-green-500" /> Gesundheit
              </Label>
              <Select value={healthRating} onValueChange={setHealthRating}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="-" />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map(n => (
                    <SelectItem key={n} value={n.toString()}>{n}/5</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Ingredients - Collapsible */}
          <Collapsible open={ingredientsOpen} onOpenChange={setIngredientsOpen}>
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors">
                <span className="text-sm font-medium">Zutaten ({ingredients.filter(i => i.name.trim()).length})</span>
                {ingredientsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 space-y-2">
              {ingredients.map((ing, index) => (
                <div key={index} className="flex gap-1">
                  <Input
                    placeholder="Menge"
                    value={ing.amount}
                    onChange={(e) => updateIngredient(index, 'amount', e.target.value)}
                    className="w-14 h-7 text-xs"
                  />
                  <Select
                    value={ing.unit}
                    onValueChange={(v) => updateIngredient(index, 'unit', v)}
                  >
                    <SelectTrigger className="w-16 h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {units.map(u => (
                        <SelectItem key={u} value={u} className="text-xs">{u}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Zutat"
                    value={ing.name}
                    onChange={(e) => updateIngredient(index, 'name', e.target.value)}
                    className="flex-1 h-7 text-xs"
                  />
                  {ingredients.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeIngredient(index)}
                      className="h-7 w-7 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addIngredient} className="h-7 text-xs">
                <Plus className="w-3 h-3 mr-1" /> Zutat
              </Button>
            </CollapsibleContent>
          </Collapsible>

          {/* Steps - Collapsible */}
          <Collapsible open={stepsOpen} onOpenChange={setStepsOpen}>
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors">
                <span className="text-sm font-medium">Schritte ({steps.filter(s => s.instruction.trim()).length})</span>
                {stepsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 space-y-2">
              {steps.map((step, index) => (
                <div key={index} className="flex gap-2 items-start">
                  <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold shrink-0 mt-1">
                    {index + 1}
                  </span>
                  <Input
                    placeholder={`Schritt ${index + 1}...`}
                    value={step.instruction}
                    onChange={(e) => updateStep(index, e.target.value)}
                    className="flex-1 h-7 text-xs"
                  />
                  {steps.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeStep(index)}
                      className="h-7 w-7 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addStep} className="h-7 text-xs">
                <Plus className="w-3 h-3 mr-1" /> Schritt
              </Button>
            </CollapsibleContent>
          </Collapsible>

          {/* Description - Optional at end */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Beschreibung (optional)</Label>
            <Input
              placeholder="Kurze Beschreibung..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="h-8 text-sm"
            />
          </div>

          <Button 
            onClick={handleSubmit} 
            size="sm"
            className="w-full" 
            disabled={!name.trim() || saving}
          >
            {saving ? 'Speichern...' : 'Speichern'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
