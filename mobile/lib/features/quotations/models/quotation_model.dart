class QuotationModel {
  final String id;
  final String incidentId;
  final String providerId;
  final String providerName;
  final double totalAmount;
  final double estimatedLaborCost;
  final double estimatedMaterialCost;
  final int estimatedDurationDays;
  final String status;
  final String? scopeOfWork;
  final String? submittedDateUtc;
  final List<QuotationItemModel> items;

  QuotationModel({
    required this.id,
    required this.incidentId,
    required this.providerId,
    required this.providerName,
    required this.totalAmount,
    required this.estimatedLaborCost,
    required this.estimatedMaterialCost,
    required this.estimatedDurationDays,
    required this.status,
    this.scopeOfWork,
    this.submittedDateUtc,
    this.items = const [],
  });

  factory QuotationModel.fromJson(Map<String, dynamic> json) {
    final rawItems = json['items'] as List<dynamic>? ?? [];
    return QuotationModel(
      id: json['id'] ?? '',
      incidentId: json['incidentId'] ?? '',
      providerId: json['providerId'] ?? '',
      providerName: json['providerName'] ?? json['serviceProviderName'] ?? 'Contractor',
      totalAmount: (json['totalAmount'] as num?)?.toDouble() ?? 0,
      estimatedLaborCost: (json['estimatedLaborCost'] as num?)?.toDouble() ?? 0,
      estimatedMaterialCost: (json['estimatedMaterialCost'] as num?)?.toDouble() ?? 0,
      estimatedDurationDays: json['estimatedDurationDays'] ?? 3,
      status: json['statusName'] ?? json['status'] ?? 'Pending',
      scopeOfWork: json['scopeOfWork'],
      submittedDateUtc: json['submittedDateUtc'] ?? json['createdAtUtc'],
      items: rawItems
          .map((e) => QuotationItemModel.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}

class QuotationItemModel {
  final String id;
  final String description;
  final String category;
  final double unitPrice;
  final double quantity;
  final String unit;
  final double totalPrice;

  QuotationItemModel({
    required this.id,
    required this.description,
    required this.category,
    required this.unitPrice,
    required this.quantity,
    required this.unit,
    required this.totalPrice,
  });

  factory QuotationItemModel.fromJson(Map<String, dynamic> json) {
    return QuotationItemModel(
      id: json['id'] ?? '',
      description: json['description'] ?? '',
      category: json['category'] ?? 'Material',
      unitPrice: (json['unitPrice'] as num?)?.toDouble() ?? 0,
      quantity: (json['quantity'] as num?)?.toDouble() ?? 1,
      unit: json['unit'] ?? 'Unit',
      totalPrice: (json['totalPrice'] as num?)?.toDouble() ?? 0,
    );
  }
}
