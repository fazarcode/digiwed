// Feature keys used by Packages. Add new keys here as features grow.
export const FEATURE_KEYS = {
  GUEST: 'GUEST',
  RSVP: 'RSVP',
  QR_INVITATION: 'QR_INVITATION',
  QR_CHECKIN: 'QR_CHECKIN',
  ATTENDANCE: 'ATTENDANCE',
  GREETING_TV: 'GREETING_TV',
  EVENT_MOMENTS: 'EVENT_MOMENTS',
  GALLERY: 'GALLERY',
  WHATSAPP_SHARING: 'WHATSAPP_SHARING',
  MESSAGE_TEMPLATE: 'MESSAGE_TEMPLATE',
  CUSTOM_DOMAIN: 'CUSTOM_DOMAIN',
  SUBDOMAIN: 'SUBDOMAIN',
  DASHBOARD: 'DASHBOARD',
  EXPORT_ATTENDANCE: 'EXPORT_ATTENDANCE',
  SELFIE: 'SELFIE',
  MANUAL_CHECKIN: 'MANUAL_CHECKIN',
  QUICK_ADD_GUEST: 'QUICK_ADD_GUEST',
};

export const FEATURE_LABELS = {
  GUEST: 'Guest',
  RSVP: 'RSVP',
  QR_INVITATION: 'QR Invitation',
  QR_CHECKIN: 'QR Check-in',
  ATTENDANCE: 'Attendance',
  GREETING_TV: 'Greeting TV',
  EVENT_MOMENTS: 'Event Moments',
  GALLERY: 'Gallery',
  WHATSAPP_SHARING: 'WhatsApp Sharing',
  MESSAGE_TEMPLATE: 'Message Template',
  CUSTOM_DOMAIN: 'Custom Domain',
  SUBDOMAIN: 'Subdomain',
  DASHBOARD: 'Dashboard',
  EXPORT_ATTENDANCE: 'Export Attendance',
  SELFIE: 'Selfie',
  MANUAL_CHECKIN: 'Manual Check-in',
  QUICK_ADD_GUEST: 'Quick Add Guest',
};

// Default features enabled when no package is selected on an invitation.
// Preserves backward-compat: everything ON.
export const DEFAULT_ENABLED = Object.fromEntries(
  Object.keys(FEATURE_KEYS).map((k) => [k, true])
);

// Given an invitation object (that includes .package), decide if a feature is enabled.
// Rule: if invitation has no package, every feature is enabled (backwards compat).
// If invitation has a package, feature is enabled only when package.features[key] === true.
export function hasFeature(invitation, key) {
  if (!invitation) return true;
  // Feature B — effective package = invitation's own package, else the owner's assigned package.
  const pkg = invitation.package || (invitation.user && invitation.user.package);
  if (!pkg || !pkg.features) return true;
  const feats = typeof pkg.features === 'string' ? safeParse(pkg.features) : pkg.features;
  return !!feats?.[key];
}

// Aggregate: given a list of invitations, is the feature enabled for at least one?
export function hasFeatureAny(invitations, key) {
  if (!invitations || invitations.length === 0) return true; // no invitations yet — show menus
  return invitations.some((inv) => hasFeature(inv, key));
}

function safeParse(s) {
  try { return JSON.parse(s); } catch { return null; }
}
