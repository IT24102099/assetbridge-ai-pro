using System.Text;
using AssetBridge.Application.Common.Interfaces;
using AssetBridge.Infrastructure.Persistence;
using AssetBridge.Infrastructure.Security;
using AssetBridge.Infrastructure.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;

namespace AssetBridge.Infrastructure;

// Configures Infrastructure layer services: PostgreSQL connection, EF Core, JWT Authentication, and Security services.
public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructureServices(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        // 1. PostgreSQL Database Configuration
        var connectionString = configuration.GetConnectionString("DefaultConnection");

        services.AddDbContext<AssetBridgeDbContext>(options =>
        {
            if (!string.IsNullOrEmpty(connectionString))
            {
                options.UseNpgsql(connectionString, npgsqlOptions =>
                {
                    npgsqlOptions.MigrationsAssembly(typeof(AssetBridgeDbContext).Assembly.FullName);
                    npgsqlOptions.EnableRetryOnFailure(
                        maxRetryCount: 3,
                        maxRetryDelay: TimeSpan.FromSeconds(5),
                        errorCodesToAdd: null);
                });
            }
            else
            {
                // Fallback for environment testing / initial setup before connection string is supplied
                options.UseInMemoryDatabase("AssetBridgeInMemoryDb");
            }
        });

        services.AddScoped<IApplicationDbContext>(provider =>
            provider.GetRequiredService<AssetBridgeDbContext>());

        // 2. JWT Configuration & Security
        var jwtSettingsSection = configuration.GetSection(JwtSettings.SectionName);
        services.Configure<JwtSettings>(jwtSettingsSection);

        var jwtSettings = jwtSettingsSection.Get<JwtSettings>() ?? new JwtSettings();
        var secretKey = !string.IsNullOrEmpty(jwtSettings.Secret)
            ? jwtSettings.Secret
            : "AssetBridgeAI_FallbackSecretKey_ForDevelopmentEnvironmentOnly_MustBeOverriddenInProduction_32Chars!";

        services.AddAuthentication(options =>
        {
            options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
            options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
        })
        .AddJwtBearer(options =>
        {
            options.RequireHttpsMetadata = false; // Set to true in production
            options.SaveToken = true;
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey)),
                ValidateIssuer = true,
                ValidIssuer = jwtSettings.Issuer,
                ValidateAudience = true,
                ValidAudience = jwtSettings.Audience,
                ValidateLifetime = true,
                ClockSkew = TimeSpan.Zero
            };
        });

        services.AddAuthorization();

        // 3. Security & Utility Services
        services.AddHttpContextAccessor();
        services.AddSingleton<IPasswordHasher, PasswordHasher>();
        services.AddSingleton<IJwtTokenGenerator, JwtTokenGenerator>();
        services.AddScoped<ICurrentUserService, CurrentUserService>();
        services.AddScoped<IDatabaseSeeder, DatabaseSeeder>();

        // 4. Internal Agentic AI Service Client (HttpClient factory with configured BaseAddress)
        services.AddHttpClient<AssetBridge.Application.Services.Interfaces.IAiAssistantService, AssetBridge.Infrastructure.Services.AiAssistantService>(client =>
        {
            var baseUrl = configuration["AiService:BaseUrl"] ?? "http://127.0.0.1:5001";
            client.BaseAddress = new Uri(baseUrl.TrimEnd('/') + "/api/v1/");
            client.Timeout = TimeSpan.FromSeconds(35);
        });

        return services;
    }
}
