# Broken / Stubbed Buttons Audit

**Generated:** 2026-05-01 · global UX pass (P8)
**Sweep method:** `grep -rn "onClick={() => toast(" components/` plus `onClick={(e) => e.stopPropagation()}` for the dead-icon pattern.

## Fixed in this pass

| File | Button | What it was | Now |
|---|---|---|---|
| `components/notes/notes-editor.tsx` | Share icon | toast("SHARE LINK COPIED") | Real `navigator.clipboard.writeText(window.location.href)` + toast |
| `components/notes/notes-editor.tsx` | More (3-dot) | dead, no onClick | Removed (no menu defined) |
| `components/notes/blocks.tsx` | EmbedRock | toast("OPENING ROCK") | TenantLink to `/rocks?focus={id}` |
| `components/notes/blocks.tsx` | EmbedTask | toast("OPENING TASK") | TenantLink to `/tasks?focus={id}` |
| `components/notes/notes-meta-panel.tsx` | Parent rock chip | toast("OPENING ROCK") | TenantLink to `/rocks?focus={id}` |
| `components/notes/notes-meta-panel.tsx` | Backlink card | toast("OPENING NOTE: ...") | `setActiveNote(bl.id)` |
| `components/l10/runner/agenda-rail.tsx` | Customize Agenda | toast("AGENDA EDITED · NEXT ROUND") | TenantLink to `/l10/{id}` (the detail page now has full agenda CRUD per P6) |
| `components/orgchart/orgchart-shell.tsx` | Export Org Chart | toast("EXPORT QUEUED") | `window.print()` (works as Save-as-PDF in modern browsers) |
| `components/people/people-header.tsx` | Org Chart (header) | dead, no onClick | TenantLink to `/orgchart` |
| `components/tasks/tasks-toolbar.tsx` | Sort/Group/Status chips | dead | Real `<select>` controls bound to URL params (P1) |
| `components/tasks/task-row.tsx` | Archive (icon) | dead | archives via `archiveOne` |
| `components/tasks/task-row.tsx` | More (3-dot) | dead | Real RowActionMenu (P1) |
| `components/ai/composer.tsx` | MENTION/COMMANDS/ATTACH | toast(label) stubs | Removed (no real behavior) |

`?focus=` is consumed nowhere yet — it's a forward-compat hint so the
target page can scroll/highlight the right item later. The link still
navigates correctly today.

## Remaining stubs (deferred — needs design + impl, not a one-liner)

These were left intentionally because each one requires a feature, not a
fix. Document the intent before someone wires them naively.

| File | Button | Intended behavior |
|---|---|---|
| `components/admin/tenant-drawer.tsx` (×3) | MESSAGE OWNER · LINK COPIED · MORE ACTIONS | Master-only tenant admin drawer; needs Slack DM integration + a real "send message" pane. |
| `components/ai/approval-card.tsx` | MODIFY MODE | When the AI proposes a write, this should let the user inline-edit args before approving. Needs the approval contract from the AI store side. |
| `components/ai/context-bar.tsx` | PIN ENTITY | Add the active rock/task/issue to the current AI thread's context chips. Needs a chip-picker UI. |
| `components/ai/conversation-pane.tsx` (×2) | SHARE THREAD · PIN | Generate a shareable thread URL + pin to the user's threads list. Needs a `shared_threads` table or row-level toggle. |
| `components/notes/blocks.tsx` | REGENERATING (AI block) | Re-run the AI block with the same prompt. Needs the AI route to accept `regen=true`. |
| `components/people/quarterly-conversation-card.tsx` | CONVERSATION DOC OPENED | Open the QC document in the editor. Needs a `quarterly_conversations` doc surface. |
| `components/settings/danger-zone.tsx` (×2) | EXPORT QUEUED · TRANSFER | Tenant export job + ownership transfer w/ 2FA. Server action work, not a button fix. |
| `components/settings/members-settings.tsx` (×N) | INVITE MODAL · EDIT user | This page is shadowing `/people` — should redirect there or be merged. P4 already wired the real flow on `/people`. |
| `components/admin/*` and a few tenant-drawer rows | various | Master-only admin surfaces; lower priority for end-user flexibility. |

## Pattern checks (no findings)

- All `onClick={(e) => e.stopPropagation()}` matches are intentional
  event-stop guards inside larger interactive parents (rows, modals,
  popovers) — none are dead buttons. Confirmed by inspecting each call
  site individually.
- Sign-out flow (`components/user-profile-menu.tsx`) is correctly wired
  via `<form action={logout}>`. The logout action redirects to
  `/{workspace}/login`. No fix needed.
