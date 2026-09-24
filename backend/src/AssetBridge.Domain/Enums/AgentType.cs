namespace AssetBridge.Domain.Enums;

// Identifies the 4 specialized Agentic AI agents in the AssetBridge AI platform.
public enum AgentType
{
    // Member 1: Analyzes reported incident, estimates urgency, creates structural plan
    IncidentPlanner = 1,

    // Member 2: Matches verified service providers by skills, proximity, availability, and rating
    ProviderMatcher = 2,

    // Member 3: Inspects line items, audits pricing against market rate & budget, compares quotations
    QuotationAuditor = 3,

    // Member 4: Assesses property continuity, monitors warranty, schedules preventive follow-ups
    ContinuitySentinel = 4
}
