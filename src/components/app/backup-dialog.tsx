import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Download, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { errorMessage } from "@/lib/data";

const TABLES = ["documents", "programming_questions", "aptitude_questions", "tutorials"] as const;
type TableName = (typeof TABLES)[number];

type Backup = {
  app: "MyStudySpace";
  version: 1;
  exported_at: string;
  data: Record<TableName, Record<string, unknown>[]>;
};

export function BackupDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [busy, setBusy] = useState<"export" | "restore" | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  async function handleExport() {
    setBusy("export");
    try {
      const data = {} as Backup["data"];
      for (const t of TABLES) {
        const { data: rows, error } = await supabase.from(t).select("*");
        if (error) throw error;
        data[t] = (rows as Record<string, unknown>[]).map(({ user_id: _u, ...rest }) => rest);
      }
      const backup: Backup = { app: "MyStudySpace", version: 1, exported_at: new Date().toISOString(), data };
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mystudyspace-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      const total = TABLES.reduce((n, t) => n + data[t].length, 0);
      toast.success(`Backup downloaded (${total} items).`);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  async function handleRestore(file: File) {
    setBusy("restore");
    try {
      const parsed = JSON.parse(await file.text()) as Partial<Backup>;
      if (parsed.app !== "MyStudySpace" || !parsed.data) throw new Error("This is not a MyStudySpace backup file.");
      let restored = 0;
      for (const t of TABLES) {
        const rows = (parsed.data[t] ?? []).map(({ user_id: _u, ...rest }) => rest);
        if (rows.length === 0) continue;
        const { error } = await supabase.from(t).upsert(rows as never, { onConflict: "id" });
        if (error) throw new Error(`Could not restore ${t.replace("_", " ")}: ${error.message}`);
        restored += rows.length;
      }
      await queryClient.invalidateQueries();
      toast.success(`Restored ${restored} items.`);
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof SyntaxError ? "The backup file is damaged or not valid JSON." : errorMessage(e));
    } finally {
      setBusy(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Backup & restore</DialogTitle>
          <DialogDescription>
            Download a copy of all your documents info, questions, answers, notes and video details.
            Your uploaded files stay safely in cloud storage and are re-linked when you restore.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <Button onClick={handleExport} disabled={busy !== null}>
            {busy === "export" ? <Loader2 className="animate-spin" /> : <Download />}
            Download backup
          </Button>
          <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={busy !== null}>
            {busy === "restore" ? <Loader2 className="animate-spin" /> : <Upload />}
            Restore from backup file
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleRestore(f);
            }}
          />
          <p className="text-xs text-muted-foreground">
            Restoring adds missing items and updates existing ones with the backup's version. Nothing is deleted.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
