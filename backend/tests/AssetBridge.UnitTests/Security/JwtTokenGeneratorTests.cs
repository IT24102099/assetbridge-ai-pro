using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using AssetBridge.Domain.Entities.Users;
using AssetBridge.Domain.Enums;
using AssetBridge.Infrastructure.Security;
using FluentAssertions;
using Microsoft.Extensions.Options;
using Xunit;

namespace AssetBridge.UnitTests.Security;

public class JwtTokenGeneratorTests
{
    private readonly JwtTokenGenerator _sut;
    private readonly JwtSettings _settings;

    public JwtTokenGeneratorTests()
    {
        _settings = new JwtSettings
        {
            Secret = "TestSecretKey_MustBeLongEnoughForHmacSha256Algorithm_1234567890!",
            Issuer = "AssetBridgeAI_Test",
            Audience = "AssetBridgeAI_Test",
            ExpiryMinutes = 60
        };

        var options = Options.Create(_settings);
        _sut = new JwtTokenGenerator(options);
    }

    [Fact]
    public void GenerateToken_ShouldReturnValidJwt_WithExpectedClaims()
    {
        // Arrange
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = "owner@assetbridge.ai",
            FullName = "Moosika Ramanathan",
            Role = UserRole.Owner,
            IsActive = true
        };

        // Act
        var tokenString = _sut.GenerateToken(user);

        // Assert
        tokenString.Should().NotBeNullOrWhiteSpace();

        var handler = new JwtSecurityTokenHandler();
        var jwtToken = handler.ReadJwtToken(tokenString);

        jwtToken.Issuer.Should().Be(_settings.Issuer);
        jwtToken.Audiences.Should().Contain(_settings.Audience);

        var claims = jwtToken.Claims.ToList();
        claims.Should().Contain(c => c.Type == JwtRegisteredClaimNames.Sub && c.Value == user.Id.ToString());
        claims.Should().Contain(c => c.Type == JwtRegisteredClaimNames.Email && c.Value == user.Email);
        claims.Should().Contain(c => (c.Type == "role" || c.Type == ClaimTypes.Role) && c.Value == UserRole.Owner.ToString());
    }
}
