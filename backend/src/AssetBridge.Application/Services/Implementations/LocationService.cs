using AssetBridge.Application.Common.Interfaces;

namespace AssetBridge.Application.Services.Implementations;

// Implements deterministic great-circle distance calculations using the Haversine formula.
// Provides a clean abstraction that can be swapped or enhanced with external mapping APIs in the future without modifying core business logic.
public class LocationService : ILocationService
{
    private const double EarthRadiusKm = 6371.0;

    public double CalculateDistanceKm(double lat1, double lon1, double lat2, double lon2)
    {
        var dLat = ToRadians(lat2 - lat1);
        var dLon = ToRadians(lon2 - lon1);

        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                Math.Cos(ToRadians(lat1)) * Math.Cos(ToRadians(lat2)) *
                Math.Sin(dLon / 2) * Math.Sin(dLon / 2);

        var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
        return Math.Round(EarthRadiusKm * c, 2);
    }

    public bool IsWithinRadius(double lat1, double lon1, double lat2, double lon2, double radiusKm)
    {
        return CalculateDistanceKm(lat1, lon1, lat2, lon2) <= radiusKm;
    }

    private static double ToRadians(double degrees)
    {
        return degrees * (Math.PI / 180.0);
    }
}
