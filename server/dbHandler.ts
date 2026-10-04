import type { IncomingMessage, ServerResponse } from 'node:http';
import { MongoDbService, type ReplanningEventRecord } from './db.ts';

/**
 * Helper to parse JSON body from incoming HTTP request.
 */
async function parseJsonBody<T = Record<string, unknown>>(req: IncomingMessage): Promise<T> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  const bodyText = Buffer.concat(chunks).toString('utf8');
  if (!bodyText.trim()) {
    return {} as T;
  }
  return JSON.parse(bodyText) as T;
}

/**
 * Helper to send JSON response.
 */
function sendJson(res: ServerResponse, statusCode: number, data: unknown): void {
  res.setHeader('Content-Type', 'application/json');
  res.statusCode = statusCode;
  res.end(JSON.stringify(data));
}

/**
 * Handles all /api/db/* requests.
 * Returns true if the request was handled, false otherwise.
 */
export async function handleDbRequest(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const fullUrl = req.url || '';
  const [pathname, queryString] = fullUrl.split('?');
  const method = req.method?.toUpperCase() || 'GET';

  if (!pathname.startsWith('/api/db')) {
    return false;
  }

  const dbService = MongoDbService.getInstance();

  // 1. Database status check
  if (pathname === '/api/db/status' && method === 'GET') {
    const status = await dbService.getStatus();
    sendJson(res, 200, status);
    return true;
  }

  // Check if DB is ready for data operations
  const currentStatus = await dbService.getStatus();
  if (currentStatus.status !== 'Connected') {
    sendJson(res, 503, {
      error: `MongoDB persistence is ${currentStatus.status.toLowerCase()}. Using local fallback.`,
      status: currentStatus.status,
      details: currentStatus.details,
    });
    return true;
  }

  try {
    // 2. Tasks endpoints
    if (pathname === '/api/db/tasks') {
      if (method === 'GET') {
        const tasks = await dbService.getTasks();
        sendJson(res, 200, { tasks });
        return true;
      }
      if (method === 'POST' || method === 'PUT') {
        const task = await parseJsonBody(req);
        await dbService.saveTask(task);
        sendJson(res, 200, { success: true, task });
        return true;
      }
    }

    if (pathname.startsWith('/api/db/tasks/')) {
      const taskId = decodeURIComponent(pathname.replace('/api/db/tasks/', ''));
      if (method === 'DELETE') {
        const deleted = await dbService.deleteTask(taskId);
        sendJson(res, 200, { success: true, deleted, taskId });
        return true;
      }
      if (method === 'PUT') {
        const task = await parseJsonBody(req);
        await dbService.saveTask({ ...task, id: taskId });
        sendJson(res, 200, { success: true, task });
        return true;
      }
    }

    // Support query param for DELETE: /api/db/tasks?id=xxx
    if (pathname === '/api/db/tasks' && method === 'DELETE') {
      const params = new URLSearchParams(queryString || '');
      const taskId = params.get('id');
      if (taskId) {
        const deleted = await dbService.deleteTask(taskId);
        sendJson(res, 200, { success: true, deleted, taskId });
        return true;
      }
      sendJson(res, 400, { error: 'Missing task id parameter' });
      return true;
    }

    // 3. Plans endpoints
    if (pathname === '/api/db/plans' || pathname === '/api/db/plans/active') {
      if (method === 'GET') {
        const params = new URLSearchParams(queryString || '');
        const date = params.get('date') || undefined;
        if (pathname === '/api/db/plans/active' || date) {
          const plan = await dbService.getActivePlan(date);
          sendJson(res, 200, { plan });
        } else {
          const plans = await dbService.getPlans();
          sendJson(res, 200, { plans });
        }
        return true;
      }
      if (method === 'POST' || method === 'PUT') {
        const plan = await parseJsonBody(req);
        await dbService.savePlan(plan);
        sendJson(res, 200, { success: true, plan });
        return true;
      }
    }

    // 4. Replanning history endpoints
    if (pathname === '/api/db/replanning') {
      if (method === 'GET') {
        const events = await dbService.getReplanningEvents();
        sendJson(res, 200, { events });
        return true;
      }
      if (method === 'POST') {
        const event = await parseJsonBody<ReplanningEventRecord>(req);
        await dbService.saveReplanningEvent(event);
        sendJson(res, 200, { success: true, event });
        return true;
      }
    }

    // 5. Preferences endpoints
    if (pathname === '/api/db/preferences') {
      if (method === 'GET') {
        const preferences = await dbService.getPreferences();
        sendJson(res, 200, { preferences });
        return true;
      }
      if (method === 'POST' || method === 'PUT') {
        const prefs = await parseJsonBody(req);
        await dbService.savePreferences(prefs);
        sendJson(res, 200, { success: true });
        return true;
      }
    }

    // 6. Bulk migration endpoint (localStorage -> MongoDB)
    if (pathname === '/api/db/migrate' && method === 'POST') {
      const payload = await parseJsonBody<{
        tasks?: Record<string, unknown>[];
        activePlan?: Record<string, unknown>;
        preferences?: Record<string, unknown>;
      }>(req);
      const result = await dbService.bulkMigrate(payload);
      sendJson(res, 200, { success: true, ...result });
      return true;
    }

    // Unmatched DB route
    sendJson(res, 404, { error: `Endpoint not found: ${method} ${pathname}` });
    return true;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    sendJson(res, 500, { error: `Database API error: ${msg}` });
    return true;
  }
}
