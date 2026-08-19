import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

/*
 * CVUploadZone, Pass 1 /cv-upload v1 (2026-05-16)
 *
 * Editorial drop zone for /cv-upload. Replaces the previous dashed-border
 * dropzone-icon SaaS surface with a deliberate stone-inset surface where
 * the affordance is carried by typography, not iconography. State changes
 * render as composition shifts inside the same surface (eyebrow label
 * reframes the purpose; border colour marks the active state).
 *
 * The Toast on upload success is dropped per Pass 1 /cv-upload F7
 * resolution 2026-05-16, the in-surface chip + Encrypted trust line is
 * the success signal. ARIA-live on the surface covers the screen-reader
 * announcement.
 *
 * Composition reference: admin/pass-1-cv-upload-decisions.md.
 */

const ACCEPTED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const ACCEPTED_EXT = [".pdf", ".doc", ".docx"];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

type UploadState =
  | "empty"
  | "hovering"
  | "uploading"
  | "uploaded"
  | "error-size"
  | "error-type"
  | "error-failed";

interface CVUploadZoneProps {
  clientSessionId: string;
  onUploadComplete: (path: string) => void;
  onUploadClear: () => void;
  onExtractComplete?: (
    extract: Record<string, unknown>,
    confidenceScore?: number,
    uploaded?: boolean
  ) => void;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function validateFile(file: File): UploadState | null {
  const ext = "." + file.name.split(".").pop()?.toLowerCase();
  if (!ACCEPTED_TYPES.includes(file.type) && !ACCEPTED_EXT.includes(ext)) {
    return "error-type";
  }
  if (file.size > MAX_SIZE) {
    return "error-size";
  }
  return null;
}

/**
 * Build a Supabase-Storage-safe object name from the user's filename.
 * Storage rejects spaces and most special characters with a 400. We
 * preserve `file.name` for display and sanitise the storage path only.
 */
function sanitiseStorageName(originalName: string): string {
  const lastDot = originalName.lastIndexOf(".");
  const stem = lastDot > 0 ? originalName.slice(0, lastDot) : originalName;
  const ext = lastDot > 0 ? originalName.slice(lastDot).toLowerCase() : "";
  const cleanedStem = stem
    .replace(/[^\w-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
  return (cleanedStem || "cv") + ext;
}

/* ─── Small bits ─── */

function Eyebrow({
  tone = "neutral",
  label,
  spec,
}: {
  tone?: "neutral" | "active" | "error" | "success";
  label: string;
  spec?: React.ReactNode;
}) {
  const dotColour =
    tone === "error"
      ? "bg-red-600"
      : tone === "success" || tone === "active"
      ? "bg-primary"
      : "bg-primary";
  const labelColour = tone === "error" ? "text-red-700" : "text-foreground";
  return (
    <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.18em]">
      <span className={`inline-block w-1.5 h-1.5 rounded-full ${dotColour}`} />
      <span className={labelColour}>{label}</span>
      {spec && (
        <>
          <span className="text-muted-foreground/40">/</span>
          <span className={tone === "success" ? "text-[#15735F] normal-case tracking-normal text-[12px] font-normal" : "text-muted-foreground normal-case tracking-normal text-[12px] font-normal"}>
            {spec}
          </span>
        </>
      )}
    </div>
  );
}

function Surface({
  state,
  children,
  onDrop,
  onDragOver,
  onDragLeave,
  onClick,
  onKeyDown,
  ariaLabel,
}: {
  state: UploadState;
  children: React.ReactNode;
  onDrop?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: () => void;
  onClick?: () => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  ariaLabel?: string;
}) {
  const isInteractive = state === "empty" || state === "hovering";
  const borderColour =
    state === "hovering" || state === "uploading"
      ? "border-primary"
      : state === "error-size" || state === "error-type" || state === "error-failed"
      ? "border-red-600/70"
      : state === "uploaded"
      ? "border-primary/60"
      : "border-border";

  return (
    <div
      role={isInteractive ? "button" : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onClick={isInteractive ? onClick : undefined}
      onKeyDown={isInteractive ? onKeyDown : undefined}
      aria-label={isInteractive ? ariaLabel : undefined}
      aria-live="polite"
      className={`w-full bg-[#F3F0EA] border ${borderColour} transition-colors ${
        isInteractive ? "cursor-pointer hover:border-primary/60" : ""
      }`}
    >
      {children}
    </div>
  );
}

/* ─── Component ─── */

export default function CVUploadZone({
  clientSessionId,
  onUploadComplete,
  onUploadClear,
  onExtractComplete,
}: CVUploadZoneProps) {
  const [state, setState] = useState<UploadState>("empty");
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: number } | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorFile, setErrorFile] = useState<{ name: string; size: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const triggerBrowse = useCallback(() => inputRef.current?.click(), []);

  const upload = useCallback(
    async (file: File) => {
      const validationFail = validateFile(file);
      if (validationFail) {
        setErrorFile({ name: file.name, size: file.size });
        setState(validationFail);
        return;
      }

      setState("uploading");
      setUploadedFile({ name: file.name, size: file.size });
      setUploadProgress(0);

      // The Supabase JS client doesn't expose upload progress events on the
      // storage upload helper, so we run a synthetic progress estimate during
      // the request. Real progress would require switching to a signed-URL
      // direct PUT and using XHR, out of scope for this Pass 1 visual lift.
      const fakeProgressTimer = setInterval(() => {
        setUploadProgress((p) => (p >= 90 ? 90 : p + 7));
      }, 120);

      const safeName = sanitiseStorageName(file.name);
      const storagePath = `${clientSessionId}/${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from("cv-uploads")
        .upload(storagePath, file, { upsert: true });

      clearInterval(fakeProgressTimer);

      if (uploadError) {
        console.warn("CV upload failed:", uploadError);
        setErrorFile({ name: file.name, size: file.size });
        setState("error-failed");
        return;
      }

      setUploadProgress(100);
      setState("uploaded");
      onUploadComplete(storagePath);

      // Fire parse-cv in the background. Non-fatal, the report can be
      // generated without CV context if parsing fails.
      try {
        const fd = new FormData();
        fd.append("file", file);
        const { data: parseData, error: parseError } = await supabase.functions.invoke(
          "parse-cv",
          { body: fd }
        );
        if (parseError) {
          console.warn("parse-cv invoke failed (non-fatal):", parseError);
        } else if (parseData?.success === false) {
          console.warn("parse-cv returned success:false (non-fatal):", parseData);
        } else if (parseData?.cv_extract && onExtractComplete) {
          onExtractComplete(
            parseData.cv_extract as Record<string, unknown>,
            parseData.cv_confidence_score as number | undefined,
            parseData.cv_uploaded as boolean | undefined
          );
        }
      } catch (err) {
        console.warn("parse-cv threw (non-fatal):", err);
      }
    },
    [clientSessionId, onUploadComplete, onExtractComplete]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) upload(file);
    },
    [upload]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setState((s) => (s === "empty" ? "hovering" : s));
  }, []);

  const handleDragLeave = useCallback(() => {
    setState((s) => (s === "hovering" ? "empty" : s));
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) upload(file);
      if (inputRef.current) inputRef.current.value = "";
    },
    [upload]
  );

  const handleReplace = useCallback(() => {
    setUploadedFile(null);
    setUploadProgress(0);
    setState("empty");
    onUploadClear();
    inputRef.current?.click();
  }, [onUploadClear]);

  const handleRetry = useCallback(() => {
    setState("empty");
    setErrorFile(null);
    inputRef.current?.click();
  }, []);

  const handleClearError = useCallback(() => {
    setState("empty");
    setErrorFile(null);
  }, []);

  /* ─── Render by state ─── */

  const eyebrowSpecLine = (
    <>PDF · DOC · DOCX <span className="mx-1.5 text-muted-foreground/40">·</span> ≤ 10 MB</>
  );

  return (
    <div className="w-full">
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.doc,.docx"
        className="hidden"
        onChange={handleFileSelect}
        aria-label="Upload CV file"
      />

      {/* ─── Empty / Hovering ─── */}
      {(state === "empty" || state === "hovering") && (
        <Surface
          state={state}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={triggerBrowse}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              triggerBrowse();
            }
          }}
          ariaLabel="Drop your CV here, or click to browse"
        >
          <div className="border-b border-border px-8 py-4">
            <Eyebrow
              tone={state === "hovering" ? "active" : "neutral"}
              label={state === "hovering" ? "Release to upload" : "Upload / Drop zone"}
              spec={eyebrowSpecLine}
            />
          </div>
          <div className="px-8 sm:px-12 py-14 sm:py-16">
            <p className="text-[20px] sm:text-[22px] font-semibold tracking-tight text-foreground leading-snug">
              Drop your CV here, or{" "}
              <em className="not-italic text-[#15735F] border-b-[1.5px] border-primary pb-0.5">
                click to browse
              </em>
              .
            </p>
            <p className="mt-3 text-[13px] text-muted-foreground leading-relaxed max-w-xl">
              Your file goes straight to encrypted storage. We use it once to ground the report in
              your actual role and history.
            </p>
          </div>
        </Surface>
      )}

      {/* ─── Uploading ─── */}
      {state === "uploading" && uploadedFile && (
        <Surface state={state}>
          <div className="border-b border-border px-8 py-4">
            <Eyebrow tone="active" label="Uploading" spec={`${uploadedFile.name} · ${formatBytes(uploadedFile.size)}`} />
          </div>
          <div className="px-8 sm:px-12 py-12">
            <div className="flex items-baseline justify-between mb-3">
              <div className="text-[15px] font-semibold text-foreground truncate pr-4">
                {uploadedFile.name}
              </div>
              <div className="text-[13px] font-semibold text-[#15735F] tabular-nums shrink-0">
                {uploadProgress}%
              </div>
            </div>
            <div className="h-0.5 bg-[#E5E2DC] overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-150"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <div className="mt-3 text-[12px] text-muted-foreground">
              Uploading to encrypted storage.
            </div>
          </div>
        </Surface>
      )}

      {/* ─── Uploaded ─── */}
      {state === "uploaded" && uploadedFile && (
        <Surface state={state}>
          <div className="border-b border-border px-8 py-4">
            <Eyebrow tone="success" label="Uploaded" spec="Ready to continue" />
          </div>
          <div className="px-8 sm:px-12 py-8 flex items-center gap-5">
            {/* CSS document chip, no icon import */}
            <div className="shrink-0 w-12 h-14 bg-white border border-[#D8D4CC] relative">
              <div className="absolute top-0 right-0 w-3 h-3 bg-[#E5E2DC]" style={{ clipPath: "polygon(0 0, 100% 100%, 100% 0)" }} />
              <div className="absolute inset-x-2 top-3 space-y-1">
                <div className="h-0.5 bg-[#D8D4CC] w-full" />
                <div className="h-0.5 bg-[#D8D4CC] w-3/4" />
                <div className="h-0.5 bg-[#D8D4CC] w-full" />
                <div className="h-0.5 bg-[#D8D4CC] w-2/3" />
              </div>
              <div className="absolute bottom-1 left-0 right-0 text-center text-[8px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
                {uploadedFile.name.split(".").pop()?.toLowerCase() ?? "doc"}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[16px] font-semibold text-foreground truncate">
                {uploadedFile.name}
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-muted-foreground">
                <span>{formatBytes(uploadedFile.size)}</span>
                <span className="text-muted-foreground/40">·</span>
                <span>Uploaded just now</span>
                <span className="text-muted-foreground/40">·</span>
                <span className="text-[#15735F]">
                  Encrypted <span className="text-muted-foreground">·</span> EU storage{" "}
                  <span className="text-muted-foreground">·</span> deletable from /account
                </span>
              </div>
            </div>
            <button
              onClick={handleReplace}
              className="shrink-0 text-[13px] text-muted-foreground border-b border-[#D8D4CC] hover:text-foreground hover:border-foreground transition-colors"
            >
              Replace
            </button>
          </div>
        </Surface>
      )}

      {/* ─── Errors (size / type / upload-failed) ─── */}
      {(state === "error-size" || state === "error-type" || state === "error-failed") && (
        <Surface state={state}>
          <div className="border-b border-border px-8 py-4">
            <Eyebrow
              tone="error"
              label="Rejected"
              spec={
                errorFile ? (
                  <>
                    {errorFile.name} <span className="mx-1.5 text-muted-foreground/40">·</span>{" "}
                    {formatBytes(errorFile.size)}
                  </>
                ) : undefined
              }
            />
          </div>
          <div className="px-8 sm:px-12 py-10">
            <div className="border-l-2 border-red-600 pl-4 bg-red-50/40 py-3 -ml-4 pr-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-red-700 mb-1">
                Error
              </div>
              <div className="text-[14px] text-foreground leading-relaxed">
                {state === "error-size" && (
                  <>
                    <strong className="font-semibold">File too large.</strong> Please upload a file
                    under 10 MB.
                  </>
                )}
                {state === "error-type" && (
                  <>
                    <strong className="font-semibold">Wrong file type.</strong> Please upload a PDF
                    or Word document.
                  </>
                )}
                {state === "error-failed" && (
                  <>
                    <strong className="font-semibold">Upload failed.</strong> Please try again, your
                    file wasn't sent.
                  </>
                )}
              </div>
            </div>
            <p className="mt-6 text-[15px] font-medium text-foreground">
              {state === "error-failed" ? (
                <>
                  <button
                    onClick={handleRetry}
                    className="text-[#15735F] border-b-[1.5px] border-primary pb-0.5 hover:opacity-80 transition-opacity"
                  >
                    Retry upload
                  </button>
                  , or{" "}
                  <button
                    onClick={handleClearError}
                    className="text-muted-foreground border-b border-[#D8D4CC] pb-0.5 hover:text-foreground transition-colors"
                  >
                    choose a different file
                  </button>
                  .
                </>
              ) : (
                <>
                  Drop a different file, or{" "}
                  <button
                    onClick={triggerBrowse}
                    className="text-[#15735F] border-b-[1.5px] border-primary pb-0.5 hover:opacity-80 transition-opacity"
                  >
                    click to browse
                  </button>
                  .
                </>
              )}
            </p>
          </div>
        </Surface>
      )}
    </div>
  );
}
