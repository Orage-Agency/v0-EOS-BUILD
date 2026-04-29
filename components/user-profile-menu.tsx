// ═══════════════════════════════════════════════════════════
// components/user-profile-menu.tsx
// Wires up the user profile button at the bottom of the sidebar.
// CRITICAL: provides the sign-out option (currently impossible to log out)
// ═══════════════════════════════════════════════════════════

'use client';

import { useState } from 'react';
import { User, Settings, LogOut, ChevronUp } from 'lucide-react';
import Link from 'next/link';
import { useTenantPath } from '@/hooks/use-tenant-path';
import { logout } from '@/app/actions/auth';
import { useParams } from 'next/navigation';

interface UserProfileMenuProps {
  user: {
    id: string;
    fullName: string | null;
    email: string;
    role: string;
    avatarUrl?: string | null;
  };
  tenantLabel?: string;
}

export function UserProfileMenu({ user, tenantLabel = 'Orage' }: UserProfileMenuProps) {
  const [open, setOpen] = useState(false);
  const tp = useTenantPath();
  const params = useParams();
  const workspaceSlug = (params?.workspace as string) ?? 'orage';

  const initials = (user.fullName ?? user.email)
    .split(' ')
    .map(s => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[rgba(255,255,255,0.04)] border-t border-[rgba(182,128,57,0.18)] transition-colors"
      >
        <div className="w-8 h-8 rounded-full bg-[#262019] flex items-center justify-center text-[#E4AF7A] text-[11px] font-semibold">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
          ) : (
            initials
          )}
        </div>
        <div className="flex-1 text-left">
          <div className="text-[12px] text-[#FFD69C] truncate">{user.fullName ?? user.email}</div>
          <div className="text-[10px] text-[#8a7860] uppercase tracking-[0.1em]" style={{ fontFamily: 'Bebas Neue' }}>
            {user.role} · {tenantLabel}
          </div>
        </div>
        <ChevronUp size={14} className={`text-[#8a7860] transition-transform ${open ? '' : 'rotate-180'}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full left-2 right-2 mb-2 z-50 bg-[#151515] border border-[rgba(182,128,57,0.18)] rounded-[2px] shadow-2xl overflow-hidden">
            <Link
              href={tp(`/people/${user.id}`)}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-3 text-[12px] text-[#FFD69C] hover:bg-[rgba(255,255,255,0.04)]"
            >
              <User size={14} />
              View profile
            </Link>
            <Link
              href={tp('/settings')}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-3 text-[12px] text-[#FFD69C] hover:bg-[rgba(255,255,255,0.04)]"
            >
              <Settings size={14} />
              Settings
            </Link>
            <form action={async () => { await logout(workspaceSlug); }}>
              <button
                type="submit"
                className="w-full flex items-center gap-3 px-4 py-3 text-[12px] text-[#C25450] hover:bg-[rgba(194,84,80,0.08)] border-t border-[rgba(182,128,57,0.18)]"
              >
                <LogOut size={14} />
                Sign out
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
