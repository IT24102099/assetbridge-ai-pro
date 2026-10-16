import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:assetbridge_mobile/core/networking/api_client.dart';

/// Central testing helpers and fixtures for AssetBridge AI Mobile.
/// Strictly in-memory and 100% isolated from any real database or network.
class TestHelpers {
  /// Sets up in-memory SharedPreferences with optional test token and user payload.
  static Future<void> setupMockStorage({
    String? token = 'mock-jwt-token-xyz',
    Map<String, dynamic>? user,
  }) async {
    final mockUser = user ??
        {
          'id': 'usr-001',
          'email': 'owner@assetbridge.lk',
          'fullName': 'Property Owner',
          'role': 'Owner',
          'isActive': true,
        };

    SharedPreferences.setMockInitialValues({
      if (token != null) 'jwt_token': token,
      'user_json': jsonEncode(mockUser),
    });
  }

  /// Sets up [ApiClient.clientOverride] with a custom handler.
  static void setupMockClient(Future<http.Response> Function(http.Request request) handler) {
    ApiClient.clientOverride = MockClient((request) async {
      return handler(request);
    });
  }

  /// Helper to return a successful standard ApiResponse JSON string
  static String jsonSuccess(dynamic data, {String message = 'Success'}) {
    return jsonEncode({
      'success': true,
      'message': message,
      'data': data,
      'errors': null,
    });
  }

  /// Helper to return an error standard ApiResponse JSON string
  static String jsonError(String message, {Map<String, dynamic>? errors}) {
    return jsonEncode({
      'success': false,
      'message': message,
      'data': null,
      'errors': errors,
    });
  }

  /// Helper to return a standard PagedResponse structure
  static Map<String, dynamic> pagedData(
    List<dynamic> items, {
    int totalCount = 1,
    int page = 1,
    int pageSize = 20,
  }) {
    return {
      'items': items,
      'totalCount': totalCount,
      'pageNumber': page,
      'pageSize': pageSize,
      'totalPages': (totalCount / pageSize).ceil(),
      'hasPreviousPage': page > 1,
      'hasNextPage': page * pageSize < totalCount,
    };
  }

  // --- Fixtures ---

  static Map<String, dynamic> get mockAssetJson => {
        'id': 'ast-001',
        'ownerUserId': 'usr-001',
        'name': 'Havelock Luxury Residencies',
        'propertyType': 'Apartment',
        'addressLine1': '124 Havelock Rd',
        'city': 'Colombo',
        'stateOrProvince': 'Western',
        'postalCode': '00500',
        'country': 'Sri Lanka',
        'status': 'Active',
        'activeIncidentsCount': 1,
      };

  static Map<String, dynamic> get mockIncidentJson => {
        'id': 'inc-001',
        'assetId': 'ast-001',
        'assetName': 'Havelock Luxury Residencies',
        'reportedByUserId': 'usr-001',
        'reportedByUserName': 'Property Owner',
        'title': 'Roof Leakage in Master Bedroom',
        'description': 'Water dripping during heavy rain.',
        'categoryName': 'Roofing',
        'priorityName': 'High',
        'statusName': 'Planning',
        'estimatedBudget': 60000.0,
      };

  static Map<String, dynamic> get mockInspectionJson => {
        'id': 'insp-001',
        'assetId': 'ast-001',
        'assetName': 'Havelock Luxury Residencies',
        'representativeId': 'rep-001',
        'representativeName': 'Saman Perera',
        'title': 'Monsoon Pre-Inspection',
        'statusName': 'Completed',
        'findingsSummary': 'Minor tile displacement detected on north corner.',
        'overallSeverity': 'Moderate',
        'scheduledDateUtc': '2026-10-15T09:00:00Z',
      };

  static Map<String, dynamic> get mockMaintenanceJobJson => {
        'id': 'job-001',
        'workflowInstanceId': 'wf-001',
        'assetId': 'ast-001',
        'assetName': 'Havelock Luxury Residencies',
        'providerId': 'prv-001',
        'providerBusinessName': 'Apex Roofing Specialists',
        'title': 'Roof Membrane Waterproofing',
        'description': 'Apply weather-seal coating to upper deck',
        'statusName': 'InProgress',
        'approvedBudget': 58500.0,
        'actualCost': 0.0,
        'completionNotes': null,
      };

  static Map<String, dynamic> get mockProviderJson => {
        'id': 'prv-001',
        'businessName': 'Apex Roofing Specialists',
        'contactPersonName': 'Kasun Silva',
        'email': 'apex@contractors.lk',
        'phoneNumber': '+94771122334',
        'category': 'Roofing',
        'rating': 4.9,
        'completedJobsCount': 42,
        'hourlyRate': 3500.0,
        'isVerified': true,
      };

  static Map<String, dynamic> get mockRepresentativeJson => {
        'id': 'rep-001',
        'userId': 'usr-rep-01',
        'fullName': 'Saman Perera',
        'phoneNumber': '+94771234567',
        'email': 'saman.rep@assetbridge.lk',
        'district': 'Colombo',
        'city': 'Dehiwala',
        'nationalIdNumber': '198512345678',
        'verificationStatus': 1,
        'verificationStatusName': 'Verified',
        'isActive': true,
      };

