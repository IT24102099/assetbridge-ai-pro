using AssetBridge.Infrastructure.Security;
using FluentAssertions;
using Xunit;

namespace AssetBridge.UnitTests.Security;

public class PasswordHasherTests
{
    private readonly PasswordHasher _sut = new();

    [Fact]
    public void HashPassword_ShouldReturnHashedString_WhenGivenPlainTextPassword()
    {
        // Arrange
        const string plainPassword = "SecurePassword123!";

        // Act
        var hash = _sut.HashPassword(plainPassword);

        // Assert
        hash.Should().NotBeNullOrWhiteSpace();
        hash.Should().NotBe(plainPassword);
        hash.Should().StartWith("$2"); // BCrypt signature
    }

    [Fact]
    public void VerifyPassword_ShouldReturnTrue_WhenPasswordMatchesHash()
    {
        // Arrange
        const string plainPassword = "SecurePassword123!";
        var hash = _sut.HashPassword(plainPassword);

        // Act
        var result = _sut.VerifyPassword(plainPassword, hash);

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public void VerifyPassword_ShouldReturnFalse_WhenPasswordDoesNotMatchHash()
    {
        // Arrange
        const string plainPassword = "SecurePassword123!";
        const string wrongPassword = "WrongPassword999!";
        var hash = _sut.HashPassword(plainPassword);

        // Act
        var result = _sut.VerifyPassword(wrongPassword, hash);

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public void VerifyPassword_ShouldReturnFalse_WhenHashIsInvalid()
    {
        // Arrange
        const string plainPassword = "SecurePassword123!";
        const string invalidHash = "not-a-valid-bcrypt-hash";

        // Act
        var result = _sut.VerifyPassword(plainPassword, invalidHash);

        // Assert
        result.Should().BeFalse();
    }
}
