// ═══════════════════════════════════════════════════════════
// components/tenant-link.tsx
// Drop-in replacement for next/link that auto-prefixes /workspace
// 
// USAGE:
// import { TenantLink } from '@/components/tenant-link';
// <TenantLink href="/tasks">Go to Tasks</TenantLink>
// → renders <a href="/orage/tasks">
// ═══════════════════════════════════════════════════════════

'use client';

import Link from 'next/link';
import { useTenantPath } from '@/hooks/use-tenant-path';
import type { ComponentProps } from 'react';

type TenantLinkProps = Omit<ComponentProps<typeof Link>, 'href'> & {
  href: string;
};

export function TenantLink({ href, ...props }: TenantLinkProps) {
  const tp = useTenantPath();
  return <Link href={tp(href)} {...props} />;
}
