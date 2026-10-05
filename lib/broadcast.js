// Simple in-memory pub/sub for Server-Sent Events (SSE)
// One channel per invitation.id. Not clustered — fine for single-instance deployment.
//
// Disimpan di globalThis supaya semua route (stream & check-in) memakai
// Map yang sama, walaupun modul ini dimuat ulang / terduplikasi oleh Next.js.

const g = globalThis;
const channels = g.__tvChannels || (g.__tvChannels = new Map()); // invitationId -> Set of writer functions

export function subscribe(invitationId, write) {
  let set = channels.get(invitationId);
  if (!set) {
    set = new Set();
    channels.set(invitationId, set);
  }
  set.add(write);
  return () => {
    set.delete(write);
    if (set.size === 0) channels.delete(invitationId);
  };
}

export function publish(invitationId, eventType, payload) {
  const set = channels.get(invitationId);

  if (!set || set.size === 0) return;
  const data = `event: ${eventType}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const w of set) {
    try {
      w(data);
    } catch {}
  }
}

export function channelSize(invitationId) {
  return channels.get(invitationId)?.size || 0;
}
