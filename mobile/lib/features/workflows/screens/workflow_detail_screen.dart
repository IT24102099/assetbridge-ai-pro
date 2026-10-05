import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/constants/app_colors.dart';
import '../../../shared/widgets/app_button.dart';
import '../../../shared/widgets/feedback_states.dart';
import '../../../shared/widgets/status_badge.dart';
import '../../auth/providers/auth_provider.dart';
import '../models/workflow_model.dart';
import '../services/workflow_service.dart';
import 'ai_proposal_review_screen.dart';

class WorkflowDetailScreen extends StatefulWidget {
  final String workflowId;

  const WorkflowDetailScreen({super.key, required this.workflowId});

  @override
  State<WorkflowDetailScreen> createState() => _WorkflowDetailScreenState();
}

class _WorkflowDetailScreenState extends State<WorkflowDetailScreen> {
  final WorkflowService _workflowService = WorkflowService();
  WorkflowModel? _workflow;
  List<AgentRunModel> _agentRuns = [];
  bool _isLoading = true;
  String? _errorMessage;

  // 15 canonical states
  static const List<String> _orderedStates = [
    'Created',
    'Planning',
    'ProviderSelection',
    'InspectionPending',
    'QuotationReview',
    'AiValidation',
    'AwaitingApproval',
    'Approved',
    'Execution',
    'CompletionReview',
    'Completed',
    'FollowUp',
  ];

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
      final wfFuture = _workflowService.getWorkflowById(widget.workflowId);
      final agentsFuture = _workflowService.getAgentRuns(widget.workflowId);

