/**
 * Tiny HTML email templates. Inline styles only — most clients strip <style>.
 * Brand: black + Orage gold (#B68039 / #E4AF7A) + Bebas-style display.
 */
import "server-only"

const BRAND = {
  bg: "#0a0a0a",
  card: "#151515",
  border: "rgba(182,128,57,0.18)",
  gold: "#B68039",
  goldLight: "#E4AF7A",
  text: "#FFD69C",
  muted: "#8a7860",
}

function shell(opts: {
  preheader?: string
  heading: string
  body: string
  ctaLabel?: string
  ctaUrl?: string
  footer?: string
}): string {
  const { preheader, heading, body, ctaLabel, ctaUrl, footer } = opts
  const cta =
    ctaLabel && ctaUrl
      ? `<tr><td style="padding:24px 0 8px 0;">
           <a href="${ctaUrl}" style="display:inline-block;padding:12px 22px;background:${BRAND.gold};color:#000;text-decoration:none;font-family:Arial,sans-serif;font-size:13px;letter-spacing:.1em;text-transform:uppercase;border-radius:2px;font-weight:600;">${ctaLabel}</a>
         </td></tr>`
      : ""
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${heading}</title></head>
<body style="margin:0;padding:0;background:${BRAND.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:${BRAND.text};">
${preheader ? `<div style="display:none;max-height:0;overflow:hidden;color:${BRAND.bg};">${preheader}</div>` : ""}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.bg};padding:32px 16px;">
  <tr><td align="center">
    <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:${BRAND.card};border:1px solid ${BRAND.border};border-radius:4px;overflow:hidden;">
      <tr><td style="padding:24px 28px;border-bottom:1px solid ${BRAND.border};">
        <div style="font-family:'Bebas Neue',Impact,sans-serif;letter-spacing:.18em;color:${BRAND.goldLight};font-size:14px;">ORAGE&nbsp;CORE</div>
      </td></tr>
      <tr><td style="padding:28px;">
        <h1 style="margin:0 0 12px 0;font-size:20px;color:${BRAND.goldLight};font-family:'Bebas Neue',Impact,sans-serif;letter-spacing:.06em;">${heading}</h1>
        <div style="font-size:14px;line-height:1.55;color:${BRAND.text};">${body}</div>
        <table role="presentation" cellpadding="0" cellspacing="0">${cta}</table>
      </td></tr>
      <tr><td style="padding:18px 28px;border-top:1px solid ${BRAND.border};color:${BRAND.muted};font-size:11px;">
        ${footer ?? "You're receiving this because you're a member of an Orage Core workspace."}
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`
}

export function inviteEmail(args: {
  workspaceName: string
  inviteUrl: string
  inviterName: string
  role: string
}): { subject: string; html: string } {
  const subject = `${args.inviterName} invited you to join ${args.workspaceName} on Orage Core`
  const html = shell({
    preheader: `Join ${args.workspaceName} as ${args.role}.`,
    heading: `Join ${args.workspaceName}`,
    body: `<p style="margin:0 0 12px 0;"><strong style="color:${BRAND.goldLight};">${args.inviterName}</strong> invited you to join <strong>${args.workspaceName}</strong> as a <strong>${args.role}</strong> on Orage Core, our EOS-style operating system.</p>
           <p style="margin:0;color:${BRAND.muted};">The link below is single-use and expires in 14 days.</p>`,
    ctaLabel: "Accept invite",
    ctaUrl: args.inviteUrl,
  })
  return { subject, html }
}

export function digestEmail(args: {
  recipientName: string
  workspaceName: string
  inboxUrl: string
  items: { title: string; body: string | null; relativeTime: string }[]
}): { subject: string; html: string } {
  const count = args.items.length
  const subject = `${count} new ${count === 1 ? "update" : "updates"} in ${args.workspaceName}`
  const list = args.items
    .slice(0, 20)
    .map(
      (i) =>
        `<tr><td style="padding:10px 0;border-bottom:1px solid ${BRAND.border};">
           <div style="font-size:13px;color:${BRAND.text};">${escape(i.title)}</div>
           ${i.body ? `<div style="font-size:12px;color:${BRAND.muted};margin-top:2px;">${escape(i.body)}</div>` : ""}
           <div style="font-size:10px;color:${BRAND.muted};margin-top:4px;font-family:monospace;">${escape(i.relativeTime)}</div>
         </td></tr>`,
    )
    .join("")
  const more =
    args.items.length > 20
      ? `<p style="margin:12px 0 0 0;color:${BRAND.muted};font-size:12px;">…and ${args.items.length - 20} more in your inbox.</p>`
      : ""
  const html = shell({
    preheader: subject,
    heading: `Yesterday in ${args.workspaceName}`,
    body: `<p style="margin:0 0 12px 0;">Hi ${escape(args.recipientName)} — here's what's new:</p>
           <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${list}</table>${more}`,
    ctaLabel: "Open inbox",
    ctaUrl: args.inboxUrl,
    footer:
      "You're receiving this because you have unread notifications. Mark them read in the inbox to stop the daily digest.",
  })
  return { subject, html }
}

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}
