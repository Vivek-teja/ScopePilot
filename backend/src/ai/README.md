# ScopePilot — Future AI & RAG Architecture

This directory is reserved for future AI, RAG (Retrieval-Augmented Generation), and Agentic capabilities in ScopePilot.

> [!IMPORTANT]
> The current backend foundation is designed to allow these AI components to be added seamlessly **without restructuring** any existing models, services, or routes.

---

## Planned AI Functionality

1. **Scope RAG (Retrieval-Augmented Generation)**
   - Ingest approved proposal versions and deliverables into chunked vector documents.
   - Perform semantic search against approved project scope to resolve project ambiguities.

2. **Semantic Request Comparison**
   - Compare incoming client change requests against the approved project scope deliverables (`Deliverable.scopeReference`).
   - Quantify scope divergence, identify out-of-scope tasks, and compute similarity scores.

3. **MongoDB Atlas Vector Search**
   - Store 768-dimensional (or configured) vector embeddings directly in MongoDB collections (e.g., `Chunk` / `DocumentVersion`).
   - Execute similarity vector search queries filtered by workspace and project membership server-side.

4. **Local & Cloud LLMs (Ollama / LangChain JS)**
   - Utilize server-side Ollama instances for embeddings (`nomic-embed-text`) and chat reasoning models (e.g. `llama3.2`).
   - LangChain JS orchestration for prompts, chains, tools, and multi-step agents.

5. **Change-Analysis Agent**
   - Autonomous agent that analyzes change requests, queries scope references, checks developer capacity/estimates, and drafts complete change request impact summaries for freelancer review.

---

## Planned Folder Layout

```
src/ai/
├── README.md               # AI architecture overview & guidelines
├── rag/                    # Vector retrieval, chunking, and document indexing pipelines
├── embeddings/             # Ollama / embedding model integration wrappers
├── agents/                 # LangChain agent definitions and state graphs
├── tools/                  # Deterministic tools callable by agents (e.g. fetchProposalScope, checkCapacity)
└── prompts/                # Versioned prompt templates and system instructions
```

---

## Planned Future Endpoints

- `POST /api/scope-chat` — RAG-powered Q&A on approved project scopes with exact chunk citations.
- `POST /api/change-agent` — Run the change-request analysis agent to evaluate scope divergence and draft impact estimates.

---

## Architecture Rules for AI Developers

- **AI Never Decides Directly**: Final decisions on prices, milestone approvals, and change acceptance are always deterministic code triggered by authenticated human users.
- **Layering & Isolation**: All LLM and vector search logic lives under `src/ai/` and services, never directly in controllers or route handlers.
- **Strict Authorization**: Vector retrieval queries must always include workspace/project permission filters derived from the authenticated session (`req.user`).
