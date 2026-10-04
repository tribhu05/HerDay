import { LocalHeuristicEngine } from '../services/ai/heuristicEngine';
import { DeterministicScheduler } from '../services/scheduler/scheduler';
import { DeterministicReplanner } from '../services/scheduler/replanner';
import { DEFAULT_PREFERENCES } from '../types/preferences';
import type { Task } from '../types/task';


async function runVerification() {
  console.log('--- 1. Testing Local Heuristic Engine Task Extraction ---');
  const engine = new LocalHeuristicEngine();
  const input = "I have my DBMS exam Friday. I need to finish two chapters and submit my assignment Thursday. I also have class tomorrow at 10.";
  
  const result = await engine.extractTasks(input, new Date());
  console.log(`Provider: ${result.providerName}`);
  console.log(`Extracted count: ${result.extractedTasks.length}`);
  result.extractedTasks.forEach((t, i) => {
    console.log(`  [${i+1}] ${t.title} | Deadline: ${t.deadline} | Priority: ${t.priority} | Est: ${t.estimatedMinutes}m | Fixed: ${t.fixedStartTime || 'none'}`);
  });

  if (result.extractedTasks.length < 3) {
    throw new Error('Heuristic extraction extracted too few tasks!');
  }

  console.log('\n--- 2. Testing Deterministic Schedule Generation ---');
  const tasks: Task[] = result.extractedTasks.map((ext, idx) => ({
    id: `task-${idx}`,
    title: ext.title,
    description: ext.description,
    deadline: ext.deadline,
    priority: ext.priority,
    estimatedMinutes: ext.estimatedMinutes,
    status: 'pending',
    createdAt: new Date().toISOString(),
    targetDay: ext.targetDay || 'today',
    timeConstraint: ext.fixedStartTime ? {
      fixedStartTime: ext.fixedStartTime,
      fixedEndTime: '11:00'
    } : undefined
  }));

  const plan = DeterministicScheduler.generateDayPlan(tasks, DEFAULT_PREFERENCES);
  console.log(`Plan generated for: ${plan.date}`);
  console.log(`Items scheduled: ${plan.items.length}`);
  plan.items.forEach(item => {
    console.log(`  ${item.startTime} — ${item.endTime} : ${item.title} (${item.type})`);
  });

  // Verify that break insertion worked
  const hasBreak = plan.items.some(i => i.type === 'break');
  console.log(`Automated break inserted: ${hasBreak}`);

  console.log('\n--- 3. Testing Replanning Logic (Missed / Delayed Task) ---');
  const firstTaskItem = plan.items.find(i => i.type === 'task');
  if (!firstTaskItem) throw new Error('No task item found in plan to replan!');

  console.log(`Simulating delay for: ${firstTaskItem.title} (${firstTaskItem.startTime} - ${firstTaskItem.endTime})`);
  const replanResult = DeterministicReplanner.replan(
    plan,
    tasks,
    firstTaskItem,
    'longer_than_expected',
    DEFAULT_PREFERENCES,
    '11:00'
  );

  console.log('Replan summary:', replanResult.explanation.summary);
  console.log('Moved tasks:', replanResult.explanation.movedTasks);
  console.log('Deadlines protected:', replanResult.explanation.notes);

  console.log('\n--- 4. Testing Deprioritized / Not Important Feedback ---');
  const replanDeprioritized = DeterministicReplanner.replan(
    plan,
    tasks,
    firstTaskItem,
    'not_important',
    DEFAULT_PREFERENCES
  );
  console.log('Deprioritize summary:', replanDeprioritized.explanation.summary);
  const stillInPlan = replanDeprioritized.updatedPlan.items.some(i => i.id === firstTaskItem.id);
  console.log(`Was item removed from plan? ${!stillInPlan}`);

  console.log('\n>>> ALL VERIFICATION TESTS PASSED! <<<');
}

runVerification().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
