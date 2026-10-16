class RepresentativeDocumentModel {
  final String id;
  final String representativeId;
  final String documentType; // NationalId, ProofOfAddress, PoliceReport, Other
  final String documentTypeName;
  final String fileName;
  final String fileUrl;
  final int fileSizeBytes;
  final String contentType;
  final String status; // Pending Review, Verified, Rejected
  final String? reviewerNotes;
  final String? reviewedBy;
  final DateTime uploadedAtUtc;
  final DateTime? reviewedAtUtc;

  RepresentativeDocumentModel({
    required this.id,
    required this.representativeId,
    required this.documentType,
    required this.documentTypeName,
    required this.fileName,
    required this.fileUrl,
    required this.fileSizeBytes,
    required this.contentType,
    required this.status,
    this.reviewerNotes,
    this.reviewedBy,
    required this.uploadedAtUtc,
    this.reviewedAtUtc,
  });

  factory RepresentativeDocumentModel.fromJson(Map<String, dynamic> json) {
    return RepresentativeDocumentModel(
      id: json['id']?.toString() ?? '',
      representativeId: json['representativeId']?.toString() ?? '',
      documentType: json['documentType'] ?? 'NationalId',
      documentTypeName: json['documentTypeName'] ?? json['documentType'] ?? 'NIC / Identity Document',
      fileName: json['fileName'] ?? '',
      fileUrl: json['fileUrl'] ?? '',
      fileSizeBytes: json['fileSizeBytes'] is int ? json['fileSizeBytes'] : 0,
      contentType: json['contentType'] ?? '',
      status: json['status'] ?? 'Pending Review',
      reviewerNotes: json['reviewerNotes'],
      reviewedBy: json['reviewedBy'],
      uploadedAtUtc: json['uploadedAtUtc'] != null
          ? DateTime.tryParse(json['uploadedAtUtc']) ?? DateTime.now()
          : DateTime.now(),
      reviewedAtUtc: json['reviewedAtUtc'] != null
          ? DateTime.tryParse(json['reviewedAtUtc'])
          : null,
    );
  }

  bool get isVerified => status.toLowerCase() == 'verified';
  bool get isPending =>
      status.toLowerCase() == 'pending review' ||
      status.toLowerCase() == 'pendingreview' ||
      status.toLowerCase() == 'pending';
  bool get isRejected => status.toLowerCase() == 'rejected';

  String get formattedFileSize {
    if (fileSizeBytes < 1024) return '$fileSizeBytes B';
    if (fileSizeBytes < 1024 * 1024) {
      return '${(fileSizeBytes / 1024).toStringAsFixed(1)} KB';
    }
    return '${(fileSizeBytes / (1024 * 1024)).toStringAsFixed(1)} MB';
  }
}
