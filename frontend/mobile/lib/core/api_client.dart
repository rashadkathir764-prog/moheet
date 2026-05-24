import 'dart:convert';

import 'package:http/http.dart' as http;

const apiBase = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'http://10.0.2.2:3000/api/v1',
);

class ApiClient {
  String? token;

  Map<String, String> get headers => {
    'Content-Type': 'application/json',
    if (token != null) 'Authorization': 'Bearer $token',
  };

  Future<Map<String, dynamic>> post(
    String path,
    Map<String, dynamic> body,
  ) async {
    final response = await http.post(
      Uri.parse('$apiBase$path'),
      headers: headers,
      body: jsonEncode(body),
    );
    return _decode(response);
  }

  Future<Map<String, dynamic>> get(String path) async {
    final response = await http.get(
      Uri.parse('$apiBase$path'),
      headers: headers,
    );
    return _decode(response);
  }

  Map<String, dynamic> _decode(http.Response response) {
    if (response.body.trim().isEmpty) {
      if (response.statusCode >= 400) {
        throw Exception('Request failed with status ${response.statusCode}');
      }
      return {'success': true};
    }

    final data = jsonDecode(response.body) as Map<String, dynamic>;
    if (response.statusCode >= 400) {
      throw Exception(data['message'] ?? 'Request failed');
    }
    return data;
  }
}
