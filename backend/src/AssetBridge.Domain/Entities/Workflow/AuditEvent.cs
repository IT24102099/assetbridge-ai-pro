using AssetBridge.Domain.Entities.Common;
using AssetBridge.Domain.Entities.Users;
using AssetBridge.Domain.Entities.Workflow;
using AssetBridge.Domain.Enums;

namespace AssetBridge.Domain.Entities.Workflow;

// An append-only audit trail capturing key business, governance, AI validation, and security events.
// Audit records cannot be modified or deleted by regular users, providing non-repudiation.
public class AuditEvent : BaseEntity
{
    // Optional reference to the workflow instance
    public Guid? WorkflowInstanceId { get; set; }
    public WorkflowInstance? WorkflowInstance { get; set; }

    // The user or actor responsible for triggering this event (null if automated system task)
    public Guid? UserId { get; set; }
    public User? User { get; set; }

    // Type of event recorded
    public AuditEventType EventType { get; set; }

    // Human-readable description of what transpired
    public string Description { get; set; } = string.Empty;

    // Structured metadata payload in JSON format for telemetry and analytics
    public string? MetadataJson { get; set; }

    // Tracing correlation ID
    public string CorrelationId { get; set; } = string.Empty;
}
