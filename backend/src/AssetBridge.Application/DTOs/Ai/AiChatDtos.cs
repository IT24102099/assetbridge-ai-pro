using System.Text.Json.Serialization;

namespace AssetBridge.Application.DTOs.Ai;

public class AiChatMessageDto
{
    [JsonPropertyName("role")]
    public string Role { get; set; } = string.Empty;

    [JsonPropertyName("content")]
    public string Content { get; set; } = string.Empty;
}

public class AiChatRequestDto
{
    [JsonPropertyName("message")]
    public string Message { get; set; } = string.Empty;

    [JsonPropertyName("history")]
    public List<AiChatMessageDto> History { get; set; } = new();

    [JsonPropertyName("asset_id")]
    public Guid? AssetId { get; set; }

    [JsonPropertyName("incident_id")]
    public Guid? IncidentId { get; set; }

    [JsonPropertyName("domain_hint")]
    public string? DomainHint { get; set; }
}

public class RagSourceCitationDto
{
    [JsonPropertyName("title")]
    public string Title { get; set; } = string.Empty;

    [JsonPropertyName("document_id")]
    public string DocumentId { get; set; } = string.Empty;

    [JsonPropertyName("domain")]
    public string Domain { get; set; } = string.Empty;

    [JsonPropertyName("section")]
    public string? Section { get; set; }

    [JsonPropertyName("relevance_score")]
    public double RelevanceScore { get; set; }

    [JsonPropertyName("source_type")]
    public string SourceType { get; set; } = "pdf";

    [JsonPropertyName("download_url")]
    public string? DownloadUrl { get; set; }
}

public class AiChatResponseDto
{
    [JsonPropertyName("answer")]
    public string Answer { get; set; } = string.Empty;

    [JsonPropertyName("domain_used")]
    public string DomainUsed { get; set; } = string.Empty;

    [JsonPropertyName("sources")]
    public List<RagSourceCitationDto> Sources { get; set; } = new();

    [JsonPropertyName("suggested_actions")]
    public List<string> SuggestedActions { get; set; } = new();

    [JsonPropertyName("provider_used")]
    public string ProviderUsed { get; set; } = "internal";

    [JsonPropertyName("model_used")]
    public string ModelUsed { get; set; } = "assetbridge-rag-v1";
}

public class RagDocumentDto
{
    [JsonPropertyName("document_id")]
    public string DocumentId { get; set; } = string.Empty;

    [JsonPropertyName("title")]
    public string Title { get; set; } = string.Empty;

    [JsonPropertyName("domain")]
    public string Domain { get; set; } = string.Empty;

    [JsonPropertyName("document_type")]
    public string DocumentType { get; set; } = "Guide";

    [JsonPropertyName("file_path")]
    public string FilePath { get; set; } = string.Empty;

    [JsonPropertyName("file_size_bytes")]
    public long FileSizeBytes { get; set; }

    [JsonPropertyName("chunks_count")]
    public int ChunksCount { get; set; }

    [JsonPropertyName("tags")]
    public List<string> Tags { get; set; } = new();
}

public class AiOrchestrationRequestDto
{
    [JsonPropertyName("workflow_instance_id")]
    public Guid WorkflowInstanceId { get; set; }

    [JsonPropertyName("asset_id")]
    public Guid AssetId { get; set; }

    [JsonPropertyName("incident_id")]
    public Guid IncidentId { get; set; }
}

public class AiToolExecutionRecordDto
{
    [JsonPropertyName("tool_name")]
    public string ToolName { get; set; } = string.Empty;

    [JsonPropertyName("started_at_utc")]
    public DateTime? StartedAtUtc { get; set; }

    [JsonPropertyName("completed_at_utc")]
    public DateTime? CompletedAtUtc { get; set; }

    [JsonPropertyName("duration_ms")]
    public long? DurationMs { get; set; }

    [JsonPropertyName("input_summary")]
    public string? InputSummary { get; set; }

    [JsonPropertyName("output_summary")]
    public string? OutputSummary { get; set; }

    [JsonPropertyName("status")]
    public string? Status { get; set; }

    [JsonPropertyName("validation_result")]
    public string? ValidationResult { get; set; }

    [JsonPropertyName("error_message")]
    public string? ErrorMessage { get; set; }
}

public class AiAgentSummaryDto
{
    [JsonPropertyName("agent_run_id")]
    public string AgentRunId { get; set; } = string.Empty;

    [JsonPropertyName("workflow_instance_id")]
    public string WorkflowInstanceId { get; set; } = string.Empty;

    [JsonPropertyName("agent_name")]
    public string AgentName { get; set; } = string.Empty;

    [JsonPropertyName("agent_type")]
    public string AgentType { get; set; } = string.Empty;

    [JsonPropertyName("status")]
    public string Status { get; set; } = string.Empty;

    [JsonPropertyName("started_at_utc")]
    public DateTime? StartedAtUtc { get; set; }

    [JsonPropertyName("completed_at_utc")]
    public DateTime? CompletedAtUtc { get; set; }

    [JsonPropertyName("duration_ms")]
    public long? DurationMs { get; set; }

    [JsonPropertyName("retry_count")]
    public int RetryCount { get; set; }

    [JsonPropertyName("decision_summary")]
    public string DecisionSummary { get; set; } = string.Empty;

    [JsonPropertyName("structured_payload")]
    public object? StructuredPayload { get; set; }

    [JsonPropertyName("tool_executions")]
    public List<AiToolExecutionRecordDto> ToolExecutions { get; set; } = new();

    [JsonPropertyName("error_message")]
    public string? ErrorMessage { get; set; }
}

public class AiOrchestrationResponseDto
{
    [JsonPropertyName("workflow_instance_id")]
    public string WorkflowInstanceId { get; set; } = string.Empty;

    [JsonPropertyName("asset_id")]
    public string AssetId { get; set; } = string.Empty;

    [JsonPropertyName("incident_id")]
    public string IncidentId { get; set; } = string.Empty;

    [JsonPropertyName("status")]
    public string Status { get; set; } = string.Empty;

    [JsonPropertyName("total_duration_ms")]
    public int TotalDurationMs { get; set; }

    [JsonPropertyName("executed_agents_count")]
    public int ExecutedAgentsCount { get; set; }

    [JsonPropertyName("governance_status")]
    public string GovernanceStatus { get; set; } = string.Empty;

    [JsonPropertyName("agent_summaries")]
    public List<AiAgentSummaryDto> AgentSummaries { get; set; } = new();

    [JsonPropertyName("final_proposal")]
    public object? FinalProposal { get; set; }

    [JsonPropertyName("approval_request")]
    public object? ApprovalRequest { get; set; }

    [JsonPropertyName("follow_up_scheduled")]
    public bool FollowUpScheduled { get; set; }
}
