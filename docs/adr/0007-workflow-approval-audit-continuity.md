# ADR 0007: Workflow Orchestration, Human-in-the-Loop Governance, Audit & Property Continuity

## Status
Accepted

## Context
AssetBridge AI connects overseas property owners with on-the-ground representatives and contractors in Sri Lanka. The platform coordinates multi-stage operations across Assets/Incidents (Member 1), Provider Matching (Member 2), and Inspections/Quotations (Member 3).

An orchestration and governance layer is essential to:
1. Prevent autonomous AI from directly executing high-impact business and financial actions without human oversight.
2. Enforce deterministic state transitions across 15 lifecycle states without allowing arbitrary state manipulation.
3. Provide non-repudiation, tamper-evident audit logging across all human, backend, and AI actions.
4. Enable long-term property continuity through post-maintenance follow-up tasks and warranty monitoring.

## Decision

1. **State Machine vs. Arbitrary Status Changes:**
   - Implemented a 15-state deterministic state machine: `CREATED`, `PLANNING`, `PROVIDER_SELECTION`, `INSPECTION_PENDING`, `QUOTATION_REVIEW`, `AI_VALIDATION`, `AWAITING_APPROVAL`, `REVISION_REQUESTED`, `APPROVED`, `REJECTED`, `EXECUTION`, `COMPLETION_REVIEW`, `COMPLETED`, `FOLLOW_UP`, `FAILED`.
   - Transitions are strictly validated server-side using an allowed transition dictionary. Client requests cannot jump states arbitrarily (e.g. `CREATED` $\rightarrow$ `APPROVED` is rejected with HTTP 400).
   - Each state transition completes the current `WorkflowStep` and starts a new one with timestamps and actor telemetry.

2. **Strict Human-in-the-Loop Approval Boundary:**
   - Principle: **AI recommends $\rightarrow$ Backend validates $\rightarrow$ Human approves $\rightarrow$ Backend executes $\rightarrow$ Audit records**.
   - High-impact business actions (accepting quotes, authorizing execution, allocating owner funds) strictly require an `ApprovalRequest` approved by authorized roles (`Manager` or `Admin`).
   - Unauthorized roles (`Owner`, `ServiceProvider`, `Representative`) attempting manager approvals are rejected with HTTP 403 Forbidden.
   - User identity and role are strictly extracted from validated JWT claims via `ICurrentUserService`.

3. **Append-Only Audit Logging (`AuditEvent`):**
   - All critical workflow state changes, approval decisions, AI plans, and security checks create immutable `AuditEvent` records.
   - Normal users cannot alter or delete audit history, guaranteeing non-repudiation.

4. **Agentic AI Telemetry Persistence (`AgentRun` & `ToolExecution`):**
   - Created data models to capture future AI Agent reasoning cycles, input summaries, output plans, duration, retry counts, and allowlisted tool calls.
   - Sensitive credentials and API keys are explicitly omitted from logs.

5. **Property Continuity (`FollowUpTask`):**
   - Connects completed maintenance back to long-term asset health (e.g. 30-day post-repair pressure checks, preventive roof inspections before monsoon season).
   - Links directly to `Asset` and `WorkflowInstance`.

## Consequences
- **Positive:** Guarantees safety and compliance by preventing AI hallucinations from incurring real financial liabilities.
- **Positive:** Complete observability into workflow history and agent executions.
- **Positive:** Cleanly orchestrates components from Members 1, 2, and 3 without duplicating their business logic.
