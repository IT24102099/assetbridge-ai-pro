using AssetBridge.Application.Common.Models;
using AssetBridge.Application.DTOs.Representatives;

namespace AssetBridge.Application.Services.Interfaces;

// Service interface managing local representatives who assist overseas property owners.
public interface IRepresentativeService
{
    Task<RepresentativeResponseDto> CreateRepresentativeAsync(CreateRepresentativeRequestDto request, CancellationToken cancellationToken = default);
    Task<RepresentativeResponseDto> GetRepresentativeByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<RepresentativeResponseDto?> GetCurrentRepresentativeProfileAsync(CancellationToken cancellationToken = default);
    Task<PagedResponse<RepresentativeResponseDto>> GetRepresentativesAsync(RepresentativeQueryParametersDto query, CancellationToken cancellationToken = default);
    Task<RepresentativeResponseDto> UpdateRepresentativeAsync(Guid id, UpdateRepresentativeRequestDto request, CancellationToken cancellationToken = default);
    Task<RepresentativeResponseDto> UpdateVerificationStatusAsync(Guid id, UpdateVerificationRequestDto request, CancellationToken cancellationToken = default);
    Task<bool> DeleteRepresentativeAsync(Guid id, CancellationToken cancellationToken = default);

    Task<RepresentativeDocumentResponseDto> UploadVerificationDocumentAsync(Guid representativeId, Stream fileStream, string fileName, string contentType, long fileSize, string documentType, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<RepresentativeDocumentResponseDto>> GetVerificationDocumentsAsync(Guid representativeId, CancellationToken cancellationToken = default);
    Task<RepresentativeDocumentResponseDto> ReviewVerificationDocumentAsync(Guid representativeId, Guid documentId, ReviewRepresentativeDocumentRequestDto request, CancellationToken cancellationToken = default);
}
