import { useState } from 'react';
import { ExternalLink, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WidgetSize } from '@/hooks/useDashboardV2';

interface Props {
  size: WidgetSize;
}

export function PortalWidget({ size }: Props) {
  const [key, setKey] = useState(0);
  const portalUrl = 'https://portal.hls-ol.de';

  if (size === 'small') {
    return (
      <a
        href={portalUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="h-full flex flex-col items-center justify-center gap-2 p-4"
      >
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <ExternalLink className="w-5 h-5 text-primary" />
        </div>
        <span className="text-xs font-medium text-muted-foreground">LARA Portal</span>
      </a>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/40">
        <span className="text-sm font-semibold">LARA Portal</span>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setKey(k => k + 1)}
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
          <a href={portalUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <ExternalLink className="w-3.5 h-3.5" />
            </Button>
          </a>
        </div>
      </div>
      <div className="flex-1 relative min-h-0">
        <iframe
          key={key}
          src={portalUrl}
          className="absolute inset-0 w-full h-full border-0 rounded-b-xl"
          title="LARA Portal"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
          referrerPolicy="no-referrer"
        />
      </div>
    </div>
  );
}
