import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BabyProfileSetup } from "@/components/BabyProfileSetup";
import { useBabyProfile } from "@/hooks/useBabyProfile";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const BabySetup = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { babyProfile, loading: profileLoading, createBabyProfile } = useBabyProfile();
  const { toast } = useToast();

  // Check if user already has baby profile, skip setup
  useEffect(() => {
    if (authLoading || profileLoading) return;

    // Require authentication - redirect to auth if not logged in
    if (!user) {
      navigate("/auth");
      return;
    }

    // If user has a database profile, redirect to main app
    if (babyProfile) {
      navigate("/app");
      return;
    }

    // Otherwise show baby setup
  }, [user, babyProfile, authLoading, profileLoading, navigate]);

  const handleProfileComplete = async (profile: { name: string; birthday?: string }) => {
    try {
      if (!user) {
        throw new Error('Authentication required to create baby profile');
      }

      // For authenticated users, create database profile
      await createBabyProfile(profile.name, profile.birthday);
      
      // Navigate to main app
      navigate("/app");
    } catch (error) {
      console.error('Error creating baby profile:', error);
      toast({
        title: "Error creating profile",
        description: "Please try again or contact support.",
        variant: "destructive"
      });
    }
  };

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <BabyProfileSetup onComplete={handleProfileComplete} />
      </div>
    </div>
  );
};

export default BabySetup;