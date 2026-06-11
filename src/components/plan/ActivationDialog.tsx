import { useCallback, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

/**
 * F78 — Plan activation dialog. Opens from TodayCard's day0 state when the
 * user clicks "Start my 30-day plan". Asks one question per the design doc
 * (admin/adaptive-tracker-checkin-design.md §9 decision 1) — when to send
 * the daily check-in email — then calls activate-plan to create the
 * tracker_sessions row that gates every downstream flow.
 *
 * Timezone is inferred from the browser via Intl.DateTimeFormat. Notification
 * time is one of six presets. No settings screen; the user can change it
 * later via /account.
 */
interface ActivationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportId: string | null;
  /** Fires after activation succeeds. Caller should refetch tracker_session. */
  onActivated: () => void;
}

interface TimeOption {
  /** HH:MM string sent to activate-plan. Must match ALLOWED_TIMES on the backend. */
  value: string;
  /** Human label shown next to the radio. */
  label: string;
}

const TIME_OPTIONS: TimeOption[] = [
  { value: "07:00", label: "7am" },
  { value: "08:00", label: "8am" },
  { value: "09:00", label: "9am" },
  { value: "12:00", label: "12pm" },
  { value: "18:00", label: "6pm" },
  { value: "20:00", label: "8pm" },
];

/** Best-effort browser timezone. Falls back to "UTC" if Intl is unavailable. */
function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export default function ActivationDialog({
  open,
  onOpenChange,
  reportId,
  onActivated,
}: ActivationDialogProps) {
  const [selectedTime, setSelectedTime] = useState<string>("08:00");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const timezone = useMemo(() => detectTimezone(), []);

  const handleSubmit = useCallback(async () => {
    if (!reportId || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("activate-plan", {
        body: {
          report_id: reportId,
          notification_time: selectedTime,
          notification_timezone: timezone,
        },
      });

      if (fnError) {
        // supabase-js wraps function-level non-2xx into fnError.
        console.error("activate-plan invoke error:", fnError);
        setError(
          (fnError as { context?: { response_text?: string } })?.context?.response_text ??
            "We couldn't start your plan. Please try again.",
        );
        setSubmitting(false);
        return;
      }

      if (!data?.success) {
        setError(data?.response_text ?? "We couldn't start your plan. Please try again.");
        setSubmitting(false);
        return;
      }

      // Success — caller will refetch tracker_session and TodayCard transitions to active.
      onActivated();
      onOpenChange(false);
      setSubmitting(false);
    } catch (e) {
      console.error("activate-plan threw:", e);
      setError("We couldn't reach our servers. Check your connection and try again.");
      setSubmitting(false);
    }
  }, [reportId, selectedTime, timezone, submitting, onActivated, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={(next) => !submitting && onOpenChange(next)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold tracking-tight">
            Start your 30-day plan
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            One question. When should we send your daily check-in prompt?
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2">
          <RadioGroup
            value={selectedTime}
            onValueChange={setSelectedTime}
            className="grid grid-cols-3 gap-2"
          >
            {TIME_OPTIONS.map((opt) => (
              <Label
                key={opt.value}
                htmlFor={`time-${opt.value}`}
                className={`flex cursor-pointer items-center justify-center border px-4 py-3 text-sm font-medium transition-colors ${
                  selectedTime === opt.value
                    ? "border-primary bg-[hsl(var(--surface-mint-tint))] text-[#15735F]"
                    : "border-border bg-transparent text-foreground hover:border-primary/40"
                }`}
              >
                <RadioGroupItem
                  value={opt.value}
                  id={`time-${opt.value}`}
                  className="sr-only"
                />
                {opt.label}
              </Label>
            ))}
          </RadioGroup>

          <p className="mt-3 text-xs text-muted-foreground">
            Times in your local timezone ({timezone}). Day 1 starts today.
          </p>

          {error && (
            <div
              className="mt-4 border border-[hsl(var(--error))]/40 bg-[hsl(var(--error-bg))] px-3 py-2 text-sm text-[hsl(var(--error))]"
              role="alert"
            >
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="mt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Not yet
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !reportId}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Starting…
              </>
            ) : (
              "Start my plan"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
