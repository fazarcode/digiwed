"use client";
import { useEffect, useRef, useState } from "react";
import {
  Camera,
  ScanLine,
  ClipboardList,
  Settings2,
  UserCog,
  UserPlus,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import CheckInClient from "@/components/dashboard/check-in-client";
import AttendanceClient from "@/components/dashboard/attendance-client";
import DeviceScanClient from "@/components/dashboard/device-scan-client";
import AttendanceExtras from "@/components/dashboard/attendance-extras";

// Workspace terpadu: tab adalah state React, BUKAN route. Dialog Operator + Device + Meja
// muncul sekali per SESI browser (disimpan di sessionStorage) dan dipakai bersama
// oleh Scan Kamera / Scan Device / Kehadiran Manual.
const TABS = [
  { key: "camera", label: "Scan Kamera", icon: Camera },
  { key: "device", label: "Scan Device", icon: ScanLine },
  { key: "manual", label: "Edit Kehadiran Manual", icon: ClipboardList },
];

const SS_OPERATOR = "checkin.operator";
const SS_DEVICE = "checkin.device";
const SS_TABLE = "checkin.table";
const FILTER_STORAGE_KEY = "attendance.filters";

const GENDERS = [
  { value: "", label: "Tidak diisi" },
  { value: "MALE", label: "Laki-laki" },
  { value: "FEMALE", label: "Perempuan" },
  { value: "OTHER", label: "Lainnya" },
];

export default function CheckinAttendanceClient({
  initialMode = "camera",
  checkinInvitations = [],
  checkinDevices = [],
  attendanceInvitations = [],
  attendanceDevices = [],
  categories = [],
  guestSides = [],
}) {
  const [mode, setMode] = useState(
    TABS.some((t) => t.key === initialMode) ? initialMode : "camera",
  );
  const [operator, setOperator] = useState("");
  const [deviceId, setDeviceId] = useState("");
  const [tableName, setTableName] = useState("");
  const [setupOpen, setSetupOpen] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [devs, setDevs] = useState(checkinDevices);
  const [newDevName, setNewDevName] = useState("");
  const [addingDev, setAddingDev] = useState(false);
  const [draftOp, setDraftOp] = useState("");
  const [draftDev, setDraftDev] = useState("");
  const [draftTable, setDraftTable] = useState("");

  // ---- Tambah Tamu (khusus tamu baru) ----
  const [addGuestOpen, setAddGuestOpen] = useState(false);
  const [agInvitationId, setAgInvitationId] = useState(
    attendanceInvitations[0]?.id || "",
  );
  const [agName, setAgName] = useState("");
  const [agPhone, setAgPhone] = useState("");
  const [agType, setAgType] = useState("INDIVIDUAL");
  const [agQuota, setAgQuota] = useState(1);
  const [agCategoryId, setAgCategoryId] = useState("");
  const [agGender, setAgGender] = useState("");
  const [agSideId, setAgSideId] = useState("");
  const [agBusy, setAgBusy] = useState(false);
  const agExtrasRef = useRef(null);

  // ---- Popup setelah check-in ----
  const [checkedIn, setCheckedIn] = useState(null); // { guest, count, checkInId }
  const [ciCount, setCiCount] = useState(1);
  const [ciBusy, setCiBusy] = useState(false);
  const ciExtrasRef = useRef(null);

  // Scanner device ditunda selama ada dialog terbuka
  const dialogOpen = setupOpen || addGuestOpen || !!checkedIn;

  // Dinaikkan setiap ada tamu baru / check-in baru supaya tabel Kehadiran Manual memuat ulang
  const [refreshKey, setRefreshKey] = useState(0);
  const bumpAttendance = () => setRefreshKey((k) => k + 1);

  const openPostCheckin = (guest, count, checkInId) => {
    setCheckedIn({ guest, count, checkInId });
    setCiCount(count);
    bumpAttendance();
  };

  // Satu tombol Simpan: ubah jumlah hadir (jika berubah) + simpan suvenir & hadiah
  const saveCheckedIn = async () => {
    if (!checkedIn) return;
    setCiBusy(true);
    try {
      const n = Math.max(1, parseInt(ciCount, 10) || 1);
      if (checkedIn.checkInId && n !== checkedIn.count) {
        const res = await fetch(`/api/attendance/${checkedIn.checkInId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            count: n,
            operatorName: operator,
            tableName: tableName || null,
          }),
        });
        const d = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(d.error || "Gagal menyimpan jumlah hadir");
        setCheckedIn((s) => ({ ...s, count: n }));
      }
      const ok = await ciExtrasRef.current?.saveAll();
      if (ok === false) return; // toast error sudah tampil, popup tetap terbuka
      toast.success("Kehadiran, suvenir & hadiah tersimpan");
      bumpAttendance();
      setCheckedIn(null);
    } catch (e) {
      toast.error(e.message || "Gagal menyimpan");
    } finally {
      setCiBusy(false);
    }
  };

  // Batas input jumlah: ketat = sisa kuota (di luar check-in ini), fleksibel = 50
  const ciStrict = checkedIn?.guest?.invitation?.quotaMode === "STRICT";
  const ciMax = ciStrict
    ? Math.max(
        1,
        (checkedIn?.guest?.quota ?? 1) -
          ((checkedIn?.guest?.checkedInCount ?? 0) - (checkedIn?.count ?? 0)),
      )
    : 50;

  const addDevice = async () => {
    if (!newDevName.trim()) return;
    setAddingDev(true);
    try {
      const res = await fetch("/api/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newDevName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal");
      const dev = { id: data.item.id, name: data.item.name };
      setDevs((list) => [...list, dev]);
      setDraftDev(dev.id);
      setNewDevName("");
    } catch (e) {
      toast.error(e.message || "Gagal menambah device");
    } finally {
      setAddingDev(false);
    }
  };

  // Saat mount (hanya di client): pulihkan operator/device/meja dari sessionStorage.
  useEffect(() => {
    try {
      const op = (sessionStorage.getItem(SS_OPERATOR) || "").trim();
      const dev = sessionStorage.getItem(SS_DEVICE) || "";
      const tbl = sessionStorage.getItem(SS_TABLE) || "";
      if (op) {
        setOperator(op);
        const validDev = dev && devs.find((d) => d.id === dev) ? dev : "";
        setDeviceId(validDev);
        setTableName(tbl);
        setConfigured(true);
        setSetupOpen(false);
        setDraftOp(op);
        setDraftDev(validDev);
        setDraftTable(tbl);
      } else {
        setDraftOp("");
        setDraftDev("");
        setDraftTable("");
        setSetupOpen(true);
      }
    } catch {
      setSetupOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const confirmSetup = () => {
    if (!draftOp.trim()) return;
    const op = draftOp.trim();
    const dev = draftDev || "";
    const tbl = draftTable.trim();
    setOperator(op);
    setDeviceId(dev);
    setTableName(tbl);
    setConfigured(true);
    setSetupOpen(false);
    try {
      sessionStorage.setItem(SS_OPERATOR, op);
      sessionStorage.setItem(SS_DEVICE, dev);
      sessionStorage.setItem(SS_TABLE, tbl);
    } catch {}
  };

  const openChange = () => {
    setDraftOp(operator);
    setDraftDev(deviceId);
    setDraftTable(tableName);
    setSetupOpen(true);
  };
  const deviceName =
    devs.find((d) => d.id === deviceId)?.name || "Tanpa device";

  // Undangan sengaja TIDAK di-reset, supaya undangan terakhir tetap terpilih
  // saat menambah banyak tamu berturut-turut.
  const resetAddGuest = () => {
    setAgName("");
    setAgPhone("");
    setAgType("INDIVIDUAL");
    setAgQuota(1);
    setAgCategoryId("");
    setAgGender("");
    setAgSideId("");
  };

  // Buka form Tambah Tamu: undangan mengikuti filter Undangan di Kehadiran Manual.
  // Kalau filter "Semua Undangan" (kosong), pakai undangan yang terakhir dipilih.
  const openAddGuest = () => {
    resetAddGuest();
    try {
      const raw = localStorage.getItem(FILTER_STORAGE_KEY);
      const f = raw ? JSON.parse(raw) : null;

      if (
        f?.invitationId &&
        attendanceInvitations.some((i) => i.id === f.invitationId)
      ) {
        setAgInvitationId(f.invitationId);
      } else if (!attendanceInvitations.some((i) => i.id === agInvitationId)) {
        setAgInvitationId(attendanceInvitations[0]?.id || "");
      }
    } catch {}
    setAddGuestOpen(true);
  };

  // Kategori & sisi: hanya milik undangan yang dipilih.
  const agCategories = categories.filter(
    (c) => c.invitationId === agInvitationId,
  );
  const agSides = guestSides.filter((s) => s.invitationId === agInvitationId);

  const submitAddGuest = async () => {
    if (!configured) {
      toast.error("Atur operator & device dulu");
      setSetupOpen(true);
      return;
    }
    if (!agInvitationId) {
      toast.error("Pilih undangan");
      return;
    }
    if (!agName.trim()) {
      toast.error("Nama tamu wajib diisi");
      return;
    }
    setAgBusy(true);
    try {
      // 1) Cegah duplikat: tamu dengan nama (+telepon) yang sama tidak boleh dibuat ulang.
      const listRes = await fetch(`/api/invitations/${agInvitationId}/guests`);
      if (listRes.ok) {
        const { items = [] } = await listRes.json();
        const nameL = agName.trim().toLowerCase();
        const phoneL = agPhone.trim();
        const dupe = items.find(
          (g) =>
            (g.name || "").trim().toLowerCase() === nameL &&
            (!phoneL || (g.phone || "").trim() === phoneL),
        );
        if (dupe) {
          toast.error(
            `"${dupe.name}" sudah ada. Gunakan Scan/Edit Kehadiran Manual untuk check-in.`,
          );
          setAgBusy(false);
          return;
        }
      }
      // 2) Buat tamu asli.
      const quota = Math.max(
        1,
        parseInt(agQuota, 10) || (agType === "GROUP" ? 2 : 1),
      );
      const createRes = await fetch(
        `/api/invitations/${agInvitationId}/guests`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: agName.trim(),
            phone: agPhone.trim() || null,
            guestType: agType,
            quota,
            categoryId: agCategoryId || null,
            gender: agGender || null,
            sideId: agSideId || null,
          }),
        },
      );
      const createData = await createRes.json();
      if (!createRes.ok || !createData.item)
        throw new Error(createData.error || "Gagal membuat tamu");
      const token = createData.item.token;
      // 3) Langsung check-in.
      const count = agType === "GROUP" ? quota : 1;
      const ciRes = await fetch("/api/guests/lookup/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          deviceId: deviceId || null,
          operatorName: operator,
          tableName: tableName || null,
          count,
        }),
      });
      const ciData = await ciRes.json();
      if (!ciRes.ok || !ciData.guest)
        throw new Error(ciData.error || "Tamu dibuat tetapi check-in gagal");
      // 4) Simpan suvenir / hadiah yang diisi di form (jika ada).
      await agExtrasRef.current?.saveAll({
        guestId: ciData.guest.id,
        guestName: ciData.guest.name,
        checkInId: ciData.checkInId,
      });
      toast.success(`✓ ${ciData.guest.name} ditambahkan & sudah check-in`);
      bumpAttendance();
      setAddGuestOpen(false);
      resetAddGuest();
    } catch (e) {
      toast.error(e.message || "Terjadi kesalahan");
    } finally {
      setAgBusy(false);
    }
  };

  const catOf = (g) =>
    (g?.category && typeof g.category === "object"
      ? g.category.name
      : g?.category) || null;
  const typeLabel = (t) => (t === "GROUP" ? "Grup" : "Individu");

  return (
    <div className="space-y-6">
      {/* Dialog pengaturan Operator + Device + Meja (sekali per sesi) */}
      <Dialog
        open={setupOpen}
        onOpenChange={(o) => {
          if (!o && configured) setSetupOpen(false);
        }}
      >
        <DialogContent
          onInteractOutside={(e) => !configured && e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              Operator, Device &amp; Meja
            </DialogTitle>
            <DialogDescription>
              Atur siapa yang melakukan check-in, device yang dipakai, dan meja.
              Pengaturan ini dipakai di Scan Kamera, Scan Device, dan Kehadiran
              Manual, serta diingat selama sesi browser.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nama Operator *</Label>
              <Input
                value={draftOp}
                onChange={(e) => setDraftOp(e.target.value)}
                placeholder="mis. Sarah"
                onKeyDown={(e) => e.key === "Enter" && confirmSetup()}
                data-testid="setup-operator-input"
              />
            </div>
            <div>
              <Label>Device</Label>
              <select
                value={draftDev}
                onChange={(e) => setDraftDev(e.target.value)}
                className="w-full h-10 px-3 rounded-md border text-sm bg-white"
                data-testid="setup-device-select"
              >
                <option value="">Tanpa device</option>
                {devs.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
              <div className="flex gap-2 mt-2">
                <Input
                  value={newDevName}
                  onChange={(e) => setNewDevName(e.target.value)}
                  placeholder="＋ Tambah nama device baru"
                  className="h-9 text-sm"
                  data-testid="setup-new-device-input"
                  onKeyDown={(e) =>
                    e.key === "Enter" && (e.preventDefault(), addDevice())
                  }
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addDevice}
                  disabled={addingDev || !newDevName.trim()}
                  data-testid="setup-add-device-btn"
                >
                  Tambah
                </Button>
              </div>
            </div>
            <div>
              <Label>Meja</Label>
              <Input
                value={draftTable}
                onChange={(e) => setDraftTable(e.target.value)}
                placeholder="mis. Meja 1 / Registrasi A"
                onKeyDown={(e) => e.key === "Enter" && confirmSetup()}
                data-testid="setup-table-input"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={confirmSetup}
              disabled={!draftOp.trim()}
              className="bg-primary"
              data-testid="setup-continue-btn"
            >
              Lanjutkan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Banner operator/device/meja + Tambah Tamu */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/15 bg-white px-4 py-3">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <UserCog className="h-4 w-4 text-primary" />
          <span>
            Operator: <strong>{operator || "—"}</strong>
          </span>
          <span className="text-muted-foreground">•</span>
          <span>
            Device: <strong>{deviceName}</strong>
          </span>
          <span className="text-muted-foreground">•</span>
          <span>
            Meja: <strong>{tableName || "—"}</strong>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={openAddGuest}
            data-testid="add-guest-btn"
          >
            <UserPlus className="h-4 w-4 mr-1" />
            Tambah Tamu
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={openChange}
            data-testid="change-operator-btn"
          >
            <Settings2 className="h-4 w-4 mr-1" />
            Ubah Operator/Device/Meja
          </Button>
        </div>
      </div>

      {/* Dialog Tambah Tamu — membuat tamu ASLI lalu langsung check-in */}
      <Dialog open={addGuestOpen} onOpenChange={setAddGuestOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Tambah Tamu
            </DialogTitle>
            <DialogDescription>
              Hanya untuk tamu yang BELUM ada di daftar. Tamu akan dibuat lalu
              langsung di-check-in.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Undangan *</Label>
              <select
                value={agInvitationId}
                onChange={(e) => {
                  setAgInvitationId(e.target.value);
                  setAgCategoryId("");
                  setAgSideId("");
                }}
                className="w-full h-10 px-3 rounded-md border text-sm bg-white"
                data-testid="ag-invitation-select"
              >
                {attendanceInvitations.length === 0 && (
                  <option value="">Belum ada undangan</option>
                )}
                {attendanceInvitations.map((i) => (
                  <option key={i.id} value={i.id}>
                    {[i.brideName, i.groomName].filter(Boolean).join(" & ") ||
                      "Tanpa judul"}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Nama Tamu *</Label>
              <Input
                value={agName}
                onChange={(e) => setAgName(e.target.value)}
                placeholder="mis. Ahmad Fauzan"
                data-testid="ag-name-input"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Telepon</Label>
                <Input
                  value={agPhone}
                  onChange={(e) => setAgPhone(e.target.value)}
                  placeholder="Opsional"
                  data-testid="ag-phone-input"
                />
              </div>
              <div>
                <Label>Tipe</Label>
                <select
                  value={agType}
                  onChange={(e) => {
                    setAgType(e.target.value);
                    setAgQuota(e.target.value === "GROUP" ? 2 : 1);
                  }}
                  className="w-full h-10 px-3 rounded-md border text-sm bg-white"
                  data-testid="ag-type-select"
                >
                  <option value="INDIVIDUAL">Individu</option>
                  <option value="GROUP">Grup</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Kuota</Label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={agQuota}
                  onChange={(e) =>
                    setAgQuota(parseInt(e.target.value, 10) || 1)
                  }
                  data-testid="ag-quota-input"
                />
              </div>
              <div>
                <Label>Kategori</Label>
                <select
                  value={agCategoryId}
                  onChange={(e) => setAgCategoryId(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border text-sm bg-white"
                  data-testid="ag-category-select"
                >
                  <option value="">Tanpa kategori</option>
                  {agCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {agCategories.length === 0 && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Undangan ini belum punya kategori.
                  </p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Jenis Kelamin</Label>
                <select
                  value={agGender}
                  onChange={(e) => setAgGender(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border text-sm bg-white"
                  data-testid="ag-gender-select"
                >
                  {GENDERS.map((g) => (
                    <option key={g.value} value={g.value}>
                      {g.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Sisi Tamu</Label>
                <select
                  value={agSideId}
                  onChange={(e) => setAgSideId(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border text-sm bg-white"
                  data-testid="ag-side-select"
                >
                  <option value="">Tidak diisi</option>
                  {agSides.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Suvenir + Hadiah (disimpan setelah tamu dibuat & check-in) */}
            <AttendanceExtras
              ref={agExtrasRef}
              invitationId={agInvitationId}
              guestName={agName.trim()}
              operatorName={operator}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddGuestOpen(false)}
              disabled={agBusy}
            >
              Batal
            </Button>
            <Button
              onClick={submitAddGuest}
              disabled={agBusy || !agName.trim() || !agInvitationId}
              className="bg-primary"
              data-testid="ag-save-btn"
            >
              {agBusy ? "Menyimpan…" : "Simpan & Check-in"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Popup setelah check-in (dipakai Scan Kamera / Scan Device) */}
      <Dialog
        open={!!checkedIn}
        onOpenChange={(o) => {
          if (!o) setCheckedIn(null);
        }}
      >
        <DialogContent
          className="max-h-[90vh] overflow-y-auto"
          data-testid="post-checkin-dialog"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-700">
              <CheckCircle2 className="h-5 w-5" />
              Sudah Check-in
            </DialogTitle>
            <DialogDescription>
              Kehadiran tamu telah tercatat. Ubah jumlah hadir bila perlu, lalu
              tekan Simpan.
            </DialogDescription>
          </DialogHeader>
          {checkedIn?.guest && (
            <div className="space-y-3">
              <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-4">
                <div className="flex items-center gap-2">
                  <p
                    className="font-serif text-xl font-bold"
                    data-testid="post-checkin-name"
                  >
                    {checkedIn.guest.name}
                  </p>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary text-white">
                    {typeLabel(checkedIn.guest.guestType)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {catOf(checkedIn.guest) || "Tanpa kategori"} • Kuota:{" "}
                  {checkedIn.guest.quota ?? 1}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg border p-3">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">
                    Jumlah Hadir
                  </p>
                  <Input
                    type="number"
                    min={1}
                    max={ciMax}
                    value={ciCount}
                    onChange={(e) =>
                      setCiCount(parseInt(e.target.value, 10) || 1)
                    }
                    className="h-9 mt-1"
                    data-testid="post-checkin-count-input"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Meja: {tableName || "—"}
                    {ciStrict ? ` • Maks ${ciMax}` : ""}
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">
                    Status
                  </p>
                  <p className="text-lg font-semibold text-emerald-700">
                    Sudah Check-in
                  </p>
                  {typeof checkedIn.guest.checkedInCount === "number" && (
                    <p className="text-xs text-muted-foreground">
                      Total hadir: {checkedIn.guest.checkedInCount}
                    </p>
                  )}
                </div>
              </div>

              <AttendanceExtras
                ref={ciExtrasRef}
                key={checkedIn.checkInId || checkedIn.guest.id}
                invitationId={checkedIn.guest?.invitation?.id}
                guestId={checkedIn.guest.id}
                guestName={checkedIn.guest.name}
                checkInId={checkedIn.checkInId || null}
                operatorName={operator}
              />
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCheckedIn(null)}
              disabled={ciBusy}
            >
              Tutup
            </Button>
            <Button
              onClick={saveCheckedIn}
              disabled={ciBusy}
              className="bg-primary"
              data-testid="post-checkin-done-btn"
            >
              {ciBusy ? "Menyimpan…" : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tab */}
      <div className="flex flex-wrap gap-1 rounded-lg border border-primary/15 bg-white p-1 w-fit">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            data-testid={`mode-${t.key}`}
            onClick={() => setMode(t.key)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition",
              mode === t.key
                ? "bg-primary text-primary-foreground shadow"
                : "text-foreground/70 hover:bg-muted",
            )}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      <div data-testid={`mode-content-${mode}`}>
        {mode === "camera" && (
          <CheckInClient
            invitations={checkinInvitations}
            operator={operator}
            deviceId={deviceId}
            tableName={tableName}
            onCheckedIn={(g, c, cid) => openPostCheckin(g, c, cid)}
          />
        )}
        {mode === "device" && (
          <DeviceScanClient
            operator={operator}
            deviceId={deviceId}
            tableName={tableName}
            paused={dialogOpen}
            onCheckedIn={(g, c, cid) => openPostCheckin(g, c, cid)}
          />
        )}
        {mode === "manual" && (
          <AttendanceClient
            invitations={attendanceInvitations}
            devices={attendanceDevices}
            categories={categories}
            operator={operator}
            tableName={tableName}
            deviceId={deviceId}
            refreshKey={refreshKey}
          />
        )}
      </div>
    </div>
  );
}
