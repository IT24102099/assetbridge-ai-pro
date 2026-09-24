using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AssetBridge.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddRepresentativeAndServiceProviderCoordination : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Representatives",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    FullName = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    PhoneNumber = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Email = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    District = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    City = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Address = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    NationalIdNumber = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    VerificationStatus = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    VerificationNotes = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    Bio = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Representatives", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Representatives_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ServiceProviders",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    BusinessName = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    ContactPerson = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    PhoneNumber = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Email = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    PrimaryDistrict = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    City = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Address = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    BaseLatitude = table.Column<double>(type: "double precision", nullable: true),
                    BaseLongitude = table.Column<double>(type: "double precision", nullable: true),
                    ServiceRadiusKm = table.Column<double>(type: "double precision", nullable: false, defaultValue: 30.0),
                    VerificationStatus = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    VerificationNotes = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    Rating = table.Column<double>(type: "double precision", nullable: false, defaultValue: 5.0),
                    CompletedJobsCount = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ServiceProviders", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ServiceProviders_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ProviderAvailability",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProviderId = table.Column<Guid>(type: "uuid", nullable: false),
                    AvailableDateUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    StartTime = table.Column<TimeSpan>(type: "interval", nullable: false),
                    EndTime = table.Column<TimeSpan>(type: "interval", nullable: false),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Notes = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProviderAvailability", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProviderAvailability_ServiceProviders_ProviderId",
                        column: x => x.ProviderId,
                        principalTable: "ServiceProviders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ProviderHistory",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProviderId = table.Column<Guid>(type: "uuid", nullable: false),
                    EventType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    RatingScore = table.Column<double>(type: "double precision", nullable: true),
                    RelatedIncidentId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProviderHistory", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProviderHistory_ServiceProviders_ProviderId",
                        column: x => x.ProviderId,
                        principalTable: "ServiceProviders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ProviderSkills",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProviderId = table.Column<Guid>(type: "uuid", nullable: false),
                    Category = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    SkillName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    YearsOfExperience = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    LicenseNumber = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    IsPrimary = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    Notes = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProviderSkills", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProviderSkills_ServiceProviders_ProviderId",
                        column: x => x.ProviderId,
                        principalTable: "ServiceProviders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ProviderAvailability_AvailableDateUtc",
                table: "ProviderAvailability",
                column: "AvailableDateUtc");

            migrationBuilder.CreateIndex(
                name: "IX_ProviderAvailability_ProviderId",
                table: "ProviderAvailability",
                column: "ProviderId");

            migrationBuilder.CreateIndex(
                name: "IX_ProviderAvailability_Status",
                table: "ProviderAvailability",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_ProviderHistory_EventType",
                table: "ProviderHistory",
                column: "EventType");

            migrationBuilder.CreateIndex(
                name: "IX_ProviderHistory_ProviderId",
                table: "ProviderHistory",
                column: "ProviderId");

            migrationBuilder.CreateIndex(
                name: "IX_ProviderHistory_RelatedIncidentId",
                table: "ProviderHistory",
                column: "RelatedIncidentId");

            migrationBuilder.CreateIndex(
                name: "IX_ProviderSkills_Category",
                table: "ProviderSkills",
                column: "Category");

            migrationBuilder.CreateIndex(
                name: "IX_ProviderSkills_ProviderId",
                table: "ProviderSkills",
                column: "ProviderId");

            migrationBuilder.CreateIndex(
                name: "IX_ProviderSkills_ProviderId_Category_SkillName",
                table: "ProviderSkills",
                columns: new[] { "ProviderId", "Category", "SkillName" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Representatives_City",
                table: "Representatives",
                column: "City");

            migrationBuilder.CreateIndex(
                name: "IX_Representatives_District",
                table: "Representatives",
                column: "District");

            migrationBuilder.CreateIndex(
                name: "IX_Representatives_IsActive",
                table: "Representatives",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_Representatives_UserId",
                table: "Representatives",
                column: "UserId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Representatives_VerificationStatus",
                table: "Representatives",
                column: "VerificationStatus");

            migrationBuilder.CreateIndex(
                name: "IX_ServiceProviders_City",
                table: "ServiceProviders",
                column: "City");

            migrationBuilder.CreateIndex(
                name: "IX_ServiceProviders_IsActive",
                table: "ServiceProviders",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_ServiceProviders_PrimaryDistrict",
                table: "ServiceProviders",
                column: "PrimaryDistrict");

            migrationBuilder.CreateIndex(
                name: "IX_ServiceProviders_Rating",
                table: "ServiceProviders",
                column: "Rating");

            migrationBuilder.CreateIndex(
                name: "IX_ServiceProviders_UserId",
                table: "ServiceProviders",
                column: "UserId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ServiceProviders_VerificationStatus",
                table: "ServiceProviders",
                column: "VerificationStatus");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ProviderAvailability");

            migrationBuilder.DropTable(
                name: "ProviderHistory");

            migrationBuilder.DropTable(
                name: "ProviderSkills");

            migrationBuilder.DropTable(
                name: "Representatives");

            migrationBuilder.DropTable(
                name: "ServiceProviders");
        }
    }
}
