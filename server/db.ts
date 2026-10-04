import { MongoClient, type Db, type Document } from 'mongodb';
import { loadEnvFile } from './voiceHandler.ts';

export interface MongoDbStatus {
  configured: boolean;
  status: 'Connected' | 'Not configured' | 'Offline';
  databaseName?: string;
  details: string;
  error?: string;
}

export interface ReplanningEventRecord {
  id?: string;
  taskId: string;
  taskTitle: string;
  originalScheduledTime: string;
  newScheduledTime: string;
  reason: string;
  notes?: string;
  explanation?: string;
  timestamp: string;
}

export class MongoDbService {
  private static instance: MongoDbService | null = null;
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private isConnecting = false;
  private indexesEnsured = false;

  constructor(customDb?: Db) {
    if (customDb) {
      this.db = customDb;
    }
  }

  static getInstance(): MongoDbService {
    if (!MongoDbService.instance) {
      MongoDbService.instance = new MongoDbService();
    }
    return MongoDbService.instance;
  }

  /**
   * Reads MONGODB_URI securely from environment or .env file
   */
  getMongoUri(): string | undefined {
    loadEnvFile();
    const uri = process.env.MONGODB_URI?.trim();
    return uri || undefined;
  }

  /**
   * Connects to MongoDB Atlas using the configured URI.
   * If already connected, returns the existing Db handle.
   */
  async getDb(): Promise<Db | null> {
    if (this.db) {
      return this.db;
    }

    const uri = this.getMongoUri();
    if (!uri) {
      return null;
    }

    if (this.isConnecting) {
      // Small wait loop if connection is currently in flight
      let attempts = 0;
      while (this.isConnecting && attempts < 20) {
        await new Promise((r) => setTimeout(r, 100));
        if (this.db) return this.db;
        attempts++;
      }
    }

    this.isConnecting = true;
    try {
      this.client = new MongoClient(uri, {
        serverSelectionTimeoutMS: 4000,
        connectTimeoutMS: 4000,
      });

      await this.client.connect();
      this.db = this.client.db(); // Uses default database specified in connection string or 'test'
      await this.db.command({ ping: 1 });

      if (!this.indexesEnsured) {
        await this.ensureIndexes(this.db);
        this.indexesEnsured = true;
      }

      return this.db;
    } catch (err) {
      this.client = null;
      this.db = null;
      throw err;
    } finally {
      this.isConnecting = false;
    }
  }

  /**
   * Initializes collection indexes for tasks, plans, and replanning events.
   */
  async ensureIndexes(db: Db): Promise<void> {
    try {
      // 1. tasks collection
      const tasksCol = db.collection('tasks');
      await tasksCol.createIndex({ id: 1 }, { unique: true });
      await tasksCol.createIndex({ status: 1 });
      await tasksCol.createIndex({ deadline: 1 });
      await tasksCol.createIndex({ createdAt: -1 });

      // 2. plans collection
      const plansCol = db.collection('plans');
      await plansCol.createIndex({ id: 1 }, { unique: true });
      await plansCol.createIndex({ date: -1 });

      // 3. replanning_events collection
      const replanCol = db.collection('replanning_events');
      await replanCol.createIndex({ taskId: 1 });
      await replanCol.createIndex({ timestamp: -1 });
    } catch (err) {
      console.warn('[HerDay MongoDB] Index creation warning:', err);
    }
  }

  /**
   * Returns live diagnostic status of MongoDB Atlas connection.
   */
  async getStatus(): Promise<MongoDbStatus> {
    const uri = this.getMongoUri();
    if (!uri) {
      return {
        configured: false,
        status: 'Not configured',
        details: 'MONGODB_URI is not set. Add it to your .env file to enable MongoDB Atlas persistence.',
      };
    }

    if (!uri.startsWith('mongodb://') && !uri.startsWith('mongodb+srv://')) {
      return {
        configured: true,
        status: 'Offline',
        details: 'Configured MONGODB_URI is invalid (must begin with mongodb:// or mongodb+srv://).',
        error: 'Invalid URI protocol',
      };
    }

    try {
      const db = await this.getDb();
      if (!db) {
        return {
          configured: true,
          status: 'Offline',
          details: 'Failed to establish connection to MongoDB Atlas.',
        };
      }

      return {
        configured: true,
        status: 'Connected',
        databaseName: db.databaseName,
        details: `Connected to MongoDB Atlas database "${db.databaseName}". Persistence is active.`,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        configured: true,
        status: 'Offline',
        details: 'Unable to connect to MongoDB Atlas server. LocalStorage fallback is active.',
        error: msg,
      };
    }
  }

  // -------------------------------------------------------------
  // TASKS COLLECTION
  // -------------------------------------------------------------

  async getTasks(): Promise<Document[]> {
    const db = await this.getDb();
    if (!db) throw new Error('Database is offline or unconfigured');
    const tasks = await db.collection<any>('tasks').find({}).sort({ createdAt: -1 }).toArray();
    return tasks.map((t) => {
      const { _id, ...rest } = t;
      return { ...rest, id: rest.id || String(_id) };
    });
  }

  async saveTask(task: Record<string, unknown>): Promise<void> {
    const db = await this.getDb();
    if (!db) throw new Error('Database is offline or unconfigured');
    const taskId = String(task.id || task._id);
    if (!taskId) throw new Error('Task must have a valid id');

    const doc = {
      ...task,
      _id: taskId,
      id: taskId,
      updatedAt: new Date().toISOString(),
    };

    await db.collection<any>('tasks').replaceOne({ _id: taskId }, doc, { upsert: true });
  }

