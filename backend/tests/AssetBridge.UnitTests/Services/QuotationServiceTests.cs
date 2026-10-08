using AssetBridge.Application.Common.Interfaces;
using AssetBridge.Application.DTOs.Maintenance;
using AssetBridge.Application.Services.Implementations;
using AssetBridge.Domain.Entities.Assets;
using AssetBridge.Domain.Entities.Incidents;
using AssetBridge.Domain.Entities.Maintenance;
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

public class QuotationServiceTests : IDisposable
{
    private readonly AssetBridgeDbContext _dbContext;
    private readonly Mock<ICurrentUserService> _currentUserServiceMock;
    private readonly QuotationService _quotationSut;

    private readonly Guid _ownerUserId = Guid.NewGuid();
    private readonly Guid _providerUserId = Guid.NewGuid();
    private readonly Guid _managerUserId = Guid.NewGuid();

    private readonly Guid _assetId = Guid.NewGuid();
    private readonly Guid _incidentId = Guid.NewGuid();
    private readonly Guid _providerId = Guid.NewGuid();

    public QuotationServiceTests()
    {
        var dbOptions = new DbContextOptionsBuilder<AssetBridgeDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _dbContext = new AssetBridgeDbContext(dbOptions);
        _currentUserServiceMock = new Mock<ICurrentUserService>();

        _quotationSut = new QuotationService(
            _dbContext,
            _currentUserServiceMock.Object,
            new Mock<ILogger<QuotationService>>().Object);

        SeedTestData();
    }

