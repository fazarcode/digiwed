module.exports = [
"[project]/.next-internal/server/app/invite/[slug]/page/actions.js [app-rsc] (server actions loader, ecmascript)", ((__turbopack_context__, module, exports) => {

}),
"[project]/app/layout.js [app-rsc] (ecmascript, Next.js Server Component)", ((__turbopack_context__) => {

__turbopack_context__.n(__turbopack_context__.i("[project]/app/layout.js [app-rsc] (ecmascript)"));
}),
"[externals]/@prisma/client [external] (@prisma/client, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("@prisma/client", () => require("@prisma/client"));

module.exports = mod;
}),
"[project]/lib/prisma.js [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__,
    "prisma",
    ()=>prisma
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f40$prisma$2f$client__$5b$external$5d$__$2840$prisma$2f$client$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/@prisma/client [external] (@prisma/client, cjs)");
;
const globalForPrisma = globalThis;
const prisma = globalForPrisma.prisma || new __TURBOPACK__imported__module__$5b$externals$5d2f40$prisma$2f$client__$5b$external$5d$__$2840$prisma$2f$client$2c$__cjs$29$__["PrismaClient"]({
    log: ("TURBOPACK compile-time truthy", 1) ? [
        'error',
        'warn'
    ] : "TURBOPACK unreachable"
});
if ("TURBOPACK compile-time truthy", 1) globalForPrisma.prisma = prisma;
const __TURBOPACK__default__export__ = prisma;
}),
"[externals]/fs [external] (fs, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("fs", () => require("fs"));

module.exports = mod;
}),
"[externals]/stream [external] (stream, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("stream", () => require("stream"));

module.exports = mod;
}),
"[externals]/zlib [external] (zlib, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("zlib", () => require("zlib"));

module.exports = mod;
}),
"[externals]/assert [external] (assert, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("assert", () => require("assert"));

module.exports = mod;
}),
"[externals]/buffer [external] (buffer, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("buffer", () => require("buffer"));

