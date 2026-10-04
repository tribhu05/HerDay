import { MongoDbService } from '../../server/db';
import { handleDbRequest } from '../../server/dbHandler';
import { CloudStorageService } from '../services/storage/cloudStorageService';
import { LocalStorageService } from '../services/storage/localStorageService';
import { DeterministicScheduler } from '../services/scheduler/scheduler';
import { DeterministicReplanner } from '../services/scheduler/replanner';
import { DEFAULT_PREFERENCES } from '../types/preferences';
import type { Task } from '../types/task';
import type { Plan } from '../types/plan';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { EventEmitter } from 'node:events';

// In-memory mock Db for rigorous driver-level CRUD verification
function createMockDb(dbName = 'herday_test') {
  const store = new Map<string, Map<string, any>>();

  function getCol(colName: string) {
    if (!store.has(colName)) store.set(colName, new Map<string, any>());
    return store.get(colName)!;
  }

  const indexes = new Map<string, any[]>();

  return {
    databaseName: dbName,
    command: async () => ({ ok: 1 }),
    collection: (colName: string) => {
      const colMap = getCol(colName);
      return {
        createIndex: async (indexSpec: any, options?: any) => {
          if (!indexes.has(colName)) indexes.set(colName, []);
          indexes.get(colName)!.push({ indexSpec, options });
          return 'index_created';
        },
        find: (query: any = {}) => ({
          sort: () => ({
            limit: (limitCount?: number) => ({
              toArray: async () => {
                const all = Array.from(colMap.values());
                return typeof limitCount === 'number' ? all.slice(0, limitCount) : all;
              },
            }),
            toArray: async () => Array.from(colMap.values()),
          }),
          toArray: async () => Array.from(colMap.values()),
        }),
        findOne: async (query: any = {}) => {
          for (const doc of colMap.values()) {
            let match = true;
            for (const key of Object.keys(query)) {
              if (doc[key] !== query[key]) {
                match = false;
                break;
              }
            }
            if (match) return doc;
          }
          return null;
        },
        insertOne: async (doc: any) => {
          const id = doc._id || doc.id || String(Date.now());
          colMap.set(id, { ...doc, _id: id });
          return { acknowledged: true, insertedId: id };
        },
        replaceOne: async (filter: any, doc: any, options?: any) => {
          const id = filter._id || filter.id;
          if (id) {
            colMap.set(id, { ...doc, _id: id });
            return { acknowledged: true, matchedCount: 1, modifiedCount: 1, upsertedId: id };
          }
          return { acknowledged: false };
        },
        deleteOne: async (filter: any) => {
          let deleted = 0;
          if (filter._id && colMap.has(filter._id)) {
            colMap.delete(filter._id);
            deleted = 1;
          } else if (filter.$or) {
            for (const cond of filter.$or) {
              const id = cond._id || cond.id;
              if (id && colMap.has(id)) {
                colMap.delete(id);
                deleted = 1;
                break;
              }
            }
          }
          return { acknowledged: true, deletedCount: deleted };
        },
      };
    },
    _getStore: () => store,
    _getIndexes: () => indexes,
  } as any;
}

