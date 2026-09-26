"use client";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Loader2, CheckCircle2 } from "lucide-react";

// Feature I — preview BEFORE insert: parsed rows + row selection + column mapping + chunked import.
const TARGETS = [
  { key: "name", label: "Name *", guesses: ["name", "nama"] },
  { key: "phone", label: "Phone", guesses: ["phone", "hp", "wa", "telp", "no hp", "nohp", "whatsapp"] },
  { key: "guestType", label: "Guest Type", guesses: ["type", "tipe", "jenis"] },
  { key: "gender", label: "Gender", guesses: ["gender", "jk", "kelamin"] },
  { key: "guestSide", label: "Side", guesses: ["side", "pihak", "sisi"] },
  { key: "categoryName", label: "Category", guesses: ["kategori", "category", "group", "grup"] },
];
const CHUNK = 200;

export default function ImportPreviewDialog({ open, onOpenChange, invitationId, data, onDone }) {
  const columns = data?.columns || [];
  const rows = data?.rows || [];
  const [mapping, setMapping] = useState({});
  const [selected, setSelected] = useState(() => new Set());
  const [categories, setCategories] = useState([]);
  const [defaultCategoryId, setDefaultCategoryId] = useState("");
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);

  // Auto-map columns + select all rows on open.
  useEffect(() => {
    if (!open) return;
    const auto = {};
    for (const t of TARGETS) {
      const col = columns.find((c) => t.guesses.some((g) => c.toLowerCase().includes(g)));
      if (col) auto[t.key] = col;
    }
    setMapping(auto);
    setSelected(new Set(rows.map((_, i) => i)));
    setResult(null);
    setProgress(0);
    fetch(`/api/invitations/${invitationId}/categories`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.items && setCategories(d.items))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const allSelected = selected.size === rows.length && rows.length > 0;
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(rows.map((_, i) => i)));
  const toggleRow = (i) => setSelected((s) => { const n = new Set(s); n.has(i) ? n.delete(i) : n.add(i); return n; });

  const mappedRows = useMemo(() => {
    return [...selected].sort((a, b) => a - b).map((i) => {
      const r = rows[i];
      const obj = {};
      for (const t of TARGETS) { const col = mapping[t.key]; if (col) obj[t.key] = r[col]; }
      return obj;
    });
  }, [selected, mapping, rows]);

  const runImport = async () => {
    if (!mapping.name) return toast.error("Please map the Name column");
    const payloadRows = mappedRows.filter((r) => String(r.name || "").trim());
    if (!payloadRows.length) return toast.error("No rows with a name selected");
    setImporting(true); setProgress(0); setResult(null);
    const agg = { imported: 0, skipped: 0, failed: 0, errors: [] };
    try {
      for (let i = 0; i < payloadRows.length; i += CHUNK) {
        const chunk = payloadRows.slice(i, i + CHUNK);
        const res = await fetch(`/api/invitations/${invitationId}/guests/import-confirm`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rows: chunk, defaultCategoryId: defaultCategoryId || null }),
        });
        const d = await res.json();
        if (!res.ok) throw new Error(d.error || "Import failed");
        agg.imported += d.imported; agg.skipped += d.skipped; agg.failed += d.failed;
        agg.errors.push(...(d.errors || []));
        setProgress(Math.round(Math.min(100, ((i + chunk.length) / payloadRows.length) * 100)));
      }
      setResult(agg);
      toast.success(`Imported ${agg.imported} guests`);
      onDone?.();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !importing && onOpenChange(o)}>
      <DialogContent className="max-w-3xl max-h-[88vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Import Preview</DialogTitle>
          <DialogDescription>
            Nothing is saved until you press Import. {data?.totalRows || rows.length} row(s) parsed{rows.length < (data?.totalRows || 0) ? ` (showing first ${rows.length})` : ""}.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="py-6 text-center space-y-2">
            <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" />
            <p className="font-serif text-xl font-bold">Import Complete</p>
            <p className="text-sm">Imported: <b>{result.imported}</b> · Skipped (duplicates): <b>{result.skipped}</b> · Failed: <b>{result.failed}</b></p>
            {result.errors.length > 0 && (
              <div className="text-left text-xs bg-red-50 rounded-lg p-3 max-h-32 overflow-auto">
                {result.errors.map((e, i) => <div key={i}>Row {e.row}: {e.error}</div>)}
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-auto space-y-4">
            {/* Column mapping */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Map Columns</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {TARGETS.map((t) => (
                  <div key={t.key}>
                    <Label className="text-xs">{t.label}</Label>
                    <select
                      value={mapping[t.key] || ""}
                      onChange={(e) => setMapping((m) => ({ ...m, [t.key]: e.target.value }))}
                      className="w-full h-8 text-sm rounded-md border px-2 bg-white"
                    >
                      <option value="">— none —</option>
                      {columns.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                ))}
                <div>
                  <Label className="text-xs">Default Category</Label>
                  <select value={defaultCategoryId} onChange={(e) => setDefaultCategoryId(e.target.value)} className="w-full h-8 text-sm rounded-md border px-2 bg-white">
                    <option value="">— none —</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}{c.global ? " (global)" : ""}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Rows */}
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 w-10"><input type="checkbox" checked={allSelected} onChange={toggleAll} /></th>
                    <th className="px-3 py-2 text-left">Name</th>
                    <th className="px-3 py-2 text-left">Phone</th>
                    <th className="px-3 py-2 text-left">Category</th>
                  </tr>
                </thead>
                <tbody className="max-h-48">
                  {rows.slice(0, 300).map((r, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-3 py-1.5"><input type="checkbox" checked={selected.has(i)} onChange={() => toggleRow(i)} /></td>
                      <td className="px-3 py-1.5">{mapping.name ? r[mapping.name] : <span className="text-red-500 text-xs">map name</span>}</td>
                      <td className="px-3 py-1.5">{mapping.phone ? r[mapping.phone] : "-"}</td>
                      <td className="px-3 py-1.5">{mapping.categoryName ? r[mapping.categoryName] : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground">{selected.size} of {rows.length} row(s) selected.</p>
          </div>
        )}

        {importing && (
          <div className="mt-2">
            <div className="h-2 bg-muted rounded-full overflow-hidden"><div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} /></div>
            <p className="text-xs text-center text-muted-foreground mt-1">Importing… {progress}%</p>
          </div>
        )}

        <DialogFooter>
          {result ? (
            <Button onClick={() => onOpenChange(false)} className="bg-primary">Done</Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={importing}>Cancel</Button>
              <Button onClick={runImport} disabled={importing || !mapping.name} className="bg-primary">
                {importing ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Importing…</> : `Import ${selected.size} Guest(s)`}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
