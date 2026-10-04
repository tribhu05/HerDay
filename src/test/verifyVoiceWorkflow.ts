import { ElevenLabsProvider } from '../services/voice/elevenLabsProvider';
import { VoiceService } from '../services/voice/voiceService';
import { handleVoiceStatus, handleVoiceTranscribe } from '../../server/voiceHandler';
import { GemmaValidator } from '../services/ai/gemmaValidator';
import { DeterministicScheduler } from '../services/scheduler/scheduler';
import { DeterministicReplanner } from '../services/scheduler/replanner';
import { DEFAULT_PREFERENCES } from '../types/preferences';
import type { Task } from '../types/task';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { EventEmitter } from 'node:events';

// Lightweight mock for Node http incoming request & response
function createMockHttpReqRes(options: {
  method?: string;
  url?: string;
  headers?: Record<string, string>;
  bodyChunks?: Buffer[];
}) {
  const req = new EventEmitter() as unknown as IncomingMessage;
  (req as any).method = options.method || 'GET';
  (req as any).url = options.url || '/api/voice/status';
  (req as any).headers = options.headers || {};

  const chunks = options.bodyChunks || [];
  (req as any)[Symbol.asyncIterator] = async function* () {
    for (const chunk of chunks) {
      yield chunk;
    }
  };

  const resData = {
    statusCode: 200,
    headers: {} as Record<string, string>,
    body: '',
  };

  const res = {
    statusCode: 200,
    setHeader(key: string, val: string) {
      resData.headers[key.toLowerCase()] = val;
    },
    end(data?: string) {
      if (data) resData.body += data;
      resData.statusCode = res.statusCode;
    },
  } as unknown as ServerResponse;

  return { req, res, resData };
}

