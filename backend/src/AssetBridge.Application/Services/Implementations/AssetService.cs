using AssetBridge.Application.Common.Interfaces;
using AssetBridge.Application.Common.Models;
using AssetBridge.Application.DTOs.Assets;
using AssetBridge.Application.Services.Interfaces;
using AssetBridge.Domain.Entities.Assets;
using AssetBridge.Domain.Enums;
using AssetBridge.Domain.Exceptions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace AssetBridge.Application.Services.Implementations;

// Implements property asset operations with strict server-side ownership isolation.
public class AssetService : IAssetService
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly IAssetHistoryService _historyService;
    private readonly ILogger<AssetService> _logger;

    public AssetService(
        IApplicationDbContext context,
        ICurrentUserService currentUserService,
        IAssetHistoryService historyService,
        ILogger<AssetService> logger)
    {
        _context = context;
        _currentUserService = currentUserService;
        _historyService = historyService;
        _logger = logger;
    }

    public async Task<AssetResponseDto> CreateAssetAsync(CreateAssetRequestDto request, CancellationToken cancellationToken = default)
    {
        var currentUserId = GetAuthenticatedUserId();

        var asset = new Asset
        {
            Id = Guid.NewGuid(),
            OwnerId = currentUserId,
            Name = request.Name.Trim(),
            PropertyType = request.PropertyType,
            AddressLine1 = request.AddressLine1.Trim(),
            AddressLine2 = request.AddressLine2?.Trim(),
            City = request.City.Trim(),
            District = request.District.Trim(),
            PostalCode = request.PostalCode?.Trim(),
            Latitude = request.Latitude,
            Longitude = request.Longitude,
            Description = request.Description?.Trim(),
            Status = AssetStatus.Active,
            CreatedAtUtc = DateTime.UtcNow
        };

        _context.Assets.Add(asset);
        await _context.SaveChangesAsync(cancellationToken);

        await _historyService.RecordEventAsync(
            asset.Id,
            AssetHistoryEventType.AssetCreated,
            "Property Registered",
            $"Asset '{asset.Name}' in {asset.City}, {asset.District} was registered.",
            currentUserId,
            cancellationToken: cancellationToken);

        _logger.LogInformation("Asset created: {AssetId} for Owner {OwnerId}", asset.Id, currentUserId);

        return await GetAssetByIdAsync(asset.Id, cancellationToken);
    }

    public async Task<AssetResponseDto> GetAssetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var asset = await _context.Assets
            .AsNoTracking()
            .Include(a => a.Owner)
            .Include(a => a.Incidents)
            .FirstOrDefaultAsync(a => a.Id == id, cancellationToken);

        if (asset == null)
        {
            throw new EntityNotFoundException(nameof(Asset), id);
        }

        // Enforce owner isolation: Owners can only view properties they own
        ValidateAssetAccess(asset);

        return MapToDto(asset);
    }

    public async Task<PagedResponse<AssetResponseDto>> GetAssetsAsync(AssetQueryParametersDto query, CancellationToken cancellationToken = default)
    {
        var dbQuery = _context.Assets
            .AsNoTracking()
            .Include(a => a.Owner)
            .Include(a => a.Incidents)
            .AsQueryable();

        // If caller is an Owner, strictly restrict data to their own properties
        if (_currentUserService.Role == UserRole.Owner)
        {
            var currentUserId = GetAuthenticatedUserId();
            dbQuery = dbQuery.Where(a => a.OwnerId == currentUserId);
        }

        // Apply search keyword filter across name, address, city, district
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.Trim().ToLower();
            dbQuery = dbQuery.Where(a =>
                a.Name.ToLower().Contains(search) ||
                a.AddressLine1.ToLower().Contains(search) ||
                a.City.ToLower().Contains(search) ||
                a.District.ToLower().Contains(search));
        }

        // Apply property type and status filters
        if (query.PropertyType.HasValue)
        {
            dbQuery = dbQuery.Where(a => a.PropertyType == query.PropertyType.Value);
        }

        if (query.Status.HasValue)
        {
            dbQuery = dbQuery.Where(a => a.Status == query.Status.Value);
        }

        if (!string.IsNullOrWhiteSpace(query.District))
        {
            dbQuery = dbQuery.Where(a => a.District.ToLower() == query.District.Trim().ToLower());
        }

        if (!string.IsNullOrWhiteSpace(query.City))
        {
            dbQuery = dbQuery.Where(a => a.City.ToLower() == query.City.Trim().ToLower());
        }

        var totalCount = await dbQuery.CountAsync(cancellationToken);

        // Apply dynamic sorting server-side
        dbQuery = (query.SortBy?.ToLower(), query.SortDescending) switch
        {
            ("name", false) => dbQuery.OrderBy(a => a.Name),
            ("name", true) => dbQuery.OrderByDescending(a => a.Name),
            ("city", false) => dbQuery.OrderBy(a => a.City),
            ("city", true) => dbQuery.OrderByDescending(a => a.City),
            ("status", false) => dbQuery.OrderBy(a => a.Status),
            ("status", true) => dbQuery.OrderByDescending(a => a.Status),
            ("createdatutc", false) => dbQuery.OrderBy(a => a.CreatedAtUtc),
            _ => dbQuery.OrderByDescending(a => a.CreatedAtUtc)
        };

        var items = await dbQuery
            .Skip((query.PageNumber - 1) * query.PageSize)
            .Take(query.PageSize)
            .ToListAsync(cancellationToken);

        var dtos = items.Select(MapToDto).ToList();

        return new PagedResponse<AssetResponseDto>(dtos, totalCount, query.PageNumber, query.PageSize);
    }

    public async Task<AssetResponseDto> UpdateAssetAsync(Guid id, UpdateAssetRequestDto request, CancellationToken cancellationToken = default)
    {
        var asset = await _context.Assets
            .FirstOrDefaultAsync(a => a.Id == id, cancellationToken);

        if (asset == null)
        {
            throw new EntityNotFoundException(nameof(Asset), id);
        }

        ValidateAssetAccess(asset);

        var previousStatus = asset.Status;

        asset.Name = request.Name.Trim();
        asset.PropertyType = request.PropertyType;
        asset.AddressLine1 = request.AddressLine1.Trim();
        asset.AddressLine2 = request.AddressLine2?.Trim();
        asset.City = request.City.Trim();
        asset.District = request.District.Trim();
        asset.PostalCode = request.PostalCode?.Trim();
        asset.Latitude = request.Latitude;
        asset.Longitude = request.Longitude;
        asset.Description = request.Description?.Trim();
        asset.Status = request.Status;
        asset.UpdatedAtUtc = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        await _historyService.RecordEventAsync(
            asset.Id,
            AssetHistoryEventType.AssetUpdated,
            "Property Details Updated",
            previousStatus != asset.Status
                ? $"Status changed from {previousStatus} to {asset.Status}."
                : "Property metadata updated.",
            _currentUserService.UserId,
            cancellationToken: cancellationToken);

        _logger.LogInformation("Asset updated: {AssetId}", asset.Id);

        return await GetAssetByIdAsync(asset.Id, cancellationToken);
    }

    public async Task<bool> DeleteAssetAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var asset = await _context.Assets
            .FirstOrDefaultAsync(a => a.Id == id, cancellationToken);

        if (asset == null)
        {
            throw new EntityNotFoundException(nameof(Asset), id);
        }

        ValidateAssetAccess(asset);

        // Soft-delete: Mark as Archived to preserve digital continuity history
        asset.Status = AssetStatus.Archived;
        asset.UpdatedAtUtc = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        await _historyService.RecordEventAsync(
            asset.Id,
            AssetHistoryEventType.AssetArchived,
            "Property Archived",
            "Property was marked as archived.",
            _currentUserService.UserId,
            cancellationToken: cancellationToken);

        _logger.LogInformation("Asset archived (soft-deleted): {AssetId}", asset.Id);

        return true;
    }

    public async Task<IReadOnlyList<AssetHistoryResponseDto>> GetAssetHistoryAsync(Guid assetId, CancellationToken cancellationToken = default)
    {
        var asset = await _context.Assets
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.Id == assetId, cancellationToken);

        if (asset == null)
        {
            throw new EntityNotFoundException(nameof(Asset), assetId);
        }

        ValidateAssetAccess(asset);

        return await _historyService.GetHistoryByAssetIdAsync(assetId, cancellationToken);
    }

    private Guid GetAuthenticatedUserId()
    {
        if (!_currentUserService.IsAuthenticated || !_currentUserService.UserId.HasValue)
        {
            throw new UnauthorizedAccessException("User is not authenticated.");
        }

        return _currentUserService.UserId.Value;
    }

    private void ValidateAssetAccess(Asset asset)
    {
        if (_currentUserService.Role == UserRole.Owner)
        {
            var currentUserId = GetAuthenticatedUserId();
            if (asset.OwnerId != currentUserId)
            {
                _logger.LogWarning("Unauthorized access attempt by Owner {UserId} on Asset {AssetId} owned by {OwnerId}",
                    currentUserId, asset.Id, asset.OwnerId);
                throw new UnauthorizedAccessException("You do not have permission to access this asset.");
            }
        }
    }

    private static AssetResponseDto MapToDto(Asset asset)
    {
        return new AssetResponseDto
        {
            Id = asset.Id,
            OwnerId = asset.OwnerId,
            OwnerName = asset.Owner?.FullName ?? string.Empty,
            OwnerEmail = asset.Owner?.Email ?? string.Empty,
            Name = asset.Name,
            PropertyType = asset.PropertyType,
            AddressLine1 = asset.AddressLine1,
            AddressLine2 = asset.AddressLine2,
            City = asset.City,
            District = asset.District,
            PostalCode = asset.PostalCode,
            Latitude = asset.Latitude,
            Longitude = asset.Longitude,
            Description = asset.Description,
            Status = asset.Status,
            ActiveIncidentCount = asset.Incidents.Count(i => i.Status != IncidentStatus.Closed && i.Status != IncidentStatus.Cancelled),
            CreatedAtUtc = asset.CreatedAtUtc,
            UpdatedAtUtc = asset.UpdatedAtUtc
        };
    }
}
