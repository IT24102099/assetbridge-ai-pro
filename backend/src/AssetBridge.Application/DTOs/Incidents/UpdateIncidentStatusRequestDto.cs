using System.ComponentModel.DataAnnotations;
using AssetBridge.Domain.Enums;

namespace AssetBridge.Application.DTOs.Incidents;

// Carries state transition requests for an incident.
// Transition validity is checked server-side according to state machine rules.
public class UpdateIncidentStatusRequestDto
{
    [Required(ErrorMessage = "New incident status is required.")]
    public IncidentStatus Status { get; set; }

    [StringLength(500, ErrorMessage = "Status update notes cannot exceed 500 characters.")]
    public string? StatusChangeReason { get; set; }
}
