using AssetBridge.Application.Common.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AssetBridge.Api.Controllers;

// Provides a public health probe endpoint used by uptime monitors, load balancers,
// and automated deployment checks to verify API and database readiness.
[AllowAnonymous]
public class HealthController : BaseApiController
{
    private readonly IApplicationDbContext _context;
    private readonly IWebHostEnvironment _environment;

    public HealthController(IApplicationDbContext context, IWebHostEnvironment environment)
    {
        _context = context;
        _environment = environment;
    }

    [HttpGet]
    public async Task<IActionResult> GetHealthStatus(CancellationToken cancellationToken)
    {
        var dbHealthy = false;
        string dbStatusMessage;

        try
        {
            // Lightweight connectivity check
            dbHealthy = await Task.Run(() => _context.Users != null, cancellationToken);
            dbStatusMessage = dbHealthy ? "Connected" : "Unavailable";
        }
        catch (Exception ex)
        {
            dbHealthy = false;
            dbStatusMessage = $"Connection failed: {ex.Message}";
        }

        var healthData = new
        {
            Service = "AssetBridge AI API",
            Status = "Healthy",
            Environment = _environment.EnvironmentName,
            TimestampUtc = DateTime.UtcNow,
            Database = new
            {
                Status = dbStatusMessage,
                IsAvailable = dbHealthy
            }
        };

        return HandleSuccess(healthData, "AssetBridge AI API is operational.");
    }
}
