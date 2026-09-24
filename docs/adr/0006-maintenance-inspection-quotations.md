# ADR 0006: Maintenance, Inspection & Quotation Architecture

## Status
Accepted

## Context
In AssetBridge AI, overseas property owners need transparency and control over physical maintenance carried out on their Sri Lankan residential properties. When an incident occurs, the lifecycle moves from contractor selection (Member 2) to on-site technical inspection, structured quotation breakdown, budget validation, and job execution (Member 3).

## Decision

1. **Separation of Inspection from Incident:**
   - An `Incident` represents the reported problem.
   - An `Inspection` represents the on-site physical evaluation conducted by a contractor or inspector, with discrete `InspectionFinding` entries (observations, severity, and recommendations).
   - This prevents incident models from becoming bloated and supports multi-step diagnostics.

2. **Structured Quotation Line Items & Server-Side Monetary Integrity:**
   - Quotations contain structured `QuotationItem` rows (`Quantity`, `UnitPrice`, `TotalPrice`).
   - The server strictly calculates `Subtotal = sum(Quantity * UnitPrice)` and `TotalAmount = Subtotal + TaxAndOtherCharges`. Client-submitted totals are never trusted directly.
   - Monetary values use `decimal(18,2)` precision at both the entity and PostgreSQL column level, eliminating IEEE 754 floating-point rounding errors.

3. **Deterministic Budget Validation & Quotation Comparison:**
   - Budget validation compares quotation amounts against `Incident.EstimatedBudget` without AI guesswork.
   - The comparison service evaluates quotations across cost, budget fit, contractor ratings, contractor verification status, and quotation validity, returning deterministic numerical scores and structured text explanations (e.g., *"Within owner's budget"*, *"Lowest quotation amount"*).

4. **Maintenance Job Lifecycle & History Separation:**
   - `MaintenanceJob` models the physical execution of work (`Planned` -> `Scheduled` -> `InProgress` -> `Completed` -> `Closed`), capturing `ApprovedBudget` and `ActualCost`.
   - `MaintenanceHistory` records property-level maintenance milestones and cost history.
   - Technical audit trails and AI traceability remain cleanly isolated in Member 4's future `AuditEvents`.

5. **Agentic AI & RAG Foundation (Agent 3 Preparation):**
   - The services (`IInspectionService`, `IQuotationService`, `IBudgetValidationService`, `IQuotationComparisonService`, `IMaintenanceHistoryService`) provide the exact deterministic tool interfaces that the future **Maintenance & Cost Recommendation Agent (Agent 3)** will invoke to generate explainable recommendations.

## Consequences
- **Positive:** Financial calculations are guaranteed mathematically correct and auditable.
- **Positive:** Transparent quotation comparisons enable overseas owners to make informed decisions without fear of contractor price inflation.
- **Positive:** Cleanly prepares deterministic tool endpoints for Agent 3.
