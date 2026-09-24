class UserModel {
  final String id;
  final String email;
  final String fullName;
  final String? phoneNumber;
  final String role; // Owner, Representative, ServiceProvider, Manager, Admin
  final bool isActive;
  final String? createdAtUtc;
  final String? lastLoginAtUtc;

  UserModel({
    required this.id,
    required this.email,
    required this.fullName,
    this.phoneNumber,
    required this.role,
    required this.isActive,
    this.createdAtUtc,
    this.lastLoginAtUtc,
  });

  bool get isOwner => role == 'Owner';
  bool get isRepresentative => role == 'Representative';
  bool get isServiceProvider => role == 'ServiceProvider';
  bool get isManager => role == 'Manager';
  bool get isAdmin => role == 'Admin';
  bool get isManagerOrAdmin => isManager || isAdmin;

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] ?? '',
      email: json['email'] ?? '',
      fullName: json['fullName'] ?? '',
      phoneNumber: json['phoneNumber'],
      role: json['role'] ?? 'Owner',
      isActive: json['isActive'] ?? true,
      createdAtUtc: json['createdAtUtc'],
      lastLoginAtUtc: json['lastLoginAtUtc'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'fullName': fullName,
      'phoneNumber': phoneNumber,
      'role': role,
      'isActive': isActive,
      'createdAtUtc': createdAtUtc,
      'lastLoginAtUtc': lastLoginAtUtc,
    };
  }
}
