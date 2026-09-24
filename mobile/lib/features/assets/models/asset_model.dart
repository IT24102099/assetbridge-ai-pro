class AssetModel {
  final String id;
  final String ownerUserId;
  final String name;
  final String propertyType;
  final String addressLine1;
  final String? addressLine2;
  final String city;
  final String stateOrProvince;
  final String postalCode;
  final String country;
  final String? description;
  final double? estimatedValue;
  final int? constructionYear;
  final double? squareMeters;
  final String? primaryThumbnailUrl;
  final String status;
  final int activeIncidentsCount;
  final String? createdAtUtc;
  final String? updatedAtUtc;
  final List<AssetMediaModel> media;
  final List<AssetHistoryModel> history;

  AssetModel({
    required this.id,
    required this.ownerUserId,
    required this.name,
    required this.propertyType,
    required this.addressLine1,
    this.addressLine2,
    required this.city,
    required this.stateOrProvince,
    required this.postalCode,
    required this.country,
    this.description,
    this.estimatedValue,
    this.constructionYear,
    this.squareMeters,
    this.primaryThumbnailUrl,
    required this.status,
    this.activeIncidentsCount = 0,
    this.createdAtUtc,
    this.updatedAtUtc,
    this.media = const [],
    this.history = const [],
  });

  factory AssetModel.fromJson(Map<String, dynamic> json) {
    final rawMedia = json['media'] as List<dynamic>? ?? [];
    final rawHistory = json['history'] as List<dynamic>? ?? [];

    return AssetModel(
      id: json['id'] ?? '',
      ownerUserId: json['ownerUserId'] ?? '',
      name: json['name'] ?? '',
      propertyType: json['propertyType'] ?? 'Residential',
      addressLine1: json['addressLine1'] ?? '',
      addressLine2: json['addressLine2'],
      city: json['city'] ?? '',
      stateOrProvince: json['stateOrProvince'] ?? '',
      postalCode: json['postalCode'] ?? '',
      country: json['country'] ?? 'Sri Lanka',
      description: json['description'],
      estimatedValue: (json['estimatedValue'] as num?)?.toDouble(),
      constructionYear: json['constructionYear'] as int?,
      squareMeters: (json['squareMeters'] as num?)?.toDouble(),
      primaryThumbnailUrl: json['primaryThumbnailUrl'],
      status: json['status'] ?? 'Active',
      activeIncidentsCount: json['activeIncidentsCount'] ?? 0,
      createdAtUtc: json['createdAtUtc'],
      updatedAtUtc: json['updatedAtUtc'],
      media: rawMedia.map((e) => AssetMediaModel.fromJson(e as Map<String, dynamic>)).toList(),
      history: rawHistory.map((e) => AssetHistoryModel.fromJson(e as Map<String, dynamic>)).toList(),
    );
  }
}

class AssetMediaModel {
  final String id;
  final String assetId;
  final String fileUrl;
  final String fileName;
  final String mediaType;
  final String? caption;
  final bool isPrimaryThumbnail;
  final String? createdAtUtc;

  AssetMediaModel({
    required this.id,
    required this.assetId,
    required this.fileUrl,
    required this.fileName,
    required this.mediaType,
    this.caption,
    required this.isPrimaryThumbnail,
    this.createdAtUtc,
  });

  factory AssetMediaModel.fromJson(Map<String, dynamic> json) {
    return AssetMediaModel(
      id: json['id'] ?? '',
      assetId: json['assetId'] ?? '',
      fileUrl: json['fileUrl'] ?? '',
      fileName: json['fileName'] ?? '',
      mediaType: json['mediaType'] ?? 'Photo',
      caption: json['caption'],
      isPrimaryThumbnail: json['isPrimaryThumbnail'] ?? false,
      createdAtUtc: json['createdAtUtc'],
    );
  }
}

class AssetHistoryModel {
  final String id;
  final String assetId;
  final String eventType;
  final String title;
  final String description;
  final String? performedByUserName;
  final String? createdAtUtc;

  AssetHistoryModel({
    required this.id,
    required this.assetId,
    required this.eventType,
    required this.title,
    required this.description,
    this.performedByUserName,
    this.createdAtUtc,
  });

  factory AssetHistoryModel.fromJson(Map<String, dynamic> json) {
    return AssetHistoryModel(
      id: json['id'] ?? '',
      assetId: json['assetId'] ?? '',
      eventType: json['eventType'] ?? 'Event',
      title: json['title'] ?? '',
      description: json['description'] ?? '',
      performedByUserName: json['performedByUserName'],
      createdAtUtc: json['createdAtUtc'],
    );
  }
}
