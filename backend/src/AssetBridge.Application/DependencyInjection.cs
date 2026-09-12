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
        return services;
    }
}
