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
    private static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".jpg", ".jpeg", ".png", ".webp"
    };

    private static readonly HashSet<string> AllowedMimeTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "image/jpeg", "image/png", "image/webp", "image/jpg"
    };

    private const long MaxFileSizeBytes = 10 * 1024 * 1024; // 10MB

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
            .Include(a => a.Media)
                .ThenInclude(m => m.UploadedByUser)
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
            .Include(a => a.Media)
                .ThenInclude(m => m.UploadedByUser)
            .AsQueryable();

        // If caller is an Owner, strictly restrict data to their own properties
        if (_currentUserService.Role == UserRole.Owner)
        {
            var currentUserId = GetAuthenticatedUserId();
            dbQuery = dbQuery.Where(a => a.OwnerId == currentUserId);
        }

        // Apply filters
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var term = query.Search.Trim().ToLower();
            dbQuery = dbQuery.Where(a =>
                a.Name.ToLower().Contains(term) ||
                a.City.ToLower().Contains(term) ||
                a.District.ToLower().Contains(term) ||
                a.AddressLine1.ToLower().Contains(term));
        }

        if (query.PropertyType.HasValue)
        {
            dbQuery = dbQuery.Where(a => a.PropertyType == query.PropertyType.Value);
        }

        if (!string.IsNullOrWhiteSpace(query.City))
        {
            dbQuery = dbQuery.Where(a => a.City.ToLower() == query.City.Trim().ToLower());
        }

        if (!string.IsNullOrWhiteSpace(query.District))
        {
            dbQuery = dbQuery.Where(a => a.District.ToLower() == query.District.Trim().ToLower());
        }

        if (query.Status.HasValue)
        {
            dbQuery = dbQuery.Where(a => a.Status == query.Status.Value);
        }

        var totalCount = await dbQuery.CountAsync(cancellationToken);

        // Sorting
        dbQuery = query.SortBy?.ToLower() switch
        {
            "name" => query.SortDescending ? dbQuery.OrderByDescending(a => a.Name) : dbQuery.OrderBy(a => a.Name),
            "city" => query.SortDescending ? dbQuery.OrderByDescending(a => a.City) : dbQuery.OrderBy(a => a.City),
            "status" => query.SortDescending ? dbQuery.OrderByDescending(a => a.Status) : dbQuery.OrderBy(a => a.Status),
            _ => query.SortDescending ? dbQuery.OrderByDescending(a => a.CreatedAtUtc) : dbQuery.OrderBy(a => a.CreatedAtUtc)
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
            .Include(a => a.Media)
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

    public async Task<AssetMediaResponseDto> AddMediaAsync(Guid assetId, AddAssetMediaRequestDto request, CancellationToken cancellationToken = default)
    {
        var currentUserId = GetAuthenticatedUserId();

        ValidateMediaRequest(request);

        var asset = await _context.Assets
            .Include(a => a.Media)
            .FirstOrDefaultAsync(a => a.Id == assetId, cancellationToken);

        if (asset == null)
        {
            throw new EntityNotFoundException(nameof(Asset), assetId);
        }

        ValidateAssetAccess(asset);

        // Single Thumbnail Rule:
        // If this new media is designated as thumbnail, remove thumbnail flag from all other media of this asset.
        // If no media exists yet for this asset, default this first media to thumbnail = true.
        var shouldBeThumbnail = request.IsThumbnail || !asset.Media.Any();

        if (shouldBeThumbnail)
        {
            foreach (var existing in asset.Media)
            {
                existing.IsThumbnail = false;
            }
        }

        var media = new AssetMedia
        {
            Id = Guid.NewGuid(),
            AssetId = assetId,
            UploadedByUserId = currentUserId,
            FileName = request.FileName.Trim(),
            FileUrl = request.FileUrl.Trim(),
            FileType = request.FileType?.Trim() ?? "image/jpeg",
            FileSizeBytes = request.FileSizeBytes,
            IsThumbnail = shouldBeThumbnail,
            Caption = request.Caption?.Trim(),
            CreatedAtUtc = DateTime.UtcNow
        };

        _context.AssetMedia.Add(media);
        await _context.SaveChangesAsync(cancellationToken);

        await _historyService.RecordEventAsync(
            asset.Id,
            AssetHistoryEventType.AssetUpdated,
            "Property Photo Uploaded",
            $"Uploaded photo '{media.FileName}' (Thumbnail: {media.IsThumbnail}).",
            currentUserId,
            cancellationToken: cancellationToken);

        _logger.LogInformation("Added media {MediaId} to Asset {AssetId} (IsThumbnail: {IsThumbnail})",
            media.Id, assetId, media.IsThumbnail);

        var uploader = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == currentUserId, cancellationToken);

        return MapMediaToDto(media, uploader?.FullName);
    }

    public async Task<IReadOnlyList<AssetMediaResponseDto>> GetMediaAsync(Guid assetId, CancellationToken cancellationToken = default)
    {
        var asset = await _context.Assets
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.Id == assetId, cancellationToken);

        if (asset == null)
        {
            throw new EntityNotFoundException(nameof(Asset), assetId);
        }

        ValidateAssetAccess(asset);

        var mediaList = await _context.AssetMedia
            .AsNoTracking()
            .Include(m => m.UploadedByUser)
            .Where(m => m.AssetId == assetId)
            .OrderByDescending(m => m.IsThumbnail)
            .ThenByDescending(m => m.CreatedAtUtc)
            .ToListAsync(cancellationToken);

        return mediaList.Select(m => MapMediaToDto(m, m.UploadedByUser?.FullName)).ToList();
    }

    public async Task<bool> DeleteMediaAsync(Guid assetId, Guid mediaId, CancellationToken cancellationToken = default)
    {
        var currentUserId = GetAuthenticatedUserId();

        var asset = await _context.Assets
            .Include(a => a.Media)
            .FirstOrDefaultAsync(a => a.Id == assetId, cancellationToken);

        if (asset == null)
        {
            throw new EntityNotFoundException(nameof(Asset), assetId);
        }

        ValidateAssetAccess(asset);

        var media = asset.Media.FirstOrDefault(m => m.Id == mediaId);
        if (media == null)
        {
            throw new EntityNotFoundException(nameof(AssetMedia), mediaId);
        }

        var wasThumbnail = media.IsThumbnail;
        _context.AssetMedia.Remove(media);

        // If the removed media was the thumbnail, promote the most recent remaining media to thumbnail
        if (wasThumbnail)
        {
            var nextThumbnail = asset.Media
                .Where(m => m.Id != mediaId)
                .OrderByDescending(m => m.CreatedAtUtc)
                .FirstOrDefault();

            if (nextThumbnail != null)
            {
                nextThumbnail.IsThumbnail = true;
            }
        }

        await _context.SaveChangesAsync(cancellationToken);

        await _historyService.RecordEventAsync(
            asset.Id,
            AssetHistoryEventType.AssetUpdated,
            "Property Photo Removed",
            $"Removed photo '{media.FileName}'.",
            currentUserId,
            cancellationToken: cancellationToken);

        _logger.LogInformation("Deleted media {MediaId} from Asset {AssetId}", mediaId, assetId);

        return true;
    }

    public async Task<AssetMediaResponseDto> SetThumbnailAsync(Guid assetId, Guid mediaId, CancellationToken cancellationToken = default)
    {
        var currentUserId = GetAuthenticatedUserId();

        var asset = await _context.Assets
            .Include(a => a.Media)
                .ThenInclude(m => m.UploadedByUser)
            .FirstOrDefaultAsync(a => a.Id == assetId, cancellationToken);

        if (asset == null)
        {
            throw new EntityNotFoundException(nameof(Asset), assetId);
        }

        ValidateAssetAccess(asset);

        var targetMedia = asset.Media.FirstOrDefault(m => m.Id == mediaId);
        if (targetMedia == null)
        {
            throw new EntityNotFoundException(nameof(AssetMedia), mediaId);
        }

        // Single Thumbnail Rule: Strictly ensure ONLY the selected media is marked as thumbnail
        foreach (var m in asset.Media)
        {
            m.IsThumbnail = (m.Id == mediaId);
        }

        await _context.SaveChangesAsync(cancellationToken);

        await _historyService.RecordEventAsync(
            asset.Id,
            AssetHistoryEventType.AssetUpdated,
            "Thumbnail Updated",
            $"Designated '{targetMedia.FileName}' as the primary property cover thumbnail.",
            currentUserId,
            cancellationToken: cancellationToken);

        _logger.LogInformation("Designated media {MediaId} as primary thumbnail for Asset {AssetId}", mediaId, assetId);

        var uploaderName = targetMedia.UploadedByUser?.FullName;
        if (string.IsNullOrEmpty(uploaderName))
        {
            var uploader = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == targetMedia.UploadedByUserId, cancellationToken);
            uploaderName = uploader?.FullName;
        }

        return MapMediaToDto(targetMedia, uploaderName);
    }

    private static void ValidateMediaRequest(AddAssetMediaRequestDto request)
    {
        if (request.FileSizeBytes <= 0 || request.FileSizeBytes > MaxFileSizeBytes)
        {
            throw new ValidationException(nameof(request.FileSizeBytes), "Image file size must be greater than 0 and cannot exceed 10MB (10,485,760 bytes).");
        }

        var ext = Path.GetExtension(request.FileName);
        if (string.IsNullOrWhiteSpace(ext) || !AllowedExtensions.Contains(ext))
        {
            throw new ValidationException(nameof(request.FileName), $"Unsupported file extension '{ext}'. Only JPG, PNG, and WEBP formats are accepted.");
        }

        if (!string.IsNullOrWhiteSpace(request.FileType) && !AllowedMimeTypes.Contains(request.FileType))
        {
            throw new ValidationException(nameof(request.FileType), $"Unsupported file MIME type '{request.FileType}'. Only image/jpeg, image/png, and image/webp are allowed.");
        }
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
        var mediaList = (asset.Media ?? new List<AssetMedia>())
            .OrderByDescending(m => m.IsThumbnail)
            .ThenByDescending(m => m.CreatedAtUtc)
            .Select(m => MapMediaToDto(m, m.UploadedByUser?.FullName))
            .ToList();

        var thumbnailMedia = mediaList.FirstOrDefault(m => m.IsThumbnail) ?? mediaList.FirstOrDefault();

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
            ActiveIncidentCount = asset.Incidents?.Count(i => i.Status != IncidentStatus.Closed && i.Status != IncidentStatus.Cancelled) ?? 0,
            ThumbnailUrl = thumbnailMedia?.FileUrl,
            MediaCount = mediaList.Count,
            Media = mediaList,
            CreatedAtUtc = asset.CreatedAtUtc,
            UpdatedAtUtc = asset.UpdatedAtUtc
        };
    }

    private static AssetMediaResponseDto MapMediaToDto(AssetMedia media, string? uploaderName)
    {
        return new AssetMediaResponseDto
        {
            Id = media.Id,
            AssetId = media.AssetId,
            UploadedByUserId = media.UploadedByUserId,
            UploadedByUserName = uploaderName ?? string.Empty,
            FileName = media.FileName,
            FileUrl = media.FileUrl,
            FileType = media.FileType,
            FileSizeBytes = media.FileSizeBytes,
            IsThumbnail = media.IsThumbnail,
            Caption = media.Caption,
            CreatedAtUtc = media.CreatedAtUtc
        };
    }
}
