namespace AssetBridge.Domain.Enums;

// Indicates the urgency level of a maintenance issue.
// Emergency priority triggers expedited AI planning and higher notification alert levels.
public enum IncidentPriority
{
    Low = 1,
    Medium = 2,
    High = 3,
    Emergency = 4
}
