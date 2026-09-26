// Centralized invitation -> template data context builder (Feature 2).
//
// Produces an invitation-SCOPED, public-safe, flat context consumed by the template engine's
// lowercase dotted-token resolver ({brideName}, {gallery1.url}, {event1.title}, {allGallery}, ...).
//
// Guarantees:
//  - No queries here: numbered vars (gallery1..N) are derived from the ALREADY-fetched relation
//    arrays passed in the invitation object -> no N+1, no extra round-trips.
//  - No fake records: entityN exists only for indexes that actually exist.
//  - Deterministic ordering.
//  - Only whitelisted, public-appropriate fields are exposed (never Guest.token, ids, relations,
//    user credentials, sessions, Prisma, env, or other invitations' data).

function asArray(v) { return Array.isArray(v) ? v : []; }
function str(v) { return v == null ? '' : String(v); }
function byCreatedAt(a, b) { return new Date(a?.createdAt || 0) - new Date(b?.createdAt || 0); }

// ---- per-entity sanitizers (whitelist safe public fields only) ----
function sGallery(g) { return { url: str(g.url), caption: str(g.caption), order: g.order ?? 0 }; }
function sGuest(g) {
  return {
    name: str(g.name), phone: str(g.phone), guestType: str(g.guestType),
    gender: str(g.gender), guestSide: str(g.guestSide), quota: g.quota ?? 1,
    category: str(g.categoryText),
  };
}
function sVideo(v) { return { url: str(v.url), type: str(v.type), title: str(v.title) }; }
function sMusic(m) { return { url: str(m.url), title: str(m.title), autoplay: !!m.autoplay }; }
function safeJson(s) { try { return JSON.parse(s); } catch { return null; } }
function sRsvp(r) {
  const base = {
    name: str(r.name), attendance: str(r.attendance), rsvpType: str(r.rsvpType),
    type: str(r.rsvpType), guestCount: r.guestCount ?? 1, message: str(r.message),
  };
  // Dynamically expose owner-defined custom RSVP fields ({rsvpN.<fieldKey>}) straight from
  // Rsvp.customData — so new custom fields need NO changes to the template engine.
  const cd = typeof r.customData === 'string' ? safeJson(r.customData) : r.customData;
  if (cd && typeof cd === 'object') {
    for (const [k, v] of Object.entries(cd)) {
      if (!(k in base)) base[k] = (v == null ? '' : (typeof v === 'object' ? JSON.stringify(v) : String(v)));
    }
  }
  return base;
}
function sMoment(m) { return { url: str(m.url), senderName: str(m.senderName), message: str(m.message) }; }
function sGift(g) {
  return {
    kind: str(g.kind), type: str(g.kind),
    provider: str(g.provider), accountName: str(g.accountName), accountNumber: str(g.accountNumber),
    instructions: str(g.instructions),
    itemName: str(g.itemName), description: str(g.description), link: str(g.link),
    recipientName: str(g.recipientName),
  };
}
function sEvent(e) {
  return {
    title: str(e.title), date: str(e.date), time: str(e.time),
    venue: str(e.venue), address: str(e.address), mapUrl: str(e.mapUrl),
  };
}
function sStory(s) { return { date: str(s.date), title: str(s.title), story: str(s.story) }; }

/**
 * Build the flat lowercase template context from a single fetched invitation object
 * (with its relations already included). Missing relations default to empty arrays.
 */
export function buildInvitationTemplateData(inv) {
  if (!inv) return {};

  // JSON-column collections
  const events = asArray(inv.events).map(sEvent);
  const stories = asArray(inv.loveStory).map(sStory);

  // Relational collections (deterministic order; derived from already-fetched arrays)
  const gallery = asArray(inv.gallery).slice()
    .sort((a, b) => (a.order - b.order) || byCreatedAt(a, b))
    .map(sGallery);
  const guests = asArray(inv.guests).slice().sort(byCreatedAt).map(sGuest);
  const videos = asArray(inv.videos).slice().sort(byCreatedAt).map(sVideo);
  const music = inv.music ? [sMusic(inv.music)] : [];   // Music is 1:1
  const rsvps = asArray(inv.rsvps).slice().sort(byCreatedAt).map(sRsvp);
  const moments = asArray(inv.moments).slice().sort(byCreatedAt).map(sMoment);
  // Gifts: only enabled ones are public; deterministic order (order then createdAt).
  const gifts = asArray(inv.gifts)
    .filter((g) => g.enabled !== false)
    .slice()
    .sort((a, b) => (a.order - b.order) || byCreatedAt(a, b))
    .map(sGift);

  const first = events[0] || {};

  const ctx = {
    // Scalars (existing invitation fields)
    brideName: str(inv.brideName),
    groomName: str(inv.groomName),
    brideParents: str(inv.brideParents),
    groomParents: str(inv.groomParents),
    groomFather: str(inv.groomFather),
    groomMother: str(inv.groomMother),
    brideFather: str(inv.brideFather),
    brideMother: str(inv.brideMother),
    quote: str(inv.quote),
    coverImage: str(inv.coverImage),
    bridePhoto: str(inv.bridePhoto),
    groomPhoto: str(inv.groomPhoto),

    // Theme fields
    primaryColor: str(inv.primaryColor),
    secondaryColor: str(inv.secondaryColor),
    backgroundColor: str(inv.backgroundColor),
    fontFamily: str(inv.fontFamily),
    buttonStyle: str(inv.buttonStyle),
    borderRadius: str(inv.borderRadius),
    animation: str(inv.animation),

    // Event-derived scalars (from events[0]) — fixes the previously-blank date/venue/countdown
    eventDate: str(first.date),
    eventTime: str(first.time),
    venue: str(first.venue),
    address: str(first.address),
    googleMapsUrl: str(first.mapUrl),

    // Collections (arrays)
    allGallery: gallery,
    allGuests: guests,
    allVideos: videos,
    allMusic: music,
    allRsvp: rsvps,
    allMoments: moments,
    allEvents: events,
    allStories: stories,
    allGifts: gifts,
  };

  // Numbered accessors (1-based) — only for indexes that actually exist.
  gallery.forEach((x, i) => { ctx[`gallery${i + 1}`] = x; });
  guests.forEach((x, i) => { ctx[`guest${i + 1}`] = x; });
  videos.forEach((x, i) => { ctx[`video${i + 1}`] = x; });
  music.forEach((x, i) => { ctx[`music${i + 1}`] = x; });
  rsvps.forEach((x, i) => { ctx[`rsvp${i + 1}`] = x; });
  moments.forEach((x, i) => { ctx[`moment${i + 1}`] = x; });
  events.forEach((x, i) => { ctx[`event${i + 1}`] = x; });
  stories.forEach((x, i) => { ctx[`story${i + 1}`] = x; });
  gifts.forEach((x, i) => { ctx[`gift${i + 1}`] = x; });

  return ctx;
}

export default buildInvitationTemplateData;
