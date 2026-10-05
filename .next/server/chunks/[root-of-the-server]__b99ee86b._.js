module.exports = [
"[project]/.next-internal/server/app/api/tv/[id]/stream/route/actions.js [app-rsc] (server actions loader, ecmascript)", ((__turbopack_context__, module, exports) => {

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
"[externals]/@prisma/client [external] (@prisma/client, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("@prisma/client", () => require("@prisma/client"));

module.exports = mod;
}),
"[project]/lib/prisma.js [app-route] (ecmascript)", ((__turbopack_context__) => {
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
"[project]/lib/broadcast.js [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// Simple in-memory pub/sub for Server-Sent Events (SSE)
// One channel per invitation.id. Not clustered — fine for single-instance deployment.
//
// Disimpan di globalThis supaya semua route (stream & check-in) memakai
// Map yang sama, walaupun modul ini dimuat ulang / terduplikasi oleh Next.js.
__turbopack_context__.s([
    "channelSize",
    ()=>channelSize,
    "publish",
    ()=>publish,
    "subscribe",
    ()=>subscribe
]);
const g = globalThis;
const channels = g.__tvChannels || (g.__tvChannels = new Map()); // invitationId -> Set of writer functions
function subscribe(invitationId, write) {
    let set = channels.get(invitationId);
    if (!set) {
        set = new Set();
        channels.set(invitationId, set);
    }
    set.add(write);
    return ()=>{
        set.delete(write);
        if (set.size === 0) channels.delete(invitationId);
    };
}
function publish(invitationId, eventType, payload) {
    const set = channels.get(invitationId);
    if (!set || set.size === 0) return;
    const data = `event: ${eventType}\ndata: ${JSON.stringify(payload)}\n\n`;
    for (const w of set){
        try {
            w(data);
        } catch  {}
    }
}
function channelSize(invitationId) {
    return channels.get(invitationId)?.size || 0;
}
}),
"[project]/app/api/tv/[id]/stream/route.js [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// SSE stream for Greeting TV
__turbopack_context__.s([
    "GET",
    ()=>GET,
    "dynamic",
    ()=>dynamic,
    "runtime",
    ()=>runtime
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/prisma.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$broadcast$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/broadcast.js [app-route] (ecmascript)");
;
;
const runtime = 'nodejs';
const dynamic = 'force-dynamic';
async function GET(request, { params }) {
    const p = await params;
    const inv = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"].invitation.findUnique({
        where: {
            id: p.id
        },
        select: {
            id: true,
            tvEnabled: true
        }
    });
    if (!inv) return new Response('Not found', {
        status: 404
    });
    const stream = new ReadableStream({
        start (controller) {
            const encoder = new TextEncoder();
            const write = (chunk)=>{
                try {
                    controller.enqueue(encoder.encode(chunk));
                } catch  {}
            };
            write(`event: hello\ndata: {"ok":true}\n\n`);
            const unsub = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$broadcast$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["subscribe"])(inv.id, write);
            // Heartbeat every 25s so proxies do not close the connection
            const hb = setInterval(()=>write(`: ping\n\n`), 25000);
            // Cleanup on client disconnect
            const signal = request.signal;
            const cleanup = ()=>{
                clearInterval(hb);
                unsub();
                try {
                    controller.close();
                } catch  {}
            };
            if (signal) signal.addEventListener('abort', cleanup);
        }
    });
    return new Response(stream, {
        status: 200,
        headers: {
            'Content-Type': 'text/event-stream; charset=utf-8',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no'
        }
    });
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__b99ee86b._.js.map