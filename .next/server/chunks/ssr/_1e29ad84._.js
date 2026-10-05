module.exports = [
"[project]/hooks/use-connection-status.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useConnectionStatus",
    ()=>useConnectionStatus
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
"use client";
;
function useConnectionStatus({ url = "/api/health", intervalMs = 5000, recoverIntervalMs = 2000, timeoutMs = 5000, slowMs = 4000, failThreshold = 2 } = {}) {
    const [status, setStatus] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])({
        isOnline: true,
        reason: null
    });
    const fails = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(0);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        let stopped = false;
        let timer;
        const markBad = (reason)=>{
            fails.current += 1;
            if (fails.current >= failThreshold) {
                setStatus((s)=>!s.isOnline && s.reason === reason ? s : {
                        isOnline: false,
                        reason
                    });
            }
        };
        const markGood = ()=>{
            fails.current = 0;
            setStatus((s)=>s.isOnline ? s : {
                    isOnline: true,
                    reason: null
                });
        };
        const schedule = (ms)=>{
            if (stopped) return;
            clearTimeout(timer);
            timer = setTimeout(check, ms);
        };
        async function check() {
            if (typeof navigator !== "undefined" && navigator.onLine === false) {
                fails.current = failThreshold;
                setStatus({
                    isOnline: false,
                    reason: "offline"
                });
                return schedule(recoverIntervalMs);
            }
            const ctrl = new AbortController();
            const abortTimer = setTimeout(()=>ctrl.abort(), timeoutMs);
            const start = Date.now();
            try {
                const res = await fetch(`${url}?t=${start}`, {
                    cache: "no-store",
                    signal: ctrl.signal
                });
                const ms = Date.now() - start;
                if (!res.ok) markBad("offline");
                else if (ms > slowMs) markBad("slow");
                else markGood();
            } catch  {
                markBad(ctrl.signal.aborted ? "slow" : "offline");
            } finally{
                clearTimeout(abortTimer);
                schedule(fails.current > 0 ? recoverIntervalMs : intervalMs);
            }
        }
        const onOffline = ()=>{
            fails.current = failThreshold;
            setStatus({
                isOnline: false,
                reason: "offline"
            });
        };
        const onOnline = ()=>check();
        window.addEventListener("offline", onOffline);
        window.addEventListener("online", onOnline);
        check();
        return ()=>{
            stopped = true;
            clearTimeout(timer);
            window.removeEventListener("offline", onOffline);
            window.removeEventListener("online", onOnline);
        };
    }, [
        url,
        intervalMs,
        recoverIntervalMs,
        timeoutMs,
        slowMs,
        failThreshold
    ]);
    return status;
}
}),
"[project]/lib/tv-colors.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// Helper warna kategori tamu untuk Greeting TV.
// Dipakai bersama oleh halaman pengaturan (dashboard) dan halaman TV (/tv/[id]).
__turbopack_context__.s([
    "CATEGORY_SUGGESTIONS",
    ()=>CATEGORY_SUGGESTIONS,
    "COLOR_SWATCHES",
    ()=>COLOR_SWATCHES,
    "DEFAULT_CATEGORY_COLOR",
    ()=>DEFAULT_CATEGORY_COLOR,
    "findCategoryColor",
    ()=>findCategoryColor,
    "getContrastText",
    ()=>getContrastText,
    "newCategoryId",
    ()=>newCategoryId,
    "normalizeCategoryColors",
    ()=>normalizeCategoryColors
]);
const DEFAULT_CATEGORY_COLOR = "#F59E0B";
const COLOR_SWATCHES = [
    {
        label: "Emas",
        color: "#D4AF37"
    },
    {
        label: "Perak",
        color: "#C0C0C0"
    },
    {
        label: "Perunggu",
        color: "#CD7F32"
    },
    {
        label: "Merah",
        color: "#DC2626"
    },
    {
        label: "Merah Muda",
        color: "#EC4899"
    },
    {
        label: "Ungu",
        color: "#9333EA"
    },
    {
        label: "Biru",
        color: "#2563EB"
    },
    {
        label: "Hijau",
        color: "#16A34A"
    }
];
const CATEGORY_SUGGESTIONS = [
    {
        name: "VIP",
        color: "#D4AF37"
    },
    {
        name: "Keluarga",
        color: "#EC4899"
    },
    {
        name: "Rekan Kerja",
        color: "#2563EB"
    },
    {
        name: "Teman",
        color: "#16A34A"
    },
    {
        name: "Reguler",
        color: "#C0C0C0"
    }
];
const HEX_RE = /^#[0-9a-f]{6}$/i;
const newCategoryId = ()=>`cat_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
function normalizeCategoryColors(value) {
    let arr = value;
    if (typeof value === "string") {
        try {
            arr = JSON.parse(value);
        } catch  {
            arr = [];
        }
    }
    if (!Array.isArray(arr)) return [];
    return arr.filter((x)=>x && typeof x.name === "string").map((x)=>({
            id: x.id || newCategoryId(),
            name: x.name,
            color: HEX_RE.test(x.color) ? x.color : DEFAULT_CATEGORY_COLOR
        }));
}
function findCategoryColor(list, category) {
    if (!category) return null;
    const key = String(category).trim().toLowerCase();
    return normalizeCategoryColors(list).find((c)=>c.name.trim().toLowerCase() === key) || null;
}
function getContrastText(hex) {
    const h = HEX_RE.test(hex) ? hex : DEFAULT_CATEGORY_COLOR;
    const r = parseInt(h.slice(1, 3), 16);
    const g = parseInt(h.slice(3, 5), 16);
    const b = parseInt(h.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.6 ? "#1a1a1a" : "#ffffff";
}
}),
"[project]/components/tv/tv-client.jsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>TVClient
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$styled$2d$jsx$2f$style$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/styled-jsx/style.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$hooks$2f$use$2d$connection$2d$status$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/hooks/use-connection-status.js [app-ssr] (ecmascript)");
(()=>{
    const e = new Error("Cannot find module '@/components/tv-offline-overlay'");
    e.code = 'MODULE_NOT_FOUND';
    throw e;
})();
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$tv$2d$colors$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/tv-colors.js [app-ssr] (ecmascript)");
"use client";
;
;
;
;
;
;
const FONT_SIZES = {
    small: 32,
    medium: 44,
    large: 60,
    xlarge: 84
};
function TVClient({ settings }) {
    const [current, setCurrent] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [connected, setConnected] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const { isOnline, reason } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$hooks$2f$use$2d$connection$2d$status$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useConnectionStatus"])();
    const queueRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])([]);
    const currentRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null); // sumber kebenaran, bebas closure basi
    const onlineRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(true);
    const timerRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const audioRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const settingsRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(settings);
    const showNextRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(()=>{});
    settingsRef.current = settings;
    // Antrean urut prioritas (kecil = lebih dulu), stabil untuk prioritas sama
    const insertQueue = (item)=>{
        const q = queueRef.current;
        let idx = q.length;
        for(let i = 0; i < q.length; i++){
            if ((item.priority ?? 0) < (q[i].priority ?? 0)) {
                idx = i;
                break;
            }
        }
        q.splice(idx, 0, item);
    };
    showNextRef.current = ()=>{
        // jangan menimpa sapaan yang sedang tampil, dan jeda saat internet bermasalah
        if (currentRef.current || !onlineRef.current) return;
        const next = queueRef.current.shift();
        if (!next) return;
        currentRef.current = next;
        setCurrent(next);
        const s = settingsRef.current;
        if (s.tvSoundEnabled && audioRef.current) {
            try {
                audioRef.current.currentTime = 0;
                audioRef.current.play().catch(()=>{});
            } catch  {}
        }
        const dur = Math.max(3, Math.min(60, s.tvDuration || 7)) * 1000;
        timerRef.current = setTimeout(()=>{
            currentRef.current = null;
            setCurrent(null);
            timerRef.current = setTimeout(()=>showNextRef.current(), 350);
        }, dur);
    };
    // Koneksi SSE
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (!settings.tvEnabled) return;
        const es = new EventSource(`/api/tv/${settings.id}/stream`);
        es.addEventListener("hello", ()=>setConnected(true));
        es.addEventListener("checkin", (ev)=>{
            try {
                insertQueue(JSON.parse(ev.data));
                showNextRef.current();
            } catch  {}
        });
        es.onerror = ()=>setConnected(false);
        return ()=>{
            es.close();
            clearTimeout(timerRef.current);
        };
    // eslint-disable-next-line
    }, [
        settings.tvEnabled,
        settings.id
    ]);
    // Jeda antrean saat offline/lambat, lanjut saat pulih
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        onlineRef.current = isOnline;
        if (isOnline) showNextRef.current();
    }, [
        isOnline
    ]);
    // Layar penuh
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (!settings.tvFullscreen) return;
        const trigger = ()=>{
            const el = document.documentElement;
            if (el.requestFullscreen && !document.fullscreenElement) el.requestFullscreen().catch(()=>{});
        };
        document.addEventListener("click", trigger, {
            once: true
        });
        return ()=>document.removeEventListener("click", trigger);
    }, [
        settings.tvFullscreen
    ]);
    const bgStyle = settings.tvBackground ? {
        backgroundImage: `url(${settings.tvBackground})`
    } : {};
    const nameSize = FONT_SIZES[settings.tvFontSize] || FONT_SIZES.large;
    const anim = settings.tvAnimationEnabled ? "tv-anim" : "";
    // Warna sesuai kategori tamu (sama dengan yang di pratinjau)
    const accent = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$tv$2d$colors$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["findCategoryColor"])(settings.tvCategoryColors, current?.category)?.color || __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$tv$2d$colors$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DEFAULT_CATEGORY_COLOR"];
    if (!settings.tvEnabled) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "min-h-screen flex items-center justify-center bg-[#1a0f08] text-white/70",
            children: "TV Sapaan belum diaktifkan."
        }, void 0, false, {
            fileName: "[project]/components/tv/tv-client.jsx",
            lineNumber: 116,
            columnNumber: 7
        }, this);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        style: {
            background: "linear-gradient(135deg,#1a0f08,#3a2418,#5a3820)",
            ...bgStyle
        },
        className: "jsx-7825e868b0474067" + " " + "min-h-screen w-full bg-cover bg-center relative overflow-hidden",
        children: [
            settings.tvBackground && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "jsx-7825e868b0474067" + " " + "absolute inset-0 bg-black/40"
            }, void 0, false, {
                fileName: "[project]/components/tv/tv-client.jsx",
                lineNumber: 131,
                columnNumber: 9
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "jsx-7825e868b0474067" + " " + "absolute top-6 right-8 text-xs text-white/50 font-mono z-10",
                children: connected && isOnline ? "● LIVE" : "○ offline"
            }, void 0, false, {
                fileName: "[project]/components/tv/tv-client.jsx",
                lineNumber: 133,
                columnNumber: 7
            }, this),
            settings.tvLogo && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                src: settings.tvLogo,
                alt: "Logo",
                className: "jsx-7825e868b0474067" + " " + "absolute top-6 left-8 h-16 z-10"
            }, void 0, false, {
                fileName: "[project]/components/tv/tv-client.jsx",
                lineNumber: 137,
                columnNumber: 9
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "jsx-7825e868b0474067" + " " + "relative z-10 min-h-screen flex flex-col items-center justify-center text-center px-12 text-white",
                children: current ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    style: {
                        border: `4px solid ${accent}`,
                        boxShadow: `0 0 60px ${accent}88`
                    },
                    className: "jsx-7825e868b0474067" + " " + `${anim} space-y-6 max-w-6xl rounded-3xl bg-black/55 backdrop-blur-sm px-16 py-10`,
                    children: [
                        current.selfieUrl && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                            src: current.selfieUrl,
                            alt: "Selfie tamu",
                            style: {
                                borderColor: accent
                            },
                            className: "jsx-7825e868b0474067" + " " + "mx-auto h-40 w-40 rounded-full object-cover border-4 shadow-2xl"
                        }, void 0, false, {
                            fileName: "[project]/components/tv/tv-client.jsx",
                            lineNumber: 155,
                            columnNumber: 15
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            style: {
                                fontFamily: "Great Vibes, cursive",
                                color: accent
                            },
                            className: "jsx-7825e868b0474067" + " " + "text-6xl md:text-8xl",
                            children: "Selamat Datang"
                        }, void 0, false, {
                            fileName: "[project]/components/tv/tv-client.jsx",
                            lineNumber: 162,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            style: {
                                fontFamily: "Playfair Display, serif"
                            },
                            className: "jsx-7825e868b0474067" + " " + "text-3xl md:text-5xl tracking-widest",
                            children: [
                                current.brideName,
                                " & ",
                                current.groomName
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/tv/tv-client.jsx",
                            lineNumber: 168,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            style: {
                                fontFamily: "Playfair Display, serif",
                                fontSize: nameSize
                            },
                            className: "jsx-7825e868b0474067" + " " + "font-bold leading-tight text-white break-words",
                            children: current.guestName
                        }, void 0, false, {
                            fileName: "[project]/components/tv/tv-client.jsx",
                            lineNumber: 174,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "jsx-7825e868b0474067" + " " + "flex items-center justify-center gap-6 pt-4",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    style: {
                                        backgroundColor: accent,
                                        color: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$tv$2d$colors$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getContrastText"])(accent)
                                    },
                                    className: "jsx-7825e868b0474067" + " " + "inline-block rounded-full px-8 py-2 text-2xl font-bold tracking-widest uppercase",
                                    children: current.category || "Umum"
                                }, void 0, false, {
                                    fileName: "[project]/components/tv/tv-client.jsx",
                                    lineNumber: 184,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "jsx-7825e868b0474067" + " " + "text-3xl font-serif",
                                    children: [
                                        current.count,
                                        " Orang"
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/tv/tv-client.jsx",
                                    lineNumber: 193,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/tv/tv-client.jsx",
                            lineNumber: 183,
                            columnNumber: 13
                        }, this)
                    ]
                }, current.checkInId, true, {
                    fileName: "[project]/components/tv/tv-client.jsx",
                    lineNumber: 146,
                    columnNumber: 11
                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "jsx-7825e868b0474067" + " " + `${anim} text-center`,
                    children: [
                        settings.tvCouplePhoto && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                            src: settings.tvCouplePhoto,
                            alt: "",
                            className: "jsx-7825e868b0474067" + " " + "mx-auto max-h-[50vh] rounded-3xl mb-8 shadow-2xl"
                        }, void 0, false, {
                            fileName: "[project]/components/tv/tv-client.jsx",
                            lineNumber: 199,
                            columnNumber: 15
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            style: {
                                fontFamily: "Great Vibes, cursive"
                            },
                            className: "jsx-7825e868b0474067" + " " + "text-6xl md:text-8xl text-amber-200 mb-4",
                            children: "Pernikahan"
                        }, void 0, false, {
                            fileName: "[project]/components/tv/tv-client.jsx",
                            lineNumber: 205,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            style: {
                                fontFamily: "Playfair Display, serif"
                            },
                            className: "jsx-7825e868b0474067" + " " + "text-4xl md:text-6xl tracking-widest",
                            children: [
                                settings.brideName,
                                " & ",
                                settings.groomName
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/tv/tv-client.jsx",
                            lineNumber: 211,
                            columnNumber: 13
                        }, this),
                        settings.venue && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "jsx-7825e868b0474067" + " " + "mt-6 text-xl text-white/70",
                            children: settings.venue
                        }, void 0, false, {
                            fileName: "[project]/components/tv/tv-client.jsx",
                            lineNumber: 218,
                            columnNumber: 15
                        }, this),
                        settings.weddingDate && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "jsx-7825e868b0474067" + " " + "mt-2 text-lg text-white/60",
                            children: new Date(settings.weddingDate).toLocaleDateString("id-ID", {
                                weekday: "long",
                                day: "numeric",
                                month: "long",
                                year: "numeric"
                            })
                        }, void 0, false, {
                            fileName: "[project]/components/tv/tv-client.jsx",
                            lineNumber: 221,
                            columnNumber: 15
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/tv/tv-client.jsx",
                    lineNumber: 197,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/components/tv/tv-client.jsx",
                lineNumber: 144,
                columnNumber: 7
            }, this),
            !isOnline && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(TvOfflineOverlay, {
                reason: reason
            }, void 0, false, {
                fileName: "[project]/components/tv/tv-client.jsx",
                lineNumber: 234,
                columnNumber: 21
            }, this),
            settings.tvSoundEnabled && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("audio", {
                ref: audioRef,
                src: "data:audio/wav;base64,UklGRoQCAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YWACAABmZmZmZmZmZg==",
                preload: "auto",
                className: "jsx-7825e868b0474067"
            }, void 0, false, {
                fileName: "[project]/components/tv/tv-client.jsx",
                lineNumber: 237,
                columnNumber: 9
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$styled$2d$jsx$2f$style$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                id: "7825e868b0474067",
                children: '@import "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=Great+Vibes&display=swap";html,body{background:#1a0f08;margin:0}.tv-anim{animation:.9s cubic-bezier(.2,.9,.2,1) tvIn}@keyframes tvIn{0%{opacity:0;transform:translateY(30px)scale(.98)}to{opacity:1;transform:translateY(0)scale(1)}}'
            }, void 0, false, void 0, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/tv/tv-client.jsx",
        lineNumber: 123,
        columnNumber: 5
    }, this);
}
}),
"[project]/node_modules/next/dist/compiled/client-only/index.js [app-ssr] (ecmascript)", ((__turbopack_context__, module, exports) => {

}),
"[project]/node_modules/styled-jsx/dist/index/index.js [app-ssr] (ecmascript)", ((__turbopack_context__, module, exports) => {

__turbopack_context__.r("[project]/node_modules/next/dist/compiled/client-only/index.js [app-ssr] (ecmascript)");
var React = __turbopack_context__.r("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
function _interopDefaultLegacy(e) {
    return e && typeof e === 'object' && 'default' in e ? e : {
        'default': e
    };
}
var React__default = /*#__PURE__*/ _interopDefaultLegacy(React);
/*
Based on Glamor's sheet
https://github.com/threepointone/glamor/blob/667b480d31b3721a905021b26e1290ce92ca2879/src/sheet.js
*/ function _defineProperties(target, props) {
    for(var i = 0; i < props.length; i++){
        var descriptor = props[i];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ("value" in descriptor) descriptor.writable = true;
        Object.defineProperty(target, descriptor.key, descriptor);
    }
}
function _createClass(Constructor, protoProps, staticProps) {
    if (protoProps) _defineProperties(Constructor.prototype, protoProps);
    if (staticProps) _defineProperties(Constructor, staticProps);
    return Constructor;
}
var isProd = typeof process !== "undefined" && process.env && ("TURBOPACK compile-time value", "development") === "production";
var isString = function(o) {
    return Object.prototype.toString.call(o) === "[object String]";
};
var StyleSheet = /*#__PURE__*/ function() {
    function StyleSheet(param) {
        var ref = param === void 0 ? {} : param, _name = ref.name, name = _name === void 0 ? "stylesheet" : _name, _optimizeForSpeed = ref.optimizeForSpeed, optimizeForSpeed = _optimizeForSpeed === void 0 ? isProd : _optimizeForSpeed;
        invariant$1(isString(name), "`name` must be a string");
        this._name = name;
        this._deletedRulePlaceholder = "#" + name + "-deleted-rule____{}";
        invariant$1(typeof optimizeForSpeed === "boolean", "`optimizeForSpeed` must be a boolean");
        this._optimizeForSpeed = optimizeForSpeed;
        this._serverSheet = undefined;
        this._tags = [];
        this._injected = false;
        this._rulesCount = 0;
        var node = "undefined" !== "undefined" && document.querySelector('meta[property="csp-nonce"]');
        this._nonce = ("TURBOPACK compile-time falsy", 0) ? "TURBOPACK unreachable" : null;
    }
    var _proto = StyleSheet.prototype;
    _proto.setOptimizeForSpeed = function setOptimizeForSpeed(bool) {
        invariant$1(typeof bool === "boolean", "`setOptimizeForSpeed` accepts a boolean");
        invariant$1(this._rulesCount === 0, "optimizeForSpeed cannot be when rules have already been inserted");
        this.flush();
        this._optimizeForSpeed = bool;
        this.inject();
    };
    _proto.isOptimizeForSpeed = function isOptimizeForSpeed() {
        return this._optimizeForSpeed;
    };
    _proto.inject = function inject() {
        var _this = this;
        invariant$1(!this._injected, "sheet already injected");
        this._injected = true;
        if ("undefined" !== "undefined" && this._optimizeForSpeed) //TURBOPACK unreachable
        ;
        this._serverSheet = {
            cssRules: [],
            insertRule: function(rule, index) {
                if (typeof index === "number") {
                    _this._serverSheet.cssRules[index] = {
                        cssText: rule
                    };
                } else {
                    _this._serverSheet.cssRules.push({
                        cssText: rule
                    });
                }
                return index;
            },
            deleteRule: function(index) {
                _this._serverSheet.cssRules[index] = null;
            }
        };
    };
    _proto.getSheetForTag = function getSheetForTag(tag) {
        if (tag.sheet) {
            return tag.sheet;
        }
        // this weirdness brought to you by firefox
        for(var i = 0; i < document.styleSheets.length; i++){
            if (document.styleSheets[i].ownerNode === tag) {
                return document.styleSheets[i];
            }
        }
    };
    _proto.getSheet = function getSheet() {
        return this.getSheetForTag(this._tags[this._tags.length - 1]);
    };
    _proto.insertRule = function insertRule(rule, index) {
        invariant$1(isString(rule), "`insertRule` accepts only strings");
        if ("TURBOPACK compile-time truthy", 1) {
            if (typeof index !== "number") {
                index = this._serverSheet.cssRules.length;
            }
            this._serverSheet.insertRule(rule, index);
            return this._rulesCount++;
        }
        //TURBOPACK unreachable
        ;
        var sheet;
        var insertionPoint;
    };
    _proto.replaceRule = function replaceRule(index, rule) {
        if (this._optimizeForSpeed || "undefined" === "undefined") {
            var sheet = ("TURBOPACK compile-time falsy", 0) ? "TURBOPACK unreachable" : this._serverSheet;
            if (!rule.trim()) {
                rule = this._deletedRulePlaceholder;
            }
            if (!sheet.cssRules[index]) {
                // @TBD Should we throw an error?
                return index;
            }
            sheet.deleteRule(index);
            try {
                sheet.insertRule(rule, index);
            } catch (error) {
                if ("TURBOPACK compile-time truthy", 1) {
                    console.warn("StyleSheet: illegal rule: \n\n" + rule + "\n\nSee https://stackoverflow.com/q/20007992 for more info");
                }
                // In order to preserve the indices we insert a deleteRulePlaceholder
                sheet.insertRule(this._deletedRulePlaceholder, index);
            }
        } else //TURBOPACK unreachable
        {
            var tag;
        }
        return index;
    };
    _proto.deleteRule = function deleteRule(index) {
        if ("TURBOPACK compile-time truthy", 1) {
            this._serverSheet.deleteRule(index);
            return;
        }
        //TURBOPACK unreachable
        ;
        var tag;
    };
    _proto.flush = function flush() {
        this._injected = false;
        this._rulesCount = 0;
        if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
        ;
        else {
            // simpler on server
            this._serverSheet.cssRules = [];
        }
    };
    _proto.cssRules = function cssRules() {
        var _this = this;
        if ("TURBOPACK compile-time truthy", 1) {
            return this._serverSheet.cssRules;
        }
        //TURBOPACK unreachable
        ;
    };
    _proto.makeStyleTag = function makeStyleTag(name, cssString, relativeToTag) {
        if (cssString) {
            invariant$1(isString(cssString), "makeStyleTag accepts only strings as second parameter");
        }
        var tag = document.createElement("style");
        if (this._nonce) tag.setAttribute("nonce", this._nonce);
        tag.type = "text/css";
        tag.setAttribute("data-" + name, "");
        if (cssString) {
            tag.appendChild(document.createTextNode(cssString));
        }
        var head = document.head || document.getElementsByTagName("head")[0];
        if (relativeToTag) {
            head.insertBefore(tag, relativeToTag);
        } else {
            head.appendChild(tag);
        }
        return tag;
    };
    _createClass(StyleSheet, [
        {
            key: "length",
            get: function get() {
                return this._rulesCount;
            }
        }
    ]);
    return StyleSheet;
}();
function invariant$1(condition, message) {
    if (!condition) {
        throw new Error("StyleSheet: " + message + ".");
    }
}
function hash(str) {
    var _$hash = 5381, i = str.length;
    while(i){
        _$hash = _$hash * 33 ^ str.charCodeAt(--i);
    }
    /* JavaScript does bitwise operations (like XOR, above) on 32-bit signed
   * integers. Since we want the results to be always positive, convert the
   * signed int to an unsigned by doing an unsigned bitshift. */ return _$hash >>> 0;
}
var stringHash = hash;
var sanitize = function(rule) {
    return rule.replace(/\/style/gi, "\\/style");
};
var cache = {};
/**
 * computeId
 *
 * Compute and memoize a jsx id from a basedId and optionally props.
 */ function computeId(baseId, props) {
    if (!props) {
        return "jsx-" + baseId;
    }
    var propsToString = String(props);
    var key = baseId + propsToString;
    if (!cache[key]) {
        cache[key] = "jsx-" + stringHash(baseId + "-" + propsToString);
    }
    return cache[key];
}
/**
 * computeSelector
 *
 * Compute and memoize dynamic selectors.
 */ function computeSelector(id, css) {
    var selectoPlaceholderRegexp = /__jsx-style-dynamic-selector/g;
    // Sanitize SSR-ed CSS.
    // Client side code doesn't need to be sanitized since we use
    // document.createTextNode (dev) and the CSSOM api sheet.insertRule (prod).
    if ("TURBOPACK compile-time truthy", 1) {
        css = sanitize(css);
    }
    var idcss = id + css;
    if (!cache[idcss]) {
        cache[idcss] = css.replace(selectoPlaceholderRegexp, id);
    }
    return cache[idcss];
}
function mapRulesToStyle(cssRules, options) {
    if (options === void 0) options = {};
    return cssRules.map(function(args) {
        var id = args[0];
        var css = args[1];
        return /*#__PURE__*/ React__default["default"].createElement("style", {
            id: "__" + id,
            // Avoid warnings upon render with a key
            key: "__" + id,
            nonce: options.nonce ? options.nonce : undefined,
            dangerouslySetInnerHTML: {
                __html: css
            }
        });
    });
}
var StyleSheetRegistry = /*#__PURE__*/ function() {
    function StyleSheetRegistry(param) {
        var ref = param === void 0 ? {} : param, _styleSheet = ref.styleSheet, styleSheet = _styleSheet === void 0 ? null : _styleSheet, _optimizeForSpeed = ref.optimizeForSpeed, optimizeForSpeed = _optimizeForSpeed === void 0 ? false : _optimizeForSpeed;
        this._sheet = styleSheet || new StyleSheet({
            name: "styled-jsx",
            optimizeForSpeed: optimizeForSpeed
        });
        this._sheet.inject();
        if (styleSheet && typeof optimizeForSpeed === "boolean") {
            this._sheet.setOptimizeForSpeed(optimizeForSpeed);
            this._optimizeForSpeed = this._sheet.isOptimizeForSpeed();
        }
        this._fromServer = undefined;
        this._indices = {};
        this._instancesCounts = {};
    }
    var _proto = StyleSheetRegistry.prototype;
    _proto.add = function add(props) {
        var _this = this;
        if (undefined === this._optimizeForSpeed) {
            this._optimizeForSpeed = Array.isArray(props.children);
            this._sheet.setOptimizeForSpeed(this._optimizeForSpeed);
            this._optimizeForSpeed = this._sheet.isOptimizeForSpeed();
        }
        if ("undefined" !== "undefined" && !this._fromServer) //TURBOPACK unreachable
        ;
        var ref = this.getIdAndRules(props), styleId = ref.styleId, rules = ref.rules;
        // Deduping: just increase the instances count.
        if (styleId in this._instancesCounts) {
            this._instancesCounts[styleId] += 1;
            return;
        }
        var indices = rules.map(function(rule) {
            return _this._sheet.insertRule(rule);
        }) // Filter out invalid rules
        .filter(function(index) {
            return index !== -1;
        });
        this._indices[styleId] = indices;
        this._instancesCounts[styleId] = 1;
    };
    _proto.remove = function remove(props) {
        var _this = this;
        var styleId = this.getIdAndRules(props).styleId;
        invariant(styleId in this._instancesCounts, "styleId: `" + styleId + "` not found");
        this._instancesCounts[styleId] -= 1;
        if (this._instancesCounts[styleId] < 1) {
            var tagFromServer = this._fromServer && this._fromServer[styleId];
            if (tagFromServer) {
                tagFromServer.parentNode.removeChild(tagFromServer);
                delete this._fromServer[styleId];
            } else {
                this._indices[styleId].forEach(function(index) {
                    return _this._sheet.deleteRule(index);
                });
                delete this._indices[styleId];
            }
            delete this._instancesCounts[styleId];
        }
    };
    _proto.update = function update(props, nextProps) {
        this.add(nextProps);
        this.remove(props);
    };
    _proto.flush = function flush() {
        this._sheet.flush();
        this._sheet.inject();
        this._fromServer = undefined;
        this._indices = {};
        this._instancesCounts = {};
    };
    _proto.cssRules = function cssRules() {
        var _this = this;
        var fromServer = this._fromServer ? Object.keys(this._fromServer).map(function(styleId) {
            return [
                styleId,
                _this._fromServer[styleId]
            ];
        }) : [];
        var cssRules = this._sheet.cssRules();
        return fromServer.concat(Object.keys(this._indices).map(function(styleId) {
            return [
                styleId,
                _this._indices[styleId].map(function(index) {
                    return cssRules[index].cssText;
                }).join(_this._optimizeForSpeed ? "" : "\n")
            ];
        }) // filter out empty rules
        .filter(function(rule) {
            return Boolean(rule[1]);
        }));
    };
    _proto.styles = function styles(options) {
        return mapRulesToStyle(this.cssRules(), options);
    };
    _proto.getIdAndRules = function getIdAndRules(props) {
        var css = props.children, dynamic = props.dynamic, id = props.id;
        if (dynamic) {
            var styleId = computeId(id, dynamic);
            return {
                styleId: styleId,
                rules: Array.isArray(css) ? css.map(function(rule) {
                    return computeSelector(styleId, rule);
                }) : [
                    computeSelector(styleId, css)
                ]
            };
        }
        return {
            styleId: computeId(id),
            rules: Array.isArray(css) ? css : [
                css
            ]
        };
    };
    /**
   * selectFromServer
   *
   * Collects style tags from the document with id __jsx-XXX
   */ _proto.selectFromServer = function selectFromServer() {
        var elements = Array.prototype.slice.call(document.querySelectorAll('[id^="__jsx-"]'));
        return elements.reduce(function(acc, element) {
            var id = element.id.slice(2);
            acc[id] = element;
            return acc;
        }, {});
    };
    return StyleSheetRegistry;
}();
function invariant(condition, message) {
    if (!condition) {
        throw new Error("StyleSheetRegistry: " + message + ".");
    }
}
var StyleSheetContext = /*#__PURE__*/ React.createContext(null);
StyleSheetContext.displayName = "StyleSheetContext";
function createStyleRegistry() {
    return new StyleSheetRegistry();
}
function StyleRegistry(param) {
    var configuredRegistry = param.registry, children = param.children;
    var rootRegistry = React.useContext(StyleSheetContext);
    var ref = React.useState(function() {
        return rootRegistry || configuredRegistry || createStyleRegistry();
    }), registry = ref[0];
    return /*#__PURE__*/ React__default["default"].createElement(StyleSheetContext.Provider, {
        value: registry
    }, children);
}
function useStyleRegistry() {
    return React.useContext(StyleSheetContext);
}
// Opt-into the new `useInsertionEffect` API in React 18, fallback to `useLayoutEffect`.
// https://github.com/reactwg/react-18/discussions/110
var useInsertionEffect = React__default["default"].useInsertionEffect || React__default["default"].useLayoutEffect;
var defaultRegistry = ("TURBOPACK compile-time falsy", 0) ? "TURBOPACK unreachable" : undefined;
function JSXStyle(props) {
    var registry = defaultRegistry ? defaultRegistry : useStyleRegistry();
    // If `registry` does not exist, we do nothing here.
    if (!registry) {
        return null;
    }
    if ("TURBOPACK compile-time truthy", 1) {
        registry.add(props);
        return null;
    }
    //TURBOPACK unreachable
    ;
}
JSXStyle.dynamic = function(info) {
    return info.map(function(tagInfo) {
        var baseId = tagInfo[0];
        var props = tagInfo[1];
        return computeId(baseId, props);
    }).join(" ");
};
exports.StyleRegistry = StyleRegistry;
exports.createStyleRegistry = createStyleRegistry;
exports.style = JSXStyle;
exports.useStyleRegistry = useStyleRegistry;
}),
"[project]/node_modules/styled-jsx/style.js [app-ssr] (ecmascript)", ((__turbopack_context__, module, exports) => {

module.exports = __turbopack_context__.r("[project]/node_modules/styled-jsx/dist/index/index.js [app-ssr] (ecmascript)").style;
}),
];

//# sourceMappingURL=_1e29ad84._.js.map