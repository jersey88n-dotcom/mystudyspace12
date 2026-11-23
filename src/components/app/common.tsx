import type { ReactNode } from "react";
import { Loader2, Search, Trash2, X } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export const sectionAccent = cva("", {
  variants: {
    tone: {
      docs: "text-sec-docs",
      code: "text-sec-code",
      apti: "text-sec-apti",
      video: "text-sec-video",
    },
  },
});

export const sectionIconBox = cva("grid shrink-0 place-items-center rounded-xl border", {
  variants: {
    tone: {
      docs: "border-sec-docs/25 bg-sec-docs/10 text-sec-docs",
      code: "border-sec-code/25 bg-sec-code/10 text-sec-code",
      apti: "border-sec-apti/25 bg-sec-apti/10 text-sec-apti",
      video: "border-sec-video/25 bg-sec-video/10 text-sec-video",
    },
    size: { sm: "size-9 [&_svg]:size-4", md: "size-11 [&_svg]:size-5", lg: "size-14 [&_svg]:size-6" },
  },
  defaultVariants: { size: "md" },
});

export type Tone = NonNullable<VariantProps<typeof sectionIconBox>["tone"]>;

export function PageHeader({
  icon,
  tone,
  title,
  subtitle,
  action,
}: {
  icon: ReactNode;
  tone: Tone;
  title: string;
  subtitle: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex items-center gap-4">
        <div className={sectionIconBox({ tone, size: "lg" })}>{icon}</div>
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      {action ? <div className="flex flex-wrap gap-2">{action}</div> : null}
    </div>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-10 bg-surface pl-9 pr-9"
      />
      {value ? (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => onChange("")}
          className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}

export function FilterSelect({
  value,
  onChange,
  options,
  label,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  label: string;
  className?: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={label} className={cn("h-10 w-full bg-surface sm:w-[160px]", className)}>
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function EmptyState({
  icon,
  title,
  text,
  action,
}: {
  icon: ReactNode;
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-surface/50 px-6 py-16 text-center">
      <div className="grid size-14 place-items-center rounded-2xl bg-muted text-muted-foreground [&_svg]:size-6">
        {icon}
      </div>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{text}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function ListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-40 rounded-2xl" />
      ))}
    </div>
  );
}

export function ConfirmDelete({
  itemName,
  onConfirm,
  busy,
  trigger,
}: {
  itemName: string;
  onConfirm: () => void;
  busy?: boolean;
  trigger?: ReactNode;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="icon" aria-label={`Delete ${itemName}`} className="text-muted-foreground hover:text-destructive">
            <Trash2 />
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this item?</AlertDialogTitle>
          <AlertDialogDescription>
            “{itemName}” will be permanently removed from MyStudySpace. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={busy}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {busy ? <Loader2 className="animate-spin" /> : <Trash2 />}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function FieldError({ message }: { message?: string | null | undefined }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-destructive">{message}</p>;
}

export function ResultCount({ shown, total, noun }: { shown: number; total: number; noun: string }) {
  return (
    <p className="text-xs text-muted-foreground">
      Showing {shown} of {total} {noun}
    </p>
  );
}

export const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "not_started", label: "Not Started" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "review_again", label: "Review Again" },
];

export function DatalistInput({
  id,
  value,
  onChange,
  options,
  placeholder,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
}) {
  return (
    <>
      <Input id={id} list={`${id}-list`} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      <datalist id={`${id}-list`}>
        {options.map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>
    </>
  );
}
