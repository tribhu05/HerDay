import { GemmaProvider } from '../services/ai/gemmaProvider';
import { AIService } from '../services/ai/aiService';
import { DeterministicScheduler } from '../services/scheduler/scheduler';
import { DeterministicReplanner } from '../services/scheduler/replanner';
import { DEFAULT_PREFERENCES } from '../types/preferences';
import type { Task } from '../types/task';

async function testLiveOllama() {
  console.log('=================================================================');
  console.log(' HERDAY: LIVE REAL GEMMA OPEN-WEIGHT MODEL VERIFICATION VIA OLLAMA');
  console.log('=================================================================\n');

  // 1. Connection Diagnostic
  console.log('--- Step 1: Testing Gemma Connection Diagnostic ---');
  const provider = new GemmaProvider({
    endpointUrl: 'http://localhost:11434',
    modelName: 'gemma2:2b',
  });

  const conn = await provider.checkConnectionStatus();
  console.log(`Connection state: ${conn.state}`);
  console.log(`Connection details: ${conn.details}`);
  console.log(`Available models: ${conn.availableModels?.join(', ') || 'none'}\n`);

  if (conn.state !== 'Connected') {
    throw new Error(`Failed to connect to Gemma: ${conn.details}`);
  }

  // 2. Real Natural Language Extraction
  console.log('--- Step 2: Testing Real Gemma Inference Task Extraction ---');
  const userPrompt = 'I have my DBMS exam Friday. I need to finish two chapters and submit my assignment Thursday. I also have class tomorrow at 10.';
  console.log(`Input Prompt: "${userPrompt}"`);
  console.log('Sending request to real Gemma model at http://localhost:11434/api/chat ...');

  const startTime = Date.now();
  const extractionResult = await provider.extractTasks(userPrompt, new Date());
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log(`Inference completed in ${elapsed}s.`);
  console.log(`Provider: ${extractionResult.providerName}`);
  console.log(`Is Fallback: ${extractionResult.isFallback}`);
  console.log(`Model Used: ${extractionResult.modelUsed}`);
  console.log(`Extracted Tasks Count: ${extractionResult.extractedTasks.length}`);
  console.log('\nExtracted Tasks:');
  extractionResult.extractedTasks.forEach((t, idx) => {
    console.log(`  [${idx + 1}] "${t.title}"`);
    console.log(`      Deadline: ${t.deadline || 'none'} | Fixed Time: ${t.fixedStartTime || 'flexible'}`);
    console.log(`      Est. Minutes: ${t.estimatedMinutes} | Priority: ${t.priority} | Category: ${t.category || 'none'}`);
    if (t.notes) console.log(`      Notes: ${t.notes}`);
  });

  if (extractionResult.isFallback) {
    throw new Error('Result was marked as fallback! Real Gemma should not be fallback.');
  }
  if (extractionResult.extractedTasks.length === 0) {
    throw new Error('No tasks were extracted by real Gemma model.');
  }

  // 3. User Review / Edit Simulation
  console.log('\n--- Step 3: Simulating User Review Screen & Edits ---');
  const confirmedTasks: Task[] = extractionResult.extractedTasks.map((t, idx) => ({
    id: `confirmed-${Date.now()}-${idx}`,
    title: t.title,
    description: t.notes || t.description,
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
  console.log(`User confirmed ${confirmedTasks.length} tasks after review.`);

  // 4. Deterministic Scheduler
  console.log('\n--- Step 4: Deterministic Schedule Generation ---');
  const dayPlan = DeterministicScheduler.generateDayPlan(confirmedTasks, DEFAULT_PREFERENCES);
  console.log(`Generated day plan for ${dayPlan.date}:`);
  console.log(`Work window: ${DEFAULT_PREFERENCES.workingHours.startTime} - ${DEFAULT_PREFERENCES.workingHours.endTime}`);
  console.log(`Schedule items (${dayPlan.items.length}):`);
  dayPlan.items.forEach(item => {
    console.log(`  ${item.startTime} - ${item.endTime} | [${item.type.toUpperCase()}] ${item.title}`);
  });

  // 5. Complete a task
  console.log('\n--- Step 5: Complete First Task ---');
  const firstTaskItem = dayPlan.items.find(i => i.type === 'task');
  if (!firstTaskItem) throw new Error('No task found in schedule.');
  console.log(`Marking task "${firstTaskItem.title}" as completed.`);
  const taskRecord = confirmedTasks.find(t => t.id === firstTaskItem.taskId);
  if (taskRecord) taskRecord.status = 'completed';

  // 6. Simulate Delay / Replan
  console.log('\n--- Step 6: Simulate Missed Task & Deterministic Replan ---');
  const taskToDelay = dayPlan.items.find(i => i.type === 'task');
  if (taskToDelay) {
    console.log(`Simulating delay for task: "${taskToDelay.title}"`);
    const replanResult = DeterministicReplanner.replan(
      dayPlan,
      confirmedTasks,
      taskToDelay,
      'took_longer',
      DEFAULT_PREFERENCES,
      '14:00'
    );
    console.log(`Replan summary: ${replanResult.explanation.summary}`);
    console.log(`Tasks moved: ${replanResult.explanation.movedTasks.map(m => m.taskTitle).join(', ') || 'none'}`);
    console.log(`Plan adapted flag: ${replanResult.updatedPlan.isAdapted}`);
  }

  // 7. Fallback Verification when Gemma is offline
  console.log('\n--- Step 7: Testing Offline Fallback to Local Heuristic Engine ---');
  const offlineAiService = new AIService({
    ...DEFAULT_PREFERENCES,
    activeAIProvider: 'gemma',
    gemmaConfig: {
      endpointUrl: 'http://localhost:59999', // offline port
      modelName: 'gemma2:2b',
    },
  });

  const offlineResult = await offlineAiService.extractTasks(
    userPrompt,
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

  console.log(`Offline Provider Used: ${offlineResult.providerName}`);
  console.log(`Offline isFallback: ${offlineResult.isFallback}`);
  console.log(`Offline isDeterministicFallback: ${offlineResult.isDeterministicFallback}`);
  console.log(`Offline Fallback Reason: ${offlineResult.fallbackReason}`);
  console.log(`Offline Extracted Tasks Count: ${offlineResult.extractedTasks.length}`);

  if (!offlineResult.isFallback || !offlineResult.isDeterministicFallback) {
    throw new Error('Offline fallback did not trigger properly!');
  }

  console.log(' >>> ALL LIVE GEMMA & HERDAY WORKFLOW STEPS PASSED SUCCESSFULLY! <<<');
  console.log('=================================================================\n');
  process.exit(0);
}

testLiveOllama().catch(err => {
  console.error('\n❌ Live Verification Failed:', err);
  process.exit(1);
});
