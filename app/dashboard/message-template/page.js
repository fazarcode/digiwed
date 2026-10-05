import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import MessageTemplatesManager from "@/components/dashboard/message-templates-manager";

export const dynamic = "force-dynamic";

// Ambil nilai pertama yang terisi dari beberapa kemungkinan nama kunci
const pick = (obj, keys) => {
  if (!obj || typeof obj !== "object") return null;
  for (const k of keys) {
    const v = obj[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") return v;
  }
  return null;
};

const toISO = (v) => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

// events bisa berupa array, atau string JSON
const parseEvents = (raw) => {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const p = JSON.parse(raw);
      return Array.isArray(p) ? p : [];
    } catch {
      return [];
    }
  }
  return [];
};

const DATE_KEYS = ["date", "eventDate", "tanggal", "startDate", "day"];
const TIME_KEYS = ["time", "startTime", "eventTime", "waktu", "start", "jam"];
const END_TIME_KEYS = ["endTime", "end", "selesai"];
const VENUE_KEYS = [
  "venue",
  "location",
  "locationName",
  "place",
  "placeName",
  "lokasi",
  "tempat",
  "name",
];
const ADDRESS_KEYS = ["address", "alamat", "fullAddress", "locationAddress"];
const MAP_KEYS = ["mapUrl", "mapsUrl", "mapLink", "maps", "googleMaps"];

export default async function MessageTemplatePage() {
  const s = await auth();

  const invitations = await prisma.invitation.findMany({
    where: { userId: s.user.id },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      slug: true,
      brideName: true,
      groomName: true,
      customDomain: true,
      subdomain: true,
      events: true,
      guests: {
        take: 1,
        orderBy: { createdAt: "desc" },
        include: { category: { select: { name: true } } },
      },
    },
  });

  const data = invitations.map((i) => {
    const eventsArray = parseEvents(i.events);

    // Prioritaskan acara pertama yang punya tanggal
    const mainEvent =
      eventsArray.find((e) => pick(e, DATE_KEYS)) || eventsArray[0] || null;

    const startTime = pick(mainEvent, TIME_KEYS);
    const endTime = pick(mainEvent, END_TIME_KEYS);
    const weddingTime = startTime
      ? endTime && endTime !== startTime
        ? `${startTime} - ${endTime}`
        : String(startTime)
      : null;

    const venue = pick(mainEvent, VENUE_KEYS);
    const address = pick(mainEvent, ADDRESS_KEYS);
    const mapUrl = pick(mainEvent, MAP_KEYS);
    const weddingDate = toISO(pick(mainEvent, DATE_KEYS));

    const guest = i.guests[0];

    return {
      id: i.id,
      slug: i.slug,
      brideName: i.brideName,
      groomName: i.groomName,
      customDomain: i.customDomain,
      subdomain: i.subdomain,

      // Nama utama yang dibaca buildContext
      weddingDate,
      weddingTime,
      venue,
      address,
      mapUrl,

      // Alias supaya cocok dengan berbagai nama yang mungkin dipakai buildContext
      eventDate: weddingDate,
      eventTime: weddingTime,
      eventLocation: venue || address || null,
      location: venue || address || null,

      // Data mentah semua acara (jika buildContext ingin memakainya)
      events: eventsArray,

      sampleGuest: guest
        ? {
            name: guest.name,
            token: guest.token,
            nameSlug: guest.nameSlug || null,
            trackingCode: guest.trackingCode || null,
            quota: guest.quota,
            category: guest.category?.name || guest.categoryText || "",
          }
        : null,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-bold">Template Pesan</h1>
      </div>

      <MessageTemplatesManager invitations={data} />
    </div>
  );
}
