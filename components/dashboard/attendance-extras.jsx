"use client";
import {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useState,
} from "react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

// Form Suvenir + Hadiah/Angpau yang dipakai bersama oleh:
//  - popup "Sudah Check-in"   (disimpan lewat ref.saveAll() dari tombol Simpan tunggal)
//  - dialog "Edit Kehadiran"  (disimpan lewat ref.saveAll())
//  - dialog "Tambah Tamu"     (disimpan lewat ref.saveAll() setelah tamu dibuat)
// Tidak ada tombol simpan di dalam komponen ini.
const AttendanceExtras = forwardRef(function AttendanceExtras(
  {
    invitationId,
    guestId = null,
    guestName = "",
    checkInId = null,
    operatorName = "",
  },
  ref,
) {
  const uid = useId();
  const [svList, setSvList] = useState([]);
  const [svSelect, setSvSelect] = useState("");
  const [svQty, setSvQty] = useState(1);
  const [giftMode, setGiftMode] = useState("none"); // none | money | goods
  const [giftAmount, setGiftAmount] = useState("");
  const [giftItem, setGiftItem] = useState("");
  const [giftNote, setGiftNote] = useState("");
  const [existingGift, setExistingGift] = useState(null);

  // Daftar suvenir milik undangan
  useEffect(() => {
    let alive = true;
    setSvList([]);
    setSvSelect("");
    setSvQty(1);
    if (!invitationId) return undefined;
    fetch(`/api/invitations/${invitationId}/souvenirs`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive && d) setSvList((d.items || []).filter((x) => x.active));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [invitationId]);

  // Kalau tamu ini sudah punya catatan hadiah, tampilkan (dan isi otomatis ke form)
  useEffect(() => {
    let alive = true;
    setExistingGift(null);
    setGiftMode("none");
    setGiftAmount("");
    setGiftItem("");
    setGiftNote("");
    if (!invitationId || !guestId) return undefined;
    fetch(`/api/invitations/${invitationId}/gift-entries`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!alive || !d) return;
        const list = d.items || d.entries || [];
        const mine = list.filter((e) => e.guestId === guestId);
        const pick =
          (checkInId && mine.find((e) => e.checkInId === checkInId)) || mine[0];
        if (!pick) return;
        setExistingGift(pick);
        if (pick.kind === "MONEY") {
          setGiftMode("money");
          setGiftAmount(pick.amount != null ? String(Number(pick.amount)) : "");
        } else {
          setGiftMode("goods");
          setGiftItem(pick.itemName || "");
        }
        setGiftNote(pick.notes || "");
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [invitationId, guestId, checkInId]);

  // ov = nilai yang baru diketahui setelah tamu/check-in dibuat { guestId, guestName, checkInId }
  const saveSouvenir = async (ov = {}) => {
    if (!svSelect) return true; // tidak ada yang perlu disimpan
    const gid = ov.guestId ?? guestId;
    if (!invitationId || !gid) {
      toast.error("Data tamu belum siap");
      return false;
    }
    try {
      const r = await fetch(
        `/api/invitations/${invitationId}/souvenir-distributions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            souvenirId: svSelect,
            guestId: gid,
            quantity: parseInt(svQty, 10) || 0,
            operatorName,
            checkInId: (ov.checkInId ?? checkInId) || null,
          }),
        },
      );
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Gagal menyimpan suvenir");
      setSvList((list) =>
        list.map((x) =>
          x.id === svSelect
            ? { ...x, remaining: d.remaining, distributed: d.distributed }
            : x,
        ),
      );
      return true;
    } catch (e) {
      toast.error(e.message);
      return false;
    }
  };

  const saveGift = async (ov = {}) => {
    if (giftMode === "none") return true;
    const gid = ov.guestId ?? guestId;
    if (!invitationId || !gid) {
      toast.error("Data tamu belum siap");
      return false;
    }
    try {
      const body = {
        giverName: ov.guestName ?? guestName,
        guestId: gid,
        notes: giftNote || null,
        checkInId: (ov.checkInId ?? checkInId) || null,
      };
      if (giftMode === "money") {
        body.kind = "MONEY";
        body.amount = giftAmount || null;
      } else {
        body.kind = "GOODS";
        body.itemName = giftItem || null;
      }
      const r = await fetch(`/api/invitations/${invitationId}/gift-entries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Gagal menyimpan hadiah");
      return true;
    } catch (e) {
      toast.error(e.message);
      return false;
    }
  };

  useImperativeHandle(ref, () => ({
    saveAll: async (ov = {}) => {
      const a = await saveSouvenir(ov);
      const b = await saveGift(ov);
      return a && b;
    },
  }));

  const rupiah = (n) => `Rp ${Number(n).toLocaleString("id-ID")}`;

  return (
    <div className="space-y-3">
      {/* Suvenir */}
      <div
        className="rounded-lg border p-3 space-y-2"
        data-testid="post-souvenir-section"
      >
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          Suvenir
        </p>
        {svList.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Belum ada suvenir yang diatur.
          </p>
        ) : (
          <div className="flex flex-wrap items-end gap-2">
            <select
              value={svSelect}
              onChange={(e) => setSvSelect(e.target.value)}
              className="h-9 px-2 rounded-md border text-sm bg-white"
              data-testid="post-souvenir-select"
            >
              <option value="">Pilih…</option>
              {svList.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name} (Tersedia: {x.remaining})
                </option>
              ))}
            </select>
            <Input
              type="number"
              min={0}
              value={svQty}
              onChange={(e) => setSvQty(parseInt(e.target.value, 10) || 0)}
              className="h-9 w-20"
              data-testid="post-souvenir-qty"
            />
          </div>
        )}
      </div>

      {/* Hadiah / Angpau */}
      <div
        className="rounded-lg border p-3 space-y-2"
        data-testid="post-gift-section"
      >
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          Hadiah / Angpau
        </p>
        {existingGift && (
          <p
            className="text-xs rounded-md bg-emerald-50 text-emerald-800 px-2 py-1.5"
            data-testid="existing-gift-info"
          >
            Sudah tercatat:{" "}
            {existingGift.kind === "MONEY"
              ? `Angpau ${existingGift.amount != null ? rupiah(existingGift.amount) : ""}`
              : `Hadiah ${existingGift.itemName || ""}`}
            {existingGift.notes ? ` — ${existingGift.notes}` : ""}
          </p>
        )}
        <div className="flex flex-wrap gap-3 text-sm">
          {["none", "money", "goods"].map((m) => (
            <label key={m} className="flex items-center gap-1">
              <input
                type="radio"
                name={`giftMode-${uid}`}
                checked={giftMode === m}
                onChange={() => setGiftMode(m)}
                data-testid={`post-gift-mode-${m}`}
              />
              {m === "none"
                ? "Tidak Ada Hadiah"
                : m === "money"
                  ? "Memberi Angpau"
                  : "Memberi Hadiah"}
            </label>
          ))}
        </div>
        {giftMode !== "none" && (
          <div className="flex flex-wrap gap-2">
            {giftMode === "money" ? (
              <Input
                type="number"
                placeholder="Nominal"
                value={giftAmount}
                onChange={(e) => setGiftAmount(e.target.value)}
                className="h-9 w-32"
                data-testid="post-gift-amount"
              />
            ) : (
              <Input
                placeholder="Nama barang"
                value={giftItem}
                onChange={(e) => setGiftItem(e.target.value)}
                className="h-9 w-40"
                data-testid="post-gift-item"
              />
            )}
            <Input
              placeholder="Catatan (opsional)"
              value={giftNote}
              onChange={(e) => setGiftNote(e.target.value)}
              className="h-9 flex-1 min-w-[140px]"
            />
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Suvenir dan hadiah akan disimpan bersama saat kamu menekan tombol
        Simpan.
      </p>
    </div>
  );
});

export default AttendanceExtras;
