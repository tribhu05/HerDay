export type ItemType = 'task' | 'break';

export type ScheduleItemStatus = 'scheduled' | 'in_progress' | 'completed' | 'missed' | 'delayed';

export interface ScheduledItem {
  id: string;
  taskId?: string; // Optional if it's a break
  title: string;
  type: ItemType;
  startTime: string; // "HH:mm" (24-hour format)
  endTime: string;   // "HH:mm"
  durationMinutes: number;
  status: ScheduleItemStatus;
  isFixedTime?: boolean; // For events like "Class at 10:00"
  completedAt?: string | null;
  priority?: 'urgent' | 'high' | 'medium' | 'low';
  deadlineNotice?: string; // e.g. "Due Thursday"
}

export interface ReplanExplanation {
  summary: string;
  movedTasks: Array<{
    taskTitle: string;
    originalTime: string;
    newTime: string;
    reason: string;
  }>;
  deferredTasks: Array<{
    taskTitle: string;
    reason: string;
  }>;
  notes: string[];
}

export interface Plan {
  id: string;
  date: string; // YYYY-MM-DD
  items: ScheduledItem[];
  generatedAt: string;
  updatedAt?: string;
  isAdapted?: boolean;
  latestReplanExplanation?: ReplanExplanation;
}
