import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../shared/widgets/feedback_states.dart';
import '../../../shared/widgets/status_badge.dart';
import '../models/incident_model.dart';
import '../services/incident_service.dart';
import 'incident_detail_screen.dart';
import 'report_incident_screen.dart';

class IncidentListScreen extends StatefulWidget {
  const IncidentListScreen({super.key});

  @override
  State<IncidentListScreen> createState() => _IncidentListScreenState();
}

class _IncidentListScreenState extends State<IncidentListScreen> {
  final IncidentService _incidentService = IncidentService();
  List<IncidentModel> _incidents = [];
  bool _isLoading = true;
  String? _errorMessage;

  String _searchQuery = '';
  String _selectedStatus = 'All';
  String _selectedPriority = 'All';

  final List<String> _statusFilters = [
    'All',
    'Reported',
    'Validating',
    'Planning',
    'WorkInProgress',
    'Resolved',
    'Closed'
  ];

  final List<String> _priorityFilters = [
    'All',
    'Emergency',
    'High',
    'Medium',
    'Low'
  ];

  @override
  void initState() {
    super.initState();
    _loadIncidents();
  }

  Future<void> _loadIncidents() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final res = await _incidentService.getIncidents(
        pageSize: 50,
        status: _selectedStatus == 'All' ? null : _selectedStatus,
        priority: _selectedPriority == 'All' ? null : _selectedPriority,
      );
      setState(() {
        _incidents = res.items;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _errorMessage = e.toString().replaceAll('Exception: ', '');
        _isLoading = false;
      });
    }
  }

  List<IncidentModel> get _filteredIncidents {
    if (_searchQuery.trim().isEmpty) return _incidents;
    final q = _searchQuery.toLowerCase().trim();
    return _incidents.where((i) {
      return i.title.toLowerCase().contains(q) ||
          i.assetName.toLowerCase().contains(q) ||
          (i.assetCity != null && i.assetCity!.toLowerCase().contains(q)) ||
          i.category.toLowerCase().contains(q) ||
          i.description.toLowerCase().contains(q);
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Incidents & Defects',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w800,
                color: AppColors.textPrimary,
                letterSpacing: -0.4,
              ),
            ),
            Text(
              'Track property issues and maintenance progress',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w500,
                color: AppColors.textSecondary,
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded, color: AppColors.textSecondary),
            onPressed: _loadIncidents,
            tooltip: 'Refresh',
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () async {
          final created = await Navigator.push<bool>(
            context,
            MaterialPageRoute(builder: (_) => const ReportIncidentScreen()),
          );
          if (created == true) {
            _loadIncidents();
          }
        },
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        elevation: 3,
        icon: const Icon(Icons.add_alert_rounded, size: 20),
        label: const Text(
          'Report Defect',
          style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
        ),
      ),
      body: Column(
        children: [
          // Filter & Search Controls Header
          Container(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
            decoration: const BoxDecoration(
              color: AppColors.surface,
              border: Border(bottom: BorderSide(color: AppColors.border, width: 1)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Search Input
                Container(
                  height: 42,
                  decoration: BoxDecoration(
                    color: AppColors.surfaceVariant,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: TextField(
                    onChanged: (val) => setState(() => _searchQuery = val),
                    style: const TextStyle(fontSize: 13, color: AppColors.textPrimary),
                    decoration: InputDecoration(
                      hintText: 'Search by title, property, or defect...',
                      hintStyle: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                      prefixIcon: const Icon(Icons.search_rounded, size: 18, color: AppColors.textMuted),
                      suffixIcon: _searchQuery.isNotEmpty
                          ? IconButton(
                              icon: const Icon(Icons.clear_rounded, size: 16, color: AppColors.textMuted),
                              onPressed: () => setState(() => _searchQuery = ''),
                            )
                          : null,
                      border: InputBorder.none,
                      contentPadding: const EdgeInsets.symmetric(vertical: 10),
                    ),
                  ),
                ),
                const SizedBox(height: 10),

                // Status Filter Chips
                SizedBox(
                  height: 30,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    itemCount: _statusFilters.length,
                    separatorBuilder: (_, __) => const SizedBox(width: 6),
                    itemBuilder: (context, idx) {
                      final status = _statusFilters[idx];
                      final isSelected = _selectedStatus == status;
                      return ChoiceChip(
                        label: Text(
                          status == 'WorkInProgress' ? 'In Progress' : status,
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                            color: isSelected ? Colors.white : AppColors.textSecondary,
                          ),
                        ),
                        selected: isSelected,
                        selectedColor: AppColors.primary,
                        backgroundColor: AppColors.surfaceVariant,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                          side: BorderSide(
                            color: isSelected ? AppColors.primary : AppColors.border,
                            width: 1,
                          ),
                        ),
                        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 0),
                        visualDensity: VisualDensity.compact,
                        showCheckmark: false,
                        onSelected: (sel) {
                          if (sel) {
                            setState(() => _selectedStatus = status);
                            _loadIncidents();
                          }
                        },
                      );
                    },
                  ),
                ),
              ],
            ),
          ),

          // Incident List Body
          Expanded(child: _buildContent()),
        ],
      ),
    );
  }

  Widget _buildContent() {
    if (_isLoading) {
      return ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: 4,
        itemBuilder: (_, __) => const IncidentCardSkeleton(),
      );
    }

    if (_errorMessage != null) {
      return ErrorState(
        message: _errorMessage!,
        onRetry: _loadIncidents,
      );
    }

    final incidents = _filteredIncidents;

    if (incidents.isEmpty) {
      return EmptyState(
        title: _searchQuery.isNotEmpty ? 'No Matching Incidents' : 'No Incidents Found',
        message: _searchQuery.isNotEmpty
            ? 'No defects match "$_searchQuery". Try refining your search query.'
            : 'All properties are running smoothly with no active maintenance tickets.',
        icon: Icons.assignment_turned_in_outlined,
        actionLabel: 'Report an Incident',
        onAction: () async {
          final created = await Navigator.push<bool>(
            context,
            MaterialPageRoute(builder: (_) => const ReportIncidentScreen()),
          );
          if (created == true) _loadIncidents();
        },
      );
    }

    return RefreshIndicator(
      onRefresh: _loadIncidents,
      color: AppColors.primary,
      child: ListView.builder(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 80),
        itemCount: incidents.length,
        itemBuilder: (context, index) {
          final incident = incidents[index];
          return _buildIncidentCard(incident);
        },
      ),
    );
  }

  Widget _buildIncidentCard(IncidentModel incident) {
    final hasBudget = incident.estimatedBudget != null && incident.estimatedBudget! > 0;
    final budgetStr = hasBudget ? 'LKR ${incident.estimatedBudget!.toStringAsFixed(0)}' : 'Budget: Pending';

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.02),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: () {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => IncidentDetailScreen(incidentId: incident.id),
              ),
            ).then((_) => _loadIncidents());
          },
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Top Badges Row
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        _buildPriorityPill(incident.priority),
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: AppColors.surfaceVariant,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            incident.category,
                            style: const TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w600,
                              color: AppColors.textSecondary,
                            ),
                          ),
                        ),
                      ],
                    ),
                    StatusBadge(status: incident.status),
                  ],
                ),
                const SizedBox(height: 12),

                // Incident Title
                Text(
                  incident.title,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w800,
                    color: AppColors.textPrimary,
                    letterSpacing: -0.3,
                  ),
                ),
                const SizedBox(height: 6),

                // Property Location
                Row(
                  children: [
                    const Icon(Icons.apartment_rounded, size: 14, color: AppColors.primary),
                    const SizedBox(width: 4),
                    Text(
                      incident.assetName,
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textSecondary,
                      ),
                    ),
                    if (incident.assetCity != null && incident.assetCity!.isNotEmpty) ...[
                      const SizedBox(width: 4),
                      Text(
                        '• ${incident.assetCity}',
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppColors.textMuted,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ],
                ),
                const SizedBox(height: 10),

                // Description excerpt
                Text(
                  incident.description,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppColors.textSecondary,
                    height: 1.4,
                  ),
                ),
                const SizedBox(height: 14),

                // Footer with Budget and Evidence indicator
                Container(
                  padding: const EdgeInsets.only(top: 12),
                  decoration: const BoxDecoration(
                    border: Border(top: BorderSide(color: AppColors.border, width: 0.8)),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.payments_outlined, size: 14, color: AppColors.primary),
                          const SizedBox(width: 4),
                          Text(
                            budgetStr,
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              color: hasBudget ? AppColors.textPrimary : AppColors.textMuted,
                            ),
                          ),
                        ],
                      ),
                      if (incident.evidenceCount > 0 || incident.evidence.isNotEmpty)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: AppColors.primarySubtle,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.photo_library_rounded, size: 12, color: AppColors.primary),
                              const SizedBox(width: 4),
                              Text(
                                '${incident.evidenceCount > 0 ? incident.evidenceCount : incident.evidence.length} Photos',
                                style: const TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.primary,
                                ),
                              ),
                            ],
                          ),
                        )
                      else
                        const Row(
                          children: [
                            Icon(Icons.shield_outlined, size: 13, color: AppColors.textMuted),
                            SizedBox(width: 4),
                            Text(
                              'Continuity Guard',
                              style: TextStyle(fontSize: 11, color: AppColors.textMuted, fontWeight: FontWeight.w500),
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
      ),
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
      fg = const Color(0xFFD97706); // Amber 600
    } else if (p.contains('low')) {
      bg = const Color(0xFFF1F5F9);
      fg = AppColors.textSecondary;
    } else {
      // Medium
      bg = AppColors.primarySubtle;
      fg = AppColors.primary;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(6),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            p.contains('emergency') || p.contains('high')
                ? Icons.warning_rounded
                : Icons.bolt_rounded,
            size: 11,
            color: fg,
          ),
          const SizedBox(width: 3),
          Text(
            priority,
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w800,
              color: fg,
            ),
          ),
        ],
      ),
    );
  }
}
