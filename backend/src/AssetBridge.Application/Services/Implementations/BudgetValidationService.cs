using AssetBridge.Application.Common.Interfaces;
using AssetBridge.Application.DTOs.Maintenance;
using AssetBridge.Application.Services.Interfaces;
using AssetBridge.Domain.Entities.Incidents;
using AssetBridge.Domain.Entities.Maintenance;
using AssetBridge.Domain.Exceptions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace AssetBridge.Application.Services.Implementations;

public class BudgetValidationService : IBudgetValidationService
{
    private readonly IApplicationDbContext _context;
    private readonly ILogger<BudgetValidationService> _logger;

    public BudgetValidationService(
        IApplicationDbContext context,
        ILogger<BudgetValidationService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<BudgetCheckResultDto> ValidateBudgetAsync(BudgetCheckRequestDto request, CancellationToken cancellationToken = default)
    {
        decimal budget = request.EstimatedBudget ?? 0;
        decimal amount = request.QuotationAmount ?? 0;

        if (request.IncidentId.HasValue)
        {
            var incident = await _context.Incidents
                .AsNoTracking()
                .FirstOrDefaultAsync(i => i.Id == request.IncidentId.Value, cancellationToken);

            if (incident == null)
            {
                throw new EntityNotFoundException(nameof(Incident), request.IncidentId.Value);
            }

            budget = incident.EstimatedBudget ?? budget;
        }

        if (request.QuotationId.HasValue)
        {
            var quotation = await _context.Quotations
                .AsNoTracking()
                .FirstOrDefaultAsync(q => q.Id == request.QuotationId.Value, cancellationToken);

            if (quotation == null)
            {
                throw new EntityNotFoundException(nameof(Quotation), request.QuotationId.Value);
            }

            amount = quotation.TotalAmount;
        }

        var difference = budget - amount;
        var isWithinBudget = budget <= 0 || amount <= budget;
        var utilization = budget > 0 ? Math.Round((double)(amount / budget) * 100.0, 1) : 100.0;

        string explanation;
        if (budget <= 0)
        {
            explanation = $"Quotation total is LKR {amount:N2}. No owner budget ceiling was specified for this incident.";
        }
        else if (isWithinBudget)
        {
            explanation = $"Within owner's budget: LKR {Math.Abs(difference):N2} remaining ({utilization:F1}% of LKR {budget:N2} budget utilized).";
        }
        else
        {
            explanation = $"Exceeds owner's budget by LKR {Math.Abs(difference):N2} ({utilization:F1}% of LKR {budget:N2} budget).";
        }

        _logger.LogInformation("Budget validation calculated for Amount: {Amount}, Budget: {Budget}, Within: {Within}",
            amount, budget, isWithinBudget);

        return new BudgetCheckResultDto
        {
            IncidentId = request.IncidentId,
            QuotationId = request.QuotationId,
            EstimatedBudget = budget,
            QuotationAmount = amount,
            DifferenceAmount = difference,
            IsWithinBudget = isWithinBudget,
            BudgetUtilizationPercentage = utilization,
            Explanation = explanation
        };
    }
}
