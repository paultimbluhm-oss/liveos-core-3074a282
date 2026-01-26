import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Calendar, Info, Code } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

export function InfoSettings() {
  const { user } = useAuth();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="w-4 h-4" strokeWidth={1.5} />
            Kontoinformationen
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">E-Mail-Adresse</span>
            <span className="font-medium">{user?.email}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Benutzer-ID</span>
            <span className="font-mono text-xs text-muted-foreground">{user?.id.slice(0, 8)}...</span>
          </div>
          {user?.created_at && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Registriert am</span>
              <span className="font-medium">
                {format(new Date(user.created_at), 'd. MMMM yyyy', { locale: de })}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Info className="w-4 h-4" strokeWidth={1.5} />
            App-Informationen
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">App-Name</span>
            <span className="font-medium">LiveOS</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Version</span>
            <span className="font-medium">2.0.0</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Plattform</span>
            <span className="font-medium">Web</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Code className="w-4 h-4" strokeWidth={1.5} />
            Technologie
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Frontend</span>
            <span className="font-medium">React + TypeScript</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Backend</span>
            <span className="font-medium">Supabase</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Styling</span>
            <span className="font-medium">Tailwind CSS</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
