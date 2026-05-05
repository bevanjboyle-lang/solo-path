import { Checkbox } from "@/components/ui/checkbox";
import type { ActivationPlanOutput } from "@/types/canonical";

interface Props {
  portfolio_review_guide: ActivationPlanOutput["portfolio_review_guide"];
}

function ReviewCard({ triggerDay, questions }: { triggerDay: number; questions: string[] }) {
  const title = triggerDay <= 22 ? "Mid-Point Review: Strand Feedback" : "Final Review: Commitment Decision";
  return (
    <div className="rounded-md bg-card border-l-4 border-primary p-6">
      <span className="inline-block rounded bg-primary px-3 py-1 text-xs font-bold text-primary-foreground mb-4">
        Day {triggerDay}
      </span>
      <h3 className="text-[1.1rem] font-bold text-foreground mb-4">{title}</h3>
      <div className="space-y-3">
        {questions.map((q, i) => (
          <label key={i} className="flex items-start gap-3 cursor-pointer">
            <Checkbox className="mt-0.5 border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary" />
            <span className="text-sm leading-relaxed text-secondary-foreground">{q}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

export default function PortfolioReviewSection({ portfolio_review_guide }: Props) {
  const { review_1, review_2 } = portfolio_review_guide;
  return (
    <section>
      <h2 className="text-[1.8rem] font-bold text-foreground mb-2">Portfolio Review Checkpoints</h2>
      <p className="text-sm text-muted-foreground mb-6">At each checkpoint, pause and assess. These questions guide your review.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <ReviewCard triggerDay={review_1.trigger_day} questions={review_1.questions} />
        <ReviewCard triggerDay={review_2.trigger_day} questions={review_2.questions} />
      </div>
    </section>
  );
}
