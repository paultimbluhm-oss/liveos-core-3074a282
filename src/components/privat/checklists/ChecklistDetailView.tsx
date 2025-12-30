import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, RotateCcw, Pencil, Check, X, Trash2, FolderPlus, ChevronDown, ChevronRight, MoreVertical, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAuth, getSupabase } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ChecklistSection {
  id: string;
  name: string;
  order_index: number;
}

interface ChecklistItem {
  id: string;
  content: string;
  completed: boolean;
  order_index: number;
  section_id: string | null;
}

interface Checklist {
  id: string;
  name: string;
}

interface ChecklistDetailViewProps {
  checklistId: string;
  onBack: () => void;
}

export function ChecklistDetailView({ checklistId, onBack }: ChecklistDetailViewProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [checklist, setChecklist] = useState<Checklist | null>(null);
  const [sections, setSections] = useState<ChecklistSection[]>([]);
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newItemContent, setNewItemContent] = useState('');
  const [activeAddSection, setActiveAddSection] = useState<string | null | 'main'>('main');
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [tempItemContent, setTempItemContent] = useState('');
  const [newSectionName, setNewSectionName] = useState('');
  const [showAddSection, setShowAddSection] = useState(false);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [tempSectionName, setTempSectionName] = useState('');
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  const fetchData = async () => {
    if (!user) return;
    const supabase = getSupabase();

    const [checklistRes, sectionsRes, itemsRes] = await Promise.all([
      supabase.from('checklists').select('*').eq('id', checklistId).single(),
      supabase
        .from('checklist_sections')
        .select('*')
        .eq('checklist_id', checklistId)
        .order('order_index', { ascending: true }),
      supabase
        .from('checklist_items')
        .select('*')
        .eq('checklist_id', checklistId)
        .order('order_index', { ascending: true }),
    ]);

    if (checklistRes.data) {
      setChecklist(checklistRes.data);
      setTempName(checklistRes.data.name);
    }
    setSections(sectionsRes.data || []);
    setItems(itemsRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [checklistId, user]);

  const updateChecklistName = async () => {
    if (!tempName.trim() || !checklist) return;
    const supabase = getSupabase();

    const { error } = await supabase
      .from('checklists')
      .update({ name: tempName.trim() })
      .eq('id', checklist.id);

    if (error) {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' });
    } else {
      setChecklist({ ...checklist, name: tempName.trim() });
      setEditingName(false);
    }
  };

  const addSection = async () => {
    if (!user || !newSectionName.trim()) return;
    const supabase = getSupabase();

    const maxOrder = sections.length > 0 ? Math.max(...sections.map(s => s.order_index)) : -1;

    const { error } = await supabase.from('checklist_sections').insert({
      user_id: user.id,
      checklist_id: checklistId,
      name: newSectionName.trim(),
      order_index: maxOrder + 1,
    });

    if (error) {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' });
    } else {
      setNewSectionName('');
      setShowAddSection(false);
      fetchData();
    }
  };

  const updateSectionName = async (sectionId: string) => {
    if (!tempSectionName.trim()) return;
    const supabase = getSupabase();

    const { error } = await supabase
      .from('checklist_sections')
      .update({ name: tempSectionName.trim() })
      .eq('id', sectionId);

    if (!error) {
      setSections(sections.map(s => s.id === sectionId ? { ...s, name: tempSectionName.trim() } : s));
      setEditingSectionId(null);
    }
  };

  const deleteSection = async (sectionId: string) => {
    const supabase = getSupabase();
    
    await supabase
      .from('checklist_items')
      .update({ section_id: null })
      .eq('section_id', sectionId);

    const { error } = await supabase.from('checklist_sections').delete().eq('id', sectionId);

    if (!error) {
      fetchData();
    }
  };

  const addItem = async (sectionId: string | null = null) => {
    if (!user || !newItemContent.trim()) return;
    const supabase = getSupabase();

    const sectionItems = items.filter(i => i.section_id === sectionId);
    const maxOrder = sectionItems.length > 0 ? Math.max(...sectionItems.map(i => i.order_index)) : -1;

    const { error } = await supabase.from('checklist_items').insert({
      user_id: user.id,
      checklist_id: checklistId,
      section_id: sectionId,
      content: newItemContent.trim(),
      order_index: maxOrder + 1,
      completed: false,
    });

    if (error) {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' });
    } else {
      setNewItemContent('');
      fetchData();
    }
  };

  const toggleItem = async (item: ChecklistItem) => {
    const supabase = getSupabase();

    const { error } = await supabase
      .from('checklist_items')
      .update({ completed: !item.completed })
      .eq('id', item.id);

    if (!error) {
      setItems(items.map(i => i.id === item.id ? { ...i, completed: !i.completed } : i));
    }
  };

  const updateItemContent = async (itemId: string) => {
    if (!tempItemContent.trim()) return;
    const supabase = getSupabase();

    const { error } = await supabase
      .from('checklist_items')
      .update({ content: tempItemContent.trim() })
      .eq('id', itemId);

    if (!error) {
      setItems(items.map(i => i.id === itemId ? { ...i, content: tempItemContent.trim() } : i));
      setEditingItemId(null);
    }
  };

  const deleteItem = async (itemId: string) => {
    const supabase = getSupabase();

    const { error } = await supabase.from('checklist_items').delete().eq('id', itemId);

    if (!error) {
      setItems(items.filter(i => i.id !== itemId));
    }
  };

  const moveItem = async (item: ChecklistItem, direction: 'up' | 'down') => {
    const supabase = getSupabase();
    
    // Get items in the same section, sorted by order_index
    const sectionItems = items
      .filter(i => i.section_id === item.section_id)
      .sort((a, b) => a.order_index - b.order_index);
    
    const currentIndex = sectionItems.findIndex(i => i.id === item.id);
    if (currentIndex === -1) return;
    
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    
    // Check bounds
    if (targetIndex < 0 || targetIndex >= sectionItems.length) return;
    
    const targetItem = sectionItems[targetIndex];
    
    // Swap order_index values
    const updates = [
      supabase
        .from('checklist_items')
        .update({ order_index: targetItem.order_index })
        .eq('id', item.id),
      supabase
        .from('checklist_items')
        .update({ order_index: item.order_index })
        .eq('id', targetItem.id),
    ];
    
    await Promise.all(updates);
    
    // Update local state
    setItems(items.map(i => {
      if (i.id === item.id) return { ...i, order_index: targetItem.order_index };
      if (i.id === targetItem.id) return { ...i, order_index: item.order_index };
      return i;
    }));
  };

  const resetAll = async () => {
    const supabase = getSupabase();

    const { error } = await supabase
      .from('checklist_items')
      .update({ completed: false })
      .eq('checklist_id', checklistId);

    if (error) {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' });
    } else {
      setItems(items.map(i => ({ ...i, completed: false })));
      toast({ title: 'Alle Punkte zurückgesetzt' });
    }
  };

  const toggleSectionCollapse = (sectionId: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const completedCount = items.filter(i => i.completed).length;
  const progress = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;
  const hasCompletedItems = completedCount > 0;
  
  const unsortedItems = items
    .filter(i => !i.section_id)
    .sort((a, b) => a.order_index - b.order_index);

  const renderItem = (item: ChecklistItem, sectionItems: ChecklistItem[]) => {
    const sortedSectionItems = [...sectionItems].sort((a, b) => a.order_index - b.order_index);
    const currentIndex = sortedSectionItems.findIndex(i => i.id === item.id);
    const isFirst = currentIndex === 0;
    const isLast = currentIndex === sortedSectionItems.length - 1;

    return (
      <div
        key={item.id}
        className={cn(
          "flex items-center gap-3 px-3 py-3 border-b border-border/30 last:border-0 touch-manipulation",
          item.completed && "bg-muted/20"
        )}
      >
        <Checkbox
          checked={item.completed}
          onCheckedChange={() => toggleItem(item)}
          className="h-5 w-5 rounded-full"
        />

        {editingItemId === item.id ? (
          <div className="flex-1 flex items-center gap-2">
            <Input
              value={tempItemContent}
              onChange={(e) => setTempItemContent(e.target.value)}
              autoFocus
              className="h-9"
              onKeyDown={(e) => {
                if (e.key === 'Enter') updateItemContent(item.id);
                if (e.key === 'Escape') setEditingItemId(null);
              }}
            />
            <Button size="icon" variant="ghost" className="h-9 w-9 shrink-0" onClick={() => updateItemContent(item.id)}>
              <Check className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="ghost" className="h-9 w-9 shrink-0" onClick={() => setEditingItemId(null)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <>
            <span
              className={cn(
                "flex-1 text-sm",
                item.completed && "line-through text-muted-foreground"
              )}
            >
              {item.content}
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem 
                  onClick={() => moveItem(item, 'up')}
                  disabled={isFirst}
                >
                  <ArrowUp className="w-4 h-4 mr-2" />
                  Nach oben
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => moveItem(item, 'down')}
                  disabled={isLast}
                >
                  <ArrowDown className="w-4 h-4 mr-2" />
                  Nach unten
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => {
                  setEditingItemId(item.id);
                  setTempItemContent(item.content);
                }}>
                  <Pencil className="w-4 h-4 mr-2" />
                  Bearbeiten
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive" onClick={() => deleteItem(item.id)}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Löschen
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </div>
    );
  };

  const renderAddItemInput = (sectionId: string | null) => {
    const isActive = activeAddSection === (sectionId ?? 'main');
    
    return (
      <div className="px-3 py-2 border-t border-border/30">
        <div className="flex gap-2">
          <Input
            value={isActive ? newItemContent : ''}
            onChange={(e) => setNewItemContent(e.target.value)}
            placeholder="Neuen Punkt hinzufügen..."
            className="h-10"
            onFocus={() => setActiveAddSection(sectionId ?? 'main')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newItemContent.trim()) {
                addItem(sectionId);
              }
            }}
          />
          <Button 
            size="icon" 
            className="h-10 w-10 shrink-0"
            onClick={() => addItem(sectionId)} 
            disabled={!isActive || !newItemContent.trim()}
          >
            <Plus className="w-5 h-5" />
          </Button>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0 h-9 w-9">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        
        {editingName ? (
          <div className="flex-1 flex items-center gap-2">
            <Input
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              className="font-bold"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') updateChecklistName();
                if (e.key === 'Escape') setEditingName(false);
              }}
            />
            <Button size="icon" variant="ghost" className="shrink-0" onClick={updateChecklistName}>
              <Check className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="ghost" className="shrink-0" onClick={() => setEditingName(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <div className="flex-1 flex items-center gap-2 min-w-0">
            <h2 className="text-lg font-bold truncate">{checklist?.name}</h2>
            <Button size="icon" variant="ghost" className="shrink-0 h-8 w-8" onClick={() => setEditingName(true)}>
              <Pencil className="w-4 h-4" />
            </Button>
          </div>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="shrink-0 h-9 w-9">
              <MoreVertical className="w-5 h-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setShowAddSection(true)}>
              <FolderPlus className="w-4 h-4 mr-2" />
              Bereich hinzufügen
            </DropdownMenuItem>
            {hasCompletedItems && (
              <DropdownMenuItem onClick={resetAll}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Alle zurücksetzen
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{completedCount} von {items.length} erledigt</span>
          <span className={cn(
            "font-medium",
            progress === 100 ? "text-emerald-500" : "text-primary"
          )}>{progress}%</span>
        </div>
        <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
          <div 
            className={cn(
              "h-full rounded-full transition-all duration-300",
              progress === 100 ? "bg-emerald-500" : "bg-primary"
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Add Section Form */}
      {showAddSection && (
        <div className="flex gap-2 p-3 rounded-xl bg-muted/30 border border-border/50">
          <Input
            value={newSectionName}
            onChange={(e) => setNewSectionName(e.target.value)}
            placeholder="Name des Bereichs..."
            className="h-10"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') addSection();
              if (e.key === 'Escape') {
                setShowAddSection(false);
                setNewSectionName('');
              }
            }}
          />
          <Button onClick={addSection} disabled={!newSectionName.trim()} className="h-10">
            Erstellen
          </Button>
          <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => {
            setShowAddSection(false);
            setNewSectionName('');
          }}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Content */}
      <div className="space-y-3">
        {/* Sections */}
        {sections.map((section) => {
          const sectionItems = items
            .filter(i => i.section_id === section.id)
            .sort((a, b) => a.order_index - b.order_index);
          const sectionCompleted = sectionItems.filter(i => i.completed).length;
          const isCollapsed = collapsedSections.has(section.id);
          const sectionProgress = sectionItems.length > 0 ? Math.round((sectionCompleted / sectionItems.length) * 100) : 0;

          return (
            <div key={section.id} className="rounded-xl bg-card border border-border/50 overflow-hidden">
              <Collapsible open={!isCollapsed} onOpenChange={() => toggleSectionCollapse(section.id)}>
                <div className="flex items-center gap-2 px-3 py-2.5 bg-muted/30">
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                      {isCollapsed ? (
                        <ChevronRight className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  
                  {editingSectionId === section.id ? (
                    <div className="flex-1 flex items-center gap-2">
                      <Input
                        value={tempSectionName}
                        onChange={(e) => setTempSectionName(e.target.value)}
                        className="h-8"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') updateSectionName(section.id);
                          if (e.key === 'Escape') setEditingSectionId(null);
                        }}
                      />
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => updateSectionName(section.id)}>
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingSectionId(null)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <span className="flex-1 font-medium text-sm">{section.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {sectionCompleted}/{sectionItems.length}
                      </span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => {
                            setEditingSectionId(section.id);
                            setTempSectionName(section.name);
                          }}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Umbenennen
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => deleteSection(section.id)}>
                            <Trash2 className="w-4 h-4 mr-2" />
                            Löschen
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </>
                  )}
                </div>
                
                {/* Section Progress */}
                {sectionItems.length > 0 && (
                  <div className="h-1 bg-muted/30">
                    <div 
                      className={cn(
                        "h-full transition-all duration-300",
                        sectionProgress === 100 ? "bg-emerald-500" : "bg-primary/60"
                      )}
                      style={{ width: `${sectionProgress}%` }}
                    />
                  </div>
                )}
                
                <CollapsibleContent>
                  <div>
                    {sectionItems.map(item => renderItem(item, sectionItems))}
                    {renderAddItemInput(section.id)}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          );
        })}

        {/* Unsorted items */}
        {(unsortedItems.length > 0 || sections.length === 0) && (
          <div className="rounded-xl bg-card border border-border/50 overflow-hidden">
            {sections.length > 0 && (
              <div className="px-3 py-2.5 bg-muted/30 border-b border-border/30">
                <span className="font-medium text-sm text-muted-foreground">Unsortiert</span>
                <span className="text-xs text-muted-foreground ml-2">
                  {unsortedItems.filter(i => i.completed).length}/{unsortedItems.length}
                </span>
              </div>
            )}
            <div>
              {unsortedItems.map(item => renderItem(item, unsortedItems))}
              {renderAddItemInput(null)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
