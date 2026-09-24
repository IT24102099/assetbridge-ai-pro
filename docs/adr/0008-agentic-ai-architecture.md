# ADR 0008: Agentic AI Architecture & Foundation Design

## Status
Accepted

## Context
AssetBridge AI coordinates complex remote property maintenance operations across multiple stakeholders (overseas Owners, local Representatives, Service Providers, and Managers). To automate planning, provider intelligence, quotation auditing, and property continuity safely, an Agentic AI subsystem is introduced.

Autonomous AI agents introduce significant operational and safety risks if allowed unconstrained database access, arbitrary tool execution, or direct authority over financial and maintenance commitments.

A clear, explainable, and secure architecture is required to:
1. Prevent the AI subsystem from bypassing ASP.NET Core business logic and security boundaries.
2. Ensure that high-impact actions strictly require Human-in-the-Loop (HITL) approval.
3. Enforce deterministic tool allowlisting and schema validation.
4. Keep the internal AI service modular, testable, and free from framework bloat.
5. Provide complete observability into agent reasoning, tool traces, and validation results.

## Decision

### 1. Internal AI Service Topology
- Established a dedicated, internal Python service in `ai-service/` (FastAPI, Pydantic v2, HTTPX).
- **Communication Flow:** React and Flutter clients NEVER call the AI service directly. All client requests flow through the ASP.NET Core Web API (`http://localhost:5206`), which acts as the authoritative security gateway and business state owner.
  ```
  React / Flutter Client
          │
          ▼
  ASP.NET Core Web API (Authoritative Security & State Machine)
          │
          ▼ (Internal HTTP / Authenticated Token)
  AI Service (ai-service/ - FastAPI)
          │
          ├── Orchestration Pipeline (Runner / Retries / Timeouts)
          ├── Specialized Agents (Incident, Provider, Cost, Continuity)
          ├── Controlled Tool Registry (Allow-listed Application Tools)
          └── RAG Knowledge Base (Property Guidelines & Warranties)
          │
          ▼ (Structured Proposals & Telemetry)
  ASP.NET Core Web API
          │
          ▼ (Persist WorkflowState, AgentRun, ToolExecution, AuditEvent)
  PostgreSQL Database
  ```

### 2. Orchestration Technology Choice
- **Decision:** Implemented a **Custom Lightweight Typed Agent Architecture** using standard Python 3.10+, FastAPI, and Pydantic v2 models.
- **Alternatives Considered:**
  - *LangChain + LangGraph + MCP:* Rejected due to excessive dependency bloat, fragile abstraction layers, rapid breaking changes, and lack of deterministic debugging for strict academic/enterprise requirements.
  - *Direct in-process .NET Semantic Kernel:* Deferred for the core AI logic to leverage the rich Python AI/NLP ecosystem, while maintaining clean separation of concerns.
- **Why It Fits AssetBridge AI:** Provides explicit typed contracts, zero magical hidden prompts, deterministic testability, bounded retries, and clean integration points for future LLM providers (e.g., OpenAI, Gemini, Anthropic, or local Ollama).

### 3. The Four Specialized Agents
Defined four distinct agents with clear single-responsibility contracts:
1. **`IncidentPlanningAgent` (Agent 1 - Member 1 Domain):** Understands residential structural issues, severity, urgency, and produces structured multi-step maintenance plans (`WorkflowPlan`).
2. **`ProviderIntelligenceAgent` (Agent 2 - Member 2 Domain):** Evaluates candidate representatives and contractors based on geospatial proximity, trade skills, availability, and historical ratings, outputting explainable matching proposals.
3. **`CostRecommendationAgent` (Agent 3 - Member 3 Domain):** Audits contractor inspection reports and quotation line-items against estimated budgets, benchmark rates, and warranty options, generating cost-effective maintenance proposals.
4. **`ValidationContinuityAgent` (Agent 4 - Member 4 Domain):** Performs deterministic validation across the entire workflow proposal, generates long-term continuity follow-up tasks (e.g. 30-day post-repair pressure checks, monsoon preventive roof inspections), and flags high-impact actions for human approval.

### 4. Controlled Tool Allow-listing & Safe Execution
- Agents interact with the system strictly through an explicit `ToolRegistry`.
- Tools must implement `BaseTool` requiring strict Pydantic `input_schema` and `output_schema`.
- **Safety Invariant:** Tools NEVER allow arbitrary SQL queries, shell execution, filesystem mutations, or unrestricted internet requests.
- Tool invocations are captured as `ToolExecution` records with input/output summaries, durations, and validation statuses.

### 5. Human-in-the-Loop Governance & Backend Authority
- Core Rule: **AI recommends $\rightarrow$ Backend validates $\rightarrow$ Human approves $\rightarrow$ Backend executes $\rightarrow$ Audit records**.
- High-impact proposals (budget approvals, contractor assignments, job completion authorizations) produce `ApprovalProposal` records with `AWAITING_APPROVAL` status.
- The AI service CANNOT change the ASP.NET Core `WorkflowState` or execute financial transactions directly. The ASP.NET Core backend enforces role permissions (`Manager` or `Admin`) before executing business operations.

### 6. Observability, Telemetry & Failure Safety
- Telemetry maps directly to backend entities: `AgentRun`, `ToolExecution`, `AuditEvent`, `ApprovalRequest`.
- Chain-of-thought (CoT) is explicitly omitted from persistent logs; only structured decision summaries, evidence references, tool traces, and rule violations are recorded.
- Every agent invocation is bounded by timeout limits, configurable retry counts with exponential backoff, and non-crashing safe failure responses.

### 7. Modular RAG Foundation
- Defined an abstract `KnowledgeRetriever` interface in `ai-service/rag/` for retrieving contextual Sri Lankan residential maintenance guidelines, safety standards, and warranty terms.
- Implemented an in-memory keyword/semantic retriever foundation that can be swapped with vector search (e.g., pgvector) without modifying agent contracts.

## Consequences
- **Positive:** Complete security isolation — AI hallucinations cannot cause financial loss or unauthorized state corruption.
- **Positive:** Genuinely distinct agent contracts with clean separation of domain concerns across all 4 team verticals.
- **Positive:** High testability with deterministic unit and integration tests covering contracts, tools, safety guards, and API routes.
- **Positive:** Ready for plug-and-play LLM backend integration in future phases.
