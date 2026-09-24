# ADR 0005: Representative & Service Provider Coordination with Deterministic Matching

## Status
Accepted

## Context
AssetBridge AI requires a robust mechanism to connect overseas property owners and reported maintenance incidents with trusted, on-the-ground local representatives and certified trade service providers in Sri Lanka (e.g., plumbers, electricians, carpenters, masons). 

Rather than building an open, uncurated consumer marketplace, AssetBridge AI is an enterprise-grade asset management platform where reliability, vetting, and explainable recommendations are critical.

## Decision

1. **Structured Skill Relationships (`ProviderSkill`):**
   - Trade skills are mapped directly to `IncidentCategory` (e.g. Plumbing, Electrical, Roof, HVAC) alongside years of experience, trade licenses, and primary trade indicators.
   - Storing structured skills rather than unconstrained free text enables strict SQL/LINQ relational matching and eliminates hallucinations.

2. **Server-Enforced Verification Gate:**
   - Both Representatives and Service Providers maintain a lifecycle state (`Pending`, `Verified`, `Rejected`, `Suspended`).
   - Matching queries strictly exclude unverified or suspended contractors (`VerificationStatus == Verified`). Unverified providers are never recommended to property owners.
   - Verification approval is restricted exclusively to authorized `Manager` and `Admin` roles.

3. **Deterministic & Explainable Matching Algorithm:**
   - Candidate ranking evaluates 4 explicit, verifiable dimensions (out of 100 points):
     1. **Skill Match (Max 35 points):** Category match, primary trade status, and years of experience.
     2. **Availability Match (Max 25 points):** Confirmed free schedule on the incident's target resolution date.
     3. **Geographic Proximity (Max 25 points):** Great-circle distance calculated via the Haversine formula relative to the provider's operating radius, with automated fallback to district/city matching if GPS coordinates are omitted.
     4. **Track Record (Max 15 points):** Historical average rating (1.0 to 5.0) and count of successfully completed maintenance jobs.
   - The engine produces factual, structured explanation reasons (e.g. *"Verified professional contractor"*, *"Located 4.2 km from property"*, *"Available on requested date"*), providing transparent evidence for both the owner and the future Provider Intelligence Agent (Agent 2).

4. **Separation of Provider History vs Audit Events:**
   - `ProviderHistory` records contractor-centric business performance milestones (job completions, inspection outcomes, ratings).
   - `AuditEvents` (Member 4) remains reserved for technical traceability, security events, and AI execution tracking.

5. **Clean Geographic Abstraction (`ILocationService`):**
   - Haversine distance calculation is isolated behind `ILocationService`. This allows future integration with external mapping/geocoding services without hardcoding API keys or breaking the application when external network calls are unavailable.

## Consequences
- **Positive:** Guarantees transparent, verifiable, and explainable contractor recommendations without relying on unpredictable LLM hallucinations.
- **Positive:** Prepares structured APIs and deterministic services ready to be wrapped as controlled tools for the Provider Intelligence Agent (Agent 2).
- **Positive:** Prevents fraudulent or unqualified contractors from being assigned to overseas properties.
