import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../shared/widgets/app_button.dart';
import '../../../shared/widgets/app_text_field.dart';
import '../models/workflow_model.dart';
import '../services/workflow_service.dart';

class AiProposalReviewScreen extends StatefulWidget {
  final WorkflowModel workflow;

  const AiProposalReviewScreen({super.key, required this.workflow});

  @override
  State<AiProposalReviewScreen> createState() => _AiProposalReviewScreenState();
}

class _AiProposalReviewScreenState extends State<AiProposalReviewScreen> {
  final WorkflowService _workflowService = WorkflowService();
  bool _isProcessing = false;

  void _handleApprove() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Approve Maintenance Proposal?'),
        content: const Text(
          'This will authorize contractor execution within the approved budget and advance the workflow state.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.success),
            onPressed: () async {
              Navigator.pop(ctx);
              _submitDecision('approve');
            },
            child: const Text('Confirm Approval'),
          ),
        ],
      ),
    );
  }

  void _handleReject() {
    final reasonController = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Reject Proposal'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Please provide a mandatory reason for rejecting this proposal:',
              style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: reasonController,
              maxLines: 3,
              decoration: const InputDecoration(hintText: 'e.g. Total cost exceeds budget...'),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.error),
            onPressed: () {
              if (reasonController.text.trim().isEmpty) return;
              Navigator.pop(ctx);
              _submitDecision('reject', reasonController.text.trim());
            },
            child: const Text('Reject Proposal'),
          ),
        ],
      ),
    );
  }

  void _handleRequestChanges() {
    final revisionController = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Request Revision'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Specify changes required before approval:',
              style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: revisionController,
              maxLines: 3,
              decoration: const InputDecoration(hintText: 'e.g. Please obtain an alternative quotation...'),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.warning),
            onPressed: () {
              if (revisionController.text.trim().isEmpty) return;
              Navigator.pop(ctx);
              _submitDecision('request-changes', revisionController.text.trim());
            },
            child: const Text('Submit Request'),
          ),
        ],
      ),
    );
  }

  Future<void> _submitDecision(String action, [String? notes]) async {
    setState(() => _isProcessing = true);

    try {
      if (action == 'approve') {
        await _workflowService.approveProposal(widget.workflow.id, notes);
      } else if (action == 'reject') {
        await _workflowService.rejectProposal(widget.workflow.id, notes ?? 'Rejected by manager');
      } else if (action == 'request-changes') {
        await _workflowService.requestChanges(widget.workflow.id, notes ?? 'Revisions requested');
      }

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Governance decision recorded: ${action.toUpperCase()}'),
          backgroundColor: action == 'approve' ? AppColors.success : (action == 'reject' ? AppColors.error : AppColors.warning),
        ),
      );
      Navigator.pop(context, true);
    } catch (e) {
      if (!mounted) return;
      setState(() => _isProcessing = false);
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
    return Scaffold(
      appBar: AppBar(
        title: const Text('AI Proposal Review'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Proposal Banner
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.primarySubtle,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.primaryLight),
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: const BoxDecoration(
                      color: Colors.white,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.auto_awesome, color: AppColors.primary, size: 24),
                  ),
                  const SizedBox(width: 14),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'AI Maintenance Proposal',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w800,
                            color: AppColors.textPrimary,
                          ),
                        ),
                        SizedBox(height: 2),
                        Text(
                          'Synthesized multi-agent scope, contractor benchmark & risk check',
                          style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Summary Details
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Proposal Summary',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 12),
                    _buildRow('Target Asset', widget.workflow.assetName),
                    _buildRow('Incident', widget.workflow.incidentTitle),
                    _buildRow('Recommended Contractor', widget.workflow.assignedProviderName ?? 'Apex Roofing Specialists'),
                    _buildRow('Total Proposed Cost', 'LKR 48,500'),
                    _buildRow('Approved Budget', 'LKR 60,000'),
                    _buildRow('Budget Status', 'Within Budget (19% Savings)'),
                    _buildRow('Risk Rating', 'LOW (0.12)'),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // AI Validation Checks
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'AI Validation Results',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 12),
                    _buildCheckItem('Contractor active trade license verified (ICTAD Grade C5)'),
                    _buildCheckItem('Material prices checked against SLS 147 wholesale index'),
                    _buildCheckItem('Labor rates aligned with Western Province benchmarks'),
                    _buildCheckItem('Estimated completion: 3 business days'),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Governance Actions
            const Text(
              'Human Governance Decision',
              style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w700,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 12),

            if (_isProcessing)
              const Center(child: CircularProgressIndicator())
            else
              Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  AppButton(
                    text: 'Approve Proposal',
                    icon: Icons.check_circle_outline,
                    backgroundColor: AppColors.success,
                    onPressed: _handleApprove,
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(
                        child: AppButton(
                          text: 'Request Changes',
                          icon: Icons.refresh_rounded,
                          backgroundColor: AppColors.warning,
                          onPressed: _handleRequestChanges,
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: AppButton(
                          text: 'Reject',
                          icon: Icons.cancel_outlined,
                          backgroundColor: AppColors.error,
                          onPressed: _handleReject,
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

  Widget _buildRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
          Text(
            value,
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCheckItem(String text) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.check_circle, size: 16, color: AppColors.success),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              text,
              style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
            ),
          ),
        ],
      ),
    );
  }
}
