import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function SampleCTA() {
  const navigate = useNavigate();
  return (
    <div className="rounded-2xl py-12 px-6 sm:px-10 text-center bg-primary">
      <h2 className="text-2xl font-bold tracking-tight text-primary-foreground sm:text-3xl" style={{ letterSpacing: "-0.02em" }}>
        Ready to see your own Plan B?
      </h2>
      <p className="mx-auto mt-3 max-w-lg text-sm text-primary-foreground/80">
        Yours will be built from your experience, your sector, your network.
      </p>
      <div className="mt-8">
        <Button
          size="lg"
          className="rounded-md bg-white px-8 py-4 text-base font-medium text-primary hover:bg-white/90"
          onClick={() => navigate("/questionnaire")}
        >
          Get your report — £19.99
        </Button>
      </div>
    </div>
  );
}
