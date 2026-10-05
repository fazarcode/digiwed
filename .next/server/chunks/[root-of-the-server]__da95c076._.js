module.exports = [
"[project]/.next-internal/server/app/api/link-preview/route/actions.js [app-rsc] (server actions loader, ecmascript)", ((__turbopack_context__, module, exports) => {

}),
"[externals]/next/dist/compiled/next-server/app-route-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-route-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/@opentelemetry/api [external] (next/dist/compiled/@opentelemetry/api, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/@opentelemetry/api", () => require("next/dist/compiled/@opentelemetry/api"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/after-task-async-storage.external.js [external] (next/dist/server/app-render/after-task-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/after-task-async-storage.external.js", () => require("next/dist/server/app-render/after-task-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/action-async-storage.external.js [external] (next/dist/server/app-render/action-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/action-async-storage.external.js", () => require("next/dist/server/app-render/action-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/node:dns/promises [external] (node:dns/promises, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:dns/promises", () => require("node:dns/promises"));

module.exports = mod;
}),
"[externals]/node:net [external] (node:net, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:net", () => require("node:net"));

module.exports = mod;
}),
"[project]/app/api/link-preview/route.js [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// GET /api/link-preview?url=<link produk>
// Membaca halaman marketplace di sisi server dan mengembalikan gambar produk
// (og:image / twitter:image / JSON-LD Product) + judul.
//
// Lokasi file: app/api/link-preview/route.js
__turbopack_context__.s([
    "GET",
    ()=>GET,
    "dynamic",
    ()=>dynamic,
    "runtime",
    ()=>runtime
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$dns$2f$promises__$5b$external$5d$__$28$node$3a$dns$2f$promises$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/node:dns/promises [external] (node:dns/promises, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$net__$5b$external$5d$__$28$node$3a$net$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/node:net [external] (node:net, cjs)");
;
;
;
const runtime = "nodejs";
const dynamic = "force-dynamic";
const MAX_REDIRECTS = 5;
const MAX_BYTES = 1024 * 1024; // baca maksimal 1MB HTML
const TIMEOUT_MS = 8000;
const USER_AGENT = "Mozilla/5.0 (compatible; LinkPreviewBot/1.0)";
class PreviewError extends Error {
}
// ---------------------------------------------------------------------------
// Proteksi SSRF: tolak alamat internal (localhost, jaringan privat, metadata
// cloud 169.254.x.x, dst) di setiap langkah, termasuk setiap redirect.
// Catatan: pengecekan DNS ini dilakukan sebelum fetch; untuk perlindungan
// penuh dari DNS rebinding, IP hasil lookup perlu di-pin ke koneksi fetch.
// ---------------------------------------------------------------------------
function isPrivateIp(ip) {
    if (__TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$net__$5b$external$5d$__$28$node$3a$net$2c$__cjs$29$__["default"].isIPv4(ip)) {
        const [a, b] = ip.split(".").map(Number);
        return a === 0 || a === 10 || a === 127 || a === 100 && b >= 64 && b <= 127 || a === 169 && b === 254 || a === 172 && b >= 16 && b <= 31 || a === 192 && b === 168 || a >= 224;
    }
    if (__TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$net__$5b$external$5d$__$28$node$3a$net$2c$__cjs$29$__["default"].isIPv6(ip)) {
        const v = ip.toLowerCase();
        if (v === "::1" || v === "::") return true;
        if (v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80")) return true;
        if (v.startsWith("::ffff:")) {
            const rest = v.slice(7);
            return __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$net__$5b$external$5d$__$28$node$3a$net$2c$__cjs$29$__["default"].isIPv4(rest) ? isPrivateIp(rest) : true; // bentuk hex: blokir demi keamanan
        }
        return false;
    }
    return true;
}
async function assertPublicHost(hostname) {
    const host = hostname.replace(/^\[|\]$/g, "");
    if (__TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$net__$5b$external$5d$__$28$node$3a$net$2c$__cjs$29$__["default"].isIP(host)) {
        if (isPrivateIp(host)) throw new PreviewError("Alamat link tidak diizinkan");
        return;
    }
    let addrs;
    try {
        addrs = await __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$dns$2f$promises__$5b$external$5d$__$28$node$3a$dns$2f$promises$2c$__cjs$29$__["default"].lookup(host, {
            all: true
        });
    } catch  {
        throw new PreviewError("Alamat link tidak ditemukan");
    }
    if (!addrs.length || addrs.some((a)=>isPrivateIp(a.address))) {
        throw new PreviewError("Alamat link tidak diizinkan");
    }
}
async function readCapped(res) {
    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let html = "";
    let total = 0;
    for(;;){
        const { done, value } = await reader.read();
        if (done) break;
        total += value.length;
        html += decoder.decode(value, {
            stream: true
        });
        if (total >= MAX_BYTES) {
            await reader.cancel().catch(()=>{});
            break;
        }
    }
    return html;
}
async function fetchHtml(startUrl) {
    let current = startUrl;
    for(let hop = 0; hop <= MAX_REDIRECTS; hop++){
        const u = new URL(current);
        if (!/^https?:$/.test(u.protocol)) throw new PreviewError("Jenis link tidak didukung");
        await assertPublicHost(u.hostname);
        const res = await fetch(u.href, {
            redirect: "manual",
            signal: AbortSignal.timeout(TIMEOUT_MS),
            headers: {
                "User-Agent": USER_AGENT,
                Accept: "text/html,application/xhtml+xml",
                "Accept-Language": "id-ID,id;q=0.9,en;q=0.8"
            }
        });
        const location = res.headers.get("location");
        if (res.status >= 300 && res.status < 400 && location) {
            current = new URL(location, u).href; // link pendek (shp.ee, tokopedia.link) berhenti di sini lalu diikuti
            continue;
        }
        if (!res.ok) throw new PreviewError(`Situs merespons dengan status ${res.status}`);
        const type = res.headers.get("content-type") || "";
        if (!/text\/html|application\/xhtml/i.test(type)) throw new PreviewError("Link bukan halaman web");
        return {
            html: await readCapped(res),
            finalUrl: u.href
        };
    }
    throw new PreviewError("Terlalu banyak pengalihan (redirect)");
}
// ---------------------------------------------------------------------------
// Parsing HTML
// ---------------------------------------------------------------------------
function codePoint(n) {
    return Number.isFinite(n) && n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : "";
}
function decodeEntities(s) {
    return s.replace(/&#x([0-9a-f]+);/gi, (_, h)=>codePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, d)=>codePoint(parseInt(d, 10))).replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
}
function getAttr(tag, name) {
    const m = tag.match(new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, "i"));
    return m ? m[1] ?? m[2] ?? "" : null;
}
function parseMeta(html) {
    const out = {};
    for (const tag of html.match(/<meta\s[^>]*>/gi) || []){
        const key = (getAttr(tag, "property") || getAttr(tag, "name") || "").toLowerCase();
        const content = getAttr(tag, "content");
        if (key && content && !out[key]) out[key] = decodeEntities(content.trim());
    }
    return out;
}
function pickProductImage(node) {
    if (!node) return null;
    if (Array.isArray(node)) {
        for (const n of node){
            const r = pickProductImage(n);
            if (r) return r;
        }
        return null;
    }
    if (typeof node !== "object") return null;
    const type = [].concat(node["@type"] || []).join(",");
    if (/Product/i.test(type) && node.image) {
        const img = Array.isArray(node.image) ? node.image[0] : node.image;
        return typeof img === "string" ? img : img?.url || null;
    }
    return node["@graph"] ? pickProductImage(node["@graph"]) : null;
}
function jsonLdImage(html) {
    const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let m;
    while(m = re.exec(html)){
        try {
            const found = pickProductImage(JSON.parse(m[1]));
            if (found) return found;
        } catch  {
        /* JSON-LD tidak valid, lewati */ }
    }
    return null;
}
async function GET(req) {
    // TODO (WAJIB): samakan dengan proteksi login yang dipakai route /api/upload,
    // supaya endpoint ini tidak bisa dipakai orang lain sebagai "pembuka URL".
    // const session = await getSession();
    // if (!session) return NextResponse.json({ ok: false, error: 'Tidak diizinkan' }, { status: 401 });
    const raw = new URL(req.url).searchParams.get("url") || "";
    let target;
    try {
        target = new URL(raw);
    } catch  {
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            ok: false,
            error: "Link tidak valid"
        }, {
            status: 400
        });
    }
    if (!/^https?:$/.test(target.protocol)) {
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            ok: false,
            error: "Link harus diawali http:// atau https://"
        }, {
            status: 400
        });
    }
    try {
        const { html, finalUrl } = await fetchHtml(target.href);
        const meta = parseMeta(html);
        let image = meta["og:image:secure_url"] || meta["og:image"] || meta["twitter:image"] || meta["twitter:image:src"] || jsonLdImage(html) || null;
        if (image) {
            try {
                const abs = new URL(image, finalUrl);
                image = /^https?:$/.test(abs.protocol) ? abs.href : null;
            } catch  {
                image = null;
            }
        }
        const titleTag = html.match(/<title[^>]*>([^<]*)<\/title>/i);
        const title = meta["og:title"] || meta["twitter:title"] || (titleTag ? decodeEntities(titleTag[1].trim()) : "");
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            ok: true,
            image,
            title,
            siteName: meta["og:site_name"] || new URL(finalUrl).hostname,
            url: finalUrl
        });
    } catch (e) {
        let message = "Tidak bisa membuka link";
        if (e instanceof PreviewError) message = e.message;
        else if (e?.name === "TimeoutError" || e?.name === "AbortError") message = "Waktu habis saat membuka link";
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            ok: false,
            error: message
        }, {
            status: 422
        });
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__da95c076._.js.map