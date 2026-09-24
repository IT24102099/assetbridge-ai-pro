using AssetBridge.Application.DTOs.Maintenance;
using AssetBridge.Application.Services.Implementations;
using AssetBridge.Domain.Entities.Assets;
using AssetBridge.Domain.Entities.Incidents;
using AssetBridge.Domain.Entities.Maintenance;
using AssetBridge.Domain.Entities.Providers;
using AssetBridge.Domain.Entities.Users;
using AssetBridge.Domain.Enums;
using AssetBridge.Infrastructure.Persistence;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace AssetBridge.UnitTests.Services;

public class BudgetAndComparisonServiceTests : IDisposable
{
    private readonly AssetBridgeDbContext _dbContext;
    private readonly BudgetValidationService _budgetSut;
    private readonly QuotationComparisonService _comparisonSut;

    private readonly Guid _incidentId = Guid.NewGuid();
    private readonly Guid _provider1Id = Guid.NewGuid();
    private readonly Guid _provider2Id = Guid.NewGuid();

    public BudgetAndComparisonServiceTests()
    {
        var dbOptions = new DbContextOptionsBuilder<AssetBridgeDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _dbContext = new AssetBridgeDbContext(dbOptions);

        _budgetSut = new BudgetValidationService(
            _dbContext,
            new Mock<ILogger<BudgetValidationService>>().Object);

        _comparisonSut = new QuotationComparisonService(
            _dbContext,
            new Mock<ILogger<QuotationComparisonService>>().Object);

        SeedTestData();
    }

    private void SeedTestData()
    {
        var ownerId = Guid.NewGuid();
        var assetId = Guid.NewGuid();

        _dbContext.Users.Add(new User { Id = ownerId, FullName = "Owner User", Email = "owner@test.lk", Role = UserRole.Owner });
        _dbContext.Assets.Add(new Asset
        {
            Id = assetId,
            OwnerId = ownerId,
            Name = "Kandy Hill House",
            AddressLine1 = "55 Hill Street",
            City = "Kandy",
            District = "Kandy",
            PropertyType = PropertyType.SingleFamilyHouse
        });

        _dbContext.Incidents.Add(new Incident
        {
            Id = _incidentId,
            AssetId = assetId,
            ReportedByUserId = ownerId,
            Title = "Kitchen Pipe Leak",
            Description = "Burst pipe",
            Category = IncidentCategory.Plumbing,
            Priority = IncidentPriority.High,
            EstimatedBudget = 60000 // 60,000 LKR Budget
        });

        _dbContext.ServiceProviders.AddRange(
            new ServiceProvider
            {
                Id = _provider1Id,
                UserId = Guid.NewGuid(),
                BusinessName = "Lanka Plumb Tech",
                ContactPerson = "Sunil",
                PhoneNumber = "0771111111",
                Email = "sunil@plumb.lk",
                PrimaryDistrict = "Kandy",
                City = "Kandy",
                VerificationStatus = VerificationStatus.Verified,
                Rating = 4.8
            },
            new ServiceProvider
            {
                Id = _provider2Id,
                UserId = Guid.NewGuid(),
                BusinessName = "Quick Fix Plumbers",
                ContactPerson = "Kamal",
                PhoneNumber = "0772222222",
                Email = "kamal@quickfix.lk",
                PrimaryDistrict = "Kandy",
                City = "Kandy",
                VerificationStatus = VerificationStatus.Pending,
                Rating = 4.0
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
    public async Task ValidateBudget_WhenQuotationIsUnderBudget_ShouldReturnIsWithinBudgetTrue()
    {
        var request = new BudgetCheckRequestDto
        {
            IncidentId = _incidentId,
            QuotationAmount = 45000 // 45,000 vs 60,000 budget
        };

        var result = await _budgetSut.ValidateBudgetAsync(request);

        result.Should().NotBeNull();
        result.EstimatedBudget.Should().Be(60000);
        result.QuotationAmount.Should().Be(45000);
        result.DifferenceAmount.Should().Be(15000); // 15,000 under budget
        result.IsWithinBudget.Should().BeTrue();
        result.BudgetUtilizationPercentage.Should().Be(75.0);
        result.Explanation.Should().Contain("Within owner's budget");
    }

    [Fact]
    public async Task ValidateBudget_WhenQuotationExceedsBudget_ShouldReturnIsWithinBudgetFalse()
    {
        var request = new BudgetCheckRequestDto
        {
            IncidentId = _incidentId,
            QuotationAmount = 75000 // 75,000 vs 60,000 budget
        };

        var result = await _budgetSut.ValidateBudgetAsync(request);

        result.Should().NotBeNull();
        result.IsWithinBudget.Should().BeFalse();
        result.DifferenceAmount.Should().Be(-15000); // Exceeds by 15,000
        result.BudgetUtilizationPercentage.Should().Be(125.0);
        result.Explanation.Should().Contain("Exceeds owner's budget");
    }

    [Fact]
    public async Task CompareQuotations_ShouldRankCheaperAndVerifiedQuoteHigher()
    {
        // Quotation 1: 45,000 LKR by Verified Provider with 4.8 rating
        // Quotation 2: 70,000 LKR by Pending Provider with 4.0 rating
        var q1 = new Quotation
        {
            Id = Guid.NewGuid(),
            IncidentId = _incidentId,
            ProviderId = _provider1Id,
            ValidUntilUtc = DateTime.UtcNow.AddDays(10),
            Subtotal = 40000,
            TaxAndOtherCharges = 5000,
            TotalAmount = 45000,
            Status = QuotationStatus.Submitted
        };

        var q2 = new Quotation
        {
            Id = Guid.NewGuid(),
            IncidentId = _incidentId,
            ProviderId = _provider2Id,
            ValidUntilUtc = DateTime.UtcNow.AddDays(10),
            Subtotal = 65000,
            TaxAndOtherCharges = 5000,
            TotalAmount = 70000,
            Status = QuotationStatus.Submitted
        };

        _dbContext.Quotations.AddRange(q1, q2);
        await _dbContext.SaveChangesAsync();

        var request = new QuotationComparisonRequestDto
        {
            IncidentId = _incidentId
        };

        var comparison = await _comparisonSut.CompareQuotationsAsync(request);

        comparison.Should().NotBeNull();
        comparison.QuotationsEvaluatedCount.Should().Be(2);
        comparison.LowestQuotationAmount.Should().Be(45000);
        comparison.RecommendedQuotationId.Should().Be(q1.Id);

        var topCandidate = comparison.Candidates.First();
        topCandidate.QuotationId.Should().Be(q1.Id);
        topCandidate.IsLowestCost.Should().BeTrue();
        topCandidate.IsWithinBudget.Should().BeTrue();
        topCandidate.ComparisonScore.Should().BeGreaterThan(comparison.Candidates[1].ComparisonScore);
        topCandidate.ComparisonReasons.Should().Contain(r => r.Contains("Lowest quotation"));
    }
}