  static Map<String, dynamic> get mockQuotationJson => {
        'id': 'qte-001',
        'workflowInstanceId': 'wf-001',
        'incidentId': 'inc-001',
        'providerId': 'prv-001',
        'providerName': 'Apex Roofing Specialists',
        'title': 'Roof Waterproofing Quotation',
        'totalAmount': 58500.0,
        'currency': 'LKR',
        'statusName': 'UnderReview',
        'items': [
          {
            'id': 'qti-001',
            'quotationId': 'qte-001',
            'description': 'Waterproof membrane roll',
            'quantity': 3.0,
            'unit': 'rolls',
            'unitPrice': 12000.0,
            'totalPrice': 36000.0,
          },
          {
            'id': 'qti-002',
            'quotationId': 'qte-001',
            'description': 'Skilled application labor',
            'quantity': 15.0,
            'unit': 'hours',
            'unitPrice': 1500.0,
            'totalPrice': 22500.0,
          },
        ],
      };

  static Map<String, dynamic> get mockWorkflowJson => {
        'id': 'wf-001',
        'incidentId': 'inc-001',
        'incidentTitle': 'Roof Leakage in Master Bedroom',
        'assetId': 'ast-001',
        'assetName': 'Havelock Luxury Residencies',
        'currentStateName': 'AwaitingApproval',
        'priorityName': 'High',
        'assignedProviderName': 'Apex Roofing Specialists',
        'proposedBudget': 58500.0,
        'rejectionReason': null,
      };

  static Map<String, dynamic> get mockPropertyAssistantJson => {
        'assetId': 'ast-001',
        'assetCode': 'AS-COL-0001',
        'assetName': 'Havelock Luxury Residencies',
        'propertyTypeName': 'Apartment',
        'address': '124 Havelock Rd',
        'city': 'Colombo',
        'district': 'Colombo',
        'status': 'Active',
        'ownerId': 'usr-001',
        'ownerName': 'Property Owner',
        'ownerEmail': 'owner@assetbridge.lk',
        'authorizedRepresentativeName': 'Saman Perera',
        'thumbnailUrl': 'https://example.com/thumb.jpg',
        'currentWorkflowState': 'AwaitingApproval',
        'currentStageLabel': 'Human Governance & Owner Approval',
        'plainLanguageSummary': 'Roof repair quotation ready for owner approval.',
        'responsibleRole': 'Property Owner',
        'proposalStatus': 'SentToOwner',
        'proposedAmountLkr': 58500.0,
        'proposedProviderName': 'Apex Roofing Specialists',
        'confirmedFacts': ['Property: Havelock Luxury Residencies', 'Owner: Property Owner'],
        'aiRecommendations': ['Review & Approve Maintenance Proposal'],
        'missingInformation': ['No property photos uploaded.'],
        'awaitingHumanDecision': ['Awaiting Property Owner decision on LKR 58,500.00 proposal.'],
        'recommendedNextAction': {
          'title': 'Review & Approve Maintenance Proposal',
          'action_code': 'APPROVE_PROPOSAL',
          'description': 'Authorize repair work order.',
          'why_it_matters': 'Mandatory human governance step.',
          'what_happens_next': 'Advances to contractor execution.',
          'confidence_score': 0.99,
        },
        'auditEventsCount': 5,
        'activeFollowUpsCount': 1,
        'isAiServiceConnected': true,
      };

  static List<Map<String, dynamic>> get mockRejectionAlternativesJson => [
        {
          'alternativeType': 'RevisedQuotation',
          'title': 'Request Revised Quotation with Optimized Materials',
          'rationale': 'Substitute premium roofing felt with local SLS-certified membranes.',
          'estimatedCostRangeLkr': 'LKR 42,000 - 48,000',
          'feasibilityScore': 0.92,
          'actionCode': 'REQUEST_REVISED_QUOTE',
          'targetUrl': '/quotations',
        },
        {
          'alternativeType': 'AlternativeProvider',
          'title': 'Solicit Bids from Alternative Roofing Contractors',
          'rationale': 'Invite two alternative verified Colombo roofing specialists.',
          'estimatedCostRangeLkr': 'LKR 45,000 - 55,000',
          'feasibilityScore': 0.88,
          'actionCode': 'SOLICIT_ALTERNATIVE_BIDS',
          'targetUrl': '/providers',
        },
        {
          'alternativeType': 'ScopeReduction',
          'title': 'Partial Patch Repair Rather than Full Recoating',
          'rationale': 'Seal only the leaking chimney flashing for temporary protection.',
          'estimatedCostRangeLkr': 'LKR 20,000 - 28,000',
          'feasibilityScore': 0.79,
          'actionCode': 'REDUCE_SCOPE',
          'targetUrl': '/incidents',
        },
        {
          'alternativeType': 'DeferWork',
          'title': 'Defer Maintenance until Next Quarter Dry Season',
          'rationale': 'Postpone heavy work order until February dry window.',
          'estimatedCostRangeLkr': 'LKR 0 (Immediate)',
          'feasibilityScore': 0.65,
          'actionCode': 'DEFER_WORK',
          'targetUrl': '/workflows',
        },
      ];

  static Map<String, dynamic> get mockNotificationJson => {
        'id': 'notif-001',
        'userId': 'usr-001',
        'title': 'Proposal Ready for Review',
        'message': 'AI Proposal for Havelock Residencies requires approval.',
        'typeName': 'ProposalPending',
        'isRead': false,
        'relatedWorkflowInstanceId': 'wf-001',
        'createdAtUtc': '2026-10-16T12:00:00Z',
      };
}