module.exports = mod;
}),
"[project]/lib/invitation-data.js [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

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
__turbopack_context__.s([
    "buildInvitationTemplateData",
    ()=>buildInvitationTemplateData,
    "default",
    ()=>__TURBOPACK__default__export__
]);
function asArray(v) {
    return Array.isArray(v) ? v : [];
}
function str(v) {
    return v == null ? '' : String(v);
}
function byCreatedAt(a, b) {
    return new Date(a?.createdAt || 0) - new Date(b?.createdAt || 0);
}
// ---- per-entity sanitizers (whitelist safe public fields only) ----
function sGallery(g) {
    return {
        url: str(g.url),
        caption: str(g.caption),
        order: g.order ?? 0
    };
}
function sGuest(g) {
    return {
        name: str(g.name),
        phone: str(g.phone),
        guestType: str(g.guestType),
        gender: str(g.gender),
        guestSide: str(g.guestSide),
        quota: g.quota ?? 1,
        category: str(g.categoryText)
    };
}
function sVideo(v) {
    return {
        url: str(v.url),
        type: str(v.type),
        title: str(v.title)
    };
}
function sMusic(m) {
    return {
        url: str(m.url),
        title: str(m.title),
        autoplay: !!m.autoplay
    };
}
function safeJson(s) {
    try {
        return JSON.parse(s);
    } catch  {
        return null;
    }
}
function sRsvp(r) {
    const base = {
        name: str(r.name),
        attendance: str(r.attendance),
        rsvpType: str(r.rsvpType),
        type: str(r.rsvpType),
        guestCount: r.guestCount ?? 1,
        message: str(r.message)
    };
    // Dynamically expose owner-defined custom RSVP fields ({rsvpN.<fieldKey>}) straight from
    // Rsvp.customData — so new custom fields need NO changes to the template engine.
    const cd = typeof r.customData === 'string' ? safeJson(r.customData) : r.customData;
    if (cd && typeof cd === 'object') {
        for (const [k, v] of Object.entries(cd)){
            if (!(k in base)) base[k] = v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
        }
    }
    return base;
}
function sMoment(m) {
    return {
        url: str(m.url),
        senderName: str(m.senderName),
        message: str(m.message)
    };
}
function sGift(g) {
    return {
        kind: str(g.kind),
        type: str(g.kind),
        provider: str(g.provider),
        accountName: str(g.accountName),
        accountNumber: str(g.accountNumber),
        instructions: str(g.instructions),
        itemName: str(g.itemName),
        description: str(g.description),
        link: str(g.link),
        recipientName: str(g.recipientName)
    };
}
function sEvent(e) {
    return {
        title: str(e.title),
        date: str(e.date),
        time: str(e.time),
        venue: str(e.venue),
        address: str(e.address),
        mapUrl: str(e.mapUrl)
    };
}
function sStory(s) {
    return {
        date: str(s.date),
        title: str(s.title),
        story: str(s.story)
    };
}
function buildInvitationTemplateData(inv) {
    if (!inv) return {};
    // JSON-column collections
    const events = asArray(inv.events).map(sEvent);
    const stories = asArray(inv.loveStory).map(sStory);
    // Relational collections (deterministic order; derived from already-fetched arrays)
    const gallery = asArray(inv.gallery).slice().sort((a, b)=>a.order - b.order || byCreatedAt(a, b)).map(sGallery);
    const guests = asArray(inv.guests).slice().sort(byCreatedAt).map(sGuest);
    const videos = asArray(inv.videos).slice().sort(byCreatedAt).map(sVideo);
    const music = inv.music ? [
        sMusic(inv.music)
    ] : []; // Music is 1:1
    const rsvps = asArray(inv.rsvps).slice().sort(byCreatedAt).map(sRsvp);
    const moments = asArray(inv.moments).slice().sort(byCreatedAt).map(sMoment);
    // Gifts: only enabled ones are public; deterministic order (order then createdAt).
    const gifts = asArray(inv.gifts).filter((g)=>g.enabled !== false).slice().sort((a, b)=>a.order - b.order || byCreatedAt(a, b)).map(sGift);
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
        allGifts: gifts
    };
    // Numbered accessors (1-based) — only for indexes that actually exist.
    gallery.forEach((x, i)=>{
        ctx[`gallery${i + 1}`] = x;
    });
    guests.forEach((x, i)=>{
        ctx[`guest${i + 1}`] = x;
    });
    videos.forEach((x, i)=>{
        ctx[`video${i + 1}`] = x;
    });
    music.forEach((x, i)=>{
        ctx[`music${i + 1}`] = x;
    });
    rsvps.forEach((x, i)=>{
        ctx[`rsvp${i + 1}`] = x;
    });
    moments.forEach((x, i)=>{
        ctx[`moment${i + 1}`] = x;
    });
    events.forEach((x, i)=>{
        ctx[`event${i + 1}`] = x;
    });
    stories.forEach((x, i)=>{
        ctx[`story${i + 1}`] = x;
    });
    gifts.forEach((x, i)=>{
        ctx[`gift${i + 1}`] = x;
    });
    return ctx;
}
const __TURBOPACK__default__export__ = buildInvitationTemplateData;
}),
"[project]/lib/template-engine.js [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// Template Engine — replaces {PLACEHOLDERS} in HTML template with real data
__turbopack_context__.s([
    "renderInvitation",
    ()=>renderInvitation,
    "renderInvitationAsync",
    ()=>renderInvitationAsync,
    "renderInvitationFromSource",
    ()=>renderInvitationFromSource,
    "renderInvitationFromSourceAsync",
    ()=>renderInvitationFromSourceAsync
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/fs [external] (fs, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/path [external] (path, cjs)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$qrcode$2f$lib$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/qrcode/lib/index.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$invitation$2d$data$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/invitation-data.js [app-rsc] (ecmascript)");
;
;
;
;
const STORAGE_ROOT = process.env.STORAGE_ROOT || '/app/digital-invitation-platform/storage';
const BASE_URL = ("TURBOPACK compile-time value", "http://localhost:3000") || '';
/**
 * Render a template with invitation data.
 * @param {object} params
 * @param {object} params.template - Template DB row (must have folderPath)
 * @param {object} params.invitation - Full invitation with relations
 * @param {object|null} params.guest - Optional guest object for personalized rendering
 * @param {boolean} params.guestHasRsvp - Whether this guest has already submitted an RSVP (affects RSVP_FIRST mode)
 * @returns {Promise<string>} rendered HTML
 */ // ---- Feature 2: lowercase dotted-token resolver (additive, HTML-escaped, safe) ----
function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
const LOWER_SCALARS = new Set([
    'brideName',
    'groomName',
    'brideParents',
    'groomParents',
    'groomFather',
    'groomMother',
    'brideFather',
    'brideMother',
    'quote',
    'coverImage',
    'bridePhoto',
    'groomPhoto',
    'primaryColor',
    'secondaryColor',
    'backgroundColor',
    'fontFamily',
    'buttonStyle',
    'borderRadius',
    'animation',
    'eventDate',
    'eventTime',
    'venue',
    'address',
    'googleMapsUrl'
]);
const LOWER_ALL = new Set([
    'allGallery',
    'allGuests',
    'allVideos',
    'allMusic',
    'allRsvp',
    'allMoments',
    'allEvents',
    'allStories',
    'allGifts'
]);
const LOWER_NUMBERED = /^(gallery|guest|video|music|rsvp|moment|event|story|gift)[0-9]+$/;
// Only treat a lowercase token as OURS if its first segment is a known scalar / all* / entityN.
// This lets missing records/props resolve to '' while leaving unrelated inline-JS braces untouched.
function isKnownLowerToken(first) {
    return LOWER_SCALARS.has(first) || LOWER_ALL.has(first) || LOWER_NUMBERED.test(first);
}
function safeLookup(ctx, pathStr) {
    const parts = pathStr.split('.');
    let cur = ctx;
    for (const key of parts){
        if (cur == null || typeof cur !== 'object') return undefined;
        if (!Object.prototype.hasOwnProperty.call(cur, key)) return undefined;
        cur = cur[key];
    }
    return cur;
}
function resolveLowerTokens(html, ctx) {
    return html.replace(/\{([a-z][A-Za-z0-9_]*(?:\.[A-Za-z0-9_]+)*)\}/g, (m, pathStr)=>{
        const first = pathStr.split('.')[0];
        if (!isKnownLowerToken(first)) return m; // not our namespace -> leave untouched
        const val = safeLookup(ctx, pathStr);
        if (val == null) return '';
        if (typeof val === 'object') {
            try {
                return escapeHtml(JSON.stringify(val));
            } catch  {
                return '';
            }
        }
        return escapeHtml(val);
    });
}
// Shared: apply token data + rewrite relative asset URLs. Used by both disk-based
// and in-memory (editor buffer) render paths so behaviour stays identical.
function applyTemplateData(html, data, folderPath, lowerCtx = null) {
    // 1) Existing UPPERCASE tokens (unchanged behaviour, backward compatible).
    for (const [key, value] of Object.entries(data)){
        const re = new RegExp('\\{' + key + '\\}', 'g');
        html = html.replace(re, value == null ? '' : String(value));
    }
    // 2) Additive lowercase dotted tokens (HTML-escaped, safe, missing -> '').
    if (lowerCtx) html = resolveLowerTokens(html, lowerCtx);
    // 3) Rewrite relative asset URLs.
    const assetPrefix = `/storage-file/${folderPath}/`;
    html = html.replace(/(href|src)="(?!https?:|\/|data:|#)([^"]+)"/g, (_m, attr, p)=>`${attr}="${assetPrefix}${p}"`);
    return html;
}
async function renderInvitation({ template, invitation, guest = null, guestHasRsvp = false }) {
    const indexPath = __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].join(STORAGE_ROOT, template.folderPath, 'index.html');
    if (!__TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["default"].existsSync(indexPath)) {
        throw new Error(`Template file not found: ${indexPath}`);
    }
    const html = __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["default"].readFileSync(indexPath, 'utf8');
    const data = buildData(invitation, guest, template, guestHasRsvp);
    return applyTemplateData(html, data, template.folderPath, (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$invitation$2d$data$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["buildInvitationTemplateData"])(invitation));
}
async function renderInvitationFromSource({ html, folderPath, invitation, guest = null, guestHasRsvp = false }) {
    const data = buildData(invitation, guest, {
        folderPath
    }, guestHasRsvp);
    return applyTemplateData(String(html || ''), data, folderPath, (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$invitation$2d$data$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["buildInvitationTemplateData"])(invitation));
}
function fmtDate(dt) {
    if (!dt) return '';
    const d = new Date(dt);
    if (isNaN(d)) return '';
    return d.toLocaleDateString('en-US', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
}
function isoDate(dt) {
    if (!dt) return '';
    const d = new Date(dt);
    if (isNaN(d)) return '';
    return d.toISOString();
}
function buildData(inv, guest, template, guestHasRsvp) {
    const countdownHTML = `
    <div class="countdown-box">
      <div class="cd-item"><div class="num" data-cd="days">00</div><div class="lbl">Days</div></div>
      <div class="cd-item"><div class="num" data-cd="hours">00</div><div class="lbl">Hours</div></div>
      <div class="cd-item"><div class="num" data-cd="minutes">00</div><div class="lbl">Minutes</div></div>
      <div class="cd-item"><div class="num" data-cd="seconds">00</div><div class="lbl">Seconds</div></div>
    </div>
  `;
    const gallery = (inv.gallery || []).slice().sort((a, b)=>a.order - b.order);
    const galleryHTML = gallery.length ? `<div class="gallery-grid">${gallery.map((g)=>`<img src="${escapeAttr(g.url)}" alt="${escapeAttr(g.caption || 'Gallery')}" loading="lazy" />`).join('')}</div>` : '<p style="color:#8b7355;font-style:italic">Gallery photos coming soon.</p>';
    const videoHTML = (inv.videos || []).map((v)=>{
        if (v.type === 'YOUTUBE') {
            const id = extractYouTubeId(v.url);
            return id ? `<div class="video-wrap"><iframe src="https://www.youtube.com/embed/${id}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>` : '';
        }
        if (v.type === 'VIMEO') {
            const id = extractVimeoId(v.url);
            return id ? `<div class="video-wrap"><iframe src="https://player.vimeo.com/video/${id}" allow="autoplay; fullscreen" allowfullscreen></iframe></div>` : '';
        }
        return `<div class="video-wrap"><video src="${escapeAttr(v.url)}" controls playsinline></video></div>`;
    }).join('') || '';
    const music = inv.music;
    const musicHTML = music && music.url ? `<audio id="bg-music" src="${escapeAttr(music.url)}" ${music.autoplay ? 'autoplay' : ''} loop preload="auto"></audio><button id="music-btn" class="music-btn playing" onclick="toggleMusic()" aria-label="Toggle music">♫</button>` : '';
    const events = Array.isArray(inv.events) ? inv.events : [];
    const firstEvent = events[0] || {};
    const evtDate = firstEvent.date || '';
    const evtTime = firstEvent.time || '';
    const evtVenue = firstEvent.venue || '';
    const evtAddress = firstEvent.address || '';
    const evtMapUrl = firstEvent.mapUrl || '';
    const evtIso = evtDate ? evtTime ? `${evtDate}T${evtTime}` : evtDate : '';
    const stories = Array.isArray(inv.loveStory) ? inv.loveStory : [];
    const loveStoryHTML = stories.length ? stories.map((s)=>`<div class="story-item" style="margin-bottom:18px">${s.date ? `<div class="story-date" style="font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#8b7355">${escapeHtmlText(s.date)}</div>` : ''}${s.title ? `<h3 class="story-title" style="margin:2px 0 6px">${escapeHtmlText(s.title)}</h3>` : ''}${s.story ? `<p class="story-text" style="margin:0">${nl2br(escapeHtmlText(s.story))}</p>` : ''}</div>`).join('') : 'Our beautiful journey begins here...';
    let mapHTML = '';
    if (evtMapUrl) {
        mapHTML = `<a href="${escapeAttr(evtMapUrl)}" target="_blank" rel="noopener" class="btn">Open in Google Maps</a>`;
    }
    // Determine RSVP mode behaviour:
    // - QR_FIRST (default): show QR immediately for guest links; RSVP is separate.
    // - RSVP_FIRST: hide QR until the guest submits an RSVP; RSVP form reloads to reveal QR.
    const rsvpEnabled = inv.rsvpEnabled !== false; // Phase 2 — independent toggles
    const messageEnabled = inv.messageEnabled !== false;
    const rsvpMode = inv.rsvpMode || 'QR_FIRST';
    // If RSVP is OFF, QR is not gated behind RSVP submission (treat as QR_FIRST).
    const effectiveMode = rsvpEnabled ? rsvpMode : 'QR_FIRST';
    const showQR = !!guest && (effectiveMode === 'QR_FIRST' || guestHasRsvp);
    const showRsvpForm = rsvpEnabled && (!guest || guest.guestType === 'GROUP' || !guestHasRsvp); // INDIVIDUAL who already RSVPed hides the form
    // Group-guest hint
    const rsvpBadge = guest ? `<div style="display:inline-block;margin-bottom:8px;padding:4px 12px;border-radius:999px;background:rgba(139,111,71,0.12);color:#5a4530;font-size:12px;letter-spacing:1px;text-transform:uppercase">${guest.guestType === 'GROUP' ? 'Group Guest' : 'Individual Guest'}</div>` : '';
    const rsvpAction = `${BASE_URL}/api/rsvp`;
    const isIndividualGuest = guest && guest.guestType === 'INDIVIDUAL';
    const isGroupGuest = guest && guest.guestType === 'GROUP';
    // Feature H — render owner-configured custom RSVP fields (names prefixed cf_<key>).
    const rsvpFields = (Array.isArray(inv.rsvpFields) ? inv.rsvpFields : []).filter((f)=>f.enabled !== false).slice().sort((a, b)=>(a.order || 0) - (b.order || 0));
    const cfStyle = 'padding:12px 14px;border:1px solid rgba(139,111,71,0.25);border-radius:8px;font-family:inherit;font-size:15px;background:#fff';
    const customFieldsHTML = rsvpFields.map((f)=>{
        const name = 'cf_' + f.fieldKey;
        const req = f.required ? 'required' : '';
        const label = `<label style="font-size:12px;color:#5a4530;letter-spacing:.5px">${escapeHtmlText(f.label)}${f.required ? ' *' : ''}</label>`;
        const ph = escapeAttr(f.placeholder || '');
        const opts = Array.isArray(f.options) ? f.options : [];
        if (f.type === 'textarea') return `${label}<textarea name="${name}" ${req} placeholder="${ph}" rows="3" style="${cfStyle};resize:vertical"></textarea>`;
        if (f.type === 'select') return `${label}<select name="${name}" ${req} style="${cfStyle}"><option value="">Select…</option>${opts.map((o)=>`<option value="${escapeAttr(o)}">${escapeHtmlText(o)}</option>`).join('')}</select>`;
        if (f.type === 'radio') return `${label}<div style="display:flex;gap:12px;flex-wrap:wrap">${opts.map((o)=>`<label style="display:flex;gap:4px;align-items:center;font-size:14px"><input type="radio" name="${name}" value="${escapeAttr(o)}" ${req} />${escapeHtmlText(o)}</label>`).join('')}</div>`;
        if (f.type === 'checkbox') return `${label}<div style="display:flex;gap:12px;flex-wrap:wrap">${opts.map((o)=>`<label style="display:flex;gap:4px;align-items:center;font-size:14px"><input type="checkbox" name="${name}" value="${escapeAttr(o)}" />${escapeHtmlText(o)}</label>`).join('')}</div>`;
        const inputType = f.type === 'email' ? 'email' : f.type === 'number' ? 'number' : f.type === 'phone' ? 'tel' : 'text';
        return `${label}<input type="${inputType}" name="${name}" ${req} placeholder="${ph}" style="${cfStyle}" />`;
    }).join('');
    // For known guest: pre-lock RSVP type & count fields
    const rsvpFormHTML = showRsvpForm ? `
    ${rsvpBadge}
    <form class="rsvp-wrap" onsubmit="return submitRSVP(event, this)" style="display:grid;gap:12px;max-width:400px;margin:0 auto">
      <input type="hidden" name="invitationId" value="${inv.id}" />
      ${guest ? `<input type="hidden" name="guestId" value="${guest.id}" /><input type="hidden" name="guestToken" value="${guest.token}" />` : ''}
      <input required name="name" placeholder="Your Name" value="${escapeAttr(guest?.name || '')}" style="padding:12px 14px;border:1px solid rgba(139,111,71,0.25);border-radius:8px;font-family:inherit;font-size:15px;background:#fff" />
      <select name="attendance" required style="padding:12px 14px;border:1px solid rgba(139,111,71,0.25);border-radius:8px;font-family:inherit;font-size:15px;background:#fff">
        <option value="ATTENDING">Yes, I will attend</option>
        <option value="NOT_ATTENDING">Sorry, cannot attend</option>
        <option value="MAYBE">Maybe</option>
      </select>
      ${isIndividualGuest ? guest.quota > 1 ? `<input type="hidden" name="rsvpType" value="INDIVIDUAL" /><label style="font-size:12px;color:#5a4530;letter-spacing:1px;text-transform:uppercase">Number of Attendees (max ${guest.quota})</label><input type="number" name="guestCount" min="1" max="${guest.quota}" value="1" required style="padding:12px 14px;border:1px solid rgba(139,111,71,0.25);border-radius:8px;font-family:inherit;font-size:15px;background:#fff" /><p style="font-size:12px;color:#8b7355;margin:-4px 0 0">Individual RSVP — you can bring up to ${guest.quota} attendees.</p>` : `<input type="hidden" name="rsvpType" value="INDIVIDUAL" /><input type="hidden" name="guestCount" value="1" /><p style="font-size:12px;color:#8b7355;margin:-4px 0 0">Individual RSVP — 1 person</p>` : isGroupGuest ? `<input type="hidden" name="rsvpType" value="GROUP" /><input type="number" name="guestCount" min="1" max="50" value="2" placeholder="Number of guests" required style="padding:12px 14px;border:1px solid rgba(139,111,71,0.25);border-radius:8px;font-family:inherit;font-size:15px;background:#fff" /><p style="font-size:12px;color:#8b7355;margin:-4px 0 0">Group RSVP — you can submit multiple times if plans change.</p>` : `<select name="rsvpType" required onchange="document.getElementById('guestCountWrap').style.display=this.value==='GROUP'?'block':'none'" style="padding:12px 14px;border:1px solid rgba(139,111,71,0.25);border-radius:8px;font-family:inherit;font-size:15px;background:#fff"><option value="INDIVIDUAL">Attending Individually</option><option value="GROUP">Attending as Group (with family/partner)</option></select><div id="guestCountWrap" style="display:none"><input type="number" name="guestCount" min="2" max="20" value="2" placeholder="Number of guests" style="width:100%;padding:12px 14px;border:1px solid rgba(139,111,71,0.25);border-radius:8px;font-family:inherit;font-size:15px;background:#fff" /></div>`}
      ${customFieldsHTML}
      <button type="submit" class="btn" style="border:0;cursor:pointer">Send RSVP</button>
      <div id="rsvpMsg" style="font-size:13px;color:#4a3520;margin-top:4px"></div>
    </form>
    <script>
      window.submitRSVP = async function(e, form) {
        e.preventDefault();
        const fd = new FormData(form);
        const payload = Object.fromEntries(fd);
        if (payload.rsvpType === 'INDIVIDUAL') payload.guestCount = 1;
        payload.guestCount = parseInt(payload.guestCount || '1', 10) || 1;
        try {
          const res = await fetch('${rsvpAction}', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
          const data = await res.json();
          const msg = document.getElementById('rsvpMsg');
          if (data.ok) {
            msg.style.color = '#2d6a4f'; msg.textContent = 'Thank you for your RSVP!'; form.reset();
            // If RSVP_FIRST mode, reload to reveal QR
            if ('${rsvpMode}' === 'RSVP_FIRST') setTimeout(() => location.reload(), 900);
          } else {
            msg.style.color = '#a83232'; msg.textContent = data.error || 'Failed to submit. Try again.';
          }
        } catch (err) { document.getElementById('rsvpMsg').textContent = 'Network error, please try again.'; }
        return false;
      };
    <\/script>
  ` : `
    ${rsvpBadge}
    <div style="padding:24px;border:1px solid rgba(139,111,71,0.15);border-radius:12px;background:rgba(212,165,116,0.08);color:#4a3520;max-width:400px;margin:0 auto">
      <p style="font-family:'Playfair Display',serif;font-size:18px;margin:0 0 6px">Thank you — your RSVP has been received.</p>
      <p style="font-size:13px;margin:0;color:#8b7355">Your QR code is ready below for venue check-in.</p>
    </div>
  `;
    // QR Code: only if guest known AND (QR_FIRST or already RSVPed)
    let qrHTML = '';
    if (guest) {
        if (showQR) {
            // QR keeps the token so the existing venue check-in scanner (?guest=) is unaffected.
            const url = `${BASE_URL}/invite/${inv.slug}?guest=${guest.token}`;
            const dataUrl = generateQRDataURLSync(url);
            qrHTML = `<h2 class="section-title">Your Guest QR</h2><div class="divider"></div><div class="qr-wrap"><img src="${dataUrl}" alt="Guest QR Code" /><p>Show this QR at the venue for check-in</p><p style="font-family:monospace;letter-spacing:1px;font-size:11px">Token: ${guest.token}</p>${guest.guestType === 'GROUP' ? '<p style="font-size:12px;color:#8b7355;margin-top:6px">Group QR — can be scanned multiple times.</p>' : ''}</div>`;
        } else if (rsvpMode === 'RSVP_FIRST') {
            qrHTML = `<div style="padding:20px;border:1px dashed rgba(139,111,71,0.3);border-radius:12px;color:#8b7355;font-size:13px;max-width:340px;margin:0 auto">Your QR code will appear here once you have submitted your RSVP above.</div>`;
        }
    }
    // Phase 2 — standalone MESSAGE form (independent from RSVP) + public GIFT form.
    const fieldStyle = 'padding:12px 14px;border:1px solid rgba(139,111,71,0.25);border-radius:8px;font-family:inherit;font-size:15px;background:#fff';
    const guestHidden = guest ? `<input type="hidden" name="guestId" value="${guest.id}" /><input type="hidden" name="guestToken" value="${guest.token}" />` : '';
    const messageFormHTML = messageEnabled ? `
    <form onsubmit="return submitMessage(event, this)" style="display:grid;gap:12px;max-width:400px;margin:0 auto">
      <input type="hidden" name="invitationId" value="${inv.id}" />
      ${guestHidden}
      <input required name="name" placeholder="Your Name" value="${escapeAttr(guest?.name || '')}" style="${fieldStyle}" />
      <textarea required name="message" rows="3" placeholder="Write your wishes for the couple" style="${fieldStyle};resize:vertical"></textarea>
      <button type="submit" class="btn" style="border:0;cursor:pointer">Send Message</button>
      <div id="msgResult" style="font-size:13px;color:#4a3520;margin-top:4px"></div>
    </form>
    <script>
      window.submitMessage = async function(e, form) {
        e.preventDefault();
        const payload = Object.fromEntries(new FormData(form));
        payload.messageOnly = true;
        try {
          const res = await fetch('${rsvpAction}', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
          const data = await res.json();
          const el = document.getElementById('msgResult');
          if (data.ok) { el.style.color = '#2d6a4f'; el.textContent = 'Thank you for your message!'; form.reset(); }
          else { el.style.color = '#a83232'; el.textContent = data.error || 'Failed to send.'; }
        } catch (err) { document.getElementById('msgResult').textContent = 'Network error, please try again.'; }
        return false;
      };
    <\/script>
  ` : '';
    const giftAction = `${BASE_URL}/api/public/gift/${inv.slug}`;
    const giftFormHTML = `
    <form onsubmit="return submitGift(event, this)" style="display:grid;gap:12px;max-width:400px;margin:0 auto">
      <input type="hidden" name="action" value="money" />
      <input name="giverName" placeholder="Your Name" value="${escapeAttr(guest?.name || '')}" style="${fieldStyle}" />
      <input type="number" name="amount" placeholder="Amount (optional)" style="${fieldStyle}" />
      <textarea name="note" rows="2" placeholder="Message (optional)" style="${fieldStyle};resize:vertical"></textarea>
      <button type="submit" class="btn" style="border:0;cursor:pointer">Send Gift</button>
      <div id="giftResult" style="font-size:13px;color:#4a3520;margin-top:4px"></div>
    </form>
    <script>
      window.submitGift = async function(e, form) {
        e.preventDefault();
        try {
          const res = await fetch('${giftAction}', { method: 'POST', body: new FormData(form) });
          const data = await res.json();
          const el = document.getElementById('giftResult');
          if (data.ok) { el.style.color = '#2d6a4f'; el.textContent = 'Thank you for your gift!'; form.reset(); }
          else { el.style.color = '#a83232'; el.textContent = data.error || 'Failed to send.'; }
        } catch (err) { document.getElementById('giftResult').textContent = 'Network error, please try again.'; }
        return false;
      };
    <\/script>
  `;
    return {
        BRIDE_NAME: inv.brideName || 'Bride',
        GROOM_NAME: inv.groomName || 'Groom',
        // Req 6 — derive combined parents from father/mother (legacy brideParents/groomParents no longer used).
        BRIDE_PARENTS: nl2br([
            inv.brideFather,
            inv.brideMother
        ].filter(Boolean).join(' & ')),
        GROOM_PARENTS: nl2br([
            inv.groomFather,
            inv.groomMother
        ].filter(Boolean).join(' & ')),
        GROOM_FATHER: escapeHtmlText(inv.groomFather),
        GROOM_MOTHER: escapeHtmlText(inv.groomMother),
        BRIDE_FATHER: escapeHtmlText(inv.brideFather),
        BRIDE_MOTHER: escapeHtmlText(inv.brideMother),
        WEDDING_DATE: fmtDate(evtDate),
        WEDDING_ISO: isoDate(evtIso),
        WEDDING_TIME: evtTime,
        VENUE: evtVenue,
        ADDRESS: evtAddress,
        MAP: mapHTML,
        MAP_URL: evtMapUrl,
        QUOTE: inv.quote || 'And of His signs is that He created for you from yourselves mates that you may find tranquility in them.',
        LOVE_STORY: loveStoryHTML,
        COVER_IMAGE: inv.coverImage || 'https://images.unsplash.com/photo-1519741497674-611481863552?w=1200',
        GALLERY: galleryHTML,
        VIDEO: videoHTML || '<p style="color:#8b7355;font-style:italic">Video coming soon.</p>',
        MUSIC: musicHTML,
        COUNTDOWN: countdownHTML,
        RSVP_FORM: rsvpEnabled ? `<section class="section bg reveal"><h2 class="section-title">RSVP</h2><p class="subtitle">Kindly confirm your attendance</p><div class="divider"></div>${rsvpFormHTML}</section>` : '',
        MESSAGE_FORM: messageEnabled ? `<section class="section reveal"><h2 class="section-title">Messages &amp; Wishes</h2><p class="subtitle">Send your best wishes to the couple</p><div class="divider"></div>${messageFormHTML}</section>` : '',
        GIFT_FORM: `<section class="section bg reveal"><h2 class="section-title">Wedding Gift</h2><p class="subtitle">Your blessing means the world to us</p><div class="divider"></div>${giftFormHTML}</section>`,
        QR_CODE: qrHTML,
        GUEST_NAME: guest?.name || 'Beloved Guest',
        PRIMARY_COLOR: inv.primaryColor || '#8B6F47',
        SECONDARY_COLOR: inv.secondaryColor || '#D4A574',
        BACKGROUND_COLOR: inv.backgroundColor || '#FAF7F2',
        FONT_FAMILY: inv.fontFamily || 'Playfair Display',
        BORDER_RADIUS: inv.borderRadius || '12'
    };
}
function escapeAttr(s) {
    return String(s || '').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}
function escapeHtmlText(s) {
    return escapeHtml(s);
}
function nl2br(s) {
    return String(s || '').replace(/\n/g, '<br />');
}
function extractYouTubeId(url) {
    const m = String(url || '').match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/))([\w-]{11})/);
    return m ? m[1] : null;
}
function extractVimeoId(url) {
    const m = String(url || '').match(/vimeo\.com\/(?:video\/)?(\d+)/);
    return m ? m[1] : null;
}
function generateQRDataURLSync(url) {
    return '__QR_PLACEHOLDER__' + Buffer.from(url).toString('base64url');
}
async function resolveQRPlaceholders(html) {
    const matches = [
        ...html.matchAll(/__QR_PLACEHOLDER__([A-Za-z0-9_-]+)/g)
    ];
    for (const m of matches){
        const decoded = Buffer.from(m[1], 'base64url').toString('utf8');
        const dataUrl = await __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$qrcode$2f$lib$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"].toDataURL(decoded, {
            width: 400,
            margin: 2,
            color: {
                dark: '#2a1f14',
                light: '#ffffff'
            }
        });
        html = html.replace(m[0], dataUrl);
    }
    return html;
}
async function renderInvitationAsync({ template, invitation, guest = null, guestHasRsvp = false }) {
    const html = await renderInvitation({
        template,
        invitation,
        guest,
        guestHasRsvp
    });
    return resolveQRPlaceholders(html);
}
async function renderInvitationFromSourceAsync({ html, folderPath, invitation, guest = null, guestHasRsvp = false }) {
    const rendered = await renderInvitationFromSource({
        html,
        folderPath,
        invitation,
        guest,
        guestHasRsvp
    });
    return resolveQRPlaceholders(rendered);
}
}),
"[project]/app/invite/[slug]/page.js [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>PublicInvitationPage,
    "dynamic",
    ()=>dynamic
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-jsx-dev-runtime.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$api$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/next/dist/api/navigation.react-server.js [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/components/navigation.react-server.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/prisma.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$template$2d$engine$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/template-engine.js [app-rsc] (ecmascript)");
;
;
;
;
const dynamic = 'force-dynamic';
async function PublicInvitationPage({ params, searchParams }) {
    const p = await params;
    const sp = await searchParams;
    const slug = p.slug;
    const guestToken = sp?.guest;
    const guestNameSlug = sp?.to;
    const invitation = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"].invitation.findUnique({
        where: {
            slug
        },
        include: {
            template: true,
            gallery: {
                orderBy: {
                    order: 'asc'
                }
            },
            videos: true,
            music: true,
            guests: {
                orderBy: {
                    createdAt: 'asc'
                }
            },
            rsvps: {
                orderBy: {
                    createdAt: 'asc'
                }
            },
            moments: {
                orderBy: {
                    createdAt: 'asc'
                }
            },
            gifts: {
                orderBy: {
                    order: 'asc'
                }
            },
            rsvpFields: {
                where: {
                    enabled: true
                },
                orderBy: {
                    order: 'asc'
                }
            }
        }
    });
    if (!invitation) (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["notFound"])();
    if (invitation.status !== 'PUBLISHED' && sp?.preview !== '1') {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            style: {
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'serif',
                color: '#8b6f47',
                background: '#faf7f2',
                textAlign: 'center',
                padding: 40
            },
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                        style: {
                            fontSize: 40,
                            marginBottom: 12
                        },
                        children: "Invitation Not Published"
                    }, void 0, false, {
                        fileName: "[project]/app/invite/[slug]/page.js",
                        lineNumber: 34,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        children: "This invitation is still being prepared. Please check back later."
                    }, void 0, false, {
                        fileName: "[project]/app/invite/[slug]/page.js",
                        lineNumber: 35,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app/invite/[slug]/page.js",
                lineNumber: 33,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/app/invite/[slug]/page.js",
            lineNumber: 32,
            columnNumber: 7
        }, this);
    }
    if (!invitation.template) {
        const fallback = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"].template.findUnique({
            where: {
                slug: 'elegant-brown'
            }
        });
        if (fallback) invitation.template = fallback;
        else (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["notFound"])();
    }
    let guest = null;
    let guestHasRsvp = false;
    if (guestNameSlug || guestToken) {
        guest = guestNameSlug ? await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"].guest.findFirst({
            where: {
                nameSlug: guestNameSlug,
                invitationId: invitation.id
            }
        }) : await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"].guest.findFirst({
            where: {
                token: guestToken,
                invitationId: invitation.id
            }
        });
        if (guest) {
            const existing = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"].rsvp.findFirst({
                where: {
                    guestId: guest.id,
                    invitationId: invitation.id,
                    isMessageOnly: false
                },
                select: {
                    id: true
                }
            });
            guestHasRsvp = !!existing;
        }
    }
    const html = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$template$2d$engine$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["renderInvitationAsync"])({
        template: invitation.template,
        invitation,
        guest,
        guestHasRsvp
    });
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        dangerouslySetInnerHTML: {
            __html: html
        }
    }, void 0, false, {
        fileName: "[project]/app/invite/[slug]/page.js",
        lineNumber: 60,
        columnNumber: 10
    }, this);
}
}),
"[project]/app/invite/[slug]/page.js [app-rsc] (ecmascript, Next.js Server Component)", ((__turbopack_context__) => {

__turbopack_context__.n(__turbopack_context__.i("[project]/app/invite/[slug]/page.js [app-rsc] (ecmascript)"));
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__c616c468._.js.map