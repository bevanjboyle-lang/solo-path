import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation, useParams } from "react-router-dom";
import { getClientSessionId } from "@/lib/clientSession";
import { installSupabaseFetchHeader } from "@/lib/supabaseClient";
// Install the X-Client-Session-Id fetch wrapper at module load so it's active
// before any Supabase call fires (including the AuthProvider's getSession on mount).
installSupabaseFetchHeader();
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { AnimatePresence, motion } from "framer-motion";
import ProtectedRoute from "@/components/ProtectedRoute";
import ErrorBoundary from "@/components/ErrorBoundary";
import MintTopBar from "@/components/MintTopBar";
import CookieBanner from "@/components/CookieBanner";
import AskSoloWidget from "@/components/AskSoloWidget";
import Landing from "./pages/Landing";
import CVUpload from "./pages/CVUpload";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import AuthConfirm from "./pages/AuthConfirm";
import Questionnaire from "./pages/Questionnaire";
import Processing from "./pages/Processing";
// F47 (2026-04-19): Results import removed — /results is not in route map v1.2.
// Canonical post-payment flow per ADR-010 is /teaser → Stripe → /payment-success → /plan.
import Teaser from "./pages/Teaser";
import PaymentSuccess from "./pages/PaymentSuccess";
import Plan from "./pages/Plan";
import Report from "./pages/Report";
import CheckinHistory from "./pages/CheckinHistory";
import Pricing from "./pages/Pricing";
import Library from "./pages/Library";
import FAQ from "./pages/FAQ";
import Subscribe from "./pages/Subscribe";
import AskSolo from "./pages/AskSolo";
import Account from "./pages/Account";
import NotFound from "./pages/NotFound";
import ServerError from "./pages/ServerError";
import DevScreens from "./pages/DevScreens";
import SampleReport from "./pages/SampleReport";
import Signal from "./pages/Signal";
import HowItWorks from "./pages/HowItWorks";
import Footer from "@/components/Footer";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";

/** Deep-link wrapper: /checkin/:sessionId → Plan with pre-opened drawer */
function CheckinDeepLink() {
	const { sessionId } = useParams();
	return <Plan initialSessionId={sessionId} />;
}

/**
 * ScrollToTop — resets window scroll to top on every pathname change.
 *
 * Without this, React Router preserves scroll position across navigations
 * (its default behaviour), so navigating from the bottom of a long page
 * (e.g. Landing scrolled to §08) to a shorter page (e.g. /pricing) lands
 * the user at the previous scroll offset on the new page — often below
 * the visible content. Common SPA papercut, reported 2026-05-18.
 *
 * Hash-anchor deep links are respected: if the URL carries a #hash (e.g.
 * /faq#faq-cost), this skips the reset and lets the destination page's
 * own deep-link handler scroll to the anchored element (FAQ.tsx already
 * has one). Search-string changes (e.g. ?from=day31) are not treated as
 * navigation events for this purpose.
 */
function ScrollToTop() {
	const { pathname, hash } = useLocation();
	useEffect(() => {
		if (hash) return;
		window.scrollTo(0, 0);
	}, [pathname, hash]);
	return null;
}

const queryClient = new QueryClient();

