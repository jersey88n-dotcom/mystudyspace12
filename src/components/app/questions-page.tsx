import { useMemo, useState, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Check, ChevronDown, Copy, Loader2, Pencil, Plus, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  ConfirmDelete,
  DatalistInput,
  EmptyState,
  FieldError,
  FilterSelect,
  PageHeader,
  ResultCount,
  STATUS_FILTER_OPTIONS,
  SearchInput,
  type Tone,
} from "@/components/app/common";
import { DifficultyBadge, StatusSelect } from "@/components/app/status";
import { supabase } from "@/integrations/supabase/client";
import { DIFFICULTIES, STATUSES } from "@/lib/constants";
import { errorMessage, logActivity } from "@/lib/data";
import { cn } from "@/lib/utils";

export type QuestionRow = {
  id: string;
  title: string;
  topic: string | null;
  difficulty: string;
  question: string | null;
  answer: string | null;
  explanation: string | null;
  notes: string | null;
  code?: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  group: string;
};

export type QuestionsConfig = {
  table: "programming_questions" | "aptitude_questions";
  section: "programming" | "aptitude";
  groupField: "language" | "category";
  groupLabel: string;
  groups: readonly string[];
  topicsFor: (group: string) => string[];
  hasCode: boolean;
  title: string;
  subtitle: string;
  icon: ReactNode;
  tone: Tone;
  doneLabel: string;
  pendingLabel: string;
};

const DIFF_ORDER: Record<string, number> = { Easy: 0, Medium: 1, Hard: 2 };

