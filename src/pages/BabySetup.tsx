import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BabyProfileSetup } from "@/components/BabyProfileSetup";

const BabySetup = () => {
  const navigate = useNavigate();

  const handleProfileComplete = (profile: { name: string; birthday?: string }) => {
    // Store baby profile
    localStorage.setItem("babyProfile", JSON.stringify(profile));
    
    // Navigate to main app
    navigate("/app");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <BabyProfileSetup onComplete={handleProfileComplete} />
      </div>
    </div>
  );
};

export default BabySetup;