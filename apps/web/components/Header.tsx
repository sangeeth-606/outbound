'use client';

import { usePathname } from 'next/navigation';
import { Wifi, WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';

const pageTitles: Record<string, string> = {
  '/': 'Call Center',
  '/support': 'Agent Hub',
  '/agent-a': 'Agent Alpha',
  '/agent-b': 'Agent Bravo',
  '/live-transcribe': 'Live Monitor',
};

const marqueeText = '⚠  SITE UNDER MAINTENANCE  ·  WORK IN PROGRESS  ·  CONTACT SUPPORT@ZAPE.WORK  ⚠';

export function Header() {
  const pathname = usePathname();
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = process.env.NEXT_PUBLIC_BACKEND_HOST || 'localhost:8000';
    const ws = new WebSocket(`${protocol}//${host}/ws/notifications`);

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);

    return () => ws.close();
  }, []);

  const title = pageTitles[pathname] || 'Dashboard';

  return (
    <div className="flex-shrink-0">
      <div className="h-6 bg-surface-card border-b border-border-separator overflow-hidden relative flex items-center">
        <div className="marquee-track absolute inset-0 flex items-center">
          <div className="marquee-content">
            <span className="text-[10px] text-accent-warning tracking-widest uppercase whitespace-nowrap px-8">{marqueeText}</span>
            <span className="text-[10px] text-accent-warning tracking-widest uppercase whitespace-nowrap px-8">{marqueeText}</span>
            <span className="text-[10px] text-accent-warning tracking-widest uppercase whitespace-nowrap px-8">{marqueeText}</span>
          </div>
        </div>
      </div>
      <header className="h-12 bg-surface-secondary border-b border-border-separator flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-bold tracking-wide text-text-main uppercase">
            {title}
          </h1>
          <span className="text-[10px] text-text-label bg-surface-primary px-2 py-0.5 rounded-sm border border-border-dim">
            {pathname}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs">
            {connected ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-accent-success" />
                <span className="text-accent-success">Connected</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-text-label" />
                <span className="text-text-label">Disconnected</span>
              </>
            )}
          </div>
          <div className={`status-dot ${connected ? 'live' : 'offline'}`} />
        </div>
      </header>
    </div>
  );
}
