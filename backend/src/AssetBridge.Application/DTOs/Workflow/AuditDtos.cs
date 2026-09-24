using AssetBridge.Domain.Enums;

namespace AssetBridge.Application.DTOs.Workflow;

public class AuditEventDto
{
    public Guid Id { get; set; }
    public Guid? WorkflowInstanceId { get; set; }
    public Guid? UserId { get; set; }
    public string? UserName { get; set; }
    public AuditEventType EventType { get; set; }
    public string EventTypeName { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string? MetadataJson { get; set; }
    public string CorrelationId { get; set; } = string.Empty;
    public DateTime CreatedAtUtc { get; set; }
}

public class CreateAuditEventDto
{
    public Guid? WorkflowInstanceId { get; set; }
    public AuditEventType EventType { get; set; }
    public string Description { get; set; } = string.Empty;
    public string? MetadataJson { get; set; }
    public string? CorrelationId { get; set; }
}

public class AuditFilterParametersDto
{
    public Guid? WorkflowInstanceId { get; set; }
    public Guid? UserId { get; set; }
    public AuditEventType? EventType { get; set; }
    public DateTime? FromDateUtc { get; set; }
    public DateTime? ToDateUtc { get; set; }
    public int PageNumber { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}
