import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Task, MissedReason, TaskStatus } from '../types/task';
import type { Plan, ScheduledItem, ReplanExplanation } from '../types/plan';
import type { UserPreferences } from '../types/preferences';
import type { ExtractedTask, ExtractionResult } from '../types/ai';
import { LocalStorageService } from '../services/storage/localStorageService';
import { DeterministicScheduler, minutesToTime, timeToMinutes } from '../services/scheduler/scheduler';
import { DeterministicReplanner } from '../services/scheduler/replanner';
import { AIService } from '../services/ai/aiService';
import type { GemmaConnectionCheckResult } from '../services/ai/gemmaProvider';
import { ElevenLabsProvider } from '../services/voice/elevenLabsProvider';
import type { VoiceStatusResponse } from '../services/voice/voiceTypes';
import { CloudStorageService, type MongoDbStatus } from '../services/storage/cloudStorageService';
import { INITIAL_TASKS, INITIAL_PLAN } from '../services/storage/defaultData';

interface PlannerContextType {
  tasks: Task[];
  activePlan: Plan;
  preferences: UserPreferences;
  history: Plan[];
  dbStatus: MongoDbStatus;
  isExtracting: boolean;
  extractionResult: ExtractionResult | null;
  activeMissedItem: ScheduledItem | null;
  latestReplanExplanation: ReplanExplanation | null;
  replanNeeded: boolean;
  errorNotice: string | null;

  // Actions
  tellHerDay: (text: string) => Promise<void>;
  clearExtraction: () => void;
  confirmExtractedTasks: (editedTasks: ExtractedTask[], generatePlanImmediately?: boolean) => void;
  toggleCompleteScheduledItem: (itemId: string) => void;
  openMissedFeedback: (item: ScheduledItem) => void;
  closeMissedFeedback: () => void;
  submitMissedFeedbackAndReplan: (reason: MissedReason, notes?: string) => void;
  triggerManualReplan: () => void;
  dismissReplanExplanation: () => void;
  generateNewPlanForToday: () => void;
  createTask: (task: Omit<Task, 'id' | 'createdAt'>) => void;
  updateTask: (task: Task) => void;
  deleteTask: (taskId: string) => void;
  updatePreferences: (newPrefs: UserPreferences) => void;
  checkGemmaConnection: () => Promise<GemmaConnectionCheckResult>;
  checkVoiceConnection: () => Promise<VoiceStatusResponse>;
  checkDbStatus: () => Promise<MongoDbStatus>;
  migrateLocalDataToCloud: () => Promise<{ success: boolean; message: string }>;
  loadFriendScenario: () => void;
  clearAllTasks: () => void;
  resetAllData: () => void;
  clearError: () => void;
}

const PlannerContext = createContext<PlannerContextType | undefined>(undefined);

