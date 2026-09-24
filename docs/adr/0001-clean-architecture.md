# ADR 0001: Clean Architecture Layering

## Status
Accepted

## Context
AssetBridge AI is a multi-platform system connecting React (web), Flutter (mobile), and an Agentic AI workflow orchestration engine to a shared backend. We need an architecture that prevents business logic duplication across clients and keeps controllers thin and testable.

## Decision
We adopt a 4-tier Clean Architecture pattern:
1. `AssetBridge.Domain`: Pure domain models, enums, exceptions, and business invariants (no external dependencies).
2. `AssetBridge.Application`: Use-case services, DTOs, interfaces, and business validation.
3. `AssetBridge.Infrastructure`: External concerns, PostgreSQL data access, BCrypt hashing, JWT generation, and 3rd party APIs.
4. `AssetBridge.Api`: ASP.NET Core controllers, middleware, Swagger documentation, and CORS.

## Consequences
- **Positive:** Business rules are centralized in the Application/Domain layer and tested without HTTP servers or real databases.
- **Positive:** Both React and Flutter consume identical REST API contracts without client-side rule divergence.
- **Negative:** Requires mapping between Entities and DTOs, adding slight initial boilerplate.
