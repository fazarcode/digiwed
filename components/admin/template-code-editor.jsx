"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Editor from "@monaco-editor/react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  ArrowLeft,
  Save,
  Loader2,
  RefreshCw,
  FileCode,
  Lock,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import TemplateDocsPanel from "./template-docs-panel";

const LANG = {
  ".html": "html",
  ".htm": "html",
  ".css": "css",
  ".js": "javascript",
  ".mjs": "javascript",
  ".json": "json",
  ".svg": "xml",
  ".txt": "plaintext",
};
function extOf(p) {
  const i = p.lastIndexOf(".");
  return i >= 0 ? p.slice(i).toLowerCase() : "";
}
function langOf(p) {
  return LANG[extOf(p)] || "plaintext";
}

export default function TemplateCodeEditor({ template }) {
  const api = `/api/admin/templates/${template.id}`;

  const [files, setFiles] = useState([]);
  const [contents, setContents] = useState({}); // relativePath -> string
  const [active, setActive] = useState(null);
  const [dirty, setDirty] = useState({}); // relativePath -> boolean
  const [previewHtml, setPreviewHtml] = useState("");
  const [loadingTree, setLoadingTree] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [showDocs, setShowDocs] = useState(false);

  const debRef = useRef(null);
  const contentsRef = useRef({});
  contentsRef.current = contents;

  const doPreview = useCallback(async () => {
    setPreviewing(true);
    try {
      const res = await fetch(`${api}/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: contentsRef.current }),
      });
      const text = await res.text();
      setPreviewHtml(text);
    } catch {
      /* ignore transient preview errors */
    } finally {
      setPreviewing(false);
    }
  }, [api]);

  const schedulePreview = useCallback(() => {
    if (debRef.current) clearTimeout(debRef.current);
    debRef.current = setTimeout(doPreview, 500);
  }, [doPreview]);

  const loadFile = useCallback(
    async (p) => {
      setActive(p);
      if (contentsRef.current[p] != null) return;
      try {
        const res = await fetch(`${api}/file?path=${encodeURIComponent(p)}`);
        if (!res.ok) {
          toast.error("Failed to load file");
          return;
        }
        const data = await res.json();
        setContents((prev) => ({ ...prev, [p]: data.content }));
      } catch {
        toast.error("Failed to load file");
      }
    },
    [api],
  );

  useEffect(() => {
    (async () => {
      setLoadingTree(true);
      try {
        const res = await fetch(`${api}/files`);
        const data = await res.json();
        const list = data.files || [];
        setFiles(list);
        const idx = list.find((f) =>
          f.path.toLowerCase().endsWith("index.html"),
        );
        const target = idx || list.find((f) => f.editable);
        if (target) {
          const r = await fetch(
            `${api}/file?path=${encodeURIComponent(target.path)}`,
          );
          if (r.ok) {
            const d = await r.json();
            setContents({ [target.path]: d.content });
            setActive(target.path);
          }
        }
      } catch {
        toast.error("Failed to load template files");
      } finally {
        setLoadingTree(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Trigger the first preview as soon as we have some content.
  useEffect(() => {
    if (Object.keys(contents).length && !previewHtml) doPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contents]);

  const onChange = (value) => {
    if (active == null) return;
    setContents((prev) => ({ ...prev, [active]: value ?? "" }));
    setDirty((prev) => ({ ...prev, [active]: true }));
    schedulePreview();
  };

  const save = async () => {
    if (active == null) return;
    setSaving(true);
    try {
      const res = await fetch(`${api}/file`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: active, content: contents[active] ?? "" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setDirty((prev) => ({ ...prev, [active]: false }));
      toast.success("Saved");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/templates">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        </Link>
        <div className="flex-1 min-w-[200px]">
          <h1 className="font-serif text-2xl font-bold leading-tight">
            Edit Code — {template.name}
          </h1>
          <p className="text-xs text-muted-foreground">
            {template.folderPath}
            {active ? ` / ${active}` : ""}
            {active && dirty[active] ? " •" : ""}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowDocs((v) => !v)}
          data-testid="toggle-docs-btn"
        >
          <BookOpen className="h-4 w-4 mr-1" />
          Payload &amp; Variables
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={doPreview}
          disabled={previewing}
        >
          {previewing ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-1" />
          )}
          Refresh Preview
        </Button>
        <Button
          size="sm"
          className="bg-primary"
          onClick={save}
          disabled={saving || active == null}
        >
          {saving ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-1" />
          )}
          Save
        </Button>
      </div>

      {showDocs && <TemplateDocsPanel />}

      <div className="grid grid-cols-12 gap-3 h-[74vh]">
        <div className="col-span-3 lg:col-span-2 rounded-lg border border-primary/10 bg-white overflow-auto">
          <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground border-b">
            Files
          </div>
          {loadingTree ? (
            <div className="p-4 text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          ) : (
            <ul className="py-1">
              {files.map((f) => (
                <li key={f.path}>
                  <button
                    type="button"
                    disabled={!f.editable}
                    onClick={() => f.editable && loadFile(f.path)}
                    title={
                      f.editable ? f.path : `${f.path} (binary — read only)`
                    }
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-1.5 text-left text-sm truncate transition",
                      f.editable
                        ? "hover:bg-muted"
                        : "opacity-50 cursor-not-allowed",
                      active === f.path
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-foreground/80",
                    )}
                  >
                    {f.editable ? (
                      <FileCode className="h-3.5 w-3.5 shrink-0" />
                    ) : (
                      <Lock className="h-3.5 w-3.5 shrink-0" />
                    )}
                    <span className="truncate">{f.path}</span>
                    {dirty[f.path] ? (
                      <span className="ml-auto text-primary">•</span>
                    ) : null}
                  </button>
                </li>
              ))}
              {files.length === 0 && (
                <li className="px-3 py-2 text-sm text-muted-foreground">
                  No files
                </li>
              )}
            </ul>
          )}
        </div>

        {/* Monaco editor */}
        <div className="col-span-9 lg:col-span-6 rounded-lg border border-primary/10 overflow-hidden bg-[#1e1e1e]">
          {active == null ? (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
              Select a file to edit
            </div>
          ) : (
            <Editor
              height="100%"
              theme="vs-dark"
              path={active}
              language={langOf(active)}
              value={contents[active] ?? ""}
              onChange={onChange}
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                wordWrap: "on",
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
              }}
              loading={
                <div className="h-full flex items-center justify-center text-sm text-white/60">
                  Loading editor…
                </div>
              }
            />
          )}
        </div>

        {/* Live preview (sandboxed, no same-origin) */}
        <div className="col-span-12 lg:col-span-4 rounded-lg border border-primary/10 overflow-hidden bg-white flex flex-col">
          <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground border-b flex items-center justify-between">
            <span>Live Preview</span>
            {previewing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : null}
          </div>
          <iframe
            title="Template live preview"
            sandbox="allow-scripts"
            srcDoc={previewHtml}
            className="w-full flex-1 border-0 bg-white"
          />
        </div>
      </div>
    </div>
  );
}
