import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Plus, ChefHat, Soup, UtensilsCrossed, Cake, Coffee, Clock, Users, TrendingUp, Star, Cookie, Salad, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth, getSupabase } from '@/hooks/useAuth';
import { AddRecipeDialog } from './AddRecipeDialog';
import { RecipeDetailView } from './RecipeDetailView';

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
  created_at: string | null;
}

interface RecipesSectionProps {
  onBack: () => void;
}

type SortOption = 'newest' | 'taste' | 'health';

const categoryConfig: Record<string, { label: string; icon: typeof Soup; color: string }> = {
  vorspeise: { label: 'Vorspeisen', icon: Soup, color: 'bg-cyan-500' },
  hauptspeise: { label: 'Hauptgerichte', icon: UtensilsCrossed, color: 'bg-orange-500' },
  nachspeise: { label: 'Nachspeisen', icon: Cake, color: 'bg-pink-500' },
  getraenk: { label: 'Getränke', icon: Coffee, color: 'bg-amber-500' },
  suesswaren: { label: 'Süßwaren', icon: Cookie, color: 'bg-purple-500' },
  beilagen: { label: 'Beilagen', icon: Salad, color: 'bg-green-500' },
};

const categoryOrder = ['hauptspeise', 'vorspeise', 'nachspeise', 'getraenk', 'suesswaren', 'beilagen'];

export function RecipesSection({ onBack }: RecipesSectionProps) {
  const { user } = useAuth();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  useEffect(() => {
    if (user) fetchRecipes();
  }, [user]);

  const fetchRecipes = async () => {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('recipes')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && data) setRecipes(data);
    setLoading(false);
  };

  const sortedRecipes = useMemo(() => {
    let filtered = [...recipes];
    
    if (activeCategory !== 'all') {
      filtered = filtered.filter(r => r.category === activeCategory);
    }
    
    return filtered.sort((a, b) => {
      if (sortBy === 'taste') {
        return (b.taste_rating || 0) - (a.taste_rating || 0);
      }
      if (sortBy === 'health') {
        return (b.health_rating || 0) - (a.health_rating || 0);
      }
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });
  }, [recipes, sortBy, activeCategory]);

  const recipesByCategory = useMemo(() => {
    const grouped: Record<string, Recipe[]> = {};
    categoryOrder.forEach(cat => {
      grouped[cat] = recipes.filter(r => r.category === cat);
    });
    return grouped;
  }, [recipes]);

  const getCategoryIcon = (category: string | null) => {
    if (!category || !categoryConfig[category]) return ChefHat;
    return categoryConfig[category].icon;
  };

  if (loading) return null;

  if (selectedRecipe) {
    return (
      <RecipeDetailView
        recipe={selectedRecipe}
        onBack={() => setSelectedRecipe(null)}
        onUpdate={fetchRecipes}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Header - Compact */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onBack} className="h-7 w-7">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg border-2 border-red-500 text-red-500">
              <ChefHat className="w-4 h-4" strokeWidth={1.5} />
            </div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold">Rezepte</h2>
              <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                {recipes.length}
              </span>
            </div>
          </div>
        </div>
        <AddRecipeDialog open={dialogOpen} onOpenChange={setDialogOpen} onSuccess={fetchRecipes} />
      </div>

      {/* Filters Row - Compact */}
      <div className="flex gap-2">
        {/* Category Dropdown */}
        <Select value={activeCategory} onValueChange={setActiveCategory}>
          <SelectTrigger className="h-8 text-xs flex-1">
            <SelectValue placeholder="Kategorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Kategorien</SelectItem>
            {categoryOrder.map(catKey => {
              const config = categoryConfig[catKey];
              const count = recipesByCategory[catKey]?.length || 0;
              return (
                <SelectItem key={catKey} value={catKey}>
                  {config.label} ({count})
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>

        {/* Sort Dropdown */}
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
          <SelectTrigger className="h-8 text-xs w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Neueste</SelectItem>
            <SelectItem value="taste">Leckerste</SelectItem>
            <SelectItem value="health">Gesündeste</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Recipes List */}
      {sortedRecipes.length === 0 ? (
        <Card className="p-6 border-border/50 text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-red-500/20 flex items-center justify-center">
            <ChefHat className="w-6 h-6 text-red-500" />
          </div>
          <p className="text-sm text-muted-foreground">
            {activeCategory !== 'all' 
              ? `Keine ${categoryConfig[activeCategory]?.label || 'Rezepte'}`
              : 'Noch keine Rezepte'
            }
          </p>
          <Button 
            size="sm"
            className="mt-3" 
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="w-3 h-3 mr-1" />
            Rezept erstellen
          </Button>
        </Card>
      ) : (
        <div className="space-y-2">
          {sortedRecipes.map((recipe) => {
            const Icon = getCategoryIcon(recipe.category);
            const config = recipe.category ? categoryConfig[recipe.category] : null;
            const totalTime = (recipe.prep_time_minutes || 0) + (recipe.cook_time_minutes || 0);
            
            return (
              <div
                key={recipe.id}
                className="flex items-center gap-3 p-2.5 rounded-lg border bg-card border-border/50 cursor-pointer hover:border-primary/30 transition-all"
                onClick={() => setSelectedRecipe(recipe)}
              >
                {/* Category Color Bar */}
                <div className={`w-1 h-12 rounded-full ${config?.color || 'bg-zinc-500'}`} />
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{recipe.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {recipe.servings && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                        <Users className="w-2.5 h-2.5" /> {recipe.servings}
                      </span>
                    )}
                    {totalTime > 0 && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" /> {totalTime}m
                      </span>
                    )}
                    {recipe.taste_rating && (
                      <span className="text-[10px] text-amber-500 flex items-center gap-0.5">
                        <Star className="w-2.5 h-2.5" /> {recipe.taste_rating}
                      </span>
                    )}
                    {recipe.health_rating && (
                      <span className="text-[10px] text-green-500 flex items-center gap-0.5">
                        <TrendingUp className="w-2.5 h-2.5" /> {recipe.health_rating}
                      </span>
                    )}
                  </div>
                </div>

                <div className={`p-1.5 rounded-lg ${config?.color || 'bg-zinc-500'}`}>
                  <Icon className="w-3.5 h-3.5 text-white" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Mobile FAB */}
      <Button 
        className="fixed bottom-6 right-6 w-12 h-12 rounded-full shadow-xl sm:hidden" 
        onClick={() => setDialogOpen(true)}
      >
        <Plus className="w-5 h-5" />
      </Button>
    </div>
  );
}
