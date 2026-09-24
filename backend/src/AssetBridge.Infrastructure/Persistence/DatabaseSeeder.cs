using AssetBridge.Application.Common.Interfaces;
using AssetBridge.Domain.Entities.Users;
using AssetBridge.Domain.Entities.Representatives;
using AssetBridge.Domain.Entities.Providers;
using AssetBridge.Domain.Entities.Assets;
using AssetBridge.Domain.Entities.Incidents;
using AssetBridge.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace AssetBridge.Infrastructure.Persistence;

public class DatabaseSeeder : IDatabaseSeeder
{
    private readonly AssetBridgeDbContext _context;
    private readonly IPasswordHasher _passwordHasher;
    private readonly ILogger<DatabaseSeeder> _logger;

    public DatabaseSeeder(
        AssetBridgeDbContext context,
        IPasswordHasher passwordHasher,
        ILogger<DatabaseSeeder> logger)
    {
        _context = context;
        _passwordHasher = passwordHasher;
        _logger = logger;
    }

    public async Task SeedAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            if (_context.Database.IsRelational())
            {
                _logger.LogInformation("Applying database migrations to PostgreSQL...");
                await _context.Database.MigrateAsync(cancellationToken);
                _logger.LogInformation("Database migrations applied successfully.");
            }
            else
            {
                await _context.Database.EnsureCreatedAsync(cancellationToken);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to apply migrations automatically: {Message}. Attempting EnsureCreated...", ex.Message);
            try
            {
                await _context.Database.EnsureCreatedAsync(cancellationToken);
            }
            catch (Exception ensureEx)
            {
                _logger.LogError(ensureEx, "Failed to ensure database creation: {Message}", ensureEx.Message);
            }
        }

        try
        {
            await _context.Database.ExecuteSqlRawAsync(@"
                CREATE TABLE IF NOT EXISTS ""AssetMedia"" (
                    ""Id"" uuid NOT NULL PRIMARY KEY,
                    ""AssetId"" uuid NOT NULL REFERENCES ""Assets""(""Id"") ON DELETE CASCADE,
                    ""UploadedByUserId"" uuid NOT NULL REFERENCES ""Users""(""Id"") ON DELETE RESTRICT,
                    ""FileName"" character varying(255) NOT NULL,
                    ""FileUrl"" character varying(2000) NOT NULL,
                    ""FileType"" character varying(100),
                    ""FileSizeBytes"" bigint NOT NULL,
                    ""IsThumbnail"" boolean NOT NULL DEFAULT FALSE,
                    ""Caption"" character varying(500),
                    ""CreatedAtUtc"" timestamp with time zone NOT NULL,
                    ""UpdatedAtUtc"" timestamp with time zone
                );
                CREATE INDEX IF NOT EXISTS ""IX_AssetMedia_AssetId"" ON ""AssetMedia""(""AssetId"");
                CREATE INDEX IF NOT EXISTS ""IX_AssetMedia_AssetId_IsThumbnail"" ON ""AssetMedia""(""AssetId"", ""IsThumbnail"");
            ", cancellationToken);
        }
        catch (Exception rawEx)
        {
            _logger.LogWarning(rawEx, "Note on ensuring AssetMedia schema: {Message}", rawEx.Message);
        }

        await SeedDemoUsersAsync(cancellationToken);
    }

