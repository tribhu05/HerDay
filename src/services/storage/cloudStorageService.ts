import type { Task } from '../../types/task';
import type { Plan } from '../../types/plan';
import type { UserPreferences } from '../../types/preferences';

export interface MongoDbStatus {
  configured: boolean;
  status: 'Connected' | 'Not configured' | 'Offline';
  databaseName?: string;
  details: string;
  error?: string;
}

export interface ReplanEventPayload {
  id?: string;
  taskId: string;
  taskTitle: string;
  originalScheduledTime: string;
  newScheduledTime: string;
  reason: string;
  notes?: string;
  explanation?: string;
  timestamp?: string;
}

export class CloudStorageService {
  private static instance: CloudStorageService | null = null;
  private cachedStatus: MongoDbStatus | null = null;
  private lastCheckTime = 0;

  static getInstance(): CloudStorageService {
    if (!CloudStorageService.instance) {
      CloudStorageService.instance = new CloudStorageService();
    }
    return CloudStorageService.instance;
  }

  /**
   * Checks current connection status to MongoDB Atlas via server API.
   * Caches status briefly to prevent excess requests.
   */
  async checkStatus(force = false): Promise<MongoDbStatus> {
    const now = Date.now();
    if (!force && this.cachedStatus && now - this.lastCheckTime < 10000) {
      return this.cachedStatus;
    }

    try {
      const response = await fetch('/api/db/status', {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as Record<string, unknown>;
        const statusObj: MongoDbStatus = {
          configured: false,
          status: 'Offline',
          details: (errorData.details as string) || `Database server returned HTTP ${response.status}`,
          error: (errorData.error as string) || response.statusText,
        };
        this.cachedStatus = statusObj;
        this.lastCheckTime = now;
        return statusObj;
      }

      const data = (await response.json()) as MongoDbStatus;
      this.cachedStatus = data;
      this.lastCheckTime = now;
      return data;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const statusObj: MongoDbStatus = {
        configured: false,
        status: 'Offline',
        details: 'Unable to contact local persistence server. LocalStorage fallback is active.',
        error: msg,
      };
      this.cachedStatus = statusObj;
      this.lastCheckTime = now;
      return statusObj;
    }
  }

  /**
   * Fetches all tasks from MongoDB Atlas if available.
   * Returns null if database is offline or unconfigured.
   */
  async fetchTasks(): Promise<Task[] | null> {
    try {
      const response = await fetch('/api/db/tasks');
      if (!response.ok) return null;
      const data = (await response.json()) as { tasks: Task[] };
      return Array.isArray(data.tasks) ? data.tasks : null;
    } catch {
      return null;
    }
  }

  /**
   * Persists a created or updated task to MongoDB Atlas.
   */
  async saveTask(task: Task): Promise<boolean> {
    try {
      const response = await fetch('/api/db/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Removes a task from MongoDB Atlas by ID.
   */
  async deleteTask(taskId: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/db/tasks/${encodeURIComponent(taskId)}`, {
        method: 'DELETE',
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Persists a day plan to MongoDB Atlas.
   */
  async savePlan(plan: Plan): Promise<boolean> {
    try {
      const response = await fetch('/api/db/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(plan),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Persists a replanning event to MongoDB Atlas.
   */
  async saveReplanningEvent(event: ReplanEventPayload): Promise<boolean> {
    try {
      const response = await fetch('/api/db/replanning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...event,
          timestamp: event.timestamp || new Date().toISOString(),
        }),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Persists user preferences to MongoDB Atlas (sanitizes API keys).
   */
  async savePreferences(preferences: UserPreferences): Promise<boolean> {
    try {
      // Client-side sanitization prior to transit
      const sanitized = {
        ...preferences,
        gemmaConfig: {
          ...preferences.gemmaConfig,
          apiKey: undefined, // Never send API keys to DB
        },
      };

      const response = await fetch('/api/db/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sanitized),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Migrates local storage tasks, active plan, and preferences to MongoDB Atlas.
   */
  async migrateFromLocal(data: {
    tasks: Task[];
    activePlan: Plan;
    preferences: UserPreferences;
  }): Promise<{ success: boolean; message: string; migratedTasks?: number }> {
    try {
      const sanitizedPrefs = {
        ...data.preferences,
        gemmaConfig: {
          ...data.preferences.gemmaConfig,
          apiKey: undefined,
        },
      };

      const response = await fetch('/api/db/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tasks: data.tasks,
          activePlan: data.activePlan,
          preferences: sanitizedPrefs,
        }),
      });

      if (!response.ok) {
        const errJson = (await response.json().catch(() => ({}))) as Record<string, unknown>;
        return {
          success: false,
          message: (errJson.error as string) || `Migration failed with status ${response.status}`,
        };
      }

      const resData = (await response.json()) as {
        success: boolean;
        migratedTasks: number;
        migratedPlan: boolean;
        migratedPreferences: boolean;
      };

      return {
        success: true,
        message: `Successfully migrated ${resData.migratedTasks} tasks and active plan to MongoDB Atlas.`,
        migratedTasks: resData.migratedTasks,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        message: `Network error during migration: ${msg}`,
      };
    }
  }
}
