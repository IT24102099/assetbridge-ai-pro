class ProviderModel {
  final String id;
  final String userId;
  final String businessName;
  final String contactPerson;
  final String email;
  final String phoneNumber;
  final String city;
  final String serviceCategory;
  final double rating;
  final int completedJobsCount;
  final bool isVerified;
  final double? hourlyRateLkr;
  final List<ProviderSkillModel> skills;

  ProviderModel({
    required this.id,
    required this.userId,
    required this.businessName,
    required this.contactPerson,
    required this.email,
    required this.phoneNumber,
    required this.city,
    required this.serviceCategory,
    required this.rating,
    required this.completedJobsCount,
    required this.isVerified,
    this.hourlyRateLkr,
    this.skills = const [],
  });

  factory ProviderModel.fromJson(Map<String, dynamic> json) {
    final rawSkills = json['skills'] as List<dynamic>? ?? [];
    return ProviderModel(
      id: json['id'] ?? '',
      userId: json['userId'] ?? '',
      businessName: json['businessName'] ?? json['fullName'] ?? 'Service Provider',
      contactPerson: json['contactPerson'] ?? json['fullName'] ?? '',
      email: json['email'] ?? '',
      phoneNumber: json['phoneNumber'] ?? '',
      city: json['city'] ?? 'Colombo',
      serviceCategory: json['serviceCategory'] ?? 'Plumbing',
      rating: (json['rating'] as num?)?.toDouble() ?? 4.8,
      completedJobsCount: json['completedJobsCount'] ?? 0,
      isVerified: json['isVerified'] ?? true,
      hourlyRateLkr: (json['hourlyRateLkr'] as num?)?.toDouble() ?? 2500,
      skills: rawSkills
          .map((e) => ProviderSkillModel.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}

class ProviderSkillModel {
  final String id;
  final String skillName;
  final String category;
  final double hourlyRateLkr;
  final int experienceYears;

  ProviderSkillModel({
    required this.id,
    required this.skillName,
    required this.category,
    required this.hourlyRateLkr,
    required this.experienceYears,
  });

  factory ProviderSkillModel.fromJson(Map<String, dynamic> json) {
    return ProviderSkillModel(
      id: json['id'] ?? '',
      skillName: json['skillName'] ?? '',
      category: json['category'] ?? '',
      hourlyRateLkr: (json['hourlyRateLkr'] as num?)?.toDouble() ?? 0,
      experienceYears: json['experienceYears'] ?? 0,
    );
  }
}
