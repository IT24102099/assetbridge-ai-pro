# ADR 0004: Asset and Incident Management Architecture & Property Continuity

## Status
Accepted

## Context
AssetBridge AI requires a robust domain model for remote real estate management in Sri Lanka. Overseas property owners must be able to register properties, report maintenance issues, upload photographic/document evidence, and review an immutable chronological timeline of what has happened to their asset.

## Decision
1. **Server-Side Ownership Isolation:** Authenticated user IDs (`ICurrentUserService`) are extracted directly from verified JWT claims. Owners cannot view, update, or report incidents for assets they do not own. Managers and Admins retain cross-property visibility.
2. **Property Continuity Timeline (`AssetHistory` vs `AuditEvents`):**
   - `AssetHistory` records property-centric business milestones (`AssetCreated`, `IncidentReported`, `EvidenceAdded`, `StatusChanged`) intended for owner visibility.
   - Technical system accountability and AI execution tracking remain reserved for `AuditEvents` (Member 4).
3. **Controlled Incident Lifecycle:** Enforces a server-side state machine on status transitions (`Reported` -> `Planning` -> `ProviderSelection` -> `WorkInProgress` -> `Resolved` -> `Closed`). Terminal states (`Closed`, `Cancelled`) cannot be arbitrarily reopened without justification.
4. **Relational Constraints & Spatial Readiness:** Assets store nullable `Latitude` and `Longitude` coordinates to prepare for Member 2's Provider Intelligence distance calculation engine.

## Consequences
- **Positive:** Guarantees strong data isolation between competing or unassociated property owners.
- **Positive:** Prepares clean data models and controlled querying interfaces for future Agentic AI consumption (e.g. Incident Planning Agent).
- **Negative:** Requires state transition validation rules and audit recording hooks on every mutating service operation.
