import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { icons } from 'lucide-react';
import { Input } from '@/components/ui/input';

// Curated subset of useful icons for habits
const POPULAR_ICONS = [
  'Check', 'Dumbbell', 'BookOpen', 'Brain', 'Heart', 'Droplets', 'Sun',
  'Moon', 'Bed', 'Apple', 'Salad', 'Coffee', 'Pill', 'Stethoscope',
  'Timer', 'Clock', 'Bike', 'Footprints', 'Mountain', 'TreePine',
  'Music', 'Palette', 'PenLine', 'Code', 'Laptop', 'Smartphone',
  'Mail', 'MessageCircle', 'Phone', 'Users', 'HandHelping', 'Smile',
  'Zap', 'Target', 'Trophy', 'Medal', 'Star', 'Flame', 'Sparkles',
  'Lightbulb', 'Eye', 'Ear', 'Hand', 'Cigarette', 'Wine', 'Cookie',
  'Shower', 'Shirt', 'Brush', 'Scissors', 'Camera', 'Headphones',
  'Gamepad2', 'Newspaper', 'GraduationCap', 'Languages', 'Calculator',
  'DollarSign', 'Wallet', 'ShoppingCart', 'Car', 'Plane', 'Home',
  'Dog', 'Cat', 'Leaf', 'Flower2', 'CloudSun', 'Umbrella',
  'Utensils', 'CupSoda', 'Popcorn', 'Pizza',
];

interface IconPickerProps {
  value: string;
  onChange: (icon: string) => void;
}

export function IconPicker({ value, onChange }: IconPickerProps) {
  const [search, setSearch] = useState('');

  const filteredIcons = useMemo(() => {
    if (!search.trim()) return POPULAR_ICONS;
    const q = search.toLowerCase();
    // Search through all lucide icons
    return Object.keys(icons).filter(name => 
      name.toLowerCase().includes(q)
    ).slice(0, 60);
  }, [search]);

  const SelectedIcon = icons[value as keyof typeof icons];

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Icon suchen..."
          className="pl-8 h-8 text-sm"
        />
      </div>
      <div className="grid grid-cols-8 gap-1 max-h-[160px] overflow-y-auto">
        {filteredIcons.map(name => {
          const IconComponent = icons[name as keyof typeof icons];
          if (!IconComponent) return null;
          const isSelected = value === name;
          return (
            <button
              key={name}
              type="button"
              onClick={() => onChange(name)}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                isSelected 
                  ? 'bg-primary/20 ring-1 ring-primary' 
                  : 'hover:bg-muted/60'
              }`}
              title={name}
            >
              <IconComponent className="w-4 h-4" strokeWidth={1.5} />
            </button>
          );
        })}
      </div>
      {filteredIcons.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-2">Kein Icon gefunden</p>
      )}
    </div>
  );
}
