import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Download, ExternalLink, Film, Link2, Loader2, Pencil, Play, PlayCircle, Plus, UploadCloud, Youtube } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { VIDEO_CATEGORIES } from "@/lib/constants";
import {
  VIDEOS_BUCKET,
  currentUserId,
  downloadFile,
  errorMessage,
  logActivity,
  signedUrl,
  tutorialsQuery,
  uploadFileWithProgress,
  type TutorialRow,
} from "@/lib/data";
import { VIDEO_EXTENSIONS, buildStoragePath, formatBytes, titleFromFileName, validateVideoFile } from "@/lib/files";
import { getYouTubeId, isValidHttpUrl, youTubeEmbed, youTubeThumb } from "@/lib/youtube";

export const Route = createFileRoute("/_authenticated/videos")({
  validateSearch: (s: Record<string, unknown>): { q?: string } =>
    typeof s["q"] === "string" && s["q"] ? { q: s["q"] } : {},
  loader: ({ context }) => context.queryClient.ensureQueryData(tutorialsQuery),
  pendingComponent: () => <ListSkeleton />,
  head: () => ({
    meta: [
      { title: "Video Tutorials — MyStudySpace" },
      { name: "description", content: "Save YouTube lessons, tutorial links and your own videos in one place." },
      { property: "og:title", content: "Video Tutorials — MyStudySpace" },
      { property: "og:description", content: "Save YouTube lessons, tutorial links and your own videos in one place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VideosPage,
});

const SOURCE_LABEL: Record<string, string> = { youtube: "YouTube", link: "Link", upload: "My upload" };
const DIRECT_VIDEO_RE = /\.(mp4|webm|ogg|ogv|mov|m4v)(\?|#|$)/i;

function VideosPage() {
  const { q } = Route.useSearch();
  const { data: videos } = useSuspenseQuery(tutorialsQuery);
  const queryClient = useQueryClient();
  const [search, setSearch] = useState(q ?? "");
  const [source, setSource] = useState("all");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("newest");
  const [formOpen, setFormOpen] = useState<TutorialRow | "new" | null>(null);
  const [watching, setWatching] = useState<TutorialRow | null>(null);

  const categories = useMemo(() => Array.from(new Set(videos.map((v) => v.category))).sort(), [videos]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = videos.filter((v) => {
      if (source !== "all" && v.source_type !== source) return false;
      if (category !== "all" && v.category !== category) return false;
      if (status !== "all" && v.status !== status) return false;
      if (!term) return true;
      return [v.title, v.description ?? "", v.category, v.url ?? "", v.file_name ?? ""].some((f) => f.toLowerCase().includes(term));
    });
    return [...list].sort((a, b) => {
      switch (sort) {
        case "oldest": return a.created_at.localeCompare(b.created_at);
        case "title": return a.title.localeCompare(b.title);
        case "updated": return b.updated_at.localeCompare(a.updated_at);
        default: return b.created_at.localeCompare(a.created_at);
      }
    });
  }, [videos, search, source, category, status, sort]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["tutorials"] });
    queryClient.invalidateQueries({ queryKey: ["activity_log"] });
  };

  const statusMut = useMutation({
    mutationFn: async ({ v, value }: { v: TutorialRow; value: string }) => {
      const { error } = await supabase.from("tutorials").update({ status: value }).eq("id", v.id);
      if (error) throw error;
      await logActivity({ section: "tutorials", item_id: v.id, item_title: v.title, action: "status", detail: value });
    },
    onSuccess: invalidate,
    onError: (e) => toast.error(errorMessage(e)),
  });

  const deleteMut = useMutation({
    mutationFn: async (v: TutorialRow) => {
      const { error } = await supabase.from("tutorials").delete().eq("id", v.id);
      if (error) throw error;
      if (v.file_path) await supabase.storage.from(VIDEOS_BUCKET).remove([v.file_path]);
      await logActivity({ section: "tutorials", item_id: v.id, item_title: v.title, action: "deleted" });
    },
    onSuccess: () => { toast.success("Video deleted."); invalidate(); },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <div className="grid gap-6">
      <PageHeader
        tone="video"
        icon={<PlayCircle />}
        title="Video Tutorials"
        subtitle="YouTube lessons, tutorial links and your own recordings."
        action={<Button onClick={() => setFormOpen("new")}><Plus /> Add video</Button>}
      />

      <div className="grid gap-2 sm:flex sm:flex-wrap sm:items-center">
        <SearchInput value={search} onChange={setSearch} placeholder="Search videos…" className="sm:min-w-[260px] sm:flex-1" />
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <FilterSelect label="Source" value={source} onChange={setSource} options={[{ value: "all", label: "All sources" }, { value: "youtube", label: "YouTube" }, { value: "link", label: "Links" }, { value: "upload", label: "My uploads" }]} />
          <FilterSelect label="Category" value={category} onChange={setCategory} options={[{ value: "all", label: "All categories" }, ...categories.map((c) => ({ value: c, label: c }))]} />
          <FilterSelect label="Status" value={status} onChange={setStatus} options={STATUS_FILTER_OPTIONS} />
          <FilterSelect label="Sort" value={sort} onChange={setSort} options={[{ value: "newest", label: "Newest first" }, { value: "oldest", label: "Oldest first" }, { value: "title", label: "Title A–Z" }, { value: "updated", label: "Recently edited" }]} />
        </div>
      </div>

      {videos.length === 0 ? (
        <EmptyState icon={<PlayCircle />} title="No videos yet" text="Add a YouTube link, any tutorial link, or upload your own video." action={<Button onClick={() => setFormOpen("new")}><Plus /> Add video</Button>} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={<PlayCircle />} title="No matches" text="Try a different search or clear the filters." />
      ) : (
        <>
          <ResultCount shown={filtered.length} total={videos.length} noun="videos" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((v) => {
              const ytId = v.source_type === "youtube" && v.url ? getYouTubeId(v.url) : null;
              return (
                <article key={v.id} className="flex flex-col overflow-hidden rounded-2xl border card-surface transition-colors hover:border-sec-video/40">
                  <button type="button" onClick={() => setWatching(v)} className="group relative aspect-video w-full overflow-hidden bg-muted" aria-label={`Watch ${v.title}`}>
                    {ytId ? (
                      <img src={youTubeThumb(ytId)} alt="" loading="lazy" className="size-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                      <div className="grid size-full place-items-center bg-grid text-muted-foreground">
                        {v.source_type === "upload" ? <Film className="size-10" /> : <Link2 className="size-10" />}
                      </div>
                    )}
                    <span className="absolute inset-0 grid place-items-center bg-background/0 transition-colors group-hover:bg-background/30">
                      <span className="grid size-14 place-items-center rounded-full bg-sec-video text-background shadow-lg transition-transform group-hover:scale-110">
                        <Play className="ml-0.5 size-6 fill-current" />
                      </span>
                    </span>
                    <span className="absolute left-3 top-3 flex items-center gap-1 rounded-md bg-background/80 px-2 py-0.5 text-[11px] font-semibold backdrop-blur">
                      {v.source_type === "youtube" ? <Youtube className="size-3.5" /> : v.source_type === "upload" ? <Film className="size-3.5" /> : <Link2 className="size-3.5" />}
                      {SOURCE_LABEL[v.source_type]}
                    </span>
                  </button>
                  <div className="flex flex-1 flex-col p-4">
                    <h3 className="line-clamp-2 font-semibold leading-snug">{v.title}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {v.category} · {formatDistanceToNow(new Date(v.created_at), { addSuffix: true })}
                      {v.file_size ? ` · ${formatBytes(v.file_size)}` : ""}
                    </p>
                    {v.description ? <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{v.description}</p> : null}
                    <div className="mt-auto flex items-center justify-between gap-2 pt-4">
                      <StatusSelect value={v.status} onChange={(value) => statusMut.mutate({ v, value })} />
                      <div className="flex items-center">
                        {v.source_type === "upload" && v.allow_download && v.file_path ? (
                          <Button variant="ghost" size="icon" aria-label={`Download ${v.title}`} onClick={() => downloadFile(VIDEOS_BUCKET, v.file_path!, v.file_name ?? "video").catch((e) => toast.error(errorMessage(e)))}><Download /></Button>
                        ) : null}
                        {v.source_type !== "upload" && v.url ? (
                          <Button variant="ghost" size="icon" asChild aria-label={`Open ${v.title} link`}>
                            <a href={v.url} target="_blank" rel="noopener noreferrer"><ExternalLink /></a>
                          </Button>
                        ) : null}
                        <Button variant="ghost" size="icon" aria-label={`Edit ${v.title}`} onClick={() => setFormOpen(v)}><Pencil /></Button>
                        <ConfirmDelete itemName={v.title} busy={deleteMut.isPending} onConfirm={() => deleteMut.mutate(v)} />
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}

      {formOpen ? <VideoForm row={formOpen === "new" ? null : formOpen} existing={videos} onClose={() => setFormOpen(null)} onSaved={invalidate} /> : null}
      {watching ? <WatchDialog v={watching} onClose={() => setWatching(null)} /> : null}
    </div>
  );
}

function WatchDialog({ v, onClose }: { v: TutorialRow; onClose: () => void }) {
  const [src, setSrc] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const ytId = v.source_type === "youtube" && v.url ? getYouTubeId(v.url) : null;

  useEffect(() => {
    void logActivity({ section: "tutorials", item_id: v.id, item_title: v.title, action: "opened" });
    if (v.source_type === "upload" && v.file_path) {
      signedUrl(VIDEOS_BUCKET, v.file_path).then(setSrc).catch((e) => setErr(errorMessage(e)));
    }
  }, [v]);

  const directLink = v.source_type === "link" && v.url && DIRECT_VIDEO_RE.test(v.url);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl gap-3 p-3 sm:p-6">
        <DialogHeader>
          <DialogTitle className="pr-6">{v.title}</DialogTitle>
          {v.description ? <DialogDescription className="line-clamp-2">{v.description}</DialogDescription> : null}
        </DialogHeader>
        <div className="aspect-video w-full overflow-hidden rounded-xl border bg-background">
          {ytId ? (
            <iframe
              src={youTubeEmbed(ytId)}
              title={v.title}
              className="size-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          ) : v.source_type === "upload" ? (
            err ? <div className="grid size-full place-items-center text-sm text-destructive">{err}</div>
            : src ? <video src={src} controls playsInline className="size-full" controlsList={v.allow_download ? undefined : "nodownload"} />
            : <div className="grid size-full place-items-center"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
          ) : directLink ? (
            <video src={v.url!} controls playsInline className="size-full" />
          ) : (
            <div className="grid size-full place-items-center p-6 text-center">
              <div>
                <Link2 className="mx-auto size-8 text-muted-foreground" />
                <p className="mt-3 text-sm text-muted-foreground">This tutorial is hosted on another website.</p>
                <Button asChild className="mt-4"><a href={v.url ?? "#"} target="_blank" rel="noopener noreferrer"><ExternalLink /> Open tutorial</a></Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function VideoForm({ row, existing, onClose, onSaved }: { row: TutorialRow | null; existing: TutorialRow[]; onClose: () => void; onSaved: () => void }) {
  const [kind, setKind] = useState<"youtube" | "link" | "upload">((row?.source_type as "youtube" | "link" | "upload") ?? "youtube");
  const [title, setTitle] = useState(row?.title ?? "");
  const [description, setDescription] = useState(row?.description ?? "");
  const [category, setCategory] = useState(row?.category ?? "Programming");
  const [url, setUrl] = useState(row?.url ?? "");
  const [allowDownload, setAllowDownload] = useState(row?.allow_download ?? true);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const t = title.trim();
    if (!t) return setError("Title is required.");
    if (!category.trim()) return setError("Category is required.");
    if (kind === "youtube" && !getYouTubeId(url)) return setError("Enter a valid YouTube video link.");
    if (kind === "link" && !isValidHttpUrl(url)) return setError("Enter a valid link starting with http:// or https://");
    if (kind === "upload" && !row && !file) return setError("Choose a video file to upload.");
    if (file) {
      const fErr = validateVideoFile(file);
      if (fErr) return setError(fErr);
    }
    if (!row && kind !== "upload") {
      const dup = existing.find((v) => v.url && v.url.trim() === url.trim());
      if (dup) return setError(`This link is already saved as “${dup.title}”.`);
    }
    if (!row && kind === "upload" && file) {
      const dup = existing.find((v) => v.file_name === file.name && v.file_size === file.size);
      if (dup) return setError(`This video is already uploaded as “${dup.title}”.`);
    }
    setError(null);
    setBusy(true);
    let uploadedPath: string | null = null;
    try {
      const base = { title: t.slice(0, 200), description: description.trim() || null, category: category.trim(), allow_download: allowDownload };
      if (row) {
        const patch: Record<string, unknown> = { ...base };
        if (row.source_type !== "upload") patch["url"] = url.trim();
        const { error: upErr } = await supabase.from("tutorials").update(patch as never).eq("id", row.id);
        if (upErr) throw upErr;
        await logActivity({ section: "tutorials", item_id: row.id, item_title: t, action: "updated" });
        toast.success("Video updated.");
      } else if (kind === "upload" && file) {
        const userId = await currentUserId();
        const path = buildStoragePath(userId, file.name);
        setProgress(0);
        await uploadFileWithProgress(VIDEOS_BUCKET, path, file, setProgress);
        uploadedPath = path;
        const { data, error: insErr } = await supabase.from("tutorials").insert({
          ...base, source_type: "upload", file_path: path, file_name: file.name, file_size: file.size, mime_type: file.type || null,
        }).select("id").single();
        if (insErr) throw insErr;
        uploadedPath = null;
        await logActivity({ section: "tutorials", item_id: data.id, item_title: t, action: "created" });
        toast.success("Video uploaded.");
      } else {
        const { data, error: insErr } = await supabase.from("tutorials").insert({ ...base, source_type: kind, url: url.trim() }).select("id").single();
        if (insErr) throw insErr;
        await logActivity({ section: "tutorials", item_id: data.id, item_title: t, action: "created" });
        toast.success("Video added.");
      }
      onSaved();
      onClose();
    } catch (err) {
      if (uploadedPath) await supabase.storage.from(VIDEOS_BUCKET).remove([uploadedPath]);
      toast.error(errorMessage(err));
      setProgress(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-h-[92dvh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{row ? "Edit video" : "Add video"}</DialogTitle>
          <DialogDescription>Save a YouTube video, any tutorial link, or upload your own video (up to 1 GB).</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4">
          {!row ? (
            <Tabs value={kind} onValueChange={(v) => { setKind(v as typeof kind); setError(null); }}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="youtube"><Youtube className="size-4" /> YouTube</TabsTrigger>
                <TabsTrigger value="link"><Link2 className="size-4" /> Link</TabsTrigger>
                <TabsTrigger value="upload"><UploadCloud className="size-4" /> Upload</TabsTrigger>
              </TabsList>
            </Tabs>
          ) : null}

          {kind !== "upload" ? (
            <div>
              <Label htmlFor="v-url">{kind === "youtube" ? "YouTube link" : "Tutorial link"}</Label>
              <Input id="v-url" className="mt-1.5" value={url} onChange={(e) => setUrl(e.target.value)} placeholder={kind === "youtube" ? "https://www.youtube.com/watch?v=…" : "https://…"} inputMode="url" />
            </div>
          ) : !row ? (
            <div>
              <Label>Video file</Label>
              <button type="button" onClick={() => fileRef.current?.click()} className="mt-1.5 flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed bg-surface px-4 py-6 text-center hover:border-primary/50">
                <UploadCloud className="size-6 text-primary" />
                <span className="text-sm font-medium">{file ? file.name : "Choose a video"}</span>
                <span className="text-xs text-muted-foreground">{file ? formatBytes(file.size) : "MP4, WebM, MOV, MKV"}</span>
              </button>
              <input ref={fileRef} type="file" className="hidden" accept={VIDEO_EXTENSIONS.map((x) => "." + x).join(",") + ",video/*"} onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                if (f) {
                  const fErr = validateVideoFile(f);
                  if (fErr) { setError(fErr); return; }
                  setFile(f);
                  if (!title) setTitle(titleFromFileName(f.name));
                  setError(null);
                }
              }} />
              {progress !== null ? <div className="mt-2"><Progress value={progress} className="h-1.5" /><p className="mt-1 text-xs text-muted-foreground">Uploading… {progress}%</p></div> : null}
            </div>
          ) : null}

          <div>
            <Label htmlFor="v-title">Title *</Label>
            <Input id="v-title" className="mt-1.5" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
          </div>
          <div>
            <Label htmlFor="v-cat">Category</Label>
            <div className="mt-1.5"><DatalistInput id="v-cat" value={category} onChange={setCategory} options={VIDEO_CATEGORIES} /></div>
          </div>
          <div>
            <Label htmlFor="v-desc">Description</Label>
            <Textarea id="v-desc" className="mt-1.5" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          {kind === "upload" ? (
            <label className="flex items-center justify-between gap-3 rounded-lg border bg-surface px-3 py-2.5 text-sm">
              <span>Allow downloading this video</span>
              <Switch checked={allowDownload} onCheckedChange={setAllowDownload} />
            </label>
          ) : null}
          <FieldError message={error} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
            <Button type="submit" disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : null}{row ? "Save changes" : kind === "upload" ? "Upload video" : "Add video"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
