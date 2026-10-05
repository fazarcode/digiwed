"use client";
import { createContext, useContext, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Heart,
  LayoutDashboard,
  FileHeart,
  Users,
  MessageSquare,
  ScanLine,
  Tv,
  User,
  Send,
  Globe,
  Camera,
  Gift,
  PackageOpen,
  Star,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FEATURE_KEYS, hasFeatureAny } from "@/lib/features";

// `short` = label pendek untuk bar tab bawah (hanya 4 menu pertama yang punya)
const NAV = [
  {
    href: "/dashboard",
    label: "Dashboard",
    short: "Beranda",
    icon: LayoutDashboard,
    feature: FEATURE_KEYS.DASHBOARD,
  },
  {
    href: "/dashboard/invitations",
    label: "Undangan Saya",
    short: "Undangan",
    icon: FileHeart,
    feature: null,
  },
  {
    href: "/dashboard/guests",
    label: "Tamu",
    short: "Tamu",
    icon: Users,
    feature: FEATURE_KEYS.GUEST,
  },
  {
    href: "/dashboard/rsvp",
    label: "RSVP",
    short: "RSVP",
    icon: MessageSquare,
    feature: FEATURE_KEYS.RSVP,
  },
  {
    href: "/dashboard/attendance",
    label: "Check-in & Kehadiran",
    icon: ScanLine,
    featureAny: [FEATURE_KEYS.QR_CHECKIN, FEATURE_KEYS.ATTENDANCE],
  },
  {
    href: "/dashboard/souvenir",
    label: "Suvenir",
    icon: PackageOpen,
    feature: null,
  },
  {
    href: "/dashboard/gift-tracking",
    label: "Hadiah",
    icon: Gift,
    feature: null,
  },
  {
    href: "/dashboard/greeting-tv",
    label: "TV Ucapan",
    icon: Tv,
    feature: FEATURE_KEYS.GREETING_TV,
  },
  {
    href: "/dashboard/moments",
    label: "Foto Momen",
    icon: Camera,
    feature: FEATURE_KEYS.EVENT_MOMENTS,
  },
  {
    href: "/dashboard/message-template",
    label: "Template Pesan",
    icon: Send,
    feature: FEATURE_KEYS.MESSAGE_TEMPLATE,
  },
  {
    href: "/dashboard/domain",
    label: "Domain",
    icon: Globe,
    feature: FEATURE_KEYS.CUSTOM_DOMAIN,
  },
  { href: "/dashboard/rating", label: "Rating", icon: Star, feature: null },
  { href: "/dashboard/profile", label: "Profil", icon: User, feature: null },
];

const TAB_HREFS = [
  "/dashboard",
  "/dashboard/invitations",
  "/dashboard/guests",
  "/dashboard/rsvp",
];

const STORAGE_KEY = "sidebar-collapsed";
const WIDTH_EXPANDED = "16rem"; // w-64
const WIDTH_COLLAPSED = "4rem"; // w-16

// Sembunyikan menu jika fitur dinonaktifkan oleh paket di semua undangan.
// `featureAny` = tampil jika SALAH SATU fitur yang tercantum aktif (OR).
function isVisible(item, invitations) {
  if (item.featureAny)
    return item.featureAny.some((k) => hasFeatureAny(invitations, k));
  return !item.feature || hasFeatureAny(invitations, item.feature);
}

function isActive(href, pathname) {
  return href === "/dashboard"
    ? pathname === "/dashboard"
    : pathname.startsWith(href);
}

// ---------------------------------------------------------------------------
// Context kecil supaya tab "Menu" di bar bawah bisa membuka drawer
// ---------------------------------------------------------------------------
const SidebarContext = createContext(null);

