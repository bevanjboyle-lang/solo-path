import Navbar from "@/components/Navbar";

export default function HowItWorks() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <div className="flex min-h-screen items-center justify-center pt-14">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">How Solo works</h1>
      </div>
    </div>
  );
}
