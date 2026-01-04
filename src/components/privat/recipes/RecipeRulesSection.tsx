import { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface NutritionRule {
  id: string;
  title: string;
  frequency_type: string;
}

interface RecipeRulesSectionProps {
  recipeId: string;
}

export function RecipeRulesSection({ recipeId }: RecipeRulesSectionProps) {
  const { user } = useAuth();
  const [rules, setRules] = useState<NutritionRule[]>([]);
  const [selectedRuleIds, setSelectedRuleIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && recipeId) fetchData();
  }, [user, recipeId]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    const [rulesRes, recipeRulesRes] = await Promise.all([
      supabase
        .from('nutrition_rules')
        .select('id, title, frequency_type')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('order_index'),
      supabase
        .from('recipe_nutrition_rules')
        .select('rule_id')
        .eq('recipe_id', recipeId)
        .eq('user_id', user.id),
    ]);

    if (rulesRes.data) setRules(rulesRes.data);
    if (recipeRulesRes.data) {
      setSelectedRuleIds(recipeRulesRes.data.map(r => r.rule_id));
    }
    setLoading(false);
  };

  const handleToggleRule = async (ruleId: string) => {
    if (!user) return;

    const isSelected = selectedRuleIds.includes(ruleId);

    if (isSelected) {
      await supabase
        .from('recipe_nutrition_rules')
        .delete()
        .eq('recipe_id', recipeId)
        .eq('rule_id', ruleId);
      setSelectedRuleIds(prev => prev.filter(id => id !== ruleId));
    } else {
      await supabase.from('recipe_nutrition_rules').insert({
        user_id: user.id,
        recipe_id: recipeId,
        rule_id: ruleId,
      });
      setSelectedRuleIds(prev => [...prev, ruleId]);
    }
  };

  if (loading || rules.length === 0) return null;

  return (
    <div className="space-y-3">
      <Label className="text-xs font-medium text-muted-foreground">Erfüllt Ernährungsregeln</Label>
      <div className="grid grid-cols-2 gap-2">
        {rules.map(rule => {
          const isSelected = selectedRuleIds.includes(rule.id);
          
          return (
            <button
              key={rule.id}
              type="button"
              onClick={() => handleToggleRule(rule.id)}
              className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-all text-xs ${
                isSelected
                  ? 'border-green-500 bg-green-500/10'
                  : 'border-border/50 hover:border-green-500/50'
              }`}
            >
              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${
                isSelected
                  ? 'bg-green-500 border-green-500 text-white'
                  : 'border-muted-foreground/30'
              }`}>
                {isSelected && <Check className="w-2.5 h-2.5" />}
              </div>
              <span className="truncate">{rule.title}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}