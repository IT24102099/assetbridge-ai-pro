import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/constants/app_colors.dart';
import '../../../shared/widgets/app_button.dart';
import '../../../shared/widgets/status_badge.dart';
import '../../auth/providers/auth_provider.dart';
import '../models/quotation_model.dart';
import '../services/quotation_service.dart';

class QuotationDetailScreen extends StatefulWidget {
  final QuotationModel quotation;

  const QuotationDetailScreen({
    super.key,
    required this.quotation,
  });

  @override
  State<QuotationDetailScreen> createState() => _QuotationDetailScreenState();
}

class _QuotationDetailScreenState extends State<QuotationDetailScreen> {
  final QuotationService _service = QuotationService();
  late QuotationModel _quotation;
  bool _isLoading = false;
  bool _isSubmittingAction = false;
  Map<String, dynamic>? _budgetCheckResult;

  @override
  void initState() {
    super.initState();
    _quotation = widget.quotation;
    _refreshDetails();
  }

  Future<void> _refreshDetails() async {
    setState(() => _isLoading = true);
    try {
      final updated = await _service.getQuotationById(_quotation.id);
      setState(() {
        _quotation = updated;
      });

      // Check budget if incidentId is present
      if (_quotation.incidentId.isNotEmpty) {
        final bResult = await _service.checkBudget(
          incidentId: _quotation.incidentId,
          quotationAmount: _quotation.totalAmount,
        );
        setState(() {
          _budgetCheckResult = bResult;
        });
      }
    } catch (_) {
      // Ignore budget error
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _handleStatusUpdate(String newStatus) async {
    setState(() => _isSubmittingAction = true);
    try {
      final updated = await _service.updateQuotationStatus(_quotation.id, newStatus);
      setState(() {
        _quotation = updated;
        _isSubmittingAction = false;
      });
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Quotation status updated to $newStatus.'),
          backgroundColor: newStatus == 'Accepted' ? AppColors.success : AppColors.error,
        ),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() => _isSubmittingAction = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(e.toString().replaceAll('Exception: ', '')),
          backgroundColor: AppColors.error,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final canDecide = (auth.user?.isOwner == true || auth.user?.isManagerOrAdmin == true) &&
        _quotation.status.toLowerCase() == 'pending';

    return Scaffold(
      appBar: AppBar(
        title: const Text('Quotation Details'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: _refreshDetails,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _refreshDetails,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Header card
                    _buildHeaderCard(),
                    const SizedBox(height: 16),

                    // AI Budget Check Card
                    if (_budgetCheckResult != null) ...[
                      _buildBudgetCheckCard(),
                      const SizedBox(height: 16),
                    ],

                    // Scope of work
                    if (_quotation.scopeOfWork != null &&
                        _quotation.scopeOfWork!.isNotEmpty) ...[
                      Card(
                        elevation: 0,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                          side: const BorderSide(color: AppColors.border),
                        ),
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'Scope of Work',
                                style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.textPrimary,
                                ),
                              ),
                              const SizedBox(height: 6),
                              Text(
                                _quotation.scopeOfWork!,
                                style: const TextStyle(
                                  fontSize: 13,
                                  color: AppColors.textSecondary,
                                  height: 1.4,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                    ],

                    // Line Items
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Itemized Line Items (${_quotation.items.length})',
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            color: AppColors.textPrimary,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),

                    if (_quotation.items.isEmpty)
                      Container(
                        padding: const EdgeInsets.all(24),
                        decoration: BoxDecoration(
                          color: AppColors.surface,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: AppColors.border),
                        ),
                        child: const Center(
                          child: Text(
                            'Lump sum estimate without itemized breakdown.',
                            style: TextStyle(fontSize: 13, color: AppColors.textMuted),
                          ),
                        ),
                      )
                    else
                      ListView.builder(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        itemCount: _quotation.items.length,
                        itemBuilder: (context, index) {
                          final item = _quotation.items[index];
                          return _buildLineItemCard(item);
                        },
                      ),

                    // Actions
                    if (canDecide) ...[
                      const SizedBox(height: 24),
                      Row(
                        children: [
                          Expanded(
                            child: OutlinedButton(
                              style: OutlinedButton.styleFrom(
                                foregroundColor: AppColors.error,
                                side: const BorderSide(color: AppColors.error),
                                padding: const EdgeInsets.symmetric(vertical: 14),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                              ),
                              onPressed: _isSubmittingAction
                                  ? null
                                  : () => _handleStatusUpdate('Rejected'),
                              child: const Text('Reject Quotation'),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: AppButton(
                              text: 'Accept & Approve',
                              icon: Icons.check_circle_outline,
                              isLoading: _isSubmittingAction,
                              onPressed: () => _handleStatusUpdate('Accepted'),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildHeaderCard() {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: AppColors.border),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _quotation.providerName,
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 2),
                      const Text(
                        'Licensed Contractor Quote',
                        style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
                      ),
                    ],
                  ),
                ),
                StatusBadge(status: _quotation.status),
              ],
            ),
            const SizedBox(height: 16),
            const Divider(height: 1),
            const SizedBox(height: 14),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Total Bid Amount',
                      style: TextStyle(fontSize: 12, color: AppColors.textMuted),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'LKR ${_quotation.totalAmount.toStringAsFixed(0)}',
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w800,
                        color: AppColors.primary,
                      ),
                    ),
                  ],
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    const Text(
                      'Duration',
                      style: TextStyle(fontSize: 12, color: AppColors.textMuted),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${_quotation.estimatedDurationDays} Days',
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary,
                      ),
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Labor: LKR ${_quotation.estimatedLaborCost.toStringAsFixed(0)}',
                  style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                ),
                Text(
                  'Materials: LKR ${_quotation.estimatedMaterialCost.toStringAsFixed(0)}',
                  style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBudgetCheckCard() {
    final isWithin = _budgetCheckResult?['isWithinBudget'] == true;
    final budgetLimit = _budgetCheckResult?['approvedBudget'] ?? 0;

    return Card(
      elevation: 0,
      color: isWithin ? AppColors.successSubtle : AppColors.warningSubtle,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: isWithin ? AppColors.success : AppColors.warning),
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(
          children: [
            Icon(
              isWithin ? Icons.check_circle_rounded : Icons.warning_amber_rounded,
              color: isWithin ? AppColors.success : AppColors.warning,
              size: 26,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    isWithin ? 'Within Approved Budget' : 'Exceeds Approved Budget',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: isWithin ? AppColors.success : AppColors.warning,
                    ),
                  ),
                  Text(
                    isWithin
                        ? 'This quotation is under the target property defect budget.'
                        : 'Approved defect allocation is LKR $budgetLimit.',
                    style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLineItemCard(QuotationItemModel item) {
    return Card(
      elevation: 0,
      margin: const EdgeInsets.only(bottom: 10),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: const BorderSide(color: AppColors.border),
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    item.description,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '${item.category} • ${item.quantity} ${item.unit} @ LKR ${item.unitPrice.toStringAsFixed(0)}',
                    style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                  ),
                ],
              ),
            ),
            Text(
              'LKR ${item.totalPrice.toStringAsFixed(0)}',
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w700,
                color: AppColors.textPrimary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
