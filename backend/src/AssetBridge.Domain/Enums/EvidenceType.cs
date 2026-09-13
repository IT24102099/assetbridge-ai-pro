namespace AssetBridge.Domain.Enums;

// Identifies the medium of physical damage or verification evidence attached to incidents.
// Essential for the BEFORE vs. AFTER verification workflow.
public enum EvidenceType
{
    Photo = 1,
    Video = 2,
    Document = 3,
    AudioNote = 4
}
