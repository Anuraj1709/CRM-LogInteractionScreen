# AI-First CRM HCP Module

This repository contains a single-repo submission for an AI-first Customer Relationship Management system focused on Healthcare Professionals. It includes:

- `frontend/`: React + Redux UI for the HCP `Log Interaction Screen`
- `backend/`: FastAPI backend with a LangGraph-powered HCP interaction agent

The solution is designed from a life sciences field-force perspective, where a representative can log an HCP interaction either through a structured compliant form or through a conversational AI workflow.

## 1. Solution Overview

### Business Objective

The HCP interaction logger helps field representatives capture:

- who they met
- what was discussed
- what promotional materials or samples were shared
- HCP sentiment and objections
- next-best actions and follow-ups

This design supports two parallel entry modes:

1. **Structured Form**
   Best for disciplined CRM entry and downstream analytics.
2. **Conversational Chat**
   Best for fast field capture immediately after a call or meeting, especially when reps want AI to draft the form automatically.

### Why This Is AI-First

Instead of treating AI as a side assistant, the system uses a LangGraph agent as the orchestration layer for interaction capture. The agent:

- interprets free-text rep notes
- extracts CRM-ready fields
- suggests follow-up actions
- checks for content/compliance concerns
- supports editing or refining saved interactions

The primary LLM is **Groq `gemma2-9b-it`**. The architecture also leaves room to use **`llama-3.3-70b-versatile`** for more advanced reasoning or future escalation flows.

## 2. Tech Stack

### Frontend

- React
- Redux Toolkit
- Vite
- Google Font: `Inter`

### Backend

- Python 3.12
- FastAPI
- LangGraph
- LangChain Groq
- SQLAlchemy

### Database

- PostgreSQL or MySQL supported via `DATABASE_URL`
- Demo scaffold currently uses an in-memory store for easy local evaluation and can be swapped to SQLAlchemy persistence with the included model layer

## 3. Log Interaction Screen Design

The screen mirrors the field workflow shown in the brief:

- HCP name selector
- interaction type
- date and time
- attendees
- topics discussed
- materials shared
- samples distributed
- observed/inferred sentiment
- outcomes
- follow-up actions
- AI suggested follow-ups
- right-side AI assistant panel for conversational capture

### UX Intent for Field Reps

- Keep the left side familiar and form-driven for CRM confidence
- Keep the right side conversational so the rep can say what happened naturally
- Let AI prefill fields to reduce after-call admin burden
- Preserve compliant capture of promotional materials, samples, and sentiment

## 4. LangGraph Agent Role In HCP Interaction Management

The LangGraph agent is the orchestration brain for HCP interaction capture. Its role is to:

- accept rep free-text notes from chat
- enrich the note with HCP directory context
- run compliance-aware checks before save
- summarize the note into a CRM-friendly interaction summary
- generate draft updates for the structured form
- support post-save editing

### LangGraph Flow

Current graph:

1. `tooling`
   Runs agent tools against the rep note and current form draft.
2. `respond`
   Produces a user-facing assistant response and draft updates.

This pattern is intentionally simple for Task 1, but it is ready to expand into a richer multi-step graph with:

- medical/legal review branch
- sample accountability branch
- next-best-action planning branch
- CRM write-back confirmation branch

## 5. LangGraph Tools For Sales Activities

The HCP interaction agent uses the following tools:

### 1. `log_interaction`

Purpose:
- Save a structured HCP interaction after AI-assisted extraction and summarization.

How it works:
- accepts structured payload
- validates the data against the interaction schema
- creates a concise summary
- writes the record to the interaction store
- returns the saved interaction id and key metadata

Sales value:
- reduces manual CRM entry effort
- ensures standardization for reporting and call planning

### 2. `edit_interaction`

Purpose:
- Modify a previously logged interaction without re-entering the entire note.

How it works:
- takes `interaction_id`, `field_name`, and `new_value`
- applies a targeted update
- returns the updated record for audit-friendly review

Sales value:
- lets reps quickly correct attendee names, sentiment, materials, or follow-up actions after submission

### 3. `search_hcp_profile`

Purpose:
- Retrieve HCP profile context such as specialty, territory, and preferred engagement channel.

Sales value:
- helps tailor next-best action guidance to the physician profile

### 4. `recommend_next_best_action`

Purpose:
- Suggest the best follow-up action based on specialty, sentiment, and open questions.

Sales value:
- supports field effectiveness and more meaningful scientific follow-up

### 5. `check_content_compliance`

Purpose:
- Flag risky wording or potentially unapproved material references before final save.

Sales value:
- helps reduce compliance risk in promotional interaction capture

### 6. `summarize_interaction_notes`

Purpose:
- Convert unstructured rep notes into a CRM-ready summary.

Sales value:
- shortens admin time and improves data quality

## 6. API Design

### Key Endpoints

- `GET /health`
- `GET /api/hcps`
- `POST /api/interactions`
- `PUT /api/interactions/{interaction_id}`
- `POST /api/agent/chat`

### Example Chat Request

```json
{
  "message": "Met Dr. Rahul Sharma to discuss Product X efficacy, neutral sentiment, shared brochure and agreed to a follow-up next week.",
  "draft": {
    "hcpName": "",
    "interactionType": "Meeting",
    "interactionDate": "2026-04-17",
    "interactionTime": "10:30",
    "attendees": "",
    "topicsDiscussed": "",
    "materialsShared": [],
    "samplesDistributed": [],
    "sentiment": "Neutral",
    "outcomes": "",
    "followUpActions": "",
    "aiSuggestedFollowUps": [],
    "channel": "In-person",
    "summary": ""
  }
}
```

## 7. Project Structure

```text
.
├── README.md
├── frontend
│   ├── package.json
│   ├── index.html
│   └── src
│       ├── app
│       ├── components
│       ├── features
│       └── styles
└── backend
    ├── requirements.txt
    ├── .env.example
    └── app
        ├── agents
        ├── api
        ├── core
        ├── db
        ├── schemas
        └── services
```

## 8. Local Setup

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload --port 8000
```

Set these important values in `backend/.env`:

- `GROQ_API_KEY=your_new_groq_token`
- `GROQ_MODEL=gemma2-9b-it`
- `GROQ_REASONING_MODEL=llama-3.3-70b-versatile`
- `DATABASE_URL=postgresql+psycopg://...` or a MySQL URL

## 9. Suggested Next Enhancements

- replace the in-memory store with production SQLAlchemy session-backed persistence
- add auth and role-based access for reps, managers, and medical users
- add consent-aware voice note upload and transcription
- add sample inventory reconciliation and signature capture
- add MLR content approval lookup before materials can be logged
- add territory planning and omnichannel interaction timelines

## 10. GitHub Submission Note

For final submission, push this full repository to a single GitHub repo and submit that GitHub URL. A suggested repo name is:

`ai-first-crm-hcp-module`
