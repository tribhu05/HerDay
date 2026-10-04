import type { Task } from '../../types/task';
import type { Plan } from '../../types/plan';
import type { UserPreferences } from '../../types/preferences';

import { INITIAL_TASKS, INITIAL_PLAN, INITIAL_PREFERENCES } from './defaultData';

const KEYS = {
  TASKS: 'herday_tasks_v1',
  ACTIVE_PLAN: 'herday_active_plan_v1',
  HISTORY: 'herday_plan_history_v1',
  PREFERENCES: 'herday_preferences_v1',
};

export class LocalStorageService {
  static loadTasks(): Task[] {
    try {
      const data = localStorage.getItem(KEYS.TASKS);
      if (!data) {
        this.saveTasks(INITIAL_TASKS);
        return INITIAL_TASKS;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_TASKS;
    }
  }

  static saveTasks(tasks: Task[]): void {
    try {
      localStorage.setItem(KEYS.TASKS, JSON.stringify(tasks));
    } catch (err) {
      console.error('Failed to save tasks to localStorage', err);
    }
  }

  static loadActivePlan(): Plan {
    try {
      const data = localStorage.getItem(KEYS.ACTIVE_PLAN);
      if (!data) {
        this.saveActivePlan(INITIAL_PLAN);
        return INITIAL_PLAN;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_PLAN;
    }
  }

  static saveActivePlan(plan: Plan): void {
    try {
      localStorage.setItem(KEYS.ACTIVE_PLAN, JSON.stringify(plan));
    } catch (err) {
      console.error('Failed to save active plan to localStorage', err);
    }
  }

  static loadHistory(): Plan[] {
    try {
      const data = localStorage.getItem(KEYS.HISTORY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  static saveToHistory(plan: Plan): void {
    try {
      const history = this.loadHistory();
      const existingIdx = history.findIndex(p => p.id === plan.id || p.date === plan.date);
      if (existingIdx >= 0) {
        history[existingIdx] = plan;
      } else {
        history.unshift(plan);
      }
      // Keep up to 30 past plans
      localStorage.setItem(KEYS.HISTORY, JSON.stringify(history.slice(0, 30)));
    } catch (err) {
      console.error('Failed to save plan history to localStorage', err);
    }
  }

  static loadPreferences(): UserPreferences {
    try {
      const data = localStorage.getItem(KEYS.PREFERENCES);
      if (!data) {
        this.savePreferences(INITIAL_PREFERENCES);
        return INITIAL_PREFERENCES;
      }
      const parsed = JSON.parse(data);
      return {
        ...INITIAL_PREFERENCES,
        ...parsed,
        gemmaConfig: { ...INITIAL_PREFERENCES.gemmaConfig, ...(parsed?.gemmaConfig || {}) },
        voiceConfig: { ...INITIAL_PREFERENCES.voiceConfig, ...(parsed?.voiceConfig || {}) },
      };
    } catch {
      return INITIAL_PREFERENCES;
    }
  }

  static savePreferences(preferences: UserPreferences): void {
    try {
      localStorage.setItem(KEYS.PREFERENCES, JSON.stringify(preferences));
    } catch (err) {
      console.error('Failed to save preferences to localStorage', err);
    }
  }

  static resetAll(): void {
    localStorage.removeItem(KEYS.TASKS);
    localStorage.removeItem(KEYS.ACTIVE_PLAN);
    localStorage.removeItem(KEYS.HISTORY);
    localStorage.removeItem(KEYS.PREFERENCES);
  }
}
