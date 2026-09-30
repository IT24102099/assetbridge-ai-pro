using System.ComponentModel.DataAnnotations;
using AssetBridge.Domain.Enums;

namespace AssetBridge.Application.DTOs.Representatives;

// Carries manager or admin verification decisions for representatives and service providers.
public class UpdateVerificationRequestDto
{
    public VerificationStatus VerificationStatus
    {
        get => _verificationStatus ?? _status ?? VerificationStatus.Pending;
        set => _verificationStatus = value;
    }
    private VerificationStatus? _verificationStatus;

    public VerificationStatus? Status
    {
        get => _verificationStatus ?? _status;
        set => _status = value;
    }
    private VerificationStatus? _status;

    [StringLength(500, ErrorMessage = "Verification notes cannot exceed 500 characters.")]
    public string? VerificationNotes
    {
        get => _verificationNotes ?? _notes;
        set => _verificationNotes = value;
    }
    private string? _verificationNotes;

    [StringLength(500, ErrorMessage = "Verification notes cannot exceed 500 characters.")]
    public string? Notes
    {
        get => _verificationNotes ?? _notes;
        set => _notes = value;
    }
    private string? _notes;
}
