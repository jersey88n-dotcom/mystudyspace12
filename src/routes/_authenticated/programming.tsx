import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Code2 } from "lucide-react";

import { ListSkeleton } from "@/components/app/common";
import { QuestionsPage, type QuestionsConfig } from "@/components/app/questions-page";
import { DSA_TOPICS, LANGUAGE_TOPICS, PROGRAMMING_LANGUAGES } from "@/lib/constants";
import { programmingQuery } from "@/lib/data";

const config: QuestionsConfig = {
  table: "programming_questions",
  section: "programming",
  groupField: "language",
  groupLabel: "Language",
  groups: PROGRAMMING_LANGUAGES,
  topicsFor: (g) => (g === "DSA" ? DSA_TOPICS : LANGUAGE_TOPICS),
  hasCode: true,
  title: "Programming & DSA",
  subtitle: "C, C++, Python, Java and DSA questions with code solutions.",
  icon: <Code2 />,
  tone: "code",
  doneLabel: "Solved",
  pendingLabel: "Unsolved",
};

export const Route = createFileRoute("/_authenticated/programming")({
  validateSearch: (s: Record<string, unknown>): { q?: string } =>
    typeof s.q === "string" && s.q ? { q: s.q } : {},
  loader: ({ context }) => context.queryClient.ensureQueryData(programmingQuery),
  pendingComponent: () => <ListSkeleton />,
  head: () => ({
    meta: [
      { title: "Programming & DSA — MyStudySpace" },
      { name: "description", content: "Track C, C++, Python, Java and DSA questions, solutions and notes." },
      { property: "og:title", content: "Programming & DSA — MyStudySpace" },
      { property: "og:description", content: "Track C, C++, Python, Java and DSA questions, solutions and notes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProgrammingPage,
});

function ProgrammingPage() {
  const { q } = Route.useSearch();
  const { data } = useSuspenseQuery(programmingQuery);
  const rows = data.map((r) => ({ ...r, group: r.language }));
  return <QuestionsPage config={config} rows={rows} initialQuery={q} />;
}
