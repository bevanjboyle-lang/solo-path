import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import MintTopBar from "@/components/MintTopBar";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <MintTopBar />
      <div className="rounded-2xl bg-surface-panel p-12 shadow-panel text-center">
        <h1 className="mb-4 font-display text-4xl font-bold text-foreground">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">Oops! Page not found</p>
        <a href="/" className="text-primary underline hover:text-primary/90">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
