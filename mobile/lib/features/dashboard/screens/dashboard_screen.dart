import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/constants/app_colors.dart';
import '../../assets/screens/asset_list_screen.dart';
import '../../assets/services/asset_service.dart';
import '../../auth/providers/auth_provider.dart';
import '../../continuity/screens/follow_up_screen.dart';
import '../../incidents/models/incident_model.dart';
import '../../incidents/screens/incident_detail_screen.dart';
import '../../incidents/screens/incident_list_screen.dart';
import '../../incidents/screens/report_incident_screen.dart';
import '../../incidents/services/incident_service.dart';
import '../../inspections/screens/inspection_list_screen.dart';
import '../../maintenance/screens/maintenance_job_list_screen.dart';
import '../../profile/screens/profile_screen.dart';
import '../../providers/screens/provider_list_screen.dart';
import '../../quotations/screens/quotation_list_screen.dart';
import '../../workflows/screens/workflow_list_screen.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  int _currentIndex = 0;

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;
    final role = user?.role ?? 'Owner';

    final screens = _getScreensForRole(role);
    final navItems = _getNavItemsForRole(role);

    return Scaffold(
      backgroundColor: AppColors.background,
      body: IndexedStack(
        index: _currentIndex.clamp(0, screens.length - 1),
        children: screens,
      ),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: AppColors.surface,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.04),
              blurRadius: 10,
              offset: const Offset(0, -2),
            ),
          ],
          border: const Border(top: BorderSide(color: AppColors.border, width: 1)),
        ),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            child: BottomNavigationBar(
              currentIndex: _currentIndex.clamp(0, navItems.length - 1),
              onTap: (idx) => setState(() => _currentIndex = idx),
              type: BottomNavigationBarType.fixed,
              backgroundColor: Colors.transparent,
              elevation: 0,
              selectedItemColor: AppColors.primary,
              unselectedItemColor: AppColors.textMuted,
              selectedFontSize: 11,
              unselectedFontSize: 11,
              selectedLabelStyle: const TextStyle(fontWeight: FontWeight.w800, letterSpacing: -0.2),
              unselectedLabelStyle: const TextStyle(fontWeight: FontWeight.w600),
              items: navItems,
            ),
          ),
        ),
      ),
    );
  }

  List<Widget> _getScreensForRole(String role) {
    if (role == 'ServiceProvider') {
      return [
        _HomeOverviewTab(onNavigateTab: (idx) => setState(() => _currentIndex = idx)),
        const MaintenanceJobListScreen(),
        const QuotationListScreen(),
        const ProfileScreen(),
      ];
    }
    if (role == 'Representative') {
      return [
        _HomeOverviewTab(onNavigateTab: (idx) => setState(() => _currentIndex = idx)),
        const InspectionListScreen(),
        const IncidentListScreen(),
        const ProfileScreen(),
      ];
    }
    if (role == 'Manager' || role == 'Admin') {
      return [
        _HomeOverviewTab(onNavigateTab: (idx) => setState(() => _currentIndex = idx)),
        const WorkflowListScreen(),
        const ProviderListScreen(),
        const ProfileScreen(),
      ];
    }
    // Default Owner
    return [
      _HomeOverviewTab(onNavigateTab: (idx) => setState(() => _currentIndex = idx)),
      const AssetListScreen(),
      const IncidentListScreen(),
      const WorkflowListScreen(),
      const ProfileScreen(),
    ];
  }

  List<BottomNavigationBarItem> _getNavItemsForRole(String role) {
    if (role == 'ServiceProvider') {
      return const [
        BottomNavigationBarItem(
          icon: Icon(Icons.dashboard_outlined),
          activeIcon: Icon(Icons.dashboard_rounded),
          label: 'Home',
        ),
        BottomNavigationBarItem(
          icon: Icon(Icons.build_outlined),
          activeIcon: Icon(Icons.build_rounded),
          label: 'Jobs',
        ),
        BottomNavigationBarItem(
          icon: Icon(Icons.request_quote_outlined),
          activeIcon: Icon(Icons.request_quote_rounded),
          label: 'Quotes',
        ),
        BottomNavigationBarItem(
          icon: Icon(Icons.person_outline_rounded),
          activeIcon: Icon(Icons.person_rounded),
          label: 'Profile',
        ),
      ];
    }
    if (role == 'Representative') {
      return const [
        BottomNavigationBarItem(
          icon: Icon(Icons.dashboard_outlined),
          activeIcon: Icon(Icons.dashboard_rounded),
          label: 'Home',
        ),
        BottomNavigationBarItem(
          icon: Icon(Icons.assignment_outlined),
          activeIcon: Icon(Icons.assignment_rounded),
          label: 'Inspections',
        ),
        BottomNavigationBarItem(
          icon: Icon(Icons.report_problem_outlined),
          activeIcon: Icon(Icons.report_problem_rounded),
          label: 'Defects',
        ),
        BottomNavigationBarItem(
          icon: Icon(Icons.person_outline_rounded),
          activeIcon: Icon(Icons.person_rounded),
          label: 'Profile',
        ),
      ];
    }
    if (role == 'Manager' || role == 'Admin') {
      return const [
        BottomNavigationBarItem(
          icon: Icon(Icons.dashboard_outlined),
          activeIcon: Icon(Icons.dashboard_rounded),
          label: 'Home',
        ),
        BottomNavigationBarItem(
          icon: Icon(Icons.account_tree_outlined),
          activeIcon: Icon(Icons.account_tree_rounded),
          label: 'Workflows',
        ),
        BottomNavigationBarItem(
          icon: Icon(Icons.handyman_outlined),
          activeIcon: Icon(Icons.handyman_rounded),
          label: 'Providers',
        ),
        BottomNavigationBarItem(
          icon: Icon(Icons.person_outline_rounded),
          activeIcon: Icon(Icons.person_rounded),
          label: 'Profile',
        ),
      ];
    }
    // Default Owner
    return const [
      BottomNavigationBarItem(
        icon: Icon(Icons.dashboard_outlined),
        activeIcon: Icon(Icons.dashboard_rounded),
        label: 'Home',
      ),
      BottomNavigationBarItem(
        icon: Icon(Icons.apartment_outlined),
        activeIcon: Icon(Icons.apartment_rounded),
        label: 'Properties',
      ),
      BottomNavigationBarItem(
        icon: Icon(Icons.report_problem_outlined),
        activeIcon: Icon(Icons.report_problem_rounded),
        label: 'Incidents',
      ),
      BottomNavigationBarItem(
        icon: Icon(Icons.track_changes_outlined),
        activeIcon: Icon(Icons.track_changes_rounded),
        label: 'Workflows',
      ),
      BottomNavigationBarItem(
        icon: Icon(Icons.person_outline_rounded),
        activeIcon: Icon(Icons.person_rounded),
        label: 'Profile',
      ),
    ];
  }
}

