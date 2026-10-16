using System;
using System.Collections.Generic;
using AssetBridge.Domain.Enums;

namespace AssetBridge.Application.DTOs.Workflow;

public class SendProposalToOwnerDto
{
    public Guid? QuotationId { get; set; }
    public string? ProposalNotes { get; set; }
}

public class OwnerProposalDecisionDto
{
    // "Approve" or "Reject"
    public string Decision { get; set; } = string.Empty;
    public string? RejectionReason { get; set; }
    public string? Comments { get; set; }
}

public class ProposalAlternativeDto
{
    // E.g. "RevisedQuotation", "AlternativeProvider", "AdjustScope", "ReInspection"
    public string AlternativeType { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Rationale { get; set; } = string.Empty;
    public string EstimatedCostRangeLkr { get; set; } = string.Empty;
    public double FeasibilityScore { get; set; }
    public string ActionCode { get; set; } = string.Empty;
    public string TargetUrl { get; set; } = string.Empty;
}

public class AssetMediaSummaryDto
{
    public Guid Id { get; set; }
    public string FileUrl { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public bool IsThumbnail { get; set; }
}

public class PropertyAssistantIncidentDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public IncidentCategory Category { get; set; }
    public string CategoryName { get; set; } = string.Empty;
    public IncidentPriority Priority { get; set; }
    public string PriorityName { get; set; } = string.Empty;
    public IncidentStatus Status { get; set; }
    public string StatusName { get; set; } = string.Empty;
    public decimal? EstimatedBudget { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public int EvidenceCount { get; set; }
    public List<string> EvidenceUrls { get; set; } = new();
    public Guid? AssignedRepresentativeId { get; set; }
    public string? AssignedRepresentativeName { get; set; }
    public Guid? ActiveWorkflowId { get; set; }
    public string? WorkflowState { get; set; }
}

public class PropertyAssistantInspectionDto
{
    public Guid Id { get; set; }
    public Guid IncidentId { get; set; }
    public string IncidentTitle { get; set; } = string.Empty;
    public DateTime ScheduledDate { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? InspectorName { get; set; }
    public string? FindingsSummary { get; set; }
    public int DefectCount { get; set; }
    public List<string> DefectDescriptions { get; set; } = new();
    public List<string> RecommendedActions { get; set; } = new();
    public bool FollowUpRequired { get; set; }
}

public class PropertyAssistantJobDto
{
    public Guid Id { get; set; }
    public Guid IncidentId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? ProviderName { get; set; }
    public DateTime? ScheduledDate { get; set; }
    public DateTime? CompletedDate { get; set; }
    public decimal? ApprovedBudget { get; set; }
    public decimal? ActualCost { get; set; }
    public bool IsOverdue { get; set; }
}

public class PropertyAssistantQuotationDto
{
    public Guid Id { get; set; }
    public Guid IncidentId { get; set; }
    public string? ProviderName { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal? MaterialCost { get; set; }
    public decimal? LaborCost { get; set; }
    public int ItemCount { get; set; }
    public string Status { get; set; } = string.Empty;
    public int WarrantyMonths { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public bool IsSentToOwner { get; set; }
}

public class PropertyWorkflowAssistantDto
{
    // Property Overview
    public Guid AssetId { get; set; }
    public string AssetCode { get; set; } = string.Empty;
    public string AssetName { get; set; } = string.Empty;
    public string PropertyTypeName { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string District { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public Guid OwnerId { get; set; }
    public string OwnerName { get; set; } = string.Empty;
    public string OwnerEmail { get; set; } = string.Empty;
    public string? AuthorizedRepresentativeName { get; set; }
    public string? ThumbnailUrl { get; set; }
    public List<AssetMediaSummaryDto> MediaList { get; set; } = new();

    // Aggregated Business Records
    public List<PropertyAssistantIncidentDto> Incidents { get; set; } = new();
    public List<PropertyAssistantInspectionDto> Inspections { get; set; } = new();
    public List<PropertyAssistantJobDto> MaintenanceJobs { get; set; } = new();
    public List<PropertyAssistantQuotationDto> Quotations { get; set; } = new();

    // Active Workflow & Human Governance
    public Guid? ActiveWorkflowId { get; set; }
    public string CurrentWorkflowState { get; set; } = "NoActiveWorkflow";
    public string CurrentStageLabel { get; set; } = "All Quiet";
    public string PlainLanguageSummary { get; set; } = string.Empty;
    public string ResponsibleRole { get; set; } = "Property Manager";

    // Proposal Lifecycle State
    public string ProposalStatus { get; set; } = "NotInitiated"; // "Draft", "SentToOwner", "ApprovedByOwner", "RejectedByOwner"
    public decimal? ProposedAmountLkr { get; set; }
    public string? ProposedProviderName { get; set; }
    public Guid? ProposedQuotationId { get; set; }
    public DateTime? ProposalSentAtUtc { get; set; }
    public DateTime? OwnerDecidedAtUtc { get; set; }
    public string? OwnerRejectionReason { get; set; }
    public string? OwnerComments { get; set; }
    public List<ProposalAlternativeDto> RejectionAlternatives { get; set; } = new();

    // Categorized Intelligence (Phase 6 Grounding Requirement)
    public List<string> ConfirmedFacts { get; set; } = new();
    public List<string> AiRecommendations { get; set; } = new();
    public List<string> MissingInformation { get; set; } = new();
    public List<string> AwaitingHumanDecision { get; set; } = new();

    // Recommended Next Action
    public WorkflowNextBestActionDto RecommendedNextAction { get; set; } = new();

    // Observability & Continuity
    public int AuditEventsCount { get; set; }
    public string? RecentAuditHighlight { get; set; }
    public int ActiveFollowUpsCount { get; set; }
    public List<FollowUpTaskDto> FollowUpTasks { get; set; } = new();
    public bool IsAiServiceConnected { get; set; } = true;
}
