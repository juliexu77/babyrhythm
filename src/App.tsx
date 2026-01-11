import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/hooks/useAuth";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { RouteGuard } from "@/components/RouteGuard";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { DuskModeManager } from "@/components/DuskModeManager";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import InviteAccept from "./pages/InviteAccept";
import Onboarding from "./pages/Onboarding";
import BabySetup from "./pages/BabySetup";
import VillageInvite from "./pages/VillageInvite";
import NotFound from "./pages/NotFound";
import WeeklyReport from "./pages/WeeklyReport";


const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        enableSystem
        themes={["light", "dark", "dusk"]}
        disableTransitionOnChange
      >
        <DuskModeManager />
        <AuthProvider>
          <LanguageProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <RouteGuard>
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/app" element={<Index />} />
                    <Route path="/onboarding" element={<Onboarding />} />
                    <Route path="/onboarding/baby-setup" element={<BabySetup />} />
                    <Route path="/onboarding/village" element={<VillageInvite />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/login" element={<Auth />} />
                    <Route path="/invite/:code" element={<InviteAccept />} />
                    <Route path="/report/weekly" element={<WeeklyReport />} />
                    
                    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </RouteGuard>
              </BrowserRouter>
            </TooltipProvider>
          </LanguageProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