    private void SeedTestData()
    {
        _dbContext.Users.AddRange(
            new User { Id = _ownerUserId, FullName = "Owner User", Email = "owner@test.lk", Role = UserRole.Owner },
            new User { Id = _providerUserId, FullName = "Provider User", Email = "pro@test.lk", Role = UserRole.ServiceProvider },
            new User { Id = _managerUserId, FullName = "Manager User", Email = "manager@test.lk", Role = UserRole.Manager }
        );

        _dbContext.Assets.Add(new Asset
        {
            Id = _assetId,
            OwnerId = _ownerUserId,
            Name = "Colombo Property",
            AddressLine1 = "50 Duplication Road",
            City = "Colombo",
            District = "Colombo",
            PropertyType = PropertyType.SingleFamilyHouse
        });

        _dbContext.Incidents.Add(new Incident
        {
            Id = _incidentId,
            AssetId = _assetId,
            ReportedByUserId = _ownerUserId,
            Title = "Kitchen Electrical Tripping",
            Description = "Main breaker trips when oven turns on",
            Category = IncidentCategory.Electrical,
            Priority = IncidentPriority.High,
            EstimatedBudget = 50000
        });

        _dbContext.ServiceProviders.Add(new ServiceProvider
        {
            Id = _providerId,
            UserId = _providerUserId,
            BusinessName = "Quick Spark Electricals",
            ContactPerson = "Dinesh",
            PhoneNumber = "0771239999",
            Email = "spark@test.lk",
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
    public async Task CreateQuotation_WithLineItems_ShouldCalculateSubtotalAndTotalServerSide()
    {
        _currentUserServiceMock.Setup(s => s.IsAuthenticated).Returns(true);
        _currentUserServiceMock.Setup(s => s.UserId).Returns(_providerUserId);
        _currentUserServiceMock.Setup(s => s.Role).Returns(UserRole.ServiceProvider);

        var request = new CreateQuotationRequestDto
        {
            IncidentId = _incidentId,
            ProviderId = _providerId,
            ValidUntilUtc = DateTime.UtcNow.AddDays(14),
            Notes = "Includes standard 6-month electrical warranty",
            TaxAndOtherCharges = 2500,
            Items = new List<CreateQuotationItemRequestDto>
            {
                new() { Description = "40A Dual Pole Circuit Breaker", Quantity = 2, UnitPrice = 6000 },
                new() { Description = "High Heat Heat-Resistant Wiring (10m)", Quantity = 1, UnitPrice = 8500 },
                new() { Description = "Certified Electrician Technical Labor", Quantity = 1, UnitPrice = 15000 }
            }
        };

        // Expected: Subtotal = (2*6000) + (1*8500) + (1*15000) = 12000 + 8500 + 15000 = 35500
        // Expected Total = 35500 + 2500 = 38000

        var quotation = await _quotationSut.CreateQuotationAsync(request);

        quotation.Should().NotBeNull();
        quotation.Subtotal.Should().Be(35500);
        quotation.TaxAndOtherCharges.Should().Be(2500);
        quotation.TotalAmount.Should().Be(38000);
        quotation.Status.Should().Be(QuotationStatus.Submitted);
        quotation.Items.Should().HaveCount(3);
    }

    [Fact]
    public async Task CreateQuotation_WithZeroOrNegativeQuantity_ShouldThrowValidationException()
    {
        _currentUserServiceMock.Setup(s => s.IsAuthenticated).Returns(true);
        _currentUserServiceMock.Setup(s => s.UserId).Returns(_providerUserId);
        _currentUserServiceMock.Setup(s => s.Role).Returns(UserRole.ServiceProvider);

        var request = new CreateQuotationRequestDto
        {
            IncidentId = _incidentId,
            ProviderId = _providerId,
            ValidUntilUtc = DateTime.UtcNow.AddDays(7),
            Items = new List<CreateQuotationItemRequestDto>
            {
                new() { Description = "Circuit Breaker", Quantity = 0, UnitPrice = 5000 } // Invalid quantity
            }
        };

        await Assert.ThrowsAsync<ValidationException>(() => _quotationSut.CreateQuotationAsync(request));
    }

    [Fact]
    public async Task AddItem_ToSubmittedQuotation_ShouldRecalculateTotalAmount()
    {
        _currentUserServiceMock.Setup(s => s.IsAuthenticated).Returns(true);
        _currentUserServiceMock.Setup(s => s.UserId).Returns(_providerUserId);
        _currentUserServiceMock.Setup(s => s.Role).Returns(UserRole.ServiceProvider);

        var request = new CreateQuotationRequestDto
        {
            IncidentId = _incidentId,
            ProviderId = _providerId,
            ValidUntilUtc = DateTime.UtcNow.AddDays(7),
            TaxAndOtherCharges = 1000,
            Items = new List<CreateQuotationItemRequestDto>
            {
                new() { Description = "Initial Inspection & Diagnostic", Quantity = 1, UnitPrice = 5000 }
            }
        };

        var quotation = await _quotationSut.CreateQuotationAsync(request);
        quotation.TotalAmount.Should().Be(6000);

        var newItemRequest = new CreateQuotationItemRequestDto
        {
            Description = "Replacement Relay Switch",
            Quantity = 1,
            UnitPrice = 4500
        };

        var addedItem = await _quotationSut.AddItemAsync(quotation.Id, newItemRequest);
        addedItem.Should().NotBeNull();

        var updatedQuotation = await _quotationSut.GetQuotationByIdAsync(quotation.Id);
        updatedQuotation.Subtotal.Should().Be(9500);
        updatedQuotation.TotalAmount.Should().Be(10500);
    }

    [Fact]
    public async Task CreateQuotationAsync_ShouldThrowEntityNotFoundException_WhenIncidentNotFound()
    {
        // Arrange
        _currentUserServiceMock.Setup(s => s.IsAuthenticated).Returns(true);
        _currentUserServiceMock.Setup(s => s.UserId).Returns(_providerUserId);
        _currentUserServiceMock.Setup(s => s.Role).Returns(UserRole.ServiceProvider);

        var nonExistentIncidentId = Guid.NewGuid();
        var request = new CreateQuotationRequestDto
        {
            IncidentId = nonExistentIncidentId,
            ProviderId = _providerId,
            Items = new List<CreateQuotationItemRequestDto>
            {
                new() { Description = "Test", Quantity = 1, UnitPrice = 1000 }
            }
        };

        // Act
        Func<Task> act = async () => await _quotationSut.CreateQuotationAsync(request);

        // Assert
        await act.Should().ThrowAsync<EntityNotFoundException>();
    }

    [Fact]
    public async Task CreateQuotationAsync_ShouldThrowEntityNotFoundException_WhenProviderNotFound()
    {
        // Arrange
        _currentUserServiceMock.Setup(s => s.IsAuthenticated).Returns(true);
        _currentUserServiceMock.Setup(s => s.UserId).Returns(_providerUserId);
        _currentUserServiceMock.Setup(s => s.Role).Returns(UserRole.ServiceProvider);

        var nonExistentProviderId = Guid.NewGuid();
        var request = new CreateQuotationRequestDto
        {
            IncidentId = _incidentId,
            ProviderId = nonExistentProviderId,
            Items = new List<CreateQuotationItemRequestDto>
            {
                new() { Description = "Test", Quantity = 1, UnitPrice = 1000 }
            }
        };

        // Act
        Func<Task> act = async () => await _quotationSut.CreateQuotationAsync(request);

        // Assert
        await act.Should().ThrowAsync<EntityNotFoundException>();
    }

    [Fact]
    public async Task CreateQuotationAsync_ShouldThrowValidationException_WhenNoItemsProvided()
    {
        // Arrange
        _currentUserServiceMock.Setup(s => s.IsAuthenticated).Returns(true);
        _currentUserServiceMock.Setup(s => s.UserId).Returns(_providerUserId);
        _currentUserServiceMock.Setup(s => s.Role).Returns(UserRole.ServiceProvider);

        var request = new CreateQuotationRequestDto
        {
            IncidentId = _incidentId,
            ProviderId = _providerId,
            Items = new List<CreateQuotationItemRequestDto>() // Empty items
        };

        // Act
        Func<Task> act = async () => await _quotationSut.CreateQuotationAsync(request);

        // Assert
        await act.Should().ThrowAsync<ValidationException>();
    }

    [Fact]
    public async Task CreateQuotationAsync_ShouldThrowValidationException_WhenTaxIsNegative()
    {
        // Arrange
        _currentUserServiceMock.Setup(s => s.IsAuthenticated).Returns(true);
        _currentUserServiceMock.Setup(s => s.UserId).Returns(_providerUserId);
        _currentUserServiceMock.Setup(s => s.Role).Returns(UserRole.ServiceProvider);

        var request = new CreateQuotationRequestDto
        {
            IncidentId = _incidentId,
            ProviderId = _providerId,
            TaxAndOtherCharges = -500,
            Items = new List<CreateQuotationItemRequestDto>
            {
                new() { Description = "Test", Quantity = 1, UnitPrice = 1000 }
            }
        };

        // Act
        Func<Task> act = async () => await _quotationSut.CreateQuotationAsync(request);

        // Assert
        await act.Should().ThrowAsync<ValidationException>();
    }

    [Fact]
    public async Task GetQuotationByIdAsync_ShouldThrowEntityNotFoundException_WhenQuotationNotFound()
    {
        // Arrange
        var nonExistentId = Guid.NewGuid();

        // Act
        Func<Task> act = async () => await _quotationSut.GetQuotationByIdAsync(nonExistentId);

        // Assert
        await act.Should().ThrowAsync<EntityNotFoundException>();
    }

    [Fact]
    public async Task GetQuotationsAsync_ShouldFilterByIncidentProviderStatusAndExcludeExpired()
    {
        // Arrange
        _currentUserServiceMock.Setup(s => s.IsAuthenticated).Returns(true);
        _currentUserServiceMock.Setup(s => s.UserId).Returns(_managerUserId);
        _currentUserServiceMock.Setup(s => s.Role).Returns(UserRole.Manager);

        _dbContext.Quotations.AddRange(
            new Quotation { Id = Guid.NewGuid(), IncidentId = _incidentId, ProviderId = _providerId, Status = QuotationStatus.Submitted, Subtotal = 10000, TotalAmount = 11000, ValidUntilUtc = DateTime.UtcNow.AddDays(7), CreatedAtUtc = DateTime.UtcNow.AddDays(-2) },
            new Quotation { Id = Guid.NewGuid(), IncidentId = _incidentId, ProviderId = _providerId, Status = QuotationStatus.Submitted, Subtotal = 20000, TotalAmount = 22000, ValidUntilUtc = DateTime.UtcNow.AddDays(-3), CreatedAtUtc = DateTime.UtcNow.AddDays(-5) }
        );
        await _dbContext.SaveChangesAsync();

        var query = new QuotationQueryParametersDto
        {
            IncidentId = _incidentId,
            ProviderId = _providerId,
            Status = QuotationStatus.Submitted,
            ExcludeExpired = true,
            SortBy = "totalamount",
            SortDescending = false,
            PageNumber = 1,
            PageSize = 10
        };

        // Act
        var result = await _quotationSut.GetQuotationsAsync(query);

        // Assert
        result.Should().NotBeNull();
        result.TotalCount.Should().Be(1);
        result.Items.First().TotalAmount.Should().Be(11000);
    }

    [Fact]
    public async Task UpdateQuotationAsync_ShouldThrowValidationException_WhenQuotationIsAlreadyAccepted()
    {
        // Arrange
        var quotation = new Quotation
        {
            Id = Guid.NewGuid(),
            IncidentId = _incidentId,
            ProviderId = _providerId,
            Status = QuotationStatus.Accepted,
            Subtotal = 10000,
            TotalAmount = 10000,
            ValidUntilUtc = DateTime.UtcNow.AddDays(7)
        };
        _dbContext.Quotations.Add(quotation);
        await _dbContext.SaveChangesAsync();

        _currentUserServiceMock.Setup(s => s.IsAuthenticated).Returns(true);
        _currentUserServiceMock.Setup(s => s.UserId).Returns(_providerUserId);
        _currentUserServiceMock.Setup(s => s.Role).Returns(UserRole.ServiceProvider);

        var updateDto = new UpdateQuotationRequestDto
        {
            Notes = "Trying to edit accepted quotation",
            TaxAndOtherCharges = 0
        };

        // Act
        Func<Task> act = async () => await _quotationSut.UpdateQuotationAsync(quotation.Id, updateDto);

        // Assert
        var ex = await act.Should().ThrowAsync<ValidationException>();
        ex.Which.Errors["Status"].Should().Contain("Accepted quotations cannot be modified.");
    }

    [Fact]
    public async Task UpdateQuotationStatusAsync_ShouldAllowOwnerToAccept()
    {
        // Arrange
        var quotation = new Quotation
        {
            Id = Guid.NewGuid(),
            IncidentId = _incidentId,
            ProviderId = _providerId,
            Status = QuotationStatus.Submitted,
            Subtotal = 25000,
            TotalAmount = 25000,
            ValidUntilUtc = DateTime.UtcNow.AddDays(7)
        };
        _dbContext.Quotations.Add(quotation);
        await _dbContext.SaveChangesAsync();

        _currentUserServiceMock.Setup(s => s.IsAuthenticated).Returns(true);
        _currentUserServiceMock.Setup(s => s.UserId).Returns(_ownerUserId);
        _currentUserServiceMock.Setup(s => s.Role).Returns(UserRole.Owner);

        var statusRequest = new UpdateQuotationStatusRequestDto
        {
            Status = QuotationStatus.Accepted
        };

        // Act
        var result = await _quotationSut.UpdateQuotationStatusAsync(quotation.Id, statusRequest);

        // Assert
        result.Should().NotBeNull();
        result.Status.Should().Be(QuotationStatus.Accepted);
    }

    [Fact]
    public async Task AddItemAsync_ShouldThrowValidationException_WhenQuotationIsAlreadyAccepted()
    {
        // Arrange
        var quotation = new Quotation
        {
            Id = Guid.NewGuid(),
            IncidentId = _incidentId,
            ProviderId = _providerId,
            Status = QuotationStatus.Accepted,
            Subtotal = 10000,
            TotalAmount = 10000
        };
        _dbContext.Quotations.Add(quotation);
        await _dbContext.SaveChangesAsync();

        _currentUserServiceMock.Setup(s => s.IsAuthenticated).Returns(true);
        _currentUserServiceMock.Setup(s => s.UserId).Returns(_providerUserId);
        _currentUserServiceMock.Setup(s => s.Role).Returns(UserRole.ServiceProvider);

        var newItemRequest = new CreateQuotationItemRequestDto
        {
            Description = "Extra part",
            Quantity = 1,
            UnitPrice = 500
        };

        // Act
        Func<Task> act = async () => await _quotationSut.AddItemAsync(quotation.Id, newItemRequest);

        // Assert
        var ex = await act.Should().ThrowAsync<ValidationException>();
        ex.Which.Errors["Status"].Should().Contain("Cannot add items to an accepted quotation.");
    }
}
