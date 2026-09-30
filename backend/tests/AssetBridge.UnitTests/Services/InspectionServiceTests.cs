using AssetBridge.Application.Common.Interfaces;
using AssetBridge.Application.DTOs.Inspections;
using AssetBridge.Application.Services.Implementations;
using AssetBridge.Domain.Entities.Assets;
using AssetBridge.Domain.Entities.Incidents;
using AssetBridge.Domain.Entities.Inspections;
using AssetBridge.Domain.Entities.Providers;
using AssetBridge.Domain.Entities.Users;
using AssetBridge.Domain.Enums;
using AssetBridge.Domain.Exceptions;
using AssetBridge.Infrastructure.Persistence;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace AssetBridge.UnitTests.Services;

public class InspectionServiceTests : IDisposable
{
    private readonly AssetBridgeDbContext _dbContext;
    private readonly Mock<ICurrentUserService> _currentUserServiceMock;
    private readonly InspectionService _inspectionSut;
    private readonly InspectionFindingService _findingSut;

    private readonly Guid _ownerUserId = Guid.NewGuid();
    private readonly Guid _otherOwnerUserId = Guid.NewGuid();
    private readonly Guid _providerUserId = Guid.NewGuid();
    private readonly Guid _anotherProviderUserId = Guid.NewGuid();
    private readonly Guid _managerUserId = Guid.NewGuid();
    private readonly Guid _adminUserId = Guid.NewGuid();

    private readonly Guid _assetId = Guid.NewGuid();
    private readonly Guid _incidentId = Guid.NewGuid();
    private readonly Guid _providerId = Guid.NewGuid();
    private readonly Guid _anotherProviderId = Guid.NewGuid();

    public InspectionServiceTests()
    {
        var dbOptions = new DbContextOptionsBuilder<AssetBridgeDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _dbContext = new AssetBridgeDbContext(dbOptions);
        _currentUserServiceMock = new Mock<ICurrentUserService>();

        _inspectionSut = new InspectionService(
            _dbContext,
            _currentUserServiceMock.Object,
            new Mock<ILogger<InspectionService>>().Object);

        _findingSut = new InspectionFindingService(
            _dbContext,
            _currentUserServiceMock.Object,
            new Mock<ILogger<InspectionFindingService>>().Object);

        SeedTestData();
    }

    private void SeedTestData()
    {
        _dbContext.Users.AddRange(
            new User { Id = _ownerUserId, FullName = "Property Owner", Email = "owner@test.lk", Role = UserRole.Owner },
            new User { Id = _otherOwnerUserId, FullName = "Other Owner", Email = "otherowner@test.lk", Role = UserRole.Owner },
            new User { Id = _providerUserId, FullName = "Plumber Provider", Email = "plumber@test.lk", Role = UserRole.ServiceProvider },
            new User { Id = _anotherProviderUserId, FullName = "Electrician Provider", Email = "electrician@test.lk", Role = UserRole.ServiceProvider },
            new User { Id = _managerUserId, FullName = "Ops Manager", Email = "manager@test.lk", Role = UserRole.Manager },
            new User { Id = _adminUserId, FullName = "System Admin", Email = "admin@test.lk", Role = UserRole.Admin }
        );

        _dbContext.Assets.Add(new Asset
        {
            Id = _assetId,
            OwnerId = _ownerUserId,
            Name = "Colombo City Apartment",
            AddressLine1 = "100 Galle Road",
            City = "Colombo",
            District = "Colombo",
            PropertyType = PropertyType.Apartment
        });

        _dbContext.Incidents.Add(new Incident
        {
            Id = _incidentId,
            AssetId = _assetId,
            ReportedByUserId = _ownerUserId,
            Title = "Bathroom Water Leak",
            Description = "Ceiling is leaking in master bathroom",
            Category = IncidentCategory.Plumbing,
            Priority = IncidentPriority.High,
            EstimatedBudget = 50000
        });

        _dbContext.ServiceProviders.AddRange(
            new ServiceProvider
            {
                Id = _providerId,
                UserId = _providerUserId,
                BusinessName = "Colombo Pipe Care",
                ContactPerson = "Nimal",
                PhoneNumber = "0771234567",
                Email = "plumber@test.lk",
                PrimaryDistrict = "Colombo",
                City = "Colombo",
                VerificationStatus = VerificationStatus.Verified
            },
            new ServiceProvider
            {
                Id = _anotherProviderId,
                UserId = _anotherProviderUserId,
                BusinessName = "Power Electricians",
                ContactPerson = "Sunil",
                PhoneNumber = "0777654321",
                Email = "electrician@test.lk",
                PrimaryDistrict = "Colombo",
                City = "Colombo",
                VerificationStatus = VerificationStatus.Verified
            }
        );

        _dbContext.SaveChanges();
    }

