import { useState } from 'react';
import { Phone, Mail, ArrowRight, StickyNote, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { useBusinessV2 } from '../../context/BusinessV2Context';
import { Company, TimelineEntryType, TIMELINE_TYPE_CONFIG } from '../../types';

const ICONS: Record<TimelineEntryType, React.ReactNode> = {
  call: <Phone className="w-3.5 h-3.5" />,
  email: <Mail className="w-3.5 h-3.5" />,
  status_change: <ArrowRight className="w-3.5 h-3.5" />,
  note: <StickyNote className="w-3.5 h-3.5" />,
};

const ICON_COLORS: Record<TimelineEntryType, string> = {
  call: 'bg-green-500/10 text-green-600',
  email: 'bg-blue-500/10 text-blue-600',
  status_change: 'bg-violet-500/10 text-violet-600',
  note: 'bg-amber-500/10 text-amber-600',
};

interface TimelineTabProps {
  company: Company;
}

export function TimelineTab({ company }: TimelineTabProps) {
  const { getCompanyTimeline, addTimelineEntry, deleteTimelineEntry, getCompanyContacts } = useBusinessV2();
  const entries = getCompanyTimeline(company.id);
  const contacts = getCompanyContacts(company.id);

  const [showAdd, setShowAdd] = useState(false);
  const [type, setType] = useState<TimelineEntryType>('note');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [contactId, setContactId] = useState('');

  const handleAdd = async () => {
    if (!title.trim()) return;
    await addTimelineEntry(company.id, type, title.trim(), content.trim() || undefined, contactId || undefined);
    setTitle('');
    setContent('');
    setContactId('');
    setShowAdd(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Aktivitaeten</span>
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowAdd(!showAdd)}>
          <Plus className="w-3.5 h-3.5 mr-1" /> Eintrag
        </Button>
      </div>

      {showAdd && (
        <div className="space-y-2 p-3 rounded-xl bg-muted/30 border border-border/50">
          <Select value={type} onValueChange={(v) => setType(v as TimelineEntryType)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.entries(TIMELINE_TYPE_CONFIG) as [TimelineEntryType, { label: string }][])
                .filter(([k]) => k !== 'status_change')
                .map(([key, cfg]) => (
                  <SelectItem key={key} value={key} className="text-xs">{cfg.label}</SelectItem>
                ))}
            </SelectContent>
          </Select>
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Betreff..." className="h-8 text-xs" />
          <Textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Details (optional)..." rows={2} className="text-xs" />
          {contacts.length > 0 && (
            <Select value={contactId} onValueChange={setContactId}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Kontaktperson (optional)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none" className="text-xs">Kein Kontakt</SelectItem>
                {contacts.map(c => (
                  <SelectItem key={c.id} value={c.id} className="text-xs">{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <div className="flex gap-2">
            <Button size="sm" className="flex-1 h-8 text-xs" disabled={!title.trim()} onClick={handleAdd}>Speichern</Button>
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setShowAdd(false)}>Abbrechen</Button>
          </div>
        </div>
      )}

      {entries.length === 0 && !showAdd ? (
        <p className="text-xs text-muted-foreground text-center py-8">Noch keine Eintraege</p>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border/50" />
          <div className="space-y-3">
            {entries.map((entry) => {
              const contact = entry.contact_id ? contacts.find(c => c.id === entry.contact_id) : null;
              return (
                <div key={entry.id} className="relative flex gap-3 pl-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 ${ICON_COLORS[entry.entry_type]}`}>
                    {ICONS[entry.entry_type]}
                  </div>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{entry.title || TIMELINE_TYPE_CONFIG[entry.entry_type].label}</p>
                        {contact && <p className="text-[10px] text-muted-foreground">mit {contact.name}</p>}
                        {entry.content && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{entry.content}</p>}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-[10px] text-muted-foreground">{format(new Date(entry.created_at), 'dd. MMM', { locale: de })}</span>
                        {entry.entry_type !== 'status_change' && (
                          <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-destructive" onClick={() => deleteTimelineEntry(entry.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
