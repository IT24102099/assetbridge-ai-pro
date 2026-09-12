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

## 4. Local Development Setup

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
5. Open Swagger UI at: `http://localhost:5000` (or the configured launch port).