    public void Dispose()
    {
        _dbContext.Database.EnsureDeleted();
        _dbContext.Dispose();
    }

    [Fact]
    public async Task CreateInspection_AsManager_ShouldCreateScheduledInspection()
    {
        _currentUserServiceMock.Setup(s => s.IsAuthenticated).Returns(true);
        _currentUserServiceMock.Setup(s => s.UserId).Returns(_managerUserId);
        _currentUserServiceMock.Setup(s => s.Role).Returns(UserRole.Manager);

        var request = new CreateInspectionRequestDto
        {
            IncidentId = _incidentId,
            InspectorProviderId = _providerId,
            ScheduledAtUtc = DateTime.UtcNow.AddDays(1),
            Notes = "Inspect master bathroom ceiling"
        };

        var result = await _inspectionSut.CreateInspectionAsync(request);

        result.Should().NotBeNull();
        result.IncidentId.Should().Be(_incidentId);
        result.InspectorProviderId.Should().Be(_providerId);
        result.Status.Should().Be(InspectionStatus.Scheduled);
    }

    [Fact]
    public async Task CreateInspection_AsAdmin_ForAnyProvider_ShouldSucceed()
    {
        _currentUserServiceMock.Setup(s => s.IsAuthenticated).Returns(true);
        _currentUserServiceMock.Setup(s => s.UserId).Returns(_adminUserId);
        _currentUserServiceMock.Setup(s => s.Role).Returns(UserRole.Admin);

        var request = new CreateInspectionRequestDto
        {
            IncidentId = _incidentId,
            InspectorProviderId = _anotherProviderId,
            ScheduledAtUtc = DateTime.UtcNow.AddDays(2),
            Notes = "Admin scheduled electrical inspection"
        };

        var result = await _inspectionSut.CreateInspectionAsync(request);

        result.Should().NotBeNull();
        result.IncidentId.Should().Be(_incidentId);
        result.InspectorProviderId.Should().Be(_anotherProviderId);
        result.Status.Should().Be(InspectionStatus.Scheduled);
    }

    [Fact]
    public async Task CreateInspection_AsServiceProvider_ForOwnProvider_ShouldSucceed()
    {
        _currentUserServiceMock.Setup(s => s.IsAuthenticated).Returns(true);
        _currentUserServiceMock.Setup(s => s.UserId).Returns(_providerUserId);
        _currentUserServiceMock.Setup(s => s.Role).Returns(UserRole.ServiceProvider);

        var request = new CreateInspectionRequestDto
        {
            IncidentId = _incidentId,
            InspectorProviderId = _providerId,
            ScheduledAtUtc = DateTime.UtcNow.AddDays(1),
            Notes = "Self-scheduled inspection by provider"
        };

        var result = await _inspectionSut.CreateInspectionAsync(request);

        result.Should().NotBeNull();
        result.IncidentId.Should().Be(_incidentId);
        result.InspectorProviderId.Should().Be(_providerId);
        result.Status.Should().Be(InspectionStatus.Scheduled);
    }

    [Fact]
    public async Task CreateInspection_AsServiceProvider_ForAnotherProvider_ShouldThrowForbiddenAccessException_AndNotPersist()
    {
        _currentUserServiceMock.Setup(s => s.IsAuthenticated).Returns(true);
        _currentUserServiceMock.Setup(s => s.UserId).Returns(_providerUserId);
        _currentUserServiceMock.Setup(s => s.Role).Returns(UserRole.ServiceProvider);

        var initialCount = await _dbContext.Inspections.CountAsync();

        var request = new CreateInspectionRequestDto
        {
            IncidentId = _incidentId,
            InspectorProviderId = _anotherProviderId, // Different provider
            ScheduledAtUtc = DateTime.UtcNow.AddDays(1),
            Notes = "Attempting to schedule for another provider"
        };

        var act = () => _inspectionSut.CreateInspectionAsync(request);

        await act.Should().ThrowAsync<ForbiddenAccessException>()
            .WithMessage("*Service providers can only schedule inspections for their own business*");

        // Verify no inspection record was created in the database
        var finalCount = await _dbContext.Inspections.CountAsync();
        finalCount.Should().Be(initialCount);
    }

    [Fact]
    public async Task GetInspectionById_AsOwner_ForOtherOwnerAsset_ShouldThrowForbiddenAccessException()
    {
        var inspection = new Inspection
        {
            Id = Guid.NewGuid(),
            IncidentId = _incidentId,
            InspectorProviderId = _providerId,
            ScheduledAtUtc = DateTime.UtcNow.AddDays(1),
            Status = InspectionStatus.Scheduled
        };
        _dbContext.Inspections.Add(inspection);
        await _dbContext.SaveChangesAsync();

        _currentUserServiceMock.Setup(s => s.IsAuthenticated).Returns(true);
        _currentUserServiceMock.Setup(s => s.UserId).Returns(_otherOwnerUserId);
        _currentUserServiceMock.Setup(s => s.Role).Returns(UserRole.Owner);

        var act = () => _inspectionSut.GetInspectionByIdAsync(inspection.Id);

        await act.Should().ThrowAsync<ForbiddenAccessException>()
            .WithMessage("*You do not have permission to view this inspection*");
    }

