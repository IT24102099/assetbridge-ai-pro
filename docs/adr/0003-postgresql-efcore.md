# ADR 0003: PostgreSQL and Entity Framework Core as Single Source of Truth

## Status
Accepted

## Context
AssetBridge AI handles property assets, maintenance incidents, competitive contractor quotations, workflow state machines, and immutable audit trails. These components require strong relational integrity, foreign key constraints, and transactional consistency.

## Decision
We select **PostgreSQL 15+** paired with **Entity Framework Core 8** using a Code-First workflow and Fluent API entity mapping.

## Consequences
- **Positive:** ACID guarantees ensure financial quotes, approval states, and audit logs are never partially committed.
- **Positive:** EF Core migrations provide automated, version-controlled schema evolution across local, test, and production environments.
- **Positive:** Repositories are kept direct and purposeful via `IApplicationDbContext` rather than introducing bloated generic repository wrappers.
