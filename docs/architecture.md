# AssetBridge AI — System Architecture & Developer Guide

**Tagline:** *Your Assets. Always Closer.*  
**Purpose:** Enable overseas property owners to remotely manage residential property maintenance in Sri Lanka via an integrated system connecting Owners, Local Representatives, Service Providers, Managers/Admins, and 4 specialized AI Agents.

---

## 1. Clean Architecture Overview

AssetBridge AI follows a 4-tier Clean Architecture pattern:

```
┌───────────────────────────────────────────────────────────┐
│                    Presentation Layer                     │
│    • React Admin Portal (Managers / Admins)               │
│    • Flutter Mobile App (Owners / Reps / Providers)       │
│    • AssetBridge.Api (ASP.NET Core 8 Web API)             │
└─────────────────────────────┬─────────────────────────────┘
                              │
┌─────────────────────────────▼─────────────────────────────┐
│                    Application Layer                      │
│    • AssetBridge.Application                              │
│    • Business Services (Auth, Incidents, Providers, etc.) │
│    • DTOs, Validators, Application Interfaces             │
└─────────────────────────────┬─────────────────────────────┘
                              │
┌─────────────────────────────▼─────────────────────────────┐
│                   Domain / Core Layer                     │
│    • AssetBridge.Domain                                   │
│    • Entities (User, Asset, Incident, Quotation, etc.)    │
│    • Enums (UserRole, WorkflowStatus, etc.)               │
│    • Domain Exceptions & Business Invariants              │
└─────────────────────────────▲─────────────────────────────┘
                              │
┌─────────────────────────────┴─────────────────────────────┐
│                   Infrastructure Layer                    │
│    • AssetBridge.Infrastructure                           │
│    • PostgreSQL Data Access via EF Core 8                 │
│    • BCrypt Password Hashing & JWT Token Generation       │
│    • External AI Tool Integrations & Third-Party APIs     │
└───────────────────────────────────────────────────────────┘
```

### Dependency Flow Rule
* `Domain` has **zero external project dependencies**.
* `Application` depends **only on Domain**.
* `Infrastructure` implements interfaces defined in `Application` and `Domain`.
* `Api` references `Application` and `Infrastructure`, configuring Dependency Injection and serving HTTP endpoints.

---

## 2. Authentication & Authorization Foundation

1. **Password Hashing:** Passwords are salted and hashed using **BCrypt** with 12 rounds of adaptive hashing.
2. **Stateless JWT Tokens:** Contains standardized claims (`Sub`, `Email`, `Name`, `Role`, `Jti`) signed with HMAC-SHA256.
3. **Role-Based Authorization:** Supports 5 first-class system roles:
   * `Owner` (1)
   * `Representative` (2)
   * `ServiceProvider` (3)
   * `Manager` (4)
   * `Admin` (5)
4. **Current User Context:** `ICurrentUserService` extracts user claims directly from the ambient HTTP request context without polluting method signatures.

---

## 3. Database Design (PostgreSQL + EF Core)

* **Database Engine:** PostgreSQL 15+
* **ORM:** Entity Framework Core 8
* **Mapping:** Fluent API (`IEntityTypeConfiguration<T>`) kept in `Infrastructure/Persistence/Configurations/`.
* **Auditing:** `BaseEntity` automatically manages `CreatedAtUtc` and `UpdatedAtUtc` on `SaveChangesAsync`.
* **Migrations:** Managed through EF Core code-first tooling (`dotnet tool run dotnet-ef`).

---

## 4. Domain Models & Relational Architecture (Member 1)

```
┌──────────────┐       1 : N       ┌──────────────┐       1 : N       ┌──────────────────┐
│     User     ├──────────────────►│    Asset     ├──────────────────►│     Incident     │
│   (Owner)    │                   │  (Property)  │                   │(Problem Report)  │
└──────────────┘                   └──────┬───────┘                   └────────┬─────────┘
                                          │                                    │
                                          │ 1 : N                              │ 1 : N
                                          ▼                                    ▼
                                   ┌──────────────┐                   ┌──────────────────┐
                                   │ AssetHistory │                   │ IncidentEvidence │
                                   │  (Timeline)  │                   │  (Photos / Docs) │
                                   └──────────────┘                   └──────────────────┘
```