    [Fact]
    public async Task GetInspections_AsServiceProvider_ShouldOnlyReturnOwnInspections()
    {
        var ownInspection = new Inspection
        {
            Id = Guid.NewGuid(),
            IncidentId = _incidentId,
            InspectorProviderId = _providerId,
            ScheduledAtUtc = DateTime.UtcNow.AddDays(1),
            Status = InspectionStatus.Scheduled,
            CreatedAtUtc = DateTime.UtcNow
        };
        var otherInspection = new Inspection
        {
            Id = Guid.NewGuid(),
            IncidentId = _incidentId,
            InspectorProviderId = _anotherProviderId,
            ScheduledAtUtc = DateTime.UtcNow.AddDays(1),
            Status = InspectionStatus.Scheduled,
            CreatedAtUtc = DateTime.UtcNow
        };
        _dbContext.Inspections.AddRange(ownInspection, otherInspection);
        await _dbContext.SaveChangesAsync();

        _currentUserServiceMock.Setup(s => s.IsAuthenticated).Returns(true);
        _currentUserServiceMock.Setup(s => s.UserId).Returns(_providerUserId);
        _currentUserServiceMock.Setup(s => s.Role).Returns(UserRole.ServiceProvider);

        var result = await _inspectionSut.GetInspectionsAsync(new InspectionQueryParametersDto());

        result.Should().NotBeNull();
        result.Items.Should().Contain(i => i.Id == ownInspection.Id);
        result.Items.Should().NotContain(i => i.Id == otherInspection.Id);
    }

    [Fact]
    public async Task CompleteInspection_WithoutSummaryOrFindings_ShouldThrowValidationException()
    {
        var inspection = new Inspection
        {
            Id = Guid.NewGuid(),
            IncidentId = _incidentId,
            InspectorProviderId = _providerId,
            ScheduledAtUtc = DateTime.UtcNow.AddDays(1),
            Status = InspectionStatus.InProgress
        };
        _dbContext.Inspections.Add(inspection);
        await _dbContext.SaveChangesAsync();

        _currentUserServiceMock.Setup(s => s.IsAuthenticated).Returns(true);
        _currentUserServiceMock.Setup(s => s.UserId).Returns(_providerUserId);
        _currentUserServiceMock.Setup(s => s.Role).Returns(UserRole.ServiceProvider);

        var request = new UpdateInspectionStatusRequestDto
        {
            Status = InspectionStatus.Completed,
            Summary = "" // Empty summary and no findings
        };

        await Assert.ThrowsAsync<ValidationException>(() => _inspectionSut.UpdateInspectionStatusAsync(inspection.Id, request));
    }

    [Fact]
    public async Task AddFinding_ValidData_ShouldAddToInspection()
    {
        var inspection = new Inspection
        {
            Id = Guid.NewGuid(),
            IncidentId = _incidentId,
            InspectorProviderId = _providerId,
            ScheduledAtUtc = DateTime.UtcNow.AddDays(1),
            Status = InspectionStatus.InProgress
        };
        _dbContext.Inspections.Add(inspection);
        await _dbContext.SaveChangesAsync();

        _currentUserServiceMock.Setup(s => s.IsAuthenticated).Returns(true);
        _currentUserServiceMock.Setup(s => s.UserId).Returns(_providerUserId);
        _currentUserServiceMock.Setup(s => s.Role).Returns(UserRole.ServiceProvider);

        var findingRequest = new CreateInspectionFindingRequestDto
        {
            Description = "Corroded main drain joint causing slow leakage into slab",
            Severity = FindingSeverity.High,
            Recommendation = "Replace PVC joint and apply waterproof membrane sealant",
            EvidenceReference = "photo_drain_leak_01.jpg"
        };

        var finding = await _findingSut.AddFindingAsync(inspection.Id, findingRequest);

        finding.Should().NotBeNull();
        finding.Severity.Should().Be(FindingSeverity.High);
        finding.Recommendation.Should().Contain("Replace PVC joint");

        // Now completing inspection with finding should succeed
        var completeRequest = new UpdateInspectionStatusRequestDto
        {
            Status = InspectionStatus.Completed
        };
        var updated = await _inspectionSut.UpdateInspectionStatusAsync(inspection.Id, completeRequest);
        updated.Status.Should().Be(InspectionStatus.Completed);
    }
}
