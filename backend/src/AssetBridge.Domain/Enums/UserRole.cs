namespace AssetBridge.Domain.Enums;

// Defines user authorization roles across the AssetBridge AI ecosystem.
// A strongly-typed enum guarantees that invalid roles cannot be stored
// in the database or passed across API boundaries.
public enum UserRole
{
    // Overseas property owners who initiate incidents, review quotes, and approve work
    Owner = 1,

    // On-the-ground local representatives in Sri Lanka acting on behalf of owners
    Representative = 2,

    // Contractors and technicians performing inspections, quotes, and repairs
    ServiceProvider = 3,

    // Operational staff reviewing AI proposals, quotations, and orchestrating workflow
    Manager = 4,

    // System administrators managing master configurations, users, and audit records
    Admin = 5
}
