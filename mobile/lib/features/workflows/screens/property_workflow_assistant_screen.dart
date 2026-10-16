import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/constants/app_colors.dart';
import '../../../shared/widgets/app_button.dart';
import '../../../shared/widgets/feedback_states.dart';
import '../../../shared/widgets/status_badge.dart';
import '../../auth/providers/auth_provider.dart';
import '../models/property_workflow_assistant_model.dart';
import '../services/workflow_service.dart';

class PropertyWorkflowAssistantScreen extends StatefulWidget {
  final String assetId;
  final String? assetName;

  const PropertyWorkflowAssistantScreen({
    super.key,
    required this.assetId,
    this.assetName,
  });

  @override
  State<PropertyWorkflowAssistantScreen> createState() => _PropertyWorkflowAssistantScreenState();
}

class _PropertyWorkflowAssistantScreenState extends State<PropertyWorkflowAssistantScreen> {
  final WorkflowService _workflowService = WorkflowService();
  PropertyWorkflowAssistantModel? _data;
  bool _isLoading = true;
  String? _errorMessage;
  bool _isActionProcessing = false;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final res = await _workflowService.getPropertyWorkflowAssistant(widget.assetId);
      if (mounted) {
        setState(() {
          _data = res;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = e.toString().replaceAll('Exception: ', '');
          _isLoading = false;
        });
      }
    }
  }

  void _showSendProposalDialog() {
    if (_data == null || _data!.activeWorkflowId == null) return;
    final notesController = TextEditingController();

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.send_rounded, color: AppColors.primary, size: 22),
            SizedBox(width: 8),
            Text('Dispatch Proposal to Owner'),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Property: ${_data!.assetName}',
              style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
            ),
            const SizedBox(height: 4),
            Text(
              'Proposed Amount: LKR ${_data!.proposedAmountLkr != null ? _data!.proposedAmountLkr!.toStringAsFixed(2) : "Quoted Amount"}',
              style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
            ),
            const SizedBox(height: 12),
            const Text(
              'Manager Proposal Notes (Optional):',
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 6),
            TextField(
              controller: notesController,
              maxLines: 3,
              decoration: const InputDecoration(
                hintText: 'e.g. Reviewed contractor CIDA credentials and approved scope...',
                border: OutlineInputBorder(),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
            onPressed: () async {
              Navigator.pop(ctx);
              _submitSendProposal(notesController.text.trim());
            },
            child: const Text('Send Proposal'),
          ),
        ],
      ),
    );
  }

  Future<void> _submitSendProposal(String notes) async {
    setState(() => _isActionProcessing = true);
    try {
      await _workflowService.sendProposalToOwner(
        _data!.activeWorkflowId!,
        quotationId: _data!.proposedQuotationId,
        proposalNotes: notes.isNotEmpty ? notes : null,
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Proposal successfully dispatched to ${_data!.ownerName} with in-app notification.'),
          backgroundColor: AppColors.success,
        ),
      );
      await _loadData();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(e.toString().replaceAll('Exception: ', '')),
          backgroundColor: AppColors.error,
        ),
      );
    } finally {
      if (mounted) setState(() => _isActionProcessing = false);
    }
  }

  void _showOwnerDecisionDialog(String decision) {
    if (_data == null || _data!.activeWorkflowId == null) return;
    final reasonController = TextEditingController();
    final commentsController = TextEditingController();
    final isReject = decision == 'Reject';

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Row(
          children: [
            Icon(
              isReject ? Icons.cancel_outlined : Icons.check_circle_outline,
              color: isReject ? AppColors.error : AppColors.success,
              size: 22,
            ),
            const SizedBox(width: 8),
            Text(isReject ? 'Reject / Request Changes' : 'Accept Maintenance Proposal'),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              isReject
                  ? 'Please specify a mandatory reason for rejecting this proposal so the local manager can authorize an alternative:'
                  : 'Authorizing this proposal will notify the property manager to schedule execution with the contractor.',
              style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
            ),
            const SizedBox(height: 12),
            if (isReject) ...[
              const Text(
                'Rejection Reason * (Mandatory):',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 6),
              TextField(
                controller: reasonController,
                maxLines: 2,
                decoration: const InputDecoration(
                  hintText: 'e.g. Quotation exceeds budget allowance...',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 10),
            ],
            Text(
              isReject ? 'Additional Notes (Optional):' : 'Approval Comments (Optional):',
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 6),
            TextField(
              controller: commentsController,
              maxLines: 2,
              decoration: InputDecoration(
                hintText: isReject ? 'e.g. Prefer an alternative contractor...' : 'e.g. Approved, proceed with work...',
                border: const OutlineInputBorder(),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: isReject ? AppColors.error : AppColors.success,
            ),
            onPressed: () {
              if (isReject && reasonController.text.trim().isEmpty) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Please enter a mandatory reason for rejection.'),
                    backgroundColor: AppColors.error,
                  ),
                );
                return;
              }
              Navigator.pop(ctx);
              _submitOwnerDecision(
                decision,
                reasonController.text.trim(),
                commentsController.text.trim(),
              );
            },
            child: Text(isReject ? 'Confirm Rejection' : 'Confirm Acceptance'),
          ),
        ],
      ),
    );
  }

  Future<void> _submitOwnerDecision(String decision, String reason, String comments) async {
    setState(() => _isActionProcessing = true);
    try {
      await _workflowService.processOwnerDecision(
        _data!.activeWorkflowId!,
        decision: decision,
        rejectionReason: reason.isNotEmpty ? reason : null,
        comments: comments.isNotEmpty ? comments : null,
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(decision == 'Approve'
              ? 'Proposal accepted! Property manager notified to schedule execution.'
              : 'Proposal rejected. AI Assistant generated 4 practical alternatives for manager review.'),
          backgroundColor: decision == 'Approve' ? AppColors.success : AppColors.warning,
        ),
      );
      await _loadData();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(e.toString().replaceAll('Exception: ', '')),
          backgroundColor: AppColors.error,
        ),
      );
    } finally {
      if (mounted) setState(() => _isActionProcessing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_data?.assetName ?? widget.assetName ?? 'Property Workflow Assistant'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _isLoading ? null : _loadData,
          ),
        ],
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const LoadingState(message: 'Synthesizing property workflow intelligence...');
    }

    if (_errorMessage != null || _data == null) {
      return ErrorState(
        message: _errorMessage ?? 'Failed to load property assistant.',
        onRetry: _loadData,
      );
    }

    final data = _data!;
    final user = context.watch<AuthProvider>().user;
    final isManagerOrAdmin = user?.isManagerOrAdmin ?? false;
    final isOwner = user?.isOwner ?? false;

    return RefreshIndicator(
      onRefresh: _loadData,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1. Property Hero Header Card
            _buildPropertyHeroCard(data),
            const SizedBox(height: 16),

            // 2. Proposal Lifecycle Banner & Governance Controls
            _buildProposalGovernanceBanner(data, isManagerOrAdmin, isOwner),
            const SizedBox(height: 16),

            // 3. Grounded Rejection Alternatives (if rejected)
            if (data.proposalStatus == 'RejectedByOwner' && data.rejectionAlternatives.isNotEmpty) ...[
              _buildRejectionAlternativesSection(data.rejectionAlternatives),
              const SizedBox(height: 16),
            ],

            // 4. Executive Briefing & Recommended Next Action Card
            _buildExecutiveSummaryCard(data),
            const SizedBox(height: 16),

            // 5. Four Grounded Intelligence Quadrants
            _buildIntelligenceQuadrants(data),
            const SizedBox(height: 20),

            // 6. Correlated Records Summary (Incidents, Inspections, Quotations, Jobs)
            _buildCorrelatedRecordsSection(data),
            const SizedBox(height: 20),

            // 7. Observability & Continuity Highlights
            _buildObservabilitySection(data),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  Widget _buildPropertyHeroCard(PropertyWorkflowAssistantModel data) {
    return Card(
      clipBehavior: Clip.antiAlias,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      elevation: 2,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (data.thumbnailUrl != null && data.thumbnailUrl!.startsWith('http'))
            SizedBox(
              height: 150,
              width: double.infinity,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  Image.network(
                    data.thumbnailUrl!,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => Container(
                      color: AppColors.surfaceVariant,
                      child: const Icon(Icons.home_work_outlined, size: 48, color: AppColors.primary),
                    ),
                  ),
                  Positioned(
                    top: 10,
                    right: 10,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.black.withOpacity(0.7),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.star, color: Colors.amber, size: 14),
                          const SizedBox(width: 4),
                          Text(
                            data.assetCode,
                            style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        data.assetName,
                        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: AppColors.textPrimary),
                      ),
                    ),
                    StatusBadge(status: data.status),
                  ],
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    const Icon(Icons.location_on_outlined, size: 14, color: AppColors.textSecondary),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text(
                        '${data.address}, ${data.city} (${data.district} District)',
                        style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                const Divider(height: 1),
                const SizedBox(height: 10),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    _buildMetaPill('Owner', data.ownerName, Icons.person_outline),
                    _buildMetaPill(
                      'Rep',
                      data.authorizedRepresentativeName ?? 'Pending',
                      Icons.shield_outlined,
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMetaPill(String label, String value, IconData icon) {
    return Row(
      children: [
        Icon(icon, size: 14, color: AppColors.primary),
        const SizedBox(width: 6),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: const TextStyle(fontSize: 10, color: AppColors.textMuted)),
            Text(value, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
          ],
        ),
      ],
    );
  }

  Widget _buildProposalGovernanceBanner(
    PropertyWorkflowAssistantModel data,
    bool isManagerOrAdmin,
    bool isOwner,
  ) {
    final status = data.proposalStatus;
    Color bannerBg;
    Color borderColor;
    IconData icon;
    String title;
    String subtitle;

    switch (status) {
      case 'SentToOwner':
        bannerBg = const Color(0xFFEFF6FF);
        borderColor = const Color(0xFFBFDBFE);
        icon = Icons.mark_email_read_outlined;
        title = 'Formal Proposal Awaiting Owner Review';
        subtitle = 'Awaiting overseas property owner decision on contractor proposal.';
        break;
      case 'ApprovedByOwner':
        bannerBg = const Color(0xFFF0FDF4);
        borderColor = const Color(0xFFBBF7D0);
        icon = Icons.verified_outlined;
        title = 'Proposal Accepted by Owner';
        subtitle = 'Work order approved. Local manager may proceed with execution.';
        break;
      case 'RejectedByOwner':
        bannerBg = const Color(0xFFFEF2F2);
        borderColor = const Color(0xFFFECACA);
        icon = Icons.highlight_off_rounded;
        title = 'Proposal Rejected by Owner';
        subtitle = 'Owner requested changes: "${data.ownerRejectionReason ?? "Scope revision required"}".';
        break;
      default:
        bannerBg = const Color(0xFFF8FAFC);
        borderColor = const Color(0xFFE2E8F0);
        icon = Icons.description_outlined;
        title = 'Maintenance Proposal Draft';
        subtitle = 'Itemized quotation available for manager review and dispatch to owner.';
        break;
    }

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: bannerBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: borderColor, width: 1.2),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: AppColors.primary, size: 22),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: AppColors.textPrimary),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(subtitle, style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
          if (data.proposedAmountLkr != null) ...[
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: borderColor),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Contractor: ${data.proposedProviderName ?? "Verified Contractor"}',
                    style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600),
                  ),
                  Text(
                    'LKR ${data.proposedAmountLkr!.toStringAsFixed(2)}',
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: AppColors.primary),
                  ),
                ],
              ),
            ),
          ],
          if (_isActionProcessing) ...[
            const SizedBox(height: 14),
            const Center(child: CircularProgressIndicator()),
          ] else ...[
            // Manager Dispatch Action
            if ((status == 'Draft' || status == 'NotInitiated') && isManagerOrAdmin && data.activeWorkflowId != null) ...[
              const SizedBox(height: 14),
              SizedBox(
                width: double.infinity,
                child: AppButton(
                  text: 'Send Formal Proposal to Owner',
                  icon: Icons.send_rounded,
                  onPressed: _showSendProposalDialog,
                ),
              ),
            ],
            // Owner Decision Actions
            if (status == 'SentToOwner' && (isOwner || isManagerOrAdmin) && data.activeWorkflowId != null) ...[
              const SizedBox(height: 14),
              Row(
                children: [
                  Expanded(
                    child: AppButton(
                      text: 'Accept Proposal',
                      icon: Icons.check_circle_outline,
                      backgroundColor: AppColors.success,
                      onPressed: () => _showOwnerDecisionDialog('Approve'),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: AppButton(
                      text: 'Reject / Revise',
                      icon: Icons.cancel_outlined,
                      backgroundColor: AppColors.error,
                      onPressed: () => _showOwnerDecisionDialog('Reject'),
                    ),
                  ),
                ],
              ),
            ],
          ],
        ],
      ),
    );
  }

  Widget _buildRejectionAlternativesSection(List<ProposalAlternativeModel> alternatives) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Icon(Icons.auto_awesome, color: Color(0xFF7C3AED), size: 18),
            const SizedBox(width: 8),
            const Text(
              'AI Grounded Practical Alternatives',
              style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: AppColors.textPrimary),
            ),
            const SizedBox(width: 6),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: const Color(0xFFF3E8FF),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(
                '${alternatives.length} Options',
                style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF7C3AED)),
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        ...alternatives.map((alt) => Container(
              margin: const EdgeInsets.only(bottom: 10),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFE9D5FF)),
                boxShadow: [
                  BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 4, offset: const Offset(0, 2)),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          alt.title,
                          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Color(0xFF5B21B6)),
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: const Color(0xFFEDE9FE),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          '${(alt.feasibilityScore * 100).toInt()}% Feasibility',
                          style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Color(0xFF6D28D9)),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(alt.rationale, style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                  const SizedBox(height: 6),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Estimate: ${alt.estimatedCostRangeLkr}',
                        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.textMuted),
                      ),
                      Text(
                        'Action: ${alt.actionCode}',
                        style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.primary),
                      ),
                    ],
                  ),
                ],
              ),
            )),
      ],
    );
  }

  Widget _buildExecutiveSummaryCard(PropertyWorkflowAssistantModel data) {
    final next = data.recommendedNextAction;
    return Card(
      elevation: 1,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.psychology_outlined, color: AppColors.primary, size: 20),
                const SizedBox(width: 8),
                const Text(
                  'AI Executive Briefing',
                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: AppColors.textPrimary),
                ),
                const Spacer(),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: AppColors.primarySubtle,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    data.currentStageLabel,
                    style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.primary),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              data.plainLanguageSummary,
              style: const TextStyle(fontSize: 13, color: AppColors.textPrimary, height: 1.4),
            ),
            const SizedBox(height: 12),
            Container(
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
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          next.title,
                          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: AppColors.textPrimary),
                        ),
                      ),
                      Text(
                        '${(next.confidenceScore * 100).toInt()}% Confident',
                        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.success),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(next.description, style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                  const SizedBox(height: 6),
                  Text(
                    'Why: ${next.whyItMatters}',
                    style: const TextStyle(fontSize: 11, fontStyle: FontStyle.italic, color: AppColors.textMuted),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildIntelligenceQuadrants(PropertyWorkflowAssistantModel data) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Intelligence Matrix (Section 9.1 Baseline)',
          style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: AppColors.textPrimary),
        ),
        const SizedBox(height: 10),
        _buildQuadrantCard('Confirmed Database Facts', data.confirmedFacts, const Color(0xFFDBEAFE), const Color(0xFF1D4ED8), Icons.verified),
        const SizedBox(height: 10),
        _buildQuadrantCard('AI Recommendations', data.aiRecommendations, const Color(0xFFF3E8FF), const Color(0xFF7C3AED), Icons.auto_awesome),
        const SizedBox(height: 10),
        _buildQuadrantCard('Missing Information', data.missingInformation, const Color(0xFFFEF3C7), const Color(0xFFB45309), Icons.info_outline),
        const SizedBox(height: 10),
        _buildQuadrantCard('Awaiting Human Decisions', data.awaitingHumanDecision, const Color(0xFFE0E7FF), const Color(0xFF4338CA), Icons.gavel_rounded),
      ],
    );
  }

  Widget _buildQuadrantCard(String title, List<String> items, Color bgColor, Color accentColor, IconData icon) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: bgColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 16, color: accentColor),
              const SizedBox(width: 6),
              Text(
                title,
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: accentColor),
              ),
              const Spacer(),
              Text('${items.length}', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: accentColor)),
            ],
          ),
          const SizedBox(height: 6),
          if (items.isEmpty)
            const Text('None recorded.', style: TextStyle(fontSize: 11, color: AppColors.textMuted))
          else
            ...items.map((item) => Padding(
                  padding: const EdgeInsets.only(bottom: 4.0),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('• ', style: TextStyle(color: accentColor, fontWeight: FontWeight.bold)),
                      Expanded(
                        child: Text(item, style: const TextStyle(fontSize: 11, color: AppColors.textSecondary)),
                      ),
                    ],
                  ),
                )),
        ],
      ),
    );
  }

  Widget _buildCorrelatedRecordsSection(PropertyWorkflowAssistantModel data) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Correlated Business Records',
          style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: AppColors.textPrimary),
        ),
        const SizedBox(height: 8),
        ExpansionTile(
          title: Text('Logged Incidents (${data.incidents.length})', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
          leading: const Icon(Icons.report_problem_outlined, color: AppColors.warning),
          children: data.incidents.isEmpty
              ? [const Padding(padding: EdgeInsets.all(8.0), child: Text('No incidents recorded.', style: TextStyle(fontSize: 12)))]
              : data.incidents
                  .map((inc) => ListTile(
                        dense: true,
                        title: Text(inc.title, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 12)),
                        subtitle: Text('${inc.categoryName} • ${inc.priorityName} • ${inc.statusName}', style: const TextStyle(fontSize: 11)),
                        trailing: inc.estimatedBudget != null ? Text('LKR ${inc.estimatedBudget!.toStringAsFixed(0)}', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold)) : null,
                      ))
                  .toList(),
        ),
        ExpansionTile(
          title: Text('Inspections & Findings (${data.inspections.length})', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
          leading: const Icon(Icons.checklist_rounded, color: AppColors.primary),
          children: data.inspections.isEmpty
              ? [const Padding(padding: EdgeInsets.all(8.0), child: Text('No inspections recorded.', style: TextStyle(fontSize: 12)))]
              : data.inspections
                  .map((ins) => ListTile(
                        dense: true,
                        title: Text(ins.incidentTitle, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 12)),
                        subtitle: Text('${ins.inspectorName ?? "Inspector"} • ${ins.defectCount} defects found', style: const TextStyle(fontSize: 11)),
                        trailing: StatusBadge(status: ins.status),
                      ))
                  .toList(),
        ),
        ExpansionTile(
          title: Text('Contractor Quotations (${data.quotations.length})', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
          leading: const Icon(Icons.request_quote_outlined, color: AppColors.success),
          children: data.quotations.isEmpty
              ? [const Padding(padding: EdgeInsets.all(8.0), child: Text('No quotations recorded.', style: TextStyle(fontSize: 12)))]
              : data.quotations
                  .map((q) => ListTile(
                        dense: true,
                        title: Text(q.providerName ?? 'Contractor Bid', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 12)),
                        subtitle: Text('${q.itemCount} line items • ${q.warrantyMonths}m warranty', style: const TextStyle(fontSize: 11)),
                        trailing: Text('LKR ${q.totalAmount.toStringAsFixed(2)}', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: AppColors.primary)),
                      ))
                  .toList(),
        ),
        ExpansionTile(
          title: Text('Maintenance Work Orders (${data.maintenanceJobs.length})', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
          leading: const Icon(Icons.build_outlined, color: Colors.blueGrey),
          children: data.maintenanceJobs.isEmpty
              ? [const Padding(padding: EdgeInsets.all(8.0), child: Text('No maintenance jobs recorded.', style: TextStyle(fontSize: 12)))]
              : data.maintenanceJobs
                  .map((j) => ListTile(
                        dense: true,
                        title: Text(j.title, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 12)),
                        subtitle: Text('${j.providerName ?? "Contractor"} • ${j.status}', style: const TextStyle(fontSize: 11)),
                        trailing: StatusBadge(status: j.status),
                      ))
                  .toList(),
        ),
      ],
    );
  }

  Widget _buildObservabilitySection(PropertyWorkflowAssistantModel data) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.surfaceVariant,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          Row(
            children: [
              const Icon(Icons.history_toggle_off_rounded, size: 16, color: AppColors.textMuted),
              const SizedBox(width: 6),
              Text('${data.auditEventsCount} Audit Events', style: const TextStyle(fontSize: 11, color: AppColors.textSecondary)),
            ],
          ),
          Row(
            children: [
              const Icon(Icons.task_alt_outlined, size: 16, color: AppColors.textMuted),
              const SizedBox(width: 6),
              Text('${data.activeFollowUpsCount} Follow-ups', style: const TextStyle(fontSize: 11, color: AppColors.textSecondary)),
            ],
          ),
          Row(
            children: [
              Icon(Icons.wifi, size: 14, color: data.isAiServiceConnected ? AppColors.success : AppColors.error),
              const SizedBox(width: 4),
              Text(data.isAiServiceConnected ? 'AI Online' : 'AI Offline', style: const TextStyle(fontSize: 11, color: AppColors.textSecondary)),
            ],
          ),
        ],
      ),
    );
  }
}
