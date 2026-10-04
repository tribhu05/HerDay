import type { Plan, ScheduledItem, ReplanExplanation } from '../../types/plan';
import type { Task, MissedReason } from '../../types/task';
import type { UserPreferences } from '../../types/preferences';

import { minutesToTime, timeToMinutes } from './scheduler';

export interface ReplanResult {
  updatedPlan: Plan;
  updatedTasks: Task[];
  explanation: ReplanExplanation;
}

export class DeterministicReplanner {
  /**
   * Adapts today's schedule when a task is delayed or missed.
   * Utilizes the user's feedback reason to make intelligent, deterministic adjustments.
   */
  static replan(
    currentPlan: Plan,
    tasks: Task[],
    missedItem: ScheduledItem,
    reason: MissedReason,
    preferences: UserPreferences,
    fromTime: string = minutesToTime(timeToMinutes(missedItem.endTime))
  ): ReplanResult {
    const workEnd = timeToMinutes(preferences.workingHours.endTime || '21:30');
    const referenceMin = Math.max(timeToMinutes(fromTime), timeToMinutes(missedItem.startTime));

    const movedTasks: ReplanExplanation['movedTasks'] = [];
    const deferredTasks: ReplanExplanation['deferredTasks'] = [];
    const notes: string[] = [];

    // Clone tasks to update state/duration if needed
    const updatedTasks = tasks.map(t => ({ ...t }));
    const targetTask = updatedTasks.find(t => t.id === missedItem.taskId);

    // If reason is "not_important", remove from today's plan completely
    if (reason === 'not_important') {
      if (targetTask) {
        targetTask.status = 'cancelled';
      }
      const filteredItems = currentPlan.items.filter(i => i.id !== missedItem.id);
      
      const explanation: ReplanExplanation = {
        summary: `Removed "${missedItem.title}" from today's schedule since it's no longer important.`,
        movedTasks: [],
        deferredTasks: [],
        notes: [
          `No other tasks were disrupted.`,
          `Your remaining deadlines and fixed classes stay intact.`,
        ],
      };

      return {
        updatedPlan: {
          ...currentPlan,
          items: filteredItems,
          isAdapted: true,
          updatedAt: new Date().toISOString(),
          latestReplanExplanation: explanation,
        },
        updatedTasks,
        explanation,
      };
    }

    // Adjust estimated time if task took longer than expected
    let durationToAdd = missedItem.durationMinutes;
    if (reason === 'longer_than_expected') {
      durationToAdd = Math.round(missedItem.durationMinutes * 1.3);
      if (targetTask) {
        targetTask.estimatedMinutes = durationToAdd;
      }
    }

    // Separate completed items, untouched past items, and future items
    const completedItems = currentPlan.items.filter(
      i => i.status === 'completed' || (timeToMinutes(i.endTime) <= referenceMin && i.id !== missedItem.id)
    );

    // Remaining items to schedule from now on
    const remainingToPlace: ScheduledItem[] = [];

    // The missed item needs to be rescheduled
    remainingToPlace.push({
      ...missedItem,
      durationMinutes: durationToAdd,
      status: 'scheduled',
    });

    // Add remaining items from the plan that were scheduled after referenceMin
    for (const item of currentPlan.items) {
      if (item.id === missedItem.id) continue;
      if (timeToMinutes(item.startTime) >= referenceMin && item.status !== 'completed') {
        remainingToPlace.push(item);
      }
    }

    // Separate fixed items from flexible items in the remaining pool
    const fixedItems = remainingToPlace.filter(i => i.isFixedTime);
    const flexibleItems = remainingToPlace.filter(i => !i.isFixedTime && i.type === 'task');

    // Sort flexible items: missed item gets priority or is placed in next sensible slot
    // If reason is 'not_productive' or 'unexpected_came_up', give a small breather or place in evening
    let currentCursor = referenceMin;

    if (reason === 'not_productive' || reason === 'unexpected_came_up') {
      // Add a 15-minute breather before resuming
      currentCursor += 15;
    }

    const newScheduledItems: ScheduledItem[] = [...completedItems];

    for (const item of flexibleItems) {
      const duration = item.durationMinutes || 45;

      // Check if cursor exceeds working hours
      if (currentCursor + duration > workEnd) {
        // Cannot fit today! Defer to tomorrow
        deferredTasks.push({
          taskTitle: item.title,
          reason: 'Moved to tomorrow to respect your daily rest hours.',
        });
        const deferredTask = updatedTasks.find(t => t.id === item.taskId);
        if (deferredTask) {
          deferredTask.targetDay = 'tomorrow';
        }
        continue;
      }

      // Check for fixed conflicts (e.g. class at 10:00)
      const conflict = fixedItems.find(
        f => timeToMinutes(f.startTime) < currentCursor + duration && timeToMinutes(f.endTime) > currentCursor
      );

      if (conflict) {
        // Place fixed item first
        if (!newScheduledItems.some(i => i.id === conflict.id)) {
          newScheduledItems.push(conflict);
        }
        currentCursor = timeToMinutes(conflict.endTime);
      }

      const originalStart = item.startTime;
      const newStart = minutesToTime(currentCursor);
      const newEnd = minutesToTime(currentCursor + duration);

      if (originalStart !== newStart) {
        movedTasks.push({
          taskTitle: item.title,
          originalTime: originalStart,
          newTime: newStart,
          reason: item.id === missedItem.id ? `Adjusted due to delay (${this.getReasonLabel(reason)})` : `Shifted to make room for priority tasks`,
        });
      }

      newScheduledItems.push({
        ...item,
        startTime: newStart,
        endTime: newEnd,
      });

      currentCursor += duration;
    }

    // Ensure all fixed items are included
    for (const fixed of fixedItems) {
      if (!newScheduledItems.some(i => i.id === fixed.id)) {
        newScheduledItems.push(fixed);
      }
    }

    // Sort chronologically
    newScheduledItems.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

    // Construct clear, human-designed summary
    const summary = movedTasks.length > 0
      ? `${missedItem.title} was rescheduled to ${movedTasks[0]?.newTime || 'a later slot'}. ${
          deferredTasks.length > 0
            ? `${deferredTasks.map(d => d.taskTitle).join(', ')} deferred to tomorrow.`
            : 'Remaining tasks shifted smoothly.'
        }`
      : `Schedule adapted to absorb delay.`;

    // Deadline safety notes
    const deadlines = updatedTasks
      .filter(t => t.deadline && t.deadline !== 'Today')
      .map(t => `${t.title} deadline remains ${t.deadline}.`);
    
    if (deadlines.length > 0) {
      notes.push(...deadlines);
    } else {
      notes.push('All critical deadlines remain protected.');
    }

    const explanation: ReplanExplanation = {
      summary,
      movedTasks,
      deferredTasks,
      notes,
    };

    return {
      updatedPlan: {
        ...currentPlan,
        items: newScheduledItems,
        isAdapted: true,
        updatedAt: new Date().toISOString(),
        latestReplanExplanation: explanation,
      },
      updatedTasks,
      explanation,
    };
  }

  private static getReasonLabel(reason: MissedReason): string {
    switch (reason) {
      case 'longer_than_expected':
        return 'needed more time';
      case 'unexpected_came_up':
        return 'unexpected event';
      case 'not_productive':
        return 'low energy break';
      case 'not_important':
        return 'deprioritized';
      case 'other':
      default:
        return 'rescheduled';
    }
  }
}
