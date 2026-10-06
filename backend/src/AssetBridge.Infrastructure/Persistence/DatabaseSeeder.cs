using AssetBridge.Application.Common.Interfaces;
using AssetBridge.Domain.Entities.Assets;
using AssetBridge.Domain.Entities.Incidents;
using AssetBridge.Domain.Entities.Inspections;
using AssetBridge.Domain.Entities.Maintenance;
using AssetBridge.Domain.Entities.Providers;
using AssetBridge.Domain.Entities.Representatives;
using AssetBridge.Domain.Entities.Users;
using AssetBridge.Domain.Entities.Workflow;
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

        if (_context.Database.IsRelational())
        {
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
        }

        await SeedDemoUsersAsync(cancellationToken);
    }

    private async Task SeedDemoUsersAsync(CancellationToken cancellationToken)
    {
        var demoUsers = new List<(string Email, string FullName, UserRole Role, string Phone)>
        {
            // Primary demo credentials (@assetbridge.lk) matching UI quick-fill
            ("manager@assetbridge.lk", "Mathuppriya Naguleswaran", UserRole.Manager, "+94771234561"),
            ("owner@assetbridge.lk", "Moosika Ramanathan", UserRole.Owner, "+94771234562"),
            ("provider@assetbridge.lk", "Jathurshan", UserRole.ServiceProvider, "+94771234563"),
            ("rep@assetbridge.lk", "Kamsiga Ganesan", UserRole.Representative, "+94771234564"),
            ("admin@assetbridge.lk", "AssetBridge Administrator", UserRole.Admin, "+94771234560"),

            // Alternate domain aliases (@assetbridge.ai)
            ("manager@assetbridge.ai", "Mathuppriya Naguleswaran", UserRole.Manager, "+94771234561"),
            ("owner@assetbridge.ai", "Moosika Ramanathan", UserRole.Owner, "+94771234562"),
            ("provider@assetbridge.ai", "Jathurshan", UserRole.ServiceProvider, "+94771234563"),
            ("rep@assetbridge.ai", "Kamsiga Ganesan", UserRole.Representative, "+94771234564"),
            ("admin@assetbridge.ai", "AssetBridge Administrator", UserRole.Admin, "+94771234560"),

            // Quotation comparison commercial partner accounts
            ("partner@assetbridge.lk", "Apex Engineering & Facilities", UserRole.ServiceProvider, "+94719992222"),
            ("associate@assetbridge.lk", "Islandwide Technical Services", UserRole.ServiceProvider, "+94761113333")
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
                // In-place update known demo records so deployed database safely reflects correct team member names
                existingUser.FullName = fullName;
                existingUser.Role = role;
                existingUser.PhoneNumber = phone;
                if (!existingUser.IsActive || !_passwordHasher.VerifyPassword(demoPassword, existingUser.PasswordHash))
                {
                    existingUser.PasswordHash = passwordHash;
                    existingUser.IsActive = true;
                    _logger.LogInformation("Updated demo user {Email} credentials", email);
                }
            }
        }

        await _context.SaveChangesAsync(cancellationToken);
        _logger.LogInformation("Demo users verified and seeded successfully.");

        await SeedDemoRepresentativeAsync(cancellationToken);
        await SeedDemoProvidersAsync(cancellationToken);
        await SeedDemoAssetsAndIncidentsAsync(cancellationToken);
        await SeedDemoInspectionsQuotationsAndJobsAsync(cancellationToken);
    }

    private async Task SeedDemoRepresentativeAsync(CancellationToken cancellationToken)
    {
        var repUser = await _context.Users
            .FirstOrDefaultAsync(u => u.Email == "rep@assetbridge.lk" || u.Email == "rep@assetbridge.ai", cancellationToken);

        if (repUser == null) return;

        var rep = await _context.Representatives
            .FirstOrDefaultAsync(r => r.UserId == repUser.Id, cancellationToken);

        if (rep == null)
        {
            rep = new Representative
            {
                Id = Guid.NewGuid(),
                UserId = repUser.Id,
                FullName = "Kamsiga Ganesan",
                PhoneNumber = "+94 77 123 4564",
                Email = repUser.Email,
                District = "Kandy",
                City = "Kandy",
                Address = "123, Peradeniya Road, Kandy",
                NationalIdNumber = null,
                VerificationStatus = VerificationStatus.Verified,
                VerificationNotes = "Verified on-site property representative in Central Province.",
                Bio = "Experienced local representative covering Kandy and Central Province, coordinating owner inspections and contractor oversight.",
                IsActive = true,
                CreatedAtUtc = DateTime.UtcNow.AddMonths(-6)
            };
            await _context.Representatives.AddAsync(rep, cancellationToken);
            _logger.LogInformation("Created demo representative Kamsiga Ganesan.");
        }
        else
        {
            rep.FullName = "Kamsiga Ganesan";
            rep.VerificationStatus = VerificationStatus.Verified;
            rep.IsActive = true;
        }

        await _context.SaveChangesAsync(cancellationToken);
    }

    private async Task SeedDemoProvidersAsync(CancellationToken cancellationToken)
    {
        var p1User = await _context.Users.FirstOrDefaultAsync(u => u.Email == "provider@assetbridge.lk" || u.Email == "provider@assetbridge.ai", cancellationToken);
        var p2User = await _context.Users.FirstOrDefaultAsync(u => u.Email == "partner@assetbridge.lk", cancellationToken);
        var p3User = await _context.Users.FirstOrDefaultAsync(u => u.Email == "associate@assetbridge.lk", cancellationToken);

        if (p1User == null) return;

        // Provider 1: Jathu Technical Solutions (Jathurshan)
        var p1 = await _context.ServiceProviders.FirstOrDefaultAsync(p => p.UserId == p1User.Id, cancellationToken);
        if (p1 == null)
        {
            p1 = new ServiceProvider
            {
                Id = Guid.NewGuid(),
                UserId = p1User.Id,
                BusinessName = "Jathu Technical Solutions",
                ContactPerson = "Jathurshan",
                PhoneNumber = "+94 77 123 4563",
                Email = "provider@assetbridge.lk",
                PrimaryDistrict = "Kandy",
                City = "Kandy",
                Address = "45, Dalada Veediya, Kandy",
                BaseLatitude = 7.2906,
                BaseLongitude = 80.6337,
                ServiceRadiusKm = 40.0,
                VerificationStatus = VerificationStatus.Verified,
                VerificationNotes = "Business registration PV123456 verified with ICTAD grade certification.",
                Rating = 4.9,
                CompletedJobsCount = 28,
                IsActive = true,
                CreatedAtUtc = DateTime.UtcNow.AddMonths(-6)
            };
            await _context.ServiceProviders.AddAsync(p1, cancellationToken);
        }
        else
        {
            p1.BusinessName = "Jathu Technical Solutions";
            p1.ContactPerson = "Jathurshan";
            p1.VerificationStatus = VerificationStatus.Verified;
            p1.Rating = 4.9;
            p1.IsActive = true;
        }

        // Provider 2: Apex Engineering & Facilities (Service Desk)
        if (p2User != null)
        {
            var p2 = await _context.ServiceProviders.FirstOrDefaultAsync(p => p.UserId == p2User.Id, cancellationToken);
            if (p2 == null)
            {
                p2 = new ServiceProvider
                {
                    Id = Guid.NewGuid(),
                    UserId = p2User.Id,
                    BusinessName = "Apex Engineering & Facilities",
                    ContactPerson = "Service Desk",
                    PhoneNumber = "+94 71 999 2222",
                    Email = "partner@assetbridge.lk",
                    PrimaryDistrict = "Kandy",
                    City = "Kandy",
                    Address = "102, William Gopallawa Mawatha, Kandy",
                    BaseLatitude = 7.2950,
                    BaseLongitude = 80.6380,
                    ServiceRadiusKm = 35.0,
                    VerificationStatus = VerificationStatus.Verified,
                    VerificationNotes = "Certified engineering and building services partner.",
                    Rating = 4.6,
                    CompletedJobsCount = 19,
                    IsActive = true,
                    CreatedAtUtc = DateTime.UtcNow.AddMonths(-4)
                };
                await _context.ServiceProviders.AddAsync(p2, cancellationToken);
            }
            else
            {
                p2.BusinessName = "Apex Engineering & Facilities";
                p2.ContactPerson = "Service Desk";
                p2.VerificationStatus = VerificationStatus.Verified;
                p2.Rating = 4.6;
                p2.IsActive = true;
            }
        }

        // Provider 3: Islandwide Technical Services (Technical Team)
        if (p3User != null)
        {
            var p3 = await _context.ServiceProviders.FirstOrDefaultAsync(p => p.UserId == p3User.Id, cancellationToken);
            if (p3 == null)
            {
                p3 = new ServiceProvider
                {
                    Id = Guid.NewGuid(),
                    UserId = p3User.Id,
                    BusinessName = "Islandwide Technical Services",
                    ContactPerson = "Technical Team",
                    PhoneNumber = "+94 76 111 3333",
                    Email = "associate@assetbridge.lk",
                    PrimaryDistrict = "Colombo",
                    City = "Colombo",
                    Address = "88, Duplication Road, Colombo 04",
                    BaseLatitude = 6.9271,
                    BaseLongitude = 79.8612,
                    ServiceRadiusKm = 50.0,
                    VerificationStatus = VerificationStatus.Verified,
                    VerificationNotes = "Verified licensed electrical and plumbing contractors.",
                    Rating = 4.4,
                    CompletedJobsCount = 15,
                    IsActive = true,
                    CreatedAtUtc = DateTime.UtcNow.AddMonths(-3)
                };
                await _context.ServiceProviders.AddAsync(p3, cancellationToken);
            }
            else
            {
                p3.BusinessName = "Islandwide Technical Services";
                p3.ContactPerson = "Technical Team";
                p3.VerificationStatus = VerificationStatus.Verified;
                p3.Rating = 4.4;
                p3.IsActive = true;
            }
        }

        await _context.SaveChangesAsync(cancellationToken);

        // Seed provider skills idempotently
        var currentP1 = await _context.ServiceProviders.FirstOrDefaultAsync(p => p.UserId == p1User.Id, cancellationToken);
        if (currentP1 != null)
        {
            var hasP1Skills = await _context.ProviderSkills.AnyAsync(s => s.ProviderId == currentP1.Id, cancellationToken);
            if (!hasP1Skills)
            {
                var skills1 = new List<ProviderSkill>
                {
                    new ProviderSkill { Id = Guid.NewGuid(), ProviderId = currentP1.Id, Category = IncidentCategory.Plumbing, SkillName = "Plumbing", YearsOfExperience = 8, IsPrimary = true, LicenseNumber = "PL-9921", CreatedAtUtc = DateTime.UtcNow },
                    new ProviderSkill { Id = Guid.NewGuid(), ProviderId = currentP1.Id, Category = IncidentCategory.Plumbing, SkillName = "Pipe Repair & Sealing", YearsOfExperience = 8, IsPrimary = false, CreatedAtUtc = DateTime.UtcNow },
                    new ProviderSkill { Id = Guid.NewGuid(), ProviderId = currentP1.Id, Category = IncidentCategory.Plumbing, SkillName = "Leak Detection", YearsOfExperience = 6, IsPrimary = false, CreatedAtUtc = DateTime.UtcNow }
                };
                await _context.ProviderSkills.AddRangeAsync(skills1, cancellationToken);
            }
        }

        if (p2User != null)
        {
            var currentP2 = await _context.ServiceProviders.FirstOrDefaultAsync(p => p.UserId == p2User.Id, cancellationToken);
            if (currentP2 != null)
            {
                var hasP2Skills = await _context.ProviderSkills.AnyAsync(s => s.ProviderId == currentP2.Id, cancellationToken);
                if (!hasP2Skills)
                {
                    var skills2 = new List<ProviderSkill>
                    {
                        new ProviderSkill { Id = Guid.NewGuid(), ProviderId = currentP2.Id, Category = IncidentCategory.Plumbing, SkillName = "Plumbing", YearsOfExperience = 10, IsPrimary = true, LicenseNumber = "PL-4402", CreatedAtUtc = DateTime.UtcNow },
                        new ProviderSkill { Id = Guid.NewGuid(), ProviderId = currentP2.Id, Category = IncidentCategory.General, SkillName = "General Maintenance", YearsOfExperience = 8, IsPrimary = false, CreatedAtUtc = DateTime.UtcNow }
                    };
                    await _context.ProviderSkills.AddRangeAsync(skills2, cancellationToken);
                }
            }
        }

        if (p3User != null)
        {
            var currentP3 = await _context.ServiceProviders.FirstOrDefaultAsync(p => p.UserId == p3User.Id, cancellationToken);
            if (currentP3 != null)
            {
                var hasP3Skills = await _context.ProviderSkills.AnyAsync(s => s.ProviderId == currentP3.Id, cancellationToken);
                if (!hasP3Skills)
                {
                    var skills3 = new List<ProviderSkill>
                    {
                        new ProviderSkill { Id = Guid.NewGuid(), ProviderId = currentP3.Id, Category = IncidentCategory.Plumbing, SkillName = "Plumbing", YearsOfExperience = 7, IsPrimary = true, CreatedAtUtc = DateTime.UtcNow },
                        new ProviderSkill { Id = Guid.NewGuid(), ProviderId = currentP3.Id, Category = IncidentCategory.Roofing, SkillName = "Roofing / General Building Maintenance", YearsOfExperience = 8, IsPrimary = false, CreatedAtUtc = DateTime.UtcNow }
                    };
                    await _context.ProviderSkills.AddRangeAsync(skills3, cancellationToken);
                }
            }
        }

        await _context.SaveChangesAsync(cancellationToken);
        _logger.LogInformation("Seeded and verified demo service providers.");
    }

    private async Task SeedDemoAssetsAndIncidentsAsync(CancellationToken cancellationToken)
    {
        var owner = await _context.Users.FirstOrDefaultAsync(u => u.Email == "owner@assetbridge.lk" || u.Email == "owner@assetbridge.ai", cancellationToken);
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

        // 2. Ensure persistent demo media gallery for existing properties
        foreach (var asset in existingAssets)
        {
            var hasMedia = await _context.AssetMedia.AnyAsync(m => m.AssetId == asset.Id, cancellationToken);
            if (!hasMedia)
            {
                var mediaItems = new List<AssetMedia>();
                if (asset.City == "Kandy")
                {
                    mediaItems.Add(new AssetMedia
                    {
                        Id = Guid.NewGuid(),
                        AssetId = asset.Id,
                        UploadedByUserId = owner.Id,
                        FileName = "kandy_villa_exterior.jpg",
                        FileUrl = "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=80",
                        FileType = "image/jpeg",
                        FileSizeBytes = 1024 * 650,
                        IsThumbnail = true,
                        Caption = "Hillside villa front elevation & landscaped gardens",
                        CreatedAtUtc = DateTime.UtcNow.AddMonths(-6)
                    });
                }
                else if (asset.City == "Colombo")
                {
                    mediaItems.Add(new AssetMedia
                    {
                        Id = Guid.NewGuid(),
                        AssetId = asset.Id,
                        UploadedByUserId = owner.Id,
                        FileName = "havelock_skyline_suite.jpg",
                        FileUrl = "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80",
                        FileType = "image/jpeg",
                        FileSizeBytes = 1024 * 580,
                        IsThumbnail = true,
                        Caption = "Tower B panoramic view & master balcony",
                        CreatedAtUtc = DateTime.UtcNow.AddMonths(-4)
                    });
                }
                else
                {
                    mediaItems.Add(new AssetMedia
                    {
                        Id = Guid.NewGuid(),
                        AssetId = asset.Id,
                        UploadedByUserId = owner.Id,
                        FileName = "galle_fort_colonial_facade.jpg",
                        FileUrl = "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&q=80",
                        FileType = "image/jpeg",
                        FileSizeBytes = 1024 * 610,
                        IsThumbnail = true,
                        Caption = "Historic Dutch colonial restored entrance",
                        CreatedAtUtc = DateTime.UtcNow.AddMonths(-8)
                    });
                }

                if (mediaItems.Any())
                {
                    await _context.AssetMedia.AddRangeAsync(mediaItems, cancellationToken);
                    await _context.SaveChangesAsync(cancellationToken);
                }
            }
        }

        // 3. Seed demo incidents if none exist for Owner
        var kandyAsset = existingAssets.FirstOrDefault(a => a.City == "Kandy") ?? existingAssets.First();
        var colomboAsset = existingAssets.FirstOrDefault(a => a.City == "Colombo") ?? existingAssets.First();

        var existingInc1 = await _context.Incidents
            .Include(i => i.EvidenceItems)
            .FirstOrDefaultAsync(i => i.AssetId == kandyAsset.Id && (i.Title.Contains("Kitchen") || i.Title.Contains("Water Leak") || i.Category == IncidentCategory.Plumbing), cancellationToken);

        if (existingInc1 == null)
        {
            var inc1 = new Incident
            {
                Id = Guid.NewGuid(),
                AssetId = kandyAsset.Id,
                ReportedByUserId = owner.Id,
                Title = "Kitchen Main Water Pipe Leak",
                Description = "Concealed pipe joint beneath ground floor kitchen pantry cabinetry has failed. Constant water seepage spreading to adjacent timber pantry floor. Owner is overseas and requires remote coordination.",
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

            await _context.Incidents.AddAsync(inc1, cancellationToken);
        }
        else
        {
            // Normalize canonical incident fields
            existingInc1.Title = "Kitchen Main Water Pipe Leak";
            existingInc1.Category = IncidentCategory.Plumbing;
            existingInc1.Priority = IncidentPriority.High;
            existingInc1.EstimatedBudget = 75000m;
            existingInc1.Status = IncidentStatus.WorkInProgress;
            existingInc1.LocationDetails = "Ground floor main kitchen pantry cabinetry";

            if (!existingInc1.EvidenceItems.Any())
            {
                existingInc1.EvidenceItems.Add(new IncidentEvidence
                {
                    Id = Guid.NewGuid(),
                    IncidentId = existingInc1.Id,
                    UploadedByUserId = owner.Id,
                    FileName = "kitchen_under_sink_leak.jpg",
                    FileUrl = "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800",
                    FileType = "image/jpeg",
                    FileSizeBytes = 1024 * 480,
                    EvidenceType = EvidenceType.Photo,
                    Caption = "Water pooling under main copper junction",
                    CreatedAtUtc = DateTime.UtcNow.AddDays(-2)
                });
            }
        }

        var existingInc2 = await _context.Incidents
            .FirstOrDefaultAsync(i => i.AssetId == colomboAsset.Id && i.Category == IncidentCategory.HVAC, cancellationToken);

        if (existingInc2 == null)
        {
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

            await _context.Incidents.AddAsync(inc2, cancellationToken);
        }

        var existingInc3 = await _context.Incidents
            .FirstOrDefaultAsync(i => i.AssetId == kandyAsset.Id && i.Category == IncidentCategory.Roofing, cancellationToken);

        if (existingInc3 == null)
        {
            var inc3 = new Incident
            {
                Id = Guid.NewGuid(),
                AssetId = kandyAsset.Id,
                ReportedByUserId = owner.Id,
                Title = "Roof Terracotta Tile Shift",
                Description = "Heavy monsoon gusts dislodged three terracotta roof tiles above front verandah, exposing timber rafters to rain.",
                Category = IncidentCategory.Roofing,
                Priority = IncidentPriority.Medium,
                Status = IncidentStatus.Resolved,
                EstimatedBudget = 35000m,
                RequiredByUtc = DateTime.UtcNow.AddDays(-5),
                LocationDetails = "Front entrance verandah eaves",
                CreatedAtUtc = DateTime.UtcNow.AddDays(-7)
            };

            await _context.Incidents.AddAsync(inc3, cancellationToken);
        }

        await _context.SaveChangesAsync(cancellationToken);
        _logger.LogInformation("Seeded and verified demo maintenance incidents.");
    }

    private async Task SeedDemoInspectionsQuotationsAndJobsAsync(CancellationToken cancellationToken)
    {
        var kandyAsset = await _context.Assets.FirstOrDefaultAsync(a => a.City == "Kandy", cancellationToken);
        var inc1 = await _context.Incidents
            .FirstOrDefaultAsync(i => (kandyAsset != null && i.AssetId == kandyAsset.Id && (i.Title.Contains("Kitchen") || i.Title.Contains("Water Leak") || i.Category == IncidentCategory.Plumbing)) || (i.Title.Contains("Kitchen") && i.Category == IncidentCategory.Plumbing), cancellationToken);
        var inc3 = await _context.Incidents
            .FirstOrDefaultAsync(i => (kandyAsset != null && i.AssetId == kandyAsset.Id && i.Category == IncidentCategory.Roofing) || (i.Title.Contains("Roof") && i.Category == IncidentCategory.Roofing), cancellationToken);

        if (inc1 == null) return;

        var p1User = await _context.Users.FirstOrDefaultAsync(u => u.Email == "provider@assetbridge.lk" || u.Email == "provider@assetbridge.ai", cancellationToken);
        var p2User = await _context.Users.FirstOrDefaultAsync(u => u.Email == "partner@assetbridge.lk", cancellationToken);
        var p3User = await _context.Users.FirstOrDefaultAsync(u => u.Email == "associate@assetbridge.lk", cancellationToken);

        var p1 = p1User != null ? await _context.ServiceProviders.FirstOrDefaultAsync(p => p.UserId == p1User.Id, cancellationToken) : null;
        var p2 = p2User != null ? await _context.ServiceProviders.FirstOrDefaultAsync(p => p.UserId == p2User.Id, cancellationToken) : null;
        var p3 = p3User != null ? await _context.ServiceProviders.FirstOrDefaultAsync(p => p.UserId == p3User.Id, cancellationToken) : null;

        if (p1 == null) return;

        // 1. Seed Inspections
        var existingInsp1 = await _context.Inspections.FirstOrDefaultAsync(i => i.IncidentId == inc1.Id, cancellationToken);
        if (existingInsp1 == null)
        {
            var insp1 = new Inspection
            {
                Id = Guid.NewGuid(),
                IncidentId = inc1.Id,
                InspectorProviderId = p1.Id,
                ScheduledAtUtc = DateTime.UtcNow.AddDays(1),
                Status = InspectionStatus.Scheduled,
                Summary = "Scheduled on-site plumbing defect assessment for kitchen cabinet water seepage.",
                Notes = "Will perform hydrostatic pressure leak testing and inspect timber floor substructure.",
                CreatedAtUtc = DateTime.UtcNow.AddDays(-1)
            };
            await _context.Inspections.AddAsync(insp1, cancellationToken);
            _logger.LogInformation("Seeded scheduled inspection for incident {IncidentTitle}.", inc1.Title);
        }

        if (inc3 != null)
        {
            var existingInsp3 = await _context.Inspections.FirstOrDefaultAsync(i => i.IncidentId == inc3.Id, cancellationToken);
            if (existingInsp3 == null)
            {
                var insp3 = new Inspection
                {
                    Id = Guid.NewGuid(),
                    IncidentId = inc3.Id,
                    InspectorProviderId = p1.Id,
                    ScheduledAtUtc = DateTime.UtcNow.AddDays(-6),
                    CompletedAtUtc = DateTime.UtcNow.AddDays(-6).AddHours(2),
                    Status = InspectionStatus.Completed,
                    Summary = "Comprehensive roof and verandah inspection completed. Identified three dislodged tiles and minor rainwater ingress on timber rafters.",
                    EstimatedSeverity = FindingSeverity.Medium,
                    Notes = "Structural rafter integrity is intact. Immediate tile mortar realignment recommended.",
                    CreatedAtUtc = DateTime.UtcNow.AddDays(-6)
                };

                insp3.Findings.Add(new InspectionFinding
                {
                    Id = Guid.NewGuid(),
                    InspectionId = insp3.Id,
                    Description = "Dislodged terracotta roof tiles on front entrance verandah",
                    Severity = FindingSeverity.Medium,
                    Recommendation = "Re-align and apply mortar bedding to tiles",
                    CreatedAtUtc = DateTime.UtcNow.AddDays(-6)
                });

                insp3.Findings.Add(new InspectionFinding
                {
                    Id = Guid.NewGuid(),
                    InspectionId = insp3.Id,
                    Description = "Moisture staining on timber rafters",
                    Severity = FindingSeverity.Low,
                    Recommendation = "Apply anti-fungal wood treatment sealant",
                    CreatedAtUtc = DateTime.UtcNow.AddDays(-6)
                });

                await _context.Inspections.AddAsync(insp3, cancellationToken);
                _logger.LogInformation("Seeded completed inspection with findings for incident {IncidentTitle}.", inc3.Title);
            }
        }

        await _context.SaveChangesAsync(cancellationToken);

        // 2. Seed 3 Quotations for Incident 1 (for Quotation Comparison & AI Recommendation)
        // Quotation 1 (Jathu Technical Solutions - Jathurshan)
        var q1Exists = await _context.Quotations.AnyAsync(q => q.IncidentId == inc1.Id && q.ProviderId == p1.Id, cancellationToken);
        if (!q1Exists)
        {
            var q1 = new Quotation
            {
                Id = Guid.NewGuid(),
                IncidentId = inc1.Id,
                ProviderId = p1.Id,
                ValidUntilUtc = DateTime.UtcNow.AddDays(30),
                Notes = "Comprehensive plumbing rectification with 32mm SLS 147 PVC lines, brass isolation valves, and 12-month structural warranty.",
                Subtotal = 55000m,
                TaxAndOtherCharges = 3500m,
                TotalAmount = 58500m,
                Status = QuotationStatus.UnderReview,
                CreatedAtUtc = DateTime.UtcNow.AddHours(-12)
            };

            q1.Items.Add(new QuotationItem
            {
                Id = Guid.NewGuid(),
                QuotationId = q1.Id,
                Description = "Heavy-Duty PVC Pressure Pipe & Elbow Joints (32mm SLS 147)",
                Quantity = 3,
                UnitPrice = 3500m,
                TotalPrice = 10500m,
                CreatedAtUtc = DateTime.UtcNow.AddHours(-12)
            });

            q1.Items.Add(new QuotationItem
            {
                Id = Guid.NewGuid(),
                QuotationId = q1.Id,
                Description = "Brass Isolation Valves & High-Grade Solvent Cement",
                Quantity = 2,
                UnitPrice = 4000m,
                TotalPrice = 8000m,
                CreatedAtUtc = DateTime.UtcNow.AddHours(-12)
            });

            q1.Items.Add(new QuotationItem
            {
                Id = Guid.NewGuid(),
                QuotationId = q1.Id,
                Description = "Under-Sink Pantry Waterproof Sealant & Gasket Pack",
                Quantity = 1,
                UnitPrice = 6500m,
                TotalPrice = 6500m,
                CreatedAtUtc = DateTime.UtcNow.AddHours(-12)
            });

            q1.Items.Add(new QuotationItem
            {
                Id = Guid.NewGuid(),
                QuotationId = q1.Id,
                Description = "Master Plumber On-Site Labor & Joint Welding",
                Quantity = 1,
                UnitPrice = 24000m,
                TotalPrice = 24000m,
                CreatedAtUtc = DateTime.UtcNow.AddHours(-12)
            });

            q1.Items.Add(new QuotationItem
            {
                Id = Guid.NewGuid(),
                QuotationId = q1.Id,
                Description = "Hydrostatic Pressure Leak & Flow Verification Testing",
                Quantity = 1,
                UnitPrice = 6000m,
                TotalPrice = 6000m,
                CreatedAtUtc = DateTime.UtcNow.AddHours(-12)
            });

            await _context.Quotations.AddAsync(q1, cancellationToken);
        }

        // Quotation 2 (Apex Engineering & Facilities)
        if (p2 != null)
        {
            var q2Exists = await _context.Quotations.AnyAsync(q => q.IncidentId == inc1.Id && q.ProviderId == p2.Id, cancellationToken);
            if (!q2Exists)
            {
                var q2 = new Quotation
                {
                    Id = Guid.NewGuid(),
                    IncidentId = inc1.Id,
                    ProviderId = p2.Id,
                    ValidUntilUtc = DateTime.UtcNow.AddDays(25),
                    Notes = "Standard commercial plumbing restoration and pipe replacement with 6-month warranty.",
                    Subtotal = 63500m,
                    TaxAndOtherCharges = 4000m,
                    TotalAmount = 67500m,
                    Status = QuotationStatus.UnderReview,
                    CreatedAtUtc = DateTime.UtcNow.AddHours(-10)
                };

                q2.Items.Add(new QuotationItem
                {
                    Id = Guid.NewGuid(),
                    QuotationId = q2.Id,
                    Description = "Replacement Plumbing Pipework & Fittings",
                    Quantity = 1,
                    UnitPrice = 22500m,
                    TotalPrice = 22500m,
                    CreatedAtUtc = DateTime.UtcNow.AddHours(-10)
                });

                q2.Items.Add(new QuotationItem
                {
                    Id = Guid.NewGuid(),
                    QuotationId = q2.Id,
                    Description = "Sealants, Adhesive & Hardware",
                    Quantity = 1,
                    UnitPrice = 10000m,
                    TotalPrice = 10000m,
                    CreatedAtUtc = DateTime.UtcNow.AddHours(-10)
                });

                q2.Items.Add(new QuotationItem
                {
                    Id = Guid.NewGuid(),
                    QuotationId = q2.Id,
                    Description = "Skilled Labor & Plumbing Installation",
                    Quantity = 1,
                    UnitPrice = 31000m,
                    TotalPrice = 31000m,
                    CreatedAtUtc = DateTime.UtcNow.AddHours(-10)
                });

                await _context.Quotations.AddAsync(q2, cancellationToken);
            }
        }

        // Quotation 3 (Islandwide Technical Services)
        if (p3 != null)
        {
            var q3Exists = await _context.Quotations.AnyAsync(q => q.IncidentId == inc1.Id && q.ProviderId == p3.Id, cancellationToken);
            if (!q3Exists)
            {
                var q3 = new Quotation
                {
                    Id = Guid.NewGuid(),
                    IncidentId = inc1.Id,
                    ProviderId = p3.Id,
                    ValidUntilUtc = DateTime.UtcNow.AddDays(20),
                    Notes = "Emergency dispatch rate for kitchen plumbing rectification and drainage alignment.",
                    Subtotal = 68000m,
                    TaxAndOtherCharges = 4000m,
                    TotalAmount = 72000m,
                    Status = QuotationStatus.UnderReview,
                    CreatedAtUtc = DateTime.UtcNow.AddHours(-8)
                };

                q3.Items.Add(new QuotationItem
                {
                    Id = Guid.NewGuid(),
                    QuotationId = q3.Id,
                    Description = "Emergency Plumbing Materials & Pipe Sleeves",
                    Quantity = 1,
                    UnitPrice = 28000m,
                    TotalPrice = 28000m,
                    CreatedAtUtc = DateTime.UtcNow.AddHours(-8)
                });

                q3.Items.Add(new QuotationItem
                {
                    Id = Guid.NewGuid(),
                    QuotationId = q3.Id,
                    Description = "Cabinetry Protection & Leak Containment",
                    Quantity = 1,
                    UnitPrice = 12000m,
                    TotalPrice = 12000m,
                    CreatedAtUtc = DateTime.UtcNow.AddHours(-8)
                });

                q3.Items.Add(new QuotationItem
                {
                    Id = Guid.NewGuid(),
                    QuotationId = q3.Id,
                    Description = "Rapid Response Labor",
                    Quantity = 1,
                    UnitPrice = 28000m,
                    TotalPrice = 28000m,
                    CreatedAtUtc = DateTime.UtcNow.AddHours(-8)
                });

                await _context.Quotations.AddAsync(q3, cancellationToken);
            }
        }

        await _context.SaveChangesAsync(cancellationToken);
        _logger.LogInformation("Seeded 3 realistic competitive quotations with line items for Incident {IncidentTitle}.", inc1.Title);

        // 3. Seed Maintenance Jobs
        var existingJob1 = await _context.MaintenanceJobs.FirstOrDefaultAsync(j => j.IncidentId == inc1.Id, cancellationToken);
        if (existingJob1 == null)
        {
            var job1 = new MaintenanceJob
            {
                Id = Guid.NewGuid(),
                IncidentId = inc1.Id,
                ProviderId = p1.Id,
                Title = "Kitchen Main Water Pipe Leak Rectification",
                Description = "Concealed pipe joint replacement, pressure leak testing, and under-sink waterproofing.",
                ScheduledStartUtc = DateTime.UtcNow.AddDays(2),
                ScheduledEndUtc = DateTime.UtcNow.AddDays(3),
                Status = MaintenanceJobStatus.Scheduled,
                ApprovedBudget = 58500m,
                CreatedAtUtc = DateTime.UtcNow.AddHours(-6)
            };
            await _context.MaintenanceJobs.AddAsync(job1, cancellationToken);
            _logger.LogInformation("Seeded scheduled maintenance job for incident {IncidentTitle}.", inc1.Title);
        }

        if (inc3 != null)
        {
            var existingJob3 = await _context.MaintenanceJobs.FirstOrDefaultAsync(j => j.IncidentId == inc3.Id, cancellationToken);
            if (existingJob3 == null)
            {
                var job3 = new MaintenanceJob
                {
                    Id = Guid.NewGuid(),
                    IncidentId = inc3.Id,
                    ProviderId = p1.Id,
                    Title = "Roof Terracotta Tile Re-alignment & Timber Sealing",
                    Description = "Verandah eaves tile repositioning, mortar bedding, and timber rafter waterproofing.",
                    ScheduledStartUtc = DateTime.UtcNow.AddDays(-5),
                    ScheduledEndUtc = DateTime.UtcNow.AddDays(-4),
                    CompletedAtUtc = DateTime.UtcNow.AddDays(-4),
                    Status = MaintenanceJobStatus.Completed,
                    ApprovedBudget = 35000m,
                    ActualCost = 34500m,
                    CompletionNotes = "All terracotta tiles securely mortared. Passed monsoon storm resistance check.",
                    CreatedAtUtc = DateTime.UtcNow.AddDays(-5)
                };
                await _context.MaintenanceJobs.AddAsync(job3, cancellationToken);
                _logger.LogInformation("Seeded completed maintenance job for incident {IncidentTitle}.", inc3.Title);
            }
        }

        // 4. Seed Demo Workflow for Incident 1 (if none exists)
        var existingWf1 = await _context.WorkflowInstances.FirstOrDefaultAsync(w => w.IncidentId == inc1.Id, cancellationToken);
        if (existingWf1 == null)
        {
            var ownerUser = await _context.Users.FirstOrDefaultAsync(u => u.Email == "owner@assetbridge.lk" || u.Email == "owner@assetbridge.ai", cancellationToken);
            var wf1 = new WorkflowInstance
            {
                Id = Guid.NewGuid(),
                IncidentId = inc1.Id,
                CurrentState = WorkflowState.Created,
                CreatedByUserId = ownerUser?.Id ?? Guid.NewGuid(),
                CorrelationId = Guid.NewGuid().ToString("N"),
                CreatedAtUtc = DateTime.UtcNow.AddHours(-12)
            };

            var step1 = new WorkflowStep
            {
                Id = Guid.NewGuid(),
                WorkflowInstanceId = wf1.Id,
                StepState = WorkflowState.Created,
                Status = WorkflowStepStatus.InProgress,
                StartedAtUtc = DateTime.UtcNow.AddHours(-12),
                StartedBy = "System",
                Notes = "Workflow initiated for kitchen leak remediation."
            };

            var audit1 = new AuditEvent
            {
                Id = Guid.NewGuid(),
                WorkflowInstanceId = wf1.Id,
                UserId = ownerUser?.Id,
                EventType = AuditEventType.WorkflowCreated,
                Description = $"Workflow initiated for Incident: {inc1.Title}",
                CorrelationId = wf1.CorrelationId,
                CreatedAtUtc = DateTime.UtcNow.AddHours(-12)
            };

            await _context.WorkflowInstances.AddAsync(wf1, cancellationToken);
            await _context.WorkflowSteps.AddAsync(step1, cancellationToken);
            await _context.AuditEvents.AddAsync(audit1, cancellationToken);
            _logger.LogInformation("Seeded demo workflow instance for incident {IncidentTitle}.", inc1.Title);
        }

        await _context.SaveChangesAsync(cancellationToken);
    }
}
