import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:assetbridge_mobile/core/networking/api_client.dart';
import 'package:assetbridge_mobile/features/incidents/models/incident_model.dart';
import 'package:assetbridge_mobile/features/incidents/services/incident_service.dart';
import '../../helpers/test_helpers.dart';

void main() {
  group('IncidentService Unit Tests', () {
    late IncidentService incidentService;

    setUp(() async {
      await TestHelpers.setupMockStorage();
      incidentService = IncidentService();
    });

    tearDown(() {
      ApiClient.clientOverride = null;
    });

    test('getIncidents queries with status and priority parameters', () async {
      Uri? capturedUri;

      TestHelpers.setupMockClient((request) async {
        capturedUri = request.url;
        final paged = TestHelpers.pagedData([TestHelpers.mockIncidentJson], totalCount: 1);
        return http.Response(
          TestHelpers.jsonSuccess(paged),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      final res = await incidentService.getIncidents(page: 1, pageSize: 20, status: 'Planning', priority: 'High');

      expect(capturedUri?.queryParameters['status'], 'Planning');
      expect(capturedUri?.queryParameters['priority'], 'High');
      expect(res.items.length, 1);
      expect(res.items.first.title, 'Roof Leakage in Master Bedroom');
    });

    test('getIncidentById retrieves incident details', () async {
      TestHelpers.setupMockClient((request) async {
        expect(request.url.path, contains('/incidents/inc-001'));
        return http.Response(
          TestHelpers.jsonSuccess(TestHelpers.mockIncidentJson),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      final incident = await incidentService.getIncidentById('inc-001');

      expect(incident.id, 'inc-001');
      expect(incident.category, 'Roofing');
      expect(incident.priority, 'High');
      expect(incident.estimatedBudget, 60000.0);
    });

    test('createIncident posts in-memory defect payload and parses returned incident', () async {
      Map<String, dynamic>? postedBody;

      TestHelpers.setupMockClient((request) async {
        postedBody = jsonDecode(request.body) as Map<String, dynamic>;
        final newIncident = Map<String, dynamic>.from(TestHelpers.mockIncidentJson)
          ..['id'] = 'inc-new-001'
          ..['title'] = postedBody?['title'];

        return http.Response(
          TestHelpers.jsonSuccess(newIncident),
          201,
          headers: {'content-type': 'application/json'},
        );
      });

      final req = CreateIncidentRequest(
        assetId: 'ast-001',
        title: 'Damaged pipe under sink',
        description: 'Persistent dripping water',
        category: 'Plumbing',
        priority: 'High',
        estimatedBudget: 15000.0,
        locationDetails: 'Kitchen',
      );

      final result = await incidentService.createIncident(req);

      expect(postedBody?['title'], 'Damaged pipe under sink');
      expect(postedBody?['category'], 'Plumbing');
      expect(result.id, 'inc-new-001');
      expect(result.title, 'Damaged pipe under sink');
    });

    test('addEvidence submits photo metadata without file upload', () async {
      Map<String, dynamic>? postedBody;

      TestHelpers.setupMockClient((request) async {
        expect(request.url.path, contains('/incidents/inc-001/evidence'));
        postedBody = jsonDecode(request.body) as Map<String, dynamic>;
        return http.Response(
          TestHelpers.jsonSuccess(true),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      await incidentService.addEvidence('inc-001', 'https://example.com/photo.jpg', 'leak.jpg', 'Damaged pipe view');

      expect(postedBody?['fileUrl'], 'https://example.com/photo.jpg');
      expect(postedBody?['caption'], 'Damaged pipe view');
      expect(postedBody?['evidenceType'], 'Photo');
    });
  });
}
