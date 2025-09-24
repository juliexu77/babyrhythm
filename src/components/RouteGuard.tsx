import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export const RouteGuard = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check if user is authenticated and not on auth page
    // Just let them go to /app directly, no onboarding needed
    if (location.pathname === '/' && !localStorage.getItem('hasSeenDemo')) {
      // Still show demo tour on first visit to landing page
      localStorage.setItem('hasSeenDemo', 'true');
    }
  }, [navigate, location]);

  return <>{children}</>;
};