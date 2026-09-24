using AssetBridge.Application.Common.Models;
using AssetBridge.Application.DTOs.Inspections;

namespace AssetBridge.Application.Services.Interfaces;

public interface IInspectionService
{
    Task<InspectionResponseDto> CreateInspectionAsync(CreateInspectionRequestDto request, CancellationToken cancellationToken = default);
    Task<InspectionResponseDto> GetInspectionByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<PagedResponse<InspectionResponseDto>> GetInspectionsAsync(InspectionQueryParametersDto query, CancellationToken cancellationToken = default);
    Task<InspectionResponseDto> UpdateInspectionAsync(Guid id, UpdateInspectionRequestDto request, CancellationToken cancellationToken = default);
    Task<InspectionResponseDto> UpdateInspectionStatusAsync(Guid id, UpdateInspectionStatusRequestDto request, CancellationToken cancellationToken = default);
}

public interface IInspectionFindingService
{
    Task<IReadOnlyList<InspectionFindingResponseDto>> GetFindingsByInspectionIdAsync(Guid inspectionId, CancellationToken cancellationToken = default);
    Task<InspectionFindingResponseDto> AddFindingAsync(Guid inspectionId, CreateInspectionFindingRequestDto request, CancellationToken cancellationToken = default);
    Task<InspectionFindingResponseDto> UpdateFindingAsync(Guid inspectionId, Guid findingId, UpdateInspectionFindingRequestDto request, CancellationToken cancellationToken = default);
    Task<bool> RemoveFindingAsync(Guid inspectionId, Guid findingId, CancellationToken cancellationToken = default);
}
