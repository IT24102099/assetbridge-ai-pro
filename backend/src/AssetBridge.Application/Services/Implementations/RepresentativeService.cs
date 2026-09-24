using AssetBridge.Application.Common.Interfaces;
using AssetBridge.Application.Common.Models;
using AssetBridge.Application.DTOs.Representatives;
using AssetBridge.Application.Services.Interfaces;
using AssetBridge.Domain.Entities.Representatives;
using AssetBridge.Domain.Entities.Users;
using AssetBridge.Domain.Enums;
using AssetBridge.Domain.Exceptions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace AssetBridge.Application.Services.Implementations;

// Implements representative management operations, verification workflows, and geographic filtering.
public class RepresentativeService : IRepresentativeService
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly ILogger<RepresentativeService> _logger;

    public RepresentativeService(
        IApplicationDbContext context,
        ICurrentUserService currentUserService,
        ILogger<RepresentativeService> logger)
    {
        _context = context;
        _currentUserService = currentUserService;
        _logger = logger;
    }

    public async Task<RepresentativeResponseDto> CreateRepresentativeAsync(CreateRepresentativeRequestDto request, CancellationToken cancellationToken = default)
    {
        var currentUserId = GetAuthenticatedUserId();

        // Check if representative profile already exists for this user
        var existing = await _context.Representatives
            .FirstOrDefaultAsync(r => r.UserId == currentUserId, cancellationToken);

        if (existing != null)
        {
            throw new ValidationException(new Dictionary<string, string[]>
            {
                { "UserId", new[] { "A representative profile already exists for this user account." } }
            });
        }

        var representative = new Representative
        {
            Id = Guid.NewGuid(),
            UserId = currentUserId,
            FullName = request.FullName.Trim(),
            PhoneNumber = request.PhoneNumber.Trim(),
            Email = request.Email.Trim().ToLower(),
            District = request.District.Trim(),
            City = request.City.Trim(),
            Address = request.Address?.Trim(),
            NationalIdNumber = request.NationalIdNumber?.Trim(),
            Bio = request.Bio?.Trim(),
            VerificationStatus = VerificationStatus.Pending,
            IsActive = true,
            CreatedAtUtc = DateTime.UtcNow
        };

        _context.Representatives.Add(representative);
        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Representative profile created: {RepresentativeId} for User {UserId}", representative.Id, currentUserId);

        return await GetRepresentativeByIdAsync(representative.Id, cancellationToken);
    }

    public async Task<RepresentativeResponseDto> GetRepresentativeByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var representative = await _context.Representatives
            .AsNoTracking()
            .Include(r => r.User)
            .FirstOrDefaultAsync(r => r.Id == id, cancellationToken);

        if (representative == null)
        {
            throw new EntityNotFoundException(nameof(Representative), id);
        }

        return MapToDto(representative);
    }

    public async Task<RepresentativeResponseDto?> GetCurrentRepresentativeProfileAsync(CancellationToken cancellationToken = default)
    {
        var currentUserId = GetAuthenticatedUserId();

        var representative = await _context.Representatives
            .AsNoTracking()
            .Include(r => r.User)
            .FirstOrDefaultAsync(r => r.UserId == currentUserId, cancellationToken);

        return representative == null ? null : MapToDto(representative);
    }

    public async Task<PagedResponse<RepresentativeResponseDto>> GetRepresentativesAsync(RepresentativeQueryParametersDto query, CancellationToken cancellationToken = default)
    {
        var dbQuery = _context.Representatives
            .AsNoTracking()
            .Include(r => r.User)
            .AsQueryable();

        // If caller is a representative, they only see their own profile or verified representatives
        if (_currentUserService.Role == UserRole.Representative)
        {
            var currentUserId = GetAuthenticatedUserId();
            dbQuery = dbQuery.Where(r => r.UserId == currentUserId || r.VerificationStatus == VerificationStatus.Verified);
        }

        // Owners looking for representatives only see verified active ones by default unless specified
        if (_currentUserService.Role == UserRole.Owner)
        {
            dbQuery = dbQuery.Where(r => r.VerificationStatus == VerificationStatus.Verified && r.IsActive);
        }

        // Apply search keyword filter across name, email, city, district
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.Trim().ToLower();
            dbQuery = dbQuery.Where(r =>
                r.FullName.ToLower().Contains(search) ||
                r.Email.ToLower().Contains(search) ||
                r.City.ToLower().Contains(search) ||
                r.District.ToLower().Contains(search));
        }

        if (!string.IsNullOrWhiteSpace(query.District))
        {
            dbQuery = dbQuery.Where(r => r.District.ToLower() == query.District.Trim().ToLower());
        }

        if (!string.IsNullOrWhiteSpace(query.City))
        {
            dbQuery = dbQuery.Where(r => r.City.ToLower() == query.City.Trim().ToLower());
        }

        if (query.VerificationStatus.HasValue)
        {
            dbQuery = dbQuery.Where(r => r.VerificationStatus == query.VerificationStatus.Value);
        }

        if (query.IsActive.HasValue)
        {
            dbQuery = dbQuery.Where(r => r.IsActive == query.IsActive.Value);
        }

        var totalCount = await dbQuery.CountAsync(cancellationToken);

        dbQuery = (query.SortBy?.ToLower(), query.SortDescending) switch
        {
            ("fullname", false) => dbQuery.OrderBy(r => r.FullName),
            ("fullname", true) => dbQuery.OrderByDescending(r => r.FullName),
            ("city", false) => dbQuery.OrderBy(r => r.City),
            ("city", true) => dbQuery.OrderByDescending(r => r.City),
            ("district", false) => dbQuery.OrderBy(r => r.District),
            ("district", true) => dbQuery.OrderByDescending(r => r.District),
            ("verificationstatus", false) => dbQuery.OrderBy(r => r.VerificationStatus),
            ("verificationstatus", true) => dbQuery.OrderByDescending(r => r.VerificationStatus),
            ("createdatutc", false) => dbQuery.OrderBy(r => r.CreatedAtUtc),
            _ => dbQuery.OrderByDescending(r => r.CreatedAtUtc)
        };

        var items = await dbQuery
            .Skip((query.PageNumber - 1) * query.PageSize)
            .Take(query.PageSize)
            .Select(r => MapToDto(r))
            .ToListAsync(cancellationToken);

        return new PagedResponse<RepresentativeResponseDto>(items, totalCount, query.PageNumber, query.PageSize);
    }

    public async Task<RepresentativeResponseDto> UpdateRepresentativeAsync(Guid id, UpdateRepresentativeRequestDto request, CancellationToken cancellationToken = default)
    {
        var representative = await _context.Representatives
            .Include(r => r.User)
            .FirstOrDefaultAsync(r => r.Id == id, cancellationToken);

        if (representative == null)
        {
            throw new EntityNotFoundException(nameof(Representative), id);
        }

        ValidateRepresentativeModification(representative);

        representative.FullName = request.FullName.Trim();
        representative.PhoneNumber = request.PhoneNumber.Trim();
        representative.District = request.District.Trim();
        representative.City = request.City.Trim();
        representative.Address = request.Address?.Trim();
        representative.Bio = request.Bio?.Trim();
        representative.IsActive = request.IsActive;
        representative.UpdatedAtUtc = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);
        _logger.LogInformation("Representative {RepresentativeId} updated by User {UserId}", representative.Id, _currentUserService.UserId);

        return MapToDto(representative);
    }

    public async Task<RepresentativeResponseDto> UpdateVerificationStatusAsync(Guid id, UpdateVerificationRequestDto request, CancellationToken cancellationToken = default)
    {
        // Strict RBAC: Only Managers and Admins can approve or reject verification
        if (_currentUserService.Role != UserRole.Admin && _currentUserService.Role != UserRole.Manager)
        {
            throw new UnauthorizedAccessException("Only Managers and Administrators can update verification status.");
        }

        var representative = await _context.Representatives
            .Include(r => r.User)
            .FirstOrDefaultAsync(r => r.Id == id, cancellationToken);

        if (representative == null)
        {
            throw new EntityNotFoundException(nameof(Representative), id);
        }

        representative.VerificationStatus = request.VerificationStatus;
        representative.VerificationNotes = request.VerificationNotes?.Trim();
        representative.UpdatedAtUtc = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);
        _logger.LogInformation("Representative {RepresentativeId} verification status set to {Status} by User {UserId}",
            representative.Id, representative.VerificationStatus, _currentUserService.UserId);

        return MapToDto(representative);
    }

    public async Task<bool> DeleteRepresentativeAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var representative = await _context.Representatives
            .FirstOrDefaultAsync(r => r.Id == id, cancellationToken);

        if (representative == null)
        {
            throw new EntityNotFoundException(nameof(Representative), id);
        }

        ValidateRepresentativeModification(representative);

        _context.Representatives.Remove(representative);
        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Representative {RepresentativeId} deleted by User {UserId}", id, _currentUserService.UserId);
        return true;
    }

    private void ValidateRepresentativeModification(Representative representative)
    {
        if (_currentUserService.Role == UserRole.Admin || _currentUserService.Role == UserRole.Manager)
        {
            return;
        }

        var currentUserId = GetAuthenticatedUserId();
        if (representative.UserId != currentUserId)
        {
            throw new UnauthorizedAccessException("You do not have permission to modify this representative profile.");
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

    private static RepresentativeResponseDto MapToDto(Representative r) => new()
    {
        Id = r.Id,
        UserId = r.UserId,
        FullName = r.FullName,
        PhoneNumber = r.PhoneNumber,
        Email = r.Email,
        District = r.District,
        City = r.City,
        Address = r.Address,
        NationalIdNumber = r.NationalIdNumber,
        VerificationStatus = r.VerificationStatus,
        VerificationNotes = r.VerificationNotes,
        Bio = r.Bio,
        IsActive = r.IsActive,
        CreatedAtUtc = r.CreatedAtUtc,
        UpdatedAtUtc = r.UpdatedAtUtc
    };
}
