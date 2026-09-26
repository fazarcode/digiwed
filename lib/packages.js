// Feature B — centralized effective-package resolution.
// Effective package precedence: invitation's own package override, else the owner's
// admin-assigned package, else null (no package => all features on, per features.js).
export function getEffectivePackage(user, invitation) {
  if (invitation && invitation.package) return invitation.package;
  if (user && user.package) return user.package;
  return null;
}

export function effectiveFeatures(user, invitation) {
  const pkg = getEffectivePackage(user, invitation);
  if (!pkg || !pkg.features) return null; // null => unrestricted
  return typeof pkg.features === 'string' ? safeParse(pkg.features) : pkg.features;
}

function safeParse(s) { try { return JSON.parse(s); } catch { return null; } }
