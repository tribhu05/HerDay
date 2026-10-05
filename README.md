<div align="center">

# 🌸 HerDay

### *A Private, Adaptive Daily Planner Built for Someone I Care About*

**Transforming messy, anxious thoughts into calm, realistic, and sustainable days.**

<br />

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg?style=for-the-badge)](package.json)
[![DEV Community Hacktoberfest 2026](https://img.shields.io/badge/DEV_Community-Hacktoberfest_2026-ff7a00.svg?style=for-the-badge)](https://dev.to)
[![AI Engine](https://img.shields.io/badge/AI_Engine-Gemma_2B_(Open--Weight)-4285F4.svg?style=for-the-badge)](https://ai.google.dev/gemma)
[![Voice STT](https://img.shields.io/badge/Voice_STT-ElevenLabs_Scribe_(v2)-10b981.svg?style=for-the-badge)](https://elevenlabs.io)
[![Database](https://img.shields.io/badge/Storage-MongoDB_Atlas_%2F_Local--First-47A248.svg?style=for-the-badge)](https://www.mongodb.com/atlas)
[![License](https://img.shields.io/badge/License-MIT-purple.svg?style=for-the-badge)](LICENSE)

<br />

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/tribhu05/HerDay)

<br />

> *"Tell HerDay what is on your mind. HerDay turns it into a realistic day."*

---

</div>

## 📑 Table of Contents

- [The Story: Built for Ananya](#-the-story-built-for-ananya)
- [The Problem with Traditional Productivity](#-the-problem-with-traditional-productivity)
- [The Solution & Core Philosophy](#-the-solution--core-philosophy)
- [Comparison: Traditional Apps vs. HerDay](#-comparison-traditional-apps-vs-herday)
- [System Architecture & Dataflow](#-system-architecture--dataflow)
- [Why Open-Source AI (Gemma 2B)?](#-why-open-source-ai-gemma-2b)
- [Key Features](#-key-features)
- [Privacy & Data Sovereignty Matrix](#-privacy--data-sovereignty-matrix)
- [Technology Stack](#-technology-stack)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#1-clone--install)
  - [Local AI Setup (Ollama + Gemma 2B)](#2-start-local-gemma-model)
  - [Environment Configuration](#3-environment-configuration)
  - [Running the App](#4-run-development-server)
- [Deployment Guide (Render)](#-deployment-guide-render)
- [Testing & Quality Assurance](#-testing--quality-assurance)
- [REST API Reference](#-rest-api-reference)
- [🌐 Community Wisdom](#-community-wisdom)
- [Contributing & License](#-contributing--license)

---

## 💌 The Story: Built for Ananya

HerDay was created for **Ananya**, a close friend and engineering student who experiences severe cognitive fatigue and executive dysfunction during high-stakes university exam cycles.

Like many ambitious students balancing demanding coursework, labs, and personal commitments, Ananya does not think in rigid 30-minute calendar blocks. When overwhelmed, her thoughts tumble out as an unfiltered stream of urgency:

> *"I have my DBMS final Friday, need to finish two chapters of indexing, submit problem set 4 before Thursday, and I have distributed systems lecture tomorrow at 10. Also need to grocery shop and call my mom."*

When she tried using standard productivity tools, the result was almost always burnout:
* **Rigid Calendar Blockers** demanded tedious timestamp micromanagement, triggering decision paralysis before any studying began.
* **Guilt-Driven Todo Lists** accumulated red overdue badges when a single morning session ran 45 minutes over, turning tools meant to help into sources of anxiety.
* **Commercial Cloud AI Assistants** promised to "organize her life" but required transmitting deeply personal academic struggles, daily routines, and vulnerable thoughts to opaque corporate cloud servers.

**HerDay is a gift built specifically for her:** an empathetic companion that listens to messy language, extracts structured commitments, arranges them realistically around her non-negotiables, and **calmly adapts the schedule when life inevitably happens—with zero guilt and 100% data privacy.**

---

## ⚡ The Problem with Traditional Productivity

```
┌─────────────────────────────────┐       ┌─────────────────────────────────┐
│     The Human Reality           │  VS   │     Traditional Software        │
├─────────────────────────────────┤       ├─────────────────────────────────┤
│ • Messy, stream-of-consciousness│       │ • Requires rigid input forms    │
│ • Unpredictable interruptions   │       │ • Cascading delay collapse      │
│ • Cognitive fatigue & burnout   │       │ • Ignores human energy limits   │
│ • Vulnerable personal context   │       │ • Cloud monetization & telemetry│
└─────────────────────────────────┘       └─────────────────────────────────┘
```

1. **Unstructured Thinking vs. Rigid Forms**: Humans process urgency as emotional narratives, not pre-sorted database entries.
2. **The Fragile Plan Trap**: If a 10:00 AM task takes until 11:45 AM, traditional calendar layouts break down into overlapping errors and guilt.
3. **Rest Neglect**: High achievers consistently underestimate mental exhaustion, skipping restorative breaks until forced to stop by burnout.
4. **Intrusive Cloud Telemetry**: A daily planner reflects our most private habits—when we wake up, where we study, and what stresses us out.

---

## 💡 The Solution & Core Philosophy

HerDay is designed around an intentional architectural principle:

<div align="center">

### **"Gemma understands. HerDay decides."**

</div>

* **Probabilistic Understanding (Local Gemma 2B)**: Language models are exceptionally good at natural language comprehension, extracting deadlines, estimating effort, and identifying fixed constraints from conversational speech.
* **Deterministic Scheduling (Pure TypeScript Engine)**: Language models should **never** be trusted with mathematical time allocation. HerDay hands extracted tasks to a deterministic constraint-satisfaction engine that guarantees no overlapping bookings, respects daily working hours, and injects protected rest periods.
* **Guilt-Free Dynamic Replanning**: When a task overruns, one tap on *"Report Delay"* shifts downstream tasks, protects hard deadlines, and produces a calm, human explanation of what changed and why.
* **Review-First Guardrails**: AI never silently inserts tasks into the schedule. The user always inspects, edits, and approves the extracted commitments first.

---

## ⚖️ Comparison: Traditional Apps vs. HerDay

| Feature | Standard Calendar Apps | Todo / Task Lists | Cloud AI Planners | **HerDay** 🌸 |
| :--- | :---: | :---: | :---: | :---: |
| **Input Style** | Rigid modal dialogs | Linear checkbox items | Chatbot prompt | **Natural speech or free text** |
| **Schedule Engine** | Manual drag-and-drop | None (manual sorting) | Stochastic LLM output | **Deterministic constraint solver** |
| **When Tasks Run Over** | Collides & overflows | Red "Overdue" badges | Hallucinates new slots | **Calm, mathematical replanning** |
| **Rest Protection** | Ignored | Ignored | Optional | **Mandatory 15m break / 90m work** |
| **Model Hosting** | Cloud | N/A | Proprietary cloud APIs | **Local-First Open Weights (Gemma 2B)** |
| **Offline Support** | Partial | Partial | None | **100% Offline (Local Heuristic Fallback)** |
| **Storage Architecture** | Proprietary DB | Vendor Cloud | Vendor Cloud | **LocalStorage + MongoDB Atlas Sync** |

---

## 🏗️ System Architecture & Dataflow

```
                       [ User Thought Intake ]
                      (Microphone / Text Input)
                                  │
                                  ▼
                    [ Optional Voice Transcription ]
                 ElevenLabs Scribe v2 Server-Side Proxy
                       (Streaming Audio -> Text)
                                  │
                                  ▼
                    [ Language Understanding Layer ]
                   Local Gemma 2B via Ollama (`gemma2:2b`)
                                  │
                    (Fallback: Local Heuristic Regex Parser)
                                  │
                                  ▼
                    [ Strict Schema Validation ]
                      (JSON Extraction Guardrail)
                                  │
                                  ▼
                     [ User Inspection & Review ]
                   (Edit Title, Time, Priority, Tags)
                                  │
                                  ▼
                  [ Deterministic Scheduler Engine ]
       ┌──────────────────────────┴──────────────────────────┐
       ▼                                                     ▼
Fixed Commitments                              Floating Tasks & Breaks
(Locked to explicit clock times)              (Sorted by priority & deadline)
       │                                                     │
       └──────────────────────────┬──────────────────────────┘
                                  ▼
                        [ Active Day Timeline ]
                                  │
                 Task Runs Over?  ▼  Need to Reschedule?
                    [ Deterministic Replanner ]
              • Recalculates remaining afternoon capacity
              • Preserves non-negotiable hard deadlines
              • Emits clear explanation with zero guilt
                                  │
                                  ▼
                   [ Resilient Persistence Layer ]
                      ┌───────────────────────┐
                      │  Local-First Browser  │  (100% Offline)
                      │     localStorage      │
                      └───────────┬───────────┘
                                  │ (Sync if configured)
                                  ▼
                      ┌───────────────────────┐
                      │  MongoDB Atlas Cloud  │  (Secure multi-device sync)
                      │    (Driver v7.7.0)    │
                      └───────────────────────┘
```

---

## 🧠 Why Open-Source AI (Gemma 2B)?

HerDay explicitly uses **Google's open-weight Gemma 2B model** (via Ollama or local inference) rather than commercial cloud APIs:

1. **On-Device Data Sovereignty**: Academic stress, daily habits, doctor appointments, and personal anxieties remain strictly on the user's laptop.
2. **Zero Subscription Paywalls**: A student should never lose their daily organizer because their cloud API balance ran out or an external service suffered an outage.
3. **Inspectable & Swappable**: Developers and users can run `gemma2:2b` on lightweight ultrabooks or upgrade to `gemma2:9b` on workstations without altering application logic.
4. **Offline Resilience**: If Ollama is offline or unavailable, HerDay automatically fails over to its in-browser **Local Heuristic Rule Engine** without crashing, ensuring unbroken productivity.

---

## ✨ Key Features

* 🎙️ **Stream-of-Consciousness Voice Intake**: Speak freely. Powered by ElevenLabs Scribe (`scribe_v2`) with a secure server-side proxy (API keys are never sent to the browser).
* 🧠 **Open-Weight Gemma 2B Intelligence**: Local language parsing via Ollama extracts deadlines, fixed meetings, priorities, and duration estimates.
* 🛡️ **Human-in-the-Loop Review**: Extracted commitments are displayed on a clean review screen before touching your calendar.
* ⏱️ **Deterministic Constraint Scheduling**: Mathematical placement algorithm locks non-negotiables (e.g., *"Lecture at 10:00 AM"*) and schedules floating tasks safely.
* ☕ **Protected Restorative Breaks**: Automatically reserves 15-minute breaks after every 90 minutes of focused effort to combat cognitive exhaustion.
* 🔄 **Adaptive Replanning with Zero Guilt**: One click informs the planner of delays. Downstream tasks shift automatically, hard deadlines remain protected, and explanations are reassuring.
* 💾 **Dual-Mode Persistence**: Operates 100% offline using `localStorage`. Seamlessly syncs to MongoDB Atlas when a connection string is provided.
* 🌙 **Calm Aesthetic**: Tailored dark-mode UI crafted with Tailwind CSS v4 and Lucide icons to reduce sensory strain.

---

## 🔒 Privacy & Data Sovereignty Matrix

| Component | Destination | Storage Type | Security / Privacy Boundary |
| :--- | :---: | :---: | :--- |
| **Gemma 2B Inference** | **Localhost** | RAM / Cache | **100% On-Device**. No prompts or transcripts ever leave your local machine. |
| **Planner State & Tasks** | **Localhost** | `localStorage` | **100% Offline**. Stored in browser sandbox storage. |
| **Voice Audio (Optional)** | **ElevenLabs API** | Ephemeral | Audio is streamed strictly for transcription over HTTPS via server proxy. No audio is persisted. |
| **Database Sync (Optional)** | **MongoDB Atlas** | Encrypted TLS | Only active if `MONGODB_URI` is configured in `.env`. Server-side only; connection strings never reach the client. |

---

## 🛠️ Technology Stack

```
Frontend:       React 19  ·  TypeScript 6.0  ·  Tailwind CSS v4  ·  Vite 8  ·  Lucide Icons
AI / NLP:       Google Gemma 2B  ·  Ollama  ·  Deterministic Regex Heuristic Engine
Voice:          ElevenLabs Scribe API (v2) Server-Side Proxy
Persistence:    MongoDB Atlas (Node Driver v7.7.0)  ·  Local-First localStorage
Architecture:   Node.js  ·  Vite Middleware Server  ·  Docker / Render Ready
```

---

## 🚀 Getting Started

### Prerequisites

* [Node.js](https://nodejs.org) (v20 or higher recommended)
* [Ollama](https://ollama.com) (for local Gemma 2B inference)
* *(Optional)* An ElevenLabs API key for voice transcription
* *(Optional)* A MongoDB Atlas database cluster for cloud synchronization

---

### 1. Clone & Install

```bash
git clone https://github.com/tribhu05/HerDay.git
cd HerDay
npm install
```

---

### 2. Start Local Gemma Model

Install and run the lightweight `gemma2:2b` model locally via Ollama:

```bash
ollama run gemma2:2b
```

> **Note**: If you don't run Ollama, HerDay will automatically use its built-in **Local Heuristic Engine** with zero configuration!

---

### 3. Environment Configuration

HerDay runs completely offline by default. To enable optional cloud sync and voice intake, create a `.env` file:

```bash
cp .env.example .env
```

| Variable | Required | Default | Description |
| :--- | :---: | :---: | :--- |
| `ELEVENLABS_API_KEY` | Optional | `""` | ElevenLabs API key for high-accuracy voice transcription |
| `MONGODB_URI` | Optional | `""` | MongoDB Atlas connection string for multi-device sync |
| `OLLAMA_BASE_URL` | Optional | `http://localhost:11434` | Ollama local API base URL |
| `GEMMA_MODEL` | Optional | `gemma2:2b` | Model name to invoke via Ollama |
| `PORT` | Optional | `5173` | Server port |

> ⚠️ **Security Guarantee**: Neither `MONGODB_URI` nor `ELEVENLABS_API_KEY` are prefixed with `VITE_`. They are handled exclusively server-side and never exposed to the browser client.

---

### 4. Run Development Server

```bash
npm run dev
```

Visit [http://localhost:5173](http://localhost:5173) in your browser.

---

### 5. Production Server

To build and run HerDay as a standalone production server:

```bash
npm run build
npm start
```

---

## 🌐 Deployment Guide (Render)

HerDay includes a production-ready Render Blueprint (`render.yaml`).

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/tribhu05/HerDay)

### One-Click Setup Steps:
1. Fork or push this repository to your GitHub account.
2. Sign in to the [Render Dashboard](https://dashboard.render.com).
3. Click **New +** $\rightarrow$ **Blueprint** and select your `HerDay` repository.
4. Render automatically configures:
   * **Build Command**: `npm install && npm run build`
   * **Start Command**: `npm start`
   * **Runtime**: Node.js
5. *(Optional)* Add your `ELEVENLABS_API_KEY` and `MONGODB_URI` in the Render environment variables tab.
6. Click **Apply** to deploy your live planner!

---

## 🧪 Testing & Quality Assurance

HerDay includes a comprehensive, automated test suite validating the entire pipeline from end to end:

```bash
# Run all automated test suites (Suites 1, 2, and 3)
npm test

# Run live integration test against running Ollama Gemma 2B instance
npm run test:live

# Run voice workflow integration test
npm run test:voice

# Run type checking and production build bundle test
npm run build
```

### Test Coverage Highlights:
* **Suite 1: Heuristic Fallback & Parsing**: Verifies task duration parsing, deadline inference, and compound intent splitting without external dependencies.
* **Suite 2: Deterministic Scheduler & Replanner**: Verifies fixed-time locks, working hour boundaries, automatic 15-minute break insertion, and delay propagation.
* **Suite 3: Persistence & Fallback Resilience**: Verifies MongoDB Atlas connectivity, CRUD operations, and seamless graceful degradation to `localStorage` when offline.

---

## 📡 REST API Reference

The local server exposes clean, lightweight persistence and utility endpoints:

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/voice/transcribe` | Proxies audio payload to ElevenLabs Scribe (`scribe_v2`) securely |
| `GET` | `/api/db/status` | Reports MongoDB Atlas connection state (`Connected` / `Offline`) |
| `GET` | `/api/db/tasks` | Retrieves all persisted tasks |
| `POST` | `/api/db/tasks` | Saves or updates a task definition |
| `PUT` | `/api/db/tasks/:id` | Updates an existing task by ID |
| `DELETE` | `/api/db/tasks/:id` | Deletes a task by ID |
| `GET` | `/api/db/plans` | Fetches active daily plans and generated time slots |
| `POST` | `/api/db/plans` | Stores a generated schedule plan |
| `GET` | `/api/db/preferences` | Fetches user settings (working hours, breaks, AI mode) |
| `POST` | `/api/db/preferences` | Saves user preferences |
| `GET` | `/api/db/replanning` | Retrieves historical replanning audit trail |
| `POST` | `/api/db/replanning` | Records a replanning event and explanation |
| `POST` | `/api/db/migrate` | Safely migrates local storage tasks into MongoDB Atlas |

---

## 🌐 Community Wisdom

HerDay's architecture incorporates patterns established by the developer community on [DEV.to](https://dev.to):

1. **Decoupling AI Inference from Business Logic**: The community emphasizes that while modern LLMs excel at semantic extraction, core operational logic (scheduling, constraint checking, database transactions) must remain strictly deterministic.
   * Reference: [Decoupling the AI Stack for Production](https://dev.to) — highlights isolating inference engines behind validated schemas.
2. **Local-First & On-Device AI Sovereignty**: By running small open-weight models (like Gemma 2B via Ollama) locally and coupling them with in-browser storage fallbacks, web applications achieve high privacy guarantees, air-gapped functionality, and zero API cost.
   * Reference: [Building Privacy-First Web Apps with Local LLMs and Ollama](https://dev.to) — outlines local inference pipelines with web frontends.

---

## 🤝 Contributing & License

Contributions, feedback, and ideas are warmly welcomed! Please open an issue or submit a pull request on GitHub.

Distributed under the **MIT License**. See [LICENSE](LICENSE) for details.

---

<div align="center">

**Built with love, empathy, and open-source technology for Ananya and anyone navigating an overwhelming day.**

</div>
