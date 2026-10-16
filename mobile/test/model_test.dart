import 'package:flutter_test/flutter_test.dart';
import 'package:assetbridge_mobile/shared/models/user_model.dart';
import 'package:assetbridge_mobile/shared/models/api_response.dart';
import 'package:assetbridge_mobile/features/assets/models/asset_model.dart';
import 'package:assetbridge_mobile/features/incidents/models/incident_model.dart';
import 'package:assetbridge_mobile/features/workflows/models/workflow_model.dart';
import 'package:assetbridge_mobile/features/representatives/models/representative_model.dart';
import 'package:assetbridge_mobile/features/representatives/models/representative_document_model.dart';
import 'package:assetbridge_mobile/features/providers/models/provider_model.dart';
import 'package:assetbridge_mobile/features/inspections/models/inspection_model.dart';
import 'package:assetbridge_mobile/features/quotations/models/quotation_model.dart';
import 'package:assetbridge_mobile/features/maintenance/models/maintenance_model.dart';
import 'package:assetbridge_mobile/features/notifications/models/notification_model.dart';

import 'package:assetbridge_mobile/features/workflows/models/property_workflow_assistant_model.dart';

void main() {
  group('AssetBridge AI Mobile Model Parsing Tests', () {
    test('UserModel parses backend JSON correctly', () {
      final json = {
        'id': 'usr-001',
        'email': 'owner@assetbridge.com',
        'fullName': 'Property Owner',
        'role': 'Owner',
        'isActive': true,
      };

      final user = UserModel.fromJson(json);
      expect(user.id, 'usr-001');
      expect(user.email, 'owner@assetbridge.com');
      expect(user.isOwner, true);
      expect(user.isManagerOrAdmin, false);
    });

    test('ApiResponse parses generic success wrapper correctly', () {
      final json = {
        'success': true,
        'message': 'Success',
        'data': {
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
        },
      };

      final response = ApiResponse<AssetModel>.fromJson(
        json,
        (data) => AssetModel.fromJson(data as Map<String, dynamic>),
      );

      expect(response.success, true);
      expect(response.data?.name, 'Havelock Luxury Residencies');
      expect(response.data?.city, 'Colombo');
      expect(response.data?.activeIncidentsCount, 1);
    });

    test('IncidentModel parses defect payload correctly', () {
      final json = {
        'id': 'inc-001',
        'assetId': 'ast-001',
        'assetName': 'Havelock Residencies',
        'reportedByUserId': 'usr-001',
        'reportedByUserName': 'Property Owner',
        'title': 'Roof Leakage in Master Bedroom',
        'description': 'Water dripping during heavy monsoon rain',
        'categoryName': 'Roofing',
        'priorityName': 'High',
        'statusName': 'Planning',
        'estimatedBudget': 60000.0,
      };

      final incident = IncidentModel.fromJson(json);
      expect(incident.id, 'inc-001');
      expect(incident.category, 'Roofing');
      expect(incident.priority, 'High');
      expect(incident.estimatedBudget, 60000.0);
    });

    test('WorkflowModel parses 15-state backend instance', () {
      final json = {
        'id': 'wf-001',
        'incidentId': 'inc-001',
        'incidentTitle': 'Roof Leakage Repair',
        'assetId': 'ast-001',
        'assetName': 'Havelock Residencies',
        'currentStateName': 'AwaitingApproval',
        'priorityName': 'High',
        'assignedProviderName': 'Apex Roofing Specialists',
      };

      final workflow = WorkflowModel.fromJson(json);
      expect(workflow.id, 'wf-001');
      expect(workflow.currentState, 'AwaitingApproval');
      expect(workflow.assignedProviderName, 'Apex Roofing Specialists');
    });

    test('RepresentativeModel parses directory & verification data', () {
      final json = {
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

      final rep = RepresentativeModel.fromJson(json);
      expect(rep.id, 'rep-001');
      expect(rep.fullName, 'Saman Perera');
      expect(rep.nationalIdNumber, '198512345678');
      expect(rep.isVerified, true);
      expect(rep.isPendingReview, false);
    });

    test('RepresentativeDocumentModel parses NIC document & formats size', () {
      final json = {
        'id': 'doc-001',
        'representativeId': 'rep-001',
        'documentType': 'NationalId',
        'documentTypeName': 'National Identity Card (NIC)',
        'fileName': 'saman_nic_front_back.jpg',
        'fileUrl': 'https://storage.assetbridge.lk/docs/saman_nic.jpg',
        'fileSizeBytes': 1024 * 1024 * 2, // 2MB
        'contentType': 'image/jpeg',
        'status': 'Pending Review',
        'uploadedAtUtc': '2026-10-15T10:00:00Z',
      };

      final doc = RepresentativeDocumentModel.fromJson(json);
      expect(doc.id, 'doc-001');
      expect(doc.documentType, 'NationalId');
      expect(doc.isPending, true);
      expect(doc.isVerified, false);
      expect(doc.formattedFileSize, '2.0 MB');
    });

    test('ProviderModel parses skills and hourly rate', () {
      final json = {
        'id': 'prv-001',
        'userId': 'usr-prv-01',
        'businessName': 'Colombo Master Plumbers',
        'contactPerson': 'Sunil Fernando',
        'email': 'sunil@plumbers.lk',
        'phoneNumber': '+94719876543',
        'city': 'Colombo',
        'serviceCategory': 'Plumbing',
        'rating': 4.9,
        'completedJobsCount': 28,
        'isVerified': true,
        'hourlyRateLkr': 3500.0,
        'skills': [
          {
            'id': 'sk-01',
            'skillName': 'Pipe Relining',
            'category': 'Plumbing',
            'hourlyRateLkr': 3500.0,
            'experienceYears': 8,
          }
        ],
      };

      final provider = ProviderModel.fromJson(json);
      expect(provider.id, 'prv-001');
      expect(provider.businessName, 'Colombo Master Plumbers');
      expect(provider.skills.length, 1);
      expect(provider.skills.first.skillName, 'Pipe Relining');
      expect(provider.rating, 4.9);
    });

    test('InspectionModel parses checklist findings and severity', () {
      final json = {
        'id': 'insp-001',
        'assetId': 'ast-001',
        'assetName': 'Havelock Luxury Residencies',
        'representativeId': 'rep-001',
        'representativeName': 'Saman Perera',
        'scheduledDateUtc': '2026-10-18T09:00:00Z',
        'statusName': 'InProgress',
        'overallAssessment': 'Urgent roof repairs needed.',
        'findings': [
          {
            'id': 'fnd-01',
            'area': 'Roof Terrace',
            'issueDescription': 'Broken waterproofing membrane',
            'severity': 'Critical',
            'recommendation': 'Install high-grade bitumen membrane',
            'estimatedRepairCost': 75000.0,
          }
        ],
      };

      final inspection = InspectionModel.fromJson(json);
      expect(inspection.id, 'insp-001');
      expect(inspection.status, 'InProgress');
      expect(inspection.findings.length, 1);
      expect(inspection.findings.first.severity, 'Critical');
      expect(inspection.findings.first.estimatedRepairCost, 75000.0);
    });

    test('QuotationModel parses itemized quotation and costs', () {
      final json = {
        'id': 'qt-001',
        'incidentId': 'inc-001',
        'providerId': 'prv-001',
        'providerName': 'Colombo Master Plumbers',
        'totalAmount': 55000.0,
        'estimatedLaborCost': 20000.0,
        'estimatedMaterialCost': 35000.0,
        'estimatedDurationDays': 4,
        'statusName': 'Pending',
        'scopeOfWork': 'Complete pipe replacement and pressure testing',
        'items': [
          {
            'id': 'item-01',
            'description': 'PVC High Pressure Pipes (4 inch)',
            'category': 'Material',
            'unitPrice': 3500.0,
            'quantity': 10.0,
            'unit': 'Lengths',
            'totalPrice': 35000.0,
          }
        ],
      };

      final quotation = QuotationModel.fromJson(json);
      expect(quotation.id, 'qt-001');
      expect(quotation.totalAmount, 55000.0);
      expect(quotation.items.length, 1);
      expect(quotation.items.first.totalPrice, 35000.0);
    });

    test('MaintenanceJobModel parses lifecycle and budget tracking', () {
      final json = {
        'id': 'job-001',
        'incidentId': 'inc-001',
        'incidentTitle': 'Pipe Leak Repair',
        'assetId': 'ast-001',
        'assetName': 'Havelock Residencies',
        'providerId': 'prv-001',
        'providerBusinessName': 'Colombo Master Plumbers',
        'title': 'Emergency Plumbing Execution',
        'description': 'Fix damaged pipes',
        'statusName': 'Completed',
        'approvedBudget': 55000.0,
        'actualCost': 52500.0,
        'completionNotes': 'Successfully pressure tested and certified.',
      };

      final job = MaintenanceJobModel.fromJson(json);
      expect(job.id, 'job-001');
      expect(job.status, 'Completed');
      expect(job.agreedCost, 55000.0);
      expect(job.actualCost, 52500.0);
      expect(job.completionNotes, 'Successfully pressure tested and certified.');
    });

    test('PropertyWorkflowAssistantModel parses backend JSON response and intelligence matrix correctly', () {
      final json = {
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
        'ownerEmail': 'owner@assetbridge.com',
        'authorizedRepresentativeName': 'Sunil Silva',
        'thumbnailUrl': 'https://example.com/thumb.jpg',
        'currentWorkflowState': 'AwaitingApproval',
        'currentStageLabel': 'Human Governance & Owner Approval',
        'plainLanguageSummary': 'Roof repair quotation ready for owner approval.',
        'responsibleRole': 'Property Owner',
        'proposalStatus': 'SentToOwner',
        'proposedAmountLkr': 58500.0,
        'proposedProviderName': 'Apex Roofing Specialists',
        'confirmedFacts': ['Property: Havelock Luxury Residencies', 'Owner: Property Owner'],
        'aiRecommendations': ['Primary Next Action: Review & Approve Maintenance Proposal'],
        'missingInformation': ['No property photos uploaded.'],
        'awaitingHumanDecision': ['Awaiting Property Owner decision on LKR 58,500.00 proposal.'],
        'recommendedNextAction': {
          'title': 'Review & Approve Maintenance Proposal',
          'action_code': 'APPROVE_PROPOSAL',
          'description': 'Authorize repair work order.',
          'why_it_matters': 'Mandatory human governance step.',
          'what_happens_next': 'Advances to execution.',
          'confidence_score': 0.99,
        },
        'auditEventsCount': 5,
        'activeFollowUpsCount': 1,
        'isAiServiceConnected': true,
      };

      final model = PropertyWorkflowAssistantModel.fromJson(json);
      expect(model.assetId, 'ast-001');
      expect(model.assetCode, 'AS-COL-0001');
      expect(model.proposalStatus, 'SentToOwner');
      expect(model.proposedAmountLkr, 58500.0);
      expect(model.proposedProviderName, 'Apex Roofing Specialists');
      expect(model.confirmedFacts.length, 2);
      expect(model.aiRecommendations.length, 1);
      expect(model.missingInformation.length, 1);
      expect(model.awaitingHumanDecision.length, 1);
      expect(model.recommendedNextAction.actionCode, 'APPROVE_PROPOSAL');
      expect(model.recommendedNextAction.confidenceScore, 0.99);
      expect(model.isAiServiceConnected, true);
    });

    test('ProposalAlternativeModel parses 4 rejection alternatives and feasibility score correctly', () {
      final json = {
        'alternativeType': 'RevisedQuotation',
        'title': 'Request Revised Quotation with Optimized Materials',
        'rationale': 'Instruct contractor to substitute premium roofing felt with local SLS-certified membranes.',
        'estimatedCostRangeLkr': 'LKR 42,000 - 48,000',
        'feasibilityScore': 0.92,
        'actionCode': 'REQUEST_REVISED_QUOTE',
        'targetUrl': '/quotations',
      };

      final alt = ProposalAlternativeModel.fromJson(json);
      expect(alt.alternativeType, 'RevisedQuotation');
      expect(alt.title, 'Request Revised Quotation with Optimized Materials');
      expect(alt.estimatedCostRangeLkr, 'LKR 42,000 - 48,000');
      expect(alt.feasibilityScore, 0.92);
      expect(alt.actionCode, 'REQUEST_REVISED_QUOTE');
    });
  });
}
