using AssetBridge.Application.Common.Interfaces;
using AssetBridge.Application.DTOs.Auth;
using AssetBridge.Application.Services.Implementations;
using AssetBridge.Domain.Entities.Users;
using AssetBridge.Domain.Enums;
using AssetBridge.Domain.Exceptions;
using AssetBridge.Infrastructure.Persistence;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace AssetBridge.UnitTests.Services;

public class AuthServiceTests : IDisposable
{
    private readonly AssetBridgeDbContext _dbContext;
    private readonly Mock<IPasswordHasher> _passwordHasherMock;
    private readonly Mock<IJwtTokenGenerator> _jwtTokenGeneratorMock;
    private readonly Mock<ILogger<AuthService>> _loggerMock;
    private readonly AuthService _sut;

    public AuthServiceTests()
    {
        var dbOptions = new DbContextOptionsBuilder<AssetBridgeDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _dbContext = new AssetBridgeDbContext(dbOptions);
        _passwordHasherMock = new Mock<IPasswordHasher>();
        _jwtTokenGeneratorMock = new Mock<IJwtTokenGenerator>();
        _loggerMock = new Mock<ILogger<AuthService>>();

        _sut = new AuthService(
            _dbContext,
            _passwordHasherMock.Object,
            _jwtTokenGeneratorMock.Object,
            _loggerMock.Object);
    }

    public void Dispose()
    {
        _dbContext.Database.EnsureDeleted();
        _dbContext.Dispose();
    }

    [Fact]
    public async Task RegisterAsync_ShouldCreateUser_WhenEmailIsUnique()
    {
        // Arrange
        var request = new RegisterRequestDto
        {
            Email = "newuser@assetbridge.ai",
            Password = "Password123!",
            FullName = "Mathuppriya Naguleswaran",
            PhoneNumber = "+94771234567",
            Role = UserRole.Manager
        };

        _passwordHasherMock.Setup(x => x.HashPassword(request.Password))
            .Returns("hashed_password_sample");

        // Act
        var result = await _sut.RegisterAsync(request);

        // Assert
        result.Should().NotBeNull();
        result.Email.Should().Be(request.Email.ToLowerInvariant());
        result.FullName.Should().Be(request.FullName);
        result.Role.Should().Be(UserRole.Manager);

        var savedUser = await _dbContext.Users.FirstOrDefaultAsync(u => u.Email == request.Email.ToLowerInvariant());
        savedUser.Should().NotBeNull();
        savedUser!.PasswordHash.Should().Be("hashed_password_sample");
    }

    [Fact]
    public async Task RegisterAsync_ShouldThrowValidationException_WhenEmailAlreadyExists()
    {
        // Arrange
        var existingUser = new User
        {
            Id = Guid.NewGuid(),
            Email = "duplicate@assetbridge.ai",
            PasswordHash = "hash",
            FullName = "Existing User",
            Role = UserRole.Owner,
            IsActive = true
        };
        _dbContext.Users.Add(existingUser);
        await _dbContext.SaveChangesAsync();

        var request = new RegisterRequestDto
        {
            Email = "duplicate@assetbridge.ai",
            Password = "Password123!",
            FullName = "Another User",
            Role = UserRole.Representative
        };

        // Act
        var act = () => _sut.RegisterAsync(request);

        // Assert
        await act.Should().ThrowAsync<ValidationException>()
            .WithMessage("*already exists*");
    }

    [Fact]
    public async Task LoginAsync_ShouldReturnToken_WhenCredentialsAreValid()
    {
        // Arrange
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = "active@assetbridge.ai",
            PasswordHash = "correct_hash",
            FullName = "Kamsiga Ganesan",
            Role = UserRole.ServiceProvider,
            IsActive = true
        };
        _dbContext.Users.Add(user);
        await _dbContext.SaveChangesAsync();

        var request = new LoginRequestDto
        {
            Email = "active@assetbridge.ai",
            Password = "ValidPassword123!"
        };

        _passwordHasherMock.Setup(x => x.VerifyPassword(request.Password, user.PasswordHash))
            .Returns(true);

        _jwtTokenGeneratorMock.Setup(x => x.GenerateToken(It.Is<User>(u => u.Id == user.Id)))
            .Returns("mocked_jwt_token_string");

        // Act
        var result = await _sut.LoginAsync(request);

        // Assert
        result.Should().NotBeNull();
        result.Token.Should().Be("mocked_jwt_token_string");
        result.User.Email.Should().Be(user.Email);
        result.User.Role.Should().Be(UserRole.ServiceProvider);
    }

    [Fact]
    public async Task LoginAsync_ShouldThrowValidationException_WhenPasswordIsInvalid()
    {
        // Arrange
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = "test@assetbridge.ai",
            PasswordHash = "correct_hash",
            FullName = "Jathurshan",
            Role = UserRole.Owner,
            IsActive = true
        };
        _dbContext.Users.Add(user);
        await _dbContext.SaveChangesAsync();

        var request = new LoginRequestDto
        {
            Email = "test@assetbridge.ai",
            Password = "WrongPassword!"
        };

        _passwordHasherMock.Setup(x => x.VerifyPassword(request.Password, user.PasswordHash))
            .Returns(false);

        // Act
        var act = () => _sut.LoginAsync(request);

        // Assert
        await act.Should().ThrowAsync<ValidationException>()
            .WithMessage("Invalid email or password.");
    }
}
