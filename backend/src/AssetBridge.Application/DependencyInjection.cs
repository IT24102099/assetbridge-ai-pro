using AssetBridge.Application.Services.Implementations;
using AssetBridge.Application.Services.Interfaces;
using Microsoft.Extensions.DependencyInjection;

namespace AssetBridge.Application;

// Registers Application layer services into the standard Microsoft Dependency Injection container.
// Encapsulating registration within an extension method keeps Program.cs clean and modular.
public static class DependencyInjection
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IAssetHistoryService, AssetHistoryService>();
        services.AddScoped<IAssetService, AssetService>();
        services.AddScoped<IIncidentService, IncidentService>();

        // Member 2: Representative & Service Provider Coordination
        services.AddSingleton<Common.Interfaces.ILocationService, LocationService>();
        services.AddScoped<IRepresentativeService, RepresentativeService>();
        services.AddScoped<IServiceProviderService, ServiceProviderService>();
        services.AddScoped<IProviderSkillService, ProviderSkillService>();
        services.AddScoped<IProviderAvailabilityService, ProviderAvailabilityService>();
        services.AddScoped<IProviderHistoryService, ProviderHistoryService>();
        services.AddScoped<IProviderMatchingService, ProviderMatchingService>();

        return services;
    }
}
