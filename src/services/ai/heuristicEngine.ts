import type { AIProvider, ExtractedTask, ExtractionResult } from '../../types/ai';
import type { Priority } from '../../types/task';

/**
 * Local Heuristic Engine
 * A deterministic, rule-based natural language parser.
 * Runs completely offline in the browser without external APIs.
 * Clearly labeled to never pretend to be an LLM.
 */
export class LocalHeuristicEngine implements AIProvider {
  id = 'heuristic';
  name = 'Local Heuristic Engine';

  async isAvailable(): Promise<boolean> {
    return true; // Always available offline
  }

  async extractTasks(inputText: string, _contextDate: Date): Promise<ExtractionResult> {
    const rawText = inputText.trim();
    if (!rawText) {
      return {
        providerName: this.name,
        isDeterministicFallback: true,
        extractedTasks: [],
        rawSummary: 'No input provided.',
      };
    }

    // Split text into meaningful statements / sentences / clauses
    // E.g. "I have my DBMS exam Friday. I need to finish two chapters and submit my assignment Thursday. I also have class tomorrow at 10."
    const sentences = rawText
      .split(/(?<=[.!?])\s+|;\s*|\n+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    const extracted: ExtractedTask[] = [];

    // Extract context topic if repeated (e.g., "DBMS", "CS101", "Math")
    const topicMatch = rawText.match(/\b([A-Z]{2,6}(?:\s*\d{1,4})?)\b/);
    const inferredTopic = topicMatch ? topicMatch[1] : '';

    for (const sentence of sentences) {
      // Check for compound "and" tasks within sentence if they represent distinct actions
      const clauses = this.splitClauses(sentence);

      for (const clause of clauses) {
        const clauseLower = clause.toLowerCase();

        // 1. Check for multi-item patterns like "two chapters", "2 chapters", "three problems"
        const countChapterMatch = clauseLower.match(/\b(two|three|four|2|3|4)\s+(chapters?|modules?|sections?|papers?)\b/i);
        if (countChapterMatch) {
          const countWord = countChapterMatch[1];
          const count = countWord === 'two' || countWord === '2' ? 2 : countWord === 'three' || countWord === '3' ? 3 : 4;
          const entityType = countChapterMatch[2].replace(/s$/, ''); // e.g. "chapter"

          // Check if specific numbers follow, e.g. "chapters 3 and 4" or default to 1..N
          const specificNums = clauseLower.match(/chapters?\s+(\d+)\s*(?:and|&|,)\s*(\d+)/i);
          const startNum = specificNums ? parseInt(specificNums[1], 10) : 1;

          for (let i = 0; i < count; i++) {
            const num = specificNums ? parseInt(specificNums[i] || `${startNum + i}`, 10) : (i + 1);
            const prefix = inferredTopic ? `${inferredTopic} ` : '';
            extracted.push({
              id: `extracted-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              title: `${prefix}${this.capitalize(entityType)} ${num}`,
              description: `Study and finish ${entityType} ${num}${inferredTopic ? ` for ${inferredTopic}` : ''}`,
              priority: this.inferPriority(clauseLower),
              estimatedMinutes: 60,
              deadline: this.inferDeadline(clauseLower) || 'Today',
              targetDay: 'today',
            });
          }
          continue;
        }

        // 2. Check for exam / test / quiz
        const examMatch = clauseLower.match(/\b(?:have\s+)?(?:my\s+)?([a-z0-9\s]+?)\s*(exam|quiz|midterm|final|test)\b/i);
        if (examMatch || clauseLower.includes('exam') || clauseLower.includes('quiz')) {
          const examDeadline = this.inferDeadline(clauseLower) || 'Friday';
          const title = inferredTopic 
            ? `${inferredTopic} Exam` 
            : this.cleanTaskTitle(clause, ['have my', 'i have', 'there is an']);

          extracted.push({
            id: `extracted-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            title: title.includes('Exam') || title.includes('exam') ? this.capitalizeWords(title) : `${title} Exam`,
            description: `Prepare for upcoming exam due on ${examDeadline}`,
            priority: 'urgent',
            estimatedMinutes: 90,
            deadline: examDeadline,
            targetDay: examDeadline.toLowerCase().includes('friday') ? 'Friday' : 'upcoming',
          });
          continue;
        }

        // 3. Check for assignment / project / report submission
        const assignmentMatch = clauseLower.match(/\b(assignment|homework|project|submission|report|paper)\b/i);
        if (assignmentMatch) {
          const deadline = this.inferDeadline(clauseLower) || 'Thursday';
          const prefix = inferredTopic ? `${inferredTopic} ` : '';
          extracted.push({
            id: `extracted-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            title: `${prefix}${this.capitalize(assignmentMatch[1])}`,
            description: `Complete and submit ${assignmentMatch[1]}${inferredTopic ? ` for ${inferredTopic}` : ''}`,
            priority: 'high',
            estimatedMinutes: 90,
            deadline: deadline,
            targetDay: deadline.toLowerCase().includes('today') ? 'today' : deadline,
          });
          continue;
        }

        // 4. Check for fixed events: "class", "meeting", "lecture", "call" with fixed times like "at 10" or "at 2pm"
        const fixedTimeMatch = clauseLower.match(/\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i);
        const eventMatch = clauseLower.match(/\b(class|lecture|meeting|lab|seminar|session|sync)\b/i);

        if (eventMatch || fixedTimeMatch) {
          let timeFormatted: string | null = null;
          if (fixedTimeMatch) {
            let hour = parseInt(fixedTimeMatch[1], 10);
            const minute = fixedTimeMatch[2] ? fixedTimeMatch[2].padStart(2, '0') : '00';
            const meridiem = fixedTimeMatch[3]?.toLowerCase();

            if (meridiem === 'pm' && hour < 12) hour += 12;
            if (meridiem === 'am' && hour === 12) hour = 0;
            // Default 10 without am/pm is usually 10:00 AM
            timeFormatted = `${hour.toString().padStart(2, '0')}:${minute}`;
          }

          const eventName = eventMatch ? this.capitalize(eventMatch[1]) : 'Scheduled Event';
          const prefix = inferredTopic ? `${inferredTopic} ` : '';
          const targetDay = clauseLower.includes('tomorrow') ? 'tomorrow' : 'today';

          extracted.push({
            id: `extracted-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            title: `${prefix}${eventName}`,
            description: `Attend ${eventName.toLowerCase()}${timeFormatted ? ` at ${timeFormatted}` : ''}`,
            priority: 'high',
            estimatedMinutes: 60,
            fixedStartTime: timeFormatted || '10:00',
            deadline: targetDay === 'tomorrow' ? 'Tomorrow' : 'Today',
            targetDay: targetDay,
          });
          continue;
        }

        // 5. General action sentence (e.g. "I need to review notes", "read paper")
        const actionMatch = clause.match(/(?:need to|have to|must|should|want to|finish|complete|review|read|study)\s+([^,.]+)/i);
        if (actionMatch && actionMatch[1].length > 3) {
          const actionText = actionMatch[1].trim();
          extracted.push({
            id: `extracted-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            title: this.capitalizeWords(actionText),
            description: clause.trim(),
            priority: this.inferPriority(clauseLower),
            estimatedMinutes: this.inferDuration(clauseLower),
            deadline: this.inferDeadline(clauseLower) || 'Today',
            targetDay: 'today',
          });
        }
      }
    }

    // Fallback: If nothing was matched by specific patterns, construct a clean single task
    if (extracted.length === 0) {
      extracted.push({
        id: `extracted-${Date.now()}-1`,
        title: this.cleanTaskTitle(rawText, ['i need to', 'i want to', 'please', 'plan to']),
        description: rawText,
        priority: this.inferPriority(rawText.toLowerCase()),
        estimatedMinutes: 45,
        deadline: this.inferDeadline(rawText.toLowerCase()) || 'Today',
        targetDay: 'today',
      });
    }

    return {
      providerName: this.name,
      isDeterministicFallback: true,
      extractedTasks: extracted,
      rawSummary: `Parsed ${extracted.length} structured task${extracted.length === 1 ? '' : 's'} via rule-based heuristic parser.`,
    };
  }

  private splitClauses(sentence: string): string[] {
    // Splits on " and submit ", " also have ", " then ", but keeps meaningful compound units
    const parts = sentence.split(/\b(?:and\s+submit|and\s+finish|also\s+have|and\s+also|then)\b/i);
    if (parts.length > 1) {
      return parts.map(p => p.trim()).filter(Boolean);
    }
    return [sentence];
  }

  private inferPriority(text: string): Priority {
    if (text.includes('exam') || text.includes('urgent') || text.includes('asap') || text.includes('today')) {
      return 'urgent';
    }
    if (text.includes('assignment') || text.includes('submit') || text.includes('class') || text.includes('important')) {
      return 'high';
    }
    if (text.includes('read') || text.includes('chapter') || text.includes('study')) {
      return 'medium';
    }
    return 'low';
  }

  private inferDeadline(text: string): string | null {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    for (const day of days) {
      if (text.includes(day)) {
        return this.capitalize(day);
      }
    }
    if (text.includes('tomorrow')) return 'Tomorrow';
    if (text.includes('tonight')) return 'Tonight';
    if (text.includes('today')) return 'Today';
    return null;
  }

  private inferDuration(text: string): number {
    if (text.includes('quick') || text.includes('review') || text.includes('check')) return 30;
    if (text.includes('assignment') || text.includes('project') || text.includes('exam')) return 90;
    if (text.includes('chapter') || text.includes('read') || text.includes('study')) return 60;
    return 45;
  }

  private cleanTaskTitle(text: string, removePrefixes: string[]): string {
    let cleaned = text.trim();
    for (const prefix of removePrefixes) {
      const reg = new RegExp(`^${prefix}\\s+`, 'i');
      cleaned = cleaned.replace(reg, '');
    }
    return this.capitalize(cleaned.slice(0, 50));
  }

  private capitalize(str: string): string {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  private capitalizeWords(str: string): string {
    return str.replace(/\b\w/g, l => l.toUpperCase());
  }
}
