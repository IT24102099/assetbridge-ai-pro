# AssetBridge AI

> **Tagline:** *Your Assets. Always Closer.*  
> **Purpose:** AssetBridge AI helps overseas property owners remotely manage residential property maintenance in Sri Lanka through an integrated multi-agent system connecting Owners, Local Representatives, Service Providers, Managers/Admins, and 4 specialized AI Agents.

---

## Team Structure & Vertical Ownership

| Member | Student ID | GitHub | Business Ownership | Git Branch |
| :--- | :--- | :--- | :--- | :--- |
| **Moosika Ramanathan** | IT24102839 | IT24102839 | Asset & Incident Management | `feature/IT24102839-assets-incidents` |
| **Kamsiga Ganesan** | IT24101365 | IT24101365 | Representative & Provider Coordination | `feature/IT24101365-providers` |
| **Jathurshan** | IT24100079 | — | Maintenance, Inspection & Quotations | `feature/IT24100079-maintenance` |
| **Mathuppriya Naguleswaran** | IT24102099 | IT24102099 | Workflow, Approval, Audit & Continuity | `feature/IT24102099-workflow-approval` |

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

## Quick Start (Backend)

```bash
# Build the complete solution
dotnet build backend/AssetBridge.sln

# Run unit and integration tests
dotnet test backend/tests/AssetBridge.UnitTests/AssetBridge.UnitTests.csproj

# Launch API
dotnet run --project backend/src/AssetBridge.Api/AssetBridge.Api.csproj
```

Explore interactive OpenAPI documentation at `http://localhost:5000/`.
