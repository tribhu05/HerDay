import type { ExtractedTask } from '../../types/ai';
import type { Priority } from '../../types/task';

export class GemmaValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GemmaValidationError';
  }
}

interface RawGemmaTask {
  title?: unknown;
  deadline?: unknown;
  fixedTime?: unknown;
  fixedStartTime?: unknown;
  estimatedMinutes?: unknown;
  priority?: unknown;
  category?: unknown;
  notes?: unknown;
  description?: unknown;
  targetDay?: unknown;
}

export class GemmaValidator {
  /**
   * Cleans raw LLM response text, extracts JSON array, and rigorously validates each task.
   * Throws GemmaValidationError if malformed or non-compliant.
   */
  static parseAndValidate(rawOutput: string): ExtractedTask[] {
    if (!rawOutput || typeof rawOutput !== 'string') {
      throw new GemmaValidationError('Empty response received from Gemma model.');
    }

    const trimmed = rawOutput.trim();

    // 1. Extract JSON block (handles ```json ... ```, ``` ... ```, or standalone [ ... ] / { "tasks": [ ... ] })
    let jsonString = '';
    const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      jsonString = codeBlockMatch[1].trim();
    } else {
      // Find outermost array [ ... ] or object { ... }
      const arrayMatch = trimmed.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (arrayMatch) {
        jsonString = arrayMatch[0];
      } else {
        const objectMatch = trimmed.match(/\{[\s\S]*\}/);
        if (objectMatch) {
          jsonString = objectMatch[0];
        } else {
          jsonString = trimmed;
        }
      }
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonString);
    } catch (parseErr: unknown) {
      const msg = parseErr instanceof Error ? parseErr.message : String(parseErr);
      throw new GemmaValidationError(`Invalid JSON syntax in Gemma output: ${msg}`);
    }

    // 2. Resolve array of tasks
    let taskList: unknown[] = [];
    if (Array.isArray(parsed)) {
      taskList = parsed;
    } else if (parsed && typeof parsed === 'object' && 'tasks' in parsed && Array.isArray((parsed as { tasks: unknown[] }).tasks)) {
      taskList = (parsed as { tasks: unknown[] }).tasks;
    } else if (parsed && typeof parsed === 'object' && 'schedule' in parsed && Array.isArray((parsed as { schedule: unknown[] }).schedule)) {
      taskList = (parsed as { schedule: unknown[] }).schedule;
    } else if (parsed && typeof parsed === 'object' && 'items' in parsed && Array.isArray((parsed as { items: unknown[] }).items)) {
      taskList = (parsed as { items: unknown[] }).items;
    } else if (parsed && typeof parsed === 'object' && 'title' in parsed) {
      // Single task object returned instead of array
      taskList = [parsed];
    } else if (parsed && typeof parsed === 'object') {
      // Check if values of the object are task objects: e.g. { "task1": { "title": ... }, "task2": { ... } }
      const values = Object.values(parsed as Record<string, unknown>);
      if (values.length > 0 && values.every(v => v && typeof v === 'object')) {
        taskList = values;
      } else {
        console.error('DEBUG - Unexpected parsed structure:', JSON.stringify(parsed, null, 2));
        throw new GemmaValidationError('Expected a JSON array of tasks or an object with a "tasks" array.');
      }
    } else {
      console.error('DEBUG - Unexpected parsed structure:', JSON.stringify(parsed, null, 2));
      throw new GemmaValidationError('Expected a JSON array of tasks or an object with a "tasks" array.');
    }

    if (taskList.length === 0) {
      throw new GemmaValidationError('Gemma returned an empty task list.');
    }

    // 3. Validate each task against schema
    const validatedTasks: ExtractedTask[] = [];

    for (let i = 0; i < taskList.length; i++) {
      const item = taskList[i];
      if (!item || typeof item !== 'object') {
        throw new GemmaValidationError(`Task item at index ${i} is not a valid object.`);
      }

      const raw = item as RawGemmaTask;

      // Title validation
      if (!raw.title || typeof raw.title !== 'string' || !raw.title.trim()) {
        throw new GemmaValidationError(`Task at index ${i} is missing a valid 'title' string.`);
      }

      // Priority validation & normalization
      const priority = this.normalizePriority(raw.priority);

      // Estimated minutes validation
      const estimatedMinutes = this.normalizeMinutes(raw.estimatedMinutes);

      // Fixed time validation (e.g. "10:00" or "14:30")
      const fixedTime = this.normalizeTime(raw.fixedTime ?? raw.fixedStartTime);

      // Deadline normalization
      const deadline = typeof raw.deadline === 'string' && raw.deadline.trim() ? raw.deadline.trim() : null;

      // Target day inference
      const targetDay = this.inferTargetDay(raw.targetDay, deadline, raw.title);

      // Notes / description / category
      const notes = typeof raw.notes === 'string' && raw.notes.trim() 
        ? raw.notes.trim() 
        : typeof raw.description === 'string' ? raw.description.trim() : undefined;

      const category = typeof raw.category === 'string' && raw.category.trim() ? raw.category.trim() : undefined;

      validatedTasks.push({
        id: `gemma-${Date.now()}-${i}`,
        title: raw.title.trim(),
        description: notes,
        deadline,
        priority,
        estimatedMinutes,
        fixedStartTime: fixedTime,
        targetDay,
        category,
        notes,
      });
    }

    return validatedTasks;
  }

  private static normalizePriority(priority: unknown): Priority {
    if (typeof priority === 'string') {
      const p = priority.toLowerCase().trim();
      if (p === 'urgent' || p === 'high' || p === 'medium' || p === 'low') {
        return p;
      }
    }
    return 'medium';
  }

  private static normalizeMinutes(minutes: unknown): number {
    if (typeof minutes === 'number' && !isNaN(minutes) && minutes > 0) {
      return Math.round(minutes);
    }
    if (typeof minutes === 'string') {
      const parsed = parseInt(minutes, 10);
      if (!isNaN(parsed) && parsed > 0) {
        return parsed;
      }
    }
    return 45; // sensible default effort
  }

  private static normalizeTime(timeVal: unknown): string | null {
    if (typeof timeVal !== 'string') return null;
    const clean = timeVal.trim();
    // Validate HH:mm (24 hour) or 12 hour pattern
    const match = clean.match(/^(\d{1,2}):(\d{2})(?:\s*(am|pm))?$/i);
    if (match) {
      let h = parseInt(match[1], 10);
      const m = match[2];
      const meridiem = match[3]?.toLowerCase();
      if (meridiem === 'pm' && h < 12) h += 12;
      if (meridiem === 'am' && h === 12) h = 0;
      return `${h.toString().padStart(2, '0')}:${m}`;
    }
    return null;
  }

  private static inferTargetDay(targetDay: unknown, deadline: string | null, title: string): string {
    if (typeof targetDay === 'string' && targetDay.trim()) {
      return targetDay.trim();
    }
    const combined = `${deadline || ''} ${title}`.toLowerCase();
    if (combined.includes('tomorrow')) return 'tomorrow';
    if (combined.includes('friday')) return 'Friday';
    if (combined.includes('thursday')) return 'Thursday';
    if (combined.includes('today')) return 'today';
    return 'today';
  }
}