class _HomeOverviewTab extends StatefulWidget {
  final Function(int)? onNavigateTab;

  const _HomeOverviewTab({this.onNavigateTab});

  @override
  State<_HomeOverviewTab> createState() => _HomeOverviewTabState();
}

class _HomeOverviewTabState extends State<_HomeOverviewTab> {
  final IncidentService _incidentService = IncidentService();
  final AssetService _assetService = AssetService();

  List<IncidentModel> _recentIncidents = [];
  int _propertyCount = 0;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadLiveDashboardData();
  }

  Future<void> _loadLiveDashboardData() async {
    setState(() => _isLoading = true);
    try {
      final assetsFuture = _assetService.getAssets(pageSize: 50);
      final incidentsFuture = _incidentService.getIncidents(pageSize: 10);

      final results = await Future.wait([assetsFuture, incidentsFuture]);
      final assetsRes = results[0] as dynamic;
      final incidentsRes = results[1] as dynamic;

      if (mounted) {
        setState(() {
          _propertyCount = assetsRes.totalCount ?? assetsRes.items.length;
          _recentIncidents = incidentsRes.items;
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  String _getGreeting() {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;
    final fullName = user?.fullName ?? 'Owner Silva';
    final role = user?.role ?? 'Owner';

    final activeDefects = _recentIncidents.where((i) => i.status != 'Resolved' && i.status != 'Closed').toList();

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        titleSpacing: 16,
        title: Row(
          children: [
            Container(
              width: 34,
              height: 34,
              decoration: BoxDecoration(
                color: AppColors.primary,
                borderRadius: BorderRadius.circular(10),
                boxShadow: [
                  BoxShadow(
                    color: AppColors.primary.withOpacity(0.3),
                    blurRadius: 6,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: const Center(
                child: Icon(Icons.home_work_rounded, color: Colors.white, size: 18),
              ),
            ),
            const SizedBox(width: 10),
            const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'AssetBridge AI',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                    color: AppColors.textPrimary,
                    letterSpacing: -0.4,
                  ),
                ),
                Text(
                  'Your Assets. Always Closer.',
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w500,
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: Stack(
              clipBehavior: Clip.none,
              children: [
                const Icon(Icons.notifications_outlined, color: AppColors.textPrimary, size: 22),
                Positioned(
                  right: 0,
                  top: 0,
                  child: Container(
                    width: 7,
                    height: 7,
                    decoration: const BoxDecoration(
                      color: AppColors.error,
                      shape: BoxShape.circle,
                    ),
                  ),
                ),
              ],
            ),
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('All real-time continuity channels active.')),
              );
            },
          ),
          Padding(
            padding: const EdgeInsets.only(right: 16.0, left: 4),
            child: CircleAvatar(
              radius: 16,
              backgroundColor: AppColors.primarySubtle,
              child: Text(
                fullName.isNotEmpty ? fullName[0].toUpperCase() : 'U',
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w800,
                  color: AppColors.primary,
                ),
              ),
            ),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _loadLiveDashboardData,
        color: AppColors.primary,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 1. Welcome Section
              _buildWelcomeCard(fullName, role),
              const SizedBox(height: 16),

              // 2. Property Health & Continuity Ring Card
              _buildHealthCard(),
              const SizedBox(height: 18),

              // 3. Quick Action Grid
              _buildQuickActionsGrid(context),
              const SizedBox(height: 20),

              // 4. Active Attention Section
              _buildActiveAttentionSection(context, activeDefects),
              const SizedBox(height: 20),

              // 5. Recent Activity Timeline
              _buildRecentActivitySection(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildWelcomeCard(String fullName, String role) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF0F172A), Color(0xFF1E3A8A)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF0F172A).withOpacity(0.15),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '${_getGreeting()},',
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                      color: Color(0xFF94A3B8),
                    ),
                  ),
                  Text(
                    fullName,
                    style: const TextStyle(
                      fontSize: 19,
                      fontWeight: FontWeight.w800,
                      color: Colors.white,
                      letterSpacing: -0.4,
                    ),
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: Colors.white.withOpacity(0.2), width: 1),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.verified_user_rounded, size: 12, color: Color(0xFF38BDF8)),
                    const SizedBox(width: 4),
                    Text(
                      role,
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: Colors.white,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.08),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              children: [
                const Icon(Icons.shield_outlined, size: 16, color: Color(0xFF38BDF8)),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    '${_propertyCount > 0 ? _propertyCount : 3} Monitored Properties • Live Continuity Guard',
                    style: const TextStyle(fontSize: 11, color: Color(0xFFE2E8F0), fontWeight: FontWeight.w600),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHealthCard() {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.02),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          // Radial indicator ring
          Container(
            width: 68,
            height: 68,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: AppColors.primarySubtle,
              border: Border.all(color: AppColors.primaryLight, width: 2),
            ),
            child: const Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    '94',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w900,
                      color: AppColors.primary,
                      height: 1,
                    ),
                  ),
                  Text(
                    '/ 100',
                    style: TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: AppColors.textMuted),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Text(
                      'Portfolio Health',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w800,
                        color: AppColors.textPrimary,
                        letterSpacing: -0.2,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: AppColors.successSubtle,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: const Text(
                        'Stable',
                        style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: AppColors.success),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                const Text(
                  'Physical assets inspected & protected under active SLA coverage.',
                  style: TextStyle(fontSize: 11, color: AppColors.textSecondary, height: 1.3),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildQuickActionsGrid(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Quick Operations',
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w800,
            color: AppColors.textPrimary,
            letterSpacing: -0.3,
          ),
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            Expanded(
              child: _buildActionCard(
                icon: Icons.add_alert_rounded,
                title: 'Report Incident',
                subtitle: 'AI Plan & Match',
                accentColor: AppColors.primary,
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const ReportIncidentScreen()),
                  ).then((_) => _loadLiveDashboardData());
                },
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _buildActionCard(
                icon: Icons.apartment_rounded,
                title: 'Properties',
                subtitle: '${_propertyCount > 0 ? _propertyCount : 3} Monitored',
                accentColor: const Color(0xFF06B6D4),
                onTap: () {
                  widget.onNavigateTab?.call(1);
                },
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            Expanded(
              child: _buildActionCard(
                icon: Icons.track_changes_rounded,
                title: 'Workflows',
                subtitle: '15-State Track',
                accentColor: const Color(0xFF8B5CF6),
                onTap: () {
                  widget.onNavigateTab?.call(3);
                },
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _buildActionCard(
                icon: Icons.verified_outlined,
                title: 'Continuity',
                subtitle: 'Preventive SLA',
                accentColor: AppColors.success,
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const FollowUpScreen()),
                  );
                },
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildActionCard({
    required IconData icon,
    required String title,
    required String subtitle,
    required Color accentColor,
    required VoidCallback onTap,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.all(14.0),
            child: Row(
              children: [
                Container(
                  width: 38,
                  height: 38,
                  decoration: BoxDecoration(
                    color: accentColor.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Center(
                    child: Icon(icon, color: accentColor, size: 20),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w800,
                          color: AppColors.textPrimary,
                          letterSpacing: -0.2,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        subtitle,
                        style: const TextStyle(fontSize: 10, color: AppColors.textMuted, fontWeight: FontWeight.w500),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildActiveAttentionSection(BuildContext context, List<IncidentModel> activeDefects) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'Needs Attention',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w800,
                color: AppColors.textPrimary,
                letterSpacing: -0.3,
              ),
            ),
            TextButton(
              onPressed: () => widget.onNavigateTab?.call(2),
              style: TextButton.styleFrom(
                padding: EdgeInsets.zero,
                minimumSize: Size.zero,
                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
              ),
              child: const Text(
                'View All',
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.primary),
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        if (_isLoading)
          const Center(
            child: Padding(
              padding: EdgeInsets.all(16),
              child: CircularProgressIndicator(strokeWidth: 2),
            ),
          )
        else if (activeDefects.isEmpty)
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.border),
            ),
            child: const Row(
              children: [
                Icon(Icons.check_circle_outline_rounded, color: AppColors.success, size: 22),
                SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'All Properties Running Smoothly',
                        style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
                      ),
                      Text(
                        'No critical defects or blocked approvals pending.',
                        style: TextStyle(fontSize: 11, color: AppColors.textMuted),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          )
        else
          ...activeDefects.take(2).map((inc) {
            return Container(
              margin: const EdgeInsets.only(bottom: 8),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.border),
              ),
              child: ListTile(
                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => IncidentDetailScreen(incidentId: inc.id),
                    ),
                  ).then((_) => _loadLiveDashboardData());
                },
                leading: Container(
                  width: 38,
                  height: 38,
                  decoration: BoxDecoration(
                    color: inc.priority.toLowerCase().contains('high') || inc.priority.toLowerCase().contains('emergency')
                        ? AppColors.errorSubtle
                        : AppColors.warningSubtle,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(
                    Icons.warning_amber_rounded,
                    color: inc.priority.toLowerCase().contains('high') || inc.priority.toLowerCase().contains('emergency')
                        ? AppColors.error
                        : AppColors.warning,
                    size: 20,
                  ),
                ),
                title: Text(
                  inc.title,
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: AppColors.textPrimary),
                ),
                subtitle: Text(
                  '${inc.assetName} • ${inc.status}',
                  style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
                ),
                trailing: const Icon(Icons.chevron_right_rounded, size: 18, color: AppColors.textMuted),
              ),
            );
          }),
      ],
    );
  }

  Widget _buildRecentActivitySection() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Recent Continuity Stream',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w800,
                  color: AppColors.textPrimary,
                  letterSpacing: -0.3,
                ),
              ),
              Icon(Icons.history_rounded, size: 16, color: AppColors.textMuted),
            ],
          ),
          const SizedBox(height: 14),
          _buildActivityItem(
            icon: Icons.report_problem_rounded,
            color: AppColors.warning,
            title: 'Defect ticket logged for Kandy Villa',
            time: '2 hours ago',
          ),
          const SizedBox(height: 10),
          _buildActivityItem(
            icon: Icons.verified_outlined,
            color: AppColors.success,
            title: 'Roofing inspection approved by Owner',
            time: '1 day ago',
          ),
          const SizedBox(height: 10),
          _buildActivityItem(
            icon: Icons.auto_awesome,
            color: const Color(0xFF8B5CF6),
            title: 'Deterministic AI matched 3 verified plumbers',
            time: '2 days ago',
          ),
        ],
      ),
    );
  }

  Widget _buildActivityItem({
    required IconData icon,
    required Color color,
    required String title,
    required String time,
  }) {
    return Row(
      children: [
        Container(
          width: 28,
          height: 28,
          decoration: BoxDecoration(
            color: color.withOpacity(0.12),
            shape: BoxShape.circle,
          ),
          child: Icon(icon, color: color, size: 14),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
              ),
              Text(
                time,
                style: const TextStyle(fontSize: 10, color: AppColors.textMuted),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
