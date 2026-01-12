import { useState, useEffect, useCallback } from "react";
import { useHousehold } from "./useHousehold";
import { toast } from "sonner";

const STORAGE_KEY = "milestone_calibrations";

interface CalibrationData {
  [householdId: string]: {
    [domainId: string]: {
      confirmedStage: number;
      confirmedAt: string;
    };
  };
}

interface UseMilestoneCalibrationReturn {
  calibrationFlags: Record<string, number>;
  confirmMilestone: (domainId: string, stageNumber: number) => void;
  resetMilestone: (domainId: string) => void;
  resetAllMilestones: () => void;
  getConfirmedAt: (domainId: string) => Date | null;
  isLoading: boolean;
}

export function useMilestoneCalibration(): UseMilestoneCalibrationReturn {
  const { household } = useHousehold();
  const [calibrationData, setCalibrationData] = useState<CalibrationData>({});
  const [isLoading, setIsLoading] = useState(true);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setCalibrationData(JSON.parse(stored));
      }
    } catch (err) {
      console.error("Failed to load milestone calibrations:", err);
    }
    setIsLoading(false);
  }, []);

  // Save to localStorage whenever data changes
  const saveToStorage = useCallback((data: CalibrationData) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (err) {
      console.error("Failed to save milestone calibrations:", err);
    }
  }, []);

  // Get calibration flags for current household
  const calibrationFlags: Record<string, number> = household?.id
    ? Object.fromEntries(
        Object.entries(calibrationData[household.id] || {}).map(
          ([domainId, data]) => [domainId, data.confirmedStage]
        )
      )
    : {};

  // Confirm a milestone for a domain
  const confirmMilestone = useCallback(
    (domainId: string, stageNumber: number) => {
      if (!household?.id) {
        toast.error("No household found");
        return;
      }

      setCalibrationData((prev) => {
        const updated: CalibrationData = {
          ...prev,
          [household.id]: {
            ...(prev[household.id] || {}),
            [domainId]: {
              confirmedStage: stageNumber,
              confirmedAt: new Date().toISOString(),
            },
          },
        };
        saveToStorage(updated);
        return updated;
      });

      toast.success("Milestone confirmed!", {
        description: "Progress has been saved.",
      });
    },
    [household?.id, saveToStorage]
  );

  // Reset a single domain's milestone
  const resetMilestone = useCallback(
    (domainId: string) => {
      if (!household?.id) return;

      setCalibrationData((prev) => {
        const householdData = { ...(prev[household.id] || {}) };
        delete householdData[domainId];

        const updated: CalibrationData = {
          ...prev,
          [household.id]: householdData,
        };
        saveToStorage(updated);
        return updated;
      });

      toast.success("Milestone reset");
    },
    [household?.id, saveToStorage]
  );

  // Reset all milestones for current household
  const resetAllMilestones = useCallback(() => {
    if (!household?.id) return;

    setCalibrationData((prev) => {
      const updated: CalibrationData = { ...prev };
      delete updated[household.id];
      saveToStorage(updated);
      return updated;
    });

    toast.success("All milestones reset");
  }, [household?.id, saveToStorage]);

  // Get when a milestone was confirmed
  const getConfirmedAt = useCallback(
    (domainId: string): Date | null => {
      if (!household?.id) return null;
      const data = calibrationData[household.id]?.[domainId];
      return data ? new Date(data.confirmedAt) : null;
    },
    [household?.id, calibrationData]
  );

  return {
    calibrationFlags,
    confirmMilestone,
    resetMilestone,
    resetAllMilestones,
    getConfirmedAt,
    isLoading,
  };
}
