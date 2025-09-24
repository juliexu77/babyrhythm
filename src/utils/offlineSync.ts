import { Activity } from "@/components/ActivityCard";

const OFFLINE_STORAGE_KEY = 'baby_tracker_offline_activities';
const SYNC_STATUS_KEY = 'baby_tracker_sync_status';

export interface OfflineActivity extends Activity {
  timestamp: number;
  synced: boolean;
}

export class OfflineSync {
  private static instance: OfflineSync;
  private isOnline: boolean = navigator.onLine;
  private syncCallbacks: Array<(activities: Activity[]) => void> = [];

  private constructor() {
    this.setupEventListeners();
  }

  static getInstance(): OfflineSync {
    if (!OfflineSync.instance) {
      OfflineSync.instance = new OfflineSync();
    }
    return OfflineSync.instance;
  }

  private setupEventListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.syncPendingActivities();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  // Store activity offline
  storeOfflineActivity(activity: Omit<Activity, 'id'>): Activity {
    const offlineActivity: OfflineActivity = {
      ...activity,
      id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      synced: false
    };

    const existingActivities = this.getOfflineActivities();
    const updatedActivities = [offlineActivity, ...existingActivities];
    
    localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(updatedActivities));
    
    // If online, attempt immediate sync
    if (this.isOnline) {
      setTimeout(() => this.syncPendingActivities(), 100);
    }

    return offlineActivity;
  }

  // Get all stored activities (both synced and unsynced)
  getOfflineActivities(): OfflineActivity[] {
    try {
      const stored = localStorage.getItem(OFFLINE_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error reading offline activities:', error);
      return [];
    }
  }

  // Get only unsynced activities
  getPendingActivities(): OfflineActivity[] {
    return this.getOfflineActivities().filter(activity => !activity.synced);
  }

  // Mark activities as synced
  markAsSynced(activityIds: string[]) {
    const activities = this.getOfflineActivities();
    const updatedActivities = activities.map(activity => 
      activityIds.includes(activity.id) 
        ? { ...activity, synced: true }
        : activity
    );
    
    localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(updatedActivities));
  }

  // Sync pending activities to server
  async syncPendingActivities() {
    if (!this.isOnline) return;

    const pendingActivities = this.getPendingActivities();
    if (pendingActivities.length === 0) return;

    try {
      // In a real app, this would sync to your backend
      // For now, we'll just mark them as synced
      console.log(`Syncing ${pendingActivities.length} offline activities...`);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mark as synced
      const activityIds = pendingActivities.map(a => a.id);
      this.markAsSynced(activityIds);
      
      // Notify subscribers
      const allActivities = this.getOfflineActivities();
      this.syncCallbacks.forEach(callback => callback(allActivities));
      
      console.log('Offline activities synced successfully');
      
      // Show notification
      this.showSyncNotification(pendingActivities.length);
      
    } catch (error) {
      console.error('Sync failed:', error);
    }
  }

  // Subscribe to sync events
  onSync(callback: (activities: Activity[]) => void) {
    this.syncCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      this.syncCallbacks = this.syncCallbacks.filter(cb => cb !== callback);
    };
  }

  // Clear all offline data (useful for testing or after major sync)
  clearOfflineData() {
    localStorage.removeItem(OFFLINE_STORAGE_KEY);
    localStorage.removeItem(SYNC_STATUS_KEY);
  }

  // Get connection status
  isOffline(): boolean {
    return !this.isOnline;
  }

  // Get sync status info
  getSyncStatus() {
    const pending = this.getPendingActivities().length;
    const total = this.getOfflineActivities().length;
    
    return {
      pendingCount: pending,
      totalCount: total,
      isOnline: this.isOnline,
      lastSyncAttempt: localStorage.getItem(SYNC_STATUS_KEY)
    };
  }

  private showSyncNotification(count: number) {
    // In a real app, you might use a toast notification library
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Baby Tracker', {
        body: `${count} activities synced successfully`,
        icon: '/favicon.ico'
      });
    }
  }
}

// Export singleton instance
export const offlineSync = OfflineSync.getInstance();