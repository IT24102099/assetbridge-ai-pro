import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../shared/widgets/app_button.dart';
import '../../../shared/widgets/feedback_states.dart';
import '../../../shared/widgets/status_badge.dart';
import '../models/incident_model.dart';
import '../services/incident_service.dart';

class IncidentDetailScreen extends StatefulWidget {
  final String incidentId;

  const IncidentDetailScreen({super.key, required this.incidentId});

  @override
  State<IncidentDetailScreen> createState() => _IncidentDetailScreenState();
}

class _IncidentDetailScreenState extends State<IncidentDetailScreen> {
  final IncidentService _incidentService = IncidentService();
  IncidentModel? _incident;
  bool _isLoading = true;
  String? _errorMessage;
  bool _isUploadingEvidence = false;

  @override
  void initState() {
    super.initState();
    _loadDetails();
  }

  Future<void> _loadDetails() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final res = await _incidentService.getIncidentById(widget.incidentId);
      setState(() {
        _incident = res;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _errorMessage = e.toString().replaceAll('Exception: ', '');
        _isLoading = false;
      });
    }
  }

  Future<void> _showAddEvidenceDialog() async {
    final captionController = TextEditingController();
    final nameController = TextEditingController(text: 'site_inspection_photo.jpg');

    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return Container(
          padding: EdgeInsets.only(
            left: 20,
            right: 20,
            top: 20,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
          ),
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Attach Photo Evidence',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppColors.textPrimary),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close_rounded, color: AppColors.textMuted),
                    onPressed: () => Navigator.pop(ctx),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              TextField(
                controller: nameController,
                decoration: const InputDecoration(
                  labelText: 'File Name',
                  prefixIcon: Icon(Icons.description_outlined),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: captionController,
                decoration: const InputDecoration(
                  labelText: 'Caption / Note',
                  hintText: 'e.g. Verified pipe condition during inspection',
                  prefixIcon: Icon(Icons.comment_outlined),
                ),
              ),
              const SizedBox(height: 20),
              AppButton(
                text: 'Upload Evidence',
                icon: Icons.upload_file_rounded,
                onPressed: () async {
                  Navigator.pop(ctx);
                  setState(() => _isUploadingEvidence = true);
                  try {
                    await _incidentService.addEvidence(
                      widget.incidentId,
                      'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800',
                      nameController.text.trim(),
                      captionController.text.trim().isNotEmpty ? captionController.text.trim() : 'Mobile field evidence',
                    );
                    _loadDetails();
                  } catch (e) {
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text('Failed: $e'), backgroundColor: AppColors.error),
                      );
                    }
                  } finally {
                    if (mounted) setState(() => _isUploadingEvidence = false);
                  }
                },
              ),
            ],
          ),
        );
      },
    );
  }

  void _showImagePreview(IncidentEvidenceModel ev) {
    showDialog(
      context: context,
      builder: (ctx) => Dialog(
        backgroundColor: Colors.transparent,
        insetPadding: const EdgeInsets.all(16),
        child: Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
          ),
          clipBehavior: Clip.antiAlias,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Container(
                color: const Color(0xFF0F172A),
                height: 260,
                child: Image.network(
                  ev.fileUrl,
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => const Center(
                    child: Icon(Icons.broken_image_rounded, size: 48, color: Colors.white54),
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      ev.fileName,
                      style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: AppColors.textPrimary),
                    ),
                    if (ev.caption != null && ev.caption!.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Text(
                        ev.caption!,
                        style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                      ),
                    ],
                    const SizedBox(height: 12),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Type: ${ev.evidenceType}',
                          style: const TextStyle(fontSize: 11, color: AppColors.textMuted, fontWeight: FontWeight.w600),
                        ),
                        TextButton(
                          onPressed: () => Navigator.pop(ctx),
                          child: const Text('Close'),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text(
          'Incident Details',
          style: TextStyle(
            fontSize: 17,
            fontWeight: FontWeight.w800,
            color: AppColors.textPrimary,
            letterSpacing: -0.3,
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded, color: AppColors.textSecondary),
            onPressed: _loadDetails,
            tooltip: 'Refresh',
          ),
        ],
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const LoadingState(message: 'Loading incident data...');
    }

    if (_errorMessage != null || _incident == null) {
      return ErrorState(
        message: _errorMessage ?? 'Incident not found',
        onRetry: _loadDetails,
      );
    }

    final inc = _incident!;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 1. Hero Card
          _buildHeroCard(inc),
          const SizedBox(height: 16),

          // 2. Lifecycle Progress Tracker
          _buildLifecycleTracker(inc.status),
          const SizedBox(height: 16),

          // 3. Description & Specific Location
          _buildDescriptionCard(inc),
          const SizedBox(height: 16),

          // 4. Financials & Budget Card
          _buildFinancialsCard(inc),
          const SizedBox(height: 16),

          // 5. Photo Evidence Gallery
          _buildEvidenceGallery(inc),
          const SizedBox(height: 16),

          // 6. Deterministic AI & Orchestration Insights Section
          _buildAiResolutionSection(inc),
          const SizedBox(height: 40),
        ],
      ),
    );
  }

  Widget _buildHeroCard(IncidentModel inc) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.02),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              _buildPriorityPill(inc.priority),
              StatusBadge(status: inc.status),
            ],
          ),
          const SizedBox(height: 14),
          Text(
            inc.title,
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w800,
              color: AppColors.textPrimary,
              letterSpacing: -0.4,
            ),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              const Icon(Icons.apartment_rounded, size: 16, color: AppColors.primary),
              const SizedBox(width: 6),
              Text(
                inc.assetName,
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textSecondary,
                ),
              ),
              if (inc.assetCity != null && inc.assetCity!.isNotEmpty) ...[
                const SizedBox(width: 4),
                Text(
                  '• ${inc.assetCity}',
                  style: const TextStyle(fontSize: 13, color: AppColors.textMuted),
                ),
              ],
            ],
          ),
          const SizedBox(height: 14),
          const Divider(height: 1, color: AppColors.border),
          const SizedBox(height: 14),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              _buildMetricItem('Category', inc.category),
              _buildMetricItem(
                'Estimated Budget',
                inc.estimatedBudget != null ? 'LKR ${inc.estimatedBudget!.toStringAsFixed(0)}' : 'TBD',
              ),
              _buildMetricItem('Reporter', inc.reportedByUserName.isNotEmpty ? inc.reportedByUserName : 'Owner'),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildLifecycleTracker(String status) {
    final steps = ['Reported', 'Validating', 'Planning', 'Work In Progress', 'Resolved'];
    final s = status.toLowerCase();

    int activeIdx = 0;
    if (s.contains('validat')) activeIdx = 1;
    if (s.contains('plan') || s.contains('provider') || s.contains('inspection')) activeIdx = 2;
    if (s.contains('progress') || s.contains('work')) activeIdx = 3;
    if (s.contains('resolved') || s.contains('closed')) activeIdx = 4;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Lifecycle Progression',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w800,
                  color: AppColors.textPrimary,
                ),
              ),
              Text(
                '15-State Continuity Track',
                style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: AppColors.textMuted),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: List.generate(steps.length * 2 - 1, (index) {
              if (index.isOdd) {
                final lineIdx = index ~/ 2;
                final isDone = lineIdx < activeIdx;
                return Expanded(
                  child: Container(
                    height: 2,
                    color: isDone ? AppColors.primary : AppColors.border,
                  ),
                );
              }
              final stepIdx = index ~/ 2;
              final isCurrent = stepIdx == activeIdx;
              final isPassed = stepIdx < activeIdx;

              return Container(
                width: 24,
                height: 24,
                decoration: BoxDecoration(
                  color: isCurrent
                      ? AppColors.primary
                      : (isPassed ? AppColors.primaryLight : AppColors.surfaceVariant),
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: isCurrent ? AppColors.primaryDark : (isPassed ? AppColors.primary : AppColors.border),
                    width: 1.5,
                  ),
                ),
                child: Center(
                  child: isPassed
                      ? const Icon(Icons.check_rounded, size: 14, color: AppColors.primary)
                      : (isCurrent
                          ? const Icon(Icons.circle, size: 8, color: Colors.white)
                          : Text(
                              '${stepIdx + 1}',
                              style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: AppColors.textMuted),
                            )),
                ),
              );
            }),
          ),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Reported', style: TextStyle(fontSize: 10, color: AppColors.textMuted)),
              Text(
                steps[activeIdx],
                style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: AppColors.primary),
              ),
              const Text('Resolved', style: TextStyle(fontSize: 10, color: AppColors.textMuted)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildDescriptionCard(IncidentModel inc) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Defect Description',
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w800,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            inc.description,
            style: const TextStyle(
              fontSize: 13,
              color: AppColors.textSecondary,
              height: 1.5,
            ),
          ),
          if (inc.locationDetails != null && inc.locationDetails!.isNotEmpty) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: AppColors.surfaceVariant,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  const Icon(Icons.location_on_outlined, size: 14, color: AppColors.primary),
                  const SizedBox(width: 4),
                  Expanded(
                    child: Text(
                      'Specific Location: ${inc.locationDetails}',
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textPrimary,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildFinancialsCard(IncidentModel inc) {
    final hasBudget = inc.estimatedBudget != null && inc.estimatedBudget! > 0;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Financial Estimates & Targets',
            style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: AppColors.textPrimary),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _buildFinancialBox(
                  'Maximum Budget',
                  hasBudget ? 'LKR ${inc.estimatedBudget!.toStringAsFixed(0)}' : 'Not Specified',
                  Icons.account_balance_wallet_outlined,
                  AppColors.primary,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _buildFinancialBox(
                  'Target Deadline',
                  inc.requiredByUtc != null ? _formatDate(inc.requiredByUtc!) : 'Standard SLA',
                  Icons.event_available_outlined,
                  AppColors.info,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildFinancialBox(String title, String value, IconData icon, Color accent) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.surfaceVariant,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 14, color: accent),
              const SizedBox(width: 4),
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(fontSize: 10, color: AppColors.textMuted, fontWeight: FontWeight.w600),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            value,
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w800,
              color: AppColors.textPrimary,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEvidenceGallery(IncidentModel inc) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Photo Evidence (${inc.evidence.length})',
                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: AppColors.textPrimary),
              ),
              TextButton.icon(
                onPressed: _isUploadingEvidence ? null : _showAddEvidenceDialog,
                icon: const Icon(Icons.add_photo_alternate_rounded, size: 16),
                label: const Text('Add Evidence', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700)),
                style: TextButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  visualDensity: VisualDensity.compact,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          if (inc.evidence.isEmpty)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 20),
              decoration: BoxDecoration(
                color: AppColors.surfaceVariant,
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Column(
                children: [
                  Icon(Icons.photo_camera_back_outlined, size: 30, color: AppColors.textMuted),
                  SizedBox(height: 6),
                  Text(
                    'No photographic evidence attached yet.',
                    style: TextStyle(fontSize: 12, color: AppColors.textMuted),
                  ),
                ],
              ),
            )
          else
            ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: inc.evidence.length,
              separatorBuilder: (_, __) => const SizedBox(height: 8),
              itemBuilder: (context, index) {
                final ev = inc.evidence[index];
                return Container(
                  decoration: BoxDecoration(
                    color: AppColors.surfaceVariant,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: ListTile(
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                    onTap: () => _showImagePreview(ev),
                    leading: Container(
                      width: 48,
                      height: 48,
                      decoration: BoxDecoration(
                        color: const Color(0xFF0F172A),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      clipBehavior: Clip.antiAlias,
                      child: Image.network(
                        ev.fileUrl,
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => const Center(
                          child: Icon(Icons.photo_rounded, color: Colors.white54, size: 20),
                        ),
                      ),
                    ),
                    title: Text(
                      ev.fileName,
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
                    ),
                    subtitle: Text(
                      ev.caption ?? ev.evidenceType,
                      style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
                    ),
                    trailing: const Icon(Icons.fullscreen_rounded, color: AppColors.primary, size: 20),
                  ),
                );
              },
            ),
        ],
      ),
    );
  }

  Widget _buildAiResolutionSection(IncidentModel inc) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFF0FDF4),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFBBF7D0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: const Color(0xFF10B981),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(Icons.auto_awesome, size: 14, color: Colors.white),
              ),
              const SizedBox(width: 8),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'AI Incident Planning & Verification',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF065F46),
                      ),
                    ),
                    Text(
                      'Deterministic state engine active',
                      style: TextStyle(fontSize: 10, color: Color(0xFF047857)),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            'AssetBridge AI evaluates provider coverage and matches verified contractors for ${inc.category} incidents in ${inc.assetCity ?? "Sri Lanka"}.',
            style: const TextStyle(fontSize: 11, color: Color(0xFF065F46), height: 1.4),
          ),
        ],
      ),
    );
  }

  Widget _buildMetricItem(String label, String value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(fontSize: 10, color: AppColors.textMuted, fontWeight: FontWeight.w600),
        ),
        const SizedBox(height: 3),
        Text(
          value,
          style: const TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w800,
            color: AppColors.textPrimary,
          ),
        ),
      ],
    );
  }

  Widget _buildPriorityPill(String priority) {
    Color bg;
    Color fg;
    final p = priority.toLowerCase();

    if (p.contains('emergency') || p.contains('critical')) {
      bg = AppColors.errorSubtle;
      fg = AppColors.error;
    } else if (p.contains('high')) {
      bg = AppColors.warningSubtle;
      fg = const Color(0xFFD97706);
    } else if (p.contains('low')) {
      bg = const Color(0xFFF1F5F9);
      fg = AppColors.textSecondary;
    } else {
      bg = AppColors.primarySubtle;
      fg = AppColors.primary;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        priority,
        style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: fg),
      ),
    );
  }

  String _formatDate(String isoString) {
    try {
      final dt = DateTime.parse(isoString);
      return '${dt.day} ${_monthName(dt.month)} ${dt.year}';
    } catch (_) {
      return isoString;
    }
  }

  String _monthName(int m) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[(m - 1).clamp(0, 11)];
  }
}
