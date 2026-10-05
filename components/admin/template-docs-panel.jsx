"use client";
/**
 * TemplateDocsPanel
 * ------------------
 * Dokumentasi payload & variabel yang bisa dipakai di template HTML.
 * Dipisah dari TemplateCodeEditor.jsx supaya lebih mudah dirawat.
 *
 * Sumber kebenaran: lib/template-engine.js
 *  - UPPERCASE tokens        -> object hasil buildData()
 *  - lowercase scalar tokens -> LOWER_SCALARS (isi datanya dari buildInvitationTemplateData())
 *  - allX tokens             -> LOWER_ALL (JSON array penuh)
 *  - numbered tokens         -> LOWER_NUMBERED, pola {tipe}{N}.field
 *
 * PENTING: field persis di dalam guestN / momentN / giftN belum bisa
 * dipastikan dari template-engine.js saja — itu ditentukan di
 * lib/invitation-data.js (buildInvitationTemplateData). Bagian itu ditandai
 * "perlu verifikasi" di bawah. Kalau sudah ada isi file itu, tinggal
 * update array NUMBERED_ENTITIES di bawah ini.
 */

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

function Section({ title, subtitle, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-muted/40 hover:bg-muted/60 text-left"
      >
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          {subtitle ? (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
        {open ? (
          <ChevronDown className="h-4 w-4 shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0" />
        )}
      </button>
      {open ? <div className="p-3 space-y-3">{children}</div> : null}
    </div>
  );
}

function Code({ children, tone = "sky" }) {
  const toneClass = {
    sky: "text-sky-300",
    emerald: "text-emerald-300",
    amber: "text-amber-300",
    violet: "text-violet-300",
    rose: "text-rose-300",
  }[tone];
  return (
    <pre
      className={cn(
        "rounded bg-[#1e1e1e] p-2 overflow-auto text-xs",
        toneClass,
      )}
    >
      {children}
    </pre>
  );
}

// UPPERCASE tokens — persis dari object return buildData() di template-engine.js
const UPPERCASE_TOKENS = [
  ["{BRIDE_NAME}", "Nama mempelai wanita"],
  ["{GROOM_NAME}", "Nama mempelai pria"],
  [
    "{BRIDE_PARENTS}",
    "Gabungan brideFather & brideMother (otomatis, sudah nl2br)",
  ],
  [
    "{GROOM_PARENTS}",
    "Gabungan groomFather & groomMother (otomatis, sudah nl2br)",
  ],
  ["{BRIDE_FATHER}", "Nama ayah mempelai wanita"],
  ["{BRIDE_MOTHER}", "Nama ibu mempelai wanita"],
  ["{GROOM_FATHER}", "Nama ayah mempelai pria"],
  ["{GROOM_MOTHER}", "Nama ibu mempelai pria"],
  [
    "{WEDDING_DATE}",
    "Tanggal acara pertama, format panjang (contoh: Saturday, 12 April 2026)",
  ],
  [
    "{WEDDING_ISO}",
    "Tanggal+jam acara pertama dalam format ISO, untuk dipakai di countdown JS",
  ],
  ["{WEDDING_TIME}", "Jam acara pertama, string mentah dari data event"],
  ["{VENUE}", "Nama venue acara pertama"],
  ["{ADDRESS}", "Alamat acara pertama"],
  [
    "{MAP}",
    'Tombol <a> siap pakai "Open in Google Maps" (kosong kalau mapUrl tidak diisi)',
  ],
  ["{MAP_URL}", "URL Google Maps mentah acara pertama"],
  ["{QUOTE}", "Kutipan/quote undangan"],
  [
    "{LOVE_STORY}",
    "HTML daftar cerita cinta (loveStory), sudah dirender lengkap",
  ],
  ["{COVER_IMAGE}", "URL foto cover"],
  ["{GALLERY}", "HTML grid galeri foto, sudah dirender lengkap"],
  ["{VIDEO}", "HTML embed video (YouTube/Vimeo/file), sudah dirender lengkap"],
  ["{MUSIC}", "HTML audio player + tombol toggle musik"],
  [
    "{COUNTDOWN}",
    "HTML box countdown (butuh JS terpisah di template untuk jalan)",
  ],
  [
    "{RSVP_FORM}",
    "Section RSVP lengkap (form / status sudah RSVP), kosong jika RSVP dimatikan",
  ],
  [
    "{MESSAGE_FORM}",
    "Section form ucapan/doa, kosong jika message form dimatikan",
  ],
  ["{GIFT_FORM}", "Section form hadiah/amplop digital, selalu tampil"],
  [
    "{QR_CODE}",
    "HTML QR check-in tamu (tergantung mode RSVP_FIRST/QR_FIRST & status RSVP)",
  ],
  ["{GUEST_NAME}", 'Nama tamu dari link personal, fallback "Beloved Guest"'],
  ["{PRIMARY_COLOR}", "Warna primer tema"],
  ["{SECONDARY_COLOR}", "Warna sekunder tema"],
  ["{BACKGROUND_COLOR}", "Warna latar tema"],
  ["{FONT_FAMILY}", "Font tema"],
  ["{BORDER_RADIUS}", "Radius sudut elemen (angka, px)"],
];

// Lowercase scalar tokens — dari LOWER_SCALARS. Datanya diisi oleh
// buildInvitationTemplateData() (lib/invitation-data.js). Beberapa di sini
// TIDAK punya padanan UPPERCASE, jadi ini satu-satunya cara mengaksesnya.
const LOWER_SCALAR_TOKENS = [
  "{brideName}",
  "{groomName}",
  "{brideParents}",
  "{groomParents}",
  "{groomFather}",
  "{groomMother}",
  "{brideFather}",
  "{brideMother}",
  "{quote}",
  "{coverImage}",
  "{bridePhoto}",
  "{groomPhoto}",
  "{primaryColor}",
  "{secondaryColor}",
  "{backgroundColor}",
  "{fontFamily}",
  "{buttonStyle}",
  "{borderRadius}",
  "{animation}",
  "{eventDate}",
  "{eventTime}",
  "{venue}",
  "{address}",
  "{googleMapsUrl}",
];

const LOWER_ALL_TOKENS = [
  ["{allGallery}", "Array JSON semua foto galeri"],
  ["{allGuests}", "Array JSON semua tamu"],
  ["{allVideos}", "Array JSON semua video"],
  ["{allMusic}", "Array JSON data musik"],
  ["{allRsvp}", "Array JSON semua RSVP yang masuk"],
  ["{allMoments}", 'Array JSON semua "moments"'],
  ["{allEvents}", "Array JSON semua acara/event"],
  ["{allStories}", "Array JSON semua cerita cinta"],
  ["{allGifts}", "Array JSON semua hadiah yang masuk"],
];

// Numbered/indexed tokens — pola {tipe}{N}.field, tipe 1-based index.
// Sumber kebenaran: lib/invitation-data.js -> buildInvitationTemplateData()
// (fungsi sGallery/sGuest/sVideo/sMusic/sRsvp/sMoment/sGift/sEvent/sStory).
// Semua field di bawah sudah diverifikasi langsung dari sanitizer masing-masing.
const NUMBERED_ENTITIES = [
  {
    type: "gallery",
    verified: true,
    source: "inv.gallery, urut by order lalu createdAt",
    fields: ["url", "caption", "order"],
    example: "{gallery1.url}",
  },
  {
    type: "video",
    verified: true,
    source: "inv.videos, urut by createdAt",
    fields: ["url", "type (YOUTUBE / VIMEO / FILE)", "title"],
    example: "{video1.title}",
  },
  {
    type: "music",
    verified: true,
    source: "inv.music (relasi 1:1, jadi maksimal music1)",
    fields: ["url", "title", "autoplay (boolean)"],
    example: "{music1.title}",
  },
  {
    type: "event",
    verified: true,
    source: "inv.events (kolom JSON)",
    fields: ["title", "date", "time", "venue", "address", "mapUrl"],
    example: "{event1.title}",
  },
  {
    type: "story",
    verified: true,
    source: "inv.loveStory (kolom JSON)",
    fields: ["date", "title", "story"],
    example: "{story1.title}",
  },
  {
    type: "rsvp",
    verified: true,
    source: "inv.rsvps, urut by createdAt",
    fields: [
      "name",
      "attendance (ATTENDING/NOT_ATTENDING/MAYBE)",
      "rsvpType",
      "type (alias rsvpType)",
      "guestCount",
      "message",
      "+ setiap key custom field dari Rsvp.customData langsung ditaruh flat (contoh: mealPreference), TANPA prefix cf_",
    ],
    example: "{rsvp1.attendance}",
    note: 'Custom field otomatis muncul sebagai {rsvpN.<fieldKey>} — bukan {rsvpN.cf_<fieldKey>}. Prefix "cf_" hanya dipakai di payload POST /api/rsvp, bukan di nama token template.',
  },
  {
    type: "guest",
    verified: true,
    source: "inv.guests, urut by createdAt",
    fields: [
      "name",
      "phone",
      "guestType",
      "gender",
      "guestSide",
      "quota",
      "category",
    ],
    example: "{guest1.name}",
    note: "guest.token dan id SENGAJA tidak diekspos di sini (privasi/keamanan). Token untuk QR check-in hanya tersedia lewat {QR_CODE} / {guestToken} pada link personal tamu, bukan lewat allGuests/guestN.",
  },
  {
    type: "moment",
    verified: true,
    source: "inv.moments, urut by createdAt",
    fields: ["url", "senderName", "message"],
    example: "{moment1.senderName}",
  },
  {
    type: "gift",
    verified: true,
    source:
      "inv.gifts, hanya yang enabled !== false, urut by order lalu createdAt",
    fields: [
      "kind (MONEY = uang / GOODS = barang)",
      "type (alias kind)",
      "provider",
      "accountName",
      "accountNumber",
      "instructions",
      "itemName",
      "description",
      "link",
      "recipientName",
      "image (MONEY: gambar QR/logo · GOODS: gambar produk dari marketplace)",
      "quantity (jumlah barang, untuk GOODS)",
    ],
    example: "{gift1.provider}",
    note: "Field rekening (provider/accountName/accountNumber/instructions) dipakai jenis MONEY, field barang (itemName/description/link/quantity) dipakai jenis GOODS — sisanya berisi string kosong. Untuk tampilan berbeda per jenis, cek {giftN.kind} di JS lewat {allGifts}.",
  },
];

export default function TemplateDocsPanel() {
  return (
    <div
      className="rounded-lg border border-primary/20 bg-muted/30 p-4 text-sm space-y-3"
      data-testid="template-docs-panel"
    >
      <Section
        title="RSVP — POST /api/rsvp"
        subtitle="Form RSVP publik mengirim ke endpoint ini"
        defaultOpen
      >
        <Code tone="emerald">{`POST /api/rsvp
Content-Type: application/json
{
  "invitationId": "<inv.id>",   // hidden field
  "guestId": "<optional>",
  "guestToken": "<optional>",
  "name": "Guest Name",
  "attendance": "ATTENDING | NOT_ATTENDING | MAYBE",
  "rsvpType": "INDIVIDUAL | GROUP",
  "guestCount": 1,
  "message": "optional",
  "cf_<fieldKey>": "value"   // satu per custom RSVP field
}`}</Code>
        <p className="text-muted-foreground text-xs">
          Kirim payload dengan <code>messageOnly: true</code> untuk memakai
          endpoint yang sama khusus form ucapan (lihat MESSAGE_FORM).
        </p>
      </Section>

      <Section
        title="Hadiah — POST /api/public/gift/:slug"
        subtitle="Form GIFT_FORM mengirim ke sini (bukan /api/rsvp)"
      >
        <Code tone="amber">{`POST /api/public/gift/<slug>
Content-Type: multipart/form-data
{
  action: "money",
  giverName: "optional",
  amount: "optional number",
  note: "optional"
}`}</Code>
      </Section>

      <Section
        title="UPPERCASE Tokens"
        subtitle="Blok HTML/teks siap pakai, hasil render otomatis"
      >
        <div className="grid gap-1">
          {UPPERCASE_TOKENS.map(([tok, desc]) => (
            <div
              key={tok}
              className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3 border-b border-dashed border-muted-foreground/20 py-1 last:border-0"
            >
              <code className="text-xs text-sky-700 bg-sky-50 rounded px-1.5 py-0.5 shrink-0 w-fit">
                {tok}
              </code>
              <span className="text-xs text-muted-foreground">{desc}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Lowercase Scalar Tokens"
        subtitle="Nilai mentah (bukan HTML) — auto-escaped, aman untuk atribut"
      >
        <p className="text-xs text-muted-foreground">
          Datanya dipasok oleh <code>buildInvitationTemplateData()</code>. Token
          yang bertanda (*) tidak punya versi UPPERCASE — hanya bisa diakses
          lewat sini.
        </p>
        <div className="flex flex-wrap gap-1.5">
          {LOWER_SCALAR_TOKENS.map((tok) => {
            const noUpperEquivalent = [
              "{bridePhoto}",
              "{groomPhoto}",
              "{buttonStyle}",
              "{animation}",
              "{googleMapsUrl}",
            ].includes(tok);
            return (
              <code
                key={tok}
                className="text-xs text-violet-700 bg-violet-50 rounded px-1.5 py-0.5"
              >
                {tok}
                {noUpperEquivalent ? " *" : ""}
              </code>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          Token tak dikenal di luar daftar ini (di luar namespace) dibiarkan apa
          adanya, tidak diganti.
        </p>
      </Section>

      <Section
        title='"allX" Tokens'
        subtitle="Array JSON penuh — cocok untuk dikonsumsi lewat JS di template"
      >
        <div className="grid gap-1">
          {LOWER_ALL_TOKENS.map(([tok, desc]) => (
            <div
              key={tok}
              className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3"
            >
              <code className="text-xs text-rose-700 bg-rose-50 rounded px-1.5 py-0.5 shrink-0 w-fit">
                {tok}
              </code>
              <span className="text-xs text-muted-foreground">{desc}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Token Bernomor (Indexed)"
        subtitle="Pola {tipe}{N}.field, N dimulai dari 1"
      >
        <div className="space-y-3">
          {NUMBERED_ENTITIES.map((e) => (
            <div key={e.type} className="border rounded p-2">
              <div className="flex items-center gap-2 mb-1">
                <code className="text-xs font-semibold text-amber-700 bg-amber-50 rounded px-1.5 py-0.5">{`{${e.type}N.field}`}</code>
                {e.verified ? (
                  <span className="text-[10px] uppercase tracking-wide text-emerald-700 bg-emerald-50 rounded-full px-2 py-0.5">
                    terverifikasi
                  </span>
                ) : (
                  <span className="text-[10px] uppercase tracking-wide text-rose-700 bg-rose-50 rounded-full px-2 py-0.5">
                    perlu verifikasi
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mb-1">
                Sumber: {e.source}
              </p>
              <p className="text-xs text-muted-foreground mb-1">
                Field: {e.fields.join(", ")}
              </p>
              <p className="text-xs text-muted-foreground mb-1">
                Contoh: <code className="text-sky-700">{e.example}</code>
              </p>
              {e.note ? (
                <p className="text-xs text-amber-700 bg-amber-50 rounded p-1.5 mt-1">
                  ⚠ {e.note}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Custom RSVP Fields (dinamis)"
        subtitle="Otomatis tersedia begitu field ditambahkan di pengaturan RSVP"
      >
        <Code tone="amber">{`Field label:  Meal Preference
Field key:    mealPreference
Variable:     {rsvp1.mealPreference}
POST body:    cf_mealPreference`}</Code>
      </Section>

      <Section
        title="Asset & URL relatif"
        subtitle="Aturan otomatis dari template-engine.js"
      >
        <p className="text-xs text-muted-foreground">
          Semua atribut <code>href</code>/<code>src</code> yang berisi path
          relatif (bukan <code>http(s):</code>, <code>/</code>,{" "}
          <code>data:</code>, atau <code>#</code>) otomatis diprefix jadi{" "}
          <code>/storage-file/&#123;folderPath&#125;/...</code>. Jadi cukup
          pakai nama file relatif di template, misal{" "}
          <code>src=&quot;bg.jpg&quot;</code>.
        </p>
      </Section>
    </div>
  );
}
