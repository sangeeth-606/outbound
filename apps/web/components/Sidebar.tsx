'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Phone,
  Headphones,
  Users,
  Mic,
  History,
  Settings,
  Terminal,
} from 'lucide-react';

const navGroups = [
  {
    label: 'Operations',
    items: [
      { href: '/', label: 'Call Center', icon: Phone },
      { href: '/support', label: 'Agent Hub', icon: Headphones },
      { href: '/live-transcribe', label: 'Live Monitor', icon: Mic },
    ],
  },
  {
    label: 'Agents',
    items: [
      { href: '/agent-a', label: 'Agent Alpha', icon: Users },
      { href: '/agent-b', label: 'Agent Bravo', icon: Users },
    ],
  },
  {
    label: 'System',
    items: [
      { href: '/transfers/history', label: 'Transfer Log', icon: History },
      { href: '/api/ws', label: 'WebSocket', icon: Terminal },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 flex-shrink-0 bg-surface-secondary border-r border-border-separator flex flex-col h-full">
      <div className="h-14 flex items-center gap-2.5 px-5 border-b border-border-separator">
        <div className="w-2 h-2 rounded-full bg-accent-success" style={{ boxShadow: '0 0 6px rgba(0, 255, 136, 0.5)' }} />
        <span className="text-sm font-bold tracking-wider text-text-main uppercase">Outbound</span>
        <span className="text-[10px] text-text-label ml-auto uppercase">v1.0</span>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 space-y-6">
        {navGroups.map((group) => (
          <div key={group.label}>
            <div className="px-5 mb-2 text-[10px] font-bold uppercase tracking-widest text-text-label">
              {group.label}
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`sidebar-item ${isActive ? 'active' : ''}`}
                  >
                    <item.icon className="w-4 h-4 flex-shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-border-separator">
        <div className="flex items-center gap-2 text-xs text-text-muted">
          <div className="status-dot live" />
          <span>System Online</span>
        </div>
      </div>
    </aside>
  );
}
