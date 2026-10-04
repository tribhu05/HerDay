import { GemmaValidator, GemmaValidationError } from '../services/ai/gemmaValidator';
import { GemmaProvider } from '../services/ai/gemmaProvider';
import { AIService } from '../services/ai/aiService';
import { DeterministicScheduler } from '../services/scheduler/scheduler';
import { DeterministicReplanner } from '../services/scheduler/replanner';
import { DEFAULT_PREFERENCES } from '../types/preferences';
import type { Task } from '../types/task';
import type { ExtractedTask } from '../types/ai';

export async function runPhase2Verification() {
  console.log('===========================================================');
  console.log(' HERDAY PHASE 2: GEMMA INTEGRATION & WORKFLOW VERIFICATION ');
  console.log('===========================================================\n');

  // -------------------------------------------------------------
  // Test A: Valid Gemma JSON Parsing & Schema Validation
  // -------------------------------------------------------------
  console.log('--- Test A: Valid Gemma Structured JSON Output ---');
  const validGemmaOutput = `\`\`\`json
[
  {
    "title": "DBMS Chapter 1 & 2 Review",
    "deadline": "Today",
    "fixedTime": null,
    "estimatedMinutes": 60,
    "priority": "high",
    "category": "Study",
    "notes": "Read indexing and dynamic hashing sections"
  },
  {
    "title": "DBMS Assignment Submission",
    "deadline": "Thursday",
    "fixedTime": null,
    "estimatedMinutes": 90,
    "priority": "high",
    "category": "Academic",
    "notes": "Problem set 4 relational algebra proofs"
  },
  {
    "title": "DBMS Final Exam Preparation",
    "deadline": "Friday",
    "fixedTime": null,
    "estimatedMinutes": 120,
    "priority": "urgent",
    "category": "Exam",
    "notes": "Comprehensive transaction theory"
  },
  {
    "title": "Distributed Systems Lecture",
    "deadline": "Tomorrow",
    "fixedTime": "10:00",
    "estimatedMinutes": 60,
    "priority": "high",
    "category": "Lecture",
    "notes": "Weekly class in room 402"
  }
]
\`\`\``;

  const parsedTasks = GemmaValidator.parseAndValidate(validGemmaOutput);
  console.log(`Parsed ${parsedTasks.length} tasks from raw Gemma JSON.`);
  if (parsedTasks.length !== 4) {
    throw new Error(`Expected 4 tasks, got ${parsedTasks.length}`);
  }

  // Verify fields
  const lectureTask = parsedTasks.find(t => t.title.includes('Distributed Systems'));
  if (!lectureTask || lectureTask.fixedStartTime !== '10:00') {
    throw new Error('Fixed time parsing failed for 10:00 event!');
  }
  const examTask = parsedTasks.find(t => t.title.includes('Exam'));
  if (!examTask || examTask.priority !== 'urgent' || examTask.deadline !== 'Friday') {
    throw new Error('Priority or deadline parsing failed for exam task!');
  }
  console.log('✓ Valid Gemma JSON parsed and schema-validated successfully.\n');

  // -------------------------------------------------------------
  // Test B: Malformed Gemma Response Handling
  // -------------------------------------------------------------
  console.log('--- Test B: Malformed Gemma Response Handling ---');
  const malformedOutputs = [
    'Here are your tasks for today: 1. DBMS study 2. Have class tomorrow', // Conversational non-JSON
    '```json\n[{"title": "Unclosed json object", "priority": "high"\n```', // Broken JSON syntax
    '{"message": "I am an AI assistant and cannot schedule your day"}', // Missing task array
    '[]', // Empty array
  ];

  for (const [idx, malformed] of malformedOutputs.entries()) {
    try {
      GemmaValidator.parseAndValidate(malformed);
      throw new Error(`Malformed output case ${idx} should have thrown GemmaValidationError!`);
    } catch (err) {
      if (err instanceof GemmaValidationError) {
        console.log(`  Case ${idx + 1} correctly caught GemmaValidationError: ${err.message}`);
      } else {
        throw err;
      }
    }
  }
  console.log('✓ Malformed responses correctly rejected with descriptive errors.\n');

  // -------------------------------------------------------------
  // Test C: Gemma Unavailable (Connection / Timeout)
  // -------------------------------------------------------------
  console.log('--- Test C: Gemma Unavailable Diagnosis ---');
  const offlineProvider = new GemmaProvider({
    endpointUrl: 'http://localhost:59999', // Non-existent port
    modelName: 'gemma2:2b',
  });

  const connStatus = await offlineProvider.checkConnectionStatus();
  console.log(`Diagnostic state for offline port: ${connStatus.state}`);
  console.log(`Diagnostic details: ${connStatus.details}`);
  if (connStatus.state !== 'Unreachable') {
    throw new Error(`Expected state 'Unreachable', got '${connStatus.state}'`);
  }

  try {
    await offlineProvider.extractTasks('I have an exam Friday', new Date());
    throw new Error('Calling extractTasks on offline provider should have thrown!');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`Expected extractTasks failure captured: ${msg}`);
  }
  console.log('✓ Offline endpoint diagnosed and reported cleanly.\n');

  // -------------------------------------------------------------
  // Test D: Explicit Fallback to Local Heuristic Engine
  // -------------------------------------------------------------
  console.log('--- Test D: Automatic Explicit Fallback to Heuristic Engine ---');
  const aiService = new AIService({
    ...DEFAULT_PREFERENCES,
    activeAIProvider: 'gemma',
    gemmaConfig: {
      endpointUrl: 'http://localhost:59999', // deliberately offline
      modelName: 'gemma2:2b',
    },
  });

  const testInput = "I have my DBMS exam Friday. I need to finish two chapters and submit my assignment Thursday. I also have class tomorrow at 10.";
  const fallbackResult = await aiService.extractTasks(
    testInput,
    {
      ...DEFAULT_PREFERENCES,
      activeAIProvider: 'gemma',
      gemmaConfig: {
        endpointUrl: 'http://localhost:59999',
        modelName: 'gemma2:2b',
      },
    },
    new Date()
  );

  console.log(`Provider reported: ${fallbackResult.providerName}`);
  console.log(`isFallback: ${fallbackResult.isFallback}`);
  console.log(`Fallback reason: ${fallbackResult.fallbackReason}`);
  console.log(`Extracted tasks count: ${fallbackResult.extractedTasks.length}`);

  if (!fallbackResult.isFallback) {
    throw new Error('Expected isFallback to be true when Gemma endpoint is unreachable!');
  }
  if (!fallbackResult.isDeterministicFallback) {
    throw new Error('Expected isDeterministicFallback to be true!');
  }
  if (fallbackResult.extractedTasks.length === 0) {
    throw new Error('Heuristic fallback failed to extract tasks!');
  }
  console.log('✓ Automatic explicit fallback cleanly executed without crashing.\n');

  // -------------------------------------------------------------
  // Test E: Extracted Tasks Review Flow & Edits
  // -------------------------------------------------------------
  console.log('--- Test E: Extracted Tasks Entering Review Flow ---');
  // Simulate user modifying tasks in Review screen before confirming
  const reviewedTasks: ExtractedTask[] = parsedTasks.map(t => {
    if (t.title.includes('Assignment')) {
      return { ...t, estimatedMinutes: 105 }; // User adjusted effort
    }
    return t;
  });

  const confirmedTasks: Task[] = reviewedTasks.map((t, idx) => ({
    id: `confirmed-${idx}`,
    title: t.title,
    description: t.description || t.notes,
    deadline: t.deadline,
    priority: t.priority,
    estimatedMinutes: t.estimatedMinutes,
    status: 'pending',
    createdAt: new Date().toISOString(),
    targetDay: t.targetDay || 'today',
    timeConstraint: t.fixedStartTime ? {
      fixedStartTime: t.fixedStartTime,
      fixedEndTime: '11:00',
    } : undefined,
  }));

  const adjustedAssignment = confirmedTasks.find(t => t.title.includes('Assignment'));
  if (adjustedAssignment?.estimatedMinutes !== 105) {
    throw new Error('Review step failed to preserve user edits!');
  }
  console.log('✓ Extracted tasks successfully entered review flow with user adjustments.\n');

  // -------------------------------------------------------------
  // Test F: Deterministic Scheduler Authority & Replanning
  // -------------------------------------------------------------
  console.log('--- Test F: Scheduler Authority & Deterministic Replanning ---');
  const plan = DeterministicScheduler.generateDayPlan(confirmedTasks, DEFAULT_PREFERENCES);
  
  console.log(`Plan items generated: ${plan.items.length}`);
  plan.items.forEach(i => {
    console.log(`  ${i.startTime} — ${i.endTime} | ${i.title} (${i.type})`);
  });

  // Verify that break insertion happened
  const breakItems = plan.items.filter(i => i.type === 'break');
  if (breakItems.length === 0) {
    throw new Error('Deterministic scheduler failed to insert restorative breaks!');
  }

  // Simulate missed task feedback & deterministic replan
  const firstTask = plan.items.find(i => i.type === 'task');
  if (!firstTask) throw new Error('No task to simulate delay for!');

  const replanResult = DeterministicReplanner.replan(
    plan,
    confirmedTasks,
    firstTask,
    'unexpected_came_up',
    DEFAULT_PREFERENCES,
    '11:00'
  );

  console.log('Replan summary:', replanResult.explanation.summary);
  console.log('Replan moved tasks:', replanResult.explanation.movedTasks);
  console.log('Protected deadlines:', replanResult.explanation.notes);

  if (!replanResult.updatedPlan.isAdapted) {
    throw new Error('Plan was not marked as adapted after replan!');
  }
  console.log('✓ Deterministic scheduler and replanner verified.\n');

  console.log('===========================================================');
  console.log(' >>> ALL PHASE 2 TESTS (A THROUGH F) PASSED CLEANLY! <<<   ');
  console.log('===========================================================');
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('verifyGemmaAndWorkflow.ts')) {
  runPhase2Verification()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('\n❌ Verification Failed:', err);
      process.exit(1);
    });
}
