import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Code2, FileText, History, MessagesSquare, PlayCircle } from "lucide-react";

import { Progress } from "@/components/ui/progress";
import { ListSkeleton, SearchInput, sectionIconBox, type Tone } from "@/components/app/common";
import { StatusBadge } from "@/components/app/status";
import { SECTION_META, STATUSES, type SectionKey } from "@/lib/constants";
import { activityQuery, aptitudeQuery, documentsQuery, programmingQuery, tutorialsQuery } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/dashboard")({
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(documentsQuery),
      context.queryClient.ensureQueryData(programmingQuery),
      context.queryClient.ensureQueryData(aptitudeQuery),
      context.queryClient.ensureQueryData(tutorialsQuery),
      context.queryClient.ensureQueryData(activityQuery),
    ]),
  pendingComponent: () => <ListSkeleton />,
  head: () => ({
    meta: [
      { title: "Dashboard — MyStudySpace" },
      { name: "description", content: "Your study progress, recent resources and learning history." },
      { property: "og:title", content: "Dashboard — MyStudySpace" },
      { property: "og:description", content: "Your study progress, recent resources and learning history." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

type Item = { id: string; title: string; status: string; created_at: string; section: SectionKey; text: string };

const SECTIONS: { key: SectionKey; tone: Tone; icon: typeof FileText }[] = [
  { key: "documents", tone: "docs", icon: FileText },
  { key: "programming", tone: "code", icon: Code2 },
  { key: "aptitude", tone: "apti", icon: MessagesSquare },
  { key: "tutorials", tone: "video", icon: PlayCircle },
];

const ACTION_LABEL: Record<string, string> = {
  created: "Added", updated: "Edited", status: "Status changed", deleted: "Deleted", opened: "Opened", restored: "Restored",
};

function Dashboard() {
  const { data: docs } = useSuspenseQuery(documentsQuery);
  const { data: prog } = useSuspenseQuery(programmingQuery);
  const { data: apti } = useSuspenseQuery(aptitudeQuery);
  const { data: vids } = useSuspenseQuery(tutorialsQuery);
  const { data: activity } = useSuspenseQuery(activityQuery);
  const [q, setQ] = useState("");

  const all = useMemo<Item[]>(() => [
    ...docs.map((d) => ({ id: d.id, title: d.title, status: d.status, created_at: d.created_at, section: "documents" as const, text: [d.title, d.description, d.category, d.file_name].join(" ") })),
    ...prog.map((d) => ({ id: d.id, title: d.title, status: d.status, created_at: d.created_at, section: "programming" as const, text: [d.title, d.language, d.topic, d.question, d.answer, d.notes, d.code].join(" ") })),
    ...apti.map((d) => ({ id: d.id, title: d.title, status: d.status, created_at: d.created_at, section: "aptitude" as const, text: [d.title, d.category, d.topic, d.question, d.answer, d.notes].join(" ") })),
    ...vids.map((d) => ({ id: d.id, title: d.title, status: d.status, created_at: d.created_at, section: "tutorials" as const, text: [d.title, d.description, d.category, d.url].join(" ") })),
  ], [docs, prog, apti, vids]);

  const term = q.trim().toLowerCase();
  const results = term ? all.filter((i) => i.text.toLowerCase().includes(term)) : [];
  const recent = [...all].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 8);
  const completed = all.filter((i) => i.status === "completed").length;

  return (
    <div className="grid gap-8">
      <section className="relative overflow-hidden rounded-3xl border card-surface p-6 sm:p-8">
        <div className="pointer-events-none absolute inset-0 bg-hero" />
        <div className="relative">
          <h1 className="text-3xl font-bold sm:text-4xl">Your study space</h1>
          <p className="mt-1 text-muted-foreground">{all.length} resources · {completed} completed</p>
          <SearchInput value={q} onChange={setQ} placeholder="Search everything — documents, questions, videos…" className="mt-5 max-w-2xl" />
        </div>
      </section>

      {term ? (
        <section>
          <h2 className="mb-3 text-lg font-semibold">{results.length} result{results.length === 1 ? "" : "s"} for “{q.trim()}”</h2>
          {results.length === 0 ? <p className="text-sm text-muted-foreground">Nothing found in any section.</p> : (
            <ul className="grid gap-2">
              {results.slice(0, 30).map((i) => (
                <li key={i.section + i.id}>
                  <Link to={SECTION_META[i.section].to} search={{ q: q.trim() }} className="flex items-center justify-between gap-3 rounded-xl border bg-surface px-4 py-3 hover:border-primary/40">
                    <span className="min-w-0"><span className="block truncate font-medium">{i.title}</span><span className="text-xs text-muted-foreground">{SECTION_META[i.section].label}</span></span>
                    <StatusBadge status={i.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {SECTIONS.map(({ key, tone, icon: Icon }) => {
          const items = all.filter((i) => i.section === key);
          const done = items.filter((i) => i.status === "completed").length;
          return (
            <Link key={key} to={SECTION_META[key].to} className="group rounded-2xl border card-surface p-5 transition-colors hover:border-primary/40">
              <div className="flex items-center justify-between">
                <div className={sectionIconBox({ tone })}><Icon /></div>
                <span className="font-display text-3xl font-bold">{items.length}</span>
              </div>
              <h3 className="mt-4 font-semibold">{SECTION_META[key].label}</h3>
              <div className="mt-3 flex justify-between text-xs text-muted-foreground"><span>{done} completed</span><span>{items.length ? Math.round((done / items.length) * 100) : 0}%</span></div>
              <Progress value={items.length ? (done / items.length) * 100 : 0} className="mt-1.5 h-1.5" />
            </Link>
          );
        })}
      </section>

      <section className="grid gap-4 sm:grid-cols-4">
        {STATUSES.map((s) => (
          <div key={s.value} className="rounded-xl border bg-surface p-4">
            <StatusBadge status={s.value} />
            <p className="mt-2 font-display text-2xl font-bold">{all.filter((i) => i.status === s.value).length}</p>
          </div>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border card-surface p-5">
          <h2 className="text-lg font-semibold">Recently added</h2>
          {recent.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">Nothing yet — add something in any section.</p> : (
            <ul className="mt-3 divide-y">
              {recent.map((i) => (
                <li key={i.section + i.id} className="flex items-center justify-between gap-3 py-2.5">
                  <Link to={SECTION_META[i.section].to} className="min-w-0 hover:text-primary">
                    <span className="block truncate text-sm font-medium">{i.title}</span>
                    <span className="text-xs text-muted-foreground">{SECTION_META[i.section].label} · {formatDistanceToNow(new Date(i.created_at), { addSuffix: true })}</span>
                  </Link>
                  <StatusBadge status={i.status} />
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="rounded-2xl border card-surface p-5">
          <h2 className="flex items-center gap-2 text-lg font-semibold"><History className="size-4" /> Learning history</h2>
          {activity.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">Your activity will appear here.</p> : (
            <ul className="mt-3 divide-y">
              {activity.map((a) => (
                <li key={a.id} className="py-2.5 text-sm">
                  <span className="font-medium">{ACTION_LABEL[a.action] ?? a.action}</span>{" "}
                  <span className="text-muted-foreground">“{a.item_title}”</span>
                  <span className="block text-xs text-muted-foreground">{SECTION_META[a.section as SectionKey]?.label} · {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
