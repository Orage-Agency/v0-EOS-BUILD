// ═══════════════════════════════════════════════════════════
// components/calendar-peek.tsx
// Wires up the calendar icon in the topbar.
// ═══════════════════════════════════════════════════════════

'use client';

import { useState } from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import Link from 'next/link';
import { useTenantPath } from '@/hooks/use-tenant-path';

interface CalendarEvent {
  id: string;
  title: string;
  startAt: Date;
  type: 'l10' | 'pulse_review' | '1_on_1' | 'meeting';
}

export function CalendarButton() {
  const [open, setOpen] = useState(false);
  const tp = useTenantPath();

  // TODO: replace with real calendar query
  const events: CalendarEvent[] = [];
  
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="p-2 rounded-[2px] text-[#FFD69C] hover:bg-[rgba(255,255,255,0.04)] transition-colors"
        aria-label="Calendar"
      >
        <CalendarIcon size={18} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-12 z-50 w-96 bg-[#151515] border border-[rgba(182,128,57,0.18)] rounded-[2px] shadow-2xl">
            <div className="px-4 py-3 border-b border-[rgba(182,128,57,0.18)] flex items-center justify-between">
              <div className="text-[10px] uppercase tracking-[0.18em] text-[#E4AF7A]" style={{ fontFamily: 'Bebas Neue' }}>
                Today's Schedule
              </div>
              <Link
                href={tp('/l10')}
                onClick={() => setOpen(false)}
                className="text-[10px] uppercase tracking-[0.1em] text-[#8a7860] hover:text-[#E4AF7A]"
              >
                View all
              </Link>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {events.length === 0 ? (
                <div className="px-4 py-12 text-center">
                  <div className="text-[12px] text-[#8a7860] mb-1">Nothing scheduled today</div>
                  <div className="text-[11px] text-[#5a4f3e]">Connect Google Calendar in Settings</div>
                </div>
              ) : (
                events.map(e => (
                  <div key={e.id} className="px-4 py-3 border-b border-[rgba(182,128,57,0.08)]">
                    <div className="text-[12px] text-[#FFD69C] mb-1">{e.title}</div>
                    <div className="text-[11px] text-[#8a7860]">
                      {e.startAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
