'use client';

import { useEffect, useState } from 'react';
import { usePathname, useParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { useL10Store } from '@/lib/l10-store';
import { USERS } from '@/lib/mock-data';
import { createClient } from '@/lib/supabase/client';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Module-scoped cache so crumbs across navigations don't re-fetch.
const _profileNameCache = new Map<string, string>();

function useProfileName(userId: string | undefined): string | undefined {
  const [name, setName] = useState<string | undefined>(
    userId ? _profileNameCache.get(userId) : undefined,
  );
  useEffect(() => {
    if (!userId || !UUID_RE.test(userId)) return;
    if (_profileNameCache.has(userId)) {
      setName(_profileNameCache.get(userId));
      return;
    }
    let cancelled = false;
    const sb = createClient();
    sb.from('profiles')
      .select('full_name, email')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled || !data) return;
        const row = data as { full_name: string | null; email: string };
        const resolved = row.full_name ?? row.email;
        _profileNameCache.set(userId, resolved);
        setName(resolved);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);
  return name;
}

const LABELS: Record<string, string> = {
  '': 'Dashboard',
  rocks: 'Rocks',
  tasks: 'Tasks',
  notes: 'Notes',
  issues: 'Issues',
  scorecard: 'Scorecard',
  l10: 'L10 Meeting',
  people: 'People',
  vto: 'V/TO',
  orgchart: 'Accountability Chart',
  ai: 'AI Implementer',
  help: 'Help & Manual',
  settings: 'Settings',
  admin: "Bird's Eye View",
  workspace: 'General',
  members: 'Members',
  integrations: 'Integrations',
  security: 'Security',
  notifications: 'Notifications',
};

export function Breadcrumb({ workspaceName = 'Orage Agency' }: { workspaceName?: string }) {
  const pathname = usePathname();
  const params = useParams();
  const workspaceSlug = (params?.workspace as string) ?? 'orage';
  const getMeeting = useL10Store((s) => s.getMeeting);

  // Strip workspace slug from path
  const segments = pathname.split('/').filter(Boolean);
  const moduleSegments = segments[0] === workspaceSlug ? segments.slice(1) : segments;

  // If we're on /people/{uuid}, asynchronously resolve the user's name
  // so the breadcrumb stops showing the raw uuid.
  const isPersonRoute = moduleSegments[0] === 'people' && moduleSegments[1] && UUID_RE.test(moduleSegments[1]);
  const resolvedPersonName = useProfileName(isPersonRoute ? moduleSegments[1] : undefined);

  const crumbs = moduleSegments.length === 0
    ? [{ label: 'Dashboard', href: `/${workspaceSlug}` }]
    : moduleSegments.map((seg, i) => {
        const href = `/${workspaceSlug}/${moduleSegments.slice(0, i + 1).join('/')}`;
        let label = LABELS[seg];
        if (!label) {
          // L10 meeting ID
          const meeting = getMeeting(seg);
          if (meeting) { label = meeting.name; }
          else if (i === 1 && moduleSegments[0] === 'people' && resolvedPersonName) {
            // Real DB profile id → use the resolved name
            label = resolvedPersonName;
          }
          else {
            // People user ID (legacy mock)
            const user = USERS.find((u) => u.id === seg);
            label = user ? user.name : seg.charAt(0).toUpperCase() + seg.slice(1);
          }
        }
        return { label, href };
      });

  return (
    <nav className="flex items-center gap-2 text-[11px] uppercase tracking-[0.1em]" style={{ fontFamily: 'Bebas Neue' }}>
      <Link href={`/${workspaceSlug}`} className="text-[#8a7860] hover:text-[#E4AF7A] transition-colors">
        {workspaceName}
      </Link>
      {crumbs.map((c, i) => (
        <span key={c.href} className="flex items-center gap-2">
          <ChevronRight size={12} className="text-[#5a4f3e]" />
          {i === crumbs.length - 1 ? (
            <span className="text-[#FFD69C]">{c.label}</span>
          ) : (
            <Link href={c.href} className="text-[#8a7860] hover:text-[#E4AF7A]">{c.label}</Link>
          )}
        </span>
      ))}
    </nav>
  );
}
