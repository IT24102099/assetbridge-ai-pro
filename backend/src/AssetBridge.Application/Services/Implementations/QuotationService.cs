using AssetBridge.Application.Common.Interfaces;
using AssetBridge.Application.Common.Models;
using AssetBridge.Application.DTOs.Maintenance;
using AssetBridge.Application.DTOs.Notifications;
using AssetBridge.Application.Services.Interfaces;
using AssetBridge.Domain.Entities.Incidents;
using AssetBridge.Domain.Entities.Maintenance;
using AssetBridge.Domain.Entities.Providers;
using AssetBridge.Domain.Entities.Users;
using AssetBridge.Domain.Enums;
using AssetBridge.Domain.Exceptions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace AssetBridge.Application.Services.Implementations;

public class QuotationService : IQuotationService
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly ILogger<QuotationService> _logger;
    private readonly INotificationService? _notificationService;

    public QuotationService(
        IApplicationDbContext context,
        ICurrentUserService currentUserService,
        ILogger<QuotationService> logger,
        INotificationService? notificationService = null)
    {
        _context = context;
        _currentUserService = currentUserService;
        _logger = logger;
        _notificationService = notificationService;
    }

    public async Task<QuotationResponseDto> CreateQuotationAsync(CreateQuotationRequestDto request, CancellationToken cancellationToken = default)
    {
        var incident = await _context.Incidents
            .Include(i => i.Asset)
            .FirstOrDefaultAsync(i => i.Id == request.IncidentId, cancellationToken);

        if (incident == null)
        {
            throw new EntityNotFoundException(nameof(Incident), request.IncidentId);
        }

        var provider = await _context.ServiceProviders
            .FirstOrDefaultAsync(p => p.Id == request.ProviderId, cancellationToken);

        if (provider == null)
        {
            throw new EntityNotFoundException(nameof(ServiceProvider), request.ProviderId);
        }

        ValidateProviderAccess(provider);

        if (request.ValidUntilUtc <= DateTime.UtcNow)
        {
            throw new ValidationException(new Dictionary<string, string[]>
            {
                { "ValidUntilUtc", new[] { "Quotation validity date must be in the future." } }
            });
        }

        var existingActive = await _context.Quotations
            .AsNoTracking()
            .FirstOrDefaultAsync(q => q.IncidentId == request.IncidentId &&
                                      q.ProviderId == request.ProviderId &&
                                      (q.Status == QuotationStatus.Draft ||
                                       q.Status == QuotationStatus.Submitted ||
                                       q.Status == QuotationStatus.UnderReview), cancellationToken);

        if (existingActive != null)
        {
            throw new ValidationException(new Dictionary<string, string[]>
            {
                { "Quotation", new[] { $"An active quotation with status '{existingActive.Status}' already exists from this contractor for this incident. Please update the existing quotation." } }
            });
        }

        if (request.Items == null || !request.Items.Any())
        {
            throw new ValidationException(new Dictionary<string, string[]>
            {
                { "Items", new[] { "Quotation must contain at least one line item." } }
            });
        }

        if (request.TaxAndOtherCharges < 0)
        {
            throw new ValidationException(new Dictionary<string, string[]>
            {
                { "TaxAndOtherCharges", new[] { "Tax and other charges cannot be negative." } }
            });
        }

        var quotation = new Quotation
        {
            Id = Guid.NewGuid(),
            IncidentId = request.IncidentId,
            ProviderId = request.ProviderId,
            ValidUntilUtc = request.ValidUntilUtc,
            Notes = request.Notes?.Trim(),
            TaxAndOtherCharges = request.TaxAndOtherCharges,
            Status = QuotationStatus.Submitted,
            CreatedAtUtc = DateTime.UtcNow
        };

        decimal subtotal = 0;

        foreach (var itemDto in request.Items)
        {
            if (itemDto.Quantity <= 0)
            {
                throw new ValidationException(new Dictionary<string, string[]>
                {
                    { "Quantity", new[] { "Line item quantity must be greater than zero." } }
                });
            }

            if (itemDto.UnitPrice < 0)
            {
                throw new ValidationException(new Dictionary<string, string[]>
                {
                    { "UnitPrice", new[] { "Line item unit price cannot be negative." } }
                });
            }

            var itemTotal = Math.Round(itemDto.Quantity * itemDto.UnitPrice, 2);
            subtotal += itemTotal;

            quotation.Items.Add(new QuotationItem
            {
                Id = Guid.NewGuid(),
                QuotationId = quotation.Id,
                Description = itemDto.Description.Trim(),
                Quantity = itemDto.Quantity,
                UnitPrice = itemDto.UnitPrice,
                TotalPrice = itemTotal,
                CreatedAtUtc = DateTime.UtcNow
            });
        }

        quotation.Subtotal = subtotal;
        quotation.TotalAmount = subtotal + quotation.TaxAndOtherCharges;

        _context.Quotations.Add(quotation);
        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Quotation {QuotationId} created with total {TotalAmount} LKR by Provider {ProviderId}",
            quotation.Id, quotation.TotalAmount, request.ProviderId);

        if (_notificationService != null && incident.Asset?.OwnerId != null)
        {
            try
            {
                await _notificationService.CreateNotificationAsync(new CreateNotificationDto
                {
                    UserId = incident.Asset.OwnerId,
                    Title = $"New Quotation Submitted: {provider.BusinessName}",
                    Message = $"A quotation of {quotation.TotalAmount:N2} LKR was submitted by {provider.BusinessName} for incident '{incident.Title}'.",
                    Type = NotificationType.ApprovalRequired
                }, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to dispatch notification for quotation creation {QuotationId}", quotation.Id);
            }
        }

        return await GetQuotationByIdAsync(quotation.Id, cancellationToken);
    }

    public async Task<QuotationResponseDto> GetQuotationByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var quotation = await _context.Quotations
            .AsNoTracking()
            .Include(q => q.Incident)
                .ThenInclude(i => i.Asset)
            .Include(q => q.Provider)
            .Include(q => q.Items)
            .FirstOrDefaultAsync(q => q.Id == id, cancellationToken);

        if (quotation == null)
        {
            throw new EntityNotFoundException(nameof(Quotation), id);
        }

        ValidateQuotationAccess(quotation);

        return MapToDto(quotation);
    }

    public async Task<PagedResponse<QuotationResponseDto>> GetQuotationsAsync(QuotationQueryParametersDto query, CancellationToken cancellationToken = default)
    {
        var dbQuery = _context.Quotations
            .AsNoTracking()
            .Include(q => q.Incident)
                .ThenInclude(i => i.Asset)
            .Include(q => q.Provider)
            .Include(q => q.Items)
            .AsQueryable();

        if (_currentUserService.Role == UserRole.Owner)
        {
            var currentUserId = GetAuthenticatedUserId();
            dbQuery = dbQuery.Where(q => q.Incident.Asset.OwnerId == currentUserId);
        }
        else if (_currentUserService.Role == UserRole.ServiceProvider)
        {
            var currentUserId = GetAuthenticatedUserId();
            dbQuery = dbQuery.Where(q => q.Provider.UserId == currentUserId);
        }

        if (query.IncidentId.HasValue)
        {
            dbQuery = dbQuery.Where(q => q.IncidentId == query.IncidentId.Value);
        }

        if (query.ProviderId.HasValue)
        {
            dbQuery = dbQuery.Where(q => q.ProviderId == query.ProviderId.Value);
        }

        if (query.Status.HasValue)
        {
            dbQuery = dbQuery.Where(q => q.Status == query.Status.Value);
        }

        if (query.ExcludeExpired == true)
        {
            var now = DateTime.UtcNow;
            dbQuery = dbQuery.Where(q => q.ValidUntilUtc >= now);
        }

        var totalCount = await dbQuery.CountAsync(cancellationToken);

        dbQuery = (query.SortBy?.ToLower(), query.SortDescending) switch
        {
            ("totalamount", false) => dbQuery.OrderBy(q => q.TotalAmount),
            ("totalamount", true) => dbQuery.OrderByDescending(q => q.TotalAmount),
            ("validuntilutc", false) => dbQuery.OrderBy(q => q.ValidUntilUtc),
            ("validuntilutc", true) => dbQuery.OrderByDescending(q => q.ValidUntilUtc),
            ("status", false) => dbQuery.OrderBy(q => q.Status),
            ("status", true) => dbQuery.OrderByDescending(q => q.Status),
            ("createdatutc", false) => dbQuery.OrderBy(q => q.CreatedAtUtc),
            _ => dbQuery.OrderByDescending(q => q.CreatedAtUtc)
        };

        var items = await dbQuery
            .Skip((query.PageNumber - 1) * query.PageSize)
            .Take(query.PageSize)
            .Select(q => MapToDto(q))
            .ToListAsync(cancellationToken);

        return new PagedResponse<QuotationResponseDto>(items, totalCount, query.PageNumber, query.PageSize);
    }

    public async Task<QuotationResponseDto> UpdateQuotationAsync(Guid id, UpdateQuotationRequestDto request, CancellationToken cancellationToken = default)
    {
        var quotation = await _context.Quotations
            .Include(q => q.Provider)
            .Include(q => q.Items)
            .FirstOrDefaultAsync(q => q.Id == id, cancellationToken);

        if (quotation == null)
        {
            throw new EntityNotFoundException(nameof(Quotation), id);
        }

        ValidateProviderAccess(quotation.Provider);

        if (quotation.Status == QuotationStatus.Accepted)
        {
            throw new ValidationException(new Dictionary<string, string[]>
            {
                { "Status", new[] { "Accepted quotations cannot be modified." } }
            });
        }

        if (request.TaxAndOtherCharges < 0)
        {
            throw new ValidationException(new Dictionary<string, string[]>
            {
                { "TaxAndOtherCharges", new[] { "Tax and other charges cannot be negative." } }
            });
        }

        quotation.ValidUntilUtc = request.ValidUntilUtc;
        quotation.Notes = request.Notes?.Trim();
        quotation.TaxAndOtherCharges = request.TaxAndOtherCharges;
        quotation.TotalAmount = quotation.Subtotal + request.TaxAndOtherCharges;
        quotation.UpdatedAtUtc = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);
        _logger.LogInformation("Quotation {QuotationId} updated", id);

        return await GetQuotationByIdAsync(id, cancellationToken);
    }

    public async Task<QuotationResponseDto> UpdateQuotationStatusAsync(Guid id, UpdateQuotationStatusRequestDto request, CancellationToken cancellationToken = default)
    {
        var quotation = await _context.Quotations
            .Include(q => q.Incident)
                .ThenInclude(i => i.Asset)
            .Include(q => q.Provider)
            .Include(q => q.Items)
            .FirstOrDefaultAsync(q => q.Id == id, cancellationToken);

        if (quotation == null)
        {
            throw new EntityNotFoundException(nameof(Quotation), id);
        }

        // Accept / Reject permission: Owner of the property, Manager, or Admin
        if (request.Status == QuotationStatus.Accepted || request.Status == QuotationStatus.Rejected)
        {
            if (_currentUserService.Role != UserRole.Admin && _currentUserService.Role != UserRole.Manager)
            {
                var currentUserId = GetAuthenticatedUserId();
                if (_currentUserService.Role != UserRole.Owner || quotation.Incident?.Asset?.OwnerId != currentUserId)
                {
                    throw new ForbiddenAccessException("Only the property owner or managers can accept/reject quotations.");
                }
            }
        }
        else
        {
            ValidateProviderAccess(quotation.Provider);
        }

        quotation.Status = request.Status;
        quotation.UpdatedAtUtc = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);
        _logger.LogInformation("Quotation {QuotationId} status changed to {Status}", id, request.Status);

        if (_notificationService != null && quotation.Provider?.UserId != null)
        {
            try
            {
                var notifType = request.Status == QuotationStatus.Accepted ? NotificationType.Approved :
                                request.Status == QuotationStatus.Rejected ? NotificationType.Rejected :
                                NotificationType.WorkflowStatusChanged;

                var statusLabel = request.Status == QuotationStatus.Accepted ? "Accepted" :
                                  request.Status == QuotationStatus.Rejected ? "Rejected" :
                                  request.Status.ToString();

                await _notificationService.CreateNotificationAsync(new CreateNotificationDto
                {
                    UserId = quotation.Provider.UserId,
                    Title = $"Quotation {statusLabel}: {quotation.Incident?.Title ?? "Maintenance Request"}",
                    Message = $"Your quotation for incident '{quotation.Incident?.Title ?? "Maintenance Request"}' ({quotation.TotalAmount:N2} LKR) has been {statusLabel.ToLowerInvariant()}.",
                    Type = notifType
                }, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to dispatch notification for quotation status change {QuotationId}", quotation.Id);
            }
        }

        return MapToDto(quotation);
    }

    public async Task<QuotationItemResponseDto> AddItemAsync(Guid quotationId, CreateQuotationItemRequestDto request, CancellationToken cancellationToken = default)
    {
        var quotation = await _context.Quotations
            .Include(q => q.Provider)
            .Include(q => q.Items)
            .FirstOrDefaultAsync(q => q.Id == quotationId, cancellationToken);

        if (quotation == null)
        {
            throw new EntityNotFoundException(nameof(Quotation), quotationId);
        }

        ValidateProviderAccess(quotation.Provider);

        if (quotation.Status == QuotationStatus.Accepted)
        {
            throw new ValidationException(new Dictionary<string, string[]>
            {
                { "Status", new[] { "Cannot add items to an accepted quotation." } }
            });
        }

        if (request.Quantity <= 0)
        {
            throw new ValidationException(new Dictionary<string, string[]>
            {
                { "Quantity", new[] { "Line item quantity must be greater than zero." } }
            });
        }

        if (request.UnitPrice < 0)
        {
            throw new ValidationException(new Dictionary<string, string[]>
            {
                { "UnitPrice", new[] { "Line item unit price cannot be negative." } }
            });
        }

        var itemTotal = Math.Round(request.Quantity * request.UnitPrice, 2);

        var item = new QuotationItem
        {
            Id = Guid.NewGuid(),
            QuotationId = quotationId,
            Description = request.Description.Trim(),
            Quantity = request.Quantity,
            UnitPrice = request.UnitPrice,
            TotalPrice = itemTotal,
            CreatedAtUtc = DateTime.UtcNow
        };

        _context.QuotationItems.Add(item);
        if (!quotation.Items.Contains(item))
        {
            quotation.Items.Add(item);
        }

        RecalculateTotals(quotation);
        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Item {ItemId} added to Quotation {QuotationId}. New total: {TotalAmount}", item.Id, quotationId, quotation.TotalAmount);

        return MapToDto(item);
    }

    public async Task<QuotationItemResponseDto> UpdateItemAsync(Guid quotationId, Guid itemId, UpdateQuotationItemRequestDto request, CancellationToken cancellationToken = default)
    {
        var quotation = await _context.Quotations
            .Include(q => q.Provider)
            .Include(q => q.Items)
            .FirstOrDefaultAsync(q => q.Id == quotationId, cancellationToken);

        if (quotation == null)
        {
            throw new EntityNotFoundException(nameof(Quotation), quotationId);
        }

        ValidateProviderAccess(quotation.Provider);

        var item = quotation.Items.FirstOrDefault(i => i.Id == itemId);
        if (item == null)
        {
            throw new EntityNotFoundException(nameof(QuotationItem), itemId);
        }

        if (request.Quantity <= 0)
        {
            throw new ValidationException(new Dictionary<string, string[]>
            {
                { "Quantity", new[] { "Line item quantity must be greater than zero." } }
            });
        }

        if (request.UnitPrice < 0)
        {
            throw new ValidationException(new Dictionary<string, string[]>
            {
                { "UnitPrice", new[] { "Line item unit price cannot be negative." } }
            });
        }

        item.Description = request.Description.Trim();
        item.Quantity = request.Quantity;
        item.UnitPrice = request.UnitPrice;
        item.TotalPrice = Math.Round(request.Quantity * request.UnitPrice, 2);
        item.UpdatedAtUtc = DateTime.UtcNow;

        RecalculateTotals(quotation);
        await _context.SaveChangesAsync(cancellationToken);

        return MapToDto(item);
    }

    public async Task<bool> RemoveItemAsync(Guid quotationId, Guid itemId, CancellationToken cancellationToken = default)
    {
        var quotation = await _context.Quotations
            .Include(q => q.Provider)
            .Include(q => q.Items)
            .FirstOrDefaultAsync(q => q.Id == quotationId, cancellationToken);

        if (quotation == null)
        {
            throw new EntityNotFoundException(nameof(Quotation), quotationId);
        }

        ValidateProviderAccess(quotation.Provider);

        var item = quotation.Items.FirstOrDefault(i => i.Id == itemId);
        if (item == null)
        {
            throw new EntityNotFoundException(nameof(QuotationItem), itemId);
        }

        if (quotation.Items.Count <= 1)
        {
            throw new ValidationException(new Dictionary<string, string[]>
            {
                { "Items", new[] { "A quotation must have at least one line item." } }
            });
        }

        _context.QuotationItems.Remove(item);
        quotation.Items.Remove(item);

        RecalculateTotals(quotation);
        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }

    private static void RecalculateTotals(Quotation quotation)
    {
        quotation.Subtotal = quotation.Items.GroupBy(i => i.Id).Select(g => g.First()).Sum(i => i.TotalPrice);
        quotation.TotalAmount = quotation.Subtotal + quotation.TaxAndOtherCharges;
        quotation.UpdatedAtUtc = DateTime.UtcNow;
    }

    private void ValidateProviderAccess(ServiceProvider provider)
    {
        if (_currentUserService.Role == UserRole.Admin || _currentUserService.Role == UserRole.Manager)
        {
            return;
        }

        var currentUserId = GetAuthenticatedUserId();

        if (provider.UserId != currentUserId)
        {
            throw new ForbiddenAccessException("You do not have permission to manage this quotation.");
        }
    }

    private void ValidateQuotationAccess(Quotation quotation)
    {
        if (_currentUserService.Role == UserRole.Admin || _currentUserService.Role == UserRole.Manager)
        {
            return;
        }

        var currentUserId = GetAuthenticatedUserId();

        if (_currentUserService.Role == UserRole.Owner && quotation.Incident?.Asset != null)
        {
            if (quotation.Incident.Asset.OwnerId != currentUserId)
            {
                throw new ForbiddenAccessException("You do not have permission to view this quotation.");
            }
        }
        else if (_currentUserService.Role == UserRole.ServiceProvider && quotation.Provider != null)
        {
            if (quotation.Provider.UserId != currentUserId)
            {
                throw new ForbiddenAccessException("You do not have permission to view this quotation.");
            }
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

    private static QuotationResponseDto MapToDto(Quotation q) => new()
    {
        Id = q.Id,
        IncidentId = q.IncidentId,
        IncidentTitle = q.Incident?.Title ?? string.Empty,
        ProviderId = q.ProviderId,
        ProviderBusinessName = q.Provider?.BusinessName ?? string.Empty,
        ProviderRating = q.Provider?.Rating ?? 5.0,
        ProviderVerificationStatus = q.Provider?.VerificationStatus ?? VerificationStatus.Pending,
        ValidUntilUtc = q.ValidUntilUtc,
        Notes = q.Notes,
        Subtotal = q.Subtotal,
        TaxAndOtherCharges = q.TaxAndOtherCharges,
        TotalAmount = q.TotalAmount,
        Status = q.Status,
        CreatedAtUtc = q.CreatedAtUtc,
        UpdatedAtUtc = q.UpdatedAtUtc,
        Items = q.Items?.Select(MapToDto).ToList() ?? new List<QuotationItemResponseDto>()
    };

    private static QuotationItemResponseDto MapToDto(QuotationItem i) => new()
    {
        Id = i.Id,
        QuotationId = i.QuotationId,
        Description = i.Description,
        Quantity = i.Quantity,
        UnitPrice = i.UnitPrice,
        TotalPrice = i.TotalPrice,
        CreatedAtUtc = i.CreatedAtUtc
    };
}
