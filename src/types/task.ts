export type Priority = 'urgent' | 'high' | 'medium' | 'low';

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'missed' | 'cancelled';

export type MissedReason = 
  | 'longer_than_expected' 
  | 'unexpected_came_up' 
  | 'not_productive' 
  | 'not_important' 
  | 'other';

export interface TaskFeedback {
  reason: MissedReason;
  notes?: string;
  recordedAt: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  deadline?: string | null; // e.g. "2026-10-04", "Friday", "Thursday 23:59"
  deadlineDate?: string | null; // ISO string if resolved to a concrete date
  priority: Priority;
  estimatedMinutes: number;
  status: TaskStatus;
  createdAt: string;
  completedAt?: string | null;
  scheduledDate?: string | null; // YYYY-MM-DD
  targetDay?: string | null;
  timeConstraint?: {
    fixedStartTime?: string; // "10:00" for fixed class/event
    fixedEndTime?: string;   // "11:00"
  };
  feedbackHistory?: TaskFeedback[];
  tags?: string[];
}
