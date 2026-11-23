import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { MessagesSquare } from "lucide-react";

import { ListSkeleton } from "@/components/app/common";
import { QuestionsPage, type QuestionsConfig } from "@/components/app/questions-page";
import { APTITUDE_CATEGORIES, APTITUDE_TOPICS } from "@/lib/constants";
import { aptitudeQuery } from "@/lib/data";

const config: QuestionsConfig = {
  table: "aptitude_questions",
  section: "aptitude",
  groupField: "category",
  groupLabel: "Category",
  groups: APTITUDE_CATEGORIES,
  topicsFor: (g) => APTITUDE_TOPICS[g] ?? [],
  hasCode: false,
  title: "Aptitude & HR",
  subtitle: "Aptitude, logical reasoning and HR interview questions.",
  icon: <MessagesSquare />,
  tone: "apti",
  doneLabel: "Completed",
  pendingLabel: "Pending",
};

export const Route = createFileRoute("/_authenticated/aptitude")({
  validateSearch: (s: Record<string, unknown>): { q?: string } =>
    typeof s["q"] === "string" && s["q"] ? { q: s["q"] } : {},
  loader: ({ context }) => context.queryClient.ensureQueryData(aptitudeQuery),
  pendingComponent: () => <ListSkeleton />,
  head: () => ({
    meta: [
      { title: "Aptitude & HR — MyStudySpace" },
      { name: "description", content: "Practice aptitude, logical reasoning and HR interview answers." },
      { property: "og:title", content: "Aptitude & HR — MyStudySpace" },
      { property: "og:description", content: "Practice aptitude, logical reasoning and HR interview answers." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AptitudePage,
});

function AptitudePage() {
  const { q } = Route.useSearch();
  const { data } = useSuspenseQuery(aptitudeQuery);
  const rows = data.map((r) => ({ ...r, group: r.category }));
  return <QuestionsPage config={config} rows={rows} initialQuery={q} />;
}