export function QuestionsPage({ config, rows, initialQuery }: { config: QuestionsConfig; rows: QuestionRow[]; initialQuery?: string | undefined }) {
  const queryClient = useQueryClient();
  const [group, setGroup] = useState("all");
  const [search, setSearch] = useState(initialQuery ?? "");
  const [difficulty, setDifficulty] = useState("all");
  const [status, setStatus] = useState("all");
  const [topic, setTopic] = useState("all");
  const [sort, setSort] = useState("newest");
  const [editing, setEditing] = useState<QuestionRow | "new" | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: [config.table] });
    queryClient.invalidateQueries({ queryKey: ["activity_log"] });
  };

  const topics = useMemo(
    () => Array.from(new Set(rows.filter((r) => group === "all" || r.group === group).map((r) => r.topic).filter(Boolean) as string[])).sort(),
    [rows, group],
  );

  const groupCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const r of rows) m[r.group] = (m[r.group] ?? 0) + 1;
    return m;
  }, [rows]);

  const scoped = rows.filter((r) => group === "all" || r.group === group);
  const done = scoped.filter((r) => r.status === "completed").length;

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = scoped.filter((r) => {
      if (difficulty !== "all" && r.difficulty !== difficulty) return false;
      if (status === "solved" && r.status !== "completed") return false;
      if (status === "unsolved" && r.status === "completed") return false;
      if (!["all", "solved", "unsolved"].includes(status) && r.status !== status) return false;
      if (topic !== "all" && r.topic !== topic) return false;
      if (!term) return true;
      return [r.title, r.question, r.answer, r.topic, r.notes, r.explanation, r.code]
        .some((f) => (f ?? "").toLowerCase().includes(term));
    });
    return [...list].sort((a, b) => {
      switch (sort) {
        case "oldest": return a.created_at.localeCompare(b.created_at);
        case "title": return a.title.localeCompare(b.title);
        case "easy": return (DIFF_ORDER[a.difficulty] ?? 0) - (DIFF_ORDER[b.difficulty] ?? 0);
        case "hard": return (DIFF_ORDER[b.difficulty] ?? 0) - (DIFF_ORDER[a.difficulty] ?? 0);
        case "updated": return b.updated_at.localeCompare(a.updated_at);
        default: return b.created_at.localeCompare(a.created_at);
      }
    });
  }, [scoped, search, difficulty, status, topic, sort]);

  const statusMut = useMutation({
    mutationFn: async ({ row, value }: { row: QuestionRow; value: string }) => {
      const { error } = await supabase.from(config.table).update({ status: value }).eq("id", row.id);
      if (error) throw error;
      await logActivity({ section: config.section, item_id: row.id, item_title: row.title, action: "status", detail: value });
    },
    onSuccess: invalidate,
    onError: (e) => toast.error(errorMessage(e)),
  });

  const deleteMut = useMutation({
    mutationFn: async (row: QuestionRow) => {
      const { error } = await supabase.from(config.table).delete().eq("id", row.id);
      if (error) throw error;
      await logActivity({ section: config.section, item_id: row.id, item_title: row.title, action: "deleted" });
    },
    onSuccess: () => { toast.success("Question deleted."); invalidate(); },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const statusOptions = [
    STATUS_FILTER_OPTIONS[0]!,
    { value: "solved", label: config.doneLabel },
    { value: "unsolved", label: config.pendingLabel },
    ...STATUS_FILTER_OPTIONS.slice(1),
  ];

  return (
    <div className="grid gap-6">
      <PageHeader
        tone={config.tone}
        icon={config.icon}
        title={config.title}
        subtitle={config.subtitle}
        action={<Button onClick={() => setEditing("new")}><Plus /> Add question</Button>}
      />

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none sm:mx-0 sm:flex-wrap sm:px-0">
        {["all", ...config.groups].map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => { setGroup(g); setTopic("all"); }}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
              group === g ? "border-primary bg-primary text-primary-foreground" : "bg-surface text-muted-foreground hover:text-foreground",
            )}
          >
            {g === "all" ? "All" : g}
            <span className={cn("rounded-full px-1.5 text-xs", group === g ? "bg-primary-foreground/15" : "bg-muted")}>
              {g === "all" ? rows.length : groupCounts[g] ?? 0}
            </span>
          </button>
        ))}
      </div>

      <div className="grid gap-4 rounded-2xl border card-surface p-4 sm:grid-cols-[1fr_auto] sm:items-center">
        <div>
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <span className="font-medium">{config.doneLabel}: {done} / {scoped.length}</span>
            <span className="text-muted-foreground">{scoped.length ? Math.round((done / scoped.length) * 100) : 0}%</span>
          </div>
          <Progress value={scoped.length ? (done / scoped.length) * 100 : 0} className="mt-2 h-2" />
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          {STATUSES.map((s) => (
            <span key={s.value}>{s.label}: <b className="text-foreground">{scoped.filter((r) => r.status === s.value).length}</b></span>
          ))}
        </div>
      </div>

      <div className="grid gap-2 sm:flex sm:flex-wrap sm:items-center">
        <SearchInput value={search} onChange={setSearch} placeholder="Search questions, answers, notes…" className="sm:min-w-[260px] sm:flex-1" />
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <FilterSelect label="Topic" value={topic} onChange={setTopic} options={[{ value: "all", label: "All topics" }, ...topics.map((t) => ({ value: t, label: t }))]} />
          <FilterSelect label="Difficulty" value={difficulty} onChange={setDifficulty} options={[{ value: "all", label: "All levels" }, ...DIFFICULTIES.map((d) => ({ value: d, label: d }))]} />
          <FilterSelect label="Status" value={status} onChange={setStatus} options={statusOptions} />
          <FilterSelect label="Sort" value={sort} onChange={setSort} options={[
            { value: "newest", label: "Newest first" },
            { value: "oldest", label: "Oldest first" },
            { value: "title", label: "Title A–Z" },
            { value: "easy", label: "Easy → Hard" },
            { value: "hard", label: "Hard → Easy" },
            { value: "updated", label: "Recently edited" },
          ]} />
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={config.icon}
          title="No questions yet"
          text="Add your first question with its answer, explanation and notes."
          action={<Button onClick={() => setEditing("new")}><Plus /> Add question</Button>}
        />
      ) : filtered.length === 0 ? (
        <EmptyState icon={config.icon} title="No matches" text="Try a different search, group or filter." />
      ) : (
        <>
          <ResultCount shown={filtered.length} total={rows.length} noun="questions" />
          <div className="grid gap-3">
            {filtered.map((r) => {
              const open = expanded === r.id;
              const isDone = r.status === "completed";
              return (
                <article key={r.id} className={cn("rounded-2xl border card-surface transition-colors", open && "border-primary/30")}>
                  <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                    <button type="button" onClick={() => setExpanded(open ? null : r.id)} className="flex min-w-0 flex-1 items-start gap-3 text-left" aria-expanded={open}>
                      <ChevronDown className={cn("mt-1 size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
                      <div className="min-w-0">
                        <h3 className={cn("font-semibold leading-snug", isDone && "text-muted-foreground line-through decoration-status-done/60")}>{r.title}</h3>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
                          <span className="rounded-md bg-muted px-2 py-0.5 font-medium">{r.group}</span>
                          {r.topic ? <span className="rounded-md border px-2 py-0.5 text-muted-foreground">{r.topic}</span> : null}
                          <DifficultyBadge level={r.difficulty} />
                          <span className="text-muted-foreground">· {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</span>
                        </div>
                      </div>
                    </button>
                    <div className="flex items-center justify-between gap-2 pl-7 sm:pl-0">
                      <StatusSelect value={r.status} onChange={(v) => statusMut.mutate({ row: r, value: v })} />
                      <div className="flex items-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={isDone ? "Mark as pending" : `Mark as ${config.doneLabel.toLowerCase()}`}
                          title={isDone ? "Mark as pending" : `Mark as ${config.doneLabel.toLowerCase()}`}
                          onClick={() => statusMut.mutate({ row: r, value: isDone ? "review_again" : "completed" })}
                          className={isDone ? "text-status-done" : "text-muted-foreground"}
                        >
                          {isDone ? <RotateCcw /> : <Check />}
                        </Button>
                        <Button variant="ghost" size="icon" aria-label={`Edit ${r.title}`} onClick={() => setEditing(r)}><Pencil /></Button>
                        <ConfirmDelete itemName={r.title} busy={deleteMut.isPending} onConfirm={() => deleteMut.mutate(r)} />
                      </div>
                    </div>
                  </div>
                  {open ? (
                    <div className="grid gap-4 border-t px-4 py-4 sm:px-11">
                      <Block label="Question" text={r.question} />
                      <Block label="Answer" text={r.answer} />
                      {config.hasCode ? <CodeBlock code={r.code ?? null} /> : null}
                      <Block label="Explanation" text={r.explanation} />
                      <Block label="My notes" text={r.notes} tone="note" />
                      {!r.question && !r.answer && !r.explanation && !r.notes && !r.code ? (
                        <p className="text-sm text-muted-foreground">Nothing saved yet — tap edit to add the answer and notes.</p>
                      ) : null}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </>
      )}

      {editing ? (
        <QuestionForm config={config} row={editing === "new" ? null : editing} defaultGroup={group !== "all" ? group : config.groups[0]!} onClose={() => setEditing(null)} onSaved={invalidate} />
      ) : null}
    </div>
  );
}

function Block({ label, text, tone }: { label: string; text: string | null; tone?: "note" }) {
  if (!text) return null;
  return (
    <section>
      <h4 className="mb-1 font-sans text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</h4>
      <p className={cn("whitespace-pre-wrap text-sm leading-relaxed", tone === "note" && "rounded-lg border border-highlight/20 bg-highlight/5 p-3")}>{text}</p>
    </section>
  );
}

function CodeBlock({ code }: { code: string | null }) {
  const [copied, setCopied] = useState(false);
  if (!code) return null;
  return (
    <section>
      <div className="mb-1 flex items-center justify-between">
        <h4 className="font-sans text-xs font-semibold uppercase tracking-wider text-muted-foreground">Code solution</h4>
        <Button
          variant="ghost"
          size="sm"
          onClick={async () => {
            try { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); }
            catch { toast.error("Could not copy."); }
          }}
        >
          {copied ? <Check /> : <Copy />} {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <pre className="overflow-x-auto rounded-xl border bg-background p-4 font-mono text-[13px] leading-relaxed">{code}</pre>
    </section>
  );
}

function QuestionForm({
  config,
  row,
  defaultGroup,
  onClose,
  onSaved,
}: {
  config: QuestionsConfig;
  row: QuestionRow | null;
  defaultGroup: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    title: row?.title ?? "",
    group: row?.group ?? defaultGroup,
    topic: row?.topic ?? "",
    difficulty: row?.difficulty ?? "Easy",
    status: row?.status ?? "not_started",
    question: row?.question ?? "",
    answer: row?.answer ?? "",
    explanation: row?.explanation ?? "",
    code: row?.code ?? "",
    notes: row?.notes ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const mut = useMutation({
    mutationFn: async () => {
      const payload: Record<string, string | null> = {
        title: form.title.trim(),
        [config.groupField]: form.group,
        topic: form.topic.trim() || null,
        difficulty: form.difficulty,
        status: form.status,
        question: form.question.trim() || null,
        answer: form.answer.trim() || null,
        explanation: form.explanation.trim() || null,
        notes: form.notes.trim() || null,
      };
      if (config.hasCode) payload["code"] = form.code.replace(/\s+$/, "") || null;
      if (row) {
        const { error: e } = await supabase.from(config.table).update(payload as never).eq("id", row.id);
        if (e) throw e;
        await logActivity({ section: config.section, item_id: row.id, item_title: form.title.trim(), action: "updated" });
      } else {
        const { data, error: e } = await supabase.from(config.table).insert(payload as never).select("id").single();
        if (e) throw e;
        await logActivity({ section: config.section, item_id: (data as { id: string }).id, item_title: form.title.trim(), action: "created" });
      }
    },
    onSuccess: () => {
      toast.success(row ? "Question updated." : "Question added.");
      onSaved();
      onClose();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92dvh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{row ? "Edit question" : "Add question"}</DialogTitle>
          <DialogDescription>Save the question with your answer, explanation and personal notes.</DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!form.title.trim()) return setError("Title is required.");
            if (form.title.trim().length > 300) return setError("Title must be under 300 characters.");
            setError(null);
            mut.mutate();
          }}
        >
          <div>
            <Label htmlFor="q-title">Title *</Label>
            <Input id="q-title" className="mt-1.5" value={form.title} onChange={(e) => set("title")(e.target.value)} placeholder="e.g. Reverse a linked list" maxLength={300} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>{config.groupLabel}</Label>
              <Select value={form.group} onValueChange={(v) => setForm((f) => ({ ...f, group: v }))}>
                <SelectTrigger className="mt-1.5" aria-label={config.groupLabel}><SelectValue /></SelectTrigger>
                <SelectContent>{config.groups.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="q-topic">Topic</Label>
              <div className="mt-1.5"><DatalistInput id="q-topic" value={form.topic} onChange={set("topic")} options={config.topicsFor(form.group)} placeholder="Pick or type a topic" /></div>
            </div>
            <div>
              <Label>Difficulty</Label>
              <Select value={form.difficulty} onValueChange={set("difficulty")}>
                <SelectTrigger className="mt-1.5" aria-label="Difficulty"><SelectValue /></SelectTrigger>
                <SelectContent>{DIFFICULTIES.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={set("status")}>
                <SelectTrigger className="mt-1.5" aria-label="Status"><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="q-question">Question</Label>
            <Textarea id="q-question" className="mt-1.5" rows={3} value={form.question} onChange={(e) => set("question")(e.target.value)} placeholder="Full problem statement" />
          </div>
          <div>
            <Label htmlFor="q-answer">Answer</Label>
            <Textarea id="q-answer" className="mt-1.5" rows={3} value={form.answer} onChange={(e) => set("answer")(e.target.value)} />
          </div>
          {config.hasCode ? (
            <div>
              <Label htmlFor="q-code">Code solution</Label>
              <Textarea id="q-code" className="mt-1.5 font-mono text-[13px]" rows={8} spellCheck={false} value={form.code} onChange={(e) => set("code")(e.target.value)} placeholder="// paste or write your solution" />
            </div>
          ) : null}
          <div>
            <Label htmlFor="q-expl">Explanation</Label>
            <Textarea id="q-expl" className="mt-1.5" rows={3} value={form.explanation} onChange={(e) => set("explanation")(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="q-notes">My notes</Label>
            <Textarea id="q-notes" className="mt-1.5" rows={2} value={form.notes} onChange={(e) => set("notes")(e.target.value)} />
          </div>
          <FieldError message={error} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={mut.isPending}>{mut.isPending ? <Loader2 className="animate-spin" /> : null}{row ? "Save changes" : "Add question"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
