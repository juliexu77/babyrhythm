import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

export const RouteGuard = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useAuth();

  useEffect(() => {
    // TEMPORARY: Auth disabled for testing
    // if (loading) return;

    // const publicRoutes = ['/auth', '/login', '/invite', '/onboarding'];
    // const isPublicRoute = publicRoutes.some(route => 
    //   location.pathname === route || location.pathname.startsWith(route + '/')
    // );

    // // Redirect unauthenticated users to onboarding
    // if (!user && !isPublicRoute) {
    //   navigate("/onboarding", { replace: true });
    //   return;
    // }

    // // Redirect authenticated users away from auth/login pages only (allow onboarding subpages for setup)
    // if (user && (location.pathname === "/auth" || location.pathname === "/login")) {
    //   navigate("/", { replace: true });
    //   return;
    // }
  }, [user, loading, location.pathname, navigate]);

  // TEMPORARY: Skip loading spinner for testing
  // if (loading) {
  //   return (
  //     <div className="flex items-center justify-center min-h-screen">
  //       <LoadingSpinner />
  //     </div>
  //   );
  // }

  return <>{children}</>;
};