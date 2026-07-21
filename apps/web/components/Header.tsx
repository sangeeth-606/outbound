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
    <header className="h-14 flex-shrink-0 bg-surface-secondary border-b border-border-separator flex items-center justify-between px-6">
      <div className="flex items-center gap-3">
        <h1 className="text-sm font-bold tracking-wide text-text-main uppercase">
          {title}
        </h1>
        <span className="text-[10px] text-text-label bg-surface-primary px-2 py-0.5 rounded-sm border border-border-dim">
          {pathname}
        </span>
      </div>

      <div className="flex items-center gap-4">
        <a
          href="mailto:support@zape.work"
          className="text-[10px] text-accent-warning bg-accent-warning/10 px-2.5 py-1 rounded-sm border border-accent-warning/20 tracking-wider uppercase hover:bg-accent-warning/20 transition-colors"
        >
          ⚡ Pre-release — contact support@zape.work
        </a>

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
      </div>
    </header>
  );
}
