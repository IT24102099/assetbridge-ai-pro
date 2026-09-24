namespace AssetBridge.Domain.Enums;

// Defines technical domains for maintenance issues in residential properties.
// Enables the Provider Intelligence Agent (Member 2) to filter matching provider trades.
public enum IncidentCategory
{
    Plumbing = 1,
    Electrical = 2,
    Roofing = 3,
    Structural = 4,
    HVAC = 5,
    Carpentry = 6,
    PestControl = 7,
    Painting = 8,
    General = 9
}
