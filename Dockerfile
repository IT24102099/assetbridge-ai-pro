# ==============================================================================
# AssetBridge AI — ASP.NET Core API Production Dockerfile (.NET 8)
# Multi-stage build for optimal performance, minimal image size, and cloud readiness
# Supports Render, Railway, Azure Container Apps, AWS ECS, and local Docker
# ==============================================================================

# Stage 1: Build & Publish
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# 1. Copy solution and project files for layer caching during restore
COPY backend/AssetBridge.sln backend/
COPY backend/src/AssetBridge.Domain/AssetBridge.Domain.csproj backend/src/AssetBridge.Domain/
COPY backend/src/AssetBridge.Application/AssetBridge.Application.csproj backend/src/AssetBridge.Application/
COPY backend/src/AssetBridge.Infrastructure/AssetBridge.Infrastructure.csproj backend/src/AssetBridge.Infrastructure/
COPY backend/src/AssetBridge.Api/AssetBridge.Api.csproj backend/src/AssetBridge.Api/
COPY backend/tests/AssetBridge.UnitTests/AssetBridge.UnitTests.csproj backend/tests/AssetBridge.UnitTests/

# 2. Restore NuGet dependencies
RUN dotnet restore backend/AssetBridge.sln

# 3. Copy full backend source code
COPY backend/ backend/

# 4. Publish Web API in Release configuration
WORKDIR /src/backend/src/AssetBridge.Api
RUN dotnet publish AssetBridge.Api.csproj -c Release -o /app/publish /p:UseAppHost=false

# Stage 2: Production Runtime
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app

# Copy published artifacts from build stage
COPY --from=build /app/publish .

# Default ASP.NET Core port
ENV ASPNETCORE_HTTP_PORTS=8080
EXPOSE 8080

# Dynamic port binding: uses Render/Cloud $PORT if provided, defaulting to 8080
# Uses 'exec' to ensure SIGTERM/SIGINT signals propagate directly to the .NET process
ENTRYPOINT ["sh", "-c", "exec dotnet AssetBridge.Api.dll --urls http://0.0.0.0:${PORT:-8080}"]