export const PlannerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tasks, setTasks] = useState<Task[]>(() => LocalStorageService.loadTasks());
  const [activePlan, setActivePlan] = useState<Plan>(() => LocalStorageService.loadActivePlan());
  const [preferences, setPreferences] = useState<UserPreferences>(() => LocalStorageService.loadPreferences());
  const [history] = useState<Plan[]>(() => LocalStorageService.loadHistory());

  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [extractionResult, setExtractionResult] = useState<ExtractionResult | null>(null);
  const [activeMissedItem, setActiveMissedItem] = useState<ScheduledItem | null>(null);
  const [latestReplanExplanation, setLatestReplanExplanation] = useState<ReplanExplanation | null>(() => {
    return activePlan.latestReplanExplanation || null;
  });
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [dbStatus, setDbStatus] = useState<MongoDbStatus>({
    configured: false,
    status: 'Not configured',
    details: 'Checking MongoDB Atlas status...',
  });

  const aiService = React.useMemo(() => new AIService(preferences), [preferences]);
  const cloudStorage = React.useMemo(() => CloudStorageService.getInstance(), []);

  // Check DB status on mount
  useEffect(() => {
    cloudStorage.checkStatus().then(setDbStatus).catch(() => {});
  }, [cloudStorage]);

  // Sync to local storage
  useEffect(() => {
    LocalStorageService.saveTasks(tasks);
  }, [tasks]);

  useEffect(() => {
    LocalStorageService.saveActivePlan(activePlan);
  }, [activePlan]);

  useEffect(() => {
    LocalStorageService.savePreferences(preferences);
    aiService.updatePreferences(preferences);
  }, [preferences, aiService]);

  // Check if any scheduled item is delayed / past due
  const replanNeeded = React.useMemo(() => {
    const now = new Date();
    const currentMin = now.getHours() * 60 + now.getMinutes();

    return activePlan.items.some(item => {
      if (item.status === 'completed' || item.type === 'break') return false;
      const endMin = timeToMinutes(item.endTime);
      // If current time is 10 minutes past the item end time and item is still uncompleted
      return currentMin > endMin + 10;
    });
  }, [activePlan]);

  // 1. Tell HerDay (Understand)
  const tellHerDay = async (text: string) => {
    setIsExtracting(true);
    setErrorNotice(null);
    try {
      const result = await aiService.extractTasks(text, preferences, new Date());
      setExtractionResult(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorNotice(msg);
      throw err;
    } finally {
      setIsExtracting(false);
    }
  };

  const clearExtraction = () => {
    setExtractionResult(null);
  };

  // 2. Review extracted tasks & Generate plan
  const confirmExtractedTasks = (editedTasks: ExtractedTask[], generatePlanImmediately = true) => {
    const todayStr = new Date().toISOString().split('T')[0];

    const newTasks: Task[] = editedTasks.map(ext => ({
      id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: ext.title,
      description: ext.description,
      deadline: ext.deadline || null,
      priority: ext.priority,
      estimatedMinutes: ext.estimatedMinutes,
      status: 'pending' as TaskStatus,
      createdAt: new Date().toISOString(),
      scheduledDate: ext.targetDay === 'today' ? todayStr : null,
      targetDay: ext.targetDay || 'today',
      timeConstraint: ext.fixedStartTime
        ? {
            fixedStartTime: ext.fixedStartTime,
            fixedEndTime: minutesToTime(timeToMinutes(ext.fixedStartTime) + ext.estimatedMinutes),
          }
        : undefined,
    }));

    const combinedTasks = [...tasks, ...newTasks];
    setTasks(combinedTasks);
    setExtractionResult(null);

    // Persist new tasks asynchronously to MongoDB if available
    newTasks.forEach(t => cloudStorage.saveTask(t).catch(() => {}));

    if (generatePlanImmediately) {
      // Re-generate or merge into today's plan
      const newPlan = DeterministicScheduler.generateDayPlan(combinedTasks, preferences, todayStr);
      setActivePlan(newPlan);
      cloudStorage.savePlan(newPlan).catch(() => {});
    }
  };

  // 3. Mark task completed / uncompleted
  const toggleCompleteScheduledItem = (itemId: string) => {
    const item = activePlan.items.find(i => i.id === itemId);
    if (!item) return;

    const isNowCompleted = item.status !== 'completed';
    const nowIso = isNowCompleted ? new Date().toISOString() : null;

    // Update scheduled item in plan
    const updatedItems = activePlan.items.map(i => {
      if (i.id === itemId) {
        return {
          ...i,
          status: (isNowCompleted ? 'completed' : 'scheduled') as ScheduledItem['status'],
          completedAt: nowIso,
        };
      }
      return i;
    });

    const updatedPlan: Plan = {
      ...activePlan,
      items: updatedItems,
      updatedAt: new Date().toISOString(),
    };
    setActivePlan(updatedPlan);
    cloudStorage.savePlan(updatedPlan).catch(() => {});

    // Update associated task if present
    if (item.taskId) {
      setTasks(prevTasks =>
        prevTasks.map(t => {
          if (t.id === item.taskId) {
            const updatedTask: Task = {
              ...t,
              status: isNowCompleted ? 'completed' : 'pending',
              completedAt: nowIso,
            };
            cloudStorage.saveTask(updatedTask).catch(() => {});
            return updatedTask;
          }
          return t;
        })
      );
    }
  };

  // 4. Missed task feedback & Replan
  const openMissedFeedback = (item: ScheduledItem) => {
    setActiveMissedItem(item);
  };

  const closeMissedFeedback = () => {
    setActiveMissedItem(null);
  };

  const submitMissedFeedbackAndReplan = (reason: MissedReason, notes?: string) => {
    if (!activeMissedItem) return;

    // Record feedback history on the task
    const recordedAt = new Date().toISOString();
    const updatedTasks = tasks.map(t => {
      if (t.id === activeMissedItem.taskId) {
        const feedbackList = t.feedbackHistory ? [...t.feedbackHistory] : [];
        feedbackList.push({ reason, notes, recordedAt });
        return {
          ...t,
          status: 'missed' as TaskStatus,
          feedbackHistory: feedbackList,
        };
      }
      return t;
    });

    // Execute replan
    const result = DeterministicReplanner.replan(
      activePlan,
      updatedTasks,
      activeMissedItem,
      reason,
      preferences
    );

    setActivePlan(result.updatedPlan);
    setTasks(result.updatedTasks);
    setLatestReplanExplanation(result.explanation);
    setActiveMissedItem(null);

    // Persist resulting plan, affected task, and replanning event to MongoDB
    cloudStorage.savePlan(result.updatedPlan).catch(() => {});
    const affectedTask = result.updatedTasks.find(t => t.id === activeMissedItem.taskId);
    if (affectedTask) {
      cloudStorage.saveTask(affectedTask).catch(() => {});
    }

    const movedItem = result.updatedPlan.items.find(i => i.taskId === activeMissedItem.taskId);
    cloudStorage.saveReplanningEvent({
      taskId: activeMissedItem.taskId || 'unknown',
      taskTitle: activeMissedItem.title,
      originalScheduledTime: activeMissedItem.startTime,
      newScheduledTime: movedItem ? movedItem.startTime : activeMissedItem.startTime,
      reason,
      notes,
      explanation: result.explanation.summary,
      timestamp: recordedAt,
    }).catch(() => {});
  };

  const triggerManualReplan = () => {
    // If there is an incomplete item whose time has elapsed, pick that
    const now = new Date();
    const currentMin = now.getHours() * 60 + now.getMinutes();
    const overdueItem = activePlan.items.find(
      i => i.status !== 'completed' && i.type === 'task' && timeToMinutes(i.endTime) <= currentMin
    ) || activePlan.items.find(i => i.status !== 'completed' && i.type === 'task');

    if (overdueItem) {
      openMissedFeedback(overdueItem);
    } else {
      // Re-generate fresh plan from active tasks
      generateNewPlanForToday();
    }
  };

  const dismissReplanExplanation = () => {
    setLatestReplanExplanation(null);
  };

  const generateNewPlanForToday = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const newPlan = DeterministicScheduler.generateDayPlan(tasks, preferences, todayStr);
    setActivePlan(newPlan);
    cloudStorage.savePlan(newPlan).catch(() => {});
  };

  const createTask = (newTaskData: Omit<Task, 'id' | 'createdAt'>) => {
    const newTask: Task = {
      ...newTaskData,
      id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
    };
    setTasks(prev => [...prev, newTask]);
    cloudStorage.saveTask(newTask).catch(() => {});
  };

  const updateTask = (updatedTask: Task) => {
    setTasks(prev => prev.map(t => (t.id === updatedTask.id ? updatedTask : t)));
    cloudStorage.saveTask(updatedTask).catch(() => {});

    // Also update title / priority in scheduled plan if present
    setActivePlan(prev => {
      const updatedPlan: Plan = {
        ...prev,
        items: prev.items.map(item => {
          if (item.taskId === updatedTask.id) {
            return {
              ...item,
              title: updatedTask.title,
              priority: updatedTask.priority,
              deadlineNotice: updatedTask.deadline ? `Due ${updatedTask.deadline}` : undefined,
            };
          }
          return item;
        }),
      };
      cloudStorage.savePlan(updatedPlan).catch(() => {});
      return updatedPlan;
    });
  };

  const deleteTask = (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
    cloudStorage.deleteTask(taskId).catch(() => {});

    setActivePlan(prev => {
      const updatedPlan: Plan = {
        ...prev,
        items: prev.items.filter(item => item.taskId !== taskId),
      };
      cloudStorage.savePlan(updatedPlan).catch(() => {});
      return updatedPlan;
    });
  };

  const updatePreferences = (newPrefs: UserPreferences) => {
    setPreferences(newPrefs);
    cloudStorage.savePreferences(newPrefs).catch(() => {});
  };

  const loadFriendScenario = () => {
    setTasks(INITIAL_TASKS);
    setActivePlan(INITIAL_PLAN);
    LocalStorageService.saveTasks(INITIAL_TASKS);
    LocalStorageService.saveActivePlan(INITIAL_PLAN);
  };

  const clearAllTasks = () => {
    const today = new Date().toISOString().split('T')[0];
    const emptyPlan: Plan = {
      id: `plan-${today}`,
      date: today,
      generatedAt: new Date().toISOString(),
      items: [],
    };
    setTasks([]);
    setActivePlan(emptyPlan);
    LocalStorageService.saveTasks([]);
    LocalStorageService.saveActivePlan(emptyPlan);
  };

  const resetAllData = () => {
    LocalStorageService.resetAll();
    window.location.reload();
  };

  const checkGemmaConnection = async (): Promise<GemmaConnectionCheckResult> => {
    return await aiService.getGemmaProvider().checkConnectionStatus();
  };

  const checkVoiceConnection = async (): Promise<VoiceStatusResponse> => {
    const voiceProvider = new ElevenLabsProvider();
    return await voiceProvider.getStatus();
  };

  const checkDbStatus = async (): Promise<MongoDbStatus> => {
    const status = await cloudStorage.checkStatus(true);
    setDbStatus(status);
    return status;
  };

  const migrateLocalDataToCloud = async (): Promise<{ success: boolean; message: string }> => {
    return await cloudStorage.migrateFromLocal({
      tasks,
      activePlan,
      preferences,
    });
  };

  const clearError = () => {
    setErrorNotice(null);
  };

  return (
    <PlannerContext.Provider
      value={{
        tasks,
        activePlan,
        preferences,
        history,
        dbStatus,
        isExtracting,
        extractionResult,
        activeMissedItem,
        latestReplanExplanation,
        replanNeeded,
        errorNotice,
        tellHerDay,
        clearExtraction,
        confirmExtractedTasks,
        toggleCompleteScheduledItem,
        openMissedFeedback,
        closeMissedFeedback,
        submitMissedFeedbackAndReplan,
        triggerManualReplan,
        dismissReplanExplanation,
        generateNewPlanForToday,
        createTask,
        updateTask,
        deleteTask,
        updatePreferences,
        checkGemmaConnection,
        checkVoiceConnection,
        checkDbStatus,
        migrateLocalDataToCloud,
        loadFriendScenario,
        clearAllTasks,
        resetAllData,
        clearError,
      }}
    >
      {children}
    </PlannerContext.Provider>
  );
};

export const usePlanner = (): PlannerContextType => {
  const context = useContext(PlannerContext);
  if (!context) {
    throw new Error('usePlanner must be used within a PlannerProvider');
  }
  return context;
};

