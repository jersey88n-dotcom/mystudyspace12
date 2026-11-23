export const DOCUMENT_EXTENSIONS = [
  "pdf",
  "ppt",
  "pptx",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "csv",
  "odt",
  "odp",
  "ods",
  "rtf",
  "txt",
  "md",
  "png",
  "jpg",
  "jpeg",
  "webp",
  "gif",
] as const;

export const VIDEO_EXTENSIONS = ["mp4", "webm", "mov", "m4v", "mkv", "ogv"] as const;

export const MAX_DOCUMENT_BYTES = 100 * 1024 * 1024; // 100 MB
export const MAX_VIDEO_BYTES = 1024 * 1024 * 1024; // 1 GB

export function getExtension(name: string): string {
  const idx = name.lastIndexOf(".");
  if (idx <= 0 || idx === name.length - 1) return "";
  return name.slice(idx + 1).toLowerCase();
}

export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value >= 10 || i === 0 ? Math.round(value) : value.toFixed(1)} ${units[i]}`;
}

export function validateDocumentFile(file: { name: string; size: number }): string | null {
  const ext = getExtension(file.name);
  if (!(DOCUMENT_EXTENSIONS as readonly string[]).includes(ext)) {
    return `"${file.name}" is not a supported document type.`;
  }
  if (file.size === 0) return `"${file.name}" is empty.`;
  if (file.size > MAX_DOCUMENT_BYTES) {
    return `"${file.name}" is larger than ${formatBytes(MAX_DOCUMENT_BYTES)}.`;
  }
  return null;
}

export function validateVideoFile(file: { name: string; size: number }): string | null {
  const ext = getExtension(file.name);
  if (!(VIDEO_EXTENSIONS as readonly string[]).includes(ext)) {
    return `"${file.name}" is not a supported video type.`;
  }
  if (file.size === 0) return `"${file.name}" is empty.`;
  if (file.size > MAX_VIDEO_BYTES) {
    return `"${file.name}" is larger than ${formatBytes(MAX_VIDEO_BYTES)}.`;
  }
  return null;
}

export function safeFileName(name: string): string {
  const cleaned = name
    .normalize("NFKD")
    .replace(/[^\w.\-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  return cleaned.slice(-120) || "file";
}

export function buildStoragePath(userId: string, fileName: string): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${userId}/${Date.now()}-${rand}-${safeFileName(fileName)}`;
}

export function titleFromFileName(name: string): string {
  const base = name.replace(/\.[^.]+$/, "");
  return base.replace(/[_-]+/g, " ").trim() || name;
}

export type DocKind = "pdf" | "slides" | "word" | "sheet" | "image" | "text" | "other";

export function documentKind(fileName: string): DocKind {
  const ext = getExtension(fileName);
  if (ext === "pdf") return "pdf";
  if (["ppt", "pptx", "odp"].includes(ext)) return "slides";
  if (["doc", "docx", "odt", "rtf"].includes(ext)) return "word";
  if (["xls", "xlsx", "ods", "csv"].includes(ext)) return "sheet";
  if (["png", "jpg", "jpeg", "webp", "gif"].includes(ext)) return "image";
  if (["txt", "md"].includes(ext)) return "text";
  return "other";
}
