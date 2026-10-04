import type { Task } from '../../types/task';
import type { Plan, ScheduledItem } from '../../types/plan';
import type { UserPreferences } from '../../types/preferences';


// Helper: Convert "HH:mm" to minutes from midnight
export function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + (m || 0);
}

// Helper: Convert minutes from midnight to "HH:mm"
export function minutesToTime(totalMinutes: number): string {
  const norm = ((totalMinutes % (24 * 60)) + (24 * 60)) % (24 * 60);
  const h = Math.floor(norm / 60);
  const m = norm % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

export class DeterministicScheduler {
  /**
   * Generates a realistic daily plan from a set of tasks and user preferences.
   * Pure deterministic application logic - no LLM hallucinations or slot drift.
   */
  static generateDayPlan(
    tasks: Task[],
    preferences: UserPreferences,
    targetDate: string = new Date().toISOString().split('T')[0]
  ): Plan {
    const workStart = timeToMinutes(preferences.workingHours.startTime || '09:00');
    const workEnd = timeToMinutes(preferences.workingHours.endTime || '21:30');
    const breakInterval = preferences.breakPreferences.intervalMinutes || 90;
    const breakDuration = preferences.breakPreferences.durationMinutes || 15;

    // Filter tasks suitable for today:
    // Exclude completed or cancelled tasks, and tasks explicitly targeted for other specific future dates (unless no deadline)
    const todayTasks = tasks.filter(t => {
      if (t.status === 'completed' || t.status === 'cancelled') return false;
      if (t.targetDay && t.targetDay.toLowerCase() === 'tomorrow') return false;
      return true;
    });

    // 1. Separate fixed-time events from flexible tasks
    const fixedItems: ScheduledItem[] = [];
    const flexibleTasks: Task[] = [];

    for (const task of todayTasks) {
      if (task.timeConstraint?.fixedStartTime) {
        const startMin = timeToMinutes(task.timeConstraint.fixedStartTime);
        const duration = task.estimatedMinutes || 60;
        const endMin = task.timeConstraint.fixedEndTime
          ? timeToMinutes(task.timeConstraint.fixedEndTime)
          : startMin + duration;

        fixedItems.push({
          id: `sched-${task.id}`,
          taskId: task.id,
          title: task.title,
          type: 'task',
          startTime: task.timeConstraint.fixedStartTime,
          endTime: minutesToTime(endMin),
          durationMinutes: endMin - startMin,
          status: 'scheduled',
          isFixedTime: true,
          priority: task.priority,
          deadlineNotice: task.deadline ? `Due ${task.deadline}` : undefined,
        });
      } else {
        flexibleTasks.push(task);
      }
    }

    // Sort fixed items chronologically
    fixedItems.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

    // Sort flexible tasks by priority and duration
    // Priority order: urgent (0) > high (1) > medium (2) > low (3)
    const priorityWeight: Record<string, number> = {
      urgent: 0,
      high: 1,
      medium: 2,
      low: 3,
    };

    flexibleTasks.sort((a, b) => {
      const weightDiff = (priorityWeight[a.priority] ?? 2) - (priorityWeight[b.priority] ?? 2);
      if (weightDiff !== 0) return weightDiff;
      // If priority is equal, prioritize shorter tasks (quick wins) or earlier deadline
      return a.estimatedMinutes - b.estimatedMinutes;
    });

    const scheduledItems: ScheduledItem[] = [];
    let currentCursor = workStart;
    let minutesWorkedSinceBreak = 0;
    let breakIndex = 1;

    // Helper: find next fixed conflict
    const getNextFixedConflict = (cursor: number) => {
      return fixedItems.find(f => timeToMinutes(f.startTime) >= cursor);
    };

    // Helper: is cursor currently inside a fixed item?
    const getActiveFixedItem = (cursor: number) => {
      return fixedItems.find(f => {
        const s = timeToMinutes(f.startTime);
        const e = timeToMinutes(f.endTime);
        return cursor >= s && cursor < e;
      });
    };

    for (const task of flexibleTasks) {
      if (currentCursor >= workEnd) {
        // Exceeded working hours, stop scheduling for today
        break;
      }

      // Check if current cursor overlaps with a fixed item
      const activeFixed = getActiveFixedItem(currentCursor);
      if (activeFixed) {
        if (!scheduledItems.some(i => i.id === activeFixed.id)) {
          scheduledItems.push(activeFixed);
        }
        currentCursor = timeToMinutes(activeFixed.endTime);
        minutesWorkedSinceBreak = 0;
      }

      // Check if it's time for a restorative break
      if (minutesWorkedSinceBreak >= breakInterval && currentCursor + breakDuration <= workEnd) {
        const breakEnd = currentCursor + breakDuration;
        scheduledItems.push({
          id: `break-${Date.now()}-${breakIndex++}`,
          title: 'Break & Reset',
          type: 'break',
          startTime: minutesToTime(currentCursor),
          endTime: minutesToTime(breakEnd),
          durationMinutes: breakDuration,
          status: 'scheduled',
        });
        currentCursor = breakEnd;
        minutesWorkedSinceBreak = 0;
      }

      const taskDuration = Math.max(15, task.estimatedMinutes || 45);
      const nextFixed = getNextFixedConflict(currentCursor);

      // If next fixed item starts before this task can finish, place break or schedule fixed item first
      if (nextFixed && currentCursor + taskDuration > timeToMinutes(nextFixed.startTime)) {
        // Can we squeeze a shorter break before the fixed item?
        const gap = timeToMinutes(nextFixed.startTime) - currentCursor;
        if (gap >= 15) {
          scheduledItems.push({
            id: `break-${Date.now()}-${breakIndex++}`,
            title: 'Short Break',
            type: 'break',
            startTime: minutesToTime(currentCursor),
            endTime: minutesToTime(currentCursor + gap),
            durationMinutes: gap,
            status: 'scheduled',
          });
        }

        // Add the fixed item
        if (!scheduledItems.some(i => i.id === nextFixed.id)) {
          scheduledItems.push(nextFixed);
        }
        currentCursor = timeToMinutes(nextFixed.endTime);
        minutesWorkedSinceBreak = 0;
      }

      // Schedule the flexible task
      if (currentCursor + taskDuration <= workEnd) {
        scheduledItems.push({
          id: `sched-${task.id}`,
          taskId: task.id,
          title: task.title,
          type: 'task',
          startTime: minutesToTime(currentCursor),
          endTime: minutesToTime(currentCursor + taskDuration),
          durationMinutes: taskDuration,
          status: 'scheduled',
          priority: task.priority,
          deadlineNotice: task.deadline ? `Due ${task.deadline}` : undefined,
        });

        currentCursor += taskDuration;
        minutesWorkedSinceBreak += taskDuration;
      }
    }

    // Add any remaining fixed items that haven't been pushed yet
    for (const fixed of fixedItems) {
      if (!scheduledItems.some(i => i.id === fixed.id)) {
        scheduledItems.push(fixed);
      }
    }

    // Sort all scheduled items strictly chronologically
    scheduledItems.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

    return {
      id: `plan-${targetDate}`,
      date: targetDate,
      items: scheduledItems,
      generatedAt: new Date().toISOString(),
      isAdapted: false,
    };
  }
}