    private async Task SeedDemoUsersAsync(CancellationToken cancellationToken)
    {
        var demoUsers = new List<(string Email, string FullName, UserRole Role, string Phone)>
        {
            // Primary demo credentials (@assetbridge.lk) matching UI quick-fill
            ("manager@assetbridge.lk", "Manager Perera", UserRole.Manager, "+94771234561"),
            ("owner@assetbridge.lk", "Owner Silva", UserRole.Owner, "+94771234562"),
            ("provider@assetbridge.lk", "Provider Repairs", UserRole.ServiceProvider, "+94771234563"),
            ("rep@assetbridge.lk", "Representative Fernando", UserRole.Representative, "+94771234564"),

            // Alternate domain aliases (@assetbridge.ai)
            ("manager@assetbridge.ai", "Manager Perera", UserRole.Manager, "+94771234561"),
            ("owner@assetbridge.ai", "Owner Silva", UserRole.Owner, "+94771234562"),
            ("provider@assetbridge.ai", "Provider Repairs", UserRole.ServiceProvider, "+94771234563"),
            ("rep@assetbridge.ai", "Representative Fernando", UserRole.Representative, "+94771234564")
        };

        const string demoPassword = "SecurePassword123!";
        var passwordHash = _passwordHasher.HashPassword(demoPassword);

        foreach (var (email, fullName, role, phone) in demoUsers)
        {
            var normalizedEmail = email.Trim().ToLowerInvariant();
            var existingUser = await _context.Users
                .FirstOrDefaultAsync(u => u.Email.ToLower() == normalizedEmail, cancellationToken);

            if (existingUser == null)
            {
                var newUser = new User
                {
                    Id = Guid.NewGuid(),
                    Email = normalizedEmail,
                    FullName = fullName,
                    Role = role,
                    PhoneNumber = phone,
                    PasswordHash = passwordHash,
                    IsActive = true,
                    CreatedAtUtc = DateTime.UtcNow
                };

                _context.Users.Add(newUser);
                _logger.LogInformation("Seeded demo user {Email} ({Role})", email, role);
            }
            else
            {
                // Ensure password hash and active status are up-to-date for demo users
                if (!existingUser.IsActive || !_passwordHasher.VerifyPassword(demoPassword, existingUser.PasswordHash))
                {
                    existingUser.PasswordHash = passwordHash;
                    existingUser.IsActive = true;
                    existingUser.Role = role;
                    existingUser.FullName = fullName;
                    _logger.LogInformation("Updated demo user {Email} credentials", email);
                }
            }
        }

        await _context.SaveChangesAsync(cancellationToken);
        _logger.LogInformation("Demo users verified and seeded successfully.");

        await SeedDemoRepresentativesAndProvidersAsync(cancellationToken);
        await SeedDemoAssetsAndIncidentsAsync(cancellationToken);
    }

