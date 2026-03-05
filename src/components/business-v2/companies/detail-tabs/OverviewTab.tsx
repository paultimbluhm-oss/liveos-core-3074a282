import { useState } from 'react';
import { ExternalLink, Link2, Plus, Trash2, Tag } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useBusinessV2 } from '../../context/BusinessV2Context';
import { Company, RELATION_CONFIG } from '../../types';
import { AddRelationDialog } from '../../relations/AddRelationDialog';

interface OverviewTabProps {
  company: Company;
}

export function OverviewTab({ company }: OverviewTabProps) {
  const { updateCompany, categories, statuses, getCompanyRelations, deleteRelation, tags, getCompanyTags, assignTag, unassignTag } = useBusinessV2();
  const [addRelationOpen, setAddRelationOpen] = useState(false);

  const relations = getCompanyRelations(company.id);
  const companyTags = getCompanyTags(company.id);
  const availableTags = tags.filter(t => !companyTags.some(ct => ct.id === t.id));
  const sortedStatuses = [...statuses].sort((a, b) => a.order_index - b.order_index);

  const handleUpdate = (field: keyof Company, value: string | undefined) => {
    updateCompany(company.id, { [field]: value || undefined });
  };

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Name</Label>
          <Input value={company.name} onChange={(e) => handleUpdate('name', e.target.value)} className="h-9 text-sm" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Status</Label>
            <Select value={company.status} onValueChange={(v) => handleUpdate('status', v)}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {sortedStatuses.map(s => (
                  <SelectItem key={s.key} value={s.key}>
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                      {s.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Kategorie</Label>
            <Select value={company.category_id || 'none'} onValueChange={(v) => handleUpdate('category_id', v === 'none' ? undefined : v)}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Keine" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Keine</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Website</Label>
          <div className="flex gap-2">
            <Input value={company.website || ''} onChange={(e) => handleUpdate('website', e.target.value)} placeholder="https://..." className="flex-1 h-9 text-sm" />
            {company.website && (
              <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => window.open(company.website, '_blank')}>
                <ExternalLink className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Branche</Label>
          <Input value={company.industry || ''} onChange={(e) => handleUpdate('industry', e.target.value)} placeholder="z.B. Software, Beratung..." className="h-9 text-sm" />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Notizen</Label>
          <Textarea value={company.notes || ''} onChange={(e) => handleUpdate('notes', e.target.value)} placeholder="Notizen..." rows={3} className="text-sm" />
        </div>
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Tag className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tags</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {companyTags.map(tag => (
            <button key={tag.id} onClick={() => unassignTag(company.id, tag.id)}
              className="px-2 py-0.5 rounded-full text-xs font-medium transition-opacity hover:opacity-60"
              style={{ backgroundColor: `${tag.color}20`, color: tag.color }}>
              {tag.name} x
            </button>
          ))}
          {availableTags.length > 0 && (
            <Select onValueChange={(tagId) => assignTag(company.id, tagId)}>
              <SelectTrigger className="h-6 w-auto px-2 text-xs border-dashed">
                <Plus className="w-3 h-3 mr-1" /> Tag
              </SelectTrigger>
              <SelectContent>
                {availableTags.map(tag => (
                  <SelectItem key={tag.id} value={tag.id}>
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.color }} />
                      {tag.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      <Separator />

      {/* Relations */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Verknuepfungen</span>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setAddRelationOpen(true)}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Hinzufuegen
          </Button>
        </div>
        {relations.length === 0 ? (
          <p className="text-xs text-muted-foreground">Keine Verknuepfungen</p>
        ) : (
          <div className="space-y-1.5">
            {relations.map(({ relation, company: relCompany }) => (
              <div key={relation.id} className="flex items-center justify-between p-2.5 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 min-w-0">
                  <Link2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="text-sm truncate">{relCompany.name}</span>
                  <span className="text-[10px] text-muted-foreground">({RELATION_CONFIG[relation.relation_type]})</span>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0" onClick={() => deleteRelation(relation.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <AddRelationDialog open={addRelationOpen} onOpenChange={setAddRelationOpen} fromCompanyId={company.id} />
    </div>
  );
}
