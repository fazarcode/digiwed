'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Heart, LayoutDashboard, FileHeart, Users, MessageSquare, ScanLine, ClipboardList, Tv, User, Send, Globe, Camera, Gift, PackageOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FEATURE_KEYS, hasFeatureAny } from '@/lib/features';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, feature: FEATURE_KEYS.DASHBOARD },
  { href: '/dashboard/invitations', label: 'My Invitations', icon: FileHeart, feature: null },
  { href: '/dashboard/guests', label: 'Guests', icon: Users, feature: FEATURE_KEYS.GUEST },
  { href: '/dashboard/rsvp', label: 'RSVP', icon: MessageSquare, feature: FEATURE_KEYS.RSVP },
  { href: '/dashboard/attendance', label: 'Check-in & Attendance', icon: ScanLine, featureAny: [FEATURE_KEYS.QR_CHECKIN, FEATURE_KEYS.ATTENDANCE] },
  { href: '/dashboard/souvenir', label: 'Souvenir', icon: PackageOpen, feature: null },
  { href: '/dashboard/gift-tracking', label: 'Gift Tracking', icon: Gift, feature: null },
  { href: '/dashboard/greeting-tv', label: 'Greeting TV', icon: Tv, feature: FEATURE_KEYS.GREETING_TV },
  { href: '/dashboard/moments', label: 'Event Moments', icon: Camera, feature: FEATURE_KEYS.EVENT_MOMENTS },
  { href: '/dashboard/message-template', label: 'Message Template', icon: Send, feature: FEATURE_KEYS.MESSAGE_TEMPLATE },
  { href: '/dashboard/domain', label: 'Domain', icon: Globe, feature: FEATURE_KEYS.CUSTOM_DOMAIN },
  { href: '/dashboard/profile', label: 'Profile', icon: User, feature: null },
];

export default function UserSidebar({ invitations = [], packageName = null }) {
  const pathname = usePathname();
  return (
    <aside className="hidden md:flex md:fixed md:inset-y-0 md:left-0 md:z-20 md:w-64 md:flex-col bg-white border-r border-primary/10">
      <div className="flex items-center gap-2 h-16 px-6 border-b border-primary/10">
        <Heart className="h-6 w-6 text-primary" fill="currentColor" />
        <div>
          <div className="font-serif text-lg font-semibold text-primary">Elegante</div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Your Studio</div>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto scrollbar-thin">
        {NAV.map(({ href, label, icon: Icon, feature, featureAny }) => {
          // Hide menu when feature is disabled by every invitation's selected package.
          // `featureAny` = show when ANY of the listed features is enabled (OR).
          const visible = featureAny
            ? featureAny.some((k) => hasFeatureAny(invitations, k))
            : (!feature || hasFeatureAny(invitations, feature));
          if (!visible) return null;
          const active = href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href);
          return (
            <Link key={href} href={href} data-testid={`sidebar-${href.split('/').filter(Boolean).join('-') || 'root'}`} className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition',
              active ? 'bg-primary text-primary-foreground font-semibold shadow-md' : 'text-foreground/70 hover:bg-muted hover:text-foreground'
            )}>
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="px-6 py-4 border-t border-primary/10 text-xs text-muted-foreground">
        <p className="mb-1">Plan: <span className="font-semibold text-foreground">{packageName || 'No package'}</span></p>
        <p>Crafted with love</p>
      </div>
    </aside>
  );
}
