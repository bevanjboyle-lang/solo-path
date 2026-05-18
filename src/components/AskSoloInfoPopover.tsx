import { useState } from "react";
import { Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { openAskSoloInfo } from "@/lib/handlers";

interface AskSoloInfoPopoverProps {
  isSubscriber: boolean;
  questionsRemaining: number;
  totalQuestions?: number;
}

/**
 * Info icon + popover next to the "Ask Solo" heading. Explains scope
 * and shows the question quota line. Toggle is delegated to the
 * `openAskSoloInfo` handler per CTA-handler discipline.
 */
export default function AskSoloInfoPopover({
  isSubscriber,
  questionsRemaining,
  totalQuestions = 10,
}: AskSoloInfoPopoverProps) {
  const [open, setOpen] = useState(false);
  const toggle = () => openAskSoloInfo(open, setOpen);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={toggle}
          aria-label="About Ask Solo"
          className="text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 rounded"
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="start"
        sideOffset={8}
        className="w-80 p-4 text-xs"
      >
        <div className="space-y-4">
          <div>
            <p className="font-semibold text-foreground mb-1.5">What Ask Solo can do</p>
            <ul className="space-y-1 text-muted-foreground list-disc pl-4">
              <li>Explain anything in your plan or report</li>
              <li>Help you think through an obstacle on your current move</li>
              <li>Suggest specific wording for an outreach, a post, or a conversation</li>
              <li>Surface alternatives when something isn't working</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-foreground mb-1.5">What it can't do</p>
            <ul className="space-y-1 text-muted-foreground list-disc pl-4">
              <li>Make changes to your plan, use check-ins for that</li>
              <li>Access the internet or real-time data</li>
              <li>Remember you across devices if you're not signed in</li>
            </ul>
          </div>
          <div className="pt-2 border-t border-border">
            <p className="text-[11px] text-foreground">
              {isSubscriber
                ? "Unlimited questions, part of your subscription"
                : `${questionsRemaining} of ${totalQuestions} questions left`}
            </p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
