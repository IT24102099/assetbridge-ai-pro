using AssetBridge.Application.Common.Interfaces;
using AssetBridge.Application.DTOs.Providers;
using AssetBridge.Application.Services.Interfaces;
using AssetBridge.Domain.Entities.Providers;
using AssetBridge.Domain.Entities.Users;
using AssetBridge.Domain.Enums;
using AssetBridge.Domain.Exceptions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace AssetBridge.Application.Services.Implementations;

// Implements structured skill catalog management for contractors.
public class ProviderSkillService : IProviderSkillService
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly ILogger<ProviderSkillService> _logger;

    public ProviderSkillService(
        IApplicationDbContext context,
        ICurrentUserService currentUserService,
        ILogger<ProviderSkillService> logger)
    {
        _context = context;
        _currentUserService = currentUserService;
        _logger = logger;
    }

    public async Task<IReadOnlyList<ProviderSkillResponseDto>> GetSkillsByProviderIdAsync(Guid providerId, CancellationToken cancellationToken = default)
    {
        var providerExists = await _context.ServiceProviders.AnyAsync(p => p.Id == providerId, cancellationToken);
        if (!providerExists)
        {
            throw new EntityNotFoundException(nameof(ServiceProvider), providerId);
        }

        var skills = await _context.ProviderSkills
            .AsNoTracking()
            .Where(s => s.ProviderId == providerId)
            .OrderByDescending(s => s.IsPrimary)
            .ThenBy(s => s.Category)
            .ToListAsync(cancellationToken);

        return skills.Select(MapToDto).ToList();
    }

    public async Task<ProviderSkillResponseDto> AddSkillAsync(Guid providerId, AddProviderSkillRequestDto request, CancellationToken cancellationToken = default)
    {
        var provider = await _context.ServiceProviders
            .FirstOrDefaultAsync(p => p.Id == providerId, cancellationToken);

        if (provider == null)
        {
            throw new EntityNotFoundException(nameof(ServiceProvider), providerId);
        }

        ValidateProviderAccess(provider);

        // Check for duplicate skill in same category
        var duplicateExists = await _context.ProviderSkills
            .AnyAsync(s => s.ProviderId == providerId &&
                           s.Category == request.Category &&
                           s.SkillName.ToLower() == request.SkillName.Trim().ToLower(), cancellationToken);

        if (duplicateExists)
        {
            throw new ValidationException(new Dictionary<string, string[]>
            {
                { "SkillName", new[] { "This skill is already registered under this category for this provider." } }
            });
        }

        // If marked as primary, unmark existing primary skills for this category
        if (request.IsPrimary)
        {
            var existingPrimary = await _context.ProviderSkills
                .Where(s => s.ProviderId == providerId && s.Category == request.Category && s.IsPrimary)
                .ToListAsync(cancellationToken);

            foreach (var pSkill in existingPrimary)
            {
                pSkill.IsPrimary = false;
            }
        }

        var skill = new ProviderSkill
        {
            Id = Guid.NewGuid(),
            ProviderId = providerId,
            Category = request.Category,
            SkillName = request.SkillName.Trim(),
            YearsOfExperience = request.YearsOfExperience,
            LicenseNumber = request.LicenseNumber?.Trim(),
            IsPrimary = request.IsPrimary,
            Notes = request.Notes?.Trim(),
            CreatedAtUtc = DateTime.UtcNow
        };

        _context.ProviderSkills.Add(skill);
        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Skill {SkillId} ({Category} - {SkillName}) added to Provider {ProviderId}",
            skill.Id, skill.Category, skill.SkillName, providerId);

        return MapToDto(skill);
    }

    public async Task<bool> RemoveSkillAsync(Guid providerId, Guid skillId, CancellationToken cancellationToken = default)
    {
        var provider = await _context.ServiceProviders
            .FirstOrDefaultAsync(p => p.Id == providerId, cancellationToken);

        if (provider == null)
        {
            throw new EntityNotFoundException(nameof(ServiceProvider), providerId);
        }

        ValidateProviderAccess(provider);

        var skill = await _context.ProviderSkills
            .FirstOrDefaultAsync(s => s.Id == skillId && s.ProviderId == providerId, cancellationToken);

        if (skill == null)
        {
            throw new EntityNotFoundException(nameof(ProviderSkill), skillId);
        }

        _context.ProviderSkills.Remove(skill);
        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Skill {SkillId} removed from Provider {ProviderId}", skillId, providerId);
        return true;
    }

    private void ValidateProviderAccess(ServiceProvider provider)
    {
        if (_currentUserService.Role == UserRole.Admin || _currentUserService.Role == UserRole.Manager)
        {
            return;
        }

        if (!_currentUserService.IsAuthenticated || !_currentUserService.UserId.HasValue || provider.UserId != _currentUserService.UserId.Value)
        {
            throw new UnauthorizedAccessException("You do not have permission to manage skills for this service provider.");
        }
    }

    private static ProviderSkillResponseDto MapToDto(ProviderSkill s) => new()
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
    };
}