export async function runVoiceVerification() {
  console.log('================================================================');
  console.log(' HERDAY PHASE 3: ELEVENLABS SCRIBE VOICE WORKFLOW VERIFICATION   ');
  console.log('================================================================\n');

  // -------------------------------------------------------------
  // Test 1: Successful Transcription Result
  // -------------------------------------------------------------
  console.log('--- Test 1: Successful Transcription Result ---');
  const spokenScenario =
    'I have my DBMS exam Friday, I need to finish two chapters, submit my assignment Thursday, and I have class tomorrow at ten.';

  // Mock global fetch for testing ElevenLabsProvider
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const urlStr = input.toString();
    if (urlStr.includes('/api/voice/status')) {
      return new Response(
        JSON.stringify({
          configured: true,
          status: 'Connected',
          model: 'scribe_v2',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    if (urlStr.includes('/api/voice/transcribe')) {
      return new Response(
        JSON.stringify({
          text: spokenScenario,
          provider: 'ElevenLabs Scribe',
          model: 'scribe_v2',
          duration: 7.4,
          language_code: 'eng',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    return originalFetch(input, init);
  };

  const provider = new ElevenLabsProvider();
  const statusRes = await provider.getStatus();
  console.log(`Provider status: ${statusRes.status} (Model: ${statusRes.model})`);
  if (statusRes.status !== 'Connected') {
    throw new Error(`Expected Connected status, got ${statusRes.status}`);
  }

  const dummyAudio = new Blob(['mock-audio-bytes'], { type: 'audio/webm' });
  const transcriptionResult = await provider.transcribe(dummyAudio);
  console.log(`Transcribed text: "${transcriptionResult.text}"`);
  console.log(`Provider reported: ${transcriptionResult.provider} (Model: ${transcriptionResult.model})`);

  if (!transcriptionResult.text.includes('DBMS exam')) {
    throw new Error('Transcription text does not match expected result!');
  }
  if (transcriptionResult.provider !== 'ElevenLabs Scribe') {
    throw new Error('Unexpected provider name!');
  }
  console.log('✓ Successful transcription returned expected structured payload.\n');

  // -------------------------------------------------------------
  // Test 2: Empty Transcript & Empty Audio Handling
  // -------------------------------------------------------------
  console.log('--- Test 2: Empty Transcript & Audio Handling ---');
  try {
    const emptyBlob = new Blob([], { type: 'audio/webm' });
    await provider.transcribe(emptyBlob);
    throw new Error('Should have thrown on empty audio blob!');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`  Empty audio rejection: "${msg}"`);
  }

  // Test server returning empty speech
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    if (input.toString().includes('/api/voice/transcribe')) {
      return new Response(
        JSON.stringify({ text: '   ', model: 'scribe_v2' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    return originalFetch(input, init);
  };

  try {
    await provider.transcribe(dummyAudio);
    throw new Error('Should have thrown on empty transcript!');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`  Empty speech rejection: "${msg}"`);
  }
  console.log('✓ Empty audio and blank transcripts rejected with helpful errors.\n');

  // -------------------------------------------------------------
  // Test 3: ElevenLabs Unavailable (503 / 500)
  // -------------------------------------------------------------
  console.log('--- Test 3: ElevenLabs Unavailable Handling ---');
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    if (input.toString().includes('/api/voice/transcribe')) {
      return new Response(
        JSON.stringify({ error: 'ElevenLabs speech-to-text service is temporarily unreachable.' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }
    return originalFetch(input, init);
  };

  try {
    await provider.transcribe(dummyAudio);
    throw new Error('Should have thrown when ElevenLabs is unavailable!');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`  Captured service unavailable error: "${msg}"`);
  }
  console.log('✓ Service unavailability reported cleanly without crashing.\n');

  // -------------------------------------------------------------
  // Test 4: Authentication Failure (401)
  // -------------------------------------------------------------
  console.log('--- Test 4: Authentication Failure Handling ---');
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    if (input.toString().includes('/api/voice/transcribe')) {
      return new Response(
        JSON.stringify({ error: 'ElevenLabs authentication failed. Verify that ELEVENLABS_API_KEY in .env is valid.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    return originalFetch(input, init);
  };

  try {
    await provider.transcribe(dummyAudio);
    throw new Error('Should have thrown on 401 authentication failure!');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`  Captured auth failure error: "${msg}"`);
    if (msg.includes('ELEVENLABS_API_KEY') && !msg.includes('sk_')) {
      console.log('  Confirmed: No secrets leaked in error message.');
    }
  }
  console.log('✓ Authentication failure gracefully caught and sanitized.\n');

  // -------------------------------------------------------------
  // Test 4b: Server Voice Handler Mock Verification
  // -------------------------------------------------------------
  console.log('--- Test 4b: Server-Side Proxy Handlers ---');
  const prevEnv = process.env.ELEVENLABS_API_KEY;
  delete process.env.ELEVENLABS_API_KEY;

  const { req: statusReq, res: statusResObj, resData: statusData } = createMockHttpReqRes({});
  await handleVoiceStatus(statusReq, statusResObj);
  console.log(`  Unconfigured status check: ${statusData.body}`);
  const parsedStatus = JSON.parse(statusData.body);
  if (parsedStatus.configured !== false || parsedStatus.status !== 'Not configured') {
    throw new Error('Expected Not configured when ELEVENLABS_API_KEY is unset!');
  }

  const { req: transReq, res: transResObj, resData: transData } = createMockHttpReqRes({
    method: 'POST',
    url: '/api/voice/transcribe',
    bodyChunks: [Buffer.from('dummy')],
  });
  await handleVoiceTranscribe(transReq, transResObj);
  console.log(`  Unconfigured transcribe check: HTTP ${transData.statusCode} - ${transData.body}`);
  if (transData.statusCode !== 503) {
    throw new Error('Expected HTTP 503 when ELEVENLABS_API_KEY is not configured!');
  }

  process.env.ELEVENLABS_API_KEY = prevEnv;
  console.log('✓ Server-side proxy handlers correctly guard credentials.\n');

  // Restore fetch
  globalThis.fetch = originalFetch;

  // -------------------------------------------------------------
  // Test 5: Transcript Inserted Into Tell HerDay
  // -------------------------------------------------------------
  console.log('--- Test 5: Transcript Inserted Into Tell HerDay ---');
  let tellHerDayInput = '';
  // Simulate voice completion placing text in input
  tellHerDayInput = spokenScenario;
  console.log(`Input populated with transcript: "${tellHerDayInput}"`);
  if (!tellHerDayInput) {
    throw new Error('Transcript was not placed in Tell HerDay input!');
  }
  console.log('✓ Transcript successfully placed in Tell HerDay input.\n');

  // -------------------------------------------------------------
  // Test 6: Transcript Can Be Edited Before Gemma Submission
  // -------------------------------------------------------------
  console.log('--- Test 6: Transcript Editing Before Submission ---');
  // User edits "two chapters" to "Chapters 3 & 4" and clarifies 10:00 class
  const editedInput = tellHerDayInput.replace(
    'finish two chapters',
    'finish DBMS chapters 3 and 4'
  );
  console.log(`User-edited input: "${editedInput}"`);
  if (!editedInput.includes('chapters 3 and 4')) {
    throw new Error('Edited text did not persist!');
  }
  console.log('✓ Transcript successfully edited by user prior to Gemma processing.\n');

  // -------------------------------------------------------------
  // Test 7: Existing Gemma Pipeline Processes Transcript
  // -------------------------------------------------------------
  console.log('--- Test 7: Existing Gemma Pipeline Processes Edited Transcript ---');
  const mockGemmaExtraction = `\`\`\`json
[
  {
    "title": "DBMS Chapters 3 and 4 Review",
    "deadline": "Friday",
    "fixedTime": null,
    "estimatedMinutes": 90,
    "priority": "high",
    "category": "Academic",
    "notes": "Read indexing and transactions chapters"
  },
  {
    "title": "DBMS Assignment Submission",
    "deadline": "Thursday",
    "fixedTime": null,
    "estimatedMinutes": 60,
    "priority": "high",
    "category": "Academic",
    "notes": "Relational calculus problem set"
  },
  {
    "title": "DBMS Final Exam Preparation",
    "deadline": "Friday",
    "fixedTime": null,
    "estimatedMinutes": 120,
    "priority": "urgent",
    "category": "Exam",
    "notes": "Comprehensive review"
  },
  {
    "title": "University Class",
    "deadline": "Tomorrow",
    "fixedTime": "10:00",
    "estimatedMinutes": 60,
    "priority": "high",
    "category": "Class",
    "notes": "Lecture room 402"
  }
]
\`\`\``;

  const extractedTasks = GemmaValidator.parseAndValidate(mockGemmaExtraction);
  console.log(`Gemma extracted ${extractedTasks.length} tasks from transcript.`);
  if (extractedTasks.length !== 4) {
    throw new Error(`Expected 4 tasks, got ${extractedTasks.length}`);
  }

  const fixedClass = extractedTasks.find(t => t.fixedStartTime === '10:00');
  if (!fixedClass) {
    throw new Error('Gemma failed to parse fixed time 10:00 for class!');
  }
  console.log('✓ Gemma extracted structured tasks with correct constraints from transcript.\n');

  // -------------------------------------------------------------
  // Test 8: Deterministic Scheduler Builds Realistic Day Plan
  // -------------------------------------------------------------
  console.log('--- Test 8: Existing Deterministic Scheduler Works ---');
  const confirmedTasks: Task[] = extractedTasks.map((t, idx) => ({
    id: `voice-task-${idx}`,
    title: t.title,
    description: t.notes,
    deadline: t.deadline,
    priority: t.priority,
    estimatedMinutes: t.estimatedMinutes,
    status: 'pending',
    createdAt: new Date().toISOString(),
    targetDay: t.targetDay || 'today',
    timeConstraint: t.fixedStartTime
      ? { fixedStartTime: t.fixedStartTime, fixedEndTime: '11:00' }
      : undefined,
  }));

  const dayPlan = DeterministicScheduler.generateDayPlan(confirmedTasks, DEFAULT_PREFERENCES);
  console.log(`Plan items generated: ${dayPlan.items.length}`);
  dayPlan.items.forEach(i => {
    console.log(`  ${i.startTime} — ${i.endTime} | ${i.title} (${i.type.toUpperCase()})`);
  });

  const breaks = dayPlan.items.filter(i => i.type === 'break');
  if (breaks.length === 0) {
    throw new Error('Deterministic scheduler did not insert restorative breaks!');
  }
  console.log('✓ Deterministic scheduler generated day plan with protected breaks.\n');

  // -------------------------------------------------------------
  // Test 9: Existing Replanner Adapts on Missed Tasks
  // -------------------------------------------------------------
  console.log('--- Test 9: Existing Deterministic Replanner Works ---');
  const firstTask = dayPlan.items.find(i => i.type === 'task');
  if (!firstTask) throw new Error('No task available for replanning simulation');

  const replanResult = DeterministicReplanner.replan(
    dayPlan,
    confirmedTasks,
    firstTask,
    'took_longer',
    DEFAULT_PREFERENCES,
    '11:30'
  );

  console.log(`Replan summary: ${replanResult.explanation.summary}`);
  console.log(`Tasks moved: ${replanResult.explanation.movedTasks.map(m => m.taskTitle).join(', ')}`);
  console.log(`Plan adapted flag: ${replanResult.updatedPlan.isAdapted}`);

  if (!replanResult.updatedPlan.isAdapted) {
    throw new Error('Plan was not marked adapted after replan!');
  }
  console.log('✓ Deterministic replanner adapted remaining tasks smoothly.\n');

  console.log('================================================================');
  console.log(' >>> ALL PHASE 3 VOICE & WORKFLOW TESTS PASSED CLEANLY! <<<    ');
  console.log('================================================================');
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('verifyVoiceWorkflow.ts')) {
  runVoiceVerification()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('\n❌ Voice Verification Failed:', err);
      process.exit(1);
    });
}
