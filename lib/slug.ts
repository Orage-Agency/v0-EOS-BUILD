/**
 * Workspace-slug helpers. Pure functions — extracted from
 * app/actions/auth.ts because "use server" files can only export async
 * functions, and these are sync constants/utilities used by both the
 * server action and tests.
 */

export const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    // Treat whitespace and underscores as word separators FIRST so they
    // don't get stripped before they can become hyphens.
    .replace(/[\s_]+/g, "-")
    // Now strip anything that isn't a-z, 0-9, or the hyphen separator.
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
}
