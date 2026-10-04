# HerDay — Private Adaptive Daily Planner

**HerDay** is a private, adaptive daily planner designed for one real person.

> **Messy thoughts (voice or text) → ElevenLabs Scribe STT → Transcript Review → Local Gemma 2B → Structured Tasks → MongoDB / Local Persistence → Deterministic Scheduler → Adaptive Replanning.**

---

## HerDay Architecture & Pipeline

```
Voice Input (Microphone)
       │
       ▼
ElevenLabs Scribe STT (`scribe_v2`)
       │
       ▼
Transcript (Reviewed & editable in "Tell HerDay")
       │
       ▼
Local Gemma 2B Open-Weight Model (or Local Heuristic Engine fallback)
       │
       ▼
Structured Tasks (Title, Deadline, Fixed Time, Priority, Effort)
       │
       ▼
MongoDB Atlas Persistence (or LocalStorage fallback)
       │
       ▼
Deterministic Application Scheduler (Fixed slots, breaks, working hours)
       │
       ▼
Today's Schedule & Progress Tracking
       │
       ▼
Task Delayed or Missed? ──► Feedback ("Why wasn't this completed?")
                                    │
                                    ▼
                        Deterministic Replanner (Protects deadlines, shifts downstream)
```

---

## Why Gemma?

HerDay uses open-weight **Gemma** models (such as `gemma2:2b`, `gemma2:9b`, or `gemma:2b`) because they provide high-quality language understanding that runs directly on consumer hardware.

### Core Architecture Principle

> **"Gemma understands the user's messy thoughts; HerDay's application code controls the schedule."**

* **Gemma handles**:
  - Natural language parsing
  - Identifying tasks & deconstructing compound clauses
  - Detecting explicit or relative deadlines (*"Friday"*, *"Tomorrow"*, *"Tonight"*)
  - Identifying fixed events (*"Class at 10"*, *"Meeting at 2pm"*)
  - Estimating effort in minutes
  - Inferring priority (*urgent*, *high*, *medium*, *low*)
  - Interpreting user delay feedback
* **Application code handles**:
  - Strict JSON schema validation
  - Time-slot calculation within user working hours (e.g. `09:00` – `21:30`)
  - Conflict detection & fixed-time schedule locking
  - Automatic restorative break placement (every 90 minutes)
  - Task state and LocalStorage / MongoDB persistence
  - Deterministic replanning calculations

**The LLM never directly sets calendar slots or manipulates application state.**

---

## Running Gemma Locally with Ollama

The primary and simplest setup for running HerDay with real local AI is **Ollama**:

