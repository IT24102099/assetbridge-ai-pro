using AssetBridge.Application.Common.Models;
using AssetBridge.Application.DTOs.Maintenance;
using AssetBridge.Application.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AssetBridge.Api.Controllers;

[Authorize]
public class QuotationsController : BaseApiController
{
    private readonly IQuotationService _quotationService;
    private readonly IBudgetValidationService _budgetService;
    private readonly IQuotationComparisonService _comparisonService;

    public QuotationsController(
        IQuotationService quotationService,
        IBudgetValidationService budgetService,
        IQuotationComparisonService comparisonService)
    {
        _quotationService = quotationService;
        _budgetService = budgetService;
        _comparisonService = comparisonService;
    }

    #region Quotation Management

    [HttpPost]
    [Authorize(Roles = "ServiceProvider,Manager,Admin")]
    [ProducesResponseType(typeof(ApiResponse<QuotationResponseDto>), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> CreateQuotation([FromBody] CreateQuotationRequestDto request, CancellationToken cancellationToken)
    {
        var result = await _quotationService.CreateQuotationAsync(request, cancellationToken);
        return HandleCreated($"/api/quotations/{result.Id}", result, "Quotation submitted successfully.");
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(ApiResponse<QuotationResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetQuotationById(Guid id, CancellationToken cancellationToken)
    {
        var result = await _quotationService.GetQuotationByIdAsync(id, cancellationToken);
        return HandleSuccess(result, "Quotation retrieved successfully.");
    }

    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<PagedResponse<QuotationResponseDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetQuotations([FromQuery] QuotationQueryParametersDto query, CancellationToken cancellationToken)
    {
        var result = await _quotationService.GetQuotationsAsync(query, cancellationToken);
        return HandleSuccess(result, "Quotations retrieved successfully.");
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "ServiceProvider,Manager,Admin")]
    [ProducesResponseType(typeof(ApiResponse<QuotationResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateQuotation(Guid id, [FromBody] UpdateQuotationRequestDto request, CancellationToken cancellationToken)
    {
        var result = await _quotationService.UpdateQuotationAsync(id, request, cancellationToken);
        return HandleSuccess(result, "Quotation updated successfully.");
    }

    [HttpPatch("{id:guid}/status")]
    [Authorize(Roles = "Owner,Manager,Admin,ServiceProvider")]
    [ProducesResponseType(typeof(ApiResponse<QuotationResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateQuotationStatus(Guid id, [FromBody] UpdateQuotationStatusRequestDto request, CancellationToken cancellationToken)
    {
        var result = await _quotationService.UpdateQuotationStatusAsync(id, request, cancellationToken);
        return HandleSuccess(result, "Quotation status updated successfully.");
    }

    #endregion

    #region Line Items

    [HttpPost("{quotationId:guid}/items")]
    [Authorize(Roles = "ServiceProvider,Manager,Admin")]
    [ProducesResponseType(typeof(ApiResponse<QuotationItemResponseDto>), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> AddItem(Guid quotationId, [FromBody] CreateQuotationItemRequestDto request, CancellationToken cancellationToken)
    {
        var result = await _quotationService.AddItemAsync(quotationId, request, cancellationToken);
        return HandleCreated($"/api/quotations/{quotationId}/items/{result.Id}", result, "Quotation item added successfully.");
    }

    [HttpPut("{quotationId:guid}/items/{itemId:guid}")]
    [Authorize(Roles = "ServiceProvider,Manager,Admin")]
    [ProducesResponseType(typeof(ApiResponse<QuotationItemResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateItem(Guid quotationId, Guid itemId, [FromBody] UpdateQuotationItemRequestDto request, CancellationToken cancellationToken)
    {
        var result = await _quotationService.UpdateItemAsync(quotationId, itemId, request, cancellationToken);
        return HandleSuccess(result, "Quotation item updated successfully.");
    }

    [HttpDelete("{quotationId:guid}/items/{itemId:guid}")]
    [Authorize(Roles = "ServiceProvider,Manager,Admin")]
    [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RemoveItem(Guid quotationId, Guid itemId, CancellationToken cancellationToken)
    {
        var result = await _quotationService.RemoveItemAsync(quotationId, itemId, cancellationToken);
        return HandleSuccess(result, "Quotation item removed successfully.");
    }

    #endregion

    #region Budget & Comparison

    [HttpPost("check-budget")]
    [Authorize(Roles = "Owner,Manager,Admin,Representative")]
    [ProducesResponseType(typeof(ApiResponse<BudgetCheckResultDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CheckBudget([FromBody] BudgetCheckRequestDto request, CancellationToken cancellationToken)
    {
        var result = await _budgetService.ValidateBudgetAsync(request, cancellationToken);
        return HandleSuccess(result, "Budget validation completed successfully.");
    }

    [HttpPost("compare")]
    [Authorize(Roles = "Owner,Manager,Admin,Representative")]
    [ProducesResponseType(typeof(ApiResponse<QuotationComparisonResultDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CompareQuotations([FromBody] QuotationComparisonRequestDto request, CancellationToken cancellationToken)
    {
        var result = await _comparisonService.CompareQuotationsAsync(request, cancellationToken);
        return HandleSuccess(result, "Quotation comparison completed successfully.");
    }

    #endregion
}
