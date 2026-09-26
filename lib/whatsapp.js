// WhatsApp message template helpers.
// Placeholders supported: {guest_name}, {event_name}, {event_date}, {event_time},
// {event_location}, {invitation_url}, {guest_category}, {guest_quota}

export const DEFAULT_WHATSAPP_TEMPLATE = `Dear {guest_name},

With joy, we invite you to celebrate the wedding of {event_name}.

Event Date: {event_date}
Time: {event_time}
Location: {event_location}

Category: {guest_category}
Guest Quota: {guest_quota}

Please view your personalized invitation here:
{invitation_url}

We look forward to celebrating with you!`;

// Build the public invitation URL for a guest, honoring customDomain / subdomain when available.
export function buildInvitationUrl(baseOrigin, invitation, guestToken) {
  const suffix = guestToken ? `?guest=${guestToken}` : "";
  if (invitation?.customDomain) {
    return `https://${invitation.customDomain}/${suffix}`;
  }
  if (invitation?.subdomain && baseOrigin) {
    try {
      const u = new URL(baseOrigin);
      const rootHost = u.hostname.split(".").slice(-2).join(".");
      // Best-effort subdomain URL; falls back gracefully if hostname isn't a real domain.
      return `${u.protocol}//${invitation.subdomain}.${rootHost}/${suffix}`;
    } catch {}
  }
  const base = (baseOrigin || "").replace(/\/$/, "");
  return `${base}/invite/${invitation.slug}${suffix}`;
}

function fmtDate(d) {
  if (!d) return "";
  try {
    const date = typeof d === "string" ? new Date(d) : d;
    // Ubah undefined menjadi 'en-GB' agar formatnya seragam di server dan browser
    return date.toLocaleDateString("en-GB", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

// Render a template by replacing placeholders using the provided context.
// Both {curly} and legacy patterns are supported.
export function renderTemplate(template, ctx) {
  const map = {
    "{guest_name}": ctx.guest_name || "",
    "{event_name}": ctx.event_name || "",
    "{event_date}": ctx.event_date || "",
    "{event_time}": ctx.event_time || "",
    "{event_location}": ctx.event_location || "",
    "{invitation_url}": ctx.invitation_url || "",
    "{guest_category}": ctx.guest_category || "",
    "{guest_quota}": String(ctx.guest_quota ?? ""),
  };
  let out = String(template || DEFAULT_WHATSAPP_TEMPLATE);
  for (const [k, v] of Object.entries(map)) {
    out = out.split(k).join(v);
  }
  return out;
}

// Build the {placeholder} context for a given guest + invitation + optional origin.
export function buildContext({ invitation, guest, origin }) {
  // Events are stored in the `events` JSON array (no weddingDate column). Derive from events[0].
  const events = Array.isArray(invitation?.events) ? invitation.events : [];
  const ev = events[0] || {};
  return {
    guest_name: guest?.name || "",
    event_name:
      [invitation?.brideName, invitation?.groomName]
        .filter(Boolean)
        .join(" & ") || "our wedding",
    event_date: ev.date ? fmtDate(ev.date) : "",
    event_time: ev.time || "",
    event_location: ev.venue || ev.address || "",
    invitation_url: buildInvitationUrl(origin, invitation, guest?.token),
    guest_category: guest?.category || guest?.categoryText || "",
    guest_quota: guest?.quota ?? 1,
  };
}

export const PLACEHOLDER_LIST = [
  "{guest_name}",
  "{event_name}",
  "{event_date}",
  "{event_time}",
  "{event_location}",
  "{invitation_url}",
  "{guest_category}",
  "{guest_quota}",
];