### Step 1: Install Ollama
Download and install Ollama from [ollama.com](https://ollama.com) or via winget:
```powershell
winget install Ollama.Ollama
```

### Step 2: Pull and Run a Gemma Model
For fast, lightweight inference on any modern laptop or desktop:
```bash
ollama run gemma2:2b
```

### Step 3: Configure HerDay
1. Open HerDay in your browser (`http://localhost:5173`).
2. Navigate to **Settings** $\rightarrow$ **AI Provider & Extraction Architecture**.
3. Select **Gemma Open-Weight Model**.
4. Set:
   - **Endpoint URL**: `http://localhost:11434` (Ollama default address)
   - **Model Name**: `gemma2:2b`
5. Click **Test Connection** (Status: `Connected`).
6. Click **Save Preferences**.

---

## Voice Input: ElevenLabs Scribe (`scribe_v2`)

HerDay supports hands-free thought capture using **ElevenLabs Scribe** (`scribe_v2`), the high-accuracy speech-to-text model.

### Critical Voice Principles
1. **Zero Secret Leakage**: `ELEVENLABS_API_KEY` is **never** bundled into the client application and is never prefixed with `VITE_`.
2. **Local Server-Side Proxy**: Audio streams via Vite's local dev server middleware (`/api/voice/transcribe`) directly to ElevenLabs' official STT endpoint.
3. **Dedicated STT Role**: ElevenLabs is used exclusively for speech-to-text. It never schedules or interacts with your task data. Gemma remains the sole intelligence engine.
4. **Editable Transcript**: The user always sees and can edit the transcribed text before it is submitted to Gemma. Voice input never auto-submits.
5. **Non-Mandatory & Graceful Degradation**: If ElevenLabs is unconfigured, keyboard input remains 100% functional.

### Voice Setup
1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Add your ElevenLabs API key:
   ```env
   ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
   ```
3. Restart or start the dev server (`npm run dev`).
4. In HerDay, open **Settings** $\rightarrow$ **Voice Input (ElevenLabs Scribe)** to verify connection status.

---

## Cloud Persistence: MongoDB Atlas

HerDay supports cloud persistence using **MongoDB Atlas** while maintaining a strict **local-first** foundation.

### Database Architecture & Collections

```text
Database: herday (or specified database in connection string)
├── tasks               (id, title, notes, deadline, estimatedMinutes, priority, category, status, createdAt, completedAt, feedbackHistory)
├── plans               (id, date, scheduled items, time slots, breaks, generatedAt, updatedAt)
├── replanning_events   (id, taskId, taskTitle, originalScheduledTime, newScheduledTime, reason, notes, explanation, timestamp)
└── preferences         (_id: "user_preferences", workingHours, breakPreferences, timezone, sanitized AI config)
```

### Local-First Persistence & Fallback
- **MongoDB Available**: Tasks, plans, replanning audit events, and preferences are synchronized to MongoDB Atlas asynchronously while saving instantly to localStorage.
- **MongoDB Unavailable or Unconfigured**: HerDay seamlessly operates using `LocalStorageService` with zero interruptions, zero freezes, and zero crashes.
- **Intentional Migration**: Users can migrate existing local tasks and daily plans to MongoDB with one click in **Settings** $\rightarrow$ **Migrate to MongoDB**.

### Security & Privacy Rules
- **Backend Boundary**: The browser never connects directly to MongoDB. All database communication is mediated through a lightweight server-side API (`/api/db/*`).
- **No Secret Storage in Database**: API keys (including `ELEVENLABS_API_KEY` and Gemma authorization tokens) are **strictly forbidden** from being stored in MongoDB. The server explicitly sanitizes all preference documents before persisting.
- **Environment Isolation**: `MONGODB_URI` remains exclusively server-side and is never exposed through Vite client environment variables.

### MongoDB Setup
1. In your `.env` file, add your MongoDB Atlas connection string:
   ```env
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/herday?retryWrites=true&w=majority
   ```
2. Restart the dev server (`npm run dev`).
3. Open **Settings** $\rightarrow$ **Database (MongoDB Atlas)**:
   - Click **Check Status** to confirm connection.
   - Click **Migrate to MongoDB** to sync your current local tasks and plan.

---

## Privacy Notice

* **Local AI Execution**: When running an open-weight Gemma model locally via Ollama, all thoughts and schedule notes remain strictly on your physical machine.
* **Cloud Storage Transparency**: HerDay stores planner data in MongoDB when cloud persistence is enabled. AI scheduling remains controlled by the application, and API credentials are never stored in the database.
* **Masked Credentials**: All secrets in `.env` remain server-side and are excluded from git version control.

---

## Development & Verification

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run complete automated verification suite (Suites 1, 2, and 3)
npm test

# Build production bundle
npm run build
```

### Test Suite Coverage

#### Suite 1: Gemma Integration & Core Workflow (`npm test` / Suite 1)
- **Test A**: Valid Gemma JSON parsing & schema validation (`title`, `deadline`, `fixedTime`, `estimatedMinutes`, `priority`, `category`, `notes`).
- **Test B**: Malformed Gemma response handling (broken syntax, conversational non-JSON, empty list).
- **Test C**: Gemma unavailable diagnosis (`Unreachable`, `Invalid response`, `Not configured`).
- **Test D**: Explicit fallback to Local Heuristic Engine.
- **Test E**: Review flow integration and user adjustments.
- **Test F**: Deterministic scheduler authority, automatic breaks, and delay replanning.

#### Suite 2: ElevenLabs Scribe Voice Layer (`npm test` / Suite 2)
- **Test 1**: Successful audio transcription with `scribe_v2`.
- **Test 2**: Empty audio and silent recording rejection.
- **Test 3**: Service unavailability handling without crashing.
- **Test 4**: Authentication failure handling and credential leak prevention.
- **Test 4b**: Server-side proxy security check (`/api/voice/status` and `/api/voice/transcribe`).
- **Test 5**: Transcript insertion directly into Tell HerDay text input.
- **Test 6**: Pre-submission transcript review & editing by user.
- **Test 7**: Real Gemma pipeline extraction from edited voice transcript.
- **Test 8**: Deterministic scheduler generation with protected breaks.
- **Test 9**: Deterministic replanning on missed or delayed voice-originated tasks.

#### Suite 3: MongoDB Atlas Persistence & Local Fallback (`npm test` / Suite 3)
- **Test 1**: Create task with full metadata & persist to MongoDB collection.
- **Test 2**: Update task in MongoDB (effort, title, priority, `updatedAt`).
- **Test 3**: Complete task and record `completedAt` timestamp.
- **Test 4**: Delete task from MongoDB collection.
- **Test 5**: Create and persist daily plan with scheduled items and restorative breaks.
- **Test 6**: Persist replanning events with complete audit trail (original time, new time, reason).
- **Test 7**: Strict secret sanitization (API keys never persisted in DB).
- **Test 8**: Intentional bulk migration from localStorage to MongoDB.
- **Test 9**: Offline MongoDB diagnostics, invalid URI detection, and graceful LocalStorage fallback.
- **Test 10**: Authoritative deterministic scheduler & replanner stability.
