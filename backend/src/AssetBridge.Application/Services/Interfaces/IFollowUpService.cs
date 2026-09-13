using AssetBridge.Application.Common.Models;
using AssetBridge.Application.DTOs.Workflow;

namespace AssetBridge.Application.Services.Interfaces;

public interface IFollowUpService
{
    Task<FollowUpTaskDto> CreateFollowUpTaskAsync(CreateFollowUpTaskDto dto, Guid currentUserId, string currentUserRole);
    Task<FollowUpTaskDto?> GetFollowUpTaskByIdAsync(Guid id, Guid currentUserId, string currentUserRole);
    Task<PagedResponse<FollowUpTaskDto>> GetFollowUpTasksAsync(FollowUpFilterParametersDto parameters, Guid currentUserId, string currentUserRole);
    Task<List<FollowUpTaskDto>> GetWorkflowFollowUpsAsync(Guid workflowId, Guid currentUserId, string currentUserRole);
    Task<FollowUpTaskDto> UpdateFollowUpStatusAsync(Guid id, UpdateFollowUpStatusDto dto, Guid currentUserId, string currentUserRole);
}
