using System.Text.Json.Serialization;
using AssetBridge.Api.Middleware;
using AssetBridge.Application;
using AssetBridge.Infrastructure;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

// 1. Configure Core Web API Services
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        // Serialize enum values as strings (e.g. "Owner" rather than 1) for frontend clarity
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
        options.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
    });

// 2. Configure Clean Architecture Layers
builder.Services.AddApplicationServices();
builder.Services.AddInfrastructureServices(builder.Configuration);

// 3. Configure CORS for React (Vite) and Flutter Clients
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? new[] { "http://localhost:5173", "http://localhost:3000" };

builder.Services.AddCors(options =>
{
    options.AddPolicy("AssetBridgeCorsPolicy", policy =>
    {
        policy.WithOrigins(allowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

// 4. Configure Swagger / OpenAPI with JWT Bearer Security Definition
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "AssetBridge AI API",
        Version = "v1",
        Description = "Unified Backend API for AssetBridge AI — Connecting Overseas Property Owners, Local Representatives, Service Providers, and Managers.",
        Contact = new OpenApiContact
        {
            Name = "AssetBridge AI Engineering Team",
            Email = "support@assetbridge.ai"
        }
    });

    // Define JWT Bearer security scheme in Swagger UI
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Enter 'Bearer' followed by a space and your JWT token.\r\n\r\nExample: \"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI...\""
    });

    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

var app = builder.Build();

// 5. Configure HTTP Request Pipeline

// Global Exception Handler: Translates unhandled exceptions into uniform ApiResponse<T>
app.UseMiddleware<GlobalExceptionHandlingMiddleware>();

// Enable Swagger UI for interactive API exploration and testing
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "AssetBridge AI API v1");
    c.RoutePrefix = string.Empty; // Serve Swagger UI at application root (http://localhost:port/)
});

app.UseCors("AssetBridgeCorsPolicy");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();

// Expose Program class for WebApplicationFactory in integration tests
public partial class Program { }
