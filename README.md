# HerDay

A private, adaptive daily planner that transforms messy thoughts into realistic, sustainable schedules.

> **"Tell HerDay what is on your mind. HerDay turns it into a realistic day."**

[![Built for Hacktoberfest 2026](https://img.shields.io/badge/DEV_Community-Hacktoberfest_2026-ff7a00.svg)](https://dev.to)
[![Model](https://img.shields.io/badge/AI_Engine-Gemma_2B_(Open--Weight)-4285F4.svg)](https://ai.google.dev/gemma)
[![Voice STT](https://img.shields.io/badge/Voice_STT-ElevenLabs_Scribe_(v2)-10b981.svg)](https://elevenlabs.io)
[![Persistence](https://img.shields.io/badge/Storage-MongoDB_Atlas_%2F_Local--First-47A248.svg)](https://www.mongodb.com/atlas)
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/tribhu05/HerDay)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## Built For Someone I Care About

HerDay was built for **Ananya**, a close friend and engineering student who experiences severe cognitive fatigue and executive overload during exam season.

Like many ambitious students with intense workloads, Ananya's brain does not think in neat 30-minute calendar blocks. Her mind processes commitments as messy, interwoven streams of urgency:
> *"I have my DBMS final Friday, need to finish two chapters of indexing, submit problem set 4 before Thursday, and I have distributed systems lecture tomorrow at 10."*

When she tries using traditional productivity tools, they break down within hours:
* **Rigid Calendar Blockers** force her into micromanaging timestamps, leading to decision paralysis before she even begins studying.
* **Guilt-Driven Todo Lists** pile up endlessly with red overdue badges when a single morning session runs 45 minutes over.
* **Cloud AI Assistants** claim to "organize your life" but send deeply personal study routines, journal notes, and private thoughts to opaque corporate cloud servers.

HerDay was built as a gift for her: an empathetic companion that listens to messy language, extracts structured tasks, schedules them realistically around her actual commitments, and **calmly adapts the schedule when life inevitably happens—with zero guilt.**

---

## The Problem

Traditional productivity software assumes humans are deterministic machines with predictable schedules. In reality:

1. **Messy Thoughts**: Real tasks enter our minds as unstructured stream-of-consciousness, not pre-sorted database rows.
2. **Fragile Plans**: If a task scheduled from 10:00 to 11:00 takes until 11:45, the entire day's schedule collapses into cascading delays.
3. **Overlooked Breaks**: People chronically underestimate cognitive fatigue, skipping restorative rest until burnout strikes.
4. **Privacy Concerns**: Daily planners hold our most vulnerable personal context: when we wake up, where we have class, and what causes us stress.

---

## The Solution

HerDay solves this through an intentional separation of concerns:

> **"Gemma understands. HerDay decides."**

* **Open-Weight Gemma (or Local Heuristic Engine)** parses unstructured speech and text into validated task definitions, extracting explicit deadlines, fixed constraints, and realistic effort estimates.
* **Deterministic Application Engine** calculates the actual time slots, locks non-negotiable commitments, enforces working-hour boundaries, and inserts mandatory 15-minute breaks every 90 minutes.
* **Adaptive Replanning Engine** recalculates remaining afternoon hours whenever a task runs long or a disruption occurs, preserving hard deadlines while eliminating guilt.
* **Review-First Guardrails**: AI suggestions are never silently inserted into the calendar. The user inspects and confirms everything first.

---

## How It Works

```text
User Thought (Voice or Text)
           │
           ▼
ElevenLabs Scribe STT (`scribe_v2`)  [Optional Voice Layer]
           │
           ▼
Raw Natural Language Transcript
           │
           ▼
Local Gemma 2B via Ollama  ──(Fallback)──►  Local Heuristic Engine
           │
           ▼
Strict JSON Schema Validation
           │
           ▼
User Review Screen  [Inspect, Edit, & Confirm]
           │
           ▼
Deterministic Scheduler
  ├── Locks fixed-time commitments (e.g. "Lecture at 14:00")
  ├── Respects working hours (09:00 — 21:30)
  └── Injects protected restorative breaks
           │
           ▼
Active Day Timeline  ──►  Task Delay Reported?
                                  │
                                  ▼
                      Deterministic Replanner
                        ├── Shifts downstream tasks
                        ├── Protects hard deadlines
                        └── Explains WHY the day changed
```

---

## Why Open-Source AI Matters

HerDay specifically chooses **open-weight Gemma models** (via Ollama or local inference) over closed, hosted API endpoints. This architectural choice is central to the product:

1. **On-Device Data Sovereignty**: A daily planner stores intimate personal data—daily routines, academic struggles, medical appointments, and private anxieties. Running Gemma locally ensures that messy thoughts never leave the user's laptop.
2. **Zero Subscription Paywalls**: A student should not lose access to their personal daily planner because their monthly API credits expired or an external cloud endpoint had an outage.
3. **Inspectable & Customisable**: Open weights allow local optimization, prompt tuning, and model swapping (e.g., `gemma2:2b` on lightweight laptops or `gemma2:9b` on workstations).
4. **Resilient Offline Architecture**: If the local Gemma endpoint is unreachable or Ollama is stopped, HerDay immediately engages its built-in **Local Heuristic Engine** without crashing, ensuring unbroken productivity even on airplane Wi-Fi.

---

## Key Features

* **Natural Language Thought Capture**: Type or speak naturally. HerDay parses compound commitments, deadlines, and time constraints.
* **Voice Thought Intake**: High-accuracy voice transcription powered by ElevenLabs Scribe (`scribe_v2`) with server-side proxy protection (API keys never touch the browser).
* **Open-Weight Gemma 2B**: Local language understanding powered by Gemma via Ollama or any OpenAI-compatible local server.
* **Human-in-the-Loop Review**: Extracted commitments are presented cleanly with duration, priority, and deadlines before entering the schedule.
* **Deterministic Scheduling**: Pure mathematical scheduling logic places tasks into realistic slots, locks fixed commitments, and honors working hours.
* **Protected Restorative Breaks**: Automatically reserves 15-minute breaks every 90 minutes to prevent burnout.
* **Adaptive Replanning**: When a task runs over, report a delay with one click. HerDay shifts downstream tasks and clearly explains what changed and why.
* **Local-First with Optional Cloud Sync**: Works 100% offline using `localStorage`. Optionally syncs across devices with MongoDB Atlas when configured.
* **Zero Guilt UX**: No angry red badges or failure shaming. Unfinished tasks are calmly adapted into open slots.

---

## Technical Architecture

| Layer | Technology | Role |
| :--- | :--- | :--- |
| **Frontend UI** | React 19, TypeScript, Tailwind CSS v4, Lucide Icons | Responsive, accessible, calm dark-mode interface |
| **Language Understanding** | Google Gemma 2B via Ollama (`gemma2:2b`) | Task extraction, deadline inference, priority classification |
| **Deterministic AI Fallback** | Local Heuristic Regex & Rule Engine | Offline fallback parser running in-browser |
| **Speech-to-Text** | ElevenLabs Scribe API (`scribe_v2`) | Server-side proxied voice transcription |
| **Scheduler & Replanner** | Pure TypeScript Algorithms | Deterministic constraint satisfaction & schedule adaptation |
| **Persistence** | LocalStorage + MongoDB Atlas (Driver v7) | Local-first storage with optional cloud sync |
| **Build & Dev Server** | Vite 8, Node.js | Fast local HMR & API proxy middleware |

---

## Privacy: What Stays Local vs. What Leaves the Device

| Data / Component | Location | Details |
| :--- | :--- | :--- |
| **Gemma Model Inference** | **Local (100% On-Device)** | Executes locally on your machine via Ollama. No personal notes sent to cloud LLMs. |
| **Planner State & Tasks** | **Local (100% On-Device)** | Stored in browser `localStorage`. Works completely offline. |
| **Voice Audio (Optional)** | **ElevenLabs API** | Audio is streamed to ElevenLabs solely for transcription if voice input is used. |
| **Cloud Persistence (Optional)**| **MongoDB Atlas** | Only active if `MONGODB_URI` is supplied in `.env`. Credentials and API keys are strictly sanitized and never saved in the database. |

---

## Running Locally

### Prerequisites

* [Node.js](https://nodejs.org) (v20+ recommended)
* [Ollama](https://ollama.com) (for local Gemma inference)

### 1. Clone & Install

```bash
git clone https://github.com/tribhu05/HerDay.git
cd HerDay
npm install
```

### 2. Start Local Gemma Model

```bash
# Pull and start the lightweight open-weight Gemma 2B model
ollama run gemma2:2b
```

### 3. Configure Environment (Optional)

```bash
# Copy example configuration
cp .env.example .env
```

* **Voice Input**: Add `ELEVENLABS_API_KEY=your_key` for ElevenLabs Scribe STT.
* **Cloud Persistence**: Add `MONGODB_URI=your_atlas_uri` for MongoDB Atlas sync.
* *Note: HerDay works 100% offline out-of-the-box with local heuristic extraction and localStorage without touching `.env`.*

### 4. Start Development Server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Deploy to Render

HerDay is pre-configured with a Render Blueprint (`render.yaml`) for one-click full-stack deployment:

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/tribhu05/HerDay)

### Quick Setup:
1. Log into [dashboard.render.com](https://dashboard.render.com).
2. Click **New +** $\rightarrow$ **Blueprint** (or **Web Service**).
3. Connect your repository: `https://github.com/tribhu05/HerDay`.
4. Render automatically applies the blueprint from `render.yaml`:
   * **Runtime**: Node
   * **Build Command**: `npm install && npm run build`
   * **Start Command**: `npm start`
5. *(Optional)* In **Environment Variables**, provide:
   * `ELEVENLABS_API_KEY`: for voice input transcription
   * `MONGODB_URI`: for MongoDB Atlas cloud sync
6. Click **Apply** / **Deploy**. Render will build and launch your live service!

---

## Verification & Testing

HerDay includes a comprehensive, automated multi-suite test harness covering Gemma extraction, voice integration, MongoDB persistence, and deterministic scheduling:

```bash
# Run complete test suite (Suites 1, 2, and 3)
npm test

# Run live integration test against running Ollama Gemma instance
npm run test:live

# Verify production build bundle
npm run build
```

---

## Built During Hacktoberfest 2026

HerDay was developed for the **DEV Community Hacktoberfest 2026 Weekend Challenge: Build for a Friend**.

Built with genuine love, thoughtful empathy, and open-source technology for every friend who deserves a realistic, calm day.
