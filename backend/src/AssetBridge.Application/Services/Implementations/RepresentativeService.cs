using System.Collections.Concurrent;
using AssetBridge.Application.Common.Constants;
using AssetBridge.Application.Common.Interfaces;
using AssetBridge.Application.Common.Models;
using AssetBridge.Application.Common.Validation;
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
    private static readonly ConcurrentDictionary<Guid, List<RepresentativeDocumentResponseDto>> _documentStore = new();
    private static readonly string[] AllowedExtensions = { ".pdf", ".jpg", ".jpeg", ".png" };
    private const long MaxFileSizeBytes = 10 * 1024 * 1024; // 10MB

    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly ILogger<RepresentativeService> _logger;
    private readonly INotificationService? _notificationService;
    private readonly IFileStorageService? _fileStorageService;

    public RepresentativeService(
        IApplicationDbContext context,
        ICurrentUserService currentUserService,
        ILogger<RepresentativeService> logger,
        INotificationService? notificationService = null,
        IFileStorageService? fileStorageService = null)
    {
        _context = context;
        _currentUserService = currentUserService;
        _logger = logger;
        _notificationService = notificationService;
        _fileStorageService = fileStorageService;
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

        if (!ValidationRules.IsValidEmail(request.Email))
        {
            throw new ValidationException("Email", "Please provide a valid email address.");
        }

        if (!SriLankaLocationData.IsValidDistrictCityCombination(request.District, request.City))
        {
            throw new ValidationException("City", $"The city '{request.City}' is not located in the district '{request.District}'. Please select a consistent district and city.");
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

        // Handle query.Status if provided (e.g. "Active", "Inactive", "Pending", "Verified", "Rejected", "Unverified")
        if (!string.IsNullOrWhiteSpace(query.Status))
        {
            var statusStr = query.Status.Trim();
            if (string.Equals(statusStr, "Active", StringComparison.OrdinalIgnoreCase))
            {
                dbQuery = dbQuery.Where(r => r.IsActive);
            }
            else if (string.Equals(statusStr, "Inactive", StringComparison.OrdinalIgnoreCase))
            {
                dbQuery = dbQuery.Where(r => !r.IsActive);
            }
            else if (string.Equals(statusStr, "Verified", StringComparison.OrdinalIgnoreCase))
            {
                dbQuery = dbQuery.Where(r => r.VerificationStatus == VerificationStatus.Verified);
            }
            else if (string.Equals(statusStr, "Pending", StringComparison.OrdinalIgnoreCase))
            {
                dbQuery = dbQuery.Where(r => r.VerificationStatus == VerificationStatus.Pending);
            }
            else if (string.Equals(statusStr, "Rejected", StringComparison.OrdinalIgnoreCase))
            {
                dbQuery = dbQuery.Where(r => r.VerificationStatus == VerificationStatus.Rejected);
            }
            else if (string.Equals(statusStr, "Unverified", StringComparison.OrdinalIgnoreCase))
            {
                dbQuery = dbQuery.Where(r => r.VerificationStatus != VerificationStatus.Verified);
            }
        }
        else
        {
            if (query.VerificationStatus.HasValue)
            {
                dbQuery = dbQuery.Where(r => r.VerificationStatus == query.VerificationStatus.Value);
            }

            if (query.IsActive.HasValue)
            {
                dbQuery = dbQuery.Where(r => r.IsActive == query.IsActive.Value);
            }
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

        if (!SriLankaLocationData.IsValidDistrictCityCombination(request.District, request.City))
        {
            throw new ValidationException("City", $"The city '{request.City}' is not located in the district '{request.District}'. Please select a consistent district and city.");
        }

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
        if (request.VerificationStatus == VerificationStatus.Rejected || request.VerificationStatus == VerificationStatus.Suspended)
        {
            representative.IsActive = false;
        }
        else if (request.VerificationStatus == VerificationStatus.Verified)
        {
            representative.IsActive = true;
        }
        representative.UpdatedAtUtc = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);
        _logger.LogInformation("Representative {RepresentativeId} verification status set to {Status} (IsActive={IsActive}) by User {UserId}",
            representative.Id, representative.VerificationStatus, representative.IsActive, _currentUserService.UserId);

        if (_notificationService != null)
        {
            try
            {
                await _notificationService.CreateNotificationAsync(new DTOs.Notifications.CreateNotificationDto
                {
                    UserId = representative.UserId,
                    Title = $"Representative Verification: {representative.VerificationStatus}",
                    Message = $"Your trusted representative profile verification status has been updated to {representative.VerificationStatus}.",
                    Type = NotificationType.WorkflowStatusChanged
                }, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to send notification for representative verification update {RepresentativeId}", representative.Id);
            }
        }

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

    public async Task<RepresentativeDocumentResponseDto> UploadVerificationDocumentAsync(
        Guid representativeId,
        Stream fileStream,
        string fileName,
        string contentType,
        long fileSize,
        string documentType,
        CancellationToken cancellationToken = default)
    {
        var representative = await _context.Representatives
            .FirstOrDefaultAsync(r => r.Id == representativeId, cancellationToken);

        if (representative == null)
        {
            throw new EntityNotFoundException(nameof(Representative), representativeId);
        }

        var currentUserId = GetAuthenticatedUserId();
        var isManagerOrAdmin = _currentUserService.Role == UserRole.Manager || _currentUserService.Role == UserRole.Admin;
        if (!isManagerOrAdmin && representative.UserId != currentUserId)
        {
            throw new ForbiddenAccessException("You are not authorized to upload verification documents for this representative.");
        }

        if (fileSize <= 0)
        {
            throw new ValidationException(nameof(fileSize), "File is empty.");
        }

        if (fileSize > MaxFileSizeBytes)
        {
            throw new ValidationException(nameof(fileSize), $"File size exceeds the 10 MB limit (provided {fileSize / 1024 / 1024} MB).");
        }

        var extension = Path.GetExtension(fileName).ToLowerInvariant();
        if (!AllowedExtensions.Contains(extension))
        {
            throw new ValidationException(nameof(fileName), $"File type '{extension}' is not supported. Please upload a PDF, JPG, or PNG document.");
        }

        var normalizedDocType = documentType.Trim().ToLowerInvariant() switch
        {
            "nationalid" or "nic" or "id" => "NationalId",
            "policeclearance" or "police" or "clearance" => "PoliceClearance",
            _ => "NationalId"
        };

        var docTypeName = normalizedDocType switch
        {
            "NationalId" => "National Identity Card (Front & Back)",
            "PoliceClearance" => "Local Police Clearance Certificate",
            _ => "Verification Document"
        };

        string fileUrl;
        if (_fileStorageService != null)
        {
            fileUrl = await _fileStorageService.UploadFileAsync(fileStream, fileName, contentType, "representatives/verification", cancellationToken);
        }
        else
        {
            fileUrl = $"/uploads/representatives/{representativeId}/{Guid.NewGuid()}_{fileName}";
        }

        var docDto = new RepresentativeDocumentResponseDto
        {
            Id = Guid.NewGuid(),
            RepresentativeId = representativeId,
            DocumentType = normalizedDocType,
            DocumentTypeName = docTypeName,
            FileName = fileName,
            FileUrl = fileUrl,
            FileSizeBytes = fileSize,
            ContentType = contentType,
            Status = "Pending Review",
            UploadedAtUtc = DateTime.UtcNow
        };

        var list = _documentStore.GetOrAdd(representativeId, _ => new List<RepresentativeDocumentResponseDto>());
        lock (list)
        {
            // Replace existing document of the same type or append
            list.RemoveAll(d => d.DocumentType == normalizedDocType);
            list.Add(docDto);
        }

        _logger.LogInformation("Verification document uploaded for representative {RepresentativeId}: {DocumentType}", representativeId, normalizedDocType);
        return docDto;
    }

    public async Task<IReadOnlyList<RepresentativeDocumentResponseDto>> GetVerificationDocumentsAsync(
        Guid representativeId,
        CancellationToken cancellationToken = default)
    {
        var representative = await _context.Representatives
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.Id == representativeId, cancellationToken);

        if (representative == null)
        {
            throw new EntityNotFoundException(nameof(Representative), representativeId);
        }

        var list = _documentStore.GetOrAdd(representativeId, id =>
        {
            // Seed verified documents for verified demo representatives so the UI has initial realistic documents
            if (representative.VerificationStatus == VerificationStatus.Verified)
            {
                return new List<RepresentativeDocumentResponseDto>
                {
                    new()
                    {
                        Id = Guid.NewGuid(),
                        RepresentativeId = id,
                        DocumentType = "NationalId",
                        DocumentTypeName = "National Identity Card (Front & Back)",
                        FileName = "nic_front_back_verified.pdf",
                        FileUrl = "https://res.cloudinary.com/demo/image/upload/sample.jpg",
                        FileSizeBytes = 1048576,
                        ContentType = "application/pdf",
                        Status = "Verified",
                        ReviewedBy = "Mathuppriya Naguleswaran (Operations Manager)",
                        ReviewerNotes = "National Identity Card details verified against Sri Lanka Registration of Persons database.",
                        UploadedAtUtc = representative.CreatedAtUtc,
                        ReviewedAtUtc = representative.CreatedAtUtc.AddDays(1)
                    },
                    new()
                    {
                        Id = Guid.NewGuid(),
                        RepresentativeId = id,
                        DocumentType = "PoliceClearance",
                        DocumentTypeName = "Local Police Clearance Certificate",
                        FileName = "police_clearance_kandy_division.pdf",
                        FileUrl = "https://res.cloudinary.com/demo/image/upload/sample.jpg",
                        FileSizeBytes = 2097152,
                        ContentType = "application/pdf",
                        Status = "Verified",
                        ReviewedBy = "Mathuppriya Naguleswaran (Operations Manager)",
                        ReviewerNotes = "Valid police clearance confirmed by Sri Lanka Police Headquarters Kandy Division.",
                        UploadedAtUtc = representative.CreatedAtUtc,
                        ReviewedAtUtc = representative.CreatedAtUtc.AddDays(1)
                    }
                };
            }

            return new List<RepresentativeDocumentResponseDto>();
        });

        lock (list)
        {
            return list.OrderByDescending(d => d.UploadedAtUtc).ToList();
        }
    }

    public async Task<RepresentativeDocumentResponseDto> ReviewVerificationDocumentAsync(
        Guid representativeId,
        Guid documentId,
        ReviewRepresentativeDocumentRequestDto request,
        CancellationToken cancellationToken = default)
    {
        var representative = await _context.Representatives
            .FirstOrDefaultAsync(r => r.Id == representativeId, cancellationToken);

        if (representative == null)
        {
            throw new EntityNotFoundException(nameof(Representative), representativeId);
        }

        if (_currentUserService.Role != UserRole.Manager && _currentUserService.Role != UserRole.Admin)
        {
            throw new ForbiddenAccessException("Only Managers and Administrators are authorized to review verification documents.");
        }

        var list = _documentStore.GetOrAdd(representativeId, _ => new List<RepresentativeDocumentResponseDto>());
        RepresentativeDocumentResponseDto? targetDoc;
        lock (list)
        {
            targetDoc = list.FirstOrDefault(d => d.Id == documentId);
            if (targetDoc == null)
            {
                throw new EntityNotFoundException("RepresentativeDocument", documentId);
            }

            var decision = request.Status.Trim();
            targetDoc.Status = decision.Equals("Verified", StringComparison.OrdinalIgnoreCase) ? "Verified" : "Rejected";
            targetDoc.ReviewerNotes = request.Notes?.Trim();
            targetDoc.ReviewedBy = _currentUserService.Email ?? "Manager Reviewer";
            targetDoc.ReviewedAtUtc = DateTime.UtcNow;

            // If all required documents are verified, update representative profile to Verified
            var allVerified = list.Count >= 2 && list.All(d => d.Status == "Verified");
            if (allVerified && representative.VerificationStatus != VerificationStatus.Verified)
            {
                representative.VerificationStatus = VerificationStatus.Verified;
                representative.VerificationNotes = $"Verified on {DateTime.UtcNow:dd MMM yyyy} following document review.";
                representative.UpdatedAtUtc = DateTime.UtcNow;
            }
            else if (targetDoc.Status == "Rejected" && representative.VerificationStatus == VerificationStatus.Verified)
            {
                representative.VerificationStatus = VerificationStatus.Rejected;
                representative.VerificationNotes = $"Document '{targetDoc.DocumentTypeName}' rejected: {targetDoc.ReviewerNotes}";
                representative.UpdatedAtUtc = DateTime.UtcNow;
            }
        }

        await _context.SaveChangesAsync(cancellationToken);
        _logger.LogInformation("Document {DocumentId} for representative {RepresentativeId} reviewed: {Status}", documentId, representativeId, targetDoc.Status);
        return targetDoc;
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
