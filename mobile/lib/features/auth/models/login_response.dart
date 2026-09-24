import '../../../shared/models/user_model.dart';

class LoginResponse {
  final String token;
  final String tokenType;
  final int expiresInMinutes;
  final UserModel user;

  LoginResponse({
    required this.token,
    required this.tokenType,
    required this.expiresInMinutes,
    required this.user,
  });

  factory LoginResponse.fromJson(Map<String, dynamic> json) {
    return LoginResponse(
      token: json['token'] ?? '',
      tokenType: json['tokenType'] ?? 'Bearer',
      expiresInMinutes: json['expiresInMinutes'] ?? 1440,
      user: UserModel.fromJson(json['user'] as Map<String, dynamic>),
    );
  }
}
