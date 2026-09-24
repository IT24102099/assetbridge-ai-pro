# AssetBridge AI — Internal Agentic AI Service

> **Internal Architecture:** This service is strictly **internal** and invoked only by the ASP.NET Core backend (`http://localhost:5206`). Frontend clients (React/Flutter) never connect to this service directly.

---

## Architecture Principles

1. **Governance Flow:**
   $$\text{AI Recommends} \longrightarrow \text{Backend Validates} \longrightarrow \text{Human Approves} \longrightarrow \text{Backend Executes} \longrightarrow \text{Audit Records}$$
2. **Authority:** ASP.NET Core `WorkflowInstance` and `WorkflowState` are the authoritative source of truth for business states.
3. **Safety & HITL Boundary:** The AI service produces structured *proposals* (e.g., `WorkflowPlan`, `ProviderMatchProposal`, `MaintenanceRecommendation`, `ApprovalProposal`). High-impact financial or vendor commitments strictly produce an `AWAITING_APPROVAL` gate for human Manager/Admin review.
4. **Controlled Tools:** All tools are explicitly allow-listed and validate inputs/outputs with Pydantic schemas. Unrestricted shell, SQL, or web access is strictly forbidden.
5. **Lightweight & Modular:** Uses FastAPI + Pydantic v2 without heavy/fragile framework wrappers like LangChain/LangGraph.

---

## Specialized Agents

| Agent Name | Specialization / Domain | Key Allowed Tools | Primary Output Schema |
| :--- | :--- | :--- | :--- |
| **`IncidentPlanningAgent`** | Incident diagnosis & workflow planning (Member 1) | `GetAsset`, `GetIncident`, `GetAssetHistory`, `GetIncidentEvidence`, `CreateWorkflowPlan` | `WorkflowPlan` |
| **`ProviderIntelligenceAgent`** | Geospatial & skill-based contractor matching (Member 2) | `FindProviders`, `GetProviderDetails`, `GetProviderHistory`, `CheckAvailability`, `CalculateDistance`, `FindRepresentative` | `ProviderMatchProposal` |
| **`CostRecommendationAgent`** | Quotation comparison & line-item audit (Member 3) | `GetInspection`, `GetMaintenanceHistory`, `GetQuotations`, `CompareQuotations`, `CheckBudget`, `CalculateTotalCost`, `GetWarrantyInformation` | `MaintenanceRecommendation` |
| **`ValidationContinuityAgent`** | End-to-end validation, approval gating & continuity (Member 4) | `GetWorkflowState`, `ValidateProposal`, `CreateApprovalRequest`, `GetApprovalStatus`, `CreateFollowUpTask`, `CreateAuditSummary` | `ApprovalProposal` |

---

## Local Setup & Quickstart

### Prerequisites
* Python 3.10+ (Tested on Python 3.14)
* `pip`

### 1. Install Dependencies
```bash
cd ai-service
pip install -r requirements.txt
```

### 2. Run Automated Test Suite
```bash
cd ai-service
python -m pytest tests/ -v
```

### 3. Start Development Server
```bash
cd ai-service
python -m uvicorn app.main:app --host 127.0.0.1 --port 5001 --reload
```

Interactive OpenAPI documentation available at: `http://127.0.0.1:5001/docs`.

---

## Internal API Endpoints

* `GET /api/v1/health` — Service readiness probe
* `GET /api/v1/agents` — List capabilities and metadata of all 4 registered agents
* `POST /api/v1/agents/{agent_name}/run` — Execute an agent turn
* `POST /api/v1/validate-plan` — Run deterministic business validation on a `WorkflowPlan`
