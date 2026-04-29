// ═══════════════════════════════════════════════════════════
// hooks/use-tenant-path.ts
// THE FIX FOR 80% OF NAVIGATION BUGS
// 
// Use this hook anywhere you need to build a workspace-scoped URL.
// Never hardcode "/tasks" — always do tp("/tasks") or tp("tasks").
// ═══════════════════════════════════════════════════════════

'use client';

import { useParams } from 'next/navigation';

export function useTenantPath() {
  const params = useParams();
  const workspace = (params?.workspace as string) ?? 'orage';

  return function tp(path: string): string {
    // Strip leading slash if present
    const clean = path.startsWith('/') ? path.slice(1) : path;
    
    // Empty = workspace root
    if (!clean || clean === '') return `/${workspace}`;
    
    // Anchors only (e.g. "#rocks") — append to current page
    if (clean.startsWith('#')) return clean;
    
    // External URLs pass through
    if (clean.startsWith('http://') || clean.startsWith('https://')) return clean;
    
    return `/${workspace}/${clean}`;
  };
}

// Server-side variant — pass workspace explicitly
export function tenantPath(workspace: string, path: string): string {
  const clean = path.startsWith('/') ? path.slice(1) : path;
  if (!clean) return `/${workspace}`;
  if (clean.startsWith('#')) return clean;
  if (clean.startsWith('http://') || clean.startsWith('https://')) return clean;
  return `/${workspace}/${clean}`;
}
