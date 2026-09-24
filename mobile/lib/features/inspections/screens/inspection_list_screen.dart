import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../shared/widgets/feedback_states.dart';
import '../../../shared/widgets/status_badge.dart';
import '../models/inspection_model.dart';
import '../services/inspection_service.dart';

class InspectionListScreen extends StatefulWidget {
  const InspectionListScreen({super.key});

  @override
  State<InspectionListScreen> createState() => _InspectionListScreenState();
}

class _InspectionListScreenState extends State<InspectionListScreen> {
  final InspectionService _inspectionService = InspectionService();
  List<InspectionModel> _inspections = [];
  bool _isLoading = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _loadInspections();
  }

  Future<void> _loadInspections() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final res = await _inspectionService.getInspections();
      setState(() {
        _inspections = res.items;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _errorMessage = e.toString().replaceAll('Exception: ', '');
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Field Inspections'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadInspections,
          ),
        ],
      ),
      body: _buildContent(),
    );
  }

  Widget _buildContent() {
    if (_isLoading) {
      return const LoadingState(message: 'Loading inspections & findings...');
    }

    if (_errorMessage != null) {
      return ErrorState(
        message: _errorMessage!,
        onRetry: _loadInspections,
      );
    }

    if (_inspections.isEmpty) {
      return EmptyState(
        title: 'No Inspections Scheduled',
        message: 'No on-site technical evaluations pending at this time.',
        icon: Icons.checklist_rtl_rounded,
        actionLabel: 'Refresh',
        onAction: _loadInspections,
      );
    }

    return RefreshIndicator(
      onRefresh: _loadInspections,
      color: AppColors.primary,
      child: ListView.builder(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        itemCount: _inspections.length,
        itemBuilder: (context, index) {
          final insp = _inspections[index];
          return Card(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        insp.assetName,
                        style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      StatusBadge(status: insp.status),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Assigned Rep: ${insp.representativeName}',
                    style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                  ),
                  const SizedBox(height: 10),
                  const Divider(height: 1, color: AppColors.border),
                  const SizedBox(height: 10),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.assignment_turned_in_outlined, size: 16, color: AppColors.primary),
                          const SizedBox(width: 4),
                          Text(
                            '${insp.findings.length} Findings Recorded',
                            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.primary),
                          ),
                        ],
                      ),
                      if (insp.overallAssessment != null)
                        Text(
                          insp.overallAssessment!,
                          style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
                        ),
                    ],
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}
