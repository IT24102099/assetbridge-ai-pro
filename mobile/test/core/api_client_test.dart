import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:assetbridge_mobile/core/networking/api_client.dart';
import 'package:assetbridge_mobile/core/networking/api_exception.dart';
import 'package:assetbridge_mobile/core/storage/token_storage.dart';
import '../helpers/test_helpers.dart';

void main() {
  group('ApiClient Networking & Error Handling Tests', () {
    setUp(() async {
      await TestHelpers.setupMockStorage(token: 'mock-auth-jwt');
    });

    tearDown(() {
      ApiClient.clientOverride = null;
      ApiClient.onUnauthorized = null;
    });

    test('GET request attaches Bearer token, Accept header and query parameters', () async {
      String? capturedAuthHeader;
      String? capturedAcceptHeader;
      Uri? capturedUri;

      TestHelpers.setupMockClient((request) async {
        capturedAuthHeader = request.headers['Authorization'];
        capturedAcceptHeader = request.headers['Accept'];
        capturedUri = request.url;

        return http.Response(
          TestHelpers.jsonSuccess({'result': 'ok'}),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      final client = ApiClient();
      final res = await client.get('/test/endpoint', queryParams: {'page': 1, 'search': 'villa'});

      expect(res['success'], true);
      expect(capturedAuthHeader, 'Bearer mock-auth-jwt');
      expect(capturedAcceptHeader, 'application/json');
      expect(capturedUri?.queryParameters['page'], '1');
      expect(capturedUri?.queryParameters['search'], 'villa');
    });

    test('POST request encodes JSON payload and sets Content-Type', () async {
      String? capturedContentType;
      String? capturedBody;

      TestHelpers.setupMockClient((request) async {
        capturedContentType = request.headers['Content-Type'];
        capturedBody = request.body;

        return http.Response(
          TestHelpers.jsonSuccess({'id': 'new-item-123'}),
          201,
          headers: {'content-type': 'application/json'},
        );
      });

      final client = ApiClient();
      final res = await client.post('/test/create', body: {'title': 'New Incident', 'priority': 'High'});

      expect(res['success'], true);
      expect(capturedContentType, 'application/json');
      final decoded = jsonDecode(capturedBody!);
      expect(decoded['title'], 'New Incident');
      expect(decoded['priority'], 'High');
    });

    test('PUT, PATCH, DELETE methods execute successfully', () async {
      final methodsCalled = <String>[];

      TestHelpers.setupMockClient((request) async {
        methodsCalled.add(request.method);
        return http.Response(
          TestHelpers.jsonSuccess(true),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      final client = ApiClient();
      await client.put('/test/update', body: {'name': 'Updated'});
      await client.patch('/test/patch', body: {'status': 'Active'});
      await client.delete('/test/delete');

      expect(methodsCalled, ['PUT', 'PATCH', 'DELETE']);
    });

    test('HTTP 401 Unauthorized clears token storage and invokes onUnauthorized callback', () async {
      bool unauthorizedCallbackFired = false;
      ApiClient.onUnauthorized = () {
        unauthorizedCallbackFired = true;
      };

      TestHelpers.setupMockClient((request) async {
        return http.Response(
          jsonEncode({'message': 'Session expired or invalid token'}),
          401,
          headers: {'content-type': 'application/json'},
        );
      });

      final client = ApiClient();

      await expectLater(
        () => client.get('/protected/resource'),
        throwsA(isA<ApiException>().having((e) => e.statusCode, 'statusCode', 401)),
      );

      // Verify callback was invoked
      expect(unauthorizedCallbackFired, true);

      // Verify token was cleared
      final token = await TokenStorage.getToken();
      expect(token, isNull);
    });

    test('HTTP 400 Validation Error extracts structured field errors', () async {
      TestHelpers.setupMockClient((request) async {
        return http.Response(
          jsonEncode({
            'message': 'One or more validation errors occurred.',
            'errors': {
              'Title': ['Title is required'],
              'EstimatedBudget': ['Budget must be greater than zero'],
            },
          }),
          400,
          headers: {'content-type': 'application/json'},
        );
      });

      final client = ApiClient();

      try {
        await client.post('/incidents', body: {});
        fail('Should have thrown ApiException');
      } on ApiException catch (e) {
        expect(e.statusCode, 400);
        expect(e.message, 'One or more validation errors occurred.');
        expect(e.errors?['Title'], contains('Title is required'));
        expect(e.errors?['EstimatedBudget'], contains('Budget must be greater than zero'));
      }
    });

    test('HTTP 500 Internal Server Error throws descriptive ApiException', () async {
      TestHelpers.setupMockClient((request) async {
        return http.Response(
          jsonEncode({'message': 'Internal Server Error'}),
          500,
          headers: {'content-type': 'application/json'},
        );
      });

      final client = ApiClient();

      await expectLater(
        () => client.get('/crash'),
        throwsA(isA<ApiException>()
            .having((e) => e.statusCode, 'statusCode', 500)
            .having((e) => e.message, 'message', 'Internal Server Error')),
      );
    });

    test('Network failure throws ApiException with user friendly retry guidance', () async {
      TestHelpers.setupMockClient((request) async {
        throw http.ClientException('Connection reset by peer');
      });

      final client = ApiClient();

      await expectLater(
        () => client.get('/timeout-url'),
        throwsA(isA<ApiException>().having(
          (e) => e.message,
          'message',
          contains('Network connection issue or server waking up'),
        )),
      );
    });
  });
}