### Relational Schema Rules
1. **Asset:** Belongs to an `Owner` (`User`). Relational cascade on delete is restricted (`OnDelete(DeleteBehavior.Restrict)`) to preserve referential integrity.
2. **Incident:** Foreign key to `Asset` (`OnDelete(DeleteBehavior.Cascade)`). Stores `Category`, `Priority`, `Status`, `EstimatedBudget` (`decimal(18,2)` in LKR), and `RequiredByUtc`.
3. **IncidentEvidence:** Attached to an `Incident`. Stores file URL, file name, MIME type, size in bytes, `EvidenceType` (`Photo`, `Video`, `Document`, `AudioNote`), and optional caption.
4. **AssetHistory:** Property continuity timeline recording `AssetCreated`, `AssetUpdated`, `IncidentReported`, `IncidentStatusChanged`, `EvidenceAdded`, and `AssetArchived`.

---

## 6. Domain Models & Relational Architecture (Member 2 — IT24101365)

```
┌──────────────┐       1 : 1       ┌──────────────────┐
│     User     ├──────────────────►│  Representative  │
│(Identity Acc)│                   │(Local Coordinator│
└──────┬───────┘                   └──────────────────┘
       │
       │ 1 : 1
       ▼
┌──────────────┐       1 : N       ┌──────────────────┐
│ServiceProvider├─────────────────►│  ProviderSkill   │
│ (Contractor) │                   │(Category & Trade)│
└──────┬───────┘                   └──────────────────┘
       │
       │ 1 : N                     ┌──────────────────────┐
       ├──────────────────────────►│ ProviderAvailability │
       │                           │  (Working Slots)     │
       │                           └──────────────────────┘
       │ 1 : N                     ┌──────────────────┐
       └──────────────────────────►│ ProviderHistory  │
                                   │ (Job & Feedback) │
                                   └──────────────────┘
```

### Member 2 Relational Schema Rules
1. **Representative:** Links 1:1 with `User` (`OnDelete(DeleteBehavior.Restrict)`). Stores operating district, city, optional GPS coordinates, national ID, and `VerificationStatus` (`Pending`, `Verified`, `Rejected`, `Suspended`).
2. **ServiceProvider:** Links 1:1 with `User`. Stores operating district, city, GPS base coordinates (`BaseLatitude`, `BaseLongitude`), maximum `ServiceRadiusKm`, `VerificationStatus`, and aggregated `Rating` (1.0 to 5.0) and `CompletedJobsCount`.
3. **ProviderSkill:** Relates to `ServiceProvider` (`OnDelete(DeleteBehavior.Cascade)`). Stores structured `Category` (`IncidentCategory`), `SkillName`, `YearsOfExperience`, license number, and primary trade indicator (`IsPrimary`).
4. **ProviderAvailability:** Relates to `ServiceProvider` (`OnDelete(DeleteBehavior.Cascade)`). Stores available dates, start/end time spans, and `AvailabilityStatus` (`Available`, `Busy`, `Unavailable`).
5. **ProviderHistory:** Relates to `ServiceProvider` (`OnDelete(DeleteBehavior.Cascade)`). Tracks historical job milestones, customer ratings, and associated incidents.
6. **Deterministic Provider Matching Engine:** Evaluates candidate contractors across 4 dimensions: Skill (35 pts), Availability (25 pts), Proximity (25 pts via Haversine distance), and Track Record (15 pts), returning rich factual explanations for the future Provider Intelligence Agent.

---

## 7. Domain Models & Relational Architecture (Member 3 — IT24100079)

```
┌──────────────────┐       1 : N       ┌──────────────────┐       1 : N       ┌───────────────────┐
│     Incident     ├──────────────────►│    Inspection    ├──────────────────►│ InspectionFinding │
│(Problem Report)  │                   │(Site Assessment) │                   │(Defects & Actions)│
└────────┬─────────┘                   └──────────────────┘                   └───────────────────┘
         │
         │ 1 : N                       ┌──────────────────┐
         ├────────────────────────────►│  MaintenanceJob  │
         │                             │ (Execution Work) │
         │                             └──────────────────┘
         │ 1 : N                       ┌──────────────────┐       1 : N       ┌───────────────────┐
         └────────────────────────────►│    Quotation     ├──────────────────►│   QuotationItem   │
                                       │ (Cost Proposal)  │                   │ (Line Item Costs) │
                                       └──────────────────┘                   └───────────────────┘
```

