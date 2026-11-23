import { createFileRoute, Link } from "@tanstack/react-router";
import { Code2, FileText, MessagesSquare, PlayCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Logo } from "@/components/app/logo";
import { sectionIconBox } from "@/components/app/common";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MyStudySpace — your private study library" },
      { name: "description", content: "Store documents, coding and DSA questions, aptitude & HR prep and video tutorials — on every device." },
      { property: "og:title", content: "MyStudySpace — your private study library" },
      { property: "og:description", content: "Documents, DSA, aptitude & HR prep and videos in one private space." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const FEATURES = [
  { tone: "docs" as const, icon: FileText, title: "My Documents", text: "PDFs, slides and notes with preview and download." },
  { tone: "code" as const, icon: Code2, title: "Programming & DSA", text: "C, C++, Python, Java and DSA with code solutions." },
  { tone: "apti" as const, icon: MessagesSquare, title: "Aptitude & HR", text: "Reasoning, aptitude and interview answers." },
  { tone: "video" as const, icon: PlayCircle, title: "Video Tutorials", text: "YouTube, links and your own uploads." },
];

function Index() {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 bg-hero" />
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-30 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <header className="flex h-20 items-center justify-between">
          <Logo />
          <Button asChild variant="outline"><Link to="/auth">Sign in</Link></Button>
        </header>
        <section className="animate-rise py-16 text-center sm:py-24">
          <h1 className="mx-auto max-w-3xl text-4xl font-extrabold leading-tight sm:text-6xl">
            Everything you study, <span className="text-primary">in one private space.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-muted-foreground sm:text-lg">
            Keep your notes, coding questions, interview prep and tutorials organized — and open them from your phone or laptop.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Button asChild size="lg" className="shadow-glow"><Link to="/dashboard">Open my space</Link></Button>
          </div>
        </section>
        <section className="grid gap-4 pb-20 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl border card-surface p-5">
              <div className={sectionIconBox({ tone: f.tone })}><f.icon /></div>
              <h2 className="mt-4 font-semibold">{f.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
