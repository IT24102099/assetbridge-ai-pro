import 'package:flutter_test/flutter_test.dart';
import 'package:assetbridge_mobile/shared/models/user_model.dart';
import 'package:assetbridge_mobile/shared/models/api_response.dart';
import 'package:assetbridge_mobile/features/assets/models/asset_model.dart';
import 'package:assetbridge_mobile/features/incidents/models/incident_model.dart';
import 'package:assetbridge_mobile/features/workflows/models/workflow_model.dart';

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
  });
}
