using AssetBridge.Application.Common.Models;
using AssetBridge.Application.DTOs.Incidents;

namespace AssetBridge.Application.Services.Interfaces;

// Orchestrates maintenance problem reporting, lifecycle progression, and evidence attachment.
public interface IIncidentService
{
    Task<IncidentResponseDto> CreateIncidentAsync(CreateIncidentRequestDto request, CancellationToken cancellationToken = default);
    Task<IncidentResponseDto> GetIncidentByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<PagedResponse<IncidentResponseDto>> GetIncidentsAsync(IncidentQueryParametersDto query, CancellationToken cancellationToken = default);
    Task<IncidentResponseDto> UpdateIncidentAsync(Guid id, UpdateIncidentRequestDto request, CancellationToken cancellationToken = default);
    Task<IncidentResponseDto> UpdateIncidentStatusAsync(Guid id, UpdateIncidentStatusRequestDto request, CancellationToken cancellationToken = default);
    Task<IncidentEvidenceResponseDto> AddEvidenceAsync(Guid incidentId, AddIncidentEvidenceRequestDto request, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<IncidentEvidenceResponseDto>> GetIncidentEvidenceAsync(Guid incidentId, CancellationToken cancellationToken = default);
    Task<bool> DeleteEvidenceAsync(Guid incidentId, Guid evidenceId, CancellationToken cancellationToken = default);
}
