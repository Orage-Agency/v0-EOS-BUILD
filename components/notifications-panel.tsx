// ═══════════════════════════════════════════════════════════
// components/notifications-panel.tsx
// Wires up the bell icon in the topbar.
// Drop into the topbar component, replace the existing bell button with this.
// ═══════════════════════════════════════════════════════════

'use client';

import { useState } from 'react';
import { Bell } from 'lucide-react';
import { useTenantPath } from '@/hooks/use-tenant-path';
import Link from 'next/link';

interface Notification {
  id: string;
  type: 'rock_at_risk' | 'task_assigned' | 'mention' | 'l10_summary' | 'pulse';
  title: string;
  body: string;
  href: string;
  read: boolean;
  createdAt: Date;
}

export function NotificationsButton() {
  const [open, setOpen] = useState(false);
  const tp = useTenantPath();
  
  // TODO: replace with real query
  const notifications: Notification[] = [];
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-2 rounded-[2px] text-[#FFD69C] hover:bg-[rgba(255,255,255,0.04)] transition-colors"
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#C25450]" />
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-12 z-50 w-96 bg-[#151515] border border-[rgba(182,128,57,0.18)] rounded-[2px] shadow-2xl">
            <div className="px-4 py-3 border-b border-[rgba(182,128,57,0.18)] flex items-center justify-between">
              <div className="text-[10px] uppercase tracking-[0.18em] text-[#E4AF7A]" style={{ fontFamily: 'Bebas Neue' }}>
                Notifications
              </div>
              {unreadCount > 0 && (
                <button className="text-[10px] uppercase tracking-[0.1em] text-[#8a7860] hover:text-[#E4AF7A]">
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="px-4 py-12 text-center">
                  <div className="text-[12px] text-[#8a7860] mb-1">No notifications</div>
                  <div className="text-[11px] text-[#5a4f3e]">You're all caught up</div>
                </div>
              ) : (
                notifications.map(n => (
                  <Link
                    key={n.id}
                    href={n.href}
                    onClick={() => setOpen(false)}
                    className={`block px-4 py-3 border-b border-[rgba(182,128,57,0.08)] hover:bg-[rgba(255,255,255,0.04)] ${!n.read ? 'bg-[rgba(182,128,57,0.04)]' : ''}`}
                  >
                    <div className="text-[12px] text-[#FFD69C] mb-1">{n.title}</div>
                    <div className="text-[11px] text-[#8a7860]">{n.body}</div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
