import { useState, useRef, useCallback } from "react";
import { Upload, FileText, X, RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const ACCEPTED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const ACCEPTED_EXT = [".pdf", ".doc", ".docx"];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

type UploadState = "empty" | "hovering" | "uploading" | "uploaded" | "error";

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

function validateFile(file: File): string | null {
  const ext = "." + file.name.split(".").pop()?.toLowerCase();
  if (!ACCEPTED_TYPES.includes(file.type) && !ACCEPTED_EXT.includes(ext)) {
    return "PDF or Word document only.";
  }
  if (file.size > MAX_SIZE) {
    return "Please upload a file under 10MB.";
  }
  return null;
}

export default function CVUploadZone({
  clientSessionId,
  onUploadComplete,
  onUploadClear,
  onExtractComplete,
}: CVUploadZoneProps) {
  const [state, setState] = useState<UploadState>("empty");
  const [error, setError] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: number } | null>(null);
  const [uploadedPath, setUploadedPath] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const upload = useCallback(
    async (file: File) => {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        setState("error");
        return;
      }

      setError(null);
      setState("uploading");

      const storagePath = `${clientSessionId}/${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("cv-uploads")
        .upload(storagePath, file, { upsert: true });

      if (uploadError) {
        setError("Upload failed, please try again.");
        setState("error");
        return;
      }

      setUploadedFile({ name: file.name, size: file.size });
      setUploadedPath(storagePath);
      setState("uploaded");
      onUploadComplete(storagePath);
      toast({ title: "CV uploaded" });

      // Fire parse-cv in the background. Failures are non-fatal — the user
      // can still proceed; the report will simply be generated without CV context.
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
    [clientSessionId, onUploadComplete, onExtractComplete, toast]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setState("empty");
      const file = e.dataTransfer.files[0];
      if (file) upload(file);
    },
    [upload]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setState((s) => (s === "uploaded" ? s : "hovering"));
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
    setUploadedPath(null);
    setState("empty");
    onUploadClear();
    inputRef.current?.click();
  }, [onUploadClear]);

  const handleRetry = useCallback(() => {
    setError(null);
    setState("empty");
    inputRef.current?.click();
  }, []);

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

      {/* Uploaded state */}
      {state === "uploaded" && uploadedFile && (
        <div className="border border-[hsl(var(--mint))]/30 bg-[hsl(var(--surface-mint-tint))] rounded-lg p-6">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-[hsl(var(--mint))]/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-[hsl(var(--mint-text))]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[hsl(var(--text-heading))] truncate">
                {uploadedFile.name}
              </p>
              <p className="text-xs text-[hsl(var(--text-muted))]">
                {formatBytes(uploadedFile.size)} — uploaded
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReplace}
              className="text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text-heading))]"
            >
              Replace
            </Button>
          </div>
        </div>
      )}

      {/* Uploading state */}
      {state === "uploading" && (
        <div className="border border-dashed border-[hsl(var(--mint))]/40 rounded-lg p-12 flex flex-col items-center justify-center gap-3 bg-[hsl(var(--surface-panel))]">
          <RefreshCw className="w-6 h-6 text-[hsl(var(--mint))] animate-spin" />
          <p className="text-sm text-[hsl(var(--text-muted))]">Uploading…</p>
        </div>
      )}

      {/* Drop zone (empty / hovering) */}
      {(state === "empty" || state === "hovering") && (
        <div
          role="button"
          tabIndex={0}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          className={`border-2 border-dashed rounded-lg p-12 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors ${
            state === "hovering"
              ? "border-[hsl(var(--mint))] bg-[hsl(var(--surface-mint-tint))]"
              : "border-border bg-[hsl(var(--surface-panel))] hover:border-[hsl(var(--mint))]/40"
          }`}
          aria-label="Drop your CV here, or click to browse"
        >
          <Upload
            className={`w-8 h-8 ${
              state === "hovering" ? "text-[hsl(var(--mint))]" : "text-[hsl(var(--text-muted))]"
            }`}
          />
          <p className="text-sm text-[hsl(var(--text-heading))] font-medium">
            {state === "hovering" ? "Drop to upload" : "Drop your CV here, or click to browse"}
          </p>
          <p className="text-xs text-[hsl(var(--text-muted))]">PDF or Word. Up to 10MB.</p>
        </div>
      )}

      {/* Error state */}
      {state === "error" && error && (
        <div className="border border-dashed border-[hsl(var(--error))]/40 rounded-lg p-12 flex flex-col items-center justify-center gap-3 bg-[hsl(var(--error-bg))]">
          <AlertCircle className="w-6 h-6 text-[hsl(var(--error))]" />
          <p className="text-sm text-[hsl(var(--error))] font-medium">{error}</p>
          <Button variant="outline" size="sm" onClick={handleRetry}>
            Try again
          </Button>
        </div>
      )}
    </div>
  );
}
