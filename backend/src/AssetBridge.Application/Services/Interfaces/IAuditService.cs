using AssetBridge.Application.Common.Models;
using AssetBridge.Application.DTOs.Workflow;

namespace AssetBridge.Application.Services.Interfaces;

public interface IAuditService
{
    Task<AuditEventDto> RecordEventAsync(CreateAuditEventDto dto, Guid? currentUserId);
    Task<PagedResponse<AuditEventDto>> GetAuditEventsAsync(AuditFilterParametersDto parameters, Guid currentUserId, string currentUserRole);
    Task<List<AuditEventDto>> GetWorkflowAuditEventsAsync(Guid workflowId, Guid currentUserId, string currentUserRole);
}