// Footer policy (consistency-sweep 2026-05-18, locked by Bevan):
// App.tsx renders the Footer for every route NOT in this list. The list is
// narrowed to surfaces where chrome below the fold would actively hurt the
// experience:
//   • the focused conversion funnel (single-surface flow, no distraction)
//   • auth surfaces (sign-in / magic-link confirmation)
//   • full-screen conversation (Ask Solo)
//   • the check-in drawer deep-link (opens over /plan, not a true route)
// Every reference + reading + dashboard surface (Landing, Pricing, FAQ,
// Privacy, Terms, Sample Report, Plan, Report, Library, Account, Subscribe,
// NotFound, ServerError) renders the Footer. Page components do NOT render
// their own <Footer />; App.tsx is the sole authority. The previous list
// inadvertently hid Footer on 7 reading surfaces (visual-audit finding).
const FOOTERLESS_ROUTES = [
  "/cv-upload", "/questionnaire", "/processing", "/teaser", "/payment-success",
  "/auth", "/auth/callback", "/auth/confirm",
  "/ask-solo",
  "/checkin",
];

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
						<Route path="/sample-report" element={<SampleReport />} />
						<Route path="/how-it-works" element={<HowItWorks />} />
						<Route path="/signal" element={<Signal />} />
						<Route path="/privacy" element={<PrivacyPolicy />} />
						<Route path="/terms" element={<TermsOfService />} />
						<Route path="/auth" element={<Auth />} />
						<Route path="/auth/callback" element={<AuthCallback />} />
						{/* F94 v25: non-PKCE magic-link entry for server-minted links (daily check-in emails). */}
						<Route path="/auth/confirm" element={<AuthConfirm />} />

						{/* Activation funnel — anonymous */}
						<Route path="/cv-upload" element={<CVUpload />} />
						<Route path="/questionnaire" element={<Questionnaire />} />
						<Route path="/processing" element={<Processing />} />
						<Route path="/teaser" element={<Teaser />} />

						{/* Conversion */}
						<Route path="/payment-success" element={<PaymentSuccess />} />

						{/* Gated routes */}
						<Route path="/plan" element={<ProtectedRoute><Plan /></ProtectedRoute>} />
						<Route path="/report" element={<ProtectedRoute><Report /></ProtectedRoute>} />
						{/* /checkin/history must precede /checkin/:sessionId so it matches first. */}
						<Route path="/checkin/history" element={<ProtectedRoute><CheckinHistory /></ProtectedRoute>} />
						<Route path="/checkin/:sessionId" element={<ProtectedRoute><CheckinDeepLink /></ProtectedRoute>} />
						<Route path="/library" element={<ProtectedRoute><Library /></ProtectedRoute>} />
						<Route path="/library/modules/:id" element={<ProtectedRoute><Library /></ProtectedRoute>} />
						<Route path="/ask-solo" element={<ProtectedRoute><AskSolo /></ProtectedRoute>} />
						<Route path="/account" element={<ProtectedRoute><Account /></ProtectedRoute>} />
						<Route path="/subscribe" element={<ProtectedRoute><Subscribe /></ProtectedRoute>} />
						{/* F47 (2026-04-19): /results route removed — not in route map v1.2. */}

						{/* Errors */}
						<Route path="/500" element={<ServerError />} />
						<Route path="/404" element={<NotFound />} />

						{/* Dev-only: self-gated screen index */}
						<Route path="/dev/screens" element={<DevScreens />} />

						<Route path="*" element={<NotFound />} />
					</Routes>
				</motion.div>
			</AnimatePresence>
			{!hideFooter && <Footer />}
		</>
	);
}

const App = () => {
	// Persist client_session_id on first mount so it exists before any
	// user-initiated network call (defense-in-depth; module-load already covers most).
	useEffect(() => { getClientSessionId(); }, []);

	return (
		<ErrorBoundary>
			<QueryClientProvider client={queryClient}>
				<TooltipProvider>
					{/* Global fixed office-photo background — sits behind every page. */}
					<div
						aria-hidden="true"
						style={{
							position: "fixed",
							inset: 0,
							zIndex: -10,
							backgroundImage: "url('/office-bg.jpg')",
							backgroundSize: "cover",
							backgroundPosition: "center",
							filter: "grayscale(40%)",
							transform: "scale(1.02)",
						}}
					/>
					{/* Global 4px mint stripe — non-negotiable brand element on every page. */}
					<MintTopBar />
					<Toaster />
					<Sonner />
					<BrowserRouter>
						<AuthProvider>
							<ScrollToTop />
							<AnimatedRoutes />
							<AskSoloWidget mode="floating" />
							<CookieBanner />
						</AuthProvider>
					</BrowserRouter>
				</TooltipProvider>
			</QueryClientProvider>
		</ErrorBoundary>
	);
};

export default App;
