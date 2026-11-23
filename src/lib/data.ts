import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { SectionKey } from "@/lib/constants";

type Tables = Database["public"]["Tables"];
export type DocumentRow = Tables["documents"]["Row"];
export type ProgrammingRow = Tables["programming_questions"]["Row"];
export type AptitudeRow = Tables["aptitude_questions"]["Row"];
export type TutorialRow = Tables["tutorials"]["Row"];
export type ActivityRow = Tables["activity_log"]["Row"];

export const DOCS_BUCKET = "study-documents";
export const VIDEOS_BUCKET = "study-videos";

export const documentsQuery = queryOptions({
  queryKey: ["documents"],
  queryFn: async (): Promise<DocumentRow[]> => {
    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
});

export const programmingQuery = queryOptions({
  queryKey: ["programming_questions"],
  queryFn: async (): Promise<ProgrammingRow[]> => {
    const { data, error } = await supabase
      .from("programming_questions")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
});

export const aptitudeQuery = queryOptions({
  queryKey: ["aptitude_questions"],
  queryFn: async (): Promise<AptitudeRow[]> => {
    const { data, error } = await supabase
      .from("aptitude_questions")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
});

export const tutorialsQuery = queryOptions({
  queryKey: ["tutorials"],
  queryFn: async (): Promise<TutorialRow[]> => {
    const { data, error } = await supabase
      .from("tutorials")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
});

export const activityQuery = queryOptions({
  queryKey: ["activity_log"],
  queryFn: async (): Promise<ActivityRow[]> => {
    const { data, error } = await supabase
      .from("activity_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(25);
    if (error) throw error;
    return data;
  },
});

export type ActivityAction = "created" | "updated" | "status" | "deleted" | "opened" | "restored";

/** Records a learning-history entry. Never throws: history must not block the main action. */
export async function logActivity(entry: {
  section: SectionKey;
  item_id?: string | null;
  item_title: string;
  action: ActivityAction;
  detail?: string;
}) {
  try {
    await supabase.from("activity_log").insert({
      section: entry.section,
      item_id: entry.item_id ?? null,
      item_title: entry.item_title.slice(0, 300),
      action: entry.action,
      detail: entry.detail ?? null,
    });
  } catch {
    // ignore
  }
}

export function errorMessage(err: unknown): string {
  if (err && typeof err === "object" && "message" in err) {
    const msg = String((err as { message: unknown }).message);
    if (/failed to fetch|network/i.test(msg)) return "Network problem — check your connection and try again.";
    return msg;
  }
  return "Something went wrong. Please try again.";
}

export async function currentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Your session expired. Please sign in again.");
  return data.user.id;
}

/**
 * Uploads a file to private cloud storage with progress reporting.
 * Uses the storage REST endpoint directly so the browser can report upload progress.
 */
export async function uploadFileWithProgress(
  bucket: string,
  path: string,
  file: File,
  onProgress?: (pct: number) => void,
): Promise<void> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Your session expired. Please sign in again.");
  const base = String(import.meta.env["VITE_SUPABASE_URL"]).replace(/\/+$/, "");
  const key = String(import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"]);
  const encoded = path.split("/").map(encodeURIComponent).join("/");

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${base}/storage/v1/object/${bucket}/${encoded}`);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("apikey", key);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.setRequestHeader("cache-control", "max-age=3600");
    xhr.setRequestHeader("content-type", file.type || "application/octet-stream");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve();
      let msg = `Upload failed (${xhr.status}).`;
      try {
        const body = JSON.parse(xhr.responseText) as { message?: string; error?: string };
        msg = body.message || body.error || msg;
      } catch {
        // keep default
      }
      if (xhr.status === 413 || /maximum allowed size|too large/i.test(msg)) msg = "File is too large for storage.";
      reject(new Error(msg));
    };
    xhr.onerror = () => reject(new Error("Network problem during upload. Please try again."));
    xhr.onabort = () => reject(new Error("Upload cancelled."));
    xhr.send(file);
  });
}

export async function signedUrl(bucket: string, path: string, download?: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 60 * 60, download ? { download } : undefined);
  if (error || !data) throw new Error(error?.message || "Could not open the file.");
  return data.signedUrl;
}

export async function downloadFile(bucket: string, path: string, fileName: string) {
  const url = await signedUrl(bucket, path, fileName);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}