    private async Task<User> GetOrCreateSeedUserAsync(string email, string fullName, UserRole role, CancellationToken cancellationToken)
    {
        var existing = await _context.Users.FirstOrDefaultAsync(u => u.Email == email, cancellationToken);
        if (existing != null) return existing;

        var passwordHash = _passwordHasher.HashPassword("SecurePassword123!");
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = email,
            FullName = fullName,
            PasswordHash = passwordHash,
            Role = role,
            PhoneNumber = "+94 77 000 0000",
            IsActive = true,
            CreatedAtUtc = DateTime.UtcNow
        };
        await _context.Users.AddAsync(user, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);
        return user;
    }

    private async Task SeedDemoRepresentativesAndProvidersAsync(CancellationToken cancellationToken)
    {
        // 1. Seed Representatives if table is empty
        if (!await _context.Representatives.AnyAsync(cancellationToken))
        {
            var u1 = await GetOrCreateSeedUserAsync("nimal.perera@email.com", "Nimal Perera", UserRole.Representative, cancellationToken);
            var u2 = await GetOrCreateSeedUserAsync("samanthi.silva@email.com", "Samanthi Silva", UserRole.Representative, cancellationToken);
            var u3 = await GetOrCreateSeedUserAsync("ravi.fernando@email.com", "Ravi Fernando", UserRole.Representative, cancellationToken);
            var u4 = await GetOrCreateSeedUserAsync("kavindu.j@email.com", "Kavindu Jayasekara", UserRole.Representative, cancellationToken);
            var u5 = await GetOrCreateSeedUserAsync("tharushi.p@email.com", "Tharushi Perera", UserRole.Representative, cancellationToken);

            var reps = new List<Representative>
            {
                new Representative
                {
                    Id = Guid.NewGuid(),
                    UserId = u1.Id,
                    FullName = "Nimal Perera",
                    PhoneNumber = "077 123 4567",
                    Email = "nimal.perera@email.com",
                    District = "Kandy",
                    City = "Kandy",
                    Address = "123, Peradeniya Road, Kandy",
                    NationalIdNumber = "912345678V",
                    VerificationStatus = VerificationStatus.Verified,
                    VerificationNotes = "Background check verified. Identity documents verified on 12 Jan 2024.",
                    Bio = "Experienced local representative covering Kandy, Peradeniya, and Katugastota. Trusted family contact for overseas property oversight.",
                    IsActive = true,
                    CreatedAtUtc = DateTime.UtcNow.AddMonths(-6)
                },
                new Representative
                {
                    Id = Guid.NewGuid(),
                    UserId = u2.Id,
                    FullName = "Samanthi Silva",
                    PhoneNumber = "071 234 5678",
                    Email = "samanthi.silva@email.com",
                    District = "Colombo",
                    City = "Colombo",
                    Address = "45, Galle Road, Colombo 03",
                    NationalIdNumber = "894561234V",
                    VerificationStatus = VerificationStatus.Verified,
                    VerificationNotes = "Verified licensed property inspection representative.",
                    Bio = "Specializing in luxury apartment and villa site inspections across Western Province.",
                    IsActive = true,
                    CreatedAtUtc = DateTime.UtcNow.AddMonths(-4)
                },
                new Representative
                {
                    Id = Guid.NewGuid(),
                    UserId = u3.Id,
                    FullName = "Ravi Fernando",
                    PhoneNumber = "076 345 6789",
                    Email = "ravi.fernando@email.com",
                    District = "Galle",
                    City = "Galle",
                    Address = "12, Lighthouse Street, Galle Fort",
                    NationalIdNumber = "781234567V",
                    VerificationStatus = VerificationStatus.Verified,
                    VerificationNotes = "Verified representative.",
                    Bio = "Southern province coordinator for coastal properties and historic estates.",
                    IsActive = false,
                    CreatedAtUtc = DateTime.UtcNow.AddMonths(-8)
                },
                new Representative
                {
                    Id = Guid.NewGuid(),
                    UserId = u4.Id,
                    FullName = "Kavindu Jayasekara",
                    PhoneNumber = "077 987 6543",
                    Email = "kavindu.j@email.com",
                    District = "Matara",
                    City = "Matara",
                    Address = "89, Beach Road, Matara",
                    NationalIdNumber = "951234567V",
                    VerificationStatus = VerificationStatus.Verified,
                    VerificationNotes = "Identity verified and references checked.",
                    Bio = "Active representative managing residential estates in Matara district.",
                    IsActive = true,
                    CreatedAtUtc = DateTime.UtcNow.AddMonths(-3)
                },
                new Representative
                {
                    Id = Guid.NewGuid(),
                    UserId = u5.Id,
                    FullName = "Tharushi Perera",
                    PhoneNumber = "070 555 1234",
                    Email = "tharushi.p@email.com",
                    District = "Gampaha",
                    City = "Negombo",
                    Address = "24, Poruthota Road, Negombo",
                    NationalIdNumber = "981234567V",
                    VerificationStatus = VerificationStatus.Pending,
                    VerificationNotes = "Identity documentation pending final manager sign-off.",
                    Bio = "New coordinator covering Negombo and northern coastal belt.",
                    IsActive = true,
                    CreatedAtUtc = DateTime.UtcNow.AddDays(-5)
                }
            };

            await _context.Representatives.AddRangeAsync(reps, cancellationToken);
            await _context.SaveChangesAsync(cancellationToken);
            _logger.LogInformation("Seeded demo representatives.");
        }

        // 2. Seed Service Providers if table is empty
        if (!await _context.ServiceProviders.AnyAsync(cancellationToken))
        {
            var up1 = await GetOrCreateSeedUserAsync("info@abcplumbing.lk", "Lahiru Fernando", UserRole.ServiceProvider, cancellationToken);
            var up2 = await GetOrCreateSeedUserAsync("contact@powerelectrics.lk", "Sunil Jayawardena", UserRole.ServiceProvider, cancellationToken);
            var up3 = await GetOrCreateSeedUserAsync("info@safehome.lk", "Kamal Rajapaksha", UserRole.ServiceProvider, cancellationToken);
            var up4 = await GetOrCreateSeedUserAsync("sales@coolairsolutions.lk", "Nuwan Bandara", UserRole.ServiceProvider, cancellationToken);
            var up5 = await GetOrCreateSeedUserAsync("info@cleanpro.lk", "Anusha Dissanayake", UserRole.ServiceProvider, cancellationToken);

            var p1 = new ServiceProvider
            {
                Id = Guid.NewGuid(),
                UserId = up1.Id,
                BusinessName = "ABC Plumbing",
                ContactPerson = "Lahiru Fernando",
                PhoneNumber = "077 888 1111",
                Email = "info@abcplumbing.lk",
                PrimaryDistrict = "Kandy",
                City = "Kandy",
                Address = "45, Dalada Veediya, Kandy",
                BaseLatitude = 7.2906,
                BaseLongitude = 80.6337,
                ServiceRadiusKm = 35.0,
                VerificationStatus = VerificationStatus.Verified,
                VerificationNotes = "Business registration PV123456 verified with liability insurance.",
                Rating = 4.8,
                CompletedJobsCount = 24,
                IsActive = true,
                CreatedAtUtc = DateTime.UtcNow.AddMonths(-5)
            };

            var p2 = new ServiceProvider
            {
                Id = Guid.NewGuid(),
                UserId = up2.Id,
                BusinessName = "Power Electrics",
                ContactPerson = "Sunil Jayawardena",
                PhoneNumber = "071 999 2222",
                Email = "contact@powerelectrics.lk",
                PrimaryDistrict = "Colombo",
                City = "Colombo",
                Address = "88, Duplication Road, Colombo 04",
                BaseLatitude = 6.9271,
                BaseLongitude = 79.8612,
                ServiceRadiusKm = 40.0,
                VerificationStatus = VerificationStatus.Verified,
                VerificationNotes = "CEB certified master electricians.",
                Rating = 4.5,
                CompletedJobsCount = 18,
                IsActive = true,
                CreatedAtUtc = DateTime.UtcNow.AddMonths(-4)
            };

            var p3 = new ServiceProvider
            {
                Id = Guid.NewGuid(),
                UserId = up3.Id,
                BusinessName = "SafeHome Builders",
                ContactPerson = "Kamal Rajapaksha",
                PhoneNumber = "076 111 3333",
                Email = "info@safehome.lk",
                PrimaryDistrict = "Galle",
                City = "Galle",
                Address = "34, Matara Road, Galle",
                BaseLatitude = 6.0535,
                BaseLongitude = 80.2210,
                ServiceRadiusKm = 50.0,
                VerificationStatus = VerificationStatus.Pending,
                VerificationNotes = "Awaiting trade license document renewal.",
                Rating = 4.2,
                CompletedJobsCount = 12,
                IsActive = true,
                CreatedAtUtc = DateTime.UtcNow.AddMonths(-2)
            };

            var p4 = new ServiceProvider
            {
                Id = Guid.NewGuid(),
                UserId = up4.Id,
                BusinessName = "Cool Air Solutions",
                ContactPerson = "Nuwan Bandara",
                PhoneNumber = "077 222 4444",
                Email = "sales@coolairsolutions.lk",
                PrimaryDistrict = "Kandy",
                City = "Kandy",
                Address = "102, William Gopallawa Mawatha, Kandy",
                BaseLatitude = 7.2950,
                BaseLongitude = 80.6380,
                ServiceRadiusKm = 45.0,
                VerificationStatus = VerificationStatus.Verified,
                VerificationNotes = "Commercial and residential HVAC certified.",
                Rating = 4.7,
                CompletedJobsCount = 30,
                IsActive = true,
                CreatedAtUtc = DateTime.UtcNow.AddMonths(-6)
            };

            var p5 = new ServiceProvider
            {
                Id = Guid.NewGuid(),
                UserId = up5.Id,
                BusinessName = "CleanPro Services",
                ContactPerson = "Anusha Dissanayake",
                PhoneNumber = "070 333 5555",
                Email = "info@cleanpro.lk",
                PrimaryDistrict = "Gampaha",
                City = "Negombo",
                Address = "56, Main Street, Negombo",
                BaseLatitude = 7.2008,
                BaseLongitude = 79.8736,
                ServiceRadiusKm = 30.0,
                VerificationStatus = VerificationStatus.Rejected,
                VerificationNotes = "Unverified - incomplete insurance coverage.",
                Rating = 4.3,
                CompletedJobsCount = 15,
                IsActive = true,
                CreatedAtUtc = DateTime.UtcNow.AddMonths(-3)
            };

            await _context.ServiceProviders.AddRangeAsync(new[] { p1, p2, p3, p4, p5 }, cancellationToken);
            await _context.SaveChangesAsync(cancellationToken);

            // Seed Skills
            var skills = new List<ProviderSkill>
            {
                new ProviderSkill { Id = Guid.NewGuid(), ProviderId = p1.Id, Category = IncidentCategory.Plumbing, SkillName = "Plumbing", YearsOfExperience = 8, IsPrimary = true, LicenseNumber = "PL-9921", CreatedAtUtc = DateTime.UtcNow },
                new ProviderSkill { Id = Guid.NewGuid(), ProviderId = p1.Id, Category = IncidentCategory.Plumbing, SkillName = "Pipe Repair", YearsOfExperience = 8, IsPrimary = false, CreatedAtUtc = DateTime.UtcNow },
                new ProviderSkill { Id = Guid.NewGuid(), ProviderId = p1.Id, Category = IncidentCategory.Plumbing, SkillName = "Leak Detection", YearsOfExperience = 6, IsPrimary = false, CreatedAtUtc = DateTime.UtcNow },
                new ProviderSkill { Id = Guid.NewGuid(), ProviderId = p2.Id, Category = IncidentCategory.Electrical, SkillName = "Electrical", YearsOfExperience = 10, IsPrimary = true, LicenseNumber = "EL-4402", CreatedAtUtc = DateTime.UtcNow },
                new ProviderSkill { Id = Guid.NewGuid(), ProviderId = p2.Id, Category = IncidentCategory.Electrical, SkillName = "Wiring & Rewiring", YearsOfExperience = 10, IsPrimary = false, CreatedAtUtc = DateTime.UtcNow },
                new ProviderSkill { Id = Guid.NewGuid(), ProviderId = p3.Id, Category = IncidentCategory.Structural, SkillName = "Masonry", YearsOfExperience = 12, IsPrimary = true, CreatedAtUtc = DateTime.UtcNow },
                new ProviderSkill { Id = Guid.NewGuid(), ProviderId = p3.Id, Category = IncidentCategory.Roofing, SkillName = "Roofing Repair", YearsOfExperience = 8, IsPrimary = false, CreatedAtUtc = DateTime.UtcNow },
                new ProviderSkill { Id = Guid.NewGuid(), ProviderId = p4.Id, Category = IncidentCategory.HVAC, SkillName = "AC Service", YearsOfExperience = 7, IsPrimary = true, LicenseNumber = "HVAC-102", CreatedAtUtc = DateTime.UtcNow },
                new ProviderSkill { Id = Guid.NewGuid(), ProviderId = p4.Id, Category = IncidentCategory.HVAC, SkillName = "Duct Cleaning", YearsOfExperience = 5, IsPrimary = false, CreatedAtUtc = DateTime.UtcNow },
                new ProviderSkill { Id = Guid.NewGuid(), ProviderId = p5.Id, Category = IncidentCategory.General, SkillName = "Cleaning", YearsOfExperience = 4, IsPrimary = true, CreatedAtUtc = DateTime.UtcNow },
                new ProviderSkill { Id = Guid.NewGuid(), ProviderId = p5.Id, Category = IncidentCategory.PestControl, SkillName = "Pest Control", YearsOfExperience = 3, IsPrimary = false, CreatedAtUtc = DateTime.UtcNow },
            };
            await _context.ProviderSkills.AddRangeAsync(skills, cancellationToken);

            // Seed Availability Slots for September 2026
            var now = DateTime.UtcNow;
            var availabilities = new List<ProviderAvailability>
            {
                new ProviderAvailability { Id = Guid.NewGuid(), ProviderId = p1.Id, AvailableDateUtc = new DateTime(now.Year, now.Month, 2, 0, 0, 0, DateTimeKind.Utc), StartTime = TimeSpan.FromHours(8), EndTime = TimeSpan.FromHours(17), Status = AvailabilityStatus.Available, CreatedAtUtc = DateTime.UtcNow },
                new ProviderAvailability { Id = Guid.NewGuid(), ProviderId = p1.Id, AvailableDateUtc = new DateTime(now.Year, now.Month, 5, 0, 0, 0, DateTimeKind.Utc), StartTime = TimeSpan.FromHours(8), EndTime = TimeSpan.FromHours(17), Status = AvailabilityStatus.Available, CreatedAtUtc = DateTime.UtcNow },
                new ProviderAvailability { Id = Guid.NewGuid(), ProviderId = p1.Id, AvailableDateUtc = new DateTime(now.Year, now.Month, 9, 0, 0, 0, DateTimeKind.Utc), StartTime = TimeSpan.FromHours(8), EndTime = TimeSpan.FromHours(17), Status = AvailabilityStatus.Available, CreatedAtUtc = DateTime.UtcNow },
                new ProviderAvailability { Id = Guid.NewGuid(), ProviderId = p1.Id, AvailableDateUtc = new DateTime(now.Year, now.Month, 12, 0, 0, 0, DateTimeKind.Utc), StartTime = TimeSpan.FromHours(8), EndTime = TimeSpan.FromHours(17), Status = AvailabilityStatus.Busy, Notes = "Site visit booked", CreatedAtUtc = DateTime.UtcNow },
                new ProviderAvailability { Id = Guid.NewGuid(), ProviderId = p1.Id, AvailableDateUtc = new DateTime(now.Year, now.Month, 15, 0, 0, 0, DateTimeKind.Utc), StartTime = TimeSpan.FromHours(8), EndTime = TimeSpan.FromHours(17), Status = AvailabilityStatus.Busy, Notes = "Inspection scheduled", CreatedAtUtc = DateTime.UtcNow },
                new ProviderAvailability { Id = Guid.NewGuid(), ProviderId = p1.Id, AvailableDateUtc = new DateTime(now.Year, now.Month, 18, 0, 0, 0, DateTimeKind.Utc), StartTime = TimeSpan.FromHours(8), EndTime = TimeSpan.FromHours(17), Status = AvailabilityStatus.Available, CreatedAtUtc = DateTime.UtcNow }
            };
            await _context.ProviderAvailability.AddRangeAsync(availabilities, cancellationToken);
            await _context.SaveChangesAsync(cancellationToken);
            _logger.LogInformation("Seeded demo service providers with skills and availability slots.");
        }
    }

    private async Task SeedDemoAssetsAndIncidentsAsync(CancellationToken cancellationToken)
    {
        var owner = await _context.Users.FirstOrDefaultAsync(u => u.Email == "owner@assetbridge.lk", cancellationToken);
        if (owner == null) return;

        // 1. Seed demo assets if none exist for Owner
        var existingAssets = await _context.Assets.Where(a => a.OwnerId == owner.Id).ToListAsync(cancellationToken);
        if (!existingAssets.Any())
        {
            var a1 = new Asset
            {
                Id = Guid.NewGuid(),
                OwnerId = owner.Id,
                Name = "Kandy Hillside Villa",
                PropertyType = PropertyType.Villa,
                AddressLine1 = "42, Richmond Hill Road",
                City = "Kandy",
                District = "Kandy",
                PostalCode = "20000",
                Latitude = 7.2906,
                Longitude = 80.6337,
                Description = "Luxury 4-bedroom hillside colonial residence with landscaped tea gardens and private caretaker quarters.",
                Status = AssetStatus.Active,
                CreatedAtUtc = DateTime.UtcNow.AddMonths(-6)
            };

            var a2 = new Asset
            {
                Id = Guid.NewGuid(),
                OwnerId = owner.Id,
                Name = "Colombo Havelock Luxury Suite",
                PropertyType = PropertyType.Apartment,
                AddressLine1 = "Tower B, Level 14, Havelock City",
                AddressLine2 = "Havelock Road, Colombo 05",
                City = "Colombo",
                District = "Colombo",
                PostalCode = "00500",
                Latitude = 6.8850,
                Longitude = 79.8650,
                Description = "Modern 3-bedroom high-rise apartment overlooking the central gardens and skyline.",
                Status = AssetStatus.Active,
                CreatedAtUtc = DateTime.UtcNow.AddMonths(-4)
            };

            var a3 = new Asset
            {
                Id = Guid.NewGuid(),
                OwnerId = owner.Id,
                Name = "Galle Fort Heritage Bungalow",
                PropertyType = PropertyType.Villa,
                AddressLine1 = "18, Light House Street",
                City = "Galle",
                District = "Galle",
                PostalCode = "80000",
                Latitude = 6.0270,
                Longitude = 80.2170,
                Description = "Restored Dutch colonial heritage villa located inside the Galle Fort historical sanctuary.",
                Status = AssetStatus.Active,
                CreatedAtUtc = DateTime.UtcNow.AddMonths(-8)
            };

            existingAssets = new List<Asset> { a1, a2, a3 };
            await _context.Assets.AddRangeAsync(existingAssets, cancellationToken);
            await _context.SaveChangesAsync(cancellationToken);
            _logger.LogInformation("Seeded demo properties for {Email}.", owner.Email);
        }

        // 2. Seed demo incidents if none exist for Owner
        var existingIncidents = await _context.Incidents
            .Where(i => existingAssets.Select(a => a.Id).Contains(i.AssetId))
            .ToListAsync(cancellationToken);

        if (!existingIncidents.Any())
        {
            var kandyAsset = existingAssets.First(a => a.City == "Kandy");
            var colomboAsset = existingAssets.First(a => a.City == "Colombo");

            var inc1 = new Incident
            {
                Id = Guid.NewGuid(),
                AssetId = kandyAsset.Id,
                ReportedByUserId = owner.Id,
                Title = "Kitchen Main Water Pipe Leak",
                Description = "Concealed pipe joint beneath the ground floor kitchen sink cabinetry has failed. Constant water seepage spreading to adjacent timber pantry floor.",
                Category = IncidentCategory.Plumbing,
                Priority = IncidentPriority.High,
                Status = IncidentStatus.WorkInProgress,
                EstimatedBudget = 75000m,
                RequiredByUtc = DateTime.UtcNow.AddDays(3),
                LocationDetails = "Ground floor main kitchen pantry cabinetry",
                CreatedAtUtc = DateTime.UtcNow.AddDays(-2)
            };

            var ev1 = new IncidentEvidence
            {
                Id = Guid.NewGuid(),
                IncidentId = inc1.Id,
                UploadedByUserId = owner.Id,
                FileName = "kitchen_under_sink_leak.jpg",
                FileUrl = "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800",
                FileType = "image/jpeg",
                FileSizeBytes = 1024 * 480,
                EvidenceType = EvidenceType.Photo,
                Caption = "Water pooling under main copper junction",
                CreatedAtUtc = DateTime.UtcNow.AddDays(-2)
            };
            inc1.EvidenceItems.Add(ev1);

            var inc2 = new Incident
            {
                Id = Guid.NewGuid(),
                AssetId = colomboAsset.Id,
                ReportedByUserId = owner.Id,
                Title = "Master Suite AC Compressor Failure",
                Description = "Inverter air conditioning unit in master suite fails to start cooling and displays diagnostic fault code E4 after 5 minutes of operation.",
                Category = IncidentCategory.HVAC,
                Priority = IncidentPriority.Medium,
                Status = IncidentStatus.Planning,
                EstimatedBudget = 45000m,
                RequiredByUtc = DateTime.UtcNow.AddDays(5),
                LocationDetails = "Level 14 master bedroom north wall",
                CreatedAtUtc = DateTime.UtcNow.AddDays(-1)
            };

            var ev2 = new IncidentEvidence
            {
                Id = Guid.NewGuid(),
                IncidentId = inc2.Id,
                UploadedByUserId = owner.Id,
                FileName = "ac_indoor_fault_code.jpg",
                FileUrl = "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800",
                FileType = "image/jpeg",
                FileSizeBytes = 1024 * 320,
                EvidenceType = EvidenceType.Photo,
                Caption = "LED display flashing error code E4",
                CreatedAtUtc = DateTime.UtcNow.AddDays(-1)
            };
            inc2.EvidenceItems.Add(ev2);

            var inc3 = new Incident
            {
                Id = Guid.NewGuid(),
                AssetId = kandyAsset.Id,
                ReportedByUserId = owner.Id,
                Title = "Roof Terracotta Tile Shift",
                Description = "Heavy monsoon gusts dislodged three terracotta roof tiles above the front verandah, exposing timber rafters to rain.",
                Category = IncidentCategory.Roofing,
                Priority = IncidentPriority.Medium,
                Status = IncidentStatus.Resolved,
                EstimatedBudget = 35000m,
                RequiredByUtc = DateTime.UtcNow.AddDays(-5),
                LocationDetails = "Front entrance verandah eaves",
                CreatedAtUtc = DateTime.UtcNow.AddDays(-7)
            };

            await _context.Incidents.AddRangeAsync(new[] { inc1, inc2, inc3 }, cancellationToken);
            await _context.SaveChangesAsync(cancellationToken);
            _logger.LogInformation("Seeded demo maintenance incidents with evidence for {Email}.", owner.Email);
        }
    }
}
