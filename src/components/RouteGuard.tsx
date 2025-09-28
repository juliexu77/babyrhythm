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

    // Redirect unauthenticated users to onboarding first
    if (!user && !isPublicRoute) {
      console.log('Redirecting unauthenticated user to onboarding');
      navigate("/onboarding", { replace: true });
      return;
    }

    // Redirect authenticated users away from auth and onboarding pages to the main app
    if (user && !isAuthWithRedirect && (location.pathname === "/auth" || location.pathname === "/onboarding" || location.pathname === "/")) {
      console.log('Redirecting authenticated user to main app');
      navigate("/app", { replace: true });
      return;
    }

    // Mark demo seen only on true landing page
    if (location.pathname === "/" && !localStorage.getItem("hasSeenDemo")) {
      localStorage.setItem("hasSeenDemo", "true");
    }
  }, [user, loading, location.pathname, location.search, navigate]);

  return <>{children}</>;
};