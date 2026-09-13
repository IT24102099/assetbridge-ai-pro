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
    private readonly Guid _providerUserId = Guid.NewGuid();
    private readonly Guid _managerUserId = Guid.NewGuid();

    private readonly Guid _assetId = Guid.NewGuid();
    private readonly Guid _incidentId = Guid.NewGuid();
    private readonly Guid _providerId = Guid.NewGuid();

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
            new User { Id = _providerUserId, FullName = "Plumber Provider", Email = "plumber@test.lk", Role = UserRole.ServiceProvider },
            new User { Id = _managerUserId, FullName = "Ops Manager", Email = "manager@test.lk", Role = UserRole.Manager }
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

        _dbContext.ServiceProviders.Add(new ServiceProvider
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
        });

        _dbContext.SaveChanges();
    }

    public void Dispose()
    {
        _dbContext.Database.EnsureDeleted();
        _dbContext.Dispose();
    }

    [Fact]
    public async Task CreateInspection_WithValidData_ShouldCreateScheduledInspection()
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
