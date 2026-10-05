<div align="center">

# 🌸 HerDay

### A private, adaptive daily planner that transforms messy thoughts into realistic, sustainable schedules.

<p align="center">
  <a href="https://herday.onrender.com"><strong>🚀 View Live App</strong></a> &nbsp;•&nbsp;
  <a href="#-the-story-built-for-ananya"><strong>The Story</strong></a> &nbsp;•&nbsp;
  <a href="#-how-it-works"><strong>How It Works</strong></a> &nbsp;•&nbsp;
  <a href="#-quickstart"><strong>Quickstart</strong></a> &nbsp;•&nbsp;
  <a href="#-tests"><strong>Tests</strong></a>
</p>

[![Live Demo](https://img.shields.io/badge/Demo-herday.onrender.com-success?style=for-the-badge&logo=render)](https://herday.onrender.com)
[![DEV Community Hacktoberfest 2026](https://img.shields.io/badge/DEV_Community-Hacktoberfest_2026-ff7a00.svg?style=for-the-badge)](https://dev.to)
[![AI Engine](https://img.shields.io/badge/AI_Engine-Gemma_2B_(Open--Weight)-4285F4.svg?style=for-the-badge)](https://ai.google.dev/gemma)
[![Voice STT](https://img.shields.io/badge/Voice_STT-ElevenLabs_Scribe_(v2)-10b981.svg?style=for-the-badge)](https://elevenlabs.io)
[![Database](https://img.shields.io/badge/Storage-MongoDB_Atlas-47A248.svg?style=for-the-badge)](https://www.mongodb.com/atlas)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

<br />

> *"Tell HerDay what is on your mind. HerDay turns it into a realistic day."*

---

</div>

## 🌐 Live Deployment

🚀 **Live Web Application:** [**https://herday.onrender.com**](https://herday.onrender.com)

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/tribhu05/HerDay)

*(Note: Hosted on Render Free Tier. If dormant, please allow ~30 seconds for the container to spin up.)*

---

## 💌 The Story: Built for Ananya

HerDay was built for **Ananya**, a close friend and engineering student who experiences severe cognitive fatigue and executive overload during exam season.

Ambitious students don't think in neat 30-minute calendar blocks. When overwhelmed, commitments pour out as a stressful stream of consciousness:

> *"I have my DBMS final Friday, need to finish two chapters of indexing, submit problem set 4 before Thursday, and I have distributed systems lecture tomorrow at 10."*

Traditional calendar blockers demand exhausting timestamp micromanagement, todo lists pile up with red overdue badges, and cloud AI assistants exfiltrate private thoughts.

**HerDay is an empathetic companion built for her:** it listens to messy language, extracts structured tasks, schedules them realistically around fixed commitments, and **calmly adapts the schedule when tasks run long—with zero guilt and 100% privacy.**

---

## 💡 How It Works

```
[ User Thought (Voice or Text) ]
               │
               ▼
 [ ElevenLabs Scribe STT (v2) ]    (Optional Voice Intake)
               │
               ▼
[ Local Gemma 2B via Ollama ]      (Fallback: In-Browser Heuristics)
               │
               ▼
   [ Human-in-the-Loop Review ]    (Inspect & Confirm Tasks)
               │
               ▼
 [ Deterministic Scheduler Engine ]
   ├── Locks fixed-time events ("Lecture at 10:00")
   ├── Enforces working hours (09:00 - 21:30)
   └── Protects mandatory 15-min breaks every 90 min
               │
               ▼
     [ Active Day Timeline ] ────(Task Delayed?)────► [ Deterministic Replanner ]
               │                                      • Shifts downstream tasks
               ▼                                      • Preserves hard deadlines
   [ LocalStorage / Atlas Sync ]                      • Zero-guilt explanation
```

### The Core Philosophy: *"Gemma understands. HerDay decides."*
* **Gemma 2B** handles fuzzy natural language understanding, deadline extraction, and duration estimation.
* **Pure TypeScript Code** handles mathematical time allocation and constraint satisfaction—guaranteeing zero scheduling hallucinations.

---

## ⚖️ Comparison: Traditional Planners vs. HerDay

| Feature | Calendar Apps | Todo Lists | Cloud AI | **HerDay** 🌸 |
| :--- | :---: | :---: | :---: | :---: |
| **Intake** | Rigid time pickers | Manual lines | Chat prompts | **Natural voice or text stream** |
| **Scheduler** | Manual drag & drop | None | Stochastic LLM | **Deterministic constraint solver** |
| **Delays** | Cascading collapse | Overdue badges | Re-prompts | **Calm, 1-click automatic replanning** |
| **Rest** | Ignored | Ignored | Optional | **Protected 15m break every 90m** |
| **Privacy** | Cloud database | Vendor servers | Cloud LLM logs | **100% Local Gemma 2B & LocalStorage** |
| **Offline** | Partial | Partial | ❌ No | **✅ 100% Functional Offline** |

---

## ✨ Key Features

* 🎙️ **Voice & Text Thought Intake**: Speak or type freely. High-accuracy transcription powered by ElevenLabs Scribe (`scribe_v2`) with a secure server-side proxy.
* 🧠 **Open-Weight Gemma 2B**: Local language parsing via Ollama or in-browser regex heuristic fallback.
* 🛡️ **Human-in-the-Loop**: Inspect, edit, and approve extracted tasks before they enter your day.
* ⏱️ **Deterministic Scheduler**: Locks hard commitments, places floating tasks by priority, and prevents burnout.
* 🔄 **Guilt-Free Replanning**: When a task overruns, one click recalculates the remaining day without shaming.
* 💾 **Dual-Mode Persistence**: Local-first by default via `localStorage`, with optional multi-device sync to MongoDB Atlas.

---

## 🔒 Privacy & Data Sovereignty

| Layer | Destination | Privacy Guarantee |
| :--- | :--- | :--- |
| **Gemma 2B Model** | **Localhost** | **100% On-Device**. Prompts and thoughts never leave your machine. |
| **Tasks & Schedule** | **Localhost** | **100% Offline**. Stored in browser `localStorage`. |
| **Voice Audio** | **ElevenLabs API** | Audio streamed strictly for transcription over secure server proxy. |
| **Cloud Sync** | **MongoDB Atlas** | Optional encrypted TLS sync when `MONGODB_URI` is configured. |

---

## 🚀 Quickstart

### 1. Clone & Install

```bash
git clone https://github.com/tribhu05/HerDay.git
cd HerDay
npm install
```

### 2. Start Local Gemma Model (Optional)

```bash
ollama run gemma2:2b
```
*(If Ollama is not running, HerDay seamlessly switches to its built-in Local Heuristic Engine!)*

### 3. Configure Environment (Optional)

```bash
cp .env.example .env
```
Add `ELEVENLABS_API_KEY` for voice transcription or `MONGODB_URI` for MongoDB Atlas sync.

### 4. Start Development Server

```bash
npm run dev
```
Open **[http://localhost:5173](http://localhost:5173)** in your browser.

---

## 🧪 Tests

```bash
# Run all automated test suites (Gemma, Scheduler, Replanner, Mongo, LocalStorage)
npm test

# Run live integration test against running Ollama Gemma
npm run test:live

# Verify production build
npm run build
```

---

## 🌐 Community Wisdom

HerDay applies proven architectural patterns from the [DEV Community](https://dev.to):
* **AI Decoupling**: Isolate probabilistic LLMs to entity extraction while executing business logic with deterministic code.
* **Local-First Privacy**: Combine open-weight models (Gemma 2B) with client storage to safeguard personal user data.

---

## 📜 License

Distributed under the [MIT License](LICENSE).

<div align="center">

**Built for Ananya and anyone navigating an overwhelming day.** 🌸

</div>