      final results = await Future.wait([wfFuture, agentsFuture]);
      setState(() {
        _workflow = results[0] as WorkflowModel;
        _agentRuns = results[1] as List<AgentRunModel>;
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
    final user = context.watch<AuthProvider>().user;
    final isManagerOrAdmin = user?.isManagerOrAdmin ?? false;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Workflow & AI Timeline'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadDetails,
          ),
        ],
      ),
      bottomNavigationBar: _workflow != null &&
              _workflow!.currentState.toLowerCase().contains('awaiting') &&
              isManagerOrAdmin
          ? Container(
              padding: const EdgeInsets.all(16),
              decoration: const BoxDecoration(
                color: AppColors.surface,
                border: Border(top: BorderSide(color: AppColors.border)),
              ),
              child: AppButton(
                text: 'Review AI Maintenance Proposal',
                icon: Icons.shield_rounded,
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => AiProposalReviewScreen(workflow: _workflow!),
                    ),
                  ).then((_) => _loadDetails());
                },
              ),
            )
          : null,
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const LoadingState(message: 'Loading workflow track & timeline...');
    }

    if (_errorMessage != null || _workflow == null) {
      return ErrorState(
        message: _errorMessage ?? 'Workflow not found',
        onRetry: _loadDetails,
      );
    }

    final wf = _workflow!;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Summary Header
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      StatusBadge(status: wf.priority),
                      StatusBadge(status: wf.currentState),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Text(
                    wf.incidentTitle,
                    style: const TextStyle(
                      fontSize: 17,
                      fontWeight: FontWeight.w800,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Property: ${wf.assetName}',
                    style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
                  ),
                  const SizedBox(height: 10),
                  const Divider(height: 1, color: AppColors.border),
                  const SizedBox(height: 10),
                  Text(
                    'Workflow ID: ${wf.id}',
                    style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 20),

          // Agentic AI 4-Stage Execution & Intelligence
          _buildAgenticAiSection(wf),
          const SizedBox(height: 24),

          // 15-State Visual Timeline
          const Text(
            '15-State Orchestration Timeline',
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 12),

          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: _orderedStates.length,
            itemBuilder: (context, index) {
              final state = _orderedStates[index];
              final isPassed = _isStatePassed(wf.currentState, state);
              final isCurrent = _isStateCurrent(wf.currentState, state);
              final isLast = index == _orderedStates.length - 1;

              return Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Timeline Node & Line
                  Column(
                    children: [
                      Container(
                        width: 24,
                        height: 24,
                        decoration: BoxDecoration(
                          color: isPassed
                              ? AppColors.success
                              : isCurrent
                                  ? AppColors.primary
                                  : AppColors.surfaceVariant,
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: isCurrent ? AppColors.primaryLight : Colors.transparent,
                            width: 3,
                          ),
                        ),
                        child: Icon(
                          isPassed ? Icons.check : (isCurrent ? Icons.circle : Icons.circle_outlined),
                          size: 12,
                          color: isPassed || isCurrent ? Colors.white : AppColors.textMuted,
                        ),
                      ),
                      if (!isLast)
                        Container(
                          width: 2,
                          height: 36,
                          color: isPassed ? AppColors.success : AppColors.border,
                        ),
                    ],
                  ),
                  const SizedBox(width: 12),

                  // State Label & Details
                  Expanded(
                    child: Padding(
                      padding: const EdgeInsets.only(top: 2, bottom: 20),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            _formatStateLabel(state),
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: isCurrent ? FontWeight.w800 : FontWeight.w600,
                              color: isCurrent
                                  ? AppColors.primary
                                  : isPassed
                                      ? AppColors.textPrimary
                                      : AppColors.textMuted,
                            ),
                          ),
                          if (isCurrent) ...[
                            const SizedBox(height: 2),
                            const Text(
                              'Current Active State',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                                color: AppColors.primary,
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
                ],
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildAgenticAiSection(WorkflowModel wf) {
    final curState = wf.currentState.toLowerCase();

    // 4 Real Project AI Agents
    final agentDefs = [
      {
        'name': 'Incident Planning Agent',
        'type': 'IncidentPlanning',
        'desc': 'Analyzed defect severity, structural impact & formulated remediation plan.',
        'icon': Icons.psychology_outlined,
        'isDone': curState != 'created',
      },
      {
        'name': 'Provider Intelligence Agent',
        'type': 'ProviderIntelligence',
        'desc': 'Matched verified trade contractors by capability, performance & location.',
        'icon': Icons.engineering_outlined,
        'isDone': curState != 'created' && curState != 'planning',
      },
      {
        'name': 'Cost Recommendation Agent',
        'type': 'CostRecommendation',
        'desc': 'Evaluated material catalog rates, labor benchmarks & cost estimate.',
        'icon': Icons.price_check_outlined,
        'isDone': _isStatePassed(wf.currentState, 'QuotationReview') || curState == 'aivalidation' || curState == 'awaitingapproval' || curState == 'approved' || curState == 'execution' || curState == 'completed',
      },
      {
        'name': 'Validation & Continuity Agent',
        'type': 'ValidationAndContinuity',
        'desc': 'Validated proposal compliance against budget, business rules & continuity SLA.',
        'icon': Icons.verified_user_outlined,
        'isDone': curState == 'awaitingapproval' || curState == 'approved' || curState == 'execution' || curState == 'completed',
      },
    ];

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: AppColors.primarySubtle,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.auto_awesome, color: AppColors.primary, size: 20),
                ),
                const SizedBox(width: 10),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Agentic AI Multi-Agent Workflow',
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w800,
                          color: AppColors.textPrimary,
                          letterSpacing: -0.2,
                        ),
                      ),
                      Text(
                        '4 Autonomous specialized agents coordinate property remediation',
                        style: TextStyle(fontSize: 11, color: AppColors.textSecondary),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            ...agentDefs.map((agent) {
              final name = agent['name'] as String;
              final desc = agent['desc'] as String;
              final icon = agent['icon'] as IconData;
              final isDone = agent['isDone'] as bool;

              // Match real agent run from backend if available
              final matchedRun = _agentRuns.cast<AgentRunModel?>().firstWhere(
                    (r) => r?.agentName.toLowerCase().contains(name.toLowerCase().split(' ')[0]) == true ||
                        r?.agentTypeName.toLowerCase().contains(name.toLowerCase().split(' ')[0]) == true,
                    orElse: () => null,
                  );

              final runSummary = matchedRun?.outputSummary ?? desc;
              final runStatus = matchedRun?.statusName ?? (isDone ? 'Completed' : 'Pending');

              return Container(
                margin: const EdgeInsets.only(bottom: 10),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: isDone ? AppColors.surface : AppColors.surfaceVariant.withOpacity(0.4),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: isDone ? AppColors.primaryLight : AppColors.border,
                  ),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(6),
                      decoration: BoxDecoration(
                        color: isDone ? AppColors.primarySubtle : AppColors.surfaceVariant,
                        shape: BoxShape.circle,
                      ),
                      child: Icon(
                        icon,
                        color: isDone ? AppColors.primary : AppColors.textMuted,
                        size: 16,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Flexible(
                                child: Text(
                                  name,
                                  style: const TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w700,
                                    color: AppColors.textPrimary,
                                  ),
                                ),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: isDone ? AppColors.successSubtle : AppColors.surfaceVariant,
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text(
                                  runStatus,
                                  style: TextStyle(
                                    fontSize: 9,
                                    fontWeight: FontWeight.w700,
                                    color: isDone ? AppColors.success : AppColors.textMuted,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 3),
                          Text(
                            runSummary,
                            style: const TextStyle(fontSize: 11, color: AppColors.textSecondary, height: 1.3),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              );
            }),
          ],
        ),
      ),
    );
  }

  bool _isStateCurrent(String currentState, String state) {
    return currentState.toLowerCase() == state.toLowerCase();
  }

  bool _isStatePassed(String currentState, String state) {
    final curIdx = _orderedStates.indexWhere((s) => s.toLowerCase() == currentState.toLowerCase());
    final stateIdx = _orderedStates.indexWhere((s) => s.toLowerCase() == state.toLowerCase());
    if (curIdx == -1 || stateIdx == -1) return false;
    return curIdx > stateIdx;
  }

  String _formatStateLabel(String state) {
    return state.replaceAllMapped(RegExp(r'([A-Z])'), (m) => ' ${m[1]}').trim();
  }
}
