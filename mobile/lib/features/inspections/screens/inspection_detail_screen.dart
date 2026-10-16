import 'dart:io';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/constants/app_colors.dart';
import '../../../shared/widgets/app_button.dart';
import '../../../shared/widgets/app_text_field.dart';
import '../../../shared/widgets/evidence_capture_widget.dart';
import '../../../shared/widgets/status_badge.dart';
import '../../auth/providers/auth_provider.dart';
import '../models/inspection_model.dart';
import '../services/inspection_service.dart';

class InspectionDetailScreen extends StatefulWidget {
  final InspectionModel inspection;

  const InspectionDetailScreen({
    super.key,
    required this.inspection,
  });

  @override
  State<InspectionDetailScreen> createState() => _InspectionDetailScreenState();
}

class _InspectionDetailScreenState extends State<InspectionDetailScreen> {
  final InspectionService _service = InspectionService();
  late InspectionModel _inspection;
  List<InspectionFindingModel> _findings = [];
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _inspection = widget.inspection;
    _findings = List.from(widget.inspection.findings);
    _refreshDetails();
  }

  Future<void> _refreshDetails() async {
    setState(() => _isLoading = true);
    try {
      final updated = await _service.getInspectionById(_inspection.id);
      final findings = await _service.getFindings(_inspection.id);
      setState(() {
        _inspection = updated;
        _findings = findings.isNotEmpty ? findings : updated.findings;
        _isLoading = false;
      });
    } catch (_) {
      setState(() => _isLoading = false);
    }
  }

  void _showAddFindingModal() {
    final areaController = TextEditingController();
    final descController = TextEditingController();
    final recController = TextEditingController();
    final costController = TextEditingController();
    String severity = 'Medium';
    List<File> evidenceFiles = [];
    bool isSubmitting = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) {
          return Padding(
            padding: EdgeInsets.only(
              left: 20,
              right: 20,
              top: 20,
              bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
            ),
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Record Inspection Finding',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close),
                        onPressed: () => Navigator.pop(ctx),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  AppTextField(
                    label: 'Area / Room *',
                    hint: 'e.g. Master Bathroom, Roof Terrace',
                    controller: areaController,
                  ),
                  const SizedBox(height: 12),
                  const Text(
                    'Severity *',
                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 6),
                  DropdownButtonFormField<String>(
                    value: severity,
                    items: const [
                      DropdownMenuItem(value: 'Low', child: Text('Low - Minor Cosmetic')),
                      DropdownMenuItem(value: 'Medium', child: Text('Medium - Needs Attention')),
                      DropdownMenuItem(value: 'High', child: Text('High - Significant Damage')),
                      DropdownMenuItem(value: 'Critical', child: Text('Critical - Immediate Hazard')),
                    ],
                    onChanged: (val) {
                      if (val != null) setModalState(() => severity = val);
                    },
                    decoration: const InputDecoration(
                      contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    ),
                  ),
                  const SizedBox(height: 12),
                  AppTextField(
                    label: 'Defect Description *',
                    hint: 'Describe observed defects and structural observations...',
                    controller: descController,
                    maxLines: 3,
                  ),
                  const SizedBox(height: 12),
                  AppTextField(
                    label: 'Recommended Repair Action',
                    hint: 'e.g. Waterproof membrane replacement and re-sealing',
                    controller: recController,
                  ),
                  const SizedBox(height: 12),
                  AppTextField(
                    label: 'Estimated Repair Cost (LKR)',
                    hint: 'e.g. 45000',
                    controller: costController,
                    keyboardType: TextInputType.number,
                  ),
                  const SizedBox(height: 16),
                  EvidenceCaptureWidget(
                    initialFiles: evidenceFiles,
                    onFilesChanged: (files) {
                      setModalState(() {
                        evidenceFiles = List.from(files);
                      });
                    },
                    title: 'Finding Photo Evidence',
                    subtitle: 'Capture inspection camera photos or select from gallery.',
                  ),
                  const SizedBox(height: 20),
                  AppButton(
                    text: 'Save Finding',
                    isLoading: isSubmitting,
                    onPressed: () async {
                      if (areaController.text.trim().isEmpty ||
                          descController.text.trim().isEmpty) {
                        ScaffoldMessenger.of(ctx).showSnackBar(
                          const SnackBar(
                            content: Text('Area and description are required.'),
                            backgroundColor: AppColors.error,
                          ),
                        );
                        return;
                      }

                      setModalState(() => isSubmitting = true);
                      try {
                        final cost = double.tryParse(costController.text.trim());
                        await _service.addFinding(
                          _inspection.id,
                          area: areaController.text.trim(),
                          description: descController.text.trim(),
                          severity: severity,
                          recommendation: recController.text.trim().isNotEmpty
                              ? recController.text.trim()
                              : null,
                          repairCost: cost,
                        );
                        if (ctx.mounted) Navigator.pop(ctx);
                        _refreshDetails();
                      } catch (e) {
                        setModalState(() => isSubmitting = false);
                        if (ctx.mounted) {
                          ScaffoldMessenger.of(ctx).showSnackBar(
                            SnackBar(
                              content: Text(e.toString().replaceAll('Exception: ', '')),
                              backgroundColor: AppColors.error,
                            ),
                          );
                        }
                      }
                    },
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  void _showUpdateStatusModal() {
    String newStatus = _inspection.status;
    final notesController = TextEditingController();
    bool isSubmitting = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) {
          return Padding(
            padding: EdgeInsets.only(
              left: 20,
              right: 20,
              top: 20,
              bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Update Inspection Status',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close),
                      onPressed: () => Navigator.pop(ctx),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                DropdownButtonFormField<String>(
                  value: newStatus,
                  items: const [
                    DropdownMenuItem(value: 'Scheduled', child: Text('Scheduled')),
                    DropdownMenuItem(value: 'InProgress', child: Text('In Progress')),
                    DropdownMenuItem(value: 'Completed', child: Text('Completed')),
                    DropdownMenuItem(value: 'Cancelled', child: Text('Cancelled')),
                  ],
                  onChanged: (val) {
                    if (val != null) setModalState(() => newStatus = val);
                  },
                  decoration: const InputDecoration(labelText: 'Status'),
                ),
                const SizedBox(height: 16),
                AppTextField(
                  label: 'Status Notes',
                  hint: 'Optional notes regarding inspection progress...',
                  controller: notesController,
                  maxLines: 2,
                ),
                const SizedBox(height: 20),
                AppButton(
                  text: 'Save Status',
                  isLoading: isSubmitting,
                  onPressed: () async {
                    setModalState(() => isSubmitting = true);
                    try {
                      await _service.updateStatus(
                        _inspection.id,
                        newStatus,
                        notes: notesController.text.trim().isNotEmpty
                            ? notesController.text.trim()
                            : null,
                      );
                      if (ctx.mounted) Navigator.pop(ctx);
                      _refreshDetails();
                    } catch (e) {
                      setModalState(() => isSubmitting = false);
                      if (ctx.mounted) {
                        ScaffoldMessenger.of(ctx).showSnackBar(
                          SnackBar(
                            content: Text(e.toString().replaceAll('Exception: ', '')),
                            backgroundColor: AppColors.error,
                          ),
                        );
                      }
                    }
                  },
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final canEdit = auth.user?.isManagerOrAdmin == true ||
        auth.user?.isRepresentative == true ||
        auth.user?.isServiceProvider == true;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Inspection Details'),
        actions: [
          if (canEdit)
            IconButton(
              icon: const Icon(Icons.edit_note_rounded),
              tooltip: 'Update Status',
              onPressed: _showUpdateStatusModal,
            ),
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

                    // Overall Assessment
                    if (_inspection.overallAssessment != null &&
                        _inspection.overallAssessment!.isNotEmpty) ...[
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
                                'Overall Assessment',
                                style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.textPrimary,
                                ),
                              ),
                              const SizedBox(height: 6),
                              Text(
                                _inspection.overallAssessment!,
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

                    // Findings Header
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Inspection Findings (${_findings.length})',
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            color: AppColors.textPrimary,
                          ),
                        ),
                        if (canEdit)
                          TextButton.icon(
                            icon: const Icon(Icons.add, size: 18),
                            label: const Text('Add Finding'),
                            onPressed: _showAddFindingModal,
                          ),
                      ],
                    ),
                    const SizedBox(height: 8),

                    // Findings List
                    if (_findings.isEmpty)
                      Container(
                        padding: const EdgeInsets.all(24),
                        decoration: BoxDecoration(
                          color: AppColors.surface,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: AppColors.border),
                        ),
                        child: const Center(
                          child: Column(
                            children: [
                              Icon(Icons.checklist_rounded, size: 36, color: AppColors.textMuted),
                              SizedBox(height: 8),
                              Text(
                                'No specific findings logged yet.',
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.textSecondary,
                                ),
                              ),
                            ],
                          ),
                        ),
                      )
                    else
                      ListView.builder(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        itemCount: _findings.length,
                        itemBuilder: (context, index) {
                          final f = _findings[index];
                          return _buildFindingCard(f);
                        },
                      ),
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
                  child: Text(
                    _inspection.assetName.isNotEmpty
                        ? _inspection.assetName
                        : 'Property Inspection',
                    style: const TextStyle(
                      fontSize: 17,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textPrimary,
                    ),
                  ),
                ),
                StatusBadge(status: _inspection.status),
              ],
            ),
            const SizedBox(height: 12),
            const Divider(height: 1),
            const SizedBox(height: 12),
            _buildInfoRow(
              Icons.badge_outlined,
              'Field Inspector',
              _inspection.representativeName,
            ),
            const SizedBox(height: 8),
            _buildInfoRow(
              Icons.calendar_today_outlined,
              'Scheduled Date',
              _formatDate(_inspection.scheduledDateUtc),
            ),
            if (_inspection.completedDateUtc != null) ...[
              const SizedBox(height: 8),
              _buildInfoRow(
                Icons.check_circle_outline,
                'Completed Date',
                _formatDate(_inspection.completedDateUtc!),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildFindingCard(InspectionFindingModel f) {
    Color badgeColor = AppColors.primary;
    if (f.severity.toLowerCase() == 'critical') badgeColor = AppColors.error;
    if (f.severity.toLowerCase() == 'high') badgeColor = AppColors.warning;

    return Card(
      elevation: 0,
      margin: const EdgeInsets.only(bottom: 12),
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
                Row(
                  children: [
                    const Icon(Icons.place_outlined, size: 16, color: AppColors.primary),
                    const SizedBox(width: 4),
                    Text(
                      f.area,
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary,
                      ),
                    ),
                  ],
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: badgeColor.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    f.severity,
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: badgeColor,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              f.issueDescription,
              style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
            ),
            if (f.recommendation != null && f.recommendation!.isNotEmpty) ...[
              const SizedBox(height: 8),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: AppColors.surfaceVariant,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(Icons.lightbulb_outline, size: 15, color: AppColors.primary),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        'Recommendation: ${f.recommendation!}',
                        style: const TextStyle(fontSize: 12, color: AppColors.textPrimary),
                      ),
                    ),
                  ],
                ),
              ),
            ],
            if (f.estimatedRepairCost != null) ...[
              const SizedBox(height: 10),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  Text(
                    'Est. Cost: LKR ${f.estimatedRepairCost!.toStringAsFixed(0)}',
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: AppColors.primary,
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildInfoRow(IconData icon, String label, String value) {
    return Row(
      children: [
        Icon(icon, size: 15, color: AppColors.textMuted),
        const SizedBox(width: 8),
        Text(
          '$label: ',
          style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
        ),
        Text(
          value,
          style: const TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: AppColors.textPrimary,
          ),
        ),
      ],
    );
  }

  String _formatDate(String isoString) {
    try {
      final dt = DateTime.parse(isoString);
      return '${dt.year}-${dt.month.toString().padLeft(2, '0')}-${dt.day.toString().padLeft(2, '0')}';
    } catch (_) {
      return isoString;
    }
  }
}
