import { useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import {
  Download,
  ExternalLink,
  Eye,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileType2,
  Loader2,
  Pencil,
  Presentation,
  UploadCloud,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  ConfirmDelete,
  DatalistInput,
  EmptyState,
  FieldError,
  FilterSelect,
  ListSkeleton,
  PageHeader,
  ResultCount,
  STATUS_FILTER_OPTIONS,
  SearchInput,
} from "@/components/app/common";
import { StatusSelect } from "@/components/app/status";
import { supabase } from "@/integrations/supabase/client";
import { DOCUMENT_CATEGORIES } from "@/lib/constants";
import {
  DOCS_BUCKET,
  currentUserId,
  documentsQuery,
  downloadFile,
  errorMessage,
  logActivity,
  signedUrl,
  uploadFileWithProgress,
  type DocumentRow,
} from "@/lib/data";
import {
  DOCUMENT_EXTENSIONS,
  buildStoragePath,
  documentKind,
  formatBytes,
  getExtension,
  titleFromFileName,
  validateDocumentFile,
  type DocKind,
} from "@/lib/files";

export const Route = createFileRoute("/_authenticated/documents")({
  validateSearch: (s: Record<string, unknown>): { q?: string } =>
    typeof s["q"] === "string" && s["q"] ? { q: s["q"] } : {},
  loader: ({ context }) => context.queryClient.ensureQueryData(documentsQuery),
  pendingComponent: () => <ListSkeleton />,
  head: () => ({
    meta: [
      { title: "My Documents — MyStudySpace" },
      { name: "description", content: "Upload, preview and organize your PDFs, slides and notes." },
      { property: "og:title", content: "My Documents — MyStudySpace" },
      { property: "og:description", content: "Upload, preview and organize your PDFs, slides and notes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DocumentsPage,
});

const KIND_ICON: Record<DocKind, typeof FileText> = {
  pdf: FileType2,
  slides: Presentation,
  word: FileText,
  sheet: FileSpreadsheet,
  image: FileImage,
  text: FileText,
  other: FileText,
};

const TYPE_OPTIONS = [
  { value: "all", label: "All types" },
  { value: "pdf", label: "PDF" },
  { value: "slides", label: "Slides (PPT)" },
  { value: "word", label: "Word (DOC)" },
  { value: "sheet", label: "Sheets" },
  { value: "image", label: "Images" },
  { value: "text", label: "Text notes" },
];

const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "title", label: "Title A–Z" },
  { value: "size", label: "Largest first" },
  { value: "updated", label: "Recently edited" },
];

function DocumentsPage() {
  const { q } = Route.useSearch();
  const { data: docs } = useSuspenseQuery(documentsQuery);
  const queryClient = useQueryClient();
  const [search, setSearch] = useState(q ?? "");
  const [category, setCategory] = useState("all");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("newest");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editing, setEditing] = useState<DocumentRow | null>(null);
  const [previewing, setPreviewing] = useState<DocumentRow | null>(null);

  const categories = useMemo(() => Array.from(new Set(docs.map((d) => d.category))).sort(), [docs]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = docs.filter((d) => {
      if (category !== "all" && d.category !== category) return false;
      if (type !== "all" && documentKind(d.file_name) !== type) return false;
      if (status !== "all" && d.status !== status) return false;
      if (!term) return true;
      return [d.title, d.description ?? "", d.file_name, d.category].some((f) => f.toLowerCase().includes(term));
    });
    return [...list].sort((a, b) => {
      switch (sort) {
        case "oldest": return a.created_at.localeCompare(b.created_at);
        case "title": return a.title.localeCompare(b.title);
        case "size": return b.file_size - a.file_size;
        case "updated": return b.updated_at.localeCompare(a.updated_at);
        default: return b.created_at.localeCompare(a.created_at);
      }
    });
  }, [docs, search, category, type, status, sort]);

  const statusMut = useMutation({
    mutationFn: async ({ doc, value }: { doc: DocumentRow; value: string }) => {
      const { error } = await supabase.from("documents").update({ status: value }).eq("id", doc.id);
      if (error) throw error;
      await logActivity({ section: "documents", item_id: doc.id, item_title: doc.title, action: "status", detail: value });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["activity_log"] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const deleteMut = useMutation({
    mutationFn: async (doc: DocumentRow) => {
      const { error } = await supabase.from("documents").delete().eq("id", doc.id);
      if (error) throw error;
      const { error: sErr } = await supabase.storage.from(DOCS_BUCKET).remove([doc.file_path]);
      if (sErr) console.warn("Storage cleanup failed", sErr);
      await logActivity({ section: "documents", item_id: doc.id, item_title: doc.title, action: "deleted" });
    },
    onSuccess: () => {
      toast.success("Document deleted.");
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["activity_log"] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  async function openDoc(doc: DocumentRow) {
    try {
      const url = await signedUrl(DOCS_BUCKET, doc.file_path);
      window.open(url, "_blank", "noopener");
      void logActivity({ section: "documents", item_id: doc.id, item_title: doc.title, action: "opened" });
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  async function download(doc: DocumentRow) {
    try {
      await downloadFile(DOCS_BUCKET, doc.file_path, doc.file_name);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        tone="docs"
        icon={<FileText />}
        title="My Documents"
        subtitle="PDFs, slides, Word files and notes — stored privately in the cloud."
        action={
          <Button onClick={() => setUploadOpen(true)}>
            <UploadCloud /> Upload documents
          </Button>
        }
      />

      <div className="grid gap-2 sm:flex sm:flex-wrap sm:items-center">
        <SearchInput value={search} onChange={setSearch} placeholder="Search documents…" className="sm:min-w-[260px] sm:flex-1" />
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <FilterSelect label="Category" value={category} onChange={setCategory} options={[{ value: "all", label: "All categories" }, ...categories.map((c) => ({ value: c, label: c }))]} />
          <FilterSelect label="Type" value={type} onChange={setType} options={TYPE_OPTIONS} />
          <FilterSelect label="Status" value={status} onChange={setStatus} options={STATUS_FILTER_OPTIONS} />
          <FilterSelect label="Sort" value={sort} onChange={setSort} options={SORT_OPTIONS} />
        </div>
      </div>

      {docs.length === 0 ? (
        <EmptyState
          icon={<UploadCloud />}
          title="No documents yet"
          text="Upload your first PDF, PPT or Word file. You can select several files at once."
          action={<Button onClick={() => setUploadOpen(true)}><UploadCloud /> Upload documents</Button>}
        />
      ) : filtered.length === 0 ? (
        <EmptyState icon={<FileText />} title="No matches" text="Try a different search or clear the filters." />
      ) : (
        <>
          <ResultCount shown={filtered.length} total={docs.length} noun="documents" />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((doc) => {
              const kind = documentKind(doc.file_name);
              const Icon = KIND_ICON[kind];
              return (
                <article key={doc.id} className="group flex flex-col rounded-2xl border card-surface p-4 transition-colors hover:border-sec-docs/40">
                  <div className="flex items-start gap-3">
                    <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-sec-docs/10 text-sec-docs">
                      <Icon className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-semibold" title={doc.title}>{doc.title}</h3>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {getExtension(doc.file_name).toUpperCase()} · {formatBytes(doc.file_size)} · {formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  {doc.description ? <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{doc.description}</p> : null}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">{doc.category}</span>
                  </div>
                  <div className="mt-auto flex items-center justify-between gap-2 pt-4">
                    <StatusSelect value={doc.status} onChange={(v) => statusMut.mutate({ doc, value: v })} />
                    <div className="flex items-center">
                      <Button variant="ghost" size="icon" aria-label={`Preview ${doc.title}`} onClick={() => setPreviewing(doc)}><Eye /></Button>
                      <Button variant="ghost" size="icon" aria-label={`Open ${doc.title}`} onClick={() => openDoc(doc)}><ExternalLink /></Button>
                      <Button variant="ghost" size="icon" aria-label={`Download ${doc.title}`} onClick={() => download(doc)}><Download /></Button>
                      <Button variant="ghost" size="icon" aria-label={`Edit ${doc.title}`} onClick={() => setEditing(doc)}><Pencil /></Button>
                      <ConfirmDelete itemName={doc.title} busy={deleteMut.isPending} onConfirm={() => deleteMut.mutate(doc)} />
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}

      <UploadDialog open={uploadOpen} onOpenChange={setUploadOpen} existing={docs} />
      {editing ? <EditDialog doc={editing} onClose={() => setEditing(null)} /> : null}
      {previewing ? <PreviewDialog doc={previewing} onClose={() => setPreviewing(null)} onDownload={() => download(previewing)} /> : null}
    </div>
  );
}

type Pending = { file: File; progress: number; state: "waiting" | "uploading" | "done" | "error" | "skipped"; message?: string };

function UploadDialog({ open, onOpenChange, existing }: { open: boolean; onOpenChange: (o: boolean) => void; existing: DocumentRow[] }) {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Pending[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Notes");
  const [allowDuplicates, setAllowDuplicates] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setItems([]); setTitle(""); setDescription(""); setCategory("Notes"); setAllowDuplicates(false); setError(null);
  }

  function addFiles(list: FileList | File[]) {
    const files = Array.from(list);
    const rejected: string[] = [];
    const accepted: Pending[] = [];
    for (const f of files) {
      const err = validateDocumentFile(f);
      if (err) rejected.push(err);
      else accepted.push({ file: f, progress: 0, state: "waiting" });
    }
    if (rejected.length) toast.error(rejected.slice(0, 3).join(" "));
    setItems((prev) => {
      const next = [...prev];
      for (const a of accepted) {
        if (!next.some((p) => p.file.name === a.file.name && p.file.size === a.file.size)) next.push(a);
      }
      return next;
    });
    setError(null);
  }

  function update(i: number, patch: Partial<Pending>) {
    setItems((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  }

  async function start() {
    if (items.length === 0) return setError("Choose at least one file.");
    if (!category.trim()) return setError("Enter a category.");
    setBusy(true);
    let ok = 0;
    let failed = 0;
    let skipped = 0;
    try {
      const userId = await currentUserId();
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (!it || it.state === "done") continue;
        const { file } = it;
        const dup = existing.find((d) => d.file_name === file.name && d.file_size === file.size);
        if (dup && !allowDuplicates) {
          update(i, { state: "skipped", message: `Already uploaded as “${dup.title}”` });
          skipped++;
          continue;
        }
        update(i, { state: "uploading", progress: 0 });
        const path = buildStoragePath(userId, file.name);
        try {
          await uploadFileWithProgress(DOCS_BUCKET, path, file, (p) => update(i, { progress: p }));
          const docTitle = items.length === 1 && title.trim() ? title.trim() : titleFromFileName(file.name);
          const { data, error: insErr } = await supabase
            .from("documents")
            .insert({
              title: docTitle.slice(0, 200),
              description: description.trim() || null,
              category: category.trim(),
              file_path: path,
              file_name: file.name,
              file_size: file.size,
              mime_type: file.type || null,
            })
            .select("id")
            .single();
          if (insErr) {
            await supabase.storage.from(DOCS_BUCKET).remove([path]);
            throw insErr;
          }
          await logActivity({ section: "documents", item_id: data.id, item_title: docTitle, action: "created" });
          update(i, { state: "done", progress: 100 });
          ok++;
        } catch (e) {
          update(i, { state: "error", message: errorMessage(e) });
          failed++;
        }
      }
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["activity_log"] });
    }
    if (ok) toast.success(`${ok} document${ok > 1 ? "s" : ""} uploaded.`);
    if (skipped) toast.warning(`${skipped} duplicate file${skipped > 1 ? "s" : ""} skipped.`);
    if (failed) toast.error(`${failed} upload${failed > 1 ? "s" : ""} failed. You can retry.`);
    if (ok && !failed && !skipped) {
      reset();
      onOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!busy) { onOpenChange(o); if (!o) reset(); } }}>
      <DialogContent className="max-h-[90dvh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload documents</DialogTitle>
          <DialogDescription>PDF, PPT, PPTX, DOC, DOCX, sheets, images or text notes — up to {formatBytes(100 * 1024 * 1024)} each.</DialogDescription>
        </DialogHeader>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
          className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors ${dragOver ? "border-primary bg-primary/5" : "border-border bg-surface hover:border-primary/50"}`}
        >
          <UploadCloud className="size-7 text-primary" />
          <span className="text-sm font-medium">Tap to choose files or drag them here</span>
          <span className="text-xs text-muted-foreground">You can select multiple files</span>
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          accept={DOCUMENT_EXTENSIONS.map((e) => "." + e).join(",")}
          onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }}
        />

        {items.length > 0 ? (
          <ul className="grid gap-2">
            {items.map((it, i) => (
              <li key={it.file.name + it.file.size} className="rounded-lg border bg-surface px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm">{it.file.name}</span>
                  <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                    {formatBytes(it.file.size)}
                    {!busy && it.state !== "done" ? (
                      <button type="button" aria-label={`Remove ${it.file.name}`} onClick={() => setItems((p) => p.filter((_, idx) => idx !== i))} className="rounded p-0.5 hover:bg-accent">
                        <X className="size-3.5" />
                      </button>
                    ) : null}
                  </span>
                </div>
                {it.state === "uploading" || it.state === "done" ? <Progress value={it.progress} className="mt-2 h-1.5" /> : null}
                {it.state === "done" ? <p className="mt-1 text-xs text-status-done">Uploaded</p> : null}
                {it.state === "error" ? <p className="mt-1 text-xs text-destructive">{it.message}</p> : null}
                {it.state === "skipped" ? <p className="mt-1 text-xs text-status-progress">{it.message}</p> : null}
              </li>
            ))}
          </ul>
        ) : null}

        <div className="grid gap-4">
          {items.length <= 1 ? (
            <div>
              <Label htmlFor="doc-title">Title</Label>
              <Input id="doc-title" className="mt-1.5" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={items[0] ? titleFromFileName(items[0].file.name) : "Defaults to the file name"} maxLength={200} />
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Each file will use its file name as the title. You can edit titles later.</p>
          )}
          <div>
            <Label htmlFor="doc-cat">Category</Label>
            <div className="mt-1.5"><DatalistInput id="doc-cat" value={category} onChange={setCategory} options={DOCUMENT_CATEGORIES} /></div>
          </div>
          <div>
            <Label htmlFor="doc-desc">Description</Label>
            <Textarea id="doc-desc" className="mt-1.5" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional — what is this about?" />
          </div>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Checkbox checked={allowDuplicates} onCheckedChange={(v) => setAllowDuplicates(v === true)} />
            Upload even if the same file already exists
          </label>
          <FieldError message={error} />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Close</Button>
          <Button onClick={start} disabled={busy || items.length === 0}>
            {busy ? <Loader2 className="animate-spin" /> : <UploadCloud />}
            {busy ? "Uploading…" : `Upload ${items.length || ""}`.trim()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditDialog({ doc, onClose }: { doc: DocumentRow; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(doc.title);
  const [description, setDescription] = useState(doc.description ?? "");
  const [category, setCategory] = useState(doc.category);
  const [error, setError] = useState<string | null>(null);

  const mut = useMutation({
    mutationFn: async () => {
      const { error: e } = await supabase
        .from("documents")
        .update({ title: title.trim(), description: description.trim() || null, category: category.trim() })
        .eq("id", doc.id);
      if (e) throw e;
      await logActivity({ section: "documents", item_id: doc.id, item_title: title.trim(), action: "updated" });
    },
    onSuccess: () => {
      toast.success("Document updated.");
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["activity_log"] });
      onClose();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit document</DialogTitle>
          <DialogDescription className="truncate">{doc.file_name}</DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!title.trim()) return setError("Title is required.");
            if (!category.trim()) return setError("Category is required.");
            setError(null);
            mut.mutate();
          }}
        >
          <div>
            <Label htmlFor="ed-title">Title</Label>
            <Input id="ed-title" className="mt-1.5" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
          </div>
          <div>
            <Label htmlFor="ed-cat">Category</Label>
            <div className="mt-1.5"><DatalistInput id="ed-cat" value={category} onChange={setCategory} options={DOCUMENT_CATEGORIES} /></div>
          </div>
          <div>
            <Label htmlFor="ed-desc">Description</Label>
            <Textarea id="ed-desc" className="mt-1.5" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <FieldError message={error} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={mut.isPending}>{mut.isPending ? <Loader2 className="animate-spin" /> : null} Save changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PreviewDialog({ doc, onClose, onDownload }: { doc: DocumentRow; onClose: () => void; onDownload: () => void }) {
  const kind = documentKind(doc.file_name);
  const [url, setUrl] = useState<string | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const loaded = useRef(false);

  if (!loaded.current) {
    loaded.current = true;
    signedUrl(DOCS_BUCKET, doc.file_path)
      .then(async (u) => {
        setUrl(u);
        if (kind === "text") {
          const res = await fetch(u);
          setText(await res.text());
        }
        void logActivity({ section: "documents", item_id: doc.id, item_title: doc.title, action: "opened" });
      })
      .catch((e) => setErr(errorMessage(e)));
  }

  const officeKinds: DocKind[] = ["slides", "word", "sheet"];

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex h-[90dvh] max-w-5xl flex-col gap-3 p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="truncate pr-6">{doc.title}</DialogTitle>
          <DialogDescription className="truncate">{doc.file_name} · {formatBytes(doc.file_size)}</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-hidden rounded-xl border bg-surface">
          {err ? (
            <div className="grid h-full place-items-center p-6 text-sm text-destructive">{err}</div>
          ) : !url ? (
            <div className="grid h-full place-items-center"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
          ) : kind === "pdf" ? (
            <iframe src={url} title={doc.title} className="size-full" />
          ) : kind === "image" ? (
            <div className="grid h-full place-items-center overflow-auto p-4"><img src={url} alt={doc.title} className="max-h-full max-w-full object-contain" /></div>
          ) : kind === "text" ? (
            <pre className="h-full overflow-auto whitespace-pre-wrap p-4 font-mono text-sm">{text ?? "Loading…"}</pre>
          ) : officeKinds.includes(kind) ? (
            <iframe src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`} title={doc.title} className="size-full bg-background" />
          ) : (
            <div className="grid h-full place-items-center p-6 text-center text-sm text-muted-foreground">Preview isn't available for this file type. Download it to open.</div>
          )}
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          {url ? (
            <Button variant="outline" asChild>
              <a href={url} target="_blank" rel="noopener noreferrer"><ExternalLink /> Open in new tab</a>
            </Button>
          ) : null}
          <Button onClick={onDownload}><Download /> Download</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
