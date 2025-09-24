import { useState, useEffect } from "react";
import { Wifi, WifiOff, Cloud, CloudOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { offlineSync } from "@/utils/offlineSync";

export const OfflineIndicator = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState(offlineSync.getSyncStatus());

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setSyncStatus(offlineSync.getSyncStatus());
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      setSyncStatus(offlineSync.getSyncStatus());
    };

    const updateSyncStatus = () => {
      setSyncStatus(offlineSync.getSyncStatus());
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Subscribe to sync updates
    const unsubscribe = offlineSync.onSync(updateSyncStatus);
    
    // Update sync status periodically
    const interval = setInterval(updateSyncStatus, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  if (isOnline && syncStatus.pendingCount === 0) {
    return null; // Hide when everything is synced and online
  }

  return (
    <div className="fixed top-4 right-4 z-50">
      {!isOnline ? (
        <Badge variant="destructive" className="flex items-center gap-1">
          <WifiOff className="h-3 w-3" />
          Offline
        </Badge>
      ) : syncStatus.pendingCount > 0 ? (
        <Badge variant="secondary" className="flex items-center gap-1">
          <Cloud className="h-3 w-3" />
          Syncing {syncStatus.pendingCount}...
        </Badge>
      ) : null}
    </div>
  );
};