// Lightweight mock for Node http request/response
function createMockHttpReqRes(options: {
  method?: string;
  url?: string;
  body?: string;
}) {
  const req = new EventEmitter() as unknown as IncomingMessage;
  req.method = options.method || 'GET';
  req.url = options.url || '/api/db/status';
  req.headers = { 'content-type': 'application/json' };

  process.nextTick(() => {
    if (options.body) {
      req.emit('data', Buffer.from(options.body));
    }
    req.emit('end');
  });

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

export async function runMongoVerification() {
  console.log('================================================================');
  console.log(' HERDAY PHASE 4: MONGODB ATLAS PERSISTENCE & FALLBACK TESTS     ');
  console.log('================================================================\n');

  const mockDb = createMockDb('herday_atlas_mock');
  const service = new MongoDbService(mockDb);

  // -------------------------------------------------------------
  // Test 1: Create Task → MongoDB Persistence
  // -------------------------------------------------------------
  console.log('--- Test 1: Create Task → MongoDB Persistence ---');
  const sampleTask: Task = {
    id: 'task-test-001',
    title: 'Review DBMS Chapter 4 Transactions',
    description: 'Read concurrency control and ACID properties',
    deadline: 'Friday',
    deadlineDate: '2026-10-09',
    priority: 'urgent',
    estimatedMinutes: 90,
    status: 'pending',
    createdAt: new Date().toISOString(),
    scheduledDate: '2026-10-04',
    targetDay: 'today',
    timeConstraint: {
      fixedStartTime: '09:30',
      fixedEndTime: '11:00',
    },
    tags: ['DBMS', 'Study'],
  };

  await service.saveTask(sampleTask as unknown as Record<string, unknown>);
  const storedTasks = await service.getTasks();
  if (storedTasks.length !== 1 || storedTasks[0].id !== 'task-test-001') {
    throw new Error('Task was not persisted properly into MongoDB mock collection!');
  }
  console.log(`Stored task ID: ${storedTasks[0].id}, Title: "${storedTasks[0].title}"`);
  console.log('✓ Task created and persisted with full metadata.\n');

  // -------------------------------------------------------------
  // Test 2: Update Task in MongoDB
  // -------------------------------------------------------------
  console.log('--- Test 2: Update Task in MongoDB ---');
  const updatedTask: Task = {
    ...sampleTask,
    title: 'Review DBMS Chapter 4 & 5 (Extended)',
    estimatedMinutes: 120,
    priority: 'urgent',
  };

  await service.saveTask(updatedTask as unknown as Record<string, unknown>);
  const afterUpdateTasks = await service.getTasks();
  if (afterUpdateTasks[0].estimatedMinutes !== 120 || afterUpdateTasks[0].title !== 'Review DBMS Chapter 4 & 5 (Extended)') {
    throw new Error('Task was not updated correctly in MongoDB collection!');
  }
  console.log(`Updated title: "${afterUpdateTasks[0].title}", Effort: ${afterUpdateTasks[0].estimatedMinutes}m`);
  console.log('✓ Task updated in MongoDB collection.\n');

  // -------------------------------------------------------------
  // Test 3: Complete Task
  // -------------------------------------------------------------
  console.log('--- Test 3: Complete Task in MongoDB ---');
  const completedTask: Task = {
    ...updatedTask,
    status: 'completed',
    completedAt: new Date().toISOString(),
  };

  await service.saveTask(completedTask as unknown as Record<string, unknown>);
  const afterCompleteTasks = await service.getTasks();
  if (afterCompleteTasks[0].status !== 'completed' || !afterCompleteTasks[0].completedAt) {
    throw new Error('Task was not marked completed in MongoDB collection!');
  }
  console.log(`Task status: ${afterCompleteTasks[0].status}, Completed at: ${afterCompleteTasks[0].completedAt}`);
  console.log('✓ Task completed and status persisted in MongoDB.\n');

  // -------------------------------------------------------------
  // Test 4: Delete Task from MongoDB
  // -------------------------------------------------------------
  console.log('--- Test 4: Delete Task from MongoDB ---');
  const deleteResult = await service.deleteTask('task-test-001');
  if (!deleteResult) {
    throw new Error('deleteTask returned false for existing task!');
  }
  const emptyTasks = await service.getTasks();
  if (emptyTasks.length !== 0) {
    throw new Error('Task remained in collection after delete!');
  }
  console.log('Deleted count confirmed: 1. Remaining tasks: 0');
  console.log('✓ Task deleted successfully from MongoDB.\n');

  // -------------------------------------------------------------
  // Test 5: Create and Persist Plan
  // -------------------------------------------------------------
  console.log('--- Test 5: Create and Persist Daily Plan ---');
  const samplePlan: Plan = {
    id: 'plan-2026-10-04',
    date: '2026-10-04',
    items: [
      {
        id: 'item-1',
        taskId: 'task-test-001',
        title: 'Review DBMS Chapter 4 Transactions',
        type: 'task',
        startTime: '09:30',
        endTime: '11:00',
        durationMinutes: 90,
        status: 'scheduled',
        priority: 'urgent',
      },
      {
        id: 'break-1',
        title: 'Break & Reset',
        type: 'break',
        startTime: '11:00',
        endTime: '11:15',
        durationMinutes: 15,
        status: 'scheduled',
      },
    ],
    generatedAt: new Date().toISOString(),
  };

  await service.savePlan(samplePlan as unknown as Record<string, unknown>);
  const storedPlans = await service.getPlans();
  if (storedPlans.length !== 1 || storedPlans[0].id !== 'plan-2026-10-04') {
    throw new Error('Plan was not persisted properly into MongoDB collection!');
  }
  const activePlan = await service.getActivePlan('2026-10-04');
  if (!activePlan || activePlan.items.length !== 2) {
    throw new Error('Active plan query failed!');
  }
  console.log(`Plan ID: ${activePlan.id}, Items count: ${activePlan.items.length}`);
  console.log('✓ Daily plan created and retrieved with scheduled items and breaks.\n');

  // -------------------------------------------------------------
  // Test 6: Persist Replanning Event
  // -------------------------------------------------------------
  console.log('--- Test 6: Persist Replanning Event ---');
  await service.saveReplanningEvent({
    taskId: 'task-test-001',
    taskTitle: 'Review DBMS Chapter 4 Transactions',
    originalScheduledTime: '09:30',
    newScheduledTime: '11:15',
    reason: 'longer_than_expected',
    notes: 'Took extra time solving proof questions',
    explanation: 'Task rescheduled to 11:15 due to unexpected delay.',
    timestamp: new Date().toISOString(),
  });

  const replanningEvents = await service.getReplanningEvents();
  if (replanningEvents.length !== 1 || replanningEvents[0].taskId !== 'task-test-001') {
    throw new Error('Replanning event was not persisted properly into MongoDB!');
  }
  console.log(`Replan event stored: Task: "${replanningEvents[0].taskTitle}", Reason: "${replanningEvents[0].reason}"`);
  console.log(`Original Time: ${replanningEvents[0].originalScheduledTime} → New Time: ${replanningEvents[0].newScheduledTime}`);
  console.log('✓ Replanning history event persisted with audit trail.\n');

  // -------------------------------------------------------------
  // Test 7: Secret Sanitization in Preferences
  // -------------------------------------------------------------
  console.log('--- Test 7: Secret Sanitization (No Secrets in DB) ---');
  const dirtyPreferences = {
    ...DEFAULT_PREFERENCES,
    gemmaConfig: {
      ...DEFAULT_PREFERENCES.gemmaConfig,
      apiKey: 'SUPER_SECRET_GEMMA_KEY_DO_NOT_STORE',
    },
    elevenLabsApiKey: 'SUPER_SECRET_VOICE_KEY',
  };

  await service.savePreferences(dirtyPreferences as unknown as Record<string, unknown>);
  const savedPrefs = await service.getPreferences();
  if (!savedPrefs) throw new Error('Preferences not found');
  if (savedPrefs.gemmaConfig?.apiKey || savedPrefs.apiKey || savedPrefs.elevenLabsApiKey) {
    throw new Error('API secrets leaked into MongoDB preferences collection!');
  }
  console.log('Saved preferences gemmaConfig.apiKey:', savedPrefs.gemmaConfig?.apiKey ?? 'undefined (sanitized)');
  console.log('✓ Verified: API secrets are strictly stripped before persisting to MongoDB.\n');

  // -------------------------------------------------------------
  // Test 8: Bulk Migration from LocalStorage
  // -------------------------------------------------------------
  console.log('--- Test 8: Bulk Migration from LocalStorage ---');
  const migrationResult = await service.bulkMigrate({
    tasks: [
      { id: 'task-migrated-1', title: 'Prepare DBMS Presentation', priority: 'high', estimatedMinutes: 60 },
      { id: 'task-migrated-2', title: 'Read Systems Paper', priority: 'medium', estimatedMinutes: 45 },
    ],
    activePlan: samplePlan as unknown as Record<string, unknown>,
    preferences: DEFAULT_PREFERENCES as unknown as Record<string, unknown>,
  });

  if (migrationResult.migratedTasks !== 2 || !migrationResult.migratedPlan || !migrationResult.migratedPreferences) {
    throw new Error('Bulk migration did not complete as expected!');
  }
  console.log(`Migration result: ${migrationResult.migratedTasks} tasks migrated, Plan: ${migrationResult.migratedPlan}, Prefs: ${migrationResult.migratedPreferences}`);
  console.log('✓ Intentional bulk migration from localStorage to MongoDB verified.\n');

  // -------------------------------------------------------------
  // Test 9: MongoDB Unavailable & Graceful LocalStorage Fallback
  // -------------------------------------------------------------
  console.log('--- Test 9: MongoDB Unavailable Diagnostics & Fallback ---');

  // Case 9a: Not configured
  delete process.env.MONGODB_URI;
  const unconfiguredService = new MongoDbService();
  const unconfiguredStatus = await unconfiguredService.getStatus();
  if (unconfiguredStatus.status !== 'Not configured' || unconfiguredStatus.configured !== false) {
    throw new Error(`Expected 'Not configured' status, got: ${JSON.stringify(unconfiguredStatus)}`);
  }
  console.log(`Unconfigured diagnosis: status="${unconfiguredStatus.status}", configured=${unconfiguredStatus.configured}`);

  // Case 9b: Invalid URI format
  process.env.MONGODB_URI = 'invalid_protocol://localhost:27017';
  const invalidService = new MongoDbService();
  const invalidStatus = await invalidService.getStatus();
  if (invalidStatus.status !== 'Offline' || invalidStatus.error !== 'Invalid URI protocol') {
    throw new Error(`Expected 'Offline' status for invalid URI, got: ${JSON.stringify(invalidStatus)}`);
  }
  console.log(`Invalid URI diagnosis: status="${invalidStatus.status}", error="${invalidStatus.error}"`);

  // Case 9c: Unreachable offline port with timeout handling
  process.env.MONGODB_URI = 'mongodb://127.0.0.1:59998/test';
  const offlineService = new MongoDbService();
  const offlineStatus = await offlineService.getStatus();
  if (offlineStatus.status !== 'Offline') {
    throw new Error(`Expected 'Offline' status for offline port, got: ${JSON.stringify(offlineStatus)}`);
  }
  console.log(`Offline port diagnosis: status="${offlineStatus.status}", error="${offlineStatus.error}"`);

  // Case 9d: HTTP API layer returns 503 fallback when DB is unconfigured
  delete process.env.MONGODB_URI;
  const { req, res, resData } = createMockHttpReqRes({ method: 'GET', url: '/api/db/tasks' });
  await handleDbRequest(req, res);
  if (resData.statusCode !== 503) {
    throw new Error(`Expected 503 fallback status from DB handler, got: ${resData.statusCode}`);
  }
  console.log(`HTTP DB handler returned: ${resData.statusCode} - ${resData.body}`);

  // Clean up env
  delete process.env.MONGODB_URI;
  console.log('✓ Graceful offline detection and fallback verified without crashes.\n');

  // -------------------------------------------------------------
  // Test 10: Scheduler Remains Authoritative & Deterministic
  // -------------------------------------------------------------
  console.log('--- Test 10: Scheduler Determinism & Replanning Integrity ---');
  const tasksForScheduling: Task[] = [
    {
      id: 'task-1',
      title: 'DBMS Final Exam Preparation',
      priority: 'urgent',
      estimatedMinutes: 120,
      status: 'pending',
      createdAt: new Date().toISOString(),
      deadline: 'Friday',
    },
    {
      id: 'task-2',
      title: 'DBMS Assignment Submission',
      priority: 'high',
      estimatedMinutes: 60,
      status: 'pending',
      createdAt: new Date().toISOString(),
      deadline: 'Thursday',
    },
    {
      id: 'task-3',
      title: 'Class at 10',
      priority: 'high',
      estimatedMinutes: 60,
      status: 'pending',
      createdAt: new Date().toISOString(),
      timeConstraint: { fixedStartTime: '10:00', fixedEndTime: '11:00' },
    },
  ];

  const generatedPlan = DeterministicScheduler.generateDayPlan(
    tasksForScheduling,
    DEFAULT_PREFERENCES,
    '2026-10-04'
  );

  console.log('Generated plan items:');
  generatedPlan.items.forEach(item => {
    console.log(`  ${item.startTime} — ${item.endTime} | ${item.title} (${item.type})`);
  });

  const fixedClass = generatedPlan.items.find(i => i.title === 'Class at 10');
  if (!fixedClass || fixedClass.startTime !== '10:00' || fixedClass.endTime !== '11:00') {
    throw new Error('Deterministic scheduler failed to lock fixed-time event at 10:00!');
  }

  // Replan when delayed
  const examTask = generatedPlan.items.find(i => i.title === 'DBMS Final Exam Preparation')!;
  const replanResult = DeterministicReplanner.replan(
    generatedPlan,
    tasksForScheduling,
    examTask,
    'longer_than_expected',
    DEFAULT_PREFERENCES,
    '11:15'
  );

  if (!replanResult.updatedPlan.isAdapted) {
    throw new Error('Deterministic replanner did not adapt plan!');
  }
  console.log(`Replan explanation: "${replanResult.explanation.summary}"`);
  console.log('✓ Deterministic scheduler and replanner remain authoritative.\n');

  console.log('================================================================');
  console.log(' >>> ALL PHASE 4 MONGODB PERSISTENCE TESTS PASSED CLEANLY! <<<  ');
  console.log('================================================================');
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('verifyMongoPersistence.ts')) {
  runMongoVerification()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('\n❌ MongoDB Verification Failed:', err);
      process.exit(1);
    });
}
