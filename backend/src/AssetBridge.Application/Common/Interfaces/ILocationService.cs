namespace AssetBridge.Application.Common.Interfaces;

// Abstraction for geographic calculations (Haversine distance) and future 3rd-party mapping services.
public interface ILocationService
{
    // Computes the great-circle distance in kilometers between two GPS coordinates using the Haversine formula.
    double CalculateDistanceKm(double lat1, double lon1, double lat2, double lon2);

    // Checks if target coordinates fall within a given radius in kilometers.
    bool IsWithinRadius(double lat1, double lon1, double lat2, double lon2, double radiusKm);
}
