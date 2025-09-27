import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export const RouteGuard = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    // Require authentication for all protected routes
    const publicRoutes = ['/auth', '/invite', '/onboarding'];
    const isPublicRoute = publicRoutes.some(route => 
      location.pathname === route || location.pathname.startsWith(route + '/')
    );

    // Redirect unauthenticated users to onboarding first
    if (!user && !isPublicRoute) {
      navigate("/onboarding", { replace: true });
      return;
    }

    // Redirect authenticated users away from auth and onboarding pages
    if (user && (location.pathname === "/auth" || location.pathname === "/onboarding")) {
      navigate("/app", { replace: true });
      return;
    }

    // Mark demo seen only on true landing page
    if (location.pathname === "/" && !localStorage.getItem("hasSeenDemo")) {
      localStorage.setItem("hasSeenDemo", "true");
    }
  }, [user, loading, location.pathname, navigate]);

  return <>{children}</>;
};