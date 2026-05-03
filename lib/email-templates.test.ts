import { describe, expect, it } from "vitest"
import { inviteEmail, digestEmail } from "./email-templates"

describe("inviteEmail", () => {
  const args = {
    workspaceName: "Acme Co",
    inviteUrl: "https://app.example.com/accept-invite?token=abc",
    inviterName: "George Moffat",
    role: "admin",
  }

  it("includes the inviter, workspace, role, and URL", () => {
    const { subject, html } = inviteEmail(args)
    expect(subject).toContain("George Moffat")
    expect(subject).toContain("Acme Co")
    expect(html).toContain("George Moffat")
    expect(html).toContain("Acme Co")
    expect(html).toContain("admin")
    expect(html).toContain(args.inviteUrl)
  })

  it("renders an Accept invite CTA", () => {
    const { html } = inviteEmail(args)
    expect(html).toContain("Accept invite")
  })
})

describe("digestEmail", () => {
  const args = {
    recipientName: "Brooklyn",
    workspaceName: "Acme Co",
    inboxUrl: "https://app.example.com/acme/inbox",
    items: [
      { title: "George assigned you a task", body: "Wire up Stripe", relativeTime: "12m ago" },
      { title: "Rock at risk", body: null, relativeTime: "2h ago" },
    ],
  }

  it("subject reflects the count and workspace", () => {
    const { subject } = digestEmail(args)
    expect(subject).toContain("2 new updates")
    expect(subject).toContain("Acme Co")
  })

  it("renders each item's title in the body", () => {
    const { html } = digestEmail(args)
    expect(html).toContain("George assigned you a task")
    expect(html).toContain("Wire up Stripe")
    expect(html).toContain("Rock at risk")
  })

  it("escapes HTML in user content", () => {
    const html = digestEmail({
      ...args,
      items: [
        { title: "<script>alert('xss')</script>", body: null, relativeTime: "now" },
      ],
    }).html
    expect(html).not.toContain("<script>alert")
    expect(html).toContain("&lt;script&gt;")
  })

  it("singular vs plural copy", () => {
    const single = digestEmail({ ...args, items: [args.items[0]] }).subject
    expect(single).toContain("1 new update")
    expect(single).not.toContain("updates")
  })

  it("caps the rendered list to 20 items but mentions overflow", () => {
    const many = Array.from({ length: 25 }, (_, i) => ({
      title: `Item ${i + 1}`,
      body: null,
      relativeTime: "1m ago",
    }))
    const { html } = digestEmail({ ...args, items: many })
    expect(html).toContain("Item 1")
    expect(html).toContain("Item 20")
    expect(html).not.toContain("Item 25")
    expect(html).toContain("5 more")
  })
})
