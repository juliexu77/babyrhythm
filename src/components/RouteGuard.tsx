import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export const RouteGuard = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check if this is a first-time user
    const hasSeenDemo = localStorage.getItem('skipOnboarding') || 
                       localStorage.getItem('onboardingCompleted') ||
                       localStorage.getItem('hasSeenDemo');

    // If user hasn't seen demo and is not already on demo tour, redirect them
    if (!hasSeenDemo && location.pathname !== '/') {
      navigate('/');
    }
  }, [navigate, location]);

  return <>{children}</>;
};