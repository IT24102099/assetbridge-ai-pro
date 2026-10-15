using System.Text.Json.Serialization;

namespace AssetBridge.Application.DTOs.Workflow;

public class WorkflowAssociatedContextDto
{
    [JsonPropertyName("incident_id")]
    public Guid IncidentId { get; set; }

    [JsonPropertyName("incident_title")]
    public string IncidentTitle { get; set; } = string.Empty;

    [JsonPropertyName("incident_priority")]
    public string IncidentPriority { get; set; } = string.Empty;

    [JsonPropertyName("asset_id")]
    public Guid AssetId { get; set; }

    [JsonPropertyName("asset_name")]
    public string AssetName { get; set; } = string.Empty;

    [JsonPropertyName("asset_city")]
    public string AssetCity { get; set; } = string.Empty;

    [JsonPropertyName("quotation_id")]
    public Guid? QuotationId { get; set; }

    [JsonPropertyName("quotation_title")]
    public string? QuotationTitle { get; set; }

    [JsonPropertyName("quotation_amount")]
    public decimal? QuotationAmount { get; set; }

    [JsonPropertyName("quotation_status")]
    public string? QuotationStatus { get; set; }

    [JsonPropertyName("maintenance_job_id")]
    public Guid? MaintenanceJobId { get; set; }

    [JsonPropertyName("maintenance_job_title")]
    public string? MaintenanceJobTitle { get; set; }

    [JsonPropertyName("maintenance_job_status")]
    public string? MaintenanceJobStatus { get; set; }

    [JsonPropertyName("scheduled_dates")]
    public string? ScheduledDates { get; set; }

    [JsonPropertyName("provider_name")]
    public string? ProviderName { get; set; }
}

public class WorkflowNextBestActionDto
{
    [JsonPropertyName("title")]
    public string Title { get; set; } = string.Empty;

    [JsonPropertyName("action_code")]
    public string ActionCode { get; set; } = string.Empty;

    [JsonPropertyName("description")]
    public string Description { get; set; } = string.Empty;

    [JsonPropertyName("why_it_matters")]
    public string WhyItMatters { get; set; } = string.Empty;

    [JsonPropertyName("prerequisites")]
    public List<string> Prerequisites { get; set; } = new();

    [JsonPropertyName("what_happens_next")]
    public string WhatHappensNext { get; set; } = string.Empty;

    [JsonPropertyName("confidence_score")]
    public double ConfidenceScore { get; set; } = 0.95;

    [JsonPropertyName("target_url")]
    public string? TargetUrl { get; set; }
}

public class WorkflowAiAssistanceDto
{
    [JsonPropertyName("workflow_instance_id")]
    public Guid WorkflowInstanceId { get; set; }

    [JsonPropertyName("current_state")]
    public string CurrentState { get; set; } = string.Empty;

    [JsonPropertyName("current_stage_label")]
    public string CurrentStageLabel { get; set; } = string.Empty;

    [JsonPropertyName("plain_language_summary")]
    public string PlainLanguageSummary { get; set; } = string.Empty;

    [JsonPropertyName("associated_context")]
    public WorkflowAssociatedContextDto AssociatedContext { get; set; } = new();

    [JsonPropertyName("completed_milestones")]
    public List<string> CompletedMilestones { get; set; } = new();

    [JsonPropertyName("pending_requirements")]
    public List<string> PendingRequirements { get; set; } = new();

    [JsonPropertyName("blockers")]
    public List<string> Blockers { get; set; } = new();

    [JsonPropertyName("responsible_role")]
    public string ResponsibleRole { get; set; } = string.Empty;

    [JsonPropertyName("recommended_next_action")]
    public WorkflowNextBestActionDto RecommendedNextAction { get; set; } = new();

    [JsonPropertyName("audit_summary")]
    public string AuditSummary { get; set; } = string.Empty;

    [JsonPropertyName("active_follow_ups_count")]
    public int ActiveFollowUpsCount { get; set; }

    [JsonPropertyName("is_ai_service_connected")]
    public bool IsAiServiceConnected { get; set; }

    [JsonPropertyName("provider_used")]
    public string ProviderUsed { get; set; } = "internal";

    [JsonPropertyName("model_used")]
    public string ModelUsed { get; set; } = "validation-and-continuity-agent-v1";
}

public class WorkflowAiAskRequestDto
{
    [JsonPropertyName("question")]
    public string Question { get; set; } = string.Empty;

    [JsonPropertyName("workflow_instance_id")]
    public Guid WorkflowInstanceId { get; set; }
}

public class WorkflowAiAskResponseDto
{
    [JsonPropertyName("question")]
    public string Question { get; set; } = string.Empty;

    [JsonPropertyName("answer")]
    public string Answer { get; set; } = string.Empty;

    [JsonPropertyName("context_facts_used")]
    public List<string> ContextFactsUsed { get; set; } = new();

    [JsonPropertyName("suggested_next_step")]
    public string? SuggestedNextStep { get; set; }

    [JsonPropertyName("suggested_role")]
    public string? SuggestedRole { get; set; }

    [JsonPropertyName("direct_action_available")]
    public bool DirectActionAvailable { get; set; }

    [JsonPropertyName("action_code")]
    public string? ActionCode { get; set; }
}