  async deleteTask(taskId: string): Promise<boolean> {
    const db = await this.getDb();
    if (!db) throw new Error('Database is offline or unconfigured');
    const result = await db.collection<any>('tasks').deleteOne({
      $or: [{ _id: taskId }, { id: taskId }],
    });
    return result.deletedCount > 0;
  }

  // -------------------------------------------------------------
  // PLANS COLLECTION
  // -------------------------------------------------------------

  async getPlans(): Promise<Document[]> {
    const db = await this.getDb();
    if (!db) throw new Error('Database is offline or unconfigured');
    const plans = await db.collection<any>('plans').find({}).sort({ date: -1 }).toArray();
    return plans.map((p) => {
      const { _id, ...rest } = p;
      return { ...rest, id: rest.id || String(_id) };
    });
  }

  async getActivePlan(date?: string): Promise<Document | null> {
    const db = await this.getDb();
    if (!db) throw new Error('Database is offline or unconfigured');
    const query = date ? { date } : {};
    const plan = await db.collection<any>('plans').findOne(query, { sort: { date: -1, generatedAt: -1 } });
    if (!plan) return null;
    const { _id, ...rest } = plan;
    return { ...rest, id: rest.id || String(_id) };
  }

  async savePlan(plan: Record<string, unknown>): Promise<void> {
    const db = await this.getDb();
    if (!db) throw new Error('Database is offline or unconfigured');
    const planId = String(plan.id || `plan-${plan.date || Date.now()}`);

    const doc = {
      ...plan,
      _id: planId,
      id: planId,
      updatedAt: new Date().toISOString(),
    };

    await db.collection<any>('plans').replaceOne({ _id: planId }, doc, { upsert: true });
  }

  // -------------------------------------------------------------
  // REPLANNING_EVENTS COLLECTION
  // -------------------------------------------------------------

  async saveReplanningEvent(event: ReplanningEventRecord): Promise<void> {
    const db = await this.getDb();
    if (!db) throw new Error('Database is offline or unconfigured');

    const eventId = event.id || `replan-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const doc = {
      ...event,
      _id: eventId,
      id: eventId,
      timestamp: event.timestamp || new Date().toISOString(),
    };

    await db.collection<any>('replanning_events').insertOne(doc);
  }

  async getReplanningEvents(limit = 50): Promise<Document[]> {
    const db = await this.getDb();
    if (!db) throw new Error('Database is offline or unconfigured');
    return await db.collection<any>('replanning_events').find({}).sort({ timestamp: -1 }).limit(limit).toArray();
  }

  // -------------------------------------------------------------
  // PREFERENCES COLLECTION (SANITIZED - NO API SECRETS)
  // -------------------------------------------------------------

  async getPreferences(): Promise<Document | null> {
    const db = await this.getDb();
    if (!db) throw new Error('Database is offline or unconfigured');
    const prefs = await db.collection<any>('preferences').findOne({ _id: 'user_preferences' });
    if (!prefs) return null;
    const { _id, ...rest } = prefs;
    return rest;
  }

  async savePreferences(preferences: Record<string, unknown>): Promise<void> {
    const db = await this.getDb();
    if (!db) throw new Error('Database is offline or unconfigured');

    // Strict sanitization: ensure no API secrets or keys are stored in MongoDB
    const sanitized = JSON.parse(JSON.stringify(preferences)) as Record<string, unknown>;
    if (sanitized.gemmaConfig && typeof sanitized.gemmaConfig === 'object') {
      const gConfig = sanitized.gemmaConfig as Record<string, unknown>;
      delete gConfig.apiKey;
    }
    // Delete any inadvertent secret properties
    delete sanitized.apiKey;
    delete sanitized.elevenLabsApiKey;

    const doc = {
      ...sanitized,
      _id: 'user_preferences',
      updatedAt: new Date().toISOString(),
    };

    await db.collection<any>('preferences').replaceOne({ _id: 'user_preferences' }, doc, { upsert: true });
  }

  // -------------------------------------------------------------
  // BULK MIGRATION FROM LOCALSTORAGE
  // -------------------------------------------------------------

  async bulkMigrate(payload: {
    tasks?: Record<string, unknown>[];
    activePlan?: Record<string, unknown>;
    preferences?: Record<string, unknown>;
  }): Promise<{ migratedTasks: number; migratedPlan: boolean; migratedPreferences: boolean }> {
    const db = await this.getDb();
    if (!db) throw new Error('Database is offline or unconfigured');

    let migratedTasks = 0;
    let migratedPlan = false;
    let migratedPreferences = false;

    // Migrate tasks
    if (Array.isArray(payload.tasks) && payload.tasks.length > 0) {
      for (const t of payload.tasks) {
        await this.saveTask(t);
        migratedTasks++;
      }
    }

    // Migrate active plan
    if (payload.activePlan && typeof payload.activePlan === 'object') {
      await this.savePlan(payload.activePlan);
      migratedPlan = true;
    }

    // Migrate preferences
    if (payload.preferences && typeof payload.preferences === 'object') {
      await this.savePreferences(payload.preferences);
      migratedPreferences = true;
    }

    return { migratedTasks, migratedPlan, migratedPreferences };
  }

  async close(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
    }
  }
}
