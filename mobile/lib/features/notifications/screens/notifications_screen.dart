import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../shared/widgets/feedback_states.dart';
import '../../workflows/screens/workflow_detail_screen.dart';
import '../models/notification_model.dart';
import '../services/notification_service.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  final NotificationService _service = NotificationService();
  List<NotificationModel> _notifications = [];
  bool _isLoading = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _loadNotifications();
  }

  Future<void> _loadNotifications() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final list = await _service.getNotifications();
      setState(() {
        _notifications = list;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _errorMessage = e.toString().replaceAll('Exception: ', '');
        _isLoading = false;
      });
    }
  }

  Future<void> _markAllAsRead() async {
    await _service.markAllAsRead();
    _loadNotifications();
  }

  Future<void> _onNotificationTap(NotificationModel n) async {
    if (!n.isRead) {
      await _service.markAsRead(n.id);
      setState(() {
        final idx = _notifications.indexWhere((item) => item.id == n.id);
        if (idx != -1) {
          _notifications[idx] = NotificationModel(
            id: n.id,
            userId: n.userId,
            title: n.title,
            message: n.message,
            typeName: n.typeName,
            isRead: true,
            relatedWorkflowInstanceId: n.relatedWorkflowInstanceId,
            createdAtUtc: n.createdAtUtc,
          );
        }
      });
    }

    if (n.relatedWorkflowInstanceId != null &&
        n.relatedWorkflowInstanceId!.isNotEmpty &&
        mounted) {
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (ctx) => WorkflowDetailScreen(workflowId: n.relatedWorkflowInstanceId!),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final unreadCount = _notifications.where((n) => !n.isRead).length;

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            const Text('Notifications'),
            if (unreadCount > 0) ...[
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: AppColors.primary,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  '$unreadCount',
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: Colors.white,
                  ),
                ),
              ),
            ],
          ],
        ),
        actions: [
          if (unreadCount > 0)
            TextButton.icon(
              icon: const Icon(Icons.done_all_rounded, size: 16),
              label: const Text('Read All'),
              style: TextButton.styleFrom(foregroundColor: AppColors.primary),
              onPressed: _markAllAsRead,
            ),
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: _loadNotifications,
          ),
        ],
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_errorMessage != null) {
      return ErrorState(
        message: _errorMessage!,
        onRetry: _loadNotifications,
      );
    }

    if (_notifications.isEmpty) {
      return EmptyState(
        title: 'All Caught Up!',
        message: 'No notifications or pending workflow updates.',
        icon: Icons.notifications_off_outlined,
        onAction: _loadNotifications,
        actionLabel: 'Refresh',
      );
    }

    return RefreshIndicator(
      onRefresh: _loadNotifications,
      child: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: _notifications.length,
        separatorBuilder: (_, __) => const SizedBox(height: 10),
        itemBuilder: (context, index) {
          final n = _notifications[index];
          return _buildNotificationCard(n);
        },
      ),
    );
  }

  Widget _buildNotificationCard(NotificationModel n) {
    return Card(
      elevation: 0,
      color: n.isRead ? AppColors.surface : AppColors.primarySubtle.withOpacity(0.4),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(
          color: n.isRead ? AppColors.border : AppColors.primaryLight,
          width: n.isRead ? 1 : 1.5,
        ),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () => _onNotificationTap(n),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: n.isRead ? AppColors.surfaceVariant : AppColors.primarySubtle,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  _getIconForType(n.typeName),
                  color: n.isRead ? AppColors.textSecondary : AppColors.primary,
                  size: 20,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Text(
                            n.title,
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: n.isRead ? FontWeight.w600 : FontWeight.w700,
                              color: AppColors.textPrimary,
                            ),
                          ),
                        ),
                        if (!n.isRead)
                          Container(
                            width: 8,
                            height: 8,
                            decoration: const BoxDecoration(
                              color: AppColors.primary,
                              shape: BoxShape.circle,
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      n.message,
                      style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      _formatDate(n.createdAtUtc),
                      style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
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

  IconData _getIconForType(String type) {
    final lower = type.toLowerCase();
    if (lower.contains('approval') || lower.contains('proposal')) {
      return Icons.fact_check_outlined;
    }
    if (lower.contains('workflow')) {
      return Icons.account_tree_outlined;
    }
    if (lower.contains('incident') || lower.contains('defect')) {
      return Icons.warning_amber_rounded;
    }
    if (lower.contains('document') || lower.contains('nic')) {
      return Icons.badge_outlined;
    }
    return Icons.notifications_outlined;
  }

  String _formatDate(DateTime dt) {
    return '${dt.year}-${dt.month.toString().padLeft(2, '0')}-${dt.day.toString().padLeft(2, '0')} ${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
  }
}
