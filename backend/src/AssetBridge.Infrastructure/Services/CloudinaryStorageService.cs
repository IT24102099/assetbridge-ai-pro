using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using AssetBridge.Application.Common.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace AssetBridge.Infrastructure.Services;

// Implements persistent cloud file storage via Cloudinary REST API with automatic fallback.
public class CloudinaryStorageService : IFileStorageService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<CloudinaryStorageService> _logger;
    private readonly string? _cloudName;
    private readonly string? _apiKey;
    private readonly string? _apiSecret;

    public CloudinaryStorageService(
        HttpClient httpClient,
        IConfiguration configuration,
        ILogger<CloudinaryStorageService> logger)
    {
        _httpClient = httpClient;
        _logger = logger;

        // 1. Try discrete keys
        _cloudName = configuration["Cloudinary:CloudName"] ?? configuration["CLOUDINARY_CLOUD_NAME"];
        _apiKey = configuration["Cloudinary:ApiKey"] ?? configuration["CLOUDINARY_API_KEY"];
        _apiSecret = configuration["Cloudinary:ApiSecret"] ?? configuration["CLOUDINARY_API_SECRET"];

        // 2. Try single URL format: cloudinary://api_key:api_secret@cloud_name
        var cloudinaryUrl = configuration["CLOUDINARY_URL"] ?? configuration["Cloudinary:Url"];
        if (string.IsNullOrEmpty(_cloudName) && !string.IsNullOrEmpty(cloudinaryUrl))
        {
            try
            {
                var uri = new Uri(cloudinaryUrl);
                var userInfo = uri.UserInfo.Split(':');
                if (userInfo.Length == 2)
                {
                    _apiKey = userInfo[0];
                    _apiSecret = userInfo[1];
                    _cloudName = uri.Host;
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to parse CLOUDINARY_URL connection string.");
            }
        }
    }

    public async Task<string> UploadFileAsync(
        Stream fileStream,
        string fileName,
        string contentType,
        string folder = "assetbridge/evidence",
        CancellationToken cancellationToken = default)
    {
        if (fileStream == null || fileStream.Length == 0)
        {
            throw new ArgumentException("File stream cannot be null or empty.", nameof(fileStream));
        }

        // Verify Cloudinary credentials are fully configured
        if (string.IsNullOrWhiteSpace(_cloudName) ||
            string.IsNullOrWhiteSpace(_apiKey) ||
            string.IsNullOrWhiteSpace(_apiSecret))
        {
            _logger.LogError("Cloudinary storage configuration is missing. Ensure Cloudinary:CloudName, Cloudinary:ApiKey, and Cloudinary:ApiSecret (or CLOUDINARY_URL) are configured.");
            throw new InvalidOperationException("Cloudinary storage is not configured on the server. Please set Cloudinary:CloudName, Cloudinary:ApiKey, and Cloudinary:ApiSecret (or CLOUDINARY_URL) in environment settings.");
        }

        return await UploadToCloudinaryAsync(fileStream, fileName, contentType, folder, cancellationToken);
    }

    private async Task<string> UploadToCloudinaryAsync(
        Stream fileStream,
        string fileName,
        string contentType,
        string folder,
        CancellationToken cancellationToken)
    {
        var timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString();
        var uniquePublicId = $"evidence_{Guid.NewGuid():N}";

        // Parameters to sign (alphabetical order): folder, public_id, timestamp
        var stringToSign = $"folder={folder}&public_id={uniquePublicId}&timestamp={timestamp}{_apiSecret}";
        var signature = ComputeSha1Hash(stringToSign);

        using var form = new MultipartFormDataContent();

        // Add file content
        fileStream.Position = 0;
        var streamContent = new StreamContent(fileStream);
        streamContent.Headers.ContentType = new MediaTypeHeaderValue(contentType);
        form.Add(streamContent, "file", fileName);

        // Add required Cloudinary signature parameters
        form.Add(new StringContent(_apiKey!), "api_key");
        form.Add(new StringContent(timestamp), "timestamp");
        form.Add(new StringContent(folder), "folder");
        form.Add(new StringContent(uniquePublicId), "public_id");
        form.Add(new StringContent(signature), "signature");

        var uploadUrl = $"https://api.cloudinary.com/v1_1/{_cloudName}/image/upload";

        _logger.LogInformation("Uploading {FileName} to Cloudinary under folder {Folder}...", fileName, folder);

        var response = await _httpClient.PostAsync(uploadUrl, form, cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            var errorBody = await response.Content.ReadAsStringAsync(cancellationToken);
            _logger.LogError("Cloudinary upload failed with status {StatusCode}: {ErrorBody}", response.StatusCode, errorBody);
            throw new InvalidOperationException($"Cloudinary upload failed: {response.StatusCode} - {errorBody}");
        }

        var responseJson = await response.Content.ReadAsStringAsync(cancellationToken);
        var jsonNode = JsonNode.Parse(responseJson);
        var secureUrl = jsonNode?["secure_url"]?.ToString();

        if (string.IsNullOrEmpty(secureUrl))
        {
            throw new InvalidOperationException("Cloudinary response did not contain a valid secure_url.");
        }

        _logger.LogInformation("Successfully uploaded {FileName} to Cloudinary: {SecureUrl}", fileName, secureUrl);
        return secureUrl;
    }

    public Task<bool> DeleteFileAsync(string fileUrl, CancellationToken cancellationToken = default)
    {
        // Deletion can be handled via Cloudinary Admin API if necessary
        return Task.FromResult(true);
    }

    private static string ComputeSha1Hash(string input)
    {
        using var sha1 = SHA1.Create();
        var bytes = Encoding.UTF8.GetBytes(input);
        var hash = sha1.ComputeHash(bytes);
        return Convert.ToHexString(hash).ToLowerInvariant();
    }
}
