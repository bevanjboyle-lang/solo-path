import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation, useParams } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { AnimatePresence, motion } from "framer-motion";
import ProtectedRoute from "@/components/ProtectedRoute";
import ErrorBoundary from "@/components/ErrorBoundary";
import Landing from "./pages/Landing";
import CVUpload from "./pages/CVUpload";
import Auth from "./pages/Auth";
import Questionnaire from "./pages/Questionnaire";
import Processing from "./pages/Processing";
import Results from "./pages/Results";
import Teaser from "./pages/Teaser";
import PaymentSuccess from "./pages/PaymentSuccess";
import Plan from "./pages/Plan";
import Pricing from "./pages/Pricing";
import Library from "./pages/Library";
import FAQ from "./pages/FAQ";
import Subscribe from "./pages/Subscribe";
import AskSolo from "./pages/AskSolo";
import Account from "./pages/Account";
import NotFound from "./pages/NotFound";
import ServerError from "./pages/ServerError";
import Footer from "@/components/Footer";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";

/** Deep-link wrapper: /checkin/:sessionId → Plan with pre-opened drawer */
function CheckinDeepLink() {
  const { sessionId } = useParams();
  return <Plan initialSessionId={sessionId} />;
}

const queryClient = new QueryClient();

const FOOTERLESS_ROUTES = ["/cv-upload", "/questionnaire", "/processing", "/teaser", "/payment-success", "/auth", "/privacy", "/terms", "/plan", "/library", "/ask-solo", "/account", "/subscribe", "/checkin"];

function AnimatedRoutes() {
  const location = useLocation();
  const hideFooter = FOOTERLESS_ROUTES.some((r) => location.pathname.startsWith(r));

  return (
    <>
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
          <Routes location={location}>
            {/* Anonymous routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/auth" element={<Auth />} />

            {/* Activation funnel — anonymous */}
            <Route path="/cv-upload" element={<CVUpload />} />
            <Route path="/questionnaire" element={<Questionnaire />} />
            <Route path="/processing" element={<Processing />} />
            <Route path="/teaser" element={<Teaser />} />

            {/* Conversion */}
            <Route path="/payment-success" element={<PaymentSuccess />} />

            {/* Gated routes */}
            <Route path="/plan" element={<ProtectedRoute><Plan /></ProtectedRoute>} />
            <Route path="/checkin/:sessionId" element={<ProtectedRoute><CheckinDeepLink /></ProtectedRoute>} />
            <Route path="/library" element={<ProtectedRoute><Library /></ProtectedRoute>} />
            <Route path="/library/modules/:id" element={<ProtectedRoute><Library /></ProtectedRoute>} />
            <Route path="/ask-solo" element={<ProtectedRoute><AskSolo /></ProtectedRoute>} />
            <Route path="/account" element={<ProtectedRoute><Account /></ProtectedRoute>} />
            <Route path="/subscribe" element={<ProtectedRoute><Subscribe /></ProtectedRoute>} />
            <Route path="/results" element={<ProtectedRoute><Results /></ProtectedRoute>} />

            {/* Errors */}
            <Route path="/500" element={<ServerError />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </motion.div>
      </AnimatePresence>
      {!hideFooter && <Footer />}
    </>
  );
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <AnimatedRoutes />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