### Member 3 Relational Schema Rules
1. **Inspection & InspectionFinding:** An on-site evaluation of an incident conducted by a verified `ServiceProvider`. Contains structured findings with severity classifications (`Low`, `Medium`, `High`, `Critical`), technical recommendations, and optional evidence links.
2. **MaintenanceJob:** Represents planned or executed repair work linked to an `Incident`, assigned `ServiceProvider`, and optional `Inspection`. Tracks `ApprovedBudget`, `ActualCost`, and lifecycle status (`Planned` -> `Scheduled` -> `InProgress` -> `Completed` -> `Closed`).
3. **Quotation & QuotationItem:** Contractor cost estimates. Subtotals and total amounts are computed strictly server-side using `decimal(18,2)` precision.
4. **BudgetValidationService & QuotationComparisonService:** Deterministically verifies quotation totals against `Incident.EstimatedBudget` and provides multi-factor candidate ranking with structured factual reasons for the future **Maintenance & Cost Recommendation Agent (Agent 3)**.
5. **MaintenanceHistory:** Property-centric business history recording maintenance milestones and financial expenditures.

---

## 8. Member 4: Workflow Orchestration, Approval, Audit & Continuity

```
                                  WORKFLOW & GOVERNANCE ARCHITECTURE
                                  
  Incident ────────▶ WorkflowInstance ───────▶ WorkflowStep (History Trace)
                           │
                           ├─────────────────▶ ApprovalRequest (Human Manager Decision)
                           │
                           ├─────────────────▶ AgentRun ────────▶ ToolExecution (AI Observability)
                           │
                           ├─────────────────▶ AuditEvent (Append-only Non-repudiation)
                           │
                           └─────────────────▶ FollowUpTask (Property Continuity & Warranty)
```

### Core Architecture Principles
1. **Deterministic Workflow State Machine:**
   Enforces strict, legal transitions across 15 states:
   `CREATED` $\rightarrow$ `PLANNING` $\rightarrow$ `PROVIDER_SELECTION` $\rightarrow$ `INSPECTION_PENDING` $\rightarrow$ `QUOTATION_REVIEW` $\rightarrow$ `AI_VALIDATION` $\rightarrow$ `AWAITING_APPROVAL` $\rightarrow$ `APPROVED` / `REJECTED` / `REVISION_REQUESTED` $\rightarrow$ `EXECUTION` $\rightarrow$ `COMPLETION_REVIEW` $\rightarrow$ `COMPLETED` $\rightarrow$ `FOLLOW_UP` / `FAILED`.
   Arbitrary state transitions are strictly blocked with validation exceptions.

2. **Human-in-the-Loop Approval Governance:**
   * **AI recommends $\rightarrow$ Backend validates $\rightarrow$ Human approves $\rightarrow$ Backend executes $\rightarrow$ Audit records.**
   * High-impact business actions (accepting quotes, authorizing execution, allocating funds) strictly require an `ApprovalRequest` approved by `Manager` or `Admin`.
   * Unauthorized roles (`Owner`, `ServiceProvider`, `Representative`) are strictly forbidden from approving high-impact actions (HTTP 403 Forbidden).

3. **Append-Only Audit Trail (`AuditEvent`):**
   * Records all state changes, approval decisions, AI recommendations, and security events.
   * Read-only and non-repudiable for total audit compliance.

4. **Agentic AI Telemetry Persistence (`AgentRun` & `ToolExecution`):**
   * Stores agent execution metadata, prompt inputs, output summaries, duration timings, retry counts, and individual allowlisted tool invocations without logging sensitive credentials.

5. **Property Continuity Engine (`FollowUpTask`):**
   * Ties completed maintenance back to the `Asset` for scheduled preventive checks, warranty milestones, and seasonal inspections (e.g., 30-day plumbing re-inspection, pre-monsoon roof checks).

---

## 9. Local Development Setup

### Prerequisites
* .NET 8 SDK (`dotnet --version` $\ge$ `8.0.100`)
* PostgreSQL (or Docker container)
* Node.js 18+ (for React)
* Flutter SDK (for Mobile)

### Running the Backend API
1. Copy `.env.example` to `.env` or set environment variables:
   ```bash
   ConnectionStrings__DefaultConnection="Host=localhost;Port=5432;Database=assetbridge_db;Username=postgres;Password=postgres"
   JwtSettings__Secret="YourSecureSecretKeyThatIsAtLeast32CharactersLong!"
   ```
2. Build the solution:
   ```bash
   dotnet build backend/AssetBridge.sln
   ```
3. Run the unit test suite:
   ```bash
   dotnet test backend/tests/AssetBridge.UnitTests/AssetBridge.UnitTests.csproj
   ```
4. Start the Web API:
   ```bash
   dotnet run --project backend/src/AssetBridge.Api/AssetBridge.Api.csproj
   ```
5. Open Swagger UI at: `http://localhost:5000/`.
