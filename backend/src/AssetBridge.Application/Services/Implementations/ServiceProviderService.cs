using AssetBridge.Application.Common.Interfaces;
using AssetBridge.Application.Common.Models;
using AssetBridge.Application.DTOs.Providers;
using AssetBridge.Application.DTOs.Representatives;
using AssetBridge.Application.Services.Interfaces;
using AssetBridge.Domain.Entities.Providers;
using AssetBridge.Domain.Entities.Users;
using AssetBridge.Domain.Enums;
using AssetBridge.Domain.Exceptions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace AssetBridge.Application.Services.Implementations;

// Implements contractor registration, directory queries, and verification management.
public class ServiceProviderService : IServiceProviderService
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly ILogger<ServiceProviderService> _logger;

    public ServiceProviderService(
        IApplicationDbContext context,
        ICurrentUserService currentUserService,
        ILogger<ServiceProviderService> logger)
    {
        _context = context;
        _currentUserService = currentUserService;
        _logger = logger;
    }

    public async Task<ServiceProviderResponseDto> CreateServiceProviderAsync(CreateServiceProviderRequestDto request, CancellationToken cancellationToken = default)
    {
        var currentUserId = GetAuthenticatedUserId();

        var existing = await _context.ServiceProviders
            .FirstOrDefaultAsync(p => p.UserId == currentUserId, cancellationToken);

        if (existing != null)
        {
            throw new ValidationException(new Dictionary<string, string[]>
            {
                { "UserId", new[] { "A service provider profile already exists for this user account." } }
            });
        }

        var provider = new ServiceProvider
        {
            Id = Guid.NewGuid(),
            UserId = currentUserId,
            BusinessName = request.BusinessName.Trim(),
            ContactPerson = request.ContactPerson.Trim(),
            PhoneNumber = request.PhoneNumber.Trim(),
            Email = request.Email.Trim().ToLower(),
            PrimaryDistrict = request.PrimaryDistrict.Trim(),
            City = request.City.Trim(),
            Address = request.Address?.Trim(),
            BaseLatitude = request.BaseLatitude,
            BaseLongitude = request.BaseLongitude,
            ServiceRadiusKm = request.ServiceRadiusKm,
            VerificationStatus = VerificationStatus.Pending,
            Rating = 5.0,
            CompletedJobsCount = 0,
            IsActive = true,
            CreatedAtUtc = DateTime.UtcNow
        };

        _context.ServiceProviders.Add(provider);
        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("ServiceProvider profile created: {ProviderId} for User {UserId}", provider.Id, currentUserId);

        return await GetServiceProviderByIdAsync(provider.Id, cancellationToken);
    }

    public async Task<ServiceProviderResponseDto> GetServiceProviderByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var provider = await _context.ServiceProviders
            .AsNoTracking()
            .Include(p => p.User)
            .Include(p => p.Skills)
            .FirstOrDefaultAsync(p => p.Id == id, cancellationToken);

        if (provider == null)
        {
            throw new EntityNotFoundException(nameof(ServiceProvider), id);
        }

        return MapToDto(provider);
    }

    public async Task<ServiceProviderResponseDto?> GetCurrentProviderProfileAsync(CancellationToken cancellationToken = default)
    {
        var currentUserId = GetAuthenticatedUserId();

        var provider = await _context.ServiceProviders
            .AsNoTracking()
            .Include(p => p.User)
            .Include(p => p.Skills)
            .FirstOrDefaultAsync(p => p.UserId == currentUserId, cancellationToken);

        return provider == null ? null : MapToDto(provider);
    }

    public async Task<PagedResponse<ServiceProviderResponseDto>> GetServiceProvidersAsync(ProviderQueryParametersDto query, CancellationToken cancellationToken = default)
    {
        var dbQuery = _context.ServiceProviders
            .AsNoTracking()
            .Include(p => p.User)
            .Include(p => p.Skills)
            .AsQueryable();

        // Owners looking for providers only see verified active ones
        if (_currentUserService.Role == UserRole.Owner)
        {
            dbQuery = dbQuery.Where(p => p.VerificationStatus == VerificationStatus.Verified && p.IsActive);
        }
        else if (_currentUserService.Role == UserRole.ServiceProvider)
        {
            var currentUserId = GetAuthenticatedUserId();
            dbQuery = dbQuery.Where(p => p.UserId == currentUserId || p.VerificationStatus == VerificationStatus.Verified);
        }

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.Trim().ToLower();
            dbQuery = dbQuery.Where(p =>
                p.BusinessName.ToLower().Contains(search) ||
                p.ContactPerson.ToLower().Contains(search) ||
                p.Email.ToLower().Contains(search) ||
                p.City.ToLower().Contains(search) ||
                p.PrimaryDistrict.ToLower().Contains(search));
        }

        if (!string.IsNullOrWhiteSpace(query.District))
        {
            dbQuery = dbQuery.Where(p => p.PrimaryDistrict.ToLower() == query.District.Trim().ToLower());
        }

        if (!string.IsNullOrWhiteSpace(query.City))
        {
            dbQuery = dbQuery.Where(p => p.City.ToLower() == query.City.Trim().ToLower());
        }

        if (query.SkillCategory.HasValue)
        {
            dbQuery = dbQuery.Where(p => p.Skills.Any(s => s.Category == query.SkillCategory.Value));
        }

        if (query.VerificationStatus.HasValue)
        {
            dbQuery = dbQuery.Where(p => p.VerificationStatus == query.VerificationStatus.Value);
        }

        if (query.IsActive.HasValue)
        {
            dbQuery = dbQuery.Where(p => p.IsActive == query.IsActive.Value);
        }

        var totalCount = await dbQuery.CountAsync(cancellationToken);

        dbQuery = (query.SortBy?.ToLower(), query.SortDescending) switch
        {
            ("businessname", false) => dbQuery.OrderBy(p => p.BusinessName),
            ("businessname", true) => dbQuery.OrderByDescending(p => p.BusinessName),
            ("rating", false) => dbQuery.OrderBy(p => p.Rating),
            ("rating", true) => dbQuery.OrderByDescending(p => p.Rating),
            ("completedjobscount", false) => dbQuery.OrderBy(p => p.CompletedJobsCount),
            ("completedjobscount", true) => dbQuery.OrderByDescending(p => p.CompletedJobsCount),
            ("city", false) => dbQuery.OrderBy(p => p.City),
            ("city", true) => dbQuery.OrderByDescending(p => p.City),
            ("district", false) => dbQuery.OrderBy(p => p.PrimaryDistrict),
            ("district", true) => dbQuery.OrderByDescending(p => p.PrimaryDistrict),
            ("createdatutc", false) => dbQuery.OrderBy(p => p.CreatedAtUtc),
            _ => dbQuery.OrderByDescending(p => p.CreatedAtUtc)
        };

        var items = await dbQuery
            .Skip((query.PageNumber - 1) * query.PageSize)
            .Take(query.PageSize)
            .Select(p => MapToDto(p))
            .ToListAsync(cancellationToken);

        return new PagedResponse<ServiceProviderResponseDto>(items, totalCount, query.PageNumber, query.PageSize);
    }

    public async Task<ServiceProviderResponseDto> UpdateServiceProviderAsync(Guid id, UpdateServiceProviderRequestDto request, CancellationToken cancellationToken = default)
    {
        var provider = await _context.ServiceProviders
            .Include(p => p.User)
            .Include(p => p.Skills)
            .FirstOrDefaultAsync(p => p.Id == id, cancellationToken);

        if (provider == null)
        {
            throw new EntityNotFoundException(nameof(ServiceProvider), id);
        }

        ValidateProviderModification(provider);

        provider.BusinessName = request.BusinessName.Trim();
        provider.ContactPerson = request.ContactPerson.Trim();
        provider.PhoneNumber = request.PhoneNumber.Trim();
        provider.Email = request.Email.Trim().ToLower();
        provider.PrimaryDistrict = request.PrimaryDistrict.Trim();
        provider.City = request.City.Trim();
        provider.Address = request.Address?.Trim();
        provider.BaseLatitude = request.BaseLatitude;
        provider.BaseLongitude = request.BaseLongitude;
        provider.ServiceRadiusKm = request.ServiceRadiusKm;
        provider.IsActive = request.IsActive;
        provider.UpdatedAtUtc = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);
        _logger.LogInformation("ServiceProvider {ProviderId} updated by User {UserId}", provider.Id, _currentUserService.UserId);

        return MapToDto(provider);
    }

    public async Task<ServiceProviderResponseDto> UpdateVerificationStatusAsync(Guid id, UpdateVerificationRequestDto request, CancellationToken cancellationToken = default)
    {
        if (_currentUserService.Role != UserRole.Admin && _currentUserService.Role != UserRole.Manager)
        {
            throw new UnauthorizedAccessException("Only Managers and Administrators can update verification status.");
        }

        var provider = await _context.ServiceProviders
            .Include(p => p.User)
            .Include(p => p.Skills)
            .FirstOrDefaultAsync(p => p.Id == id, cancellationToken);

        if (provider == null)
        {
            throw new EntityNotFoundException(nameof(ServiceProvider), id);
        }

        provider.VerificationStatus = request.VerificationStatus;
        provider.VerificationNotes = request.VerificationNotes?.Trim();
        provider.UpdatedAtUtc = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);
        _logger.LogInformation("ServiceProvider {ProviderId} verification set to {Status} by User {UserId}",
            provider.Id, provider.VerificationStatus, _currentUserService.UserId);

        return MapToDto(provider);
    }

    public async Task<bool> DeleteServiceProviderAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var provider = await _context.ServiceProviders
            .FirstOrDefaultAsync(p => p.Id == id, cancellationToken);

        if (provider == null)
        {
            throw new EntityNotFoundException(nameof(ServiceProvider), id);
        }

        ValidateProviderModification(provider);

        _context.ServiceProviders.Remove(provider);
        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("ServiceProvider {ProviderId} deleted by User {UserId}", id, _currentUserService.UserId);
        return true;
    }

    private void ValidateProviderModification(ServiceProvider provider)
    {
        if (_currentUserService.Role == UserRole.Admin || _currentUserService.Role == UserRole.Manager)
        {
            return;
        }

        var currentUserId = GetAuthenticatedUserId();
        if (provider.UserId != currentUserId)
        {
            throw new UnauthorizedAccessException("You do not have permission to modify this service provider profile.");
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

    private static ServiceProviderResponseDto MapToDto(ServiceProvider p) => new()
    {
        Id = p.Id,
        UserId = p.UserId,
        BusinessName = p.BusinessName,
        ContactPerson = p.ContactPerson,
        PhoneNumber = p.PhoneNumber,
        Email = p.Email,
        PrimaryDistrict = p.PrimaryDistrict,
        City = p.City,
        Address = p.Address,
        BaseLatitude = p.BaseLatitude,
        BaseLongitude = p.BaseLongitude,
        ServiceRadiusKm = p.ServiceRadiusKm,
        VerificationStatus = p.VerificationStatus,
        VerificationNotes = p.VerificationNotes,
        Rating = p.Rating,
        CompletedJobsCount = p.CompletedJobsCount,
        IsActive = p.IsActive,
        CreatedAtUtc = p.CreatedAtUtc,
        UpdatedAtUtc = p.UpdatedAtUtc,
        Skills = p.Skills?.Select(s => new ProviderSkillResponseDto
        {
            Id = s.Id,
            ProviderId = s.ProviderId,
            Category = s.Category,
            SkillName = s.SkillName,
            YearsOfExperience = s.YearsOfExperience,
            LicenseNumber = s.LicenseNumber,
            IsPrimary = s.IsPrimary,
            Notes = s.Notes,
            CreatedAtUtc = s.CreatedAtUtc
        }).ToList() ?? new List<ProviderSkillResponseDto>()
    };
}
