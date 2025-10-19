import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export const RouteGuard = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    // Debug logging
    console.log('RouteGuard - Current path:', location.pathname, 'User:', !!user, 'Loading:', loading);

    // Require authentication for all protected routes
    const publicRoutes = ['/auth', '/invite', '/onboarding'];
    const isPublicRoute = publicRoutes.some(route => 
      location.pathname === route || location.pathname.startsWith(route + '/')
    );

    // Allow Auth page to handle redirect param without being intercepted
    const searchParams = new URLSearchParams(location.search);
    const isAuthWithRedirect = location.pathname === '/auth' && searchParams.has('redirect');

    // Redirect unauthenticated users to onboarding
    if (!user && !isPublicRoute) {
      console.log('Redirecting unauthenticated user to onboarding');
      navigate("/onboarding", { replace: true });
      return;
    }

    // Redirect authenticated users away from auth and initial onboarding pages to the main app
    // But allow access to onboarding flow pages (baby-setup, village, ready)
    const onboardingFlowPages = ['/onboarding/baby-setup', '/onboarding/village', '/onboarding/ready'];
    const isOnboardingFlow = onboardingFlowPages.some(route => location.pathname === route);
    
    // Only redirect from /onboarding if not already in the flow and user is authenticated
    // This prevents redirect loops when coming from /app
    if (user && !isAuthWithRedirect && !isOnboardingFlow && location.pathname === "/onboarding") {
      console.log('Redirecting authenticated user from onboarding landing to main app');
      navigate("/app", { replace: true });
      return;
    }
    
    // Redirect from /auth to /app if authenticated and no redirect param
    if (user && !isAuthWithRedirect && location.pathname === "/auth") {
      console.log('Redirecting authenticated user from auth to main app');
      navigate("/app", { replace: true });
      return;
    }
    
    // Redirect from root to app if authenticated (root now points to Index component)
    if (user && location.pathname === "/") {
      // No need to redirect - Index component is already rendered at /
      return;
    }

    // Mark demo seen only on true landing page
    if (location.pathname === "/" && !localStorage.getItem("hasSeenDemo")) {
      localStorage.setItem("hasSeenDemo", "true");
    }
  }, [user, loading, location.pathname, location.search, navigate]);

  return <>{children}</>;
};