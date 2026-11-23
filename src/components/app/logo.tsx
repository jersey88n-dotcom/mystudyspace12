import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <span className="relative grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground shadow-glow">
        <svg viewBox="0 0 24 24" className="size-4.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" />
          <path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5" />
          <path d="m9 9 2 2 4-4" />
        </svg>
      </span>
      <span className="font-display text-lg font-bold tracking-tight">
        MyStudy<span className="text-primary">Space</span>
      </span>
    </span>
  );
}
