import { useState } from 'react';
import { Plus, ExternalLink, FileText, Link as LinkIcon, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { useBusinessV2 } from '../../context/BusinessV2Context';
import { Company } from '../../types';

const LINK_TYPES: Record<string, { label: string; icon: React.ReactNode }> = {
  link: { label: 'Link', icon: <LinkIcon className="w-3.5 h-3.5" /> },
  document: { label: 'Dokument', icon: <FileText className="w-3.5 h-3.5" /> },
  offer: { label: 'Angebot', icon: <FileText className="w-3.5 h-3.5" /> },
  contract: { label: 'Vertrag', icon: <FileText className="w-3.5 h-3.5" /> },
};

interface LinksTabProps {
  company: Company;
}

export function LinksTab({ company }: LinksTabProps) {
  const { getCompanyLinks, addLink, deleteLink } = useBusinessV2();
  const links = getCompanyLinks(company.id);
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [linkType, setLinkType] = useState('link');

  const handleAdd = async () => {
    if (!title.trim() || !url.trim()) return;
    await addLink(company.id, title.trim(), url.trim(), linkType);
    setTitle('');
    setUrl('');
    setLinkType('link');
    setShowAdd(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Dokumente & Links</span>
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowAdd(!showAdd)}>
          <Plus className="w-3.5 h-3.5 mr-1" /> Hinzufuegen
        </Button>
      </div>

      {showAdd && (
        <div className="space-y-2 p-3 rounded-xl bg-muted/30 border border-border/50">
          <Select value={linkType} onValueChange={setLinkType}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(LINK_TYPES).map(([key, cfg]) => (
                <SelectItem key={key} value={key} className="text-xs">{cfg.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Bezeichnung..." className="h-8 text-xs" />
          <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." className="h-8 text-xs" />
          <div className="flex gap-2">
            <Button size="sm" className="flex-1 h-8 text-xs" disabled={!title.trim() || !url.trim()} onClick={handleAdd}>Speichern</Button>
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setShowAdd(false)}>Abbrechen</Button>
          </div>
        </div>
      )}

      {links.length === 0 && !showAdd ? (
        <p className="text-xs text-muted-foreground text-center py-8">Keine Links oder Dokumente</p>
      ) : (
        <div className="space-y-1.5">
          {links.map(link => (
            <div key={link.id} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-muted/30 group">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-primary">
                {LINK_TYPES[link.link_type]?.icon || <LinkIcon className="w-3.5 h-3.5" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{link.title}</p>
                <p className="text-[10px] text-muted-foreground truncate">{link.url}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => window.open(link.url, '_blank')}>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive" onClick={() => deleteLink(link.id)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
