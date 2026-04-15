import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { AnimatePresence, motion } from "framer-motion";
import ProtectedRoute from "@/components/ProtectedRoute";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Questionnaire from "./pages/Questionnaire";
import Processing from "./pages/Processing";
import Results from "./pages/Results";
import Teaser from "./pages/Teaser";
import PaymentSuccess from "./pages/PaymentSuccess";
import Tracker from "./pages/Tracker";
import Checkin from "./pages/Checkin";
import Pricing from "./pages/Pricing";
import GuidanceLibrary from "./pages/GuidanceLibrary";
import FAQ from "./pages/FAQ";
import Dashboard from "./pages/Dashboard";
import Subscribe from "./pages/Subscribe";
import Modules from "./pages/Modules";
import ModuleDetail from "./pages/ModuleDetail";
import AskSolo from "./pages/AskSolo";
import Guidance from "./pages/Guidance";
import NotFound from "./pages/NotFound";
import Footer from "@/components/Footer";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";

const queryClient = new QueryClient();

function AnimatedRoutes() {
  const location = useLocation();

  return (
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
          <Route path="/cv-upload" element={<div>CV Upload (coming next)</div>} />
          <Route path="/questionnaire" element={<Questionnaire />} />
          <Route path="/processing" element={<Processing />} />
          <Route path="/teaser" element={<Teaser />} />

          {/* Conversion */}
          <Route path="/payment-success" element={<PaymentSuccess />} />

          {/* Gated routes */}
          <Route path="/plan" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/checkin/:sessionId" element={<ProtectedRoute><Checkin /></ProtectedRoute>} />
          <Route path="/library" element={<ProtectedRoute><GuidanceLibrary /></ProtectedRoute>} />
          <Route path="/library/modules/:id" element={<ProtectedRoute><ModuleDetail /></ProtectedRoute>} />
          <Route path="/ask-solo" element={<ProtectedRoute><AskSolo /></ProtectedRoute>} />
          <Route path="/subscribe" element={<ProtectedRoute><Subscribe /></ProtectedRoute>} />
          <Route path="/results" element={<ProtectedRoute><Results /></ProtectedRoute>} />
          <Route path="/tracker" element={<ProtectedRoute><Tracker /></ProtectedRoute>} />
          <Route path="/guidance" element={<ProtectedRoute><Guidance /></ProtectedRoute>} />
          <Route path="/modules" element={<ProtectedRoute><Modules /></ProtectedRoute>} />
          <Route path="/modules/:id" element={<ProtectedRoute><ModuleDetail /></ProtectedRoute>} />

          {/* Errors */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AnimatedRoutes />
          <Footer />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
