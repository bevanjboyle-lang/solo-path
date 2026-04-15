import { useState } from "react";
import { motion } from "framer-motion";
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
  onSubmit?: (response: string) => Promise<void>;
}

export default function CheckInPanel({
  open,
  onOpenChange,
  sessionId,
  dayNumber,
  readOnly = false,
  onSubmit,
}: CheckInPanelProps) {
  const [response, setResponse] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!response.trim() || !onSubmit) return;
    setSubmitting(true);
    try {
      await onSubmit(response);
      setResponse("");
      onOpenChange(false);
    } catch (err) {
      console.error("Check-in submit error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <div className="mx-auto w-full max-w-lg p-6">
          <DrawerHeader className="px-0">
            <DrawerTitle className="text-lg font-semibold text-foreground">
              {readOnly
                ? `Day ${dayNumber || ""} check-in`
                : `Day ${dayNumber || ""} check-in`}
            </DrawerTitle>
            <DrawerDescription className="text-sm text-muted-foreground">
              {readOnly
                ? "Here's what you logged."
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
