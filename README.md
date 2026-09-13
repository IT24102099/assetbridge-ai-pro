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

# Run all automated tests (Unit + Integration: 65 tests)
dotnet test backend/tests/AssetBridge.UnitTests/AssetBridge.UnitTests.csproj

# Launch API on port 5206 (or configured launchSettings profile)
dotnet run --project backend/src/AssetBridge.Api/AssetBridge.Api.csproj
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

