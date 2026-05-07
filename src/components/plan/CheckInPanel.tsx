import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";

interface CheckInPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId?: string;
  dayNumber?: number;
  readOnly?: boolean;
  /**
   * F87 (2026-05-07): onSubmit now returns the AI's closing message so the panel
   * can render it inline before the user dismisses. Returning null/undefined falls
   * back to a generic "check-in saved" line.
   */
  onSubmit?: (response: string) => Promise<string | null>;
}

export default function CheckInPanel({
  open,
  onOpenChange,
  sessionId: _sessionId,
  dayNumber,
  readOnly = false,
  onSubmit,
}: CheckInPanelProps) {
  const [response, setResponse] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // F87: hold the AI's reply so we can show it after submit, before the user
  // dismisses the drawer. Cleared whenever the drawer reopens for a fresh check-in.
  const [aiReply, setAiReply] = useState<string | null>(null);

  // Reset state when the drawer reopens fresh.
  useEffect(() => {
    if (open) {
      setAiReply(null);
      setResponse("");
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!response.trim() || !onSubmit) return;
    setSubmitting(true);
    try {
      const reply = await onSubmit(response);
      // Show the AI's contextual reply inline. If the backend didn't return one,
      // fall back to a clear confirmation so the panel still gives an explicit close.
      setAiReply(reply || "Check-in saved. See you tomorrow.");
    } catch (err) {
      console.error("Check-in submit error:", err);
      setAiReply("Something went wrong saving your check-in. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDone = () => {
    onOpenChange(false);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <div className="mx-auto w-full max-w-lg p-6">
          <DrawerHeader className="px-0">
            <DrawerTitle className="text-lg font-semibold text-foreground">
              {`Day ${dayNumber || ""} check-in`}
            </DrawerTitle>
            <DrawerDescription className="text-sm text-muted-foreground">
              {readOnly
                ? "Here's what you logged."
                : aiReply
                  ? "Here's what's been recorded."
                  : "What did you do today? What's blocking you?"}
            </DrawerDescription>
          </DrawerHeader>

          <div className="mt-4 space-y-4">
            {readOnly ? (
              <div className="rounded-lg border border-border bg-[hsl(var(--surface-inset))] p-4">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Read-only check-in data will load here.
                </p>
              </div>
            ) : aiReply ? (
              <>
                {/* F87: AI's closing message rendered inline. */}
                <div className="rounded-lg border border-primary/30 bg-[hsl(var(--surface-mint-tint))] p-4">
                  <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                    {aiReply}
                  </p>
                </div>
                <div className="flex">
                  <Button
                    onClick={handleDone}
                    className="rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                  >
                    Done
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Textarea
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  placeholder="Two minutes. Be honest."
                  className="min-h-[120px] resize-none bg-[hsl(var(--surface-panel))] text-sm"
                  disabled={submitting}
                />
                <div className="flex gap-3">
                  <Button
                    onClick={handleSubmit}
                    disabled={!response.trim() || submitting}
                    className="rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Submit check-in"
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => onOpenChange(false)}
                    disabled={submitting}
                    className="text-sm"
                  >
                    Cancel
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
