import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

export function InfoSettings() {
  const { user } = useAuth();

  const rows = [
    { label: 'E-Mail', value: user?.email },
    { label: 'Benutzer-ID', value: user?.id?.slice(0, 8) + '...' },
    { label: 'Registriert', value: user?.created_at ? format(new Date(user.created_at), 'd. MMM yyyy', { locale: de }) : '-' },
    { label: 'App', value: 'LiveOS' },
    { label: 'Version', value: '2.0.0' },
    { label: 'Plattform', value: 'Web' },
  ];

  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <div key={row.label} className="flex items-center justify-between py-2">
          <span className="text-sm text-muted-foreground">{row.label}</span>
          <span className="text-sm font-medium">{row.value}</span>
        </div>
      ))}
    </div>
  );
}
