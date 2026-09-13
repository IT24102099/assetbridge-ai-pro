using AssetBridge.Application.Common.Models;
using AssetBridge.Application.DTOs.Maintenance;

namespace AssetBridge.Application.Services.Interfaces;

public interface IMaintenanceJobService
{
    Task<MaintenanceJobResponseDto> CreateJobAsync(CreateMaintenanceJobRequestDto request, CancellationToken cancellationToken = default);
    Task<MaintenanceJobResponseDto> GetJobByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<PagedResponse<MaintenanceJobResponseDto>> GetJobsAsync(MaintenanceJobQueryParametersDto query, CancellationToken cancellationToken = default);
    Task<MaintenanceJobResponseDto> UpdateJobAsync(Guid id, UpdateMaintenanceJobRequestDto request, CancellationToken cancellationToken = default);
    Task<MaintenanceJobResponseDto> UpdateJobStatusAsync(Guid id, UpdateMaintenanceJobStatusRequestDto request, CancellationToken cancellationToken = default);
}

public interface IQuotationService
{
    Task<QuotationResponseDto> CreateQuotationAsync(CreateQuotationRequestDto request, CancellationToken cancellationToken = default);
    Task<QuotationResponseDto> GetQuotationByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<PagedResponse<QuotationResponseDto>> GetQuotationsAsync(QuotationQueryParametersDto query, CancellationToken cancellationToken = default);
    Task<QuotationResponseDto> UpdateQuotationAsync(Guid id, UpdateQuotationRequestDto request, CancellationToken cancellationToken = default);
    Task<QuotationResponseDto> UpdateQuotationStatusAsync(Guid id, UpdateQuotationStatusRequestDto request, CancellationToken cancellationToken = default);
    Task<QuotationItemResponseDto> AddItemAsync(Guid quotationId, CreateQuotationItemRequestDto request, CancellationToken cancellationToken = default);
    Task<QuotationItemResponseDto> UpdateItemAsync(Guid quotationId, Guid itemId, UpdateQuotationItemRequestDto request, CancellationToken cancellationToken = default);
    Task<bool> RemoveItemAsync(Guid quotationId, Guid itemId, CancellationToken cancellationToken = default);
}

public interface IBudgetValidationService
{
    Task<BudgetCheckResultDto> ValidateBudgetAsync(BudgetCheckRequestDto request, CancellationToken cancellationToken = default);
}

public interface IQuotationComparisonService
{
    Task<QuotationComparisonResultDto> CompareQuotationsAsync(QuotationComparisonRequestDto request, CancellationToken cancellationToken = default);
}

public interface IMaintenanceHistoryService
{
    Task<IReadOnlyList<MaintenanceHistoryResponseDto>> GetHistoryByAssetIdAsync(Guid assetId, CancellationToken cancellationToken = default);
    Task<MaintenanceHistoryResponseDto> RecordHistoryAsync(RecordMaintenanceHistoryRequestDto request, CancellationToken cancellationToken = default);
}
