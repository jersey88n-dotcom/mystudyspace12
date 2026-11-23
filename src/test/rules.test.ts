import { describe, expect, it } from "vitest";

import { getYouTubeId } from "@/lib/youtube";
import { MAX_DOCUMENT_BYTES, validateDocumentFile, validateVideoFile } from "@/lib/files";
import { STATUSES } from "@/lib/constants";

describe("YouTube links", () => {
  it("reads the video id from watch, share, shorts and embed links", () => {
    expect(getYouTubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10")).toBe("dQw4w9WgXcQ");
    expect(getYouTubeId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(getYouTubeId("https://youtube.com/shorts/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(getYouTubeId("https://www.youtube.com/embed/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });
  it("rejects non-YouTube links", () => {
    expect(getYouTubeId("https://vimeo.com/12345")).toBeNull();
    expect(getYouTubeId("not a url")).toBeNull();
  });
});

describe("Document uploads", () => {
  it("accepts PDF, PPT, PPTX, DOC and DOCX files", () => {
    for (const name of ["a.pdf", "b.ppt", "c.pptx", "d.doc", "e.DOCX"]) {
      expect(validateDocumentFile({ name, size: 1000 })).toBeNull();
    }
  });
  it("rejects unsupported, empty and oversized files", () => {
    expect(validateDocumentFile({ name: "virus.exe", size: 1000 })).not.toBeNull();
    expect(validateDocumentFile({ name: "notes.pdf", size: 0 })).not.toBeNull();
    expect(validateDocumentFile({ name: "big.pdf", size: MAX_DOCUMENT_BYTES + 1 })).not.toBeNull();
  });
  it("accepts mp4 videos and rejects documents as videos", () => {
    expect(validateVideoFile({ name: "lecture.mp4", size: 5000 })).toBeNull();
    expect(validateVideoFile({ name: "notes.pdf", size: 5000 })).not.toBeNull();
  });
});

describe("Progress statuses", () => {
  it("uses exactly Not Started, In Progress, Completed and Review Again", () => {
    expect(STATUSES.map((s) => s.label)).toEqual([
      "Not Started",
      "In Progress",
      "Completed",
      "Review Again",
    ]);
  });
});
