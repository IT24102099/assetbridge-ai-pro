using System.Net.Http.Json;
using System.Text.Json;
using AssetBridge.Application.DTOs.Ai;
using AssetBridge.Application.Services.Interfaces;
using Microsoft.Extensions.Logging;

namespace AssetBridge.Infrastructure.Services;

public class AiAssistantService : IAiAssistantService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<AiAssistantService> _logger;
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    public AiAssistantService(HttpClient httpClient, ILogger<AiAssistantService> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
    }

    public async Task<AiChatResponseDto> ChatAsync(AiChatRequestDto request, CancellationToken cancellationToken = default)
    {
        try
        {
            var response = await _httpClient.PostAsJsonAsync("chat", request, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                var errorBody = await response.Content.ReadAsStringAsync(cancellationToken);
                _logger.LogWarning("AI service returned HTTP {StatusCode}: {ErrorBody}", response.StatusCode, errorBody);
                return new AiChatResponseDto
                {
                    Answer = "AI Assistant is temporarily unavailable. Please try again in a few moments.",
                    DomainUsed = "INCIDENT_KNOWLEDGE"
                };
            }

            var result = await response.Content.ReadFromJsonAsync<AiChatResponseDto>(JsonOptions, cancellationToken);
            return result ?? new AiChatResponseDto { Answer = "Received empty response from AI service." };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to communicate with internal AI service on /api/v1/chat");
            return new AiChatResponseDto
            {
                Answer = "AI Assistant is temporarily unavailable. Please verify that the internal AI service is operational.",
                DomainUsed = "INCIDENT_KNOWLEDGE"
            };
        }
    }

    public async Task<AiOrchestrationResponseDto> OrchestrateWorkflowAsync(AiOrchestrationRequestDto request, string callerUserId, CancellationToken cancellationToken = default)
    {
        try
        {
            var payload = new
            {
                workflow_instance_id = request.WorkflowInstanceId.ToString(),
                asset_id = request.AssetId.ToString(),
                incident_id = request.IncidentId.ToString(),
                caller_user_id = callerUserId
            };

            var response = await _httpClient.PostAsJsonAsync("orchestrate", payload, cancellationToken);
            response.EnsureSuccessStatusCode();

            var result = await response.Content.ReadFromJsonAsync<AiOrchestrationResponseDto>(JsonOptions, cancellationToken);
            return result ?? new AiOrchestrationResponseDto { Status = "FAILED" };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to orchestrate multi-agent workflow on internal AI service");
            throw new InvalidOperationException("Failed to invoke multi-agent orchestration pipeline on internal AI microservice.", ex);
        }
    }

    public async Task<IReadOnlyList<RagDocumentDto>> GetDocumentsAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            var response = await _httpClient.GetAsync("documents", cancellationToken);
            if (!response.IsSuccessStatusCode)
                return Array.Empty<RagDocumentDto>();

            var docs = await response.Content.ReadFromJsonAsync<List<RagDocumentDto>>(JsonOptions, cancellationToken);
            return docs ?? new List<RagDocumentDto>();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve RAG documents from internal AI service");
            return Array.Empty<RagDocumentDto>();
        }
    }

    public async Task<(byte[] Bytes, string ContentType, string FileName)> DownloadDocumentAsync(string documentId, CancellationToken cancellationToken = default)
    {
        var response = await _httpClient.GetAsync($"documents/{documentId}/download", cancellationToken);
        response.EnsureSuccessStatusCode();

        var bytes = await response.Content.ReadAsByteArrayAsync(cancellationToken);
        var contentType = response.Content.Headers.ContentType?.MediaType ?? "application/pdf";
        var fileName = response.Content.Headers.ContentDisposition?.FileName ?? $"{documentId}.pdf";

        return (bytes, contentType, fileName);
    }
}
