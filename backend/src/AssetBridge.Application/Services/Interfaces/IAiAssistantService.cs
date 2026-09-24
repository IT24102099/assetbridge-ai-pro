using AssetBridge.Application.DTOs.Ai;

namespace AssetBridge.Application.Services.Interfaces;

public interface IAiAssistantService
{
    Task<AiChatResponseDto> ChatAsync(AiChatRequestDto request, CancellationToken cancellationToken = default);
    Task<AiOrchestrationResponseDto> OrchestrateWorkflowAsync(AiOrchestrationRequestDto request, string callerUserId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<RagDocumentDto>> GetDocumentsAsync(CancellationToken cancellationToken = default);
    Task<(byte[] Bytes, string ContentType, string FileName)> DownloadDocumentAsync(string documentId, CancellationToken cancellationToken = default);
}
