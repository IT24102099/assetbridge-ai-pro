namespace AssetBridge.Application.Common.Interfaces;

// Provides an abstraction for storing uploaded media (evidence photos, deed scans, etc.) in persistent cloud storage.
public interface IFileStorageService
{
    Task<string> UploadFileAsync(
        Stream fileStream,
        string fileName,
        string contentType,
        string folder = "assetbridge/evidence",
        CancellationToken cancellationToken = default);

    Task<bool> DeleteFileAsync(
        string fileUrl,
        CancellationToken cancellationToken = default);
}
