# AssetBridge AI

> **Tagline:** *Your Assets. Always Closer.*  
> **Purpose:** AssetBridge AI helps overseas property owners remotely manage residential property maintenance in Sri Lanka through an integrated multi-agent system connecting Owners, Local Representatives, Service Providers, Managers/Admins, and 4 specialized AI Agents.

---

## Team Structure & Vertical Ownership

| Member | Student ID | Business Ownership | Git Branch |
| :--- | :--- | :--- | :--- |
| **Moosika Ramanathan** | IT24102839 | Asset & Incident Management | `feature/IT24102839-assets-incidents` |
| **Kamsiga Ganesan** | IT24101365 |  Representative & Provider Coordination | `feature/IT24101365-providers` |
| **Tharmarajah Jathurshan** | IT24100079 |  Maintenance, Inspection & Quotations | `feature/IT24100079-maintenance` |
| **Mathuppriya Naguleswaran** | IT24102099 |  Workflow, Approval, Audit & Continuity | `feature/IT24102099-workflow-approval` |

---

## Architecture & Technology Stack

* **Backend:** ASP.NET Core 8 Web API, EF Core 8, PostgreSQL, JWT Authentication, Swagger/OpenAPI
* **Business Modules:**
  * Member 1 (`IT24102839`): Asset & Incident Management, Property Continuity History
  * Member 2 (`IT24101365`): Local Representative & Service Provider Coordination, Trade Skills, Availability Scheduling, Deterministic & Explainable Provider Matching
  * Member 3 (`IT24100079`): Maintenance, Inspection & Quotations
  * Member 4 (`IT24102099`): Workflow, Approval, Audit & Continuity
* **Web Admin:** React, TypeScript, Vite, TailwindCSS
* **Mobile Client:** Flutter, Dart
* **AI Orchestration:** Multi-Agent AI (Incident Planning, Provider Intelligence, Maintenance Cost, Validation & Continuity) with Human-in-the-Loop approval

---

## Quick Start

### Backend API (.NET 8)
```bash
# Build the complete solution
dotnet build backend/AssetBridge.sln

# Run all automated tests (Unit + Integration: 65 tests)
dotnet test backend/tests/AssetBridge.UnitTests/AssetBridge.UnitTests.csproj

# Launch API on port 5206 (or configured launchSettings profile)
dotnet run --project backend/src/AssetBridge.Api/AssetBridge.Api.csproj
```

### Frontend Web (React + Vite + TypeScript)
```bash
# Option 1: Run directly from root
npm run dev

# Option 2: Run from frontend-web directory
cd frontend-web
npm install
npm run dev      # Starts Vite dev server on http://localhost:5173
npm run build    # Generates production bundle in frontend-web/dist
```

---

## Service Endpoints & Access Guide

| Service / Tool | URL | Description |
| :--- | :--- | :--- |
| **Backend API Root** | `http://localhost:5206/` | API Status, version, and discoverable entrypoints JSON |
| **Interactive Swagger UI** | `http://localhost:5206/swagger` | OpenAPI exploration with `Bearer <JWT>` Authorize support |
| **OpenAPI Specification** | `http://localhost:5206/swagger/v1/swagger.json` | OpenAPI v1 JSON document |
| **Health Check Probe** | `http://localhost:5206/health` or `/api/health` | Lightweight readiness probe for deployment & monitoring |
| **React Web Client** | `http://localhost:5173/` (Dev) | React TypeScript Web Application |
| **Flutter Mobile Client** | Android / iOS / Web | Mobile app consuming `http://localhost:5206/api/` |

---

## Authentication & Security Foundation

### 1. Architecture Flow
```
Client (React / Flutter)
   │
   ▼
[1] POST /api/auth/register
   │   ├── Validates email format & uniqueness
   │   ├── Hashes password with BCrypt (12 rounds)
   │   └── Persists user in PostgreSQL / InMemoryDb
   ▼
[2] POST /api/auth/login
   │   ├── Verifies password against stored BCrypt hash
   │   ├── Generates cryptographically signed JWT with claims (Sub, Email, Name, Role)
   │   └── Returns JWT access token + safe user profile (no secrets/hashes exposed)
   ▼
[3] Client stores token securely & sends HTTP Header:
   Authorization: Bearer <JWT>
   │
   ▼
[4] ASP.NET Core Authentication Middleware (JwtBearer)
   │   ├── Validates signature (HMAC-SHA256)
   │   ├── Validates Issuer, Audience & Lifetime expiration
   │   └── Populates HttpContext.User Principal
   ▼
[5] ASP.NET Core Role-Based Authorization
   │   ├── [Authorize] & [Authorize(Roles = "Manager,Admin")]
   │   └── ICurrentUserService extracts authenticated user ID & Role
   ▼
[6] Application Services & Protected Business Endpoints
```

### 2. Security Principles
- **No Plaintext Passwords:** Passwords are salted and hashed using BCrypt (`WorkFactor = 12`) before persistence.
- **Server-Side Enforcement:** Frontend client views are personalized, but the backend is the authoritative boundary. Unauthorized or role-mismatched requests receive HTTP `401 Unauthorized` or `403 Forbidden`.
- **Identity Isolation:** Resource operations resolve caller identity directly from the validated JWT token via `ICurrentUserService`, preventing client ID tampering.
- **Environment-Driven Configuration:** JWT secrets, Issuer, Audience, and Database connection strings are loaded via `IConfiguration` and can be overridden through standard environment variables (`JwtSettings__Secret`, etc.) for Docker deployments.

# Internal Agentic AI Service

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
