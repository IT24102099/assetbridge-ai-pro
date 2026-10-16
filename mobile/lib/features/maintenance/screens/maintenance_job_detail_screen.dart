import 'dart:io';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/constants/app_colors.dart';
import '../../../shared/widgets/app_button.dart';
import '../../../shared/widgets/app_text_field.dart';
import '../../../shared/widgets/evidence_capture_widget.dart';
import '../../../shared/widgets/status_badge.dart';
import '../../auth/providers/auth_provider.dart';
import '../models/maintenance_model.dart';
import '../services/maintenance_service.dart';

class MaintenanceJobDetailScreen extends StatefulWidget {
  final MaintenanceJobModel job;

  const MaintenanceJobDetailScreen({
    super.key,
    required this.job,
  });

  @override
  State<MaintenanceJobDetailScreen> createState() =>
      _MaintenanceJobDetailScreenState();
}

class _MaintenanceJobDetailScreenState extends State<MaintenanceJobDetailScreen> {
  final MaintenanceService _service = MaintenanceService();
  late MaintenanceJobModel _job;
  bool _isLoading = false;
  final List<File> _workPhotos = [];

  @override
  void initState() {
    super.initState();
    _job = widget.job;
    _refreshDetails();
  }

  Future<void> _refreshDetails() async {
    setState(() => _isLoading = true);
    try {
      final updated = await _service.getJobById(_job.id);
      setState(() {
        _job = updated;
        _isLoading = false;
      });
    } catch (_) {
      setState(() => _isLoading = false);
    }
  }

