import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';

class StatusBadge extends StatelessWidget {
  final String status;
  final double fontSize;

  const StatusBadge({
    super.key,
    required this.status,
    this.fontSize = 11,
  });

  @override
  Widget build(BuildContext context) {
    final config = _getStatusConfig(status);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: config.bg,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: config.border, width: 1),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 6,
            height: 6,
            decoration: BoxDecoration(
              color: config.fg,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 6),
          Text(
            _formatStatus(status),
            style: TextStyle(
              color: config.fg,
              fontSize: fontSize,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }

  String _formatStatus(String text) {
    return text.replaceAll('_', ' ');
  }

  _BadgeStyle _getStatusConfig(String rawStatus) {
    final s = rawStatus.toLowerCase();

    if (s.contains('approved') || s.contains('completed') || s.contains('active') || s.contains('verified') || s.contains('pass')) {
      return _BadgeStyle(
        bg: AppColors.successSubtle,
        fg: AppColors.success,
        border: const Color(0xFFA7F3D0),
      );
    }
    if (s.contains('awaiting') || s.contains('pending') || s.contains('review') || s.contains('planning') || s.contains('warn')) {
      return _BadgeStyle(
        bg: AppColors.warningSubtle,
        fg: AppColors.warning,
        border: const Color(0xFFFDE68A),
      );
    }
    if (s.contains('rejected') || s.contains('failed') || s.contains('emergency') || s.contains('high') || s.contains('overdue')) {
      return _BadgeStyle(
        bg: AppColors.errorSubtle,
        fg: AppColors.error,
        border: const Color(0xFFFECACA),
      );
    }
    if (s.contains('execution') || s.contains('progress') || s.contains('validation') || s.contains('inspection')) {
      return _BadgeStyle(
        bg: AppColors.primarySubtle,
        fg: AppColors.primary,
        border: const Color(0xFFBFDBFE),
      );
    }
    return _BadgeStyle(
      bg: AppColors.surfaceVariant,
      fg: AppColors.textSecondary,
      border: AppColors.border,
    );
  }
}

class _BadgeStyle {
  final Color bg;
  final Color fg;
  final Color border;

  _BadgeStyle({required this.bg, required this.fg, required this.border});
}
