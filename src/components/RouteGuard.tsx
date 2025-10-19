import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export const RouteGuard = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    const publicRoutes = ['/auth', '/login', '/invite', '/onboarding'];
    const isPublicRoute = publicRoutes.some(route => 
      location.pathname === route || location.pathname.startsWith(route + '/')
    );

    // Redirect unauthenticated users to onboarding
    if (!user && !isPublicRoute) {
      navigate("/onboarding", { replace: true });
      return;
    }

    // Redirect authenticated users away from auth pages
    if (user && (location.pathname === "/auth" || location.pathname === "/login" || location.pathname === "/onboarding")) {
      navigate("/", { replace: true });
      return;
    }
  }, [user, loading, location.pathname, navigate]);

  return <>{children}</>;
};