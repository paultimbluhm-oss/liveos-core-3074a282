import { useState } from 'react';
import { ExternalLink, RefreshCw, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { WidgetSize } from '@/hooks/useDashboardV2';

interface Props {
  size: WidgetSize;
}

const PORTAL_URL = 'https://portal.hls-ol.de';

function PortalIframe({ className }: { className?: string }) {
  return (
    <iframe
      src={PORTAL_URL}
      className={className}
      title="LARA Portal"
      sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
      referrerPolicy="no-referrer"
      allow="clipboard-write"
    />
  );
}

export function PortalWidget({ size }: Props) {
  const [fullscreen, setFullscreen] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);

  if (size === 'small') {
    return (
      <button
        onClick={() => setFullscreen(true)}
        className="h-full w-full flex flex-col items-center justify-center gap-2 p-4"
      >
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Maximize2 className="w-5 h-5 text-primary" />
        </div>
        <span className="text-xs font-medium">LARA Portal</span>
        <Sheet open={fullscreen} onOpenChange={setFullscreen}>
          <SheetContent side="bottom" className="h-[95vh] rounded-t-2xl p-0 flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 shrink-0">
              <span className="text-sm font-semibold">LARA Portal</span>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIframeKey(k => k + 1)}>
                  <RefreshCw className="w-3.5 h-3.5" />
                </Button>
                <a href={PORTAL_URL} target="_blank" rel="noopener noreferrer">
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Button>
                </a>
              </div>
            </div>
            <div className="flex-1 min-h-0">
              <iframe
                key={iframeKey}
                src={PORTAL_URL}
                className="w-full h-full border-0"
                title="LARA Portal"
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
                referrerPolicy="no-referrer"
                allow="clipboard-write"
              />
            </div>
          </SheetContent>
        </Sheet>
      </button>
    );
  }

  return (
    <>
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/40 shrink-0">
          <span className="text-sm font-semibold">LARA Portal</span>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIframeKey(k => k + 1)}>
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setFullscreen(true)}>
              <Maximize2 className="w-3.5 h-3.5" />
            </Button>
            <a href={PORTAL_URL} target="_blank" rel="noopener noreferrer">
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <ExternalLink className="w-3.5 h-3.5" />
              </Button>
            </a>
          </div>
        </div>
        <div className="flex-1 relative min-h-0 overflow-hidden rounded-b-xl">
          <iframe
            key={iframeKey}
            src={PORTAL_URL}
            className="absolute inset-0 w-full h-full border-0"
            title="LARA Portal"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
            referrerPolicy="no-referrer"
            allow="clipboard-write"
          />
          {/* Overlay for click-to-fullscreen on medium */}
          {size === 'medium' && (
            <button 
              onClick={() => setFullscreen(true)}
              className="absolute inset-0 bg-transparent cursor-pointer z-10"
              aria-label="Vollbild oeffnen"
            />
          )}
        </div>
      </div>

      <Sheet open={fullscreen} onOpenChange={setFullscreen}>
        <SheetContent side="bottom" className="h-[95vh] rounded-t-2xl p-0 flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 shrink-0">
            <span className="text-sm font-semibold">LARA Portal</span>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIframeKey(k => k + 1)}>
                <RefreshCw className="w-3.5 h-3.5" />
              </Button>
              <a href={PORTAL_URL} target="_blank" rel="noopener noreferrer">
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <ExternalLink className="w-3.5 h-3.5" />
                </Button>
              </a>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setFullscreen(false)}>
                <Minimize2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
          <div className="flex-1 min-h-0">
            <iframe
              key={`fs-${iframeKey}`}
              src={PORTAL_URL}
              className="w-full h-full border-0"
              title="LARA Portal Vollbild"
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
              referrerPolicy="no-referrer"
              allow="clipboard-write"
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