  void _showUpdateStatusModal() {
    String newStatus = _job.status;
    final costController = TextEditingController(
      text: _job.actualCost != null ? _job.actualCost!.toStringAsFixed(0) : '',
    );
    final notesController = TextEditingController(text: _job.completionNotes ?? '');
    List<File> modalPhotos = List.from(_workPhotos);
    bool isSubmitting = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) {
          final isCompleted = newStatus.toLowerCase() == 'completed';

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
                        'Update Maintenance Job',
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
                  const SizedBox(height: 14),
                  const Text(
                    'Job Lifecycle Status *',
                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 6),
                  DropdownButtonFormField<String>(
                    value: newStatus,
                    items: const [
                      DropdownMenuItem(value: 'Scheduled', child: Text('Scheduled')),
                      DropdownMenuItem(value: 'InProgress', child: Text('In Progress')),
                      DropdownMenuItem(value: 'OnHold', child: Text('On Hold')),
                      DropdownMenuItem(value: 'Completed', child: Text('Completed')),
                      DropdownMenuItem(value: 'Cancelled', child: Text('Cancelled')),
                    ],
                    onChanged: (val) {
                      if (val != null) setModalState(() => newStatus = val);
                    },
                    decoration: const InputDecoration(
                      contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    ),
                  ),
                  const SizedBox(height: 14),
                  if (isCompleted) ...[
                    AppTextField(
                      label: 'Actual Incurred Cost (LKR)',
                      hint: 'e.g. 52000',
                      controller: costController,
                      keyboardType: TextInputType.number,
                    ),
                    const SizedBox(height: 14),
                  ],
                  AppTextField(
                    label: 'Work Notes / Progress Remarks',
                    hint: 'Describe completed tasks, materials installed, or delays...',
                    controller: notesController,
                    maxLines: 3,
                  ),
                  const SizedBox(height: 16),
                  EvidenceCaptureWidget(
                    initialFiles: modalPhotos,
                    onFilesChanged: (files) {
                      setModalState(() {
                        modalPhotos = List.from(files);
                      });
                    },
                    title: 'Work Completion Photo Evidence',
                    subtitle: 'Take photos with camera or select from gallery.',
                  ),
                  const SizedBox(height: 20),
                  AppButton(
                    text: 'Save Job Status',
                    isLoading: isSubmitting,
                    onPressed: () async {
                      setModalState(() => isSubmitting = true);
                      try {
                        final cost = double.tryParse(costController.text.trim());
                        await _service.updateJobStatus(
                          _job.id,
                          status: newStatus,
                          actualCost: cost,
                          completionNotes: notesController.text.trim().isNotEmpty
                              ? notesController.text.trim()
                              : null,
                        );

                        setState(() {
                          _workPhotos.clear();
                          _workPhotos.addAll(modalPhotos);
                        });

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

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final canEdit = auth.user?.isManagerOrAdmin == true ||
        auth.user?.isServiceProvider == true;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Maintenance Work Order'),
        actions: [
          if (canEdit)
            IconButton(
              icon: const Icon(Icons.edit_note_rounded),
              tooltip: 'Update Job Status',
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

                    // Cost & Budget Comparison
                    _buildFinancialCard(),
                    const SizedBox(height: 16),

                    // Description & Scope
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
                              'Task Requirements',
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w700,
                                color: AppColors.textPrimary,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              _job.description.isNotEmpty
                                  ? _job.description
                                  : 'No additional task specifications provided.',
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

                    // Completion Notes
                    if (_job.completionNotes != null &&
                        _job.completionNotes!.isNotEmpty) ...[
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
                                'Completion Notes',
                                style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.textPrimary,
                                ),
                              ),
                              const SizedBox(height: 6),
                              Text(
                                _job.completionNotes!,
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

                    // Photo Evidence
                    if (_workPhotos.isNotEmpty) ...[
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
                                'Attached Work Photos',
                                style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.textPrimary,
                                ),
                              ),
                              const SizedBox(height: 10),
                              Wrap(
                                spacing: 10,
                                runSpacing: 10,
                                children: _workPhotos.map((f) {
                                  return ClipRRect(
                                    borderRadius: BorderRadius.circular(10),
                                    child: Image.file(
                                      f,
                                      width: 80,
                                      height: 80,
                                      fit: BoxFit.cover,
                                    ),
                                  );
                                }).toList(),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                    ],

                    if (canEdit && _job.status.toLowerCase() != 'completed')
                      AppButton(
                        text: 'Update Work Progress & Evidence',
                        icon: Icons.camera_alt_outlined,
                        onPressed: _showUpdateStatusModal,
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
                    _job.title,
                    style: const TextStyle(
                      fontSize: 17,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textPrimary,
                    ),
                  ),
                ),
                StatusBadge(status: _job.status),
              ],
            ),
            const SizedBox(height: 12),
            const Divider(height: 1),
            const SizedBox(height: 12),
            _buildRow(Icons.business_center_outlined, 'Assigned Contractor', _job.providerName),
            const SizedBox(height: 8),
            _buildRow(Icons.home_work_outlined, 'Property', _job.assetName),
            const SizedBox(height: 8),
            _buildRow(Icons.warning_amber_rounded, 'Related Defect', _job.incidentTitle),
          ],
        ),
      ),
    );
  }

  Widget _buildFinancialCard() {
    final variance = _job.actualCost != null ? _job.actualCost! - _job.agreedCost : null;
    final isOverBudget = variance != null && variance > 0;

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
            const Text(
              'Financial Overview',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w700,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 14),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                Column(
                  children: [
                    const Text('Approved Budget',
                        style: TextStyle(fontSize: 11, color: AppColors.textMuted)),
                    const SizedBox(height: 4),
                    Text(
                      'LKR ${_job.agreedCost.toStringAsFixed(0)}',
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary,
                      ),
                    ),
                  ],
                ),
                Container(width: 1, height: 36, color: AppColors.border),
                Column(
                  children: [
                    const Text('Actual Cost Incurred',
                        style: TextStyle(fontSize: 11, color: AppColors.textMuted)),
                    const SizedBox(height: 4),
                    Text(
                      _job.actualCost != null
                          ? 'LKR ${_job.actualCost!.toStringAsFixed(0)}'
                          : 'In Progress',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: isOverBudget ? AppColors.error : AppColors.success,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildRow(IconData icon, String label, String value) {
    return Row(
      children: [
        Icon(icon, size: 15, color: AppColors.textMuted),
        const SizedBox(width: 8),
        Text(
          '$label: ',
          style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
        ),
        Expanded(
          child: Text(
            value,
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: AppColors.textPrimary,
            ),
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }
}
