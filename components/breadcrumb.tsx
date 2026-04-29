'use client';

import { usePathname, useParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { useL10Store } from '@/lib/l10-store';

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

  const crumbs = moduleSegments.length === 0
    ? [{ label: 'Dashboard', href: `/${workspaceSlug}` }]
    : moduleSegments.map((seg, i) => {
        const href = `/${workspaceSlug}/${moduleSegments.slice(0, i + 1).join('/')}`;
        let label = LABELS[seg];
        if (!label) {
          // Check if it's an L10 meeting ID
          const meeting = getMeeting(seg);
          label = meeting ? meeting.name : seg.charAt(0).toUpperCase() + seg.slice(1);
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
