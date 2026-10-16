class RepresentativeModel {
  final String id;
  final String userId;
  final String fullName;
  final String phoneNumber;
  final String email;
  final String district;
  final String city;
  final String? address;
  final String? nationalIdNumber;
  final String verificationStatus; // PendingReview, Verified, Rejected
  final String? verificationNotes;
  final String? bio;
  final bool isActive;
  final DateTime createdAtUtc;
  final DateTime? updatedAtUtc;

  RepresentativeModel({
    required this.id,
    required this.userId,
    required this.fullName,
    required this.phoneNumber,
    required this.email,
    required this.district,
    required this.city,
    this.address,
    this.nationalIdNumber,
    required this.verificationStatus,
    this.verificationNotes,
    this.bio,
    required this.isActive,
    required this.createdAtUtc,
    this.updatedAtUtc,
  });

  factory RepresentativeModel.fromJson(Map<String, dynamic> json) {
    return RepresentativeModel(
      id: json['id']?.toString() ?? '',
      userId: json['userId']?.toString() ?? '',
      fullName: json['fullName'] ?? 'Unnamed Representative',
      phoneNumber: json['phoneNumber'] ?? '',
      email: json['email'] ?? '',
      district: json['district'] ?? '',
      city: json['city'] ?? '',
      address: json['address'],
      nationalIdNumber: json['nationalIdNumber'],
      verificationStatus: json['verificationStatusName'] ??
          (json['verificationStatus'] is int
              ? _statusFromInt(json['verificationStatus'])
              : (json['verificationStatus']?.toString() ?? 'PendingReview')),
      verificationNotes: json['verificationNotes'],
      bio: json['bio'],
      isActive: json['isActive'] ?? true,
      createdAtUtc: json['createdAtUtc'] != null
          ? DateTime.tryParse(json['createdAtUtc']) ?? DateTime.now()
          : DateTime.now(),
      updatedAtUtc: json['updatedAtUtc'] != null
          ? DateTime.tryParse(json['updatedAtUtc'])
          : null,
    );
  }

  static String _statusFromInt(int value) {
    switch (value) {
      case 1:
        return 'Verified';
      case 2:
        return 'Rejected';
      default:
        return 'PendingReview';
    }
  }

  bool get isVerified => verificationStatus.toLowerCase() == 'verified';
  bool get isPendingReview =>
      verificationStatus.toLowerCase() == 'pendingreview' ||
      verificationStatus.toLowerCase() == 'pending review' ||
      verificationStatus.toLowerCase() == 'pending';
  bool get isRejected => verificationStatus.toLowerCase() == 'rejected';
}
