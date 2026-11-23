import { cva } from "class-variance-authority";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { STATUSES, statusLabel } from "@/lib/constants";
import { cn } from "@/lib/utils";

export const statusDot = cva("inline-block size-2 shrink-0 rounded-full", {
  variants: {
    status: {
      not_started: "bg-status-new",
      in_progress: "bg-status-progress",
      completed: "bg-status-done",
      review_again: "bg-status-review",
    },
  },
  defaultVariants: { status: "not_started" },
});

const statusPill = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      status: {
        not_started: "border-status-new/30 bg-status-new/10 text-status-new",
        in_progress: "border-status-progress/30 bg-status-progress/10 text-status-progress",
        completed: "border-status-done/30 bg-status-done/10 text-status-done",
        review_again: "border-status-review/30 bg-status-review/10 text-status-review",
      },
    },
    defaultVariants: { status: "not_started" },
  },
);

type S = "not_started" | "in_progress" | "completed" | "review_again";
const asStatus = (v: string): S => (STATUSES.some((s) => s.value === v) ? (v as S) : "not_started");

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const s = asStatus(status);
  return (
    <span className={cn(statusPill({ status: s }), className)}>
      <span className={statusDot({ status: s })} />
      {statusLabel(s)}
    </span>
  );
}

export function StatusSelect({
  value,
  onChange,
  disabled,
  className,
}: {
  value: string;
  onChange: (v: S) => void;
  disabled?: boolean;
  className?: string;
}) {
  const s = asStatus(value);
  return (
    <Select value={s} onValueChange={(v) => onChange(v as S)} disabled={disabled}>
      <SelectTrigger
        aria-label="Change status"
        className={cn("h-8 w-[150px] gap-2 rounded-full bg-surface text-xs", className)}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STATUSES.map((st) => (
          <SelectItem key={st.value} value={st.value} className="text-xs">
            <span className="flex items-center gap-2">
              <span className={statusDot({ status: st.value })} />
              {st.label}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

const diffPill = cva("inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide", {
  variants: {
    level: {
      Easy: "bg-diff-easy/12 text-diff-easy",
      Medium: "bg-diff-medium/12 text-diff-medium",
      Hard: "bg-diff-hard/12 text-diff-hard",
    },
  },
  defaultVariants: { level: "Easy" },
});

export function DifficultyBadge({ level }: { level: string }) {
  const l = level === "Medium" || level === "Hard" ? level : "Easy";
  return <span className={diffPill({ level: l })}>{l}</span>;
}
