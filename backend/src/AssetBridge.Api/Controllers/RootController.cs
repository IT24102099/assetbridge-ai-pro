using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AssetBridge.Api.Controllers;

// Handles GET / at application root to provide structured API information and discoverability
// for developers, uptime checks, and client applications.
[AllowAnonymous]
[ApiController]
[Route("")]
public class RootController : ControllerBase
{
    private readonly IWebHostEnvironment _environment;

    public RootController(IWebHostEnvironment environment)
    {
        _environment = environment;
    }

    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public IActionResult GetApiInformation()
    {
        var apiInfo = new
        {
            Application = "AssetBridge AI API",
            Tagline = "Your Assets. Always Closer.",
            Status = "Online",
            Version = "v1",
            Environment = _environment.EnvironmentName,
            TimestampUtc = DateTime.UtcNow,
            Endpoints = new
            {
                SwaggerUi = "/swagger",
                SwaggerJson = "/swagger/v1/swagger.json",
                HealthProbe = "/health",
                Authentication = "/api/auth",
                Assets = "/api/assets",
                Incidents = "/api/incidents",
                Providers = "/api/providers",
                Representatives = "/api/representatives",
                Inspections = "/api/inspections",
                MaintenanceJobs = "/api/maintenance-jobs",
                Quotations = "/api/quotations"
            }
        };

        return Ok(apiInfo);
    }
}