export function SidebarProvider({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <SidebarContext.Provider value={{ mobileOpen, setMobileOpen }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  return (
    useContext(SidebarContext) || { mobileOpen: false, setMobileOpen: () => {} }
  );
}

// ---------------------------------------------------------------------------
// Daftar menu (dipakai sidebar desktop & drawer)
// ---------------------------------------------------------------------------
function NavList({ invitations, collapsed = false, onNavigate }) {
  const pathname = usePathname();
  return (
    <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto overflow-x-hidden scrollbar-thin">
      {NAV.map((item) => {
        if (!isVisible(item, invitations)) return null;
        const { href, label, icon: Icon } = item;
        const active = isActive(href, pathname);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            title={collapsed ? label : undefined}
            data-testid={`sidebar-${href.split("/").filter(Boolean).join("-") || "root"}`}
            className={cn(
              "flex items-center rounded-lg text-sm transition py-2.5",
              collapsed ? "justify-center px-0" : "gap-3 px-3",
              active
                ? "bg-primary text-primary-foreground font-semibold shadow-md"
                : "text-foreground/70 hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="truncate">{label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

function PlanFooter({ packageName }) {
  return (
    <div className="px-6 py-4 border-t border-primary/10 text-xs text-muted-foreground">
      <p className="mb-1">
        Paket:{" "}
        <span className="font-semibold text-foreground">
          {packageName || "Belum ada paket"}
        </span>
      </p>
      <p>Dibuat dengan cinta</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Bar tab bawah ala aplikasi (mobile & tablet, < lg)
// ---------------------------------------------------------------------------
export function BottomTabBar({ invitations = [] }) {
  const pathname = usePathname();
  const { mobileOpen, setMobileOpen } = useSidebar();

  const tabs = TAB_HREFS.map((h) => NAV.find((n) => n.href === h))
    .filter((n) => n && isVisible(n, invitations))
    .slice(0, 4);

  const tabClass = (active) =>
    cn(
      "relative flex flex-col items-center justify-center gap-0.5 h-14 text-[10px] font-medium transition active:scale-95",
      active ? "text-primary" : "text-foreground/55",
    );

  return (
    <nav
      aria-label="Navigasi utama"
      data-testid="bottom-tab-bar"
      className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur border-t border-primary/10"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="grid grid-cols-5 max-w-xl mx-auto">
        {tabs.map(({ href, short, label, icon: Icon }) => {
          const active = isActive(href, pathname);
          return (
            <Link
              key={href}
              href={href}
              className={tabClass(active)}
              data-testid={`tab-${href.split("/").filter(Boolean).join("-")}`}
            >
              {active && (
                <span className="absolute top-0 h-0.5 w-8 rounded-full bg-primary" />
              )}
              <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
              <span>{short || label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className={tabClass(mobileOpen)}
          data-testid="tab-menu"
          aria-label="Buka menu lengkap"
        >
          <Menu className="h-5 w-5" />
          <span>Menu</span>
        </button>
      </div>
    </nav>
  );
}

export default function UserSidebar({ invitations = [], packageName = null }) {
  const pathname = usePathname();
  const { mobileOpen, setMobileOpen } = useSidebar();
  const [collapsed, setCollapsed] = useState(false);

  // Pilihan lipat/buka yang tersimpan (desktop)
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {}
  }, []);

  // Sinkronkan lebar ke CSS variable agar header & konten ikut bergeser
  useEffect(() => {
    document.documentElement.style.setProperty(
      "--sidebar-w",
      collapsed ? WIDTH_COLLAPSED : WIDTH_EXPANDED,
    );
  }, [collapsed]);

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {}
      return next;
    });
  };

  // Drawer: tutup saat pindah halaman, tekan Esc, dan kunci scroll body
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname, setMobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e) => e.key === "Escape" && setMobileOpen(false);
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [mobileOpen, setMobileOpen]);

  return (
    <>
      {/* ===== Desktop (>= lg): sidebar tetap, bisa dilipat ===== */}
      <aside
        data-collapsed={collapsed}
        style={{ width: collapsed ? WIDTH_COLLAPSED : WIDTH_EXPANDED }}
        className="hidden lg:flex lg:fixed lg:inset-y-0 lg:left-0 lg:z-20 lg:flex-col bg-white border-r border-primary/10 transition-[width] duration-200 overflow-hidden"
      >
        <div
          className={cn(
            "flex items-center h-16 border-b border-primary/10 shrink-0",
            collapsed ? "justify-center px-2" : "justify-between gap-2 px-4",
          )}
        >
          {!collapsed && (
            <div className="flex items-center gap-2 min-w-0">
              <Heart
                className="h-6 w-6 text-primary shrink-0"
                fill="currentColor"
              />
              <div className="min-w-0">
                <div className="font-serif text-lg font-semibold text-primary leading-tight">
                  Elegante
                </div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Studio Anda
                </div>
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={toggleCollapsed}
            data-testid="sidebar-toggle"
            aria-label={collapsed ? "Buka sidebar" : "Tutup sidebar"}
            title={collapsed ? "Buka sidebar" : "Tutup sidebar"}
            className="h-9 w-9 shrink-0 flex items-center justify-center rounded-lg text-foreground/70 hover:bg-muted hover:text-foreground transition"
          >
            {collapsed ? (
              <PanelLeftOpen className="h-5 w-5" />
            ) : (
              <PanelLeftClose className="h-5 w-5" />
            )}
          </button>
        </div>

        <NavList invitations={invitations} collapsed={collapsed} />
        {!collapsed && <PlanFooter packageName={packageName} />}
      </aside>

      {/* ===== Mobile & tablet (< lg): drawer menu lengkap ===== */}
      <div
        className={cn(
          "lg:hidden fixed inset-0 z-40 transition-opacity duration-200",
          mobileOpen ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
        aria-hidden={!mobileOpen}
      >
        <div
          className="absolute inset-0 bg-black/40"
          onClick={() => setMobileOpen(false)}
          data-testid="sidebar-backdrop"
        />
        <aside
          role="dialog"
          aria-label="Menu navigasi"
          className={cn(
            "absolute inset-y-0 left-0 w-72 max-w-[85vw] flex flex-col bg-white border-r border-primary/10 shadow-xl transition-transform duration-200",
            mobileOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex items-center justify-between h-16 px-4 border-b border-primary/10 shrink-0">
            <div className="flex items-center gap-2">
              <Heart className="h-6 w-6 text-primary" fill="currentColor" />
              <div>
                <div className="font-serif text-lg font-semibold text-primary leading-tight">
                  Elegante
                </div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Studio Anda
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Tutup menu"
              className="h-9 w-9 flex items-center justify-center rounded-lg text-foreground/70 hover:bg-muted"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <NavList
            invitations={invitations}
            onNavigate={() => setMobileOpen(false)}
          />
          <PlanFooter packageName={packageName} />
        </aside>
      </div>
    </>
  );
}
