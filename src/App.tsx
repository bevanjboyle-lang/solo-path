import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import officeBg from "@/assets/office-bg.png";
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
import Activate from "./pages/Activate";
import Tracker from "./pages/Tracker";
import Checkin from "./pages/Checkin";
import HowItWorks from "./pages/HowItWorks";
import WhySolo from "./pages/WhySolo";
import AboutSolo from "./pages/AboutSolo";
import Pricing from "./pages/Pricing";
import WhoItsFor from "./pages/WhoItsFor";
import SampleReport from "./pages/SampleReport";
import GuidanceLibrary from "./pages/GuidanceLibrary";
import FAQ from "./pages/FAQ";
import Dashboard from "./pages/Dashboard";
import Subscribe from "./pages/Subscribe";
import SubscriptionSuccess from "./pages/SubscriptionSuccess";
import ManageSubscription from "./pages/ManageSubscription";
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
        className="pb-14"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        <Routes location={location}>
          <Route path="/" element={<Landing />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/why-solo" element={<WhySolo />} />
          <Route path="/about" element={<AboutSolo />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/who-its-for" element={<WhoItsFor />} />
          <Route path="/sample-report" element={<SampleReport />} />
          <Route path="/guidance-library" element={<GuidanceLibrary />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/subscribe" element={<ProtectedRoute><Subscribe /></ProtectedRoute>} />
          <Route path="/subscription-success" element={<ProtectedRoute><SubscriptionSuccess /></ProtectedRoute>} />
          <Route path="/manage-subscription" element={<ProtectedRoute><ManageSubscription /></ProtectedRoute>} />
          <Route path="/modules" element={<ProtectedRoute><Modules /></ProtectedRoute>} />
          <Route path="/modules/:id" element={<ProtectedRoute><ModuleDetail /></ProtectedRoute>} />
          <Route path="/ask-solo" element={<ProtectedRoute><AskSolo /></ProtectedRoute>} />
          <Route path="/guidance" element={<ProtectedRoute><Guidance /></ProtectedRoute>} />
          <Route path="/questionnaire" element={<ProtectedRoute><Questionnaire /></ProtectedRoute>} />
          <Route path="/processing" element={<ProtectedRoute><Processing /></ProtectedRoute>} />
          <Route path="/teaser" element={<ProtectedRoute><Teaser /></ProtectedRoute>} />
          <Route path="/results" element={<ProtectedRoute><Results /></ProtectedRoute>} />
          <Route path="/payment-success" element={<ProtectedRoute><PaymentSuccess /></ProtectedRoute>} />
          <Route path="/activate" element={<ProtectedRoute><Activate /></ProtectedRoute>} />
          <Route path="/tracker" element={<ProtectedRoute><Tracker /></ProtectedRoute>} />
          <Route path="/checkin/:sessionId" element={<ProtectedRoute><Checkin /></ProtectedRoute>} />
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
      {/* Global background image with warm overlay */}
      <div className="fixed inset-0 -z-10">
        <img src={officeBg} alt="" className="h-full w-full object-cover" style={{ filter: "blur(2px)" }} />
        <div className="absolute inset-0" style={{
          background: "linear-gradient(to bottom, hsla(30, 8%, 88%, 0.68), hsla(30, 8%, 88%, 0.76))",
        }} />
      </div>
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